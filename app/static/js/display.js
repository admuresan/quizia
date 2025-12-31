// Display page (for large screen) - matches editor display view exactly
const socket = io();
window.socket = socket; // Make socket available globally
let currentPageIndex = 0; // Track current page index to stay in sync
let currentPage = null;
let quiz = null;
let participants = {};
let scores = {}; // Store scores from room file
let scaleContent = true; // Track if we should scale content to fit window

// Avatar utilities are now in avatar-utils.js (getAvatarEmoji function)

document.addEventListener('DOMContentLoaded', () => {
    // roomCode is declared in the template as const in global scope
    // Access it via window.roomCode to be explicit
    const currentRoomCode = window.roomCode;
    if (!currentRoomCode) {
        console.error('Room code not found');
        return;
    }
    
    // Enable audio playback by creating a user interaction context
    // This allows audio to play via socket events (autoplay policy workaround)
    let audioEnabled = false;
    const enableAudio = () => {
        if (!audioEnabled) {
            // Create a silent audio context to enable playback
            const silentAudio = document.createElement('audio');
            silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
            silentAudio.volume = 0.01;
            silentAudio.play().then(() => {
                audioEnabled = true;
                console.log('[Display] Audio playback enabled');
                silentAudio.pause();
                silentAudio.remove();
            }).catch(() => {
                // If silent audio fails, we'll need user interaction
                console.warn('[Display] Audio playback requires user interaction');
            });
        }
    };
    
    // Try to enable audio immediately on page load
    // This works in some browsers/situations where autoplay is allowed
    enableAudio();
    
    // Also enable audio on any user interaction with the display page (fallback)
    // This ensures audio works even if autoplay is blocked
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });

    socket.on('connect', () => {
        socket.emit('display_join', { room_code: currentRoomCode });
    });

    // Unified handler for both display_state and page_changed
    function handlePageUpdate(data) {
        if (data.quiz) {
            quiz = data.quiz;
        }
        // Always use server's page index to stay in sync
        if (data.current_page !== undefined) {
            currentPageIndex = data.current_page;
        } else if (data.page_index !== undefined) {
            currentPageIndex = data.page_index;
        }
        // Update participants and scores if provided
        if (data.participants) {
            participants = data.participants;
        }
        if (data.scores) {
            scores = data.scores;
        }
        // Single render call
        if (data.page) {
            renderPage(currentPageIndex, data.page);
        }
    }

    socket.on('display_state', handlePageUpdate);
    socket.on('page_changed', handlePageUpdate);

    socket.on('element_control', (data) => {
        console.log('[Display] Received element_control event:', data);
        handleElementControl(data.element_id, data.action);
    });
    
    socket.on('element_appearance_control', (data) => {
        // Handle element appearance control (show/hide)
        const elementId = data.element_id;
        const visible = data.visible;
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = visible ? 'block' : 'none';
            
            // Check if it's a question and notify server when it becomes visible
            if (visible && quiz && quiz.pages) {
                quiz.pages.forEach(page => {
                    if (page.elements && page.elements[elementId]) {
                        const elementProps = page.elements[elementId];
                        if (elementProps.is_question) {
                            notifyQuestionVisible(elementId);
                            // Check if this is a stopwatch question that should start on appear
                            triggerStopwatchStart(elementId, 'on_appear');
                        }
                    }
                });
            }
        }
    });

    socket.on('quiz_ended', (data) => {
        renderFinalResults(data.final_rankings, currentPage, quiz);
    });

    socket.on('participant_joined', (data) => {
        participants[data.participant_id] = data;
    });

    socket.on('score_updated', (data) => {
        if (data.scores) {
            scores = data.scores;
        }
        if (currentPage && currentPage.page_type === 'status_page') {
            updateStatusPage(scores);
        }
    });

    socket.on('final_scores_finalized', (data) => {
        if (data.scores) {
            scores = data.scores;
        }
        if (data.final_rankings) {
            const content = document.getElementById('results-content');
            if (content) {
                populateFinalResults(content, data.final_rankings);
            } else if (currentPage && currentPage.page_type === 'result_page') {
                // If we're on results page but content doesn't exist yet, render it
                const container = document.getElementById('display-content');
                renderFinalResultsPage(container, currentPage, quiz);
                const newContent = document.getElementById('results-content');
                if (newContent) {
                    populateFinalResults(newContent, data.final_rankings);
                }
            }
        }
    });

    socket.on('error', (data) => {
        console.error('Socket error:', data);
        if (data.message) {
            // If it's a "not running" error, show the error page
            if (data.message.includes('not running') || data.message.includes('not found')) {
                showQuizNotRunning();
            } else {
                alert('Error: ' + data.message);
            }
        }
    });

    socket.on('quiz_not_running', (data) => {
        scaleContent = false; // Don't scale when quiz is not running
        showQuizNotRunning();
    });

    socket.on('answer_display_toggle', (data) => {
        handleAnswerDisplayToggle(data);
    });
});

// Helper function to notify server when a question becomes visible
function notifyQuestionVisible(elementId) {
    if (socket && window.roomCode && elementId) {
        socket.emit('question_visible', {
            room_code: window.roomCode,
            question_id: elementId
        });
    }
}

// Helper function to check and trigger stopwatch start for questions
function triggerStopwatchStart(elementId, triggerType) {
    // triggerType: 'on_appear', 'on_play', 'on_end'
    if (!socket || !window.roomCode || !quiz || !quiz.pages) return;
    
    // Find the question element
    let questionElement = null;
    for (const page of quiz.pages) {
        if (page.elements && page.elements[elementId]) {
            const element = page.elements[elementId];
            if (element.is_question && element.question_config) {
                const questionType = element.question_config.question_type;
                if (questionType === 'stopwatch') {
                    const timerStartMethod = element.question_config.timer_start_method || 'user';
                    if (timerStartMethod === triggerType) {
                        questionElement = element;
                        break;
                    }
                }
            }
        }
    }
    
    if (questionElement) {
        // Emit event to server to broadcast to participant room
        socket.emit('stopwatch_start_trigger', {
            room_code: window.roomCode,
            question_id: elementId,
            trigger_type: triggerType
        });
    }
}

// Function to calculate and apply scaling to fit content in viewport
function applyScalingToFit(container, canvasWidth, canvasHeight) {
    if (!scaleContent) {
        // Reset transform if scaling is disabled
        container.style.transform = 'none';
        container.style.transformOrigin = 'center center';
        return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate scale to fit both width and height
    const scaleX = viewportWidth / canvasWidth;
    const scaleY = viewportHeight / canvasHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Apply scaling
    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'center center';
}

// Handle window resize to recalculate scaling
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (currentPage && scaleContent) {
            const container = document.getElementById('display-content');
            const pageType = currentPage.page_type;
            
            // Only scale regular pages, not status/result pages
            if (pageType !== 'status_page' && pageType !== 'result_page') {
                let canvasWidth = 1920;
                let canvasHeight = 1080;
                if (currentPage && currentPage.views && currentPage.views.display && currentPage.views.display.view_config && currentPage.views.display.view_config.size) {
                    canvasWidth = currentPage.views.display.view_config.size.width || 1920;
                    canvasHeight = currentPage.views.display.view_config.size.height || 1080;
                }
                applyScalingToFit(container, canvasWidth, canvasHeight);
            }
        }
    }, 100);
});

