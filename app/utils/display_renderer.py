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
_cache_timeout = 5.0  # Cache for 5 seconds to reduce unnecessary re-renders and improve performance
_version_counter = {}  # Track version number for each room (increments when cache is cleared)
# Persistent storage for last successful image (room_code -> image_data)
# This prevents black screens when rendering fails
_last_successful_image = {}

async def render_display_page(room_code, base_url='http://127.0.0.1:6005'):
    """
    Render the display page for a room and return as PNG image bytes.
    
    Args:
        room_code: The room code to render
        base_url: Base URL of the application. Should be passed from request.url_root
                  to work correctly with reverse proxies. Default is localhost:6005
                  for backward compatibility when not proxied.
    
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
                
                # Store as last successful image (persistent across cache clears)
                _last_successful_image[cache_key] = screenshot
                
                return screenshot
                
            finally:
                await browser.close()
            
    except Exception as e:
        print(f"Error rendering display page for room {room_code}: {e}")
        import traceback
        traceback.print_exc()
        # Return last successful image if available (prevents black screen)
        cache_key = room_code
        if cache_key in _last_successful_image:
            print(f"[Display Renderer] Rendering failed, returning last successful image")
            return _last_successful_image[cache_key]
        return None

def render_display_page_sync(room_code, base_url='http://127.0.0.1:6005'):
    """
    Synchronous wrapper that runs Playwright in a separate process to avoid eventlet conflicts.
    Eventlet creates an async event loop that conflicts with Playwright's sync API,
    so we use subprocess to run it in a completely separate Python process.
    
    Args:
        room_code: The room code to render
        base_url: Base URL of the application. Should be passed from request.url_root
                  to work correctly with reverse proxies. Default is localhost:6005
                  for backward compatibility when not proxied.
    """
    import subprocess
    import tempfile
    import sys
    import os
    
    if not PLAYWRIGHT_AVAILABLE:
        print(f"[Display Renderer] ERROR: Playwright is not available.")
        # Return last successful image if available
        if room_code in _last_successful_image:
            print(f"[Display Renderer] Playwright not available, returning last successful image")
            return _last_successful_image[room_code]
        return None
    
    # Check cache first (synchronous check)
    cache_key = room_code
    if cache_key in _render_cache:
        cache_entry = _render_cache[cache_key]
        if len(cache_entry) >= 2:
            image_data, timestamp = cache_entry[0], cache_entry[1]
            if datetime.now() - timestamp < timedelta(seconds=_cache_timeout):
                return image_data
    
    # If cache expired but we have a last successful image, return it immediately
    # This prevents black screens while a new render is being generated
    # Note: The new render will still happen in the subprocess, but result is returned on next request
    if cache_key in _last_successful_image:
        last_image = _last_successful_image[cache_key]
        print(f"[Display Renderer] Cache expired, returning last successful image while rendering new one")
        # Continue to render new image below, but return last one immediately
    
    # Get the app directory path
    app_dir = Path(__file__).parent.parent.parent
    
    # Create a temporary script file to run Playwright in a separate process
    script_content = f'''#!/usr/bin/env python3
import sys
import os
from pathlib import Path

# Add app directory to path
app_dir = Path(r"{app_dir}")
sys.path.insert(0, str(app_dir))

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
import base64
import json

room_code = "{room_code}"
base_url = "{base_url}"

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({{"width": 1920, "height": 1080}})
        
        display_url = f"{{base_url}}/display/{{room_code}}"
        print(f"[Subprocess] Navigating to {{display_url}}", flush=True)
        
        try:
            # Use commit for faster navigation (doesn't wait for all resources)
            page.goto(display_url, wait_until="commit", timeout=10000)
        except PlaywrightTimeoutError:
            print("[Subprocess] commit timeout, trying domcontentloaded...", flush=True)
            try:
                page.goto(display_url, wait_until="domcontentloaded", timeout=10000)
            except PlaywrightTimeoutError:
                print("[Subprocess] domcontentloaded timeout, trying load...", flush=True)
                page.goto(display_url, wait_until="load", timeout=10000)
        
        # Wait for content (reduced timeout for faster rendering)
        try:
            page.wait_for_selector('#display-content', timeout=5000, state='attached')
            print("[Subprocess] Found display-content", flush=True)
        except Exception as e:
            print(f"[Subprocess] Warning: display-content not found: {{e}}", flush=True)
        
        # Wait for loading message to disappear (reduced timeout)
        try:
            loading_el = page.query_selector('#initial-loading')
            if loading_el:
                page.wait_for_selector('#initial-loading', timeout=5000, state='detached')
                print("[Subprocess] Loading message disappeared", flush=True)
        except:
            pass
        
        # Wait for WebSocket connection (reduced timeout, but still important)
        websocket_connected = False
        try:
            socket_exists = page.evaluate("() => !!window.socket")
            print(f"[Subprocess] Socket exists: {{socket_exists}}", flush=True)
            
            if socket_exists:
                page.wait_for_function(
                    "() => window.socket && window.socket.connected === true",
                    timeout=5000  # Reduced from 8000
                )
                print("[Subprocess] WebSocket connected", flush=True)
                websocket_connected = True
                page.wait_for_timeout(1000)  # Reduced from 2000
        except Exception as e:
            print(f"[Subprocess] WebSocket timeout: {{e}}, continuing...", flush=True)
            # Give a shorter wait if WebSocket doesn't connect
            page.wait_for_timeout(1500)  # Reduced from 3000
        
        # Wait for content ready (reduced timeout)
        content_ready = False
        try:
            page.wait_for_selector('#display-content[data-rendered="true"]', timeout=3000, state='attached')
            print("[Subprocess] Content ready signal detected", flush=True)
            content_ready = True
        except:
            print("[Subprocess] Ready signal not found, checking content...", flush=True)
            try:
                page.wait_for_function(
                    """
                    () => {{
                        const content = document.getElementById('display-content');
                        if (!content) return false;
                        const elements = content.querySelectorAll('[id^="element-"]');
                        for (let el of elements) {{
                            if (el.offsetWidth > 0 && el.offsetHeight > 0) {{
                                return true;
                            }}
                        }}
                        const loadingEl = document.getElementById('initial-loading');
                        if (loadingEl && loadingEl.style.display !== 'none') {{
                            return false;
                        }}
                        return content.offsetHeight > 100 && content.innerHTML.trim().length > 50;
                    }}
                    """,
                    timeout=2000  # Reduced from 3000
                )
                print("[Subprocess] Content rendered", flush=True)
                content_ready = True
            except Exception as e2:
                print(f"[Subprocess] Content check timeout: {{e2}}, continuing anyway...", flush=True)
                page.wait_for_timeout(500)  # Reduced from 1000
        
        # Take screenshot
        print("[Subprocess] Taking screenshot...", flush=True)
        screenshot = page.screenshot(type="png", full_page=False, timeout=10000)
        
        browser.close()
        
        # Return base64 encoded image
        image_b64 = base64.b64encode(screenshot).decode('utf-8')
        result = {{"success": True, "image": image_b64}}
        print(json.dumps(result), flush=True)
        
except Exception as e:
    import traceback
    error = {{"success": False, "error": str(e), "traceback": traceback.format_exc()}}
    print(json.dumps(error), flush=True)
    sys.exit(1)
'''
    
    # Write script to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        script_path = f.name
        f.write(script_content)
        os.chmod(script_path, 0o755)  # Make executable
    
    try:
        # Run script in separate Python process (completely isolated from eventlet)
        print(f"[Display Renderer] Running Playwright in separate process for room {room_code}")
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            timeout=30,  # Reduced from 60 to 30 seconds for faster failure recovery
            cwd=str(app_dir)
        )
        
        # Clean up script file
        try:
            os.unlink(script_path)
        except:
            pass
        
        if result.returncode != 0:
            print(f"[Display Renderer] Subprocess failed with return code {result.returncode}")
            print(f"[Display Renderer] stdout: {result.stdout}")
            print(f"[Display Renderer] stderr: {result.stderr}")
            return None
        
        # Parse JSON result (should be the last line of stdout)
        try:
            output_lines = result.stdout.strip().split('\n')
            # Find the JSON line (should be the last line)
            json_line = None
            for line in reversed(output_lines):
                line = line.strip()
                if line.startswith('{') and line.endswith('}'):
                    json_line = line
                    break
            
            if not json_line:
                print(f"[Display Renderer] No JSON output found. stdout: {result.stdout[:500]}")
                return None
            
            result_data = json.loads(json_line)
            
            if result_data.get('success'):
                # Decode base64 image
                image_data = base64.b64decode(result_data['image'])
                print(f"[Display Renderer] Screenshot taken successfully, size: {len(image_data)} bytes")
                
                # Cache the result
                version = _version_counter.get(room_code, 0)
                _render_cache[room_code] = (image_data, datetime.now(), version)
                
                # Store as last successful image (persistent across cache clears)
                _last_successful_image[room_code] = image_data
                
                return image_data
            else:
                print(f"[Display Renderer] Subprocess returned error: {result_data.get('error')}")
                if 'traceback' in result_data:
                    print(f"[Display Renderer] Traceback: {result_data['traceback']}")
                # Return last successful image if available (prevents black screen)
                if room_code in _last_successful_image:
                    print(f"[Display Renderer] Rendering failed, returning last successful image")
                    return _last_successful_image[room_code]
                return None
                
        except json.JSONDecodeError as e:
            print(f"[Display Renderer] Failed to parse JSON output: {e}")
            print(f"[Display Renderer] stdout (last 500 chars): {result.stdout[-500:]}")
            return None
            
    except subprocess.TimeoutExpired:
        print(f"[Display Renderer] Subprocess timeout (exceeded 60 seconds)")
        try:
            os.unlink(script_path)
        except:
            pass
        # Return last successful image if available (prevents black screen)
        if room_code in _last_successful_image:
            print(f"[Display Renderer] Rendering timeout, returning last successful image")
            return _last_successful_image[room_code]
        return None
    except Exception as e:
        print(f"[Display Renderer] Error running subprocess: {e}")
        import traceback
        traceback.print_exc()
        try:
            os.unlink(script_path)
        except:
            pass
        # Return last successful image if available (prevents black screen)
        if room_code in _last_successful_image:
            print(f"[Display Renderer] Subprocess error, returning last successful image")
            return _last_successful_image[room_code]
        return None

def clear_cache(room_code=None):
    """
    Clear the render cache for a specific room or all rooms.
    Also increments the version counter to signal that a new render is needed.
    
    Note: This does NOT clear _last_successful_image, so the last image will still
    be available if rendering fails (prevents black screens).
    
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

