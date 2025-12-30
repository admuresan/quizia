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
            visibilityList.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';
            
            orderedElements.forEach((element, index) => {
                // Main container for the visibility item
                const visibilityItem = document.createElement('div');
                visibilityItem.className = 'visibility-item';
                visibilityItem.dataset.elementId = element.id;
                visibilityItem.style.cssText = 'display: flex; flex-direction: column; padding: 0.75rem; background: white; border: 1px solid #ddd; border-radius: 4px;';
                
                // Main row with drag handle, name, and mode selector
                const mainRow = document.createElement('div');
                mainRow.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; cursor: move;';
                mainRow.draggable = true;
                
                // Drag handle icon
                const dragHandle = document.createElement('span');
                dragHandle.textContent = '☰';
                dragHandle.style.cssText = 'font-size: 1.2rem; color: #999; cursor: grab; user-select: none;';
                mainRow.appendChild(dragHandle);
                
                // Element name - editable input
                const nameInput = document.createElement('input');
                const currentName = element.element_name || element.appearance_name || elementNames[element.id] || element.type || 'element';
                nameInput.type = 'text';
                nameInput.value = currentName;
                nameInput.style.cssText = 'flex: 1; padding: 0.25rem 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem; font-weight: 500;';
                nameInput.onchange = () => {
                    const newName = nameInput.value.trim() || currentName;
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
                    // Ensure name is not empty
                    if (!nameInput.value.trim()) {
                        nameInput.value = currentName;
                    }
                };
                mainRow.appendChild(nameInput);
                
                // Visibility mode dropdown
                const modeSelect = document.createElement('select');
                modeSelect.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem;';
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
                triggerLabel.style.cssText = 'font-size: 0.85rem; font-weight: 500; color: #555;';
                
                const triggerSelect = document.createElement('select');
                triggerSelect.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; flex: 1;';
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
                delayLabel.style.cssText = 'font-size: 0.85rem; font-weight: 500; color: #555;';
                
                const delayInput = document.createElement('input');
                delayInput.type = 'number';
                delayInput.min = '0';
                delayInput.step = '1';
                delayInput.value = element.timer_delay || 0;
                delayInput.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; width: 80px;';
                delayInput.onchange = () => {
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
                visibilityItem.addEventListener('mouseenter', () => {
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
                });
                
                visibilityItem.addEventListener('mouseleave', () => {
                    if (highlightedCanvasElement) {
                        highlightedCanvasElement.style.outline = '';
                        highlightedCanvasElement.style.outlineOffset = '';
                        highlightedCanvasElement.style.boxShadow = '';
                        highlightedCanvasElement.style.zIndex = '';
                        highlightedCanvasElement = null;
                    }
                });
                
                // Drag and drop handlers - attach to mainRow for dragging
                mainRow.addEventListener('dragstart', (e) => {
                    visibilityItem.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/html', visibilityItem.outerHTML);
                    e.dataTransfer.setData('text/plain', element.id);
                });
                
                mainRow.addEventListener('dragend', () => {
                    visibilityItem.classList.remove('dragging');
                });
                
                // Allow drop on the whole visibility item
                visibilityItem.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    const afterElement = getDragAfterElement(visibilityList, e.clientY);
                    const dragging = visibilityList.querySelector('.dragging');
                    if (dragging && dragging !== visibilityItem) {
                        if (afterElement == null) {
                            visibilityList.appendChild(dragging);
                        } else {
                            visibilityList.insertBefore(dragging, afterElement);
                        }
                    }
                });
                
                visibilityItem.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData('text/plain');
                    const draggedItem = visibilityList.querySelector(`[data-element-id="${draggedId}"]`);
                    if (!draggedItem || draggedItem === visibilityItem) return;
                    
                    const afterElement = getDragAfterElement(visibilityList, e.clientY);
                    if (afterElement == null) {
                        visibilityList.appendChild(draggedItem);
                    } else {
                        visibilityList.insertBefore(draggedItem, afterElement);
                    }
                    
                    // Update appearance_order in each element's appearance_config
                    const newOrder = Array.from(visibilityList.querySelectorAll('.visibility-item'))
                        .map(item => item.dataset.elementId);
                    
                    // Update appearance_order in each element's appearance_config
                    newOrder.forEach((elementId, index) => {
                        if (page.elements && page.elements[elementId]) {
                            if (!page.elements[elementId].appearance_config) {
                                page.elements[elementId].appearance_config = {};
                            }
                            page.elements[elementId].appearance_config.appearance_order = index + 1;
                        }
                    });
                    
                    autosaveQuiz();
                    renderCanvas();
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

