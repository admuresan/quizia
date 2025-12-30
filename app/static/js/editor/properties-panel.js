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
            
            // Don't re-render if rich text editor is currently being edited
            const activeEditor = panel.querySelector('[contenteditable="true"][data-interacting="true"]');
            if (activeEditor) {
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
            
            // Create content container
            const contentContainer = document.createElement('div');
            contentContainer.className = 'properties-content';
            contentContainer.style.cssText = 'overflow-y: auto; max-height: calc(100vh - 200px);';
            
            const selectedElement = this.getSelectedElement();
            
            // Render appropriate content based on active tab
            if (this.activeTab === 'general') {
                if (selectedElement) {
                    if (Editor.PropertiesPanel.renderGeneralProperties) {
                        Editor.PropertiesPanel.renderGeneralProperties.call(this, contentContainer, selectedElement);
                    }
                } else {
                    if (Editor.PropertiesPanel.renderPageProperties) {
                        Editor.PropertiesPanel.renderPageProperties.call(this, contentContainer);
                    }
                }
            } else if (this.activeTab === 'visibility') {
                if (selectedElement) {
                    if (Editor.PropertiesPanel.renderVisibilityProperties) {
                        Editor.PropertiesPanel.renderVisibilityProperties.call(this, contentContainer, selectedElement);
                    }
                } else {
                    if (Editor.PropertiesPanel.renderPageVisibilityProperties) {
                        Editor.PropertiesPanel.renderPageVisibilityProperties.call(this, contentContainer);
                    }
                }
            }
            
            panel.appendChild(contentContainer);
        },
        
        getDragAfterElement: function(container, y) {
            const draggableElements = [...container.querySelectorAll('.draggable-item:not(.dragging)')];
            
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
        
        addPropertyInput: function(container, label, value, onChange) {
            const group = document.createElement('div');
            group.className = 'property-group';
            
            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            labelEl.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = value || '';
            input.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
            input.onchange = onChange;
            
            group.appendChild(labelEl);
            group.appendChild(input);
            container.appendChild(group);
        },
        
        addPropertyTextarea: function(container, label, value, onChange) {
            const group = document.createElement('div');
            group.className = 'property-group';
            
            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            labelEl.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
            
            const textarea = document.createElement('textarea');
            textarea.value = value || '';
            textarea.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; min-height: 100px; resize: vertical;';
            textarea.onchange = onChange;
            
            group.appendChild(labelEl);
            group.appendChild(textarea);
            container.appendChild(group);
        }
    };
})();
