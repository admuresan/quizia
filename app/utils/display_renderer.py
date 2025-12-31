"""
Server-side display renderer using Playwright to generate screenshots.

Note: After installing playwright, you need to install the browser:
    playwright install chromium

Or for all browsers:
    playwright install
"""
import asyncio
from pathlib import Path
try:
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("Warning: Playwright not installed. Server-side rendering will not work.")
    print("Install with: pip install playwright && playwright install chromium")

import base64
import io
from datetime import datetime, timedelta
import hashlib
import json

# Cache for rendered images (room_code -> (image_data, timestamp, version))
_render_cache = {}
_cache_timeout = 0.2  # Cache for 0.2 seconds to balance freshness and performance (reduced for faster updates)
_version_counter = {}  # Track version number for each room (increments when cache is cleared)

async def render_display_page(room_code, base_url='http://127.0.0.1:6005'):
    """
    Render the display page for a room and return as PNG image bytes.
    
    Args:
        room_code: The room code to render
        base_url: Base URL of the application (default: localhost:6005)
    
    Returns:
        bytes: PNG image data, or None if rendering failed
    """
    if not PLAYWRIGHT_AVAILABLE:
        print(f"[Display Renderer] ERROR: Playwright is not available. Install with: pip install playwright && playwright install chromium")
        return None
    
    # Check cache first
    cache_key = room_code
    if cache_key in _render_cache:
        cache_entry = _render_cache[cache_key]
        if len(cache_entry) >= 2:
            image_data, timestamp = cache_entry[0], cache_entry[1]
            if datetime.now() - timestamp < timedelta(seconds=_cache_timeout):
                return image_data
    
    try:
        async with async_playwright() as p:
            # Launch browser (headless)
            try:
                browser = await p.chromium.launch(headless=True)
            except Exception as browser_error:
                import os
                import traceback
                print(f"[Display Renderer] ERROR: Failed to launch Chromium browser: {browser_error}")
                print(f"[Display Renderer] Environment check:")
                print(f"  HOME: {os.environ.get('HOME', 'NOT SET')}")
                print(f"  PLAYWRIGHT_BROWSERS_PATH: {os.environ.get('PLAYWRIGHT_BROWSERS_PATH', 'NOT SET')}")
                print(f"  USER: {os.environ.get('USER', 'NOT SET')}")
                cache_path = os.path.expanduser('~/.cache/ms-playwright')
                print(f"  Cache path exists: {os.path.exists(cache_path)}")
                if os.path.exists(cache_path):
                    print(f"  Cache path contents: {os.listdir(cache_path)}")
                print(f"[Display Renderer] Traceback: {traceback.format_exc()}")
                print(f"[Display Renderer] This usually means Playwright browsers are not installed or not accessible.")
                print(f"[Display Renderer] Run: playwright install chromium")
                return None
            
            try:
                # Create a new page
                page = await browser.new_page()
                
                # Set viewport size (1920x1080 for full HD)
                await page.set_viewport_size({"width": 1920, "height": 1080})
                
                # Navigate to display page
                display_url = f"{base_url}/display/{room_code}"
                print(f"[Display Renderer] Navigating to {display_url}")
                
                try:
                    # Try with domcontentloaded first (faster, doesn't wait for all resources)
                    await page.goto(display_url, wait_until="domcontentloaded", timeout=20000)
                except PlaywrightTimeoutError as e:
                    print(f"[Display Renderer] domcontentloaded timeout, trying load event...")
                    try:
                        # If that fails, try with load event
                        await page.goto(display_url, wait_until="load", timeout=20000)
                    except PlaywrightTimeoutError as e2:
                        print(f"[Display Renderer] load timeout, trying commit...")
                        # If that also fails, try with commit (just wait for navigation to start)
                        await page.goto(display_url, wait_until="commit", timeout=20000)
                
                # Wait for content to render - give it time for JavaScript to execute
                # Wait for display-content element to exist
                try:
                    await page.wait_for_selector('#display-content', timeout=10000, state='attached')
                    print(f"[Display Renderer] Found display-content element")
                except Exception as e:
                    print(f"[Display Renderer] Warning: display-content not found: {e}")
                    # If selector doesn't appear, just wait a bit and continue
                
                # Wait for WebSocket connection to be established (Socket.IO connection)
                # This ensures any overlays or dynamic content triggered by WebSocket events are ready
                try:
                    await page.wait_for_function(
                        """
                        () => {
                            // Check if Socket.IO is connected
                            return window.socket && window.socket.connected === true;
                        }
                        """,
                        timeout=3000
                    )
                    print(f"[Display Renderer] WebSocket connection established")
                    # Give a moment for any pending WebSocket events to be processed
                    await page.wait_for_timeout(500)
                except Exception as e:
                    print(f"[Display Renderer] WebSocket connection check timeout/error: {e}, continuing...")
                
                # Wait for content to be rendered - check for ready signal first (fastest)
                # Then fall back to checking for visible elements
                try:
                    # First, wait for the ready signal (set by display.js when rendering completes)
                    await page.wait_for_selector('#display-content[data-rendered="true"]', timeout=1500, state='attached')
                    print(f"[Display Renderer] Content ready signal detected")
                except Exception as e:
                    # Fallback: check if elements are visible
                    print(f"[Display Renderer] Ready signal not found, checking for visible content...")
                    try:
                        await page.wait_for_function(
                            """
                            () => {
                                const content = document.getElementById('display-content');
                                if (!content) return false;
                                // Check if there are any visible elements (not just the container)
                                const elements = content.querySelectorAll('[id^="element-"]');
                                for (let el of elements) {
                                    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                                        return true; // At least one element is visible
                                    }
                                }
                                // If no elements, check if content has any height (might be a status page)
                                return content.offsetHeight > 100;
                            }
                            """,
                            timeout=1000
                        )
                        print(f"[Display Renderer] Content rendered (fallback check)")
                    except Exception as e2:
                        print(f"[Display Renderer] Content check timeout/error: {e2}, continuing anyway...")
                        # Final fallback: short wait
                        await page.wait_for_timeout(300)
                
                # Check if there's an answer display overlay and wait for it to be ready
                overlay_present = False
                try:
                    overlay = await page.query_selector('#answer-display-overlay')
                    if overlay:
                        # Wait for overlay to be ready (set by display.js when overlay is fully rendered)
                        await page.wait_for_selector('#answer-display-overlay[data-overlay-ready="true"]', timeout=1000, state='attached')
                        print(f"[Display Renderer] Answer overlay ready signal detected")
                        
                        # Verify overlay is actually visible and has correct properties
                        overlay_visible = await page.evaluate("""
                            () => {
                                const overlay = document.getElementById('answer-display-overlay');
                                if (!overlay) return false;
                                const style = window.getComputedStyle(overlay);
                                const isVisible = overlay.offsetWidth > 0 && 
                                                 overlay.offsetHeight > 0 && 
                                                 style.display !== 'none' && 
                                                 style.visibility !== 'hidden' &&
                                                 style.opacity !== '0';
                                console.log('[Display Renderer] Overlay check:', {
                                    exists: !!overlay,
                                    width: overlay.offsetWidth,
                                    height: overlay.offsetHeight,
                                    display: style.display,
                                    visibility: style.visibility,
                                    opacity: style.opacity,
                                    zIndex: style.zIndex,
                                    isVisible: isVisible
                                });
                                return isVisible;
                            }
                        """)
                        print(f"[Display Renderer] Overlay visible check: {overlay_visible}")
                        
                        if overlay_visible:
                            overlay_present = True
                            # Give overlay a moment to fully render
                            await page.wait_for_timeout(300)
                except Exception as e:
                    # No overlay or overlay not ready - that's fine, continue
                    print(f"[Display Renderer] No answer overlay or overlay not ready: {e}")
                
                # Final check right before screenshot - verify overlay is still there
                if overlay_present:
                    final_check = await page.evaluate("""
                        () => {
                            const overlay = document.getElementById('answer-display-overlay');
                            return overlay !== null && overlay.offsetWidth > 0 && overlay.offsetHeight > 0;
                        }
                    """)
                    print(f"[Display Renderer] Final overlay check before screenshot: {final_check}")
                
                # Take screenshot of viewport - this should capture everything visible
                # including fixed/absolute positioned elements like the overlay
                # Viewport screenshot captures all visible elements regardless of positioning
                print(f"[Display Renderer] Taking screenshot (overlay present: {overlay_present})...")
                
                # Final verification: check overlay is in DOM right before screenshot
                if overlay_present:
                    overlay_final = await page.evaluate("""
                        () => {
                            const overlay = document.getElementById('answer-display-overlay');
                            if (!overlay) return { found: false };
                            const rect = overlay.getBoundingClientRect();
                            const style = window.getComputedStyle(overlay);
                            return {
                                found: true,
                                inDOM: document.body.contains(overlay),
                                visible: rect.width > 0 && rect.height > 0,
                                display: style.display,
                                zIndex: style.zIndex,
                                position: style.position,
                                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                            };
                        }
                    """)
                    print(f"[Display Renderer] Overlay final check before screenshot: {overlay_final}")
                
                screenshot = await page.screenshot(
                    type="png",
                    full_page=False,  # Viewport screenshot - captures all visible elements including fixed
                    timeout=10000
                )
                print(f"[Display Renderer] Screenshot taken successfully")
                
                print(f"[Display Renderer] Screenshot taken successfully")
                
                # Get current version for this room
                version = _version_counter.get(cache_key, 0)
                
                # Cache the result with version
                _render_cache[cache_key] = (screenshot, datetime.now(), version)
                
                return screenshot
                
            finally:
                await browser.close()
            
    except Exception as e:
        print(f"Error rendering display page for room {room_code}: {e}")
        import traceback
        traceback.print_exc()
        return None

