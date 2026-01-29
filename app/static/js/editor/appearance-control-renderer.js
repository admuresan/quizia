// Appearance control element renderer for editor
// Shows all display elements with toggles (non-functional in editor, functional in runtime)
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    Editor.AppearanceControlRenderer = {
        render: function(container, element, options) {
            const getCurrentQuizCallback = options.getCurrentQuiz || null;
            const getCurrentPageIndexCallback = options.getCurrentPageIndex || null;
            const getCurrentViewCallback = options.getCurrentView || null;
            const isRuntime = options.isRuntime || false;
            const socket = options.socket || null;
            const roomCode = options.roomCode || null;
            
            container.style.backgroundColor = '#f9f9f9';
            container.style.border = '2px solid #2196F3';
            container.style.borderRadius = '8px';
            container.style.padding = '1rem';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.overflow = 'auto';
            container.style.boxSizing = 'border-box';
            // Don't set width/height to 100% - let parent element control dimensions
            // This prevents auto-resizing and allows proper resize/move operations
            
            const visibilityTitle = document.createElement('div');
            visibilityTitle.textContent = 'Element Visibility';
            visibilityTitle.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #333; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid #ddd;';
            container.appendChild(visibilityTitle);
            
            // Get page and elements
            const quiz = getCurrentQuizCallback ? getCurrentQuizCallback() : null;
            const pageIndex = getCurrentPageIndexCallback ? getCurrentPageIndexCallback() : 0;
            const currentView = getCurrentViewCallback ? getCurrentViewCallback() : 'control';
            const page = quiz && quiz.pages ? quiz.pages[pageIndex] : null;
            
            if (!page || !page.elements) {
                const noPage = document.createElement('p');
                noPage.style.cssText = 'color: #666; font-style: italic; font-size: 0.9rem; padding: 0.5rem;';
                noPage.textContent = 'No page data available';
                container.appendChild(noPage);
                return;
            }
            
            // Get all display elements from new format
            let allDisplayElements = [];
            if (Editor && Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
                allDisplayElements = Editor.QuizStructure.getViewElements(page, 'display');
            }
            
            // Filter out non-display elements
            allDisplayElements = allDisplayElements.filter(el => 
                el.type !== 'navigation_control' && 
                el.type !== 'audio_control' && 
                el.type !== 'answer_input' && 
                el.type !== 'answer_display' &&
                el.type !== 'appearance_control'
            );
            
            // Get appearance_order from globals or elements' appearance_config
            let orderedIds = [];
            if (Editor && Editor.QuizStructure && Editor.QuizStructure.getPageGlobals) {
                const globals = Editor.QuizStructure.getPageGlobals(page);
                orderedIds = globals.appearance_order || [];
            }
            
            // Build ordered list
            const orderedElements = [];
            const addedIds = new Set();
            
            // First add elements in appearance_order
            orderedIds.forEach(id => {
                const el = allDisplayElements.find(e => e.id === id);
                if (el) {
                    orderedElements.push(el);
                    addedIds.add(id);
                }
            });
            
            // Then add any remaining elements not in appearance_order, sorted by their appearance_order
            const remaining = allDisplayElements.filter(el => !addedIds.has(el.id));
            remaining.sort((a, b) => {
                const orderA = (a.appearance_config && a.appearance_config.appearance_order) || 999;
                const orderB = (b.appearance_config && b.appearance_config.appearance_order) || 999;
                return orderA - orderB;
            });
            orderedElements.push(...remaining);
            
            // Generate unique names for elements (use element_name from visibility tab)
            const typeCounts = {};
            const elementNames = {};
            orderedElements.forEach(el => {
                // Use element_name if available, otherwise generate from type
                if (el.element_name) {
                    elementNames[el.id] = el.element_name;
                } else {
                    const type = el.type || 'element';
                    typeCounts[type] = (typeCounts[type] || 0) + 1;
                    elementNames[el.id] = type + (typeCounts[type] || 1);
                }
            });
            
            const controlsList = document.createElement('div');
            controlsList.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';
            
            // Store toggle update functions in a map for runtime updates via socket events
            const toggleUpdateFunctions = {};
            if (isRuntime) {
                // Store on container for later access
                container._toggleUpdateFunctions = toggleUpdateFunctions;
            }
            
            // Show ALL display elements (not just control mode in editor)
            orderedElements.forEach(displayElement => {
                // Check if this element is playable using ElementTypes
                let isPlayableElement = false;
                if (window.ElementTypes && window.ElementTypes.isElementPlayable) {
                    isPlayableElement = window.ElementTypes.isElementPlayable(displayElement);
                } else {
                    // Fallback for when ElementTypes is not loaded
                    isPlayableElement = (displayElement.type === 'audio' || displayElement.type === 'video' || displayElement.type === 'counter' ||
                                       displayElement.media_type === 'audio' || displayElement.media_type === 'video');
                }
                
                const controlItem = document.createElement('div');
                controlItem.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: white; border: 1px solid #ddd; border-radius: 4px;';
                controlItem.dataset.elementId = displayElement.id;
                
                // Play/Pause button for playable elements (in its own column on the left)
                if (isPlayableElement) {
                    const playPauseContainer = document.createElement('div');
                    playPauseContainer.style.cssText = 'display: flex; align-items: center; justify-content: center; min-width: 50px; flex-shrink: 0;';
                    
                    const playPauseBtn = document.createElement('button');
                    playPauseBtn.innerHTML = '▶';
                    playPauseBtn.dataset.elementId = displayElement.id;
                    // Also set data-element-id attribute for MediaControlManager to find it
                    playPauseBtn.setAttribute('data-element-id', displayElement.id);
                    playPauseBtn.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; background: #2196F3; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; transition: background 0.2s; flex-shrink: 0;';
                    playPauseBtn.onmouseover = () => playPauseBtn.style.background = '#1976D2';
                    playPauseBtn.onmouseout = () => playPauseBtn.style.background = '#2196F3';
                    
                    // Track playing state
                    let isPlaying = false;
                    let mediaElement = null;
                    
                    // Find or create the media element for this audio/video
                    const findMediaElement = () => {
                        // Try to find existing audio/video element in display view
                        // Use displayElement.id directly (no prefix) - matches runtime
                        const displayableArea = document.getElementById('displayable-area');
                        if (displayableArea) {
                            const elementDiv = displayableArea.querySelector(`#${displayElement.id}`);
                            if (elementDiv) {
                                if (displayElement.media_type === 'video' || displayElement.type === 'video') {
                                    mediaElement = elementDiv.querySelector('video');
                                } else {
                                    mediaElement = elementDiv.querySelector('audio');
                                }
                            }
                        }
                        // If not found in display view, try to create a temporary one for control
                        if (!mediaElement) {
                            const mediaType = displayElement.media_type || displayElement.type;
                            if (mediaType === 'video') {
                                mediaElement = document.createElement('video');
                            } else {
                                mediaElement = document.createElement('audio');
                            }
                            const mediaSrc = displayElement.src || displayElement.media_url || (displayElement.filename ? '/api/media/serve/' + displayElement.filename : '') || (displayElement.file_name ? '/api/media/serve/' + displayElement.file_name : '');
                            // Normalize URL to prevent mixed content errors (HTTP -> HTTPS or absolute -> relative)
                            mediaElement.src = Editor.Utils && Editor.Utils.normalizeMediaUrl ? Editor.Utils.normalizeMediaUrl(mediaSrc) : mediaSrc;
                            mediaElement.style.display = 'none';
                            document.body.appendChild(mediaElement);
                        }
                        return mediaElement;
                    };
                    
                    playPauseBtn.onclick = (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        
                        // Use requestAnimationFrame to make click handler non-blocking
                        // This prevents the click handler from blocking the UI thread
                        requestAnimationFrame(() => {
                            // Handle playable element play/pause
                            if (displayElement.type === 'counter') {
                                // Handle counter play/pause
                                if (isRuntime && socket && roomCode) {
                                    const currentState = playPauseBtn.innerHTML === '⏸';
                                    const action = currentState ? 'pause' : 'play';
                                    
                                    socket.emit('quizmaster_control_element', {
                                        room_code: roomCode,
                                        element_id: displayElement.id,
                                        action: action
                                    });
                                    
                                    // Update button state immediately
                                    if (action === 'play') {
                                        playPauseBtn.innerHTML = '⏸';
                                    } else {
                                        playPauseBtn.innerHTML = '▶';
                                    }
                                } else {
                                    // In editor, just toggle button (non-functional)
                                    const currentText = playPauseBtn.innerHTML;
                                    playPauseBtn.innerHTML = currentText === '▶' ? '⏸' : '▶';
                                }
                            } else if (displayElement.type === 'audio' || displayElement.type === 'video' || displayElement.media_type === 'audio' || displayElement.media_type === 'video') {
                            // Handle media play/pause
                            if (isRuntime && socket && roomCode) {
                                // In runtime, use socket events to control media on display view
                                const currentState = playPauseBtn.innerHTML === '⏸';
                                const action = currentState ? 'pause' : 'play';
                                
                                console.log('[AppearanceControl] Sending control event:', {
                                    room_code: roomCode,
                                    element_id: displayElement.id,
                                    action: action,
                                    element_type: displayElement.type,
                                    media_type: displayElement.media_type,
                                    controlItem: controlItem,
                                    playPauseBtn: playPauseBtn
                                });
                                
                                // Store reference to control item to prevent it from being removed
                                const controlItemParent = controlItem.parentElement;
                                
                                socket.emit('quizmaster_control_element', {
                                    room_code: roomCode,
                                    element_id: displayElement.id,
                                    action: action
                                });
                                
                                // Update button state immediately
                                if (action === 'play') {
                                    playPauseBtn.innerHTML = '⏸';
                                    isPlaying = true;
                                } else {
                                    playPauseBtn.innerHTML = '▶';
                                    isPlaying = false;
                                }
                                
                                // Debug: Check if control item still exists after emit
                                setTimeout(() => {
                                    if (!controlItem.parentElement) {
                                        console.error('[AppearanceControl] Control item was removed after play click!', {
                                            element_id: displayElement.id,
                                            action: action,
                                            controlItem: controlItem,
                                            controlItemParent: controlItemParent
                                        });
                                    }
                                }, 100);
                            } else {
                                // In editor, control media directly
                                if (!mediaElement) {
                                    findMediaElement();
                                }
                                
                                if (mediaElement) {
                                    if (isPlaying || !mediaElement.paused) {
                                        mediaElement.pause();
                                        playPauseBtn.innerHTML = '▶';
                                        isPlaying = false;
                                    } else {
                                        mediaElement.play().then(() => {
                                            playPauseBtn.innerHTML = '⏸';
                                            isPlaying = true;
                                        }).catch(err => {
                                            console.error('Error playing media:', err);
                                        });
                                        
                                        // Update button when media ends
                                        mediaElement.onended = () => {
                                            playPauseBtn.innerHTML = '▶';
                                            isPlaying = false;
                                        };
                                        mediaElement.onpause = () => {
                                            if (mediaElement.paused) {
                                                playPauseBtn.innerHTML = '▶';
                                                isPlaying = false;
                                            }
                                        };
                                    }
                                }
                            } // Close else block (line 259)
                        } // Close else if block for audio/video (line 213)
                        }); // Close requestAnimationFrame callback
                    };
                    
                    playPauseContainer.appendChild(playPauseBtn);
                    controlItem.appendChild(playPauseContainer);
                } else {
                    // Empty spacer for non-media elements to align columns
                    const spacer = document.createElement('div');
                    spacer.style.cssText = 'min-width: 50px; flex-shrink: 0;';
                    controlItem.appendChild(spacer);
                }
                
                const nameLabel = document.createElement('span');
                // Use element_name from visibility tab, fallback to appearance_name, then generated name
                nameLabel.textContent = displayElement.element_name || displayElement.appearance_name || elementNames[displayElement.id] || displayElement.type || 'element';
                nameLabel.style.cssText = 'flex: 1; font-weight: 500; font-size: 0.9rem;';
                controlItem.appendChild(nameLabel);
                
                // Create toggle switch container
                const toggleContainer = document.createElement('div');
                toggleContainer.style.cssText = 'position: relative; width: 50px; height: 26px; cursor: pointer; flex-shrink: 0;';
                
                // Toggle track (background)
                const toggleTrack = document.createElement('div');
                toggleTrack.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 13px; transition: background-color 0.3s ease;';
                toggleContainer.appendChild(toggleTrack);
                
                // Toggle ball (slider)
                const toggleBall = document.createElement('div');
                toggleBall.style.cssText = 'position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: transform 0.3s ease, box-shadow 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
                toggleContainer.appendChild(toggleBall);
                
                // Function to update toggle state
                const updateToggleState = (isOn) => {
                    if (isOn) {
                        toggleTrack.style.backgroundColor = '#2196F3'; // Blue when on
                        toggleBall.style.transform = 'translateX(24px)'; // Move to right
                    } else {
                        toggleTrack.style.backgroundColor = '#ccc'; // Grey when off
                        toggleBall.style.transform = 'translateX(0)'; // Move to left
                    }
                };
                
                // Initialize toggle state based on actual element visibility
                let initialVisible = false;
                if (isRuntime) {
                    // In runtime, CONTROL IS THE SOURCE OF TRUTH
                    // Always check appearance_visible from room data first (what control has set)
                    // Only fall back to appearance_mode defaults if appearance_visible is not set
                    if (displayElement.appearance_visible !== undefined) {
                        // Use the visibility state from room data (what control has set)
                        initialVisible = displayElement.appearance_visible !== false;
                    } else {
                        // Fall back to appearance_mode defaults (for new elements or first load)
                        const appearanceMode = displayElement.appearance_mode || 'on_load';
                        if (appearanceMode === 'control') {
                            initialVisible = false; // Control mode starts hidden
                        } else {
                            initialVisible = (appearanceMode === 'on_load'); // on_load starts visible, others hidden
                        }
                    }
                } else {
                    // In editor, show based on appearance_mode
                    const appearanceMode = displayElement.appearance_mode || 'on_load';
                    initialVisible = appearanceMode !== 'control';
                }
                updateToggleState(initialVisible);
                
                // Store update function for runtime socket event updates
                if (isRuntime) {
                    toggleUpdateFunctions[displayElement.id] = updateToggleState;
                }
                
                // Click handler - only functional in runtime
                if (isRuntime && socket && roomCode) {
                    toggleContainer.onclick = (e) => {
                        e.stopPropagation();
                        const currentState = toggleTrack.style.backgroundColor === 'rgb(33, 150, 243)' || toggleTrack.style.backgroundColor === '#2196F3';
                        const newState = !currentState;
                        updateToggleState(newState);
                        
                        // Emit socket event to control element visibility
                        socket.emit('quizmaster_control_element_appearance', {
                            room_code: roomCode,
                            element_id: displayElement.id,
                            visible: newState
                        });
                    };
                } else {
                    // In editor, make it non-functional but still show the toggle
                    toggleContainer.onclick = (e) => {
                        e.stopPropagation();
                        // Do nothing in editor mode
                    };
                    toggleContainer.style.cursor = 'default';
                    toggleContainer.style.opacity = '0.7';
                }
                
                controlItem.appendChild(toggleContainer);
                controlsList.appendChild(controlItem);
            });
            
            if (orderedElements.length === 0) {
                const noElements = document.createElement('p');
                noElements.style.cssText = 'color: #666; font-style: italic; font-size: 0.9rem; padding: 0.5rem;';
                noElements.textContent = 'No display elements on this page';
                controlsList.appendChild(noElements);
            }
            
            container.appendChild(controlsList);
        }
    };
})();

