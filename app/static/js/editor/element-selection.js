// Element selection module for editor
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    Editor.ElementSelection = {
        init: function(getSelectedElement, setSelectedElement, renderProperties, renderCanvas, autosaveQuiz) {
            this.getSelectedElement = getSelectedElement;
            this.setSelectedElement = setSelectedElement;
            this.renderProperties = renderProperties;
            this.renderCanvas = renderCanvas;
            this.autosaveQuiz = autosaveQuiz;
        },
        
        selectElement: function(element) {
            // Sync element position and size from DOM to element data when selecting
            const el = document.getElementById(`element-${element.id}`);
            if (el) {
                // Read actual position from inline styles (absolute positioning)
                const computedLeft = parseInt(el.style.left) || 0;
                const computedTop = parseInt(el.style.top) || 0;
                
                // Read actual size from getBoundingClientRect (actual rendered size)
                const rect = el.getBoundingClientRect();
                const computedWidth = Math.round(rect.width) || parseInt(el.style.width) || element.width || 100;
                const computedHeight = Math.round(rect.height) || parseInt(el.style.height) || element.height || 100;
                
                // Update element data with actual DOM position and size
                element.x = computedLeft;
                element.y = computedTop;
                element.width = computedWidth;
                element.height = computedHeight;
                
                console.log(`[ElementSelection] Synced element ${element.id} from DOM:`, {
                    x: computedLeft,
                    y: computedTop,
                    width: computedWidth,
                    height: computedHeight,
                    rect: { width: rect.width, height: rect.height },
                    style: { width: el.style.width, height: el.style.height }
                });
            }
            
            this.setSelectedElement(element);
            document.querySelectorAll('.canvas-element').forEach(el => {
                el.classList.remove('selected');
                el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
            });
            // Also clear selection from question containers and navigation controls
            document.querySelectorAll('.question-container, [id^="element-nav-"]').forEach(el => {
                el.classList.remove('selected');
                el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
            });
            
            if (el) {
                el.classList.add('selected');
                if (['rectangle', 'circle', 'triangle', 'arrow', 'line'].includes(element.type)) {
                    Editor.InteractionHandlers.addResizeHandles(el, element);
                    Editor.InteractionHandlers.addRotateHandle(el, element);
                } else if (['image', 'video', 'audio', 'richtext'].includes(element.type)) {
                    Editor.InteractionHandlers.addResizeHandles(el, element);
                } else if (['audio_control', 'answer_input', 'answer_display'].includes(element.type)) {
                    Editor.InteractionHandlers.addResizeHandles(el, element);
                }
            }
            this.renderProperties();
        },
        
        deselectElement: function() {
            // Cancel any active manipulation before deselecting
            if (Editor.InteractionHandlers && Editor.InteractionHandlers.cancelActiveManipulation) {
                Editor.InteractionHandlers.cancelActiveManipulation();
            }
            
            this.setSelectedElement(null);
            // Clear visual selection from all elements
            document.querySelectorAll('.canvas-element').forEach(el => {
                el.classList.remove('selected');
                el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
            });
            // Also clear selection from question containers and navigation controls
            document.querySelectorAll('.question-container, [id^="element-nav-"]').forEach(el => {
                el.classList.remove('selected');
                el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
            });
            this.renderProperties();
        },
        
        deleteSelectedElement: function(getCurrentQuiz, getCurrentPageIndex, setCurrentPageIndex) {
            const selectedElement = this.getSelectedElement();
            if (!selectedElement) return;
            
            const currentQuiz = getCurrentQuiz();
            const currentPageIndex = getCurrentPageIndex();
            const page = currentQuiz.pages[currentPageIndex];
            if (!page || !page.elements) return;
            
            const deletedElementId = selectedElement.id;
            
            // New format: elements is a dictionary
            if (page.elements[deletedElementId]) {
                const deletedElement = page.elements[deletedElementId];
                
                // If deleting a parent element, delete all child elements
                // In new format, child elements are not stored separately, so we just need to clean up configs
                
                // Remove the element itself from local_element_configs for all views
                if (page.views) {
                    ['display', 'participant', 'control'].forEach(viewName => {
                        const view = page.views[viewName];
                        if (view && view.local_element_configs && view.local_element_configs[deletedElementId]) {
                            delete view.local_element_configs[deletedElementId];
                        }
                    });
                }
                
                // Remove the element itself from dictionary
                delete page.elements[deletedElementId];
                this.setSelectedElement(null);
                this.renderCanvas();
                this.autosaveQuiz();
            }
        }
    };
})();

