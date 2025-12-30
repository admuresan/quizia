// Page visibility properties rendering for properties panel
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    if (typeof Editor.Properties === 'undefined') {
        Editor.Properties = {};
    }
    
    Editor.Properties.PageVisibilityProperties = {
        // Global state to track if we're dragging in the visibility pane
        isDraggingVisibilityItem: false,
        
        render: function(container, getCurrentQuiz, getCurrentPageIndex, getCurrentView, autosaveQuiz, renderCanvas, getDragAfterElement, updateElementPropertiesInQuiz) {
            const currentQuiz = getCurrentQuiz();
            const currentPageIndex = getCurrentPageIndex();
            const currentView = getCurrentView();
            const page = currentQuiz.pages[currentPageIndex];
            const self = this;
            
            if (!page) {
                container.innerHTML = '<p>No page selected</p>';
                return;
            }
            
            const visibilityTitle = document.createElement('div');
            visibilityTitle.textContent = 'Element Visibility Order';
            visibilityTitle.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #333; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid #ddd;';
            container.appendChild(visibilityTitle);
            
            // Get all display elements from ALL views (not just current view)
            // This allows visibility management across all views for the page
            let allDisplayElements = [];
            
            // Get all elements from page.elements dictionary (across all views)
            if (page.elements && typeof page.elements === 'object' && !Array.isArray(page.elements)) {
                // Get all elements from the page's elements dictionary
                const elementsDict = page.elements;
                allDisplayElements = Object.keys(elementsDict).map(elementId => {
                    const elementData = elementsDict[elementId];
                    if (!elementData) return null;
                    
                    // Skip child element types - they are generated from parent elements
                    if (elementData.type === 'answer_input' || 
                        elementData.type === 'answer_display' || 
                        elementData.type === 'audio_control') {
                        return null;
                    }
                    
                    // Create element object with all necessary properties
                    const element = {
                        id: elementId,
                        type: elementData.type,
                        is_question: elementData.is_question || false,
                        element_name: elementData.element_name || null,
                        appearance_name: elementData.appearance_name || null,
                        appearance_mode: elementData.appearance_config?.appearance_type === 'control' ? 'control' :
                                        elementData.appearance_config?.appearance_type === 'timer' ? 'timer' : 'on_load',
                        appearance_order: elementData.appearance_config?.appearance_order || 999,
                        appearance_visible: elementData.appearance_config?.appearance_type !== 'control',
                        timer_trigger: elementData.appearance_config?.timer_trigger || 'load',
                        timer_delay: elementData.appearance_config?.timer_delay || 0,
                        ...elementData.properties
                    };
                    
                    return element;
                }).filter(el => el !== null);
            } else if (Editor && Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
                // Fallback: Get elements from all views and combine them
                const views = ['display', 'participant', 'control'];
                const allElementsMap = new Map();
                
                views.forEach(viewName => {
                    const viewElements = Editor.QuizStructure.getViewElements(page, viewName);
                    viewElements.forEach(el => {
                        // Only include main elements, not child elements
                        if (el && 
                            el.type !== 'navigation_control' && 
                            el.type !== 'audio_control' && 
                            el.type !== 'answer_input' && 
                            el.type !== 'answer_display' &&
                            !el.parent_id) { // Exclude child elements
                            // Use element ID as key to avoid duplicates
                            if (!allElementsMap.has(el.id)) {
                                allElementsMap.set(el.id, el);
                            }
                        }
                    });
                });
                
                allDisplayElements = Array.from(allElementsMap.values());
            } else if (page.views) {
                // Legacy fallback: combine elements from all views
                const allElementsMap = new Map();
                Object.keys(page.views).forEach(viewName => {
                    const view = page.views[viewName];
                    if (view && view.elements) {
                        view.elements.forEach(el => {
                            if (el && 
                                el.type !== 'navigation_control' && 
                                el.type !== 'audio_control' && 
                                el.type !== 'answer_input' && 
                                el.type !== 'answer_display' &&
                                !el.parent_id) {
                                if (!allElementsMap.has(el.id)) {
                                    allElementsMap.set(el.id, el);
                                }
                            }
                        });
                    }
                });
                allDisplayElements = Array.from(allElementsMap.values());
            }
            
            // Final filter to ensure we only have display elements
            allDisplayElements = allDisplayElements.filter(el => 
                el && 
                el.type !== 'navigation_control' && 
                el.type !== 'audio_control' && 
                el.type !== 'answer_input' && 
                el.type !== 'answer_display' &&
                !el.parent_id // Exclude any child elements
            );
            
            if (allDisplayElements.length === 0) {
                const noElements = document.createElement('p');
                noElements.style.cssText = 'color: #666; font-style: italic; font-size: 0.9rem; padding: 0.5rem;';
                noElements.textContent = 'No elements on this page';
                container.appendChild(noElements);
                return;
            }
            
            // Build appearance_order from elements' appearance_config.appearance_order
            const viewKey = currentView;
            const elementMap = new Map();
            allDisplayElements.forEach(el => elementMap.set(el.id, el));
            
            // Get appearance_order from elements' appearance_config
            const orderedElements = [...allDisplayElements].sort((a, b) => {
                const orderA = a.appearance_order || (page.elements && page.elements[a.id] && page.elements[a.id].appearance_config && page.elements[a.id].appearance_config.appearance_order) || 999;
                const orderB = b.appearance_order || (page.elements && page.elements[b.id] && page.elements[b.id].appearance_config && page.elements[b.id].appearance_config.appearance_order) || 999;
                return orderA - orderB;
            });
            
            // Generate unique names for elements
            // Count each type first, then assign names
            const typeCounts = {};
            orderedElements.forEach(el => {
                const type = (el.type || 'element').toLowerCase();
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            });
            
            // Now generate names with proper numbering
            const typeCurrentCounts = {};
            const elementNames = {};
            orderedElements.forEach(el => {
                const type = (el.type || 'element').toLowerCase();
                typeCurrentCounts[type] = (typeCurrentCounts[type] || 0) + 1;
                elementNames[el.id] = type + typeCurrentCounts[type];
            });
            
            const visibilityList = document.createElement('div');
            visibilityList.className = 'visibility-list';
            visibilityList.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; position: relative; min-height: 50px;';
            
            // Drag state variables
            let draggedElement = null;
            let isDragging = false;
            let autoScrollInterval = null;
            
            // Find the scrollable parent container
            const findScrollableParent = (element) => {
                let parent = element.parentElement;
                while (parent) {
                    const style = window.getComputedStyle(parent);
                    if (style.overflowY === 'auto' || style.overflowY === 'scroll' || 
                        style.overflow === 'auto' || style.overflow === 'scroll') {
                        return parent;
                    }
                    parent = parent.parentElement;
                }
                return null;
            };
            
            const scrollableContainer = findScrollableParent(container);
            
            // Auto-scroll function
            const handleAutoScroll = (clientY) => {
                if (!scrollableContainer) return;
                
                const rect = scrollableContainer.getBoundingClientRect();
                const scrollZoneHeight = 50; // Height of the scroll zone at top/bottom
                const scrollSpeed = 10; // Pixels to scroll per frame
                
                const distanceFromTop = clientY - rect.top;
                const distanceFromBottom = rect.bottom - clientY;
                
                // Clear any existing scroll interval
                if (autoScrollInterval) {
                    clearInterval(autoScrollInterval);
                    autoScrollInterval = null;
                }
                
                // Scroll up if near top
                if (distanceFromTop < scrollZoneHeight && distanceFromTop > 0) {
                    const scrollAmount = scrollSpeed * (1 - distanceFromTop / scrollZoneHeight);
                    autoScrollInterval = setInterval(() => {
                        if (scrollableContainer.scrollTop > 0) {
                            scrollableContainer.scrollTop = Math.max(0, scrollableContainer.scrollTop - scrollAmount);
                        } else {
                            clearInterval(autoScrollInterval);
                            autoScrollInterval = null;
                        }
                    }, 16); // ~60fps
                }
                // Scroll down if near bottom
                else if (distanceFromBottom < scrollZoneHeight && distanceFromBottom > 0) {
                    const scrollAmount = scrollSpeed * (1 - distanceFromBottom / scrollZoneHeight);
                    autoScrollInterval = setInterval(() => {
                        const maxScroll = scrollableContainer.scrollHeight - scrollableContainer.clientHeight;
                        if (scrollableContainer.scrollTop < maxScroll) {
                            scrollableContainer.scrollTop = Math.min(maxScroll, scrollableContainer.scrollTop + scrollAmount);
                        } else {
                            clearInterval(autoScrollInterval);
                            autoScrollInterval = null;
                        }
                    }, 16); // ~60fps
                }
            };
            
            // Global mouse move handler for dragging
            const handleMouseMove = (e) => {
                if (!isDragging || !draggedElement) return;
                
                e.preventDefault();
                
                // Calculate current Y position
                const currentY = e.clientY;
                
                // Handle auto-scrolling
                handleAutoScroll(currentY);
                
                // Get the element after which we should place the dragged item
                const afterElement = getDragAfterElement(visibilityList, currentY);
                
                // Move the dragged element in the DOM
                if (afterElement == null) {
                    // Dropping at the end
                    visibilityList.appendChild(draggedElement);
                } else {
                    // Dropping before afterElement
                    visibilityList.insertBefore(draggedElement, afterElement);
                }
            };
            
            // Global mouse up handler to end dragging
            const handleMouseUp = (e) => {
                if (!isDragging || !draggedElement) return;
                
                e.preventDefault();
                
                // Remove dragging class and reset styling
                draggedElement.classList.remove('dragging');
                draggedElement.style.opacity = '';
                draggedElement.style.cursor = '';
                draggedElement.style.position = '';
                draggedElement.style.zIndex = '';
                draggedElement.style.transform = '';
                draggedElement.style.boxShadow = '';
                
                // Remove all drag-over classes
                visibilityList.querySelectorAll('.drag-over').forEach(item => {
                    item.classList.remove('drag-over');
                });
                
                // Update appearance_order in each element's appearance_config
                const newOrder = Array.from(visibilityList.querySelectorAll('.visibility-item'))
                    .map(item => item.dataset.elementId);
                
                newOrder.forEach((elementId, index) => {
                    if (page.elements && page.elements[elementId]) {
                        if (!page.elements[elementId].appearance_config) {
                            page.elements[elementId].appearance_config = {};
                        }
                        page.elements[elementId].appearance_config.appearance_order = index + 1;
                    }
                });
                
                // Clear auto-scroll interval
                if (autoScrollInterval) {
                    clearInterval(autoScrollInterval);
                    autoScrollInterval = null;
                }
                
                // Clear dragging flags
                isDragging = false;
                Editor.Properties.PageVisibilityProperties.isDraggingVisibilityItem = false;
                const elementToReset = draggedElement;
                draggedElement = null;
                
                // Remove global event listeners
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                
                // Save after drag ends
                autosaveQuiz();
                renderCanvas();
            };
            
            orderedElements.forEach((element, index) => {
                // Main container for the visibility item
                const visibilityItem = document.createElement('div');
                visibilityItem.className = 'visibility-item draggable-item';
                visibilityItem.dataset.elementId = element.id;
                visibilityItem.style.cssText = 'display: flex; flex-direction: column; padding: 0.75rem; background: white; border: 1px solid #ddd; border-radius: 4px; cursor: grab; user-select: none; transition: opacity 0.2s;';
                
                // Main row with drag handle, name, and mode selector
                const mainRow = document.createElement('div');
                mainRow.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
                
                // Drag handle icon
                const dragHandle = document.createElement('div');
                dragHandle.textContent = '☰';
                dragHandle.style.cssText = 'font-size: 1.2rem; color: #999; cursor: grab; user-select: none; flex-shrink: 0; padding: 0.25rem; display: flex; align-items: center; justify-content: center; min-width: 24px;';
                mainRow.appendChild(dragHandle);
                
                // Element name - editable input
                const nameInput = document.createElement('input');
                const currentName = element.element_name || element.appearance_name || elementNames[element.id] || element.type || 'element';
                nameInput.type = 'text';
                nameInput.value = currentName;
                nameInput.name = `element-name-${element.id}`;
                nameInput.id = `element-name-${element.id}`;
                nameInput.style.cssText = 'flex: 1; padding: 0.25rem 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem; font-weight: 500; user-select: text; cursor: text;';
                nameInput.draggable = false;
                // Store original value to detect actual changes
                let inputOriginalValue = currentName;
                let inputBlurTimeout = null;
                
                // Prevent dragging when interacting with input - allow text selection
                nameInput.addEventListener('dragstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
                
                // Track when input gets focus
                nameInput.addEventListener('focus', () => {
                    inputOriginalValue = nameInput.value;
                    // Clear any pending blur timeout
                    if (inputBlurTimeout) {
                        clearTimeout(inputBlurTimeout);
                        inputBlurTimeout = null;
                    }
                });
                
                nameInput.onchange = () => {
                    // Don't save if we're currently dragging (check both local and global state)
                    if (isDragging || Editor.Properties.PageVisibilityProperties.isDraggingVisibilityItem) return;
                    
                    // Only save if value actually changed
                    const newName = nameInput.value.trim() || currentName;
                    if (newName === inputOriginalValue) return;
                    
                    element.element_name = newName;
                    // Also update in the quiz structure
                    const page = currentQuiz.pages[currentPageIndex];
                    if (page && page.elements && page.elements[element.id]) {
                        page.elements[element.id].element_name = newName;
                    }
                    // Update element properties if function is available
                    if (updateElementPropertiesInQuiz) {
                        updateElementPropertiesInQuiz(element);
                    }
                    autosaveQuiz();
                    renderCanvas();
                };
                
                nameInput.onblur = () => {
                    // Delay the blur handling to check if a drag is starting
                    inputBlurTimeout = setTimeout(() => {
                        // Don't process blur if we're currently dragging (check both local and global state)
                        if (isDragging || Editor.Properties.PageVisibilityProperties.isDraggingVisibilityItem) {
                            inputBlurTimeout = null;
                            return;
                        }
                        
                        // Ensure name is not empty
                        if (!nameInput.value.trim()) {
                            nameInput.value = currentName;
                        }
                        inputBlurTimeout = null;
                    }, 150);
                };
                mainRow.appendChild(nameInput);
                
                // Visibility mode dropdown
                const modeSelect = document.createElement('select');
                modeSelect.name = `element-mode-${element.id}`;
                modeSelect.id = `element-mode-${element.id}`;
                modeSelect.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; user-select: text; cursor: pointer;';
                modeSelect.draggable = false;
                const modes = [
                    { value: 'on_load', label: 'On Load' },
                    { value: 'control', label: 'Control' },
                    { value: 'timer', label: 'Timer' }
                ];
                modes.forEach(mode => {
                    const option = document.createElement('option');
                    option.value = mode.value;
                    option.textContent = mode.label;
                    if ((element.appearance_mode || 'on_load') === mode.value) {
                        option.selected = true;
                    }
                    modeSelect.appendChild(option);
                });
                modeSelect.onchange = () => {
                    // Don't save if we're currently dragging
                    if (isDragging || Editor.Properties.PageVisibilityProperties.isDraggingVisibilityItem) return;
                    
                    const newMode = modeSelect.value;
                    element.appearance_mode = newMode;
                    if (element.appearance_mode === 'control') {
                        element.appearance_visible = false;
                    } else {
                        element.appearance_visible = true;
                    }
                    
                    // Save the change to the quiz structure
                    const page = currentQuiz.pages[currentPageIndex];
                    if (page && page.elements && page.elements[element.id]) {
                        if (!page.elements[element.id].appearance_config) {
                            page.elements[element.id].appearance_config = {};
                        }
                        // Save appearance_type to match the mode
                        page.elements[element.id].appearance_config.appearance_type = newMode;
                    }
                    
                    // Show/hide timer options based on mode
                    if (timerOptionsContainer) {
                        timerOptionsContainer.style.display = newMode === 'timer' ? 'flex' : 'none';
                    }
                    
                    autosaveQuiz();
                    renderCanvas();
                };
                mainRow.appendChild(modeSelect);
                
                // Append main row to visibility item
                visibilityItem.appendChild(mainRow);
                
                // Timer options container (shown only when timer mode is selected)
                const timerOptionsContainer = document.createElement('div');
                timerOptionsContainer.style.cssText = 'display: ' + (element.appearance_mode === 'timer' ? 'flex' : 'none') + '; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; padding: 0.5rem; background: #f9f9f9; border-radius: 4px; border: 1px solid #e0e0e0; cursor: default;';
                timerOptionsContainer.className = 'timer-options-container';
                // Prevent dragging when interacting with timer options
                timerOptionsContainer.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                });
                
                // Trigger dropdown
                const triggerLabel = document.createElement('label');
                triggerLabel.textContent = 'Trigger:';
                triggerLabel.htmlFor = `element-timer-trigger-${element.id}`;
                triggerLabel.style.cssText = 'font-size: 0.85rem; font-weight: 500; color: #555;';
                
                const triggerSelect = document.createElement('select');
                triggerSelect.name = `element-timer-trigger-${element.id}`;
                triggerSelect.id = `element-timer-trigger-${element.id}`;
                triggerSelect.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; flex: 1; user-select: text; cursor: pointer;';
                const triggers = [
                    { value: 'load', label: 'Load' },
                    { value: 'previous_element', label: 'Previous Element' }
                ];
                triggers.forEach(trigger => {
                    const option = document.createElement('option');
                    option.value = trigger.value;
                    option.textContent = trigger.label;
                    if ((element.timer_trigger || 'load') === trigger.value) {
                        option.selected = true;
                    }
                    triggerSelect.appendChild(option);
                });
                triggerSelect.onchange = () => {
                    // Don't save if we're currently dragging
                    if (isDragging || Editor.Properties.PageVisibilityProperties.isDraggingVisibilityItem) return;
                    
                    element.timer_trigger = triggerSelect.value;
                    const page = currentQuiz.pages[currentPageIndex];
                    if (page && page.elements && page.elements[element.id]) {
                        if (!page.elements[element.id].appearance_config) {
                            page.elements[element.id].appearance_config = {};
                        }
                        page.elements[element.id].appearance_config.timer_trigger = triggerSelect.value;
                    }
                    autosaveQuiz();
                };
                
                const triggerGroup = document.createElement('div');
                triggerGroup.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
                triggerGroup.appendChild(triggerLabel);
                triggerGroup.appendChild(triggerSelect);
                timerOptionsContainer.appendChild(triggerGroup);
                
                // Delay input
                const delayLabel = document.createElement('label');
                delayLabel.textContent = 'Delay (seconds):';
                delayLabel.htmlFor = `element-timer-delay-${element.id}`;
                delayLabel.style.cssText = 'font-size: 0.85rem; font-weight: 500; color: #555;';
                
                const delayInput = document.createElement('input');
                delayInput.type = 'number';
                delayInput.min = '0';
                delayInput.step = '1';
                delayInput.value = element.timer_delay || 0;
                delayInput.name = `element-timer-delay-${element.id}`;
                delayInput.id = `element-timer-delay-${element.id}`;
                delayInput.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; width: 80px; user-select: text; cursor: text;';
                delayInput.onchange = () => {
                    // Don't save if we're currently dragging
                    if (isDragging || Editor.Properties.PageVisibilityProperties.isDraggingVisibilityItem) return;
                    
                    const delayValue = Math.max(0, parseInt(delayInput.value) || 0);
                    delayInput.value = delayValue;
                    element.timer_delay = delayValue;
                    const page = currentQuiz.pages[currentPageIndex];
                    if (page && page.elements && page.elements[element.id]) {
                        if (!page.elements[element.id].appearance_config) {
                            page.elements[element.id].appearance_config = {};
                        }
                        page.elements[element.id].appearance_config.timer_delay = delayValue;
                    }
                    autosaveQuiz();
                };
                
                const delayGroup = document.createElement('div');
                delayGroup.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
                delayGroup.appendChild(delayLabel);
                delayGroup.appendChild(delayInput);
                timerOptionsContainer.appendChild(delayGroup);
                
                visibilityItem.appendChild(timerOptionsContainer);
                
                // Hover highlighting - highlight corresponding canvas element based on current view
                let highlightedCanvasElement = null;
                const handleMouseEnter = () => {
                    // Don't highlight if we're dragging
                    if (isDragging || Editor.Properties.PageVisibilityProperties.isDraggingVisibilityItem) {
                        return;
                    }
                    
                    // Determine which element to highlight based on current view and element type
                    let elementIdToHighlight = element.id;
                    const view = getCurrentView();
                    
                    // For questions, highlight the appropriate child element based on view
                    if (element.is_question) {
                        if (view === 'participant') {
                            // In participant view, highlight the answer_input element
                            elementIdToHighlight = `${element.id}-answer-input`;
                        } else if (view === 'control') {
                            // In control view, highlight the answer_display element
                            elementIdToHighlight = `${element.id}-answer-display`;
                        }
                        // In display view, highlight the question element itself (element.id)
                    }
                    
                    const canvasElement = document.getElementById(`element-${elementIdToHighlight}`);
                    if (canvasElement) {
                        highlightedCanvasElement = canvasElement;
                        canvasElement.style.outline = '4px solid #FF8C42';
                        canvasElement.style.outlineOffset = '3px';
                        canvasElement.style.boxShadow = '0 0 0 3px rgba(255, 140, 66, 0.4), 0 0 12px rgba(255, 140, 66, 0.6), 0 0 20px rgba(255, 140, 66, 0.3)';
                        canvasElement.style.zIndex = '1000';
                    }
                };
                
                const handleMouseLeave = () => {
                    // Don't clear highlight if we're dragging (only clear if it's not the dragged element)
                    if (isDragging && draggedElement === visibilityItem) {
                        return;
                    }
                    
                    if (highlightedCanvasElement) {
                        highlightedCanvasElement.style.outline = '';
                        highlightedCanvasElement.style.outlineOffset = '';
                        highlightedCanvasElement.style.boxShadow = '';
                        highlightedCanvasElement.style.zIndex = '';
                        highlightedCanvasElement = null;
                    }
                };
                
                visibilityItem.addEventListener('mouseenter', handleMouseEnter);
                visibilityItem.addEventListener('mouseleave', handleMouseLeave);
                
                // Custom drag implementation using mouse events
                let isMouseDown = false;
                let dragStartY = 0;
                
                visibilityItem.addEventListener('mousedown', (e) => {
                    const target = e.target;
                    // If clicking on input, select, or timer options container, don't start drag
                    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || 
                        target.closest('input') || target.closest('select') ||
                        target.closest('.timer-options-container')) {
                        return;
                    }
                    
                    // Clear any pending input blur timeout to prevent onchange from firing
                    if (inputBlurTimeout) {
                        clearTimeout(inputBlurTimeout);
                        inputBlurTimeout = null;
                    }
                    
                    isMouseDown = true;
                    dragStartY = e.clientY;
                    
                    // Handler to check if we should start dragging
                    const handleMouseMoveCheck = (moveEvent) => {
                        if (!isMouseDown) {
                            document.removeEventListener('mousemove', handleMouseMoveCheck);
                            document.removeEventListener('mouseup', handleMouseUpCheck);
                            return;
                        }
                        
                        const moveDistance = Math.abs(moveEvent.clientY - dragStartY);
                        // Start drag if mouse moved more than 5px
                        if (moveDistance > 5) {
                            isMouseDown = false;
                            
                            // Set dragging flags
                            isDragging = true;
                            Editor.Properties.PageVisibilityProperties.isDraggingVisibilityItem = true;
                            draggedElement = visibilityItem;
                            
                            // Add dragging class for styling
                            visibilityItem.classList.add('dragging');
                            visibilityItem.style.opacity = '0.6';
                            visibilityItem.style.cursor = 'grabbing';
                            visibilityItem.style.position = 'relative';
                            visibilityItem.style.zIndex = '1000';
                            visibilityItem.style.transform = 'scale(1.02)';
                            visibilityItem.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                            
                            // Clear any canvas highlights
                            if (highlightedCanvasElement) {
                                highlightedCanvasElement.style.outline = '';
                                highlightedCanvasElement.style.outlineOffset = '';
                                highlightedCanvasElement.style.boxShadow = '';
                                highlightedCanvasElement.style.zIndex = '';
                                highlightedCanvasElement = null;
                            }
                            
                            // Remove check listeners
                            document.removeEventListener('mousemove', handleMouseMoveCheck);
                            document.removeEventListener('mouseup', handleMouseUpCheck);
                            
                            // Add global event listeners for actual dragging
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                        }
                    };
                    
                    // Handler to cancel if mouse is released before drag starts
                    const handleMouseUpCheck = () => {
                        isMouseDown = false;
                        document.removeEventListener('mousemove', handleMouseMoveCheck);
                        document.removeEventListener('mouseup', handleMouseUpCheck);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMoveCheck);
                    document.addEventListener('mouseup', handleMouseUpCheck);
                });
                
                visibilityList.appendChild(visibilityItem);
            });
            
            container.appendChild(visibilityList);
        }
    };
    
    // Override the stub in PropertiesPanel
    if (Editor.PropertiesPanel) {
        Editor.PropertiesPanel.renderPageVisibilityProperties = function(container) {
            Editor.Properties.PageVisibilityProperties.render(
                container,
                this.getCurrentQuiz,
                this.getCurrentPageIndex,
                this.getCurrentView,
                this.autosaveQuiz,
                this.renderCanvas,
                this.getDragAfterElement,
                this.updateElementPropertiesInQuiz
            );
        };
    }
})();

