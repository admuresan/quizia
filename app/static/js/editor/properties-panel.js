// Properties panel module for editor
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    Editor.PropertiesPanel = {
        activeTab: 'general', // Track active tab
        
        init: function(getSelectedElement, getCurrentQuiz, getCurrentPageIndex, getCurrentView, updateElementDisplay, autosaveQuiz, renderPages, renderCanvas, getCurrentViewSettings, applyCanvasSize, debounce, deleteSelectedElement, updateElementPropertiesInQuiz, updateElementConfigInQuiz) {
            this.getSelectedElement = getSelectedElement;
            this.getCurrentQuiz = getCurrentQuiz;
            this.getCurrentPageIndex = getCurrentPageIndex;
            this.getCurrentView = getCurrentView;
            this.updateElementDisplay = updateElementDisplay;
            this.autosaveQuiz = autosaveQuiz;
            this.renderPages = renderPages;
            this.renderCanvas = renderCanvas;
            this.getCurrentViewSettings = getCurrentViewSettings;
            this.applyCanvasSize = applyCanvasSize;
            this.debounce = debounce;
            this.deleteSelectedElement = deleteSelectedElement;
            this.updateElementPropertiesInQuiz = updateElementPropertiesInQuiz;
            this.updateElementConfigInQuiz = updateElementConfigInQuiz;
        },
        
        render: function() {
            const panel = document.getElementById('properties-panel');
            if (!panel) return;
            
            // Don't re-render if font size dropdown is currently open/interacting
            const activeSelect = panel.querySelector('select[data-interacting="true"]');
            if (activeSelect) {
                return;
            }
            
            // Don't re-render if question title input is currently being edited
            const activeInput = panel.querySelector('input[data-interacting="true"]');
            if (activeInput) {
                return;
            }
            
            panel.innerHTML = '';

            // Create tabs container
            const tabsContainer = document.createElement('div');
            tabsContainer.className = 'properties-tabs';
            tabsContainer.style.cssText = 'display: flex; border-bottom: 2px solid #ddd; margin-bottom: 1rem;';
            
            const generalTab = document.createElement('button');
            generalTab.textContent = 'General';
            generalTab.className = 'properties-tab';
            generalTab.dataset.tab = 'general';
            generalTab.style.cssText = 'flex: 1; padding: 0.75rem; border: none; background: ' + (this.activeTab === 'general' ? '#2196F3' : '#f5f5f5') + '; color: ' + (this.activeTab === 'general' ? 'white' : '#333') + '; cursor: pointer; font-weight: ' + (this.activeTab === 'general' ? 'bold' : 'normal') + ';';
            generalTab.onclick = () => {
                this.activeTab = 'general';
                this.render();
            };
            
            const visibilityTab = document.createElement('button');
            visibilityTab.textContent = 'Visibility';
            visibilityTab.className = 'properties-tab';
            visibilityTab.dataset.tab = 'visibility';
            visibilityTab.style.cssText = 'flex: 1; padding: 0.75rem; border: none; background: ' + (this.activeTab === 'visibility' ? '#2196F3' : '#f5f5f5') + '; color: ' + (this.activeTab === 'visibility' ? 'white' : '#333') + '; cursor: pointer; font-weight: ' + (this.activeTab === 'visibility' ? 'bold' : 'normal') + ';';
            visibilityTab.onclick = () => {
                this.activeTab = 'visibility';
                this.render();
            };
            
            tabsContainer.appendChild(generalTab);
            tabsContainer.appendChild(visibilityTab);
            panel.appendChild(tabsContainer);
            
            // Create tab content container
            const tabContent = document.createElement('div');
            tabContent.className = 'properties-tab-content';
            panel.appendChild(tabContent);
            
            const selectedElement = this.getSelectedElement();
            
            if (this.activeTab === 'general') {
                if (!selectedElement) {
                    this.renderPageProperties(tabContent);
                    return;
                }
                this.renderGeneralProperties(tabContent, selectedElement);
            } else if (this.activeTab === 'visibility') {
                // Always show the element visibility order regardless of selection
                this.renderPageVisibilityProperties(tabContent);
            }
        },
        
        addPropertyInput: function(container, label, value, onChange) {
            const group = document.createElement('div');
            group.className = 'property-group';
            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            const input = document.createElement('input');
            input.type = 'number';
            input.value = value;
            input.onchange = () => onChange(input.value);
            group.appendChild(labelEl);
            group.appendChild(input);
            container.appendChild(group);
        },
        
        addPropertyTextarea: function(container, label, value, onChange) {
            const group = document.createElement('div');
            group.className = 'property-group';
            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            const textarea = document.createElement('textarea');
            textarea.value = value;
            textarea.onchange = () => onChange(textarea.value);
            group.appendChild(labelEl);
            group.appendChild(textarea);
            container.appendChild(group);
        },
        
        getDragAfterElement: function(container, y) {
            const draggableElements = [...container.querySelectorAll('.visibility-item:not(.dragging)')];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        },
        
        // Note: renderGeneralProperties, renderVisibilityProperties, renderPageProperties, 
        // and renderPageVisibilityProperties are very large functions. They will be 
        // extracted to separate files to keep each file under 500 lines.
        // For now, we'll keep them as stubs that will be implemented in separate files.
        
        renderGeneralProperties: function(container, selectedElement) {
            // Implementation in editor/properties/general-properties.js
            // This function is overridden by the general-properties module
            container.innerHTML = '<p>Loading general properties...</p>';
        },
        
        renderVisibilityProperties: function(container, selectedElement) {
            // Implementation in editor/properties/visibility-properties.js
            // This function is overridden by the visibility-properties module
            container.innerHTML = '<p>Loading visibility properties...</p>';
        },
        
        renderPageProperties: function(container) {
            // Implementation in editor/properties/page-properties.js
            // This function is overridden by the page-properties module
            container.innerHTML = '<p>Loading page properties...</p>';
        },
        
        renderPageVisibilityProperties: function(container) {
            // This will be implemented in editor/properties/page-visibility-properties.js
            console.warn('renderPageVisibilityProperties not yet extracted to separate module');
        }
    };
})();