(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    Editor.ElementSelection = {
        init: function(getSelectedElement, setSelectedElement, renderProperties, renderCanvas, autosaveQuiz) {
            this.getSelectedElement = getSelectedElement;
            this.setSelectedElement = setSelectedElement;
            this.renderProperties = renderProperties;
            this.renderCanvas = renderCanvas;
            this.autosaveQuiz = autosaveQuiz;
        },
        
        selectElement: function(element) {
            // Sync element position and size from DOM to element data when selecting
            const el = document.getElementById(`element-${element.id}`);
            if (el) {
                // Read actual position from inline styles (absolute positioning)
                const computedLeft = parseInt(el.style.left) || 0;
                const computedTop = parseInt(el.style.top) || 0;
                
                // Read actual size from getBoundingClientRect (actual rendered size)
                const rect = el.getBoundingClientRect();
                const computedWidth = Math.round(rect.width) || parseInt(el.style.width) || element.width || 100;
                const computedHeight = Math.round(rect.height) || parseInt(el.style.height) || element.height || 100;
                
                // Update element data with actual DOM position and size
                element.x = computedLeft;
                element.y = computedTop;
                element.width = computedWidth;
                element.height = computedHeight;
                
                console.log(`[ElementSelection] Synced element ${element.id} from DOM:`, {
                    x: computedLeft,
                    y: computedTop,
                    width: computedWidth,
                    height: computedHeight,
                    rect: { width: rect.width, height: rect.height },
                    style: { width: el.style.width, height: el.style.height }
                });
            }
            
            this.setSelectedElement(element);
            document.querySelectorAll('.canvas-element').forEach(el => {
                el.classList.remove('selected');
                el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
            });
            // Also clear selection from question containers and navigation controls
            document.querySelectorAll('.question-container, [id^="element-nav-"]').forEach(el => {
                el.classList.remove('selected');
                el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
            });
            
            if (el) {
                el.classList.add('selected');
                if (['rectangle', 'circle', 'triangle', 'arrow', 'line'].includes(element.type)) {
                    Editor.InteractionHandlers.addResizeHandles(el, element);
                    Editor.InteractionHandlers.addRotateHandle(el, element);
                } else if (['image', 'video', 'audio', 'richtext'].includes(element.type)) {
                    Editor.InteractionHandlers.addResizeHandles(el, element);
                } else if (['audio_control', 'answer_input', 'answer_display'].includes(element.type)) {
                    Editor.InteractionHandlers.addResizeHandles(el, element);
                }
            }
            this.renderProperties();
        },
        
        deselectElement: function() {
            // Cancel any active manipulation before deselecting
            if (Editor.InteractionHandlers && Editor.InteractionHandlers.cancelActiveManipulation) {
                Editor.InteractionHandlers.cancelActiveManipulation();
            }
            
            this.setSelectedElement(null);
            // Clear visual selection from all elements
            document.querySelectorAll('.canvas-element').forEach(el => {
                el.classList.remove('selected');
                el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
            });
            // Also clear selection from question containers and navigation controls
            document.querySelectorAll('.question-container, [id^="element-nav-"]').forEach(el => {
                el.classList.remove('selected');
                el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
            });
            this.renderProperties();
        },
        
        deleteSelectedElement: function(getCurrentQuiz, getCurrentPageIndex, setCurrentPageIndex) {
            const selectedElement = this.getSelectedElement();
            if (!selectedElement) return;
            
            const currentQuiz = getCurrentQuiz();
            const currentPageIndex = getCurrentPageIndex();
            const page = currentQuiz.pages[currentPageIndex];
            if (!page || !page.elements) return;
            
            const deletedElementId = selectedElement.id;
            
            // New format: elements is a dictionary
            if (page.elements[deletedElementId]) {
                const deletedElement = page.elements[deletedElementId];
                
                // If deleting a parent element, delete all child elements
                // In new format, child elements are not stored separately, so we just need to clean up configs
                
                // Remove the element itself from local_element_configs for all views
                if (page.views) {
                    ['display', 'participant', 'control'].forEach(viewName => {
                        const view = page.views[viewName];
                        if (view && view.local_element_configs && view.local_element_configs[deletedElementId]) {
                            delete view.local_element_configs[deletedElementId];
                        }
                    });
                }
                
                // Remove the element itself from dictionary
                delete page.elements[deletedElementId];
                this.setSelectedElement(null);
                this.renderCanvas();
                this.autosaveQuiz();
            }
        }
    };
})();