function renderPage(pageIndex, page) {
    const container = document.getElementById('display-content');
    
    if (!page) {
        console.warn('No page provided to renderPage');
        container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 2rem;">Waiting for quiz to start...</div>';
        scaleContent = false;
        container.style.transform = 'none';
        return;
    }

    if (!quiz) {
        console.error('No quiz object available for rendering');
        container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; font-size: 2rem;">Error: Quiz data not loaded</div>';
        scaleContent = false;
        container.style.transform = 'none';
        return;
    }

    currentPage = page;
    scaleContent = true; // Enable scaling when quiz is running

    // Handle special page types
    const pageType = page.page_type;
    if (pageType === 'status_page') {
        renderStatusPage(container, page, quiz);
        container.style.transform = 'none'; // Don't scale status pages
        return;
    }

    if (pageType === 'result_page') {
        renderFinalResultsPage(container, page, quiz);
        container.style.transform = 'none'; // Don't scale result pages
        return;
    }

    // Render regular display page - match editor display view exactly
    container.innerHTML = '';
    
    // Get canvas dimensions from page view_config.size (new format)
    let canvasWidth = 1920;
    let canvasHeight = 1080;
    if (page && page.views && page.views.display && page.views.display.view_config && page.views.display.view_config.size) {
        canvasWidth = page.views.display.view_config.size.width || 1920;
        canvasHeight = page.views.display.view_config.size.height || 1080;
    }
    
    // Set container size to match canvas FIRST
    container.style.position = 'relative';
    container.style.width = `${canvasWidth}px`;
    container.style.height = `${canvasHeight}px`;
    container.style.minWidth = `${canvasWidth}px`;
    container.style.minHeight = `${canvasHeight}px`;
    container.style.maxWidth = 'none';
    container.style.maxHeight = 'none';
    container.style.overflow = 'hidden';
    container.style.margin = '0';
    container.style.display = 'block';
    
    // Set background using shared utility function
    // NO hardcoded fallbacks - only use what's in the saved quiz
    if (window.BackgroundUtils && window.BackgroundUtils.applyBackground) {
        window.BackgroundUtils.applyBackground(container, page, quiz, 'display');
    } else {
        console.error('BackgroundUtils not available');
    }
    
        // Render elements - only display view elements (matching editor)
        // Use helper function to get elements from new format
        let displayElements = [];
        if (Editor && Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
            displayElements = Editor.QuizStructure.getViewElements(page, 'display');
        } else {
            console.error('Editor.QuizStructure.getViewElements not available');
        }
        
        // Filter out non-display elements
        displayElements = displayElements.filter(el => {
            const elType = el.type || el.media_type;
            return elType !== 'navigation_control' && 
                   elType !== 'audio_control' && 
                   elType !== 'answer_input' && 
                   elType !== 'answer_display';
        });
        
        if (displayElements.length > 0) {
        if (!RuntimeRenderer || !RuntimeRenderer.ElementRenderer || !RuntimeRenderer.ElementRenderer.renderElement) {
            console.error('RuntimeRenderer not available!', RuntimeRenderer);
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; font-size: 2rem;">Error: Renderer not loaded</div>';
            return;
        }
        
        // Handle appearance modes and initial visibility
        const pageStartTime = Date.now();
        
        // Build orderedElements: use appearance_order from globals
        let orderedElements;
        let appearanceOrder = [];
        
        // Use helper function to get globals
        if (Editor && Editor.QuizStructure && Editor.QuizStructure.getPageGlobals) {
            const globals = Editor.QuizStructure.getPageGlobals(page);
            appearanceOrder = globals.appearance_order || [];
        } else {
            console.error('Editor.QuizStructure.getPageGlobals not available');
        }
        if (appearanceOrder && appearanceOrder.length > 0) {
            // Use appearance_order, but also include any elements not in the order
            const orderedIds = appearanceOrder;
            const ordered = orderedIds
                .map(id => displayElements.find(el => el.id === id))
                .filter(el => el);
            
            // Add any displayElements not in appearance_order
            const orderedIdsSet = new Set(orderedIds);
            const missing = displayElements.filter(el => !orderedIdsSet.has(el.id));
            orderedElements = [...ordered, ...missing];
        } else {
            // No appearance_order, use all displayElements in their natural order
            orderedElements = displayElements;
        }
        
        orderedElements.forEach((element, index) => {
            try {
                // Get full element data from page.elements to access media_config
                let elementData = element;
                if (page.elements && page.elements[element.id]) {
                    elementData = { ...element, ...page.elements[element.id] };
                }
                
                const el = RuntimeRenderer.ElementRenderer.renderElement(container, elementData, {
                    mode: 'display'
                });
                
                if (!el) {
                    console.error(`Failed to render element ${index}:`, element);
                    return;
                }
                
                // Handle automatic media playback if this is a media element
                if (window.MediaControlManager && window.MediaControlManager.hasPlayControls(elementData)) {
                    // Handle automatic playback based on media_config
                    window.MediaControlManager.handleAutomaticPlayback(element.id, elementData, pageStartTime);
                }
                
                // Check if element has visible: false set explicitly
                if (element.visible === false) {
                    el.style.display = 'none';
                    return;
                }
                
                // Handle initial visibility based on appearance mode
                const appearanceMode = element.appearance_mode || 'on_load';
                
                if (appearanceMode === 'control') {
                    // Control mode: elements should be hidden by default and only shown when toggled on from control page
                    if (el) {
                        el.style.display = 'none';
                        element.appearance_visible = false; // Start as hidden
                    }
                } else if (appearanceMode === 'global_delay') {
                    // Global delay: show after X seconds
                    const delay = (element.appearance_delay || 0) * 1000;
                    if (el) {
                        el.style.display = 'none';
                    }
                    setTimeout(() => {
                        if (el) {
                            el.style.display = 'block';
                            element.appearance_visible = true;
                            // Notify control page to update toggle
                            if (socket && window.roomCode) {
                                socket.emit('element_appearance_changed', {
                                    room_code: window.roomCode,
                                    element_id: element.id,
                                    visible: true
                                });
                            }
                            // If this is a question, notify server for timing
                            if (element.is_question) {
                                notifyQuestionVisible(element.id);
                            }
                        }
                    }, delay);
                } else if (appearanceMode === 'after_previous' && index > 0) {
                    // After previous: show when previous element appears
                    if (el) {
                        el.style.display = 'none';
                    }
                    // This will be handled by watching the previous element
                } else if (appearanceMode === 'local_delay' && index > 0) {
                    // Local delay: show X seconds after previous element
                    if (el) {
                        el.style.display = 'none';
                    }
                    // This will be handled by watching the previous element
                } else {
                    // On load: show immediately
                    element.appearance_visible = true;
                    if (el) {
                        el.style.display = 'block';
                        // If this is a question, notify server
                        if (element.is_question) {
                            notifyQuestionVisible(element.id);
                            // Check if this is a stopwatch question that should start on appear
                            triggerStopwatchStart(element.id, 'on_appear');
                        }
                    }
                }
            } catch (error) {
                console.error(`Error rendering element ${index}:`, error, element);
            }
        });
        
        // Handle "after_previous" and "local_delay" modes by watching previous elements
        orderedElements.forEach((element, index) => {
            if (index === 0) return;
            
            const appearanceMode = element.appearance_mode || 'on_load';
            const el = document.getElementById(element.id);
            
            if (appearanceMode === 'after_previous') {
                // Watch previous element
                const prevElement = orderedElements[index - 1];
                const prevEl = document.getElementById(prevElement.id);
                if (prevEl && el) {
                    // Use MutationObserver to watch for display changes
                    const observer = new MutationObserver((mutations) => {
                        if (prevEl.style.display === 'block' && el.style.display === 'none') {
                            el.style.display = 'block';
                            element.appearance_visible = true;
                            // Notify control page
                            if (socket) {
                                socket.emit('element_appearance_changed', {
                                    room_code: window.roomCode,
                                    element_id: element.id,
                                    visible: true
                                });
                            }
                            // If this is a question, notify server for timing
                            if (element.is_question) {
                                notifyQuestionVisible(element.id);
                            }
                        }
                    });
                    observer.observe(prevEl, { attributes: true, attributeFilter: ['style'] });
                }
            } else if (appearanceMode === 'local_delay') {
                // Watch previous element and show after delay
                const prevElement = orderedElements[index - 1];
                const prevEl = document.getElementById(prevElement.id);
                const delay = (element.appearance_delay || 0) * 1000;
                
                if (prevEl && el) {
                    // Function to show element after delay
                    const showAfterDelay = () => {
                        if (el && el.style.display === 'none') {
                            setTimeout(() => {
                                if (el) {
                                    el.style.display = 'block';
                                    element.appearance_visible = true;
                                    // Notify control page
                                    if (socket && window.roomCode) {
                                        socket.emit('element_appearance_changed', {
                                            room_code: window.roomCode,
                                            element_id: element.id,
                                            visible: true
                                        });
                                    }
                                    // If this is a question, notify server for timing
                                    if (element.is_question) {
                                        notifyQuestionVisible(element.id);
                                    }
                                }
                            }, delay);
                        }
                    };
                    
                    // Check initial state - if previous element is already visible, trigger immediately
                    if (prevEl.style.display === 'block' || prevEl.style.display === '') {
                        showAfterDelay();
                    }
                    
                    // Watch for changes to previous element's visibility
                    const observer = new MutationObserver((mutations) => {
                        if (prevEl.style.display === 'block' && el.style.display === 'none') {
                            showAfterDelay();
                        }
                    });
                    observer.observe(prevEl, { attributes: true, attributeFilter: ['style'] });
                }
            }
        });
        
        // After rendering, check for any questions that are already visible (on_load mode)
        // and notify server for timing
        orderedElements.forEach((element) => {
            if (element.is_question) {
                const el = document.getElementById(element.id);
                if (el && el.style.display !== 'none' && element.appearance_visible) {
                    // Question is already visible, notify server
                    notifyQuestionVisible(element.id);
                }
            }
        });
    } else {
        console.warn('Page has no elements array');
    }
    
    // Apply scaling to fit viewport
    applyScalingToFit(container, canvasWidth, canvasHeight);
    
    // Room code display in bottom left (positioned relative to viewport, not scaled content)
    const roomCodeEl = document.getElementById('room-code-display');
    if (roomCodeEl) {
        roomCodeEl.textContent = window.roomCode || '';
        roomCodeEl.style.position = 'fixed'; // Use fixed positioning so it's not affected by scaling
        roomCodeEl.style.bottom = '20px';
        roomCodeEl.style.left = '20px';
        roomCodeEl.style.zIndex = '10000';
        roomCodeEl.style.padding = '0.5rem 1rem';
        roomCodeEl.style.background = 'rgba(0, 0, 0, 0.5)';
        roomCodeEl.style.color = 'white';
        roomCodeEl.style.borderRadius = '4px';
        roomCodeEl.style.fontSize = '1.2rem';
        roomCodeEl.style.fontWeight = 'bold';
    }
}

