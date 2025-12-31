// Media properties rendering for properties panel
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    if (typeof Editor.Properties === 'undefined') {
        Editor.Properties = {};
    }
    
    Editor.Properties.MediaProperties = {
        render: function(container, getCurrentQuiz, getCurrentPageIndex, getCurrentView, autosaveQuiz, renderCanvas, updateElementPropertiesInQuiz) {
            const currentQuiz = getCurrentQuiz();
            const currentPageIndex = getCurrentPageIndex();
            const currentView = getCurrentView();
            const page = currentQuiz.pages[currentPageIndex];
            const self = this;
            
            if (!page) {
                container.innerHTML = '<p>No page selected</p>';
                return;
            }
            
            const mediaTitle = document.createElement('div');
            mediaTitle.textContent = 'Media Playback Control';
            mediaTitle.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #333; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid #ddd;';
            container.appendChild(mediaTitle);
            
            // Get all elements that have play controls (audio/video)
            let mediaElements = [];
            
            if (page.elements && typeof page.elements === 'object' && !Array.isArray(page.elements)) {
                const elementsDict = page.elements;
                mediaElements = Object.keys(elementsDict).map(elementId => {
                    const elementData = elementsDict[elementId];
                    if (!elementData) return null;
                    
                    // Check if element has play controls using ElementTypes
                    let hasPlayControls = false;
                    if (window.ElementTypes && window.ElementTypes.isElementPlayable) {
                        hasPlayControls = window.ElementTypes.isElementPlayable(elementData);
                    } else {
                        // Fallback for when ElementTypes is not loaded
                        hasPlayControls = (elementData.type === 'audio' || elementData.type === 'video' || elementData.type === 'counter' ||
                                          elementData.media_type === 'audio' || elementData.media_type === 'video');
                    }
                    
                    if (!hasPlayControls) return null;
                    
                    // Skip child elements
                    if (elementData.type === 'audio_control') return null;
                    
                    // Get media config or create default
                    const mediaConfig = elementData.media_config || {};
                    
                    const element = {
                        id: elementId,
                        type: elementData.type,
                        media_type: elementData.media_type || (elementData.type === 'counter' ? null : elementData.type),
                        element_name: elementData.element_name || null,
                        start_method: mediaConfig.start_method || 'control',
                        timer_trigger: mediaConfig.timer_trigger || 'page_load',
                        timer_delay: mediaConfig.timer_delay || 0,
                        timer_trigger_element: mediaConfig.timer_trigger_element || null
                    };
                    
                    return element;
                }).filter(el => el !== null);
            }
            
            if (mediaElements.length === 0) {
                const noElements = document.createElement('p');
                noElements.style.cssText = 'color: #666; font-style: italic; font-size: 0.9rem; padding: 0.5rem;';
                noElements.textContent = 'No media elements on this page';
                container.appendChild(noElements);
                return;
            }
            
            // Generate element names for dropdowns
            const allElements = [];
            if (page.elements && typeof page.elements === 'object') {
                Object.keys(page.elements).forEach(elementId => {
                    const elementData = page.elements[elementId];
                    if (elementData && elementData.type !== 'audio_control' && elementData.type !== 'answer_input' && elementData.type !== 'answer_display') {
                        allElements.push({
                            id: elementId,
                            name: elementData.element_name || elementId,
                            type: elementData.type,
                            media_type: elementData.media_type
                        });
                    }
                });
            }
            
            // Generate display names for elements
            // Use actual element_name if available, otherwise generate from type
            const typeCounts = {};
            const elementNames = {};
            allElements.forEach(el => {
                const type = (el.type || 'element').toLowerCase();
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            });
            const typeCurrentCounts = {};
            allElements.forEach(el => {
                // Use actual element_name if available, otherwise generate from type
                if (el.name && el.name !== el.id) {
                    // Use the actual element_name (from elementData.element_name)
                    elementNames[el.id] = el.name;
                } else {
                    // Generate name from type if no element_name is set
                    const type = (el.type || 'element').toLowerCase();
                    typeCurrentCounts[type] = (typeCurrentCounts[type] || 0) + 1;
                    elementNames[el.id] = type + typeCurrentCounts[type];
                }
            });
            
            // Create list of media elements
            const mediaList = document.createElement('div');
            mediaList.style.cssText = 'display: flex; flex-direction: column; gap: 1rem;';
            
            mediaElements.forEach(mediaElement => {
                const mediaItem = document.createElement('div');
                mediaItem.style.cssText = 'border: 1px solid #ddd; border-radius: 6px; padding: 1rem; background: #f9f9f9;';
                
                // Element name - use element_name if available, otherwise use generated name
                const elementName = document.createElement('div');
                const displayName = mediaElement.element_name || elementNames[mediaElement.id] || mediaElement.id;
                elementName.textContent = displayName;
                elementName.style.cssText = 'font-weight: 600; font-size: 1rem; margin-bottom: 0.75rem; color: #333;';
                mediaItem.appendChild(elementName);
                
                // Start Method dropdown
                const startMethodGroup = document.createElement('div');
                startMethodGroup.className = 'property-group';
                startMethodGroup.style.cssText = 'margin-bottom: 0.75rem;';
                
                const startMethodLabel = document.createElement('label');
                startMethodLabel.textContent = 'Start Method';
                startMethodLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
                startMethodGroup.appendChild(startMethodLabel);
                
                const startMethodSelect = document.createElement('select');
                startMethodSelect.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem;';
                
                const controlOption = document.createElement('option');
                controlOption.value = 'control';
                controlOption.textContent = 'Control';
                startMethodSelect.appendChild(controlOption);
                
                const onLoadOption = document.createElement('option');
                onLoadOption.value = 'on_load';
                onLoadOption.textContent = 'On Load';
                startMethodSelect.appendChild(onLoadOption);
                
                const timerOption = document.createElement('option');
                timerOption.value = 'timer';
                timerOption.textContent = 'Timer';
                startMethodSelect.appendChild(timerOption);
                
                // Set the value AFTER adding all options - ensure we use the actual saved value from media_config
                const savedStartMethod = mediaElement.start_method || 'control';
                startMethodSelect.value = savedStartMethod;
                
                startMethodGroup.appendChild(startMethodSelect);
                mediaItem.appendChild(startMethodGroup);
                
                // Timer configuration container (shown when timer is selected)
                const timerConfigContainer = document.createElement('div');
                timerConfigContainer.id = `timer-config-${mediaElement.id}`;
                // Use savedStartMethod to determine visibility (reuse the variable declared above)
                timerConfigContainer.style.cssText = 'display: ' + (savedStartMethod === 'timer' ? 'block' : 'none') + '; margin-top: 0.75rem; padding: 0.75rem; background: white; border: 1px solid #e0e0e0; border-radius: 4px;';
                
                // Trigger dropdown
                const triggerGroup = document.createElement('div');
                triggerGroup.className = 'property-group';
                triggerGroup.style.cssText = 'margin-bottom: 0.75rem;';
                
                const triggerLabel = document.createElement('label');
                triggerLabel.textContent = 'Trigger';
                triggerLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
                triggerGroup.appendChild(triggerLabel);
                
                const triggerSelect = document.createElement('select');
                triggerSelect.id = `trigger-${mediaElement.id}`;
                triggerSelect.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem;';
                
                const pageLoadOption = document.createElement('option');
                pageLoadOption.value = 'page_load';
                pageLoadOption.textContent = 'Page Load';
                triggerSelect.appendChild(pageLoadOption);
                
                const elementAppearsOption = document.createElement('option');
                elementAppearsOption.value = 'element_appears';
                elementAppearsOption.textContent = 'Element Appears';
                triggerSelect.appendChild(elementAppearsOption);
                
                const elementStartsPlayingOption = document.createElement('option');
                elementStartsPlayingOption.value = 'element_starts_playing';
                elementStartsPlayingOption.textContent = 'Element Starts Playing';
                triggerSelect.appendChild(elementStartsPlayingOption);
                
                const elementFinishesPlayingOption = document.createElement('option');
                elementFinishesPlayingOption.value = 'element_finishes_playing';
                elementFinishesPlayingOption.textContent = 'Element Finishes Playing';
                triggerSelect.appendChild(elementFinishesPlayingOption);
                
                // Set the value AFTER adding all options - ensure we use the actual saved value from media_config
                const savedTimerTrigger = mediaElement.timer_trigger || 'page_load';
                triggerSelect.value = savedTimerTrigger;
                
                triggerGroup.appendChild(triggerSelect);
                timerConfigContainer.appendChild(triggerGroup);
                
                // Trigger element dropdown (shown when element-based trigger is selected)
                const triggerElementGroup = document.createElement('div');
                triggerElementGroup.id = `trigger-element-group-${mediaElement.id}`;
                triggerElementGroup.className = 'property-group';
                triggerElementGroup.style.cssText = 'display: ' + (['element_appears', 'element_starts_playing', 'element_finishes_playing'].includes(mediaElement.timer_trigger) ? 'block' : 'none') + '; margin-bottom: 0.75rem;';
                
                const triggerElementLabel = document.createElement('label');
                triggerElementLabel.textContent = 'Element';
                triggerElementLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
                triggerElementGroup.appendChild(triggerElementLabel);
                
                const triggerElementSelect = document.createElement('select');
                triggerElementSelect.id = `trigger-element-${mediaElement.id}`;
                triggerElementSelect.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem;';
                
                // Populate with eligible elements
                if (mediaElement.timer_trigger === 'element_appears') {
                    // All elements are eligible
                    allElements.forEach(el => {
                        if (el.id !== mediaElement.id) {
                            const option = document.createElement('option');
                            option.value = el.id;
                            // Use element_name if available, otherwise use generated name
                            const displayName = el.name || elementNames[el.id] || el.id;
                            option.textContent = displayName;
                            if (el.id === mediaElement.timer_trigger_element) {
                                option.selected = true;
                            }
                            triggerElementSelect.appendChild(option);
                        }
                    });
                } else if (mediaElement.timer_trigger === 'element_starts_playing' || mediaElement.timer_trigger === 'element_finishes_playing') {
                    // Only playable elements (media + counters) are eligible
                    let hasSelectedOption = false;
                    mediaElements.forEach(el => {
                        if (el.id !== mediaElement.id) {
                            const option = document.createElement('option');
                            option.value = el.id;
                            // Use element_name if available, otherwise use generated name
                            const displayName = el.element_name || elementNames[el.id] || el.id;
                            option.textContent = displayName;
                            if (el.id === mediaElement.timer_trigger_element) {
                                option.selected = true;
                                hasSelectedOption = true;
                            }
                            triggerElementSelect.appendChild(option);
                        }
                    });
                    
                    // If no trigger element is set but trigger requires one, set first option as default
                    if (!hasSelectedOption && triggerElementSelect.options.length > 0 && !mediaElement.timer_trigger_element) {
                        triggerElementSelect.selectedIndex = 0;
                        const elementData = currentQuiz.pages[currentPageIndex].elements[mediaElement.id];
                        if (!elementData.media_config) {
                            elementData.media_config = {};
                        }
                        elementData.media_config.timer_trigger_element = triggerElementSelect.value;
                        // Save the default value
                        if (updateElementPropertiesInQuiz) {
                            updateElementPropertiesInQuiz({ id: mediaElement.id, media_config: elementData.media_config });
                        }
                        autosaveQuiz();
                    }
                }
                
                triggerElementGroup.appendChild(triggerElementSelect);
                timerConfigContainer.appendChild(triggerElementGroup);
                
                // Delay input
                const delayGroup = document.createElement('div');
                delayGroup.className = 'property-group';
                
                const delayLabel = document.createElement('label');
                delayLabel.textContent = 'Delay (seconds)';
                delayLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
                delayGroup.appendChild(delayLabel);
                
                const delayInput = document.createElement('input');
                delayInput.id = `delay-${mediaElement.id}`;
                delayInput.type = 'number';
                delayInput.min = '0';
                delayInput.step = '0.1';
                delayInput.value = mediaElement.timer_delay || 0;
                delayInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem;';
                delayGroup.appendChild(delayInput);
                timerConfigContainer.appendChild(delayGroup);
                
                mediaItem.appendChild(timerConfigContainer);
                
                // Event handlers
                startMethodSelect.onchange = () => {
                    const startMethod = startMethodSelect.value;
                    const elementData = currentQuiz.pages[currentPageIndex].elements[mediaElement.id];
                    if (!elementData.media_config) {
                        elementData.media_config = {};
                    }
                    elementData.media_config.start_method = startMethod;
                    
                    // Show/hide timer config
                    timerConfigContainer.style.display = startMethod === 'timer' ? 'block' : 'none';
                    
                    // Update in quiz structure
                    if (updateElementPropertiesInQuiz) {
                        updateElementPropertiesInQuiz({ id: mediaElement.id, media_config: elementData.media_config });
                    }
                    autosaveQuiz();
                };
                
                triggerSelect.onchange = () => {
                    const trigger = triggerSelect.value;
                    const elementData = currentQuiz.pages[currentPageIndex].elements[mediaElement.id];
                    if (!elementData.media_config) {
                        elementData.media_config = {};
                    }
                    
                    // Preserve existing trigger element if it exists
                    const existingTriggerElement = elementData.media_config.timer_trigger_element;
                    
                    elementData.media_config.timer_trigger = trigger;
                    
                    // Show/hide trigger element dropdown
                    const needsElement = ['element_appears', 'element_starts_playing', 'element_finishes_playing'].includes(trigger);
                    triggerElementGroup.style.display = needsElement ? 'block' : 'none';
                    
                    // Repopulate trigger element dropdown based on trigger type
                    triggerElementSelect.innerHTML = '';
                    let validTriggerElementIds = [];
                    
                    if (trigger === 'element_appears') {
                        allElements.forEach(el => {
                            if (el.id !== mediaElement.id) {
                                const option = document.createElement('option');
                                option.value = el.id;
                                // Use element_name if available, otherwise use generated name
                                const displayName = el.name || elementNames[el.id] || el.id;
                                option.textContent = displayName;
                                triggerElementSelect.appendChild(option);
                                validTriggerElementIds.push(el.id);
                            }
                        });
                    } else if (trigger === 'element_starts_playing' || trigger === 'element_finishes_playing') {
                        // Only playable elements (media + counters) are eligible
                        mediaElements.forEach(el => {
                            if (el.id !== mediaElement.id) {
                                const option = document.createElement('option');
                                option.value = el.id;
                                // Use element_name if available, otherwise use generated name
                                const displayName = el.element_name || elementNames[el.id] || el.id;
                                option.textContent = displayName;
                                triggerElementSelect.appendChild(option);
                                validTriggerElementIds.push(el.id);
                            }
                        });
                    }
                    
                    // Preserve existing trigger element if it's still valid for the new trigger type
                    if (needsElement && existingTriggerElement && validTriggerElementIds.includes(existingTriggerElement)) {
                        triggerElementSelect.value = existingTriggerElement;
                        elementData.media_config.timer_trigger_element = existingTriggerElement;
                    } else if (needsElement && triggerElementSelect.options.length > 0) {
                        // If no valid existing value, select first option and set it
                        triggerElementSelect.selectedIndex = 0;
                        const selectedValue = triggerElementSelect.value;
                        if (selectedValue) {
                            elementData.media_config.timer_trigger_element = selectedValue;
                        }
                    } else {
                        // Clear trigger element if not needed or no valid options
                        delete elementData.media_config.timer_trigger_element;
                    }
                    
                    // Update in quiz structure
                    if (updateElementPropertiesInQuiz) {
                        updateElementPropertiesInQuiz({ id: mediaElement.id, media_config: elementData.media_config });
                    }
                    autosaveQuiz();
                };
                
                triggerElementSelect.onchange = () => {
                    const triggerElement = triggerElementSelect.value;
                    const elementData = currentQuiz.pages[currentPageIndex].elements[mediaElement.id];
                    if (!elementData.media_config) {
                        elementData.media_config = {};
                    }
                    elementData.media_config.timer_trigger_element = triggerElement;
                    
                    // Update in quiz structure
                    if (updateElementPropertiesInQuiz) {
                        updateElementPropertiesInQuiz({ id: mediaElement.id, media_config: elementData.media_config });
                    }
                    autosaveQuiz();
                };
                
                delayInput.onchange = () => {
                    const delay = parseFloat(delayInput.value) || 0;
                    const elementData = currentQuiz.pages[currentPageIndex].elements[mediaElement.id];
                    if (!elementData.media_config) {
                        elementData.media_config = {};
                    }
                    elementData.media_config.timer_delay = delay;
                    
                    // Update in quiz structure
                    if (updateElementPropertiesInQuiz) {
                        updateElementPropertiesInQuiz({ id: mediaElement.id, media_config: elementData.media_config });
                    }
                    autosaveQuiz();
                };
                
                mediaList.appendChild(mediaItem);
            });
            
            container.appendChild(mediaList);
        }
    };
    
    // Register render function
    if (typeof Editor.PropertiesPanel !== 'undefined') {
        Editor.PropertiesPanel.renderPageMediaProperties = function(container) {
            Editor.Properties.MediaProperties.render(
                container,
                this.getCurrentQuiz,
                this.getCurrentPageIndex,
                this.getCurrentView,
                this.autosaveQuiz,
                this.renderCanvas,
                this.updateElementPropertiesInQuiz
            );
        };
    }
})();

