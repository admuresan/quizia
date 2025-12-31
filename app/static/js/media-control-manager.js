// Media Control Manager - Modular media playback control logic
(function() {
    'use strict';
    
    if (typeof window.MediaControlManager === 'undefined') {
        window.MediaControlManager = {};
    }
    
    // Track media playback state
    const mediaStates = {}; // { elementId: { playing: boolean, element: HTMLElement } }
    
    /**
     * Check if an element has play controls
     */
    function hasPlayControls(elementData) {
        if (window.ElementTypes && window.ElementTypes.isElementPlayable) {
            return window.ElementTypes.isElementPlayable(elementData);
        }
        // Fallback for when ElementTypes is not loaded
        return (elementData.type === 'audio' || elementData.type === 'video' || elementData.type === 'counter' ||
                elementData.media_type === 'audio' || elementData.media_type === 'video');
    }
    
    /**
     * Find media element in DOM
     */
    function findMediaElement(elementId, elementData) {
        const mediaType = elementData.media_type || elementData.type;
        if (mediaType === 'video') {
            return document.getElementById(`video-${elementId}`) || 
                   document.getElementById(`video-control-${elementId}`) ||
                   document.querySelector(`#element-${elementId} video`);
        } else if (mediaType === 'audio') {
            return document.getElementById(`audio-${elementId}`) || 
                   document.getElementById(`audio-control-${elementId}`) ||
                   document.querySelector(`#element-${elementId} audio`);
        }
        return null;
    }
    
    /**
     * Play media element (or start counter)
     */
    function playMedia(elementId, elementData) {
        // Check if this is a counter element
        if (elementData.type === 'counter') {
            if (window.CounterManager) {
                // Get counter properties from element data
                const properties = elementData.properties || {};
                // Create update callback to update display
                const updateCallback = (id, value, displayText) => {
                    const counterText = document.getElementById(`counter-text-${id}`);
                    if (counterText) {
                        counterText.textContent = displayText;
                    }
                };
                window.CounterManager.startCounter(elementId, properties, updateCallback, (id) => {
                    // Completion callback: notify control that counter finished playing
                    if (window.socket && window.roomCode) {
                        window.socket.emit('media_finished', {
                            room_code: window.roomCode,
                            element_id: id
                        });
                    }
                });
                mediaStates[elementId] = { playing: true, element: null };
                updatePlayPauseButtons(elementId, true);
            }
        } else {
            // Regular media element (audio/video)
            const mediaElement = findMediaElement(elementId, elementData);
            if (mediaElement) {
                mediaElement.play().then(() => {
                    mediaStates[elementId] = { playing: true, element: mediaElement };
                    // Update button states if they exist
                    updatePlayPauseButtons(elementId, true);
                }).catch(err => {
                    console.error(`Error playing media for element ${elementId}:`, err);
                });
            }
        }
    }
    
    /**
     * Pause media element (or stop counter)
     */
    function pauseMedia(elementId, elementData) {
        // Check if this is a counter element
        if (elementData.type === 'counter') {
            if (window.CounterManager) {
                window.CounterManager.stopCounter(elementId);
                mediaStates[elementId] = { playing: false, element: null };
                updatePlayPauseButtons(elementId, false);
            }
        } else {
            // Regular media element (audio/video)
            const mediaElement = findMediaElement(elementId, elementData);
            if (mediaElement) {
                mediaElement.pause();
                mediaStates[elementId] = { playing: false, element: mediaElement };
                // Update button states if they exist
                updatePlayPauseButtons(elementId, false);
            }
        }
    }
    
    /**
     * Update play/pause button states
     */
    function updatePlayPauseButtons(elementId, playing) {
        // Find all buttons associated with this element
        // Try multiple selectors to find buttons in appearance control
        const selectors = [
            `[data-element-id="${elementId}"]`,
            `.control-play-btn[data-element-id="${elementId}"]`,
            `button[data-element-id="${elementId}"]`,
            // Also try finding by the element ID in appearance control (button might not have data-element-id)
            `#control-canvas button[data-element-id="${elementId}"]`
        ];
        
        let buttons = [];
        selectors.forEach(selector => {
            try {
                const found = document.querySelectorAll(selector);
                if (found.length > 0) {
                    buttons = Array.from(found);
                }
            } catch (e) {
                // Invalid selector, skip
            }
        });
        
        // Also try to find button by looking for the play/pause button in the appearance control
        // that's associated with this element ID
        if (buttons.length === 0) {
            const canvas = document.getElementById('control-canvas');
            if (canvas) {
                // Find appearance control container
                const appearanceControl = canvas.querySelector('[id*="appearance"]') || 
                                         Array.from(canvas.querySelectorAll('.runtime-element')).find(el => el._toggleUpdateFunctions);
                if (appearanceControl) {
                    // Look for control items with this element ID
                    const controlItems = appearanceControl.querySelectorAll(`[data-element-id="${elementId}"]`);
                    controlItems.forEach(item => {
                        const btn = item.querySelector('button');
                        if (btn && (btn.innerHTML === '▶' || btn.innerHTML === '⏸')) {
                            buttons.push(btn);
                        }
                    });
                }
            }
        }
        
        console.log('[MediaControlManager] updatePlayPauseButtons:', {
            elementId: elementId,
            playing: playing,
            buttonsFound: buttons.length,
            buttons: buttons
        });
        
        buttons.forEach(btn => {
            if (playing) {
                btn.innerHTML = '⏸';
                btn.classList.add('playing');
            } else {
                btn.innerHTML = '▶';
                btn.classList.remove('playing');
            }
        });
    }
    
    /**
     * Handle automatic playback based on media_config
     */
    function handleAutomaticPlayback(elementId, elementData, pageLoadTime) {
        const mediaConfig = elementData.media_config || {};
        const startMethod = mediaConfig.start_method || 'control';
        
        if (startMethod === 'on_load') {
            // Play immediately when page loads
            playMedia(elementId, elementData);
        } else if (startMethod === 'timer') {
            // Set up timer-based playback
            setupTimerPlayback(elementId, elementData, mediaConfig, pageLoadTime);
        }
        // 'control' method doesn't auto-play
    }
    
    /**
     * Setup timer-based playback
     */
    function setupTimerPlayback(elementId, elementData, mediaConfig, pageLoadTime) {
        const trigger = mediaConfig.timer_trigger || 'page_load';
        const delay = mediaConfig.timer_delay || 0;
        const triggerElementId = mediaConfig.timer_trigger_element;
        
        let startTime = null;
        let timerId = null;
        
        const startTimer = () => {
            if (timerId) clearTimeout(timerId);
            startTime = Date.now();
            timerId = setTimeout(() => {
                playMedia(elementId, elementData);
                timerId = null;
            }, delay * 1000);
        };
        
        if (trigger === 'page_load') {
            // Start timer when page loads
            startTimer();
        } else if (trigger === 'element_appears') {
            // Wait for trigger element to appear
            if (triggerElementId) {
                const observer = new MutationObserver(() => {
                    const triggerElement = document.getElementById(`element-${triggerElementId}`);
                    if (triggerElement && triggerElement.offsetParent !== null) {
                        // Element is visible
                        observer.disconnect();
                        startTimer();
                    }
                });
                
                // Check immediately
                const triggerElement = document.getElementById(`element-${triggerElementId}`);
                if (triggerElement && triggerElement.offsetParent !== null) {
                    startTimer();
                } else {
                    // Watch for element to appear
                    observer.observe(document.body, { childList: true, subtree: true });
                }
            }
        } else if (trigger === 'element_starts_playing') {
            // Wait for trigger element to start playing
            if (triggerElementId) {
                // Check if trigger element is a counter
                const triggerElementContainer = document.getElementById(`element-${triggerElementId}`) || document.getElementById(triggerElementId);
                if (triggerElementContainer) {
                    // Check if it's a counter by looking for counter text element
                    const counterText = triggerElementContainer.querySelector(`#counter-text-${triggerElementId}`);
                    if (counterText && window.CounterManager) {
                        // It's a counter - watch for it to start
                        const checkCounter = setInterval(() => {
                            if (window.CounterManager.isCounterRunning(triggerElementId)) {
                                clearInterval(checkCounter);
                                startTimer();
                            }
                        }, 100);
                        // Also check immediately
                        if (window.CounterManager.isCounterRunning(triggerElementId)) {
                            clearInterval(checkCounter);
                            startTimer();
                        }
                        return;
                    }
                }
                
                // Regular media element (audio/video)
                // Get trigger element data to find media
                let triggerElementData = {};
                // Try to get from page data if available
                const triggerElementContainer2 = document.getElementById(`element-${triggerElementId}`) || document.getElementById(triggerElementId);
                if (triggerElementContainer2) {
                    // Element exists, try to find media
                    const triggerMedia = findMediaElement(triggerElementId, { type: 'audio', media_type: 'audio' });
                    if (!triggerMedia) {
                        // Try video
                        const triggerMediaVideo = findMediaElement(triggerElementId, { type: 'video', media_type: 'video' });
                        if (triggerMediaVideo) {
                            // Listen for play event
                            triggerMediaVideo.addEventListener('play', () => {
                                startTimer();
                            }, { once: true });
                            // Also check if already playing
                            if (!triggerMediaVideo.paused) {
                                startTimer();
                            }
                            return;
                        }
                    } else {
                        // Listen for play event
                        triggerMedia.addEventListener('play', () => {
                            startTimer();
                        }, { once: true });
                        // Also check if already playing
                        if (!triggerMedia.paused) {
                            startTimer();
                        }
                        return;
                    }
                }
                
                // Fallback: poll for element to exist
                const checkExists = setInterval(() => {
                    // Check for counter first
                    if (window.CounterManager && window.CounterManager.isCounterRunning(triggerElementId)) {
                        clearInterval(checkExists);
                        startTimer();
                        return;
                    }
                    // Then check for media
                    const triggerMedia = findMediaElement(triggerElementId, { type: 'audio', media_type: 'audio' }) ||
                                       findMediaElement(triggerElementId, { type: 'video', media_type: 'video' });
                    if (triggerMedia) {
                        clearInterval(checkExists);
                        // Listen for play event
                        triggerMedia.addEventListener('play', () => {
                            startTimer();
                        }, { once: true });
                        // Also check if already playing
                        if (!triggerMedia.paused) {
                            startTimer();
                        }
                    }
                }, 100);
            }
        } else if (trigger === 'element_finishes_playing') {
            // Wait for trigger element to finish playing
            if (triggerElementId) {
                // Check if trigger element is a counter
                const triggerElementContainer = document.getElementById(`element-${triggerElementId}`) || document.getElementById(triggerElementId);
                if (triggerElementContainer) {
                    const counterText = triggerElementContainer.querySelector(`#counter-text-${triggerElementId}`);
                    if (counterText && window.CounterManager) {
                        // It's a counter - watch for it to stop
                        const checkCounter = setInterval(() => {
                            if (!window.CounterManager.isCounterRunning(triggerElementId)) {
                                clearInterval(checkCounter);
                                startTimer();
                            }
                        }, 100);
                        // Also check immediately
                        if (!window.CounterManager.isCounterRunning(triggerElementId)) {
                            clearInterval(checkCounter);
                            startTimer();
                        }
                        return;
                    }
                }
                
                // Regular media element (audio/video)
                const checkFinished = () => {
                    const triggerMedia = findMediaElement(triggerElementId, { type: 'audio', media_type: 'audio' }) ||
                                       findMediaElement(triggerElementId, { type: 'video', media_type: 'video' });
                    if (triggerMedia) {
                        triggerMedia.addEventListener('ended', () => {
                            startTimer();
                        }, { once: true });
                        // If already ended, start immediately
                        if (triggerMedia.ended) {
                            startTimer();
                        }
                    } else {
                        // Check again after a short delay
                        setTimeout(checkFinished, 100);
                    }
                };
                checkFinished();
            }
        }
    }
    
    /**
     * Notify that a media element has started playing
     * This triggers any playable elements (audio, video, counter) waiting for element_starts_playing
     */
    function notifyMediaStarted(elementId) {
        console.log('[MediaControlManager] notifyMediaStarted called for elementId:', elementId);
        
        // Find all elements waiting for this element to start playing
        // We need to check all pages in the current quiz
        if (typeof window.quiz === 'undefined' || !window.quiz || !window.quiz.pages) {
            // Try to get quiz from global scope or current page
            const displayContent = document.getElementById('display-content');
            if (!displayContent) {
                console.warn('[MediaControlManager] No quiz or display-content found');
                return;
            }
        }
        
        // Get quiz from window.quiz (set in display.js)
        // In display.js, quiz is stored in a local variable, but we need to access it
        // Try multiple ways to get the quiz data
        let quiz = null;
        
        // Method 1: Check if display.js has exposed quiz globally
        if (typeof window.quiz !== 'undefined' && window.quiz) {
            quiz = window.quiz;
        }
        
        // Method 2: Try to get from the display page's quiz variable (if accessible)
        // Since display.js stores quiz in a closure, we need another approach
        
        // Method 3: Get quiz from the current page data if available
        // The quiz data should be available in the page rendering context
        if (!quiz) {
            // Try to find quiz data from the rendered page
            const displayContent = document.getElementById('display-content');
            if (displayContent && displayContent.dataset.quizId) {
                // Quiz might be stored elsewhere
            }
        }
        
        // For now, let's try to access it from the global scope where display.js might have set it
        // Actually, display.js doesn't expose quiz globally, so we need to pass it or find another way
        
        // Let's check if we can get it from the socket or room data
        // Actually, the best approach is to make sure display.js exposes quiz globally
        // But for now, let's try to get pages from the current rendered elements
        
        if (!quiz || !quiz.pages) {
            console.warn('[MediaControlManager] Quiz not available, trying alternative method');
            // Try to get pages from current page elements
            // This is a fallback - ideally quiz should be available
            return;
        }
        
        // Get current page from display.js or iterate through all pages
        const pages = quiz.pages || [];
        console.log('[MediaControlManager] Checking', pages.length, 'pages for waiting elements');
        
        pages.forEach((page, pageIndex) => {
            if (!page.elements) return;
            
            Object.keys(page.elements).forEach(otherElementId => {
                const otherElement = page.elements[otherElementId];
                const mediaConfig = otherElement.media_config || {};
                
                if (mediaConfig.timer_trigger === 'element_starts_playing') {
                    // Check if this element is waiting for the started element
                    const triggerElementId = mediaConfig.timer_trigger_element;
                    
                    console.log('[MediaControlManager] Found element waiting for trigger:', {
                        waitingElementId: otherElementId,
                        waitingElementType: otherElement.type,
                        triggerElementId: triggerElementId,
                        startedElementId: elementId,
                        match: triggerElementId === elementId
                    });
                    
                    // If triggerElementId is set, check if it matches
                    if (triggerElementId && triggerElementId === elementId) {
                        console.log('[MediaControlManager] Triggering element:', otherElementId, 'type:', otherElement.type);
                        
                        // This element is waiting for the started element - trigger it
                        // Handle delay if specified
                        const delay = (mediaConfig.timer_delay || 0) * 1000;
                        
                        const triggerElement = () => {
                            if (otherElement.type === 'counter') {
                                // Start the counter
                                if (window.CounterManager) {
                                    const properties = otherElement.properties || {};
                                    const updateCallback = (id, value, displayText) => {
                                        const counterText = document.getElementById(`counter-text-${id}`);
                                        if (counterText) {
                                            counterText.textContent = displayText;
                                        }
                                    };
                                    console.log('[MediaControlManager] Starting counter:', otherElementId);
                                    window.CounterManager.startCounter(otherElementId, properties, updateCallback, (id) => {
                                        // Completion callback: notify control that counter finished playing
                                        if (window.socket && window.roomCode) {
                                            window.socket.emit('media_finished', {
                                                room_code: window.roomCode,
                                                element_id: id
                                            });
                                        }
                                    });
                                    mediaStates[otherElementId] = { playing: true, element: null };
                                    updatePlayPauseButtons(otherElementId, true);
                                } else {
                                    console.warn('[MediaControlManager] CounterManager not available');
                                }
                            } else if (hasPlayControls(otherElement)) {
                                // Start other playable media element (audio/video)
                                console.log('[MediaControlManager] Starting media element:', otherElementId);
                                playMedia(otherElementId, otherElement);
                            }
                        };
                        
                        if (delay > 0) {
                            console.log('[MediaControlManager] Delaying trigger by', delay, 'ms');
                            setTimeout(triggerElement, delay);
                        } else {
                            triggerElement();
                        }
                    }
                }
            });
        });
    }

    // Public API
    window.MediaControlManager = {
        hasPlayControls: hasPlayControls,
        playMedia: playMedia,
        pauseMedia: pauseMedia,
        updatePlayPauseButtons: updatePlayPauseButtons,
        handleAutomaticPlayback: handleAutomaticPlayback,
        findMediaElement: findMediaElement,
        notifyMediaStarted: notifyMediaStarted,
        getMediaState: function(elementId) {
            return mediaStates[elementId] || { playing: false, element: null };
        },
        setMediaState: function(elementId, playing) {
            if (mediaStates[elementId]) {
                mediaStates[elementId].playing = playing;
            }
            updatePlayPauseButtons(elementId, playing);
        }
    };
})();