function handleElementControl(elementId, action) {
    // elementId from socket is the exact key from JSON (e.g., "element-1767163527725")
    // The runtime renderer uses element.id directly as the container ID (no prefix)
    console.log('[handleElementControl] Called with elementId:', elementId, 'action:', action);
    const element = document.getElementById(elementId);
    
    if (!element) {
        console.warn('[handleElementControl] Element container not found. elementId:', elementId);
        // Log all element IDs in display-content for debugging
        const container = document.getElementById('display-content');
        if (container) {
            const allElements = container.querySelectorAll('[id]');
            console.log('[handleElementControl] Available element containers:', Array.from(allElements).map(el => el.id));
            console.log('[handleElementControl] Looking for element with ID:', elementId);
        }
        return;
    }
    
    console.log('[handleElementControl] Found element container:', element, 'action:', action);
    
    // Use elementId directly for looking up element data in page.elements
    const baseId = elementId;

    switch (action) {
        case 'show':
            element.style.display = 'block';
            // If this is a question, notify server for timing
            if (quiz && quiz.pages) {
                quiz.pages.forEach(page => {
                    if (page.elements) {
                        // Get element from new format
                        const el = page.elements && page.elements[elementId] ? {
                            id: elementId,
                            ...page.elements[elementId]
                        } : null;
                        if (el && el.is_question) {
                            notifyQuestionVisible(elementId);
                        }
                    }
                });
            }
            break;
        case 'hide':
            element.style.display = 'none';
            break;
        case 'play':
            // Check if this is a counter element
            const counterText = element.querySelector(`#counter-text-${baseId}`);
            if (counterText && window.CounterManager) {
                // Find the element data to get properties
                let elementData = null;
                if (quiz && quiz.pages) {
                    quiz.pages.forEach(page => {
                        if (page.elements && page.elements[baseId]) {
                            elementData = {
                                id: baseId,
                                ...page.elements[baseId]
                            };
                        }
                    });
                }
                
                if (elementData && elementData.properties) {
                    // Start the counter
                    window.CounterManager.startCounter(baseId, elementData.properties, (id, value, displayText) => {
                        const textEl = document.querySelector(`#counter-text-${id}`);
                        if (textEl) {
                            textEl.textContent = displayText;
                        }
                    });
                }
            } else {
                // Find audio/video element - audio/video elements use regular element IDs, not prefixed
                // The audio/video tags are children of the element container
                let audio = element.querySelector('audio');
                let video = element.querySelector('video');
                
                // Fallback: try finding by ID if querySelector didn't work
                if (!audio) {
                    audio = document.getElementById(`audio-${baseId}`);
                }
                if (!video) {
                    video = document.getElementById(`video-${baseId}`);
                }
                
                // Get element data to construct src if needed
                let elementData = null;
                let volume = 1.0;
                if (quiz && quiz.pages) {
                    quiz.pages.forEach(page => {
                        if (page.elements && page.elements[baseId]) {
                            elementData = {
                                id: baseId,
                                ...page.elements[baseId]
                            };
                            if (elementData.properties && elementData.properties.volume !== undefined) {
                                volume = parseFloat(elementData.properties.volume);
                            }
                        }
                    });
                }
                
                // If audio element found but has no src, set it from element data
                if (audio && !audio.src && elementData) {
                    let src = elementData.media_url || elementData.src || elementData.url || elementData.file_name || elementData.filename || '';
                    // If src is a filename without path prefix, add the API path
                    if (src && !src.startsWith('http') && !src.startsWith('/')) {
                        src = '/api/media/serve/' + src;
                    }
                    if (src) {
                        audio.src = src;
                    }
                }
                
                // If video element found but has no src, set it from element data
                if (video && !video.src && elementData) {
                    let src = elementData.media_url || elementData.src || elementData.url || elementData.file_name || elementData.filename || '';
                    // If src is a filename without path prefix, add the API path
                    if (src && !src.startsWith('http') && !src.startsWith('/')) {
                        src = '/api/media/serve/' + src;
                    }
                    if (src) {
                        video.src = src;
                    }
                }
                
                console.log('[handleElementControl] Looking for audio/video in container:', elementId, 'element:', element, 'children:', Array.from(element.children).map(c => c.tagName + (c.id ? '#' + c.id : '')));
                
                if (audio) {
                    audio.volume = volume;
                    console.log('[handleElementControl] Playing audio:', {
                        audio: audio,
                        src: audio.src,
                        currentSrc: audio.currentSrc,
                        readyState: audio.readyState,
                        volume: volume,
                        element: element,
                        paused: audio.paused
                    });
                    
                    // Try to play immediately - browser will handle buffering
                    const playPromise = audio.play();
                    
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                console.log('[handleElementControl] Audio playback started successfully');
                                
                                // Notify any playable elements (audio, video, counter) waiting for this to start
                                // Dispatch a 'play' event so media-control-manager can trigger waiting elements
                                audio.dispatchEvent(new Event('play'));
                                
                                // Also notify MediaControlManager if available
                                if (window.MediaControlManager && window.MediaControlManager.notifyMediaStarted) {
                                    window.MediaControlManager.notifyMediaStarted(baseId);
                                }
                            })
                            .catch(err => {
                                console.error('[handleElementControl] Error playing audio:', err);
                                // If play failed, try loading first then playing
                                if (audio.readyState === 0 || !audio.src) {
                                    console.log('[handleElementControl] Audio not loaded, loading first...');
                                    audio.load();
                                    // Try again after load
                                    audio.addEventListener('canplay', function tryPlayAgain() {
                                        audio.removeEventListener('canplay', tryPlayAgain);
                                        audio.play().catch(err2 => {
                                            console.error('[handleElementControl] Error playing audio after load:', err2);
                                        });
                                    }, { once: true });
                                } else {
                                    // Audio is loaded but play failed - might be autoplay policy
                                    console.warn('[handleElementControl] Audio play failed, might be blocked by autoplay policy');
                                }
                            });
                    } else {
                        // Fallback for older browsers
                        audio.play();
                    }
                    
                    // Check for stopwatch questions that should start on play
                    // The question element itself might be the playable element
                    if (quiz && quiz.pages) {
                        quiz.pages.forEach(page => {
                            if (page.elements && page.elements[baseId]) {
                                const qElement = page.elements[baseId];
                                if (qElement.is_question && qElement.question_config) {
                                    const questionType = qElement.question_config.question_type;
                                    if (questionType === 'stopwatch') {
                                        const timerStartMethod = qElement.question_config.timer_start_method || 'user';
                                        if (timerStartMethod === 'on_play') {
                                            triggerStopwatchStart(baseId, 'on_play');
                                        }
                                    }
                                }
                            }
                        });
                    }
                    
                    // Add event listener for when audio ends
                    audio.addEventListener('ended', () => {
                        // Check for stopwatch questions that should start on end
                        if (quiz && quiz.pages) {
                            quiz.pages.forEach(page => {
                                if (page.elements && page.elements[baseId]) {
                                    const qElement = page.elements[baseId];
                                    if (qElement.is_question && qElement.question_config) {
                                        const questionType = qElement.question_config.question_type;
                                        if (questionType === 'stopwatch') {
                                            const timerStartMethod = qElement.question_config.timer_start_method || 'user';
                                            if (timerStartMethod === 'on_end') {
                                                triggerStopwatchStart(baseId, 'on_end');
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    });
                }
                if (video) {
                    video.volume = volume;
                    console.log('[handleElementControl] Playing video:', video, 'src:', video.src, 'volume:', volume, 'element:', element);
                    
                    // Ensure video is ready before playing
                    const playVideo = () => {
                        // Check if video is ready to play
                        if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                            video.play().then(() => {
                                console.log('[handleElementControl] Video playback started successfully');
                                
                                // Notify any playable elements (audio, video, counter) waiting for this to start
                                // Dispatch a 'play' event so media-control-manager can trigger waiting elements
                                video.dispatchEvent(new Event('play'));
                                
                                // Also notify MediaControlManager if available
                                if (window.MediaControlManager && window.MediaControlManager.notifyMediaStarted) {
                                    window.MediaControlManager.notifyMediaStarted(baseId);
                                }
                            }).catch(err => {
                                console.error('[handleElementControl] Error playing video:', err, video, video.src);
                            });
                        } else {
                            // Wait for video to be ready
                            const onCanPlay = () => {
                                video.removeEventListener('canplay', onCanPlay);
                                video.play().then(() => {
                                    console.log('[handleElementControl] Video playback started successfully');
                                    
                                    // Notify any playable elements (audio, video, counter) waiting for this to start
                                    video.dispatchEvent(new Event('play'));
                                    
                                    if (window.MediaControlManager && window.MediaControlManager.notifyMediaStarted) {
                                        window.MediaControlManager.notifyMediaStarted(baseId);
                                    }
                                }).catch(err => {
                                    console.error('[handleElementControl] Error playing video:', err, video, video.src);
                                });
                            };
                            video.addEventListener('canplay', onCanPlay);
                            // Load the video if src was just set or if not loading
                            if (video.readyState === 0) {
                                video.load();
                            }
                            // Timeout fallback - play even if canplay doesn't fire
                            setTimeout(() => {
                                video.removeEventListener('canplay', onCanPlay);
                                if (video.readyState > 0) {
                                    video.play().catch(err => {
                                        console.error('[handleElementControl] Error playing video (timeout fallback):', err);
                                    });
                                }
                            }, 100);
                        }
                    };
                    
                    playVideo();
                    
                    // Check for stopwatch questions that should start on play
                    // The question element itself might be the playable element
                    if (quiz && quiz.pages) {
                        quiz.pages.forEach(page => {
                            if (page.elements && page.elements[baseId]) {
                                const qElement = page.elements[baseId];
                                if (qElement.is_question && qElement.question_config) {
                                    const questionType = qElement.question_config.question_type;
                                    if (questionType === 'stopwatch') {
                                        const timerStartMethod = qElement.question_config.timer_start_method || 'user';
                                        if (timerStartMethod === 'on_play') {
                                            triggerStopwatchStart(baseId, 'on_play');
                                        }
                                    }
                                }
                            }
                        });
                    }
                    
                    // Add event listener for when video ends
                    video.addEventListener('ended', () => {
                        // Check for stopwatch questions that should start on end
                        if (quiz && quiz.pages) {
                            quiz.pages.forEach(page => {
                                if (page.elements && page.elements[baseId]) {
                                    const qElement = page.elements[baseId];
                                    if (qElement.is_question && qElement.question_config) {
                                        const questionType = qElement.question_config.question_type;
                                        if (questionType === 'stopwatch') {
                                            const timerStartMethod = qElement.question_config.timer_start_method || 'user';
                                            if (timerStartMethod === 'on_end') {
                                                triggerStopwatchStart(baseId, 'on_end');
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    });
                }
                
                if (!audio && !video) {
                    console.warn('[handleElementControl] Audio/video element not found for:', elementId, 'baseId:', baseId, 'container:', element, 'children:', Array.from(element.children).map(c => c.tagName + (c.id ? '#' + c.id : '')));
                }
            }
            break;
        case 'pause':
            // Check if this is a counter element
            if (window.CounterManager && window.CounterManager.isCounterRunning && window.CounterManager.isCounterRunning(baseId)) {
                window.CounterManager.stopCounter(baseId);
            } else {
                // Not a counter, try audio/video
                // Audio/video elements are children of the element container
                let audio2 = element.querySelector('audio');
                let video2 = element.querySelector('video');
                
                // Fallback: try finding by ID if querySelector didn't work
                if (!audio2) {
                    audio2 = document.getElementById(`audio-${baseId}`);
                }
                if (!video2) {
                    video2 = document.getElementById(`video-${baseId}`);
                }
                
                if (audio2) {
                    console.log('[handleElementControl] Pausing audio:', audio2);
                    audio2.pause();
                }
                if (video2) {
                    console.log('[handleElementControl] Pausing video:', video2);
                    video2.pause();
                }
                
                if (!audio2 && !video2) {
                    console.warn('[handleElementControl] Audio/video element not found for pause:', elementId, 'baseId:', baseId, element);
                }
            }
            break;
    }
}

function renderStatusPage(container, page, quiz) {
    container.innerHTML = '';
    
    // Set container styles WITHOUT background (set background separately AFTER)
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'flex-start';
    container.style.color = 'white';
    container.style.padding = '2rem';
    container.style.position = 'relative';
    
    // Set background using shared utility function
    // NO hardcoded fallbacks - only use what's in the saved quiz
    if (window.BackgroundUtils && window.BackgroundUtils.applyBackground) {
        window.BackgroundUtils.applyBackground(container, page, quiz, 'display');
    } else {
        console.error('BackgroundUtils not available');
    }
    
    const title = document.createElement('h1');
    title.textContent = 'Current Rankings';
    title.style.cssText = 'font-size: 3rem; margin-bottom: 2rem; text-align: center;';
    container.appendChild(title);
    
    const content = document.createElement('div');
    content.id = 'rankings-content';
    content.style.cssText = 'width: 100%; max-width: 1200px;';
    container.appendChild(content);
    
    // Populate status page with current scores
    updateStatusPage(scores);
}

function updateStatusPage(currentScores) {
    const content = document.getElementById('rankings-content');
    if (!content) return;

    // Use provided scores or fall back to stored scores
    const scoresToUse = currentScores || scores;

    // Get participants with scores - if scores aren't available yet, show all participants with 0
    const allParticipantIds = Object.keys(participants || {});
    const rankings = allParticipantIds.map(id => ({
        id,
        name: participants[id]?.name || 'Unknown',
        avatar: participants[id]?.avatar,
        score: scoresToUse[id] || 0
    })).sort((a, b) => b.score - a.score);

    // Top 3 podium
    const top3 = rankings.slice(0, 3);
    const rest = rankings.slice(3);

    const podium = document.createElement('div');
    podium.style.cssText = 'display: flex; align-items: flex-end; justify-content: center; gap: 2rem; margin: 2rem 0;';
    
    top3.forEach((p, i) => {
        const place = document.createElement('div');
        place.style.cssText = 'text-align: center;';
        place.style.order = i === 0 ? '2' : i === 1 ? '1' : '3';
        
        const avatar = document.createElement('div');
        avatar.textContent = getAvatarEmoji(p.avatar) || '👤';
        avatar.style.cssText = 'width: 100px; height: 100px; border-radius: 50%; border: 4px solid gold; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: rgba(255,255,255,0.2);';
        place.appendChild(avatar);
        
        const name = document.createElement('div');
        name.textContent = p.name;
        name.style.cssText = 'font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;';
        place.appendChild(name);
        
        const score = document.createElement('div');
        score.textContent = `${p.score} points`;
        score.style.cssText = 'font-size: 1.2rem;';
        place.appendChild(score);
        
        podium.appendChild(place);
    });
    
    content.innerHTML = '';
    content.appendChild(podium);

    if (rest.length > 0) {
        const rankingsList = document.createElement('div');
        rankingsList.style.cssText = 'width: 100%; max-width: 800px; margin: 2rem auto 0;';
        
        rest.forEach((p, i) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; padding: 1rem; background: rgba(255,255,255,0.1); margin: 0.5rem 0; border-radius: 8px;';
            
            const avatar = document.createElement('div');
            avatar.textContent = getAvatarEmoji(p.avatar) || '👤';
            avatar.style.cssText = 'width: 50px; height: 50px; border-radius: 50%; margin-right: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: rgba(255,255,255,0.2);';
            item.appendChild(avatar);
            
            const info = document.createElement('div');
            info.style.cssText = 'flex: 1;';
            
            const name = document.createElement('div');
            name.textContent = p.name;
            name.style.cssText = 'font-size: 1.2rem; font-weight: bold;';
            info.appendChild(name);
            
            const score = document.createElement('div');
            score.textContent = `${p.score} points - Rank ${i + 4}`;
            score.style.cssText = 'font-size: 1rem; opacity: 0.8;';
            info.appendChild(score);
            
            item.appendChild(info);
            rankingsList.appendChild(item);
        });
        
        content.appendChild(rankingsList);
    }
}

function renderFinalResultsPage(container, page, quiz) {
    container.innerHTML = '';
    
    // Set container styles WITHOUT background (we'll set that separately)
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'flex-start';
    container.style.color = 'white';
    container.style.padding = '2rem';
    container.style.position = 'relative';
    
    // Set background using shared utility function
    // NO hardcoded fallbacks - only use what's in the saved quiz
    if (window.BackgroundUtils && window.BackgroundUtils.applyBackground) {
        window.BackgroundUtils.applyBackground(container, page, quiz, 'display');
    } else {
        console.error('BackgroundUtils not available');
    }
    
    const title = document.createElement('h1');
    title.innerHTML = '🎉 Quiz Complete! 🎉';
    title.style.cssText = 'font-size: 3rem; margin-bottom: 2rem; text-align: center;';
    container.appendChild(title);
    
    const content = document.createElement('div');
    content.id = 'results-content';
    content.style.cssText = 'width: 100%; max-width: 1200px;';
    container.appendChild(content);
}

function showQuizNotRunning() {
    const container = document.getElementById('display-content');
    if (!container) return;
    
    container.innerHTML = '';
    container.style.cssText = 'width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; background: transparent;';
    container.style.transform = 'none'; // Reset transform when quiz is not running
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'background: white; border-radius: 16px; padding: 3rem; max-width: 600px; width: 90%; text-align: center; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);';
    
    const icon = document.createElement('div');
    icon.textContent = '🔍';
    icon.style.cssText = 'font-size: 5rem; margin-bottom: 1.5rem;';
    errorDiv.appendChild(icon);
    
    const title = document.createElement('h1');
    title.textContent = 'Quiz Not Found';
    title.style.cssText = 'font-size: 2rem; font-weight: bold; color: #333; margin-bottom: 1rem;';
    errorDiv.appendChild(title);
    
    const message = document.createElement('p');
    message.textContent = 'No quiz is currently running with this code. The quiz may have ended, or the code may be incorrect.';
    message.style.cssText = 'font-size: 1.2rem; color: #666; margin-bottom: 1rem; line-height: 1.6;';
    errorDiv.appendChild(message);
    
    const roomCodeEl = document.createElement('div');
    roomCodeEl.textContent = window.roomCode || 'Unknown';
    roomCodeEl.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #667eea; margin: 1rem 0; padding: 0.5rem; background: #f5f5f5; border-radius: 8px; font-family: "Courier New", monospace;';
    errorDiv.appendChild(roomCodeEl);
    
    const backButton = document.createElement('a');
    backButton.href = '/';
    backButton.textContent = 'Go to Home';
    backButton.style.cssText = 'display: inline-block; padding: 1rem 2rem; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-size: 1.1rem; font-weight: 500; margin-top: 1rem;';
    errorDiv.appendChild(backButton);
    
    container.appendChild(errorDiv);
}

function renderFinalResults(rankings, page, quiz) {
    const container = document.getElementById('display-content');
    const content = document.getElementById('results-content');
    
    if (!content) {
        renderFinalResultsPage(container, page, quiz);
        const newContent = document.getElementById('results-content');
        if (newContent) {
            populateFinalResults(newContent, rankings);
        }
    } else {
        populateFinalResults(content, rankings);
    }
}

function populateFinalResults(content, rankings) {
    content.innerHTML = '';
    
    if (rankings.length === 0) return;
    
    // Main container with flex layout: champion/podium on left, rankings list on right
    const mainContainer = document.createElement('div');
    mainContainer.style.cssText = 'display: flex; gap: 3rem; align-items: flex-start; width: 100%; max-width: 1400px; margin: 0 auto;';
    
    // Left side: Winner section and Top 3 podium
    const leftSection = document.createElement('div');
    leftSection.style.cssText = 'flex: 1; min-width: 0;';
    
    // Winner section (takes most space)
    const winner = rankings[0];
    const winnerSection = document.createElement('div');
    winnerSection.style.cssText = 'text-align: center; margin-bottom: 2rem;';
    
    const winnerEmoji = document.createElement('div');
    winnerEmoji.textContent = '🏆';
    winnerEmoji.style.cssText = 'font-size: 8rem; margin-bottom: 1rem;';
    winnerSection.appendChild(winnerEmoji);
    
    const winnerAvatar = document.createElement('div');
    winnerAvatar.textContent = getAvatarEmoji(winner.avatar) || '👤';
    winnerAvatar.style.cssText = 'width: 150px; height: 150px; border-radius: 50%; border: 6px solid gold; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 5rem; background: rgba(255,255,255,0.2);';
    winnerSection.appendChild(winnerAvatar);
    
    const winnerName = document.createElement('div');
    winnerName.textContent = winner.name || 'Winner';
    winnerName.style.cssText = 'font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;';
    winnerSection.appendChild(winnerName);
    
    const winnerTitle = document.createElement('div');
    winnerTitle.innerHTML = '🏆 CHAMPION 🏆';
    winnerTitle.style.cssText = 'font-size: 1.8rem;';
    winnerSection.appendChild(winnerTitle);
    
    leftSection.appendChild(winnerSection);
    
    // Top 3 podium
    const podium = document.createElement('div');
    podium.style.cssText = 'display: flex; align-items: flex-end; justify-content: center; gap: 2rem;';
    
    rankings.slice(0, 3).forEach((p, i) => {
        const place = document.createElement('div');
        place.style.cssText = 'text-align: center;';
        place.style.order = i === 0 ? '2' : i === 1 ? '1' : '3';
        
        const avatar = document.createElement('div');
        avatar.textContent = getAvatarEmoji(p.avatar) || '👤';
        avatar.style.cssText = 'width: 100px; height: 100px; border-radius: 50%; border: 4px solid gold; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: rgba(255,255,255,0.2);';
        place.appendChild(avatar);
        
        const name = document.createElement('div');
        name.textContent = p.name;
        name.style.cssText = 'font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;';
        place.appendChild(name);
        
        const score = document.createElement('div');
        score.textContent = `${p.score} points`;
        score.style.cssText = 'font-size: 1.2rem;';
        place.appendChild(score);
        
        podium.appendChild(place);
    });
    
    leftSection.appendChild(podium);
    mainContainer.appendChild(leftSection);
    
    // Right side: Rest of rankings
    if (rankings.length > 3) {
        const rightSection = document.createElement('div');
        rightSection.style.cssText = 'flex: 1; min-width: 400px; max-height: 80vh; overflow-y: auto;';
        
        const rankingsTitle = document.createElement('h3');
        rankingsTitle.textContent = 'All Rankings';
        rankingsTitle.style.cssText = 'font-size: 1.8rem; font-weight: bold; margin-bottom: 1rem; text-align: center;';
        rightSection.appendChild(rankingsTitle);
        
        const rankingsList = document.createElement('div');
        rankingsList.style.cssText = 'width: 100%;';
        
        rankings.slice(3).forEach((p) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; padding: 1rem; background: rgba(255,255,255,0.1); margin: 0.5rem 0; border-radius: 8px;';
            
            const avatar = document.createElement('div');
            avatar.textContent = getAvatarEmoji(p.avatar) || '👤';
            avatar.style.cssText = 'width: 50px; height: 50px; border-radius: 50%; margin-right: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: rgba(255,255,255,0.2); flex-shrink: 0;';
            item.appendChild(avatar);
            
            const info = document.createElement('div');
            info.style.cssText = 'flex: 1; min-width: 0;';
            
            const name = document.createElement('div');
            name.textContent = p.name;
            name.style.cssText = 'font-size: 1.2rem; font-weight: bold; margin-bottom: 0.25rem;';
            info.appendChild(name);
            
            const score = document.createElement('div');
            score.textContent = `${p.score} points - Rank ${p.rank}`;
            score.style.cssText = 'font-size: 1rem; opacity: 0.8;';
            info.appendChild(score);
            
            item.appendChild(info);
            rankingsList.appendChild(item);
        });
        
        rightSection.appendChild(rankingsList);
        mainContainer.appendChild(rightSection);
    }
    
    content.appendChild(mainContainer);
}

function handleAnswerDisplayToggle(data) {
    const visible = data.visible;
    const questionId = data.question_id;
    
    // Remove existing overlay if any
    let overlay = document.getElementById('answer-display-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    if (!visible) {
        return; // Just hide if toggle is off
    }
    
    // Create overlay
    overlay = document.createElement('div');
    overlay.id = 'answer-display-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.7); z-index: 100000; display: flex; align-items: center; justify-content: center;';
    
    // Create content container (75% of screen)
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = 'width: 75vw; height: 75vh; background: white; border-radius: 16px; padding: 2rem; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); position: relative;';
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; border: none; background: #f0f0f0; border-radius: 50%; font-size: 2rem; cursor: pointer; line-height: 1; color: #666;';
    closeBtn.onclick = () => {
        overlay.remove();
    };
    contentContainer.appendChild(closeBtn);
    
    // Render answers based on answer type
    const answerType = data.answerType || 'text';
    const questionTitle = data.questionTitle || 'Question';
    const answers = data.answers || {};
    const participants = data.participants || {};
    
    // Title
    const title = document.createElement('h2');
    title.textContent = questionTitle;
    title.style.cssText = 'font-size: 2rem; color: #2196F3; margin-bottom: 1.5rem; padding-right: 3rem;';
    contentContainer.appendChild(title);
    
    // Get visibility state and correct answer
    const answerVisibility = data.answerVisibility || {};
    const visibleParticipantIds = answerVisibility.visibleParticipantIds || [];
    const controlAnswerVisible = answerVisibility.controlAnswerVisible || false;
    const correctAnswer = data.correctAnswer;
    
    // Render answers based on type
    if (answerType === 'image_click') {
        renderImageClickAnswersDisplay(contentContainer, answers, participants, data.imageSrc, visibleParticipantIds, controlAnswerVisible, correctAnswer);
    } else {
        renderTextAnswersDisplay(contentContainer, answers, participants, answerType, visibleParticipantIds, controlAnswerVisible, correctAnswer);
    }
    
    overlay.appendChild(contentContainer);
    document.body.appendChild(overlay);
}

function renderTextAnswersDisplay(container, answers, participants, answerType, visibleParticipantIds, controlAnswerVisible, correctAnswer) {
    const answersList = document.createElement('div');
    answersList.style.cssText = 'display: flex; flex-direction: column; gap: 1rem;';
    
    const allParticipantIds = Object.keys(participants || {});
    // Filter to only show visible participant answers
    const visibleParticipantIdsSet = new Set(visibleParticipantIds || []);
    const submittedAnswers = allParticipantIds.filter(pid => 
        answers[pid] && 
        answers[pid].answer !== undefined && 
        visibleParticipantIdsSet.has(pid)
    );
    
    const hasAnswers = submittedAnswers.length > 0 || (controlAnswerVisible && correctAnswer !== null && correctAnswer !== undefined && correctAnswer !== '');
    
    if (!hasAnswers) {
        const noAnswers = document.createElement('div');
        noAnswers.style.cssText = 'color: #666; font-style: italic; padding: 2rem; text-align: center; font-size: 1.2rem;';
        noAnswers.textContent = 'No answers to display';
        answersList.appendChild(noAnswers);
    } else {
        submittedAnswers.forEach(participantId => {
            const answerData = answers[participantId];
            const participant = participants[participantId] || {};
            
            const answerRow = document.createElement('div');
            answerRow.style.cssText = 'display: flex; align-items: flex-start; gap: 1rem; padding: 1.5rem; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #2196F3;';
            
            // Avatar
            const avatar = document.createElement('div');
            avatar.textContent = window.getAvatarEmoji ? window.getAvatarEmoji(participant.avatar) : '👤';
            avatar.style.cssText = 'font-size: 2rem; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: white; border-radius: 50%;';
            answerRow.appendChild(avatar);
            
            // Name and answer
            const info = document.createElement('div');
            info.style.cssText = 'flex: 1;';
            
            const name = document.createElement('div');
            name.textContent = participant.name || 'Unknown';
            name.style.cssText = 'font-weight: bold; font-size: 1.3rem; color: #333; margin-bottom: 0.5rem;';
            info.appendChild(name);
            
            const answerText = document.createElement('div');
            answerText.style.cssText = 'font-size: 1.1rem; color: #666; line-height: 1.6;';
            if (answerData && answerData.answer !== undefined) {
                answerText.textContent = String(answerData.answer || '');
            } else {
                answerText.textContent = 'No answer';
                answerText.style.color = '#999';
            }
            info.appendChild(answerText);
            
            answerRow.appendChild(info);
            answersList.appendChild(answerRow);
        });
        
        // Add control answer if visible
        if (controlAnswerVisible && correctAnswer !== null && correctAnswer !== undefined && correctAnswer !== '') {
            const controlAnswerRow = document.createElement('div');
            controlAnswerRow.style.cssText = 'display: flex; align-items: flex-start; gap: 1rem; padding: 1.5rem; background: #f0f7ff; border-radius: 8px; border-left: 4px solid #2196F3;';
            
            // Control answer indicator
            const controlIndicator = document.createElement('div');
            controlIndicator.textContent = '✓';
            controlIndicator.style.cssText = 'font-size: 2rem; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #2196F3; border-radius: 50%; color: white; font-weight: bold;';
            controlAnswerRow.appendChild(controlIndicator);
            
            // Label and answer
            const info = document.createElement('div');
            info.style.cssText = 'flex: 1;';
            
            const name = document.createElement('div');
            name.textContent = 'Correct Answer';
            name.style.cssText = 'font-weight: bold; font-size: 1.3rem; color: #333; margin-bottom: 0.5rem;';
            info.appendChild(name);
            
            const answerText = document.createElement('div');
            answerText.style.cssText = 'font-size: 1.1rem; color: #666; line-height: 1.6;';
            answerText.textContent = String(correctAnswer || '');
            info.appendChild(answerText);
            
            controlAnswerRow.appendChild(info);
            answersList.appendChild(controlAnswerRow);
        }
    }
    
    container.appendChild(answersList);
}

function renderImageClickAnswersDisplay(container, answers, participants, imageSrc, visibleParticipantIds, controlAnswerVisible, correctAnswer) {
    const Common = QuestionTypes ? QuestionTypes.Common : null;
    
    // Image container
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = 'position: relative; margin-bottom: 2rem; border: 2px solid #ddd; border-radius: 8px; overflow: auto; background: #f0f0f0; min-height: 300px; max-height: 400px; display: flex; justify-content: center; align-items: flex-start; padding: 1rem;';
    
    if (imageSrc) {
        const imageWrapper = document.createElement('div');
        imageWrapper.style.cssText = 'position: relative; display: inline-block; max-width: 100%;';
        
        const img = document.createElement('img');
        img.src = imageSrc.startsWith('/') || imageSrc.startsWith('http') ? imageSrc : '/api/media/serve/' + imageSrc;
        img.style.cssText = 'width: 100%; height: auto; display: block; max-width: 800px; object-fit: contain;';
        
        // Function to update highlights
        const updateHighlights = () => {
            const existingHighlights = imageWrapper.querySelectorAll('.click-highlight');
            existingHighlights.forEach(h => h.remove());
            
            const rect = img.getBoundingClientRect();
            const imgWidth = rect.width;
            const imgHeight = rect.height;
            const minDim = Math.min(imgWidth, imgHeight);
            const radiusPx = minDim * 0.1;
            
            const visibleParticipantIdsSet = new Set(visibleParticipantIds || []);
            const allParticipantIds = Object.keys(participants || {});
            const participantIndexMap = {};
            allParticipantIds.forEach((pid, idx) => {
                participantIndexMap[pid] = idx;
            });
            
            // Show highlights only for visible participant answers
            Object.entries(answers || {}).forEach(([participantId, answerData]) => {
                if (visibleParticipantIdsSet.has(participantId) &&
                    answerData && answerData.answer && typeof answerData.answer === 'object' && 
                    answerData.answer.x !== undefined && answerData.answer.y !== undefined) {
                    const highlight = document.createElement('div');
                    highlight.className = 'click-highlight';
                    const colorIndex = participantIndexMap[participantId] !== undefined ? participantIndexMap[participantId] : 0;
                    const color = Common ? Common.getParticipantColor(colorIndex) : '#FF0000';
                    
                    const leftPercent = answerData.answer.x;
                    const topPercent = answerData.answer.y;
                    
                    highlight.style.cssText = `position: absolute; width: ${radiusPx * 2}px; height: ${radiusPx * 2}px; border-radius: 50%; border: 3px solid ${color}; background: ${Common ? Common.hexToRgba(color, 0.2) : 'rgba(255,0,0,0.2)'}; left: ${leftPercent}%; top: ${topPercent}%; transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 0 8px ${color}80;`;
                    highlight.title = `${participants[participantId]?.name || 'Participant'}: (${leftPercent.toFixed(1)}%, ${topPercent.toFixed(1)}%)`;
                    imageWrapper.appendChild(highlight);
                }
            });
            
            // Show control answer highlight if visible
            if (controlAnswerVisible && correctAnswer && typeof correctAnswer === 'object' && 
                correctAnswer.x !== undefined && correctAnswer.y !== undefined) {
                const controlHighlight = document.createElement('div');
                controlHighlight.className = 'click-highlight control-answer-highlight';
                const color = '#2196F3'; // Blue for control answer
                
                const leftPercent = correctAnswer.x;
                const topPercent = correctAnswer.y;
                
                controlHighlight.style.cssText = `position: absolute; width: ${radiusPx * 2}px; height: ${radiusPx * 2}px; border-radius: 50%; border: 4px solid ${color}; background: rgba(33, 150, 243, 0.3); left: ${leftPercent}%; top: ${topPercent}%; transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 0 12px ${color}; z-index: 10;`;
                controlHighlight.title = `Correct Answer: (${leftPercent.toFixed(1)}%, ${topPercent.toFixed(1)}%)`;
                imageWrapper.appendChild(controlHighlight);
            }
        };
        
        img.onload = updateHighlights;
        if (img.complete) {
            img.onload();
        }
        
        imageWrapper.appendChild(img);
        imageContainer.appendChild(imageWrapper);
    } else {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'width: 100%; height: 300px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999; font-size: 1.2rem;';
        placeholder.textContent = 'Image not available';
        imageContainer.appendChild(placeholder);
    }
    
    container.appendChild(imageContainer);
    
    // Answers list below image
    const answersList = document.createElement('div');
    answersList.style.cssText = 'display: flex; flex-direction: column; gap: 1rem;';
    
    const visibleParticipantIdsSet = new Set(visibleParticipantIds || []);
    const allParticipantIds = Object.keys(participants || {});
    // Filter to only show visible participant answers
    const submittedAnswers = allParticipantIds.filter(pid => 
        answers[pid] && 
        answers[pid].answer !== undefined && 
        visibleParticipantIdsSet.has(pid)
    );
    
    const hasAnswers = submittedAnswers.length > 0 || (controlAnswerVisible && correctAnswer !== null && correctAnswer !== undefined && correctAnswer !== '');
    
    if (!hasAnswers) {
        const noAnswers = document.createElement('div');
        noAnswers.style.cssText = 'color: #666; font-style: italic; padding: 2rem; text-align: center; font-size: 1.2rem;';
        noAnswers.textContent = 'No answers to display';
        answersList.appendChild(noAnswers);
    } else {
        const participantIndexMap = {};
        allParticipantIds.forEach((pid, idx) => {
            participantIndexMap[pid] = idx;
        });
        
        submittedAnswers.forEach(participantId => {
            const answerData = answers[participantId];
            const participant = participants[participantId] || {};
            const colorIndex = participantIndexMap[participantId] !== undefined ? participantIndexMap[participantId] : 0;
            const color = Common ? Common.getParticipantColor(colorIndex) : '#FF0000';
            
            const answerRow = document.createElement('div');
            answerRow.style.cssText = 'display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 8px; border-left: 4px solid ' + color + ';';
            
            // Color dot
            const colorDot = document.createElement('div');
            colorDot.style.cssText = `width: 30px; height: 30px; border-radius: 50%; background: ${color}; border: 2px solid ${color}; flex-shrink: 0;`;
            answerRow.appendChild(colorDot);
            
            // Name
            const name = document.createElement('div');
            name.textContent = participant.name || 'Unknown';
            name.style.cssText = 'font-weight: 500; font-size: 1.1rem; flex: 1;';
            answerRow.appendChild(name);
            
            answersList.appendChild(answerRow);
        });
        
        // Add control answer row if visible
        if (controlAnswerVisible && correctAnswer !== null && correctAnswer !== undefined && correctAnswer !== '') {
            const controlAnswerRow = document.createElement('div');
            controlAnswerRow.style.cssText = 'display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f0f7ff; border-radius: 8px; border-left: 4px solid #2196F3;';
            
            // Control answer indicator dot
            const controlDot = document.createElement('div');
            controlDot.style.cssText = 'width: 30px; height: 30px; border-radius: 50%; background: #2196F3; border: 2px solid #2196F3; flex-shrink: 0;';
            controlAnswerRow.appendChild(controlDot);
            
            // Name
            const name = document.createElement('div');
            name.textContent = 'Correct Answer';
            name.style.cssText = 'font-weight: 500; font-size: 1.1rem; flex: 1;';
            controlAnswerRow.appendChild(name);
            
            // Answer display (coordinates)
            if (typeof correctAnswer === 'object' && correctAnswer.x !== undefined && correctAnswer.y !== undefined) {
                const answerText = document.createElement('div');
                answerText.textContent = `(${correctAnswer.x.toFixed(1)}%, ${correctAnswer.y.toFixed(1)}%)`;
                answerText.style.cssText = 'font-size: 1rem; color: #666;';
                controlAnswerRow.appendChild(answerText);
            }
            
            answersList.appendChild(controlAnswerRow);
        }
    }
    
    container.appendChild(answersList);
}