def render_display_page_sync(room_code, base_url='http://127.0.0.1:6005'):
    """
    Synchronous wrapper using Playwright's sync API to avoid eventlet conflicts.
    Runs in a separate thread to avoid blocking Flask.
    """
    import concurrent.futures
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
    
    def run_sync():
        """Run Playwright using sync API (more compatible with eventlet)."""
        if not PLAYWRIGHT_AVAILABLE:
            print(f"[Display Renderer] ERROR: Playwright is not available.")
            return None
        
        try:
            with sync_playwright() as p:
                # Launch browser (headless)
                try:
                    browser = p.chromium.launch(headless=True)
                except Exception as browser_error:
                    import os
                    import traceback
                    print(f"[Display Renderer] ERROR: Failed to launch Chromium browser: {browser_error}")
                    print(f"[Display Renderer] Environment check:")
                    print(f"  HOME: {os.environ.get('HOME', 'NOT SET')}")
                    print(f"  PLAYWRIGHT_BROWSERS_PATH: {os.environ.get('PLAYWRIGHT_BROWSERS_PATH', 'NOT SET')}")
                    print(f"  USER: {os.environ.get('USER', 'NOT SET')}")
                    cache_path = os.path.expanduser('~/.cache/ms-playwright')
                    print(f"  Cache path exists: {os.path.exists(cache_path)}")
                    if os.path.exists(cache_path):
                        print(f"  Cache path contents: {os.listdir(cache_path)}")
                    print(f"[Display Renderer] Traceback: {traceback.format_exc()}")
                    return None
                
                try:
                    # Create a new page
                    page = browser.new_page()
                    
                    # Set viewport size (1920x1080 for full HD)
                    page.set_viewport_size({"width": 1920, "height": 1080})
                    
                    # Navigate to display page
                    display_url = f"{base_url}/display/{room_code}"
                    print(f"[Display Renderer] Navigating to {display_url}")
                    
                    try:
                        page.goto(display_url, wait_until="domcontentloaded", timeout=20000)
                    except PlaywrightTimeoutError:
                        print(f"[Display Renderer] domcontentloaded timeout, trying load event...")
                        try:
                            page.goto(display_url, wait_until="load", timeout=20000)
                        except PlaywrightTimeoutError:
                            print(f"[Display Renderer] load timeout, trying commit...")
                            page.goto(display_url, wait_until="commit", timeout=20000)
                    
                    # Wait for content
                    try:
                        page.wait_for_selector('#display-content', timeout=10000, state='attached')
                        print(f"[Display Renderer] Found display-content element")
                        # Check if initial loading message is present - wait for it to disappear
                        try:
                            loading_el = page.query_selector('#initial-loading')
                            if loading_el:
                                print(f"[Display Renderer] Initial loading message found, waiting for it to disappear...")
                                page.wait_for_selector('#initial-loading', timeout=10000, state='detached')
                                print(f"[Display Renderer] Initial loading message disappeared")
                        except Exception:
                            # Loading message not found or already gone - that's fine
                            pass
                    except Exception as e:
                        print(f"[Display Renderer] Warning: display-content not found: {e}")
                    
                    # Wait for WebSocket connection - give it more time
                    websocket_connected = False
                    try:
                        page.wait_for_function(
                            "() => window.socket && window.socket.connected === true",
                            timeout=5000  # Increased from 3000 to 5000
                        )
                        print(f"[Display Renderer] WebSocket connection established")
                        websocket_connected = True
                        # Give WebSocket time to receive and process display_state event
                        page.wait_for_timeout(1000)  # Increased from 500 to 1000
                    except Exception as e:
                        print(f"[Display Renderer] WebSocket connection check timeout/error: {e}, continuing...")
                        # If WebSocket didn't connect, wait a bit longer for any content that might render anyway
                        page.wait_for_timeout(2000)
                    
                    # Wait for content ready signal - give it more time
                    content_ready = False
                    try:
                        page.wait_for_selector('#display-content[data-rendered="true"]', timeout=5000, state='attached')  # Increased from 1500 to 5000
                        print(f"[Display Renderer] Content ready signal detected")
                        content_ready = True
                    except Exception:
                        print(f"[Display Renderer] Ready signal not found, checking for visible content...")
                        try:
                            # Wait longer and check more thoroughly
                            page.wait_for_function(
                                """
                                () => {
                                    const content = document.getElementById('display-content');
                                    if (!content) return false;
                                    // Check for visible elements
                                    const elements = content.querySelectorAll('[id^="element-"]');
                                    for (let el of elements) {
                                        if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                                            return true;
                                        }
                                    }
                                    // Check for status/result page content
                                    const statusContent = content.querySelector('.status-page, .result-page');
                                    if (statusContent && statusContent.offsetHeight > 100) {
                                        return true;
                                    }
                                    // Check if initial loading message is gone
                                    const loadingEl = document.getElementById('initial-loading');
                                    if (loadingEl && loadingEl.style.display !== 'none') {
                                        return false; // Still loading
                                    }
                                    // Check if content has meaningful height (not just empty container)
                                    return content.offsetHeight > 100 && content.innerHTML.trim().length > 50;
                                }
                                """,
                                timeout=3000  # Increased from 1000 to 3000
                            )
                            print(f"[Display Renderer] Content rendered (fallback check)")
                            content_ready = True
                        except Exception as e2:
                            print(f"[Display Renderer] Content check timeout: {e2}, waiting a bit more...")
                            # Final wait before screenshot
                            page.wait_for_timeout(1000)  # Increased from 300 to 1000
                    
                    # If still no content, check what's actually on the page and wait a bit more
                    if not content_ready:
                        page_content = page.evaluate("""
                            () => {
                                const content = document.getElementById('display-content');
                                if (!content) return { exists: false };
                                return {
                                    exists: true,
                                    innerHTML: content.innerHTML.substring(0, 200),
                                    offsetHeight: content.offsetHeight,
                                    offsetWidth: content.offsetWidth,
                                    elementCount: content.querySelectorAll('[id^="element-"]').length,
                                    hasRendered: content.hasAttribute('data-rendered'),
                                    socketConnected: window.socket ? window.socket.connected : false,
                                    socketExists: !!window.socket
                                };
                            }
                        """)
                        print(f"[Display Renderer] Page state before screenshot: {page_content}")
                        
                        # If WebSocket isn't connected, wait a bit more and try one more time
                        if not page_content.get('socketConnected', False):
                            print(f"[Display Renderer] WebSocket not connected, waiting additional 3 seconds...")
                            page.wait_for_timeout(3000)
                            # Check again
                            page_content = page.evaluate("""
                                () => {
                                    const content = document.getElementById('display-content');
                                    if (!content) return { exists: false };
                                    const elements = content.querySelectorAll('[id^="element-"]');
                                    return {
                                        exists: true,
                                        elementCount: elements.length,
                                        hasRendered: content.hasAttribute('data-rendered'),
                                        socketConnected: window.socket ? window.socket.connected : false,
                                        hasVisibleElements: Array.from(elements).some(el => el.offsetWidth > 0 && el.offsetHeight > 0)
                                    };
                                }
                            """)
                            print(f"[Display Renderer] Page state after additional wait: {page_content}")
                    
                    # Check for answer overlay
                    overlay_present = False
                    try:
                        overlay = page.query_selector('#answer-display-overlay')
                        if overlay:
                            page.wait_for_selector('#answer-display-overlay[data-overlay-ready="true"]', timeout=1000, state='attached')
                            print(f"[Display Renderer] Answer overlay ready signal detected")
                            overlay_present = True
                            page.wait_for_timeout(300)
                    except Exception as e:
                        print(f"[Display Renderer] No answer overlay or overlay not ready: {e}")
                    
                    # Take screenshot
                    print(f"[Display Renderer] Taking screenshot (overlay present: {overlay_present})...")
                    screenshot = page.screenshot(
                        type="png",
                        full_page=False,
                        timeout=10000
                    )
                    print(f"[Display Renderer] Screenshot taken successfully")
                    
                    # Get current version for this room
                    version = _version_counter.get(room_code, 0)
                    
                    # Cache the result with version
                    _render_cache[room_code] = (screenshot, datetime.now(), version)
                    
                    return screenshot
                    
                finally:
                    browser.close()
                    
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[Display Renderer] Error rendering display page for room {room_code}: {e}")
            print(f"[Display Renderer] Traceback: {error_trace}")
            return None
    
    # Run in a thread to avoid blocking
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(run_sync)
        try:
            result = future.result(timeout=45)  # Increased timeout to 45 seconds
            return result
        except concurrent.futures.TimeoutError:
            print(f"[Display Renderer] Timeout rendering display page for room {room_code} (exceeded 45 seconds)")
            return None
        except Exception as e:
            import traceback
            print(f"[Display Renderer] Exception in thread executor for room {room_code}: {e}")
            print(f"[Display Renderer] Traceback: {traceback.format_exc()}")
            return None

def clear_cache(room_code=None):
    """
    Clear the render cache for a specific room or all rooms.
    Also increments the version counter to signal that a new render is needed.
    
    Args:
        room_code: Room code to clear, or None to clear all
    """
    if room_code:
        _render_cache.pop(room_code, None)
        # Increment version to signal change
        _version_counter[room_code] = _version_counter.get(room_code, 0) + 1
    else:
        _render_cache.clear()
        _version_counter.clear()

def get_version(room_code):
    """
    Get the current version number for a room.
    Used by TV display to check if a new render is available.
    
    Args:
        room_code: Room code to check
    
    Returns:
        int: Version number (0 if room not found)
    """
    return _version_counter.get(room_code, 0)

