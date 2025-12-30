// Undo/Redo manager for editor
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    Editor.UndoRedo = {
        history: [],
        currentIndex: -1,
        maxHistorySize: 50,
        
        // Initialize with callbacks
        init: function(getCurrentQuiz, getCurrentPageIndex, getCurrentView, renderCanvas, autosaveQuiz, getSelectedElement, selectElement) {
            this.getCurrentQuiz = getCurrentQuiz;
            this.getCurrentPageIndex = getCurrentPageIndex;
            this.getCurrentView = getCurrentView;
            this.renderCanvas = renderCanvas;
            this.autosaveQuiz = autosaveQuiz;
            this.getSelectedElement = getSelectedElement;
            this.selectElement = selectElement;
            this.history = [];
            this.currentIndex = -1;
        },
        
        // Save current state before an operation
        saveState: function(operationType, elementId, beforeState, afterState = null) {
            // Don't save if we're in the middle of undoing/redoing
            if (this.isUndoing) return;
            
            // Remove any history after current index (when we're not at the end)
            if (this.currentIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.currentIndex + 1);
            }
            
            const state = {
                type: operationType, // 'move', 'resize', 'delete', 'create'
                elementId: elementId,
                pageIndex: this.getCurrentPageIndex(),
                view: this.getCurrentView(),
                before: this.deepClone(beforeState),
                after: afterState ? this.deepClone(afterState) : null,
                timestamp: Date.now()
            };
            
            this.history.push(state);
            
            // Limit history size
            if (this.history.length > this.maxHistorySize) {
                this.history.shift();
            } else {
                this.currentIndex = this.history.length - 1;
            }
        },
        
        // Save state after an operation completes
        completeState: function(afterState) {
            if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
                const currentState = this.history[this.currentIndex];
                if (currentState && !currentState.after) {
                    currentState.after = this.deepClone(afterState);
                }
            }
        },
        
        // Undo the last operation
        undo: function() {
            if (this.currentIndex < 0) {
                return false; // Nothing to undo
            }
            
            const state = this.history[this.currentIndex];
            if (!state) return false;
            
            // Check if we're on the correct page and view
            if (state.pageIndex !== this.getCurrentPageIndex() || state.view !== this.getCurrentView()) {
                // Switch to the correct page/view if needed
                // For now, just return false if we're not on the right page/view
                return false;
            }
            
            this.isUndoing = true;
            
            try {
                const currentQuiz = this.getCurrentQuiz();
                const page = currentQuiz.pages[state.pageIndex];
                
                if (!page || !page.elements) {
                    this.isUndoing = false;
                    return false;
                }
                
                let shouldReselect = false;
                
                switch (state.type) {
                    case 'move':
                    case 'resize':
                        this.restoreElementState(page, state.elementId, state.before);
                        shouldReselect = true;
                        break;
                    case 'delete':
                        // Restore deleted element
                        this.restoreDeletedElement(page, state.elementId, state.before);
                        // Select the restored element
                        shouldReselect = true;
                        break;
                    case 'create':
                        // Delete the created element
                        this.deleteElement(page, state.elementId);
                        // Don't reselect - element was deleted
                        shouldReselect = false;
                        break;
                }
                
                this.currentIndex--;
                this.renderCanvas();
                
                // Re-select the element if needed
                if (shouldReselect && this.getSelectedElement && this.selectElement) {
                    const selectedElement = this.getSelectedElement();
                    // If element was selected before, or if we're restoring a deleted element, select it
                    if ((selectedElement && selectedElement.id === state.elementId) || state.type === 'delete') {
                        const page = currentQuiz.pages[state.pageIndex];
                        if (page && page.elements && page.elements[state.elementId]) {
                            // Get the element from the view elements to ensure we have the right reference
                            if (Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
                                const viewElements = Editor.QuizStructure.getViewElements(page, state.view);
                                const element = viewElements.find(el => el.id === state.elementId);
                                if (element) {
                                    this.selectElement(element);
                                }
                            }
                        }
                    }
                }
                
                this.autosaveQuiz();
                return true;
            } catch (error) {
                console.error('Error during undo:', error);
                return false;
            } finally {
                this.isUndoing = false;
            }
        },
        
        // Redo the last undone operation
        redo: function() {
            if (this.currentIndex >= this.history.length - 1) {
                return false; // Nothing to redo
            }
            
            this.currentIndex++;
            const state = this.history[this.currentIndex];
            if (!state) return false;
            
            // Check if we're on the correct page and view
            if (state.pageIndex !== this.getCurrentPageIndex() || state.view !== this.getCurrentView()) {
                // Switch to the correct page/view if needed
                return false;
            }
            
            this.isUndoing = true;
            
            try {
                const currentQuiz = this.getCurrentQuiz();
                const page = currentQuiz.pages[state.pageIndex];
                
                if (!page || !page.elements) {
                    this.isUndoing = false;
                    return false;
                }
                
                switch (state.type) {
                    case 'move':
                    case 'resize':
                        if (state.after) {
                            this.restoreElementState(page, state.elementId, state.after);
                        }
                        break;
                    case 'delete':
                        // Re-delete the element
                        if (state.after) {
                            this.deleteElement(page, state.elementId);
                        }
                        break;
                    case 'create':
                        // Re-create the element
                        if (state.after) {
                            this.restoreDeletedElement(page, state.elementId, state.after);
                        }
                        break;
                }
                
                this.renderCanvas();
                
                // Re-select the element if it was selected before redo
                if (this.getSelectedElement && this.selectElement) {
                    const selectedElement = this.getSelectedElement();
                    if (selectedElement && selectedElement.id === state.elementId) {
                        // Element was selected, re-select it after redo
                        const page = currentQuiz.pages[state.pageIndex];
                        if (page && page.elements && page.elements[state.elementId]) {
                            // Get the element from the view elements to ensure we have the right reference
                            if (Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
                                const viewElements = Editor.QuizStructure.getViewElements(page, state.view);
                                const element = viewElements.find(el => el.id === state.elementId);
                                if (element) {
                                    this.selectElement(element);
                                }
                            }
                        }
                    }
                }
                
                this.autosaveQuiz();
                return true;
            } catch (error) {
                console.error('Error during redo:', error);
                return false;
            } finally {
                this.isUndoing = false;
            }
        },
        
        // Restore element to a previous state
        restoreElementState: function(page, elementId, state) {
            const element = page.elements[elementId];
            if (!element) return;
            
            // Restore element properties
            if (state.properties) {
                element.properties = this.deepClone(state.properties);
            }
            
            // Restore element config in the view
            const view = state.view || this.getCurrentView();
            if (page.views && page.views[view]) {
                const viewData = page.views[view];
                
                // Handle child elements (answer_input, answer_display, audio_control)
                if (state.parent_id) {
                    const parentId = state.parent_id;
                    if (!viewData.local_element_configs[parentId]) {
                        viewData.local_element_configs[parentId] = { config: {} };
                    }
                    
                    if (state.type === 'answer_input' && view === 'participant') {
                        if (!viewData.local_element_configs[parentId].answer_input_config) {
                            viewData.local_element_configs[parentId].answer_input_config = {};
                        }
                        Object.assign(viewData.local_element_configs[parentId].answer_input_config, state.config);
                    } else if (state.type === 'answer_display' && view === 'control') {
                        if (!viewData.local_element_configs[parentId].answer_display_config) {
                            viewData.local_element_configs[parentId].answer_display_config = {};
                        }
                        Object.assign(viewData.local_element_configs[parentId].answer_display_config, state.config);
                    } else if (state.type === 'audio_control' && view === 'control') {
                        if (!viewData.local_element_configs[parentId].control_config) {
                            viewData.local_element_configs[parentId].control_config = {};
                        }
                        Object.assign(viewData.local_element_configs[parentId].control_config, state.config);
                    }
                } else {
                    // Handle main elements
                    if (!viewData.local_element_configs[elementId]) {
                        viewData.local_element_configs[elementId] = {};
                    }
                    
                    if (view === 'display') {
                        if (!viewData.local_element_configs[elementId].config) {
                            viewData.local_element_configs[elementId].config = {};
                        }
                        Object.assign(viewData.local_element_configs[elementId].config, state.config);
                    } else if (view === 'participant') {
                        if (element.is_question) {
                            if (!viewData.local_element_configs[elementId].config) {
                                viewData.local_element_configs[elementId].config = {};
                            }
                            Object.assign(viewData.local_element_configs[elementId].config, state.config);
                        }
                    } else if (view === 'control') {
                        if (state.type === 'appearance_control') {
                            if (!viewData.appearance_control_modal) {
                                viewData.appearance_control_modal = {};
                            }
                            Object.assign(viewData.appearance_control_modal, state.config);
                        } else if (element.is_question) {
                            if (!viewData.local_element_configs[elementId].config) {
                                viewData.local_element_configs[elementId].config = {};
                            }
                            Object.assign(viewData.local_element_configs[elementId].config, state.config);
                        }
                    }
                }
            }
            
            // Update element data object with config values for current view (for immediate access)
            // This ensures the element object reflects the restored state
            if (state.config) {
                if (state.config.x !== undefined) element.x = state.config.x;
                if (state.config.y !== undefined) element.y = state.config.y;
                if (state.config.width !== undefined) element.width = state.config.width;
                if (state.config.height !== undefined) element.height = state.config.height;
                if (state.config.rotation !== undefined) element.rotation = state.config.rotation;
            }
        },
        
        // Restore a deleted element
        restoreDeletedElement: function(page, elementId, state) {
            // Restore the element in the elements dictionary
            page.elements[elementId] = this.deepClone(state.elementData);
            
            // Restore view configs if they exist
            if (state.viewConfigs && page.views) {
                Object.keys(state.viewConfigs).forEach(viewName => {
                    if (page.views[viewName]) {
                        if (!page.views[viewName].local_element_configs) {
                            page.views[viewName].local_element_configs = {};
                        }
                        page.views[viewName].local_element_configs[elementId] = this.deepClone(state.viewConfigs[viewName]);
                    }
                });
            }
        },
        
        // Delete an element (for undo of create operations)
        deleteElement: function(page, elementId) {
            if (page.elements[elementId]) {
                // Remove from all view configs
                if (page.views) {
                    ['display', 'participant', 'control'].forEach(viewName => {
                        const view = page.views[viewName];
                        if (view && view.local_element_configs && view.local_element_configs[elementId]) {
                            delete view.local_element_configs[elementId];
                        }
                    });
                }
                
                // Remove from elements dictionary
                delete page.elements[elementId];
            }
        },
        
        // Capture element state before an operation
        captureElementState: function(elementId) {
            const currentQuiz = this.getCurrentQuiz();
            const pageIndex = this.getCurrentPageIndex();
            const view = this.getCurrentView();
            const page = currentQuiz.pages[pageIndex];
            
            if (!page || !page.elements || !page.elements[elementId]) {
                return null;
            }
            
            const element = page.elements[elementId];
            const state = {
                elementId: elementId,
                type: element.type,
                parent_id: element.parent_id,
                view: view,
                properties: this.deepClone(element.properties || {}),
                config: {},
                elementData: null,
                viewConfigs: null
            };
            
            // Capture view-specific config
            if (page.views && page.views[view]) {
                const viewData = page.views[view];
                
                // Handle child elements
                if (element.parent_id) {
                    const parentId = element.parent_id;
                    if (viewData.local_element_configs[parentId]) {
                        if (element.type === 'answer_input' && view === 'participant') {
                            state.config = this.deepClone(viewData.local_element_configs[parentId].answer_input_config || {});
                        } else if (element.type === 'answer_display' && view === 'control') {
                            state.config = this.deepClone(viewData.local_element_configs[parentId].answer_display_config || {});
                        } else if (element.type === 'audio_control' && view === 'control') {
                            state.config = this.deepClone(viewData.local_element_configs[parentId].control_config || {});
                        }
                    }
                } else {
                    // Handle main elements
                    if (view === 'display') {
                        if (viewData.local_element_configs[elementId] && viewData.local_element_configs[elementId].config) {
                            state.config = this.deepClone(viewData.local_element_configs[elementId].config);
                        }
                    } else if (view === 'participant') {
                        if (element.is_question && viewData.local_element_configs[elementId] && viewData.local_element_configs[elementId].config) {
                            state.config = this.deepClone(viewData.local_element_configs[elementId].config);
                        }
                    } else if (view === 'control') {
                        if (element.type === 'appearance_control' && viewData.appearance_control_modal) {
                            state.config = this.deepClone(viewData.appearance_control_modal);
                        } else if (element.is_question && viewData.local_element_configs[elementId] && viewData.local_element_configs[elementId].config) {
                            state.config = this.deepClone(viewData.local_element_configs[elementId].config);
                        }
                    }
                }
            }
            
            return state;
        },
        
        // Capture full element state for deletion (includes all view configs)
        captureFullElementState: function(elementId) {
            const currentQuiz = this.getCurrentQuiz();
            const pageIndex = this.getCurrentPageIndex();
            const page = currentQuiz.pages[pageIndex];
            
            if (!page || !page.elements || !page.elements[elementId]) {
                return null;
            }
            
            const element = page.elements[elementId];
            const state = {
                elementId: elementId,
                type: element.type,
                parent_id: element.parent_id,
                elementData: this.deepClone(element),
                viewConfigs: {}
            };
            
            // Capture all view configs
            if (page.views) {
                ['display', 'participant', 'control'].forEach(viewName => {
                    const view = page.views[viewName];
                    if (view && view.local_element_configs && view.local_element_configs[elementId]) {
                        state.viewConfigs[viewName] = this.deepClone(view.local_element_configs[elementId]);
                    }
                });
                
                // Also capture appearance_control_modal if it exists
                if (element.type === 'appearance_control' && page.views.control && page.views.control.appearance_control_modal) {
                    if (!state.viewConfigs.control) {
                        state.viewConfigs.control = {};
                    }
                    state.viewConfigs.control.appearance_control_modal = this.deepClone(page.views.control.appearance_control_modal);
                }
            }
            
            return state;
        },
        
        // Deep clone helper
        deepClone: function(obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            
            if (obj instanceof Date) {
                return new Date(obj.getTime());
            }
            
            if (Array.isArray(obj)) {
                return obj.map(item => this.deepClone(item));
            }
            
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            
            return cloned;
        },
        
        // Clear history (useful when loading a new quiz)
        clearHistory: function() {
            this.history = [];
            this.currentIndex = -1;
        }
    };
})();

