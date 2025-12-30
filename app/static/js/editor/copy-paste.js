// Copy/paste functionality for elements in the editor
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    Editor.CopyPaste = {
        copiedElement: null,
        
        /**
         * Copy an element (deep clone with new ID)
         */
        copyElement: function(element, getCurrentQuiz, getCurrentPageIndex) {
            if (!element) return false;
            
            const currentQuiz = getCurrentQuiz();
            const currentPageIndex = getCurrentPageIndex();
            const page = currentQuiz.pages[currentPageIndex];
            
            if (!page || !page.elements || !page.elements[element.id]) {
                return false;
            }
            
            // Deep clone the element
            const elementData = page.elements[element.id];
            this.copiedElement = JSON.parse(JSON.stringify(elementData));
            
            // Also copy view-specific configs
            if (page.views) {
                this.copiedViewConfigs = {};
                ['display', 'participant', 'control'].forEach(viewName => {
                    const view = page.views[viewName];
                    if (view && view.local_element_configs && view.local_element_configs[element.id]) {
                        this.copiedViewConfigs[viewName] = JSON.parse(JSON.stringify(view.local_element_configs[element.id]));
                    }
                });
            }
            
            return true;
        },
        
        /**
         * Paste an element at a new location
         */
        pasteElement: function(x, y, getCurrentQuiz, getCurrentPageIndex, getCurrentView, renderCanvas, selectElement, autosaveQuiz) {
            if (!this.copiedElement) return null;
            
            const currentQuiz = getCurrentQuiz();
            const currentPageIndex = getCurrentPageIndex();
            const currentView = getCurrentView();
            const page = currentQuiz.pages[currentPageIndex];
            
            if (!page) return null;
            
            // Only allow pasting in display view
            if (currentView !== 'display') {
                alert('Elements can only be pasted in the Display view');
                return null;
            }
            
            // Reconstruct element object from copied elementData
            // setPageElement expects properties at top level, not nested in properties object
            const copiedElementData = this.copiedElement;
            const newElement = {
                id: `element-${Date.now()}`,
                type: copiedElementData.type || 'richtext',
                view: 'display',
                x: x,
                y: y,
                is_question: copiedElementData.is_question || false,
                visible: true,
                rotation: 0
            };
            
            // Copy element_name if it exists
            if (copiedElementData.element_name !== undefined) {
                newElement.element_name = copiedElementData.element_name;
            }
            
            // Copy all properties from elementData.properties to top level
            // This includes: fill_color, border_color, border_width, content, font_size, 
            // text_color, background_color, media_url, file_name, media_type, etc.
            if (copiedElementData.properties) {
                Object.keys(copiedElementData.properties).forEach(key => {
                    newElement[key] = copiedElementData.properties[key];
                });
            }
            
            // Copy appearance config properties
            if (copiedElementData.appearance_config) {
                const appearanceConfig = copiedElementData.appearance_config;
                newElement.appearance_type = appearanceConfig.appearance_type || 'on_load';
                newElement.appearance_order = appearanceConfig.appearance_order || 1;
                if (appearanceConfig.config) {
                    if (appearanceConfig.config.delay !== undefined) {
                        newElement.appearance_delay = appearanceConfig.config.delay;
                    }
                    if (appearanceConfig.config.name !== undefined) {
                        newElement.appearance_name = appearanceConfig.config.name;
                    }
                }
                // Copy timer-specific properties
                if (appearanceConfig.timer_trigger !== undefined) {
                    newElement.timer_trigger = appearanceConfig.timer_trigger;
                }
                if (appearanceConfig.timer_delay !== undefined) {
                    newElement.timer_delay = appearanceConfig.timer_delay;
                }
            }
            
            // Copy question config properties
            if (copiedElementData.question_config && newElement.is_question) {
                const questionConfig = copiedElementData.question_config;
                newElement.question_type = questionConfig.question_type || 'text';
                newElement.answer_type = questionConfig.question_type || 'text'; // For compatibility
                newElement.question_title = questionConfig.question_title || '';
                newElement.question_correct_answer = questionConfig.question_correct_answer || '';
                if (questionConfig.options) {
                    newElement.options = JSON.parse(JSON.stringify(questionConfig.options));
                }
            }
            
            // Get width/height from copied view configs (display view) or use defaults
            let defaultWidth = 200;
            let defaultHeight = 100;
            if (this.copiedViewConfigs && this.copiedViewConfigs.display && this.copiedViewConfigs.display.config) {
                defaultWidth = this.copiedViewConfigs.display.config.width || 200;
                defaultHeight = this.copiedViewConfigs.display.config.height || 100;
            }
            newElement.width = defaultWidth;
            newElement.height = defaultHeight;
            
            // Use QuizStructure helper to add element
            let updatedPage = null;
            if (Editor.QuizStructure && Editor.QuizStructure.setPageElement) {
                updatedPage = Editor.QuizStructure.setPageElement(page, newElement);
                currentQuiz.pages[currentPageIndex] = updatedPage;
                
                // Copy view-specific configs if they exist
                if (this.copiedViewConfigs && updatedPage.views) {
                    ['display', 'participant', 'control'].forEach(viewName => {
                        const view = updatedPage.views[viewName];
                        if (view && view.local_element_configs) {
                            if (this.copiedViewConfigs[viewName]) {
                                // Deep clone the config and update position
                                const config = JSON.parse(JSON.stringify(this.copiedViewConfigs[viewName]));
                                
                                // Update position in config based on view
                                if (viewName === 'display') {
                                    if (config.config) {
                                        config.config.x = x;
                                        config.config.y = y;
                                        // Preserve width and height from original
                                        if (this.copiedViewConfigs[viewName].config) {
                                            config.config.width = this.copiedViewConfigs[viewName].config.width || defaultWidth;
                                            config.config.height = this.copiedViewConfigs[viewName].config.height || defaultHeight;
                                            config.config.rotation = this.copiedViewConfigs[viewName].config.rotation || 0;
                                        }
                                    }
                                } else if (viewName === 'control') {
                                    if (config.config) {
                                        config.config.x = x;
                                        config.config.y = y;
                                        // Preserve width, height, and rotation from original
                                        if (this.copiedViewConfigs[viewName].config) {
                                            config.config.width = this.copiedViewConfigs[viewName].config.width || defaultWidth;
                                            config.config.height = this.copiedViewConfigs[viewName].config.height || defaultHeight;
                                            config.config.rotation = this.copiedViewConfigs[viewName].config.rotation || 0;
                                        }
                                    }
                                    // Also update control_config if it exists (for audio/video elements)
                                    if (config.control_config) {
                                        config.control_config.x = x;
                                        config.control_config.y = y;
                                        if (this.copiedViewConfigs[viewName].control_config) {
                                            config.control_config.width = this.copiedViewConfigs[viewName].control_config.width;
                                            config.control_config.height = this.copiedViewConfigs[viewName].control_config.height;
                                            config.control_config.rotation = this.copiedViewConfigs[viewName].control_config.rotation || 0;
                                        }
                                    }
                                    // Update answer_display_config if it exists (for questions)
                                    if (config.answer_display_config) {
                                        config.answer_display_config.x = x;
                                        config.answer_display_config.y = y;
                                        if (this.copiedViewConfigs[viewName].answer_display_config) {
                                            config.answer_display_config.width = this.copiedViewConfigs[viewName].answer_display_config.width;
                                            config.answer_display_config.height = this.copiedViewConfigs[viewName].answer_display_config.height;
                                            config.answer_display_config.rotation = this.copiedViewConfigs[viewName].answer_display_config.rotation || 0;
                                        }
                                    }
                                } else if (viewName === 'participant') {
                                    if (config.config) {
                                        config.config.x = x;
                                        config.config.y = y;
                                        // Preserve width, height, and rotation from original
                                        if (this.copiedViewConfigs[viewName].config) {
                                            config.config.width = this.copiedViewConfigs[viewName].config.width || defaultWidth;
                                            config.config.height = this.copiedViewConfigs[viewName].config.height || defaultHeight;
                                            config.config.rotation = this.copiedViewConfigs[viewName].config.rotation || 0;
                                        }
                                    }
                                    // Update answer_input_config if it exists (for questions)
                                    if (config.answer_input_config) {
                                        config.answer_input_config.x = x;
                                        config.answer_input_config.y = y;
                                        if (this.copiedViewConfigs[viewName].answer_input_config) {
                                            config.answer_input_config.width = this.copiedViewConfigs[viewName].answer_input_config.width;
                                            config.answer_input_config.height = this.copiedViewConfigs[viewName].answer_input_config.height;
                                            config.answer_input_config.rotation = this.copiedViewConfigs[viewName].answer_input_config.rotation || 0;
                                        }
                                    }
                                }
                                
                                view.local_element_configs[newElement.id] = config;
                            }
                        }
                    });
                }
            } else {
                console.error('[CopyPaste] QuizStructure.setPageElement not available');
                return null;
            }
            
            // Re-render canvas and select the new element
            renderCanvas();
            
            // Get the merged element for selection (with all properties merged)
            let pastedElement = null;
            if (Editor.QuizStructure && Editor.QuizStructure.getViewElements && updatedPage) {
                const viewElements = Editor.QuizStructure.getViewElements(updatedPage, 'display');
                pastedElement = viewElements.find(el => el.id === newElement.id);
            }
            
            if (pastedElement) {
                selectElement(pastedElement);
            } else {
                selectElement(newElement);
            }
            
            autosaveQuiz();
            
            return pastedElement || newElement;
        },
        
        /**
         * Check if there's a copied element available
         */
        hasCopiedElement: function() {
            return this.copiedElement !== null;
        }
    };
})();

