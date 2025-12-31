// Copy/paste functionality for elements in the editor
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    Editor.CopyPaste = {
        copiedElement: null,
        lastCopiedType: null, // 'element' or 'image'
        lastCopiedTimestamp: 0, // Timestamp of last copy operation
        clipboardImageDetectedAt: 0, // Timestamp when we last detected an image in clipboard
        
        /**
         * Copy an element (deep clone with new ID)
         */
        copyElement: function(element, getCurrentQuiz, getCurrentPageIndex) {
            if (!element) {
                console.warn('[CopyPaste] copyElement called with no element');
                return false;
            }
            
            const currentQuiz = getCurrentQuiz();
            const currentPageIndex = getCurrentPageIndex();
            const page = currentQuiz.pages[currentPageIndex];
            
            if (!page || !page.elements) {
                console.warn('[CopyPaste] Page or page.elements not found', { page: !!page, hasElements: !!(page && page.elements) });
                return false;
            }
            
            if (!page.elements[element.id]) {
                console.warn('[CopyPaste] Element not found in page.elements', {
                    elementId: element.id,
                    elementType: element.type,
                    availableElementIds: Object.keys(page.elements)
                });
                return false;
            }
            
            // Deep clone the element data (only from page.elements, not view configs)
            const elementData = page.elements[element.id];
            this.copiedElement = JSON.parse(JSON.stringify(elementData));
            
            // Track that an element was copied
            this.lastCopiedType = 'element';
            this.lastCopiedTimestamp = Date.now();
            
            console.log('[CopyPaste] Element copied successfully', {
                id: element.id,
                type: elementData.type,
                timestamp: this.lastCopiedTimestamp
            });
            
            // Only store display view config for width/height reference
            // We don't copy other view configs - they will be generated fresh
            this.copiedDisplayConfig = null;
            if (page.views && page.views.display && page.views.display.local_element_configs) {
                const displayConfig = page.views.display.local_element_configs[element.id];
                if (displayConfig && displayConfig.config) {
                    this.copiedDisplayConfig = {
                        width: displayConfig.config.width,
                        height: displayConfig.config.height,
                        rotation: displayConfig.config.rotation
                    };
                }
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
                is_question: false, // Always set to false when pasting, even if original was a question
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
            // Exclude timer_trigger and timer_delay from properties to prevent overwriting appearance_config values
            if (copiedElementData.properties) {
                const { timer_trigger: propsTimerTrigger, timer_delay: propsTimerDelay, ...otherProperties } = copiedElementData.properties;
                Object.keys(otherProperties).forEach(key => {
                    newElement[key] = otherProperties[key];
                });
            }
            
            // Copy appearance config properties (this is the source of truth for visibility rules)
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
                // Copy timer-specific properties from appearance_config (source of truth)
                // Only use appearance_config values, never properties values
                if (appearanceConfig.timer_trigger !== undefined) {
                    newElement.timer_trigger = appearanceConfig.timer_trigger;
                }
                if (appearanceConfig.timer_delay !== undefined) {
                    newElement.timer_delay = appearanceConfig.timer_delay;
                }
            }
            
            // Don't copy question config properties - pasted elements are never questions
            
            // Get width/height from copied display config or use defaults
            let defaultWidth = 200;
            let defaultHeight = 100;
            if (this.copiedDisplayConfig) {
                defaultWidth = this.copiedDisplayConfig.width || 200;
                defaultHeight = this.copiedDisplayConfig.height || 100;
            }
            newElement.width = defaultWidth;
            newElement.height = defaultHeight;
            if (this.copiedDisplayConfig && this.copiedDisplayConfig.rotation !== undefined) {
                newElement.rotation = this.copiedDisplayConfig.rotation || 0;
            }
            
            // Use QuizStructure helper to add element
            // setPageElement will automatically create the display view config
            // For media elements, control elements will need to be created separately if needed
            let updatedPage = null;
            if (Editor.QuizStructure && Editor.QuizStructure.setPageElement) {
                updatedPage = Editor.QuizStructure.setPageElement(page, newElement);
                currentQuiz.pages[currentPageIndex] = updatedPage;
                
                // For media elements (audio/video), create control element if needed
                // This mimics what ElementCreator does when creating new media elements
                if ((newElement.type === 'audio' || newElement.type === 'video') && 
                    Editor.ElementCreator && Editor.ElementCreator.createMediaControlElement) {
                    const controlElement = Editor.ElementCreator.createMediaControlElement(newElement, updatedPage);
                    if (controlElement) {
                        updatedPage = Editor.QuizStructure.setPageElement(updatedPage, controlElement);
                        currentQuiz.pages[currentPageIndex] = updatedPage;
                    }
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

