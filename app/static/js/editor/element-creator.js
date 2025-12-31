// Element creation functionality for the editor

(function(Editor) {
    'use strict';

    /**
     * Find the next non-overlapping position below existing elements for a given view
     * @param {Object} page - The page object
     * @param {string} viewName - The view name ('participant' or 'control')
     * @param {number} defaultX - Default x position
     * @param {number} defaultY - Default y position if no elements exist
     * @param {number} elementWidth - Width of the element to place
     * @param {number} elementHeight - Height of the element to place
     * @param {string} excludeElementId - Optional element ID to exclude from calculations (e.g., parent element)
     * @returns {Object} Object with x and y coordinates
     */
    function findNonOverlappingPosition(page, viewName, defaultX, defaultY, elementWidth, elementHeight, excludeElementId) {
        if (!page || !page.views || !page.views[viewName]) {
            return { x: defaultX, y: defaultY };
        }

        // Get all existing elements for this view
        let existingElements = [];
        if (Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
            existingElements = Editor.QuizStructure.getViewElements(page, viewName);
            // Filter out excluded element if provided
            if (excludeElementId) {
                existingElements = existingElements.filter(el => {
                    // Exclude if it's the excluded element or if it's a child of the excluded element
                    return el.id !== excludeElementId && el.parent_id !== excludeElementId;
                });
            }
        } else {
            // Fallback: try to get elements from local_element_configs
            const view = page.views[viewName];
            if (view && view.local_element_configs) {
                Object.keys(view.local_element_configs).forEach(elementId => {
                    if (excludeElementId && elementId === excludeElementId) {
                        return; // Skip excluded element
                    }
                    const localConfig = view.local_element_configs[elementId];
                    if (localConfig) {
                        // Check for answer_input_config, answer_display_config, or regular config
                        let config = localConfig.config || localConfig.answer_input_config || localConfig.answer_display_config || localConfig.control_config;
                        if (config && (config.x !== undefined || config.y !== undefined)) {
                            existingElements.push({
                                id: elementId,
                                x: config.x || 0,
                                y: config.y || 0,
                                width: config.width || 100,
                                height: config.height || 100
                            });
                        }
                    }
                });
            }
        }

        // Find the bottom-most y position
        let maxBottom = defaultY;
        existingElements.forEach(el => {
            // Elements from getViewElements have x, y, width, height directly
            // Elements from fallback have them in the object
            const y = typeof el.y === 'number' ? el.y : (parseFloat(el.y) || 0);
            const height = typeof el.height === 'number' ? el.height : (parseFloat(el.height) || 0);
            const bottom = y + height;
            if (bottom > maxBottom) {
                maxBottom = bottom;
            }
        });

        // Return position below all existing elements with some spacing
        const spacing = 20;
        return {
            x: defaultX,
            y: maxBottom + spacing
        };
    }

    Editor.ElementCreator = {
        createMediaControlElement: function(parentElement, page) {
            const isAudio = parentElement.type === 'audio' || parentElement.media_type === 'audio';
            const isVideo = parentElement.type === 'video' || parentElement.media_type === 'video';
            
            if (!isAudio && !isVideo) return null;
            
            // Find non-overlapping position for control view
            const defaultX = 50;
            const defaultY = 50;
            const position = page ? findNonOverlappingPosition(page, 'control', defaultX, defaultY, 350, 120, parentElement.id) : { x: defaultX, y: defaultY };
            
            return {
                id: `element-${Date.now()}-control`,
                type: 'audio_control',
                media_type: isAudio ? 'audio' : 'video',
                parent_id: parentElement.id,
                view: 'control',
                x: position.x,
                y: position.y,
                width: 350,
                height: 120,
                filename: parentElement.filename,
                src: parentElement.src
            };
        },

        createAnswerDisplayElement: function(parentQuestion, page) {
            // Always use parent question's question_type to ensure they match
            const answerType = (parentQuestion.question_config && parentQuestion.question_config.question_type) || parentQuestion.answer_type || 'text';
            
            // Find non-overlapping position for control view
            const defaultX = parentQuestion.x || 50;
            const defaultY = (parentQuestion.y || 50) + (parentQuestion.height || 100) + 20;
            const position = page ? findNonOverlappingPosition(page, 'control', defaultX, defaultY, 600, 300, parentQuestion.id) : { x: defaultX, y: defaultY };
            
            return {
                id: `element-${Date.now()}-answer-display`,
                type: 'answer_display',
                parent_id: parentQuestion.id,
                view: 'control',
                question_config: { question_type: answerType }, // New format
                answer_type: answerType, // Backwards compatibility
                x: position.x,
                y: position.y,
                width: 600,
                height: 300,
                options: parentQuestion.options || (parentQuestion.question_config && parentQuestion.question_config.options) || [],
                filename: parentQuestion.filename,
                src: parentQuestion.src
            };
        },

        createAppearanceControlElement: function(page) {
            // Create a single appearance control element for the page
            return {
                id: `element-${Date.now()}-appearance-control`,
                type: 'appearance_control',
                view: 'control',
                x: 50,
                y: 100,
                width: 400,
                height: 300,
                properties: {},
                appearance_config: {
                    appearance_type: 'on_load',
                    appearance_order: 999
                }
            };
        },

        createQuestionChildElements: function(parentElement, page) {
            const childElements = [];
            
            const answerType = (parentElement.question_config && parentElement.question_config.question_type) || parentElement.answer_type || 'text';
            const options = parentElement.options || (parentElement.question_config && parentElement.question_config.options) || [];
            
            // Get default dimensions based on answer type
            function getDefaultAnswerInputDimensions(answerType) {
                if (answerType === 'stopwatch') {
                    return { width: 370, height: 120 };
                }
                // Default for other types
                return { width: 380, height: 175 };
            }
            
            const defaultDims = getDefaultAnswerInputDimensions(answerType);
            
            // Find non-overlapping position for answer_input on participant view
            const defaultAnswerInputX = 5;
            const defaultAnswerInputY = 100;
            const answerInputWidth = defaultDims.width;
            const answerInputHeight = defaultDims.height;
            const answerInputPosition = page ? findNonOverlappingPosition(page, 'participant', defaultAnswerInputX, defaultAnswerInputY, answerInputWidth, answerInputHeight, parentElement.id) : { x: defaultAnswerInputX, y: defaultAnswerInputY };
            
            const answerElement = {
                id: `element-${Date.now()}-answer`,
                type: 'answer_input',
                parent_id: parentElement.id,
                view: 'participant',
                question_config: { question_type: answerType, options: options }, // New format
                answer_type: answerType, // Backwards compatibility
                x: answerInputPosition.x,
                y: answerInputPosition.y,
                width: answerInputWidth,
                height: answerInputHeight,
                options: options
            };
            childElements.push(answerElement);
            
            // Find non-overlapping position for answer_display on control view
            const defaultAnswerDisplayX = 50;
            const defaultAnswerDisplayY = 200;
            const answerDisplayWidth = 600;
            const answerDisplayHeight = 300;
            const answerDisplayPosition = page ? findNonOverlappingPosition(page, 'control', defaultAnswerDisplayX, defaultAnswerDisplayY, answerDisplayWidth, answerDisplayHeight, parentElement.id) : { x: defaultAnswerDisplayX, y: defaultAnswerDisplayY };
            
            const answerDisplayElement = {
                id: `element-${Date.now()}-answer-display`,
                type: 'answer_display',
                parent_id: parentElement.id,
                view: 'control',
                question_config: { question_type: answerType, options: options }, // New format
                answer_type: answerType, // Backwards compatibility
                x: answerDisplayPosition.x,
                y: answerDisplayPosition.y,
                width: answerDisplayWidth,
                height: answerDisplayHeight
            };
            childElements.push(answerDisplayElement);
            
            return childElements;
        },

        createElement: function(type, x, y, callbacks) {
            const currentQuiz = callbacks.getCurrentQuiz();
            const currentPageIndex = callbacks.getCurrentPageIndex();
            const currentView = callbacks.getCurrentView();
            const page = currentQuiz.pages[currentPageIndex];
            
            if (!page) return null;

            if (currentView !== 'display') {
                alert('Elements can only be added to the Display view');
                return null;
            }

            if (type === 'text') {
                return null;
            }

            if (type === 'media') {
                if (callbacks.openMediaModal) {
                    callbacks.openMediaModal((selectedMedia) => {
                        // For images, load the image to get natural dimensions
                        if (selectedMedia.media_type === 'image') {
                            const img = new Image();
                            img.onload = () => {
                                const element = {
                                    id: `element-${Date.now()}`,
                                    type: selectedMedia.media_type,
                                    media_type: selectedMedia.media_type,
                                    view: 'display',
                                    x: x,
                                    y: y,
                                    width: img.naturalWidth,
                                    height: img.naturalHeight,
                                    visible: true,
                                    is_question: false,
                                    answer_type: 'text',
                                    src: selectedMedia.url,
                                    filename: selectedMedia.filename
                                };

                                // Use QuizStructure helper to add element
                                if (Editor.QuizStructure && Editor.QuizStructure.setPageElement) {
                                    const currentQuiz = callbacks.getCurrentQuiz();
                                    const currentPageIndex = callbacks.getCurrentPageIndex();
                                    let currentPage = currentQuiz.pages[currentPageIndex];
                                    
                                    const updatedPage = Editor.QuizStructure.setPageElement(currentPage, element);
                                    if (currentQuiz && currentQuiz.pages && currentQuiz.pages[currentPageIndex] === currentPage) {
                                        currentQuiz.pages[currentPageIndex] = updatedPage;
                                        currentPage = updatedPage;
                                    }
                                    
                                    // Audio/video elements are controlled via play/pause button in visibility panel
                                    // No separate control element needed
                                }
                                
                                if (callbacks.onElementAdded) {
                                    callbacks.onElementAdded(element);
                                }
                            };
                            img.onerror = () => {
                                // Fallback to default size if image fails to load
                                const element = {
                                    id: `element-${Date.now()}`,
                                    type: selectedMedia.media_type,
                                    media_type: selectedMedia.media_type,
                                    view: 'display',
                                    x: x,
                                    y: y,
                                    width: 200,
                                    height: 150,
                                    visible: true,
                                    is_question: false,
                                    answer_type: 'text',
                                    src: selectedMedia.url,
                                    filename: selectedMedia.filename
                                };

                                // Use QuizStructure helper to add element
                                if (Editor.QuizStructure && Editor.QuizStructure.setPageElement) {
                                    const currentQuiz = callbacks.getCurrentQuiz();
                                    const currentPageIndex = callbacks.getCurrentPageIndex();
                                    let currentPage = currentQuiz.pages[currentPageIndex];
                                    
                                    const updatedPage = Editor.QuizStructure.setPageElement(currentPage, element);
                                    if (currentQuiz && currentQuiz.pages && currentQuiz.pages[currentPageIndex] === currentPage) {
                                        currentQuiz.pages[currentPageIndex] = updatedPage;
                                        currentPage = updatedPage;
                                    }
                                    
                                    // Audio/video elements are controlled via play/pause button in visibility panel
                                    // No separate control element needed
                                }
                                
                                if (callbacks.onElementAdded) {
                                    callbacks.onElementAdded(element);
                                }
                            };
                            img.src = selectedMedia.url;
                        } else {
                            // For non-image media, use default size
                            const element = {
                                id: `element-${Date.now()}`,
                                type: selectedMedia.media_type,
                                media_type: selectedMedia.media_type,
                                view: 'display',
                                x: x,
                                y: y,
                                width: 200,
                                height: 150,
                                visible: true,
                                is_question: false,
                                answer_type: 'text',
                                src: selectedMedia.url,
                                filename: selectedMedia.filename
                            };

                            // Use QuizStructure helper to add element
                            if (Editor.QuizStructure && Editor.QuizStructure.setPageElement) {
                                const currentQuiz = callbacks.getCurrentQuiz();
                                const currentPageIndex = callbacks.getCurrentPageIndex();
                                let currentPage = currentQuiz.pages[currentPageIndex];
                                
                                const updatedPage = Editor.QuizStructure.setPageElement(currentPage, element);
                                if (currentQuiz && currentQuiz.pages && currentQuiz.pages[currentPageIndex] === currentPage) {
                                    currentQuiz.pages[currentPageIndex] = updatedPage;
                                    currentPage = updatedPage;
                                }
                                
                                // Store media control position in parent element's control view config (not separate entry)
                                const controlElement = this.createMediaControlElement(element, currentPage);
                                if (controlElement) {
                                    if (!currentPage.views) {
                                        currentPage.views = {
                                            display: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                                            participant: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                                            control: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} }
                                        };
                                    }
                                    if (!currentPage.views.control.local_element_configs[element.id]) {
                                        currentPage.views.control.local_element_configs[element.id] = { config: {} };
                                    }
                                    currentPage.views.control.local_element_configs[element.id].control_config = {
                                        x: controlElement.x || 0,
                                        y: controlElement.y || 0,
                                        width: controlElement.width || 400,
                                        height: controlElement.height || 80,
                                        rotation: controlElement.rotation || 0
                                    };
                                }
                            }
                            
                            if (callbacks.onElementAdded) {
                                callbacks.onElementAdded(element);
                            }
                        }
                    });
                }
                return null;
            }

            const element = {
                id: `element-${Date.now()}`,
                type: type,
                view: 'display',
                x: x,
                y: y,
                width: 200,
                height: 100,
                visible: true,
                is_question: false,
                answer_type: 'text',
                rotation: 0
            };

            if (['rectangle', 'circle', 'triangle', 'arrow', 'line', 'plus'].includes(type)) {
                element.fill_color = '#ddd';
                element.border_color = '#999';
                element.border_width = 2;
                if (type === 'line') {
                    element.width = 200;
                    element.height = 2;
                } else if (type === 'arrow') {
                    element.arrow_body_thickness = 20;
                    element.arrow_head_length = 30;
                }
            } else if (type === 'richtext') {
                element.width = 300;
                element.height = 150;
                element.content = '<p>Enter your text here</p>';
                element.font_size = 16;
                element.text_color = '#000000';
                element.background_color = 'transparent';
            } else if (type === 'counter') {
                element.width = 200;
                element.height = 100;
                element.properties = {
                    shape: 'rectangle',
                    text_color: '#000000',
                    text_size: 24,
                    background_color: '#ffffff',
                    border_color: '#000000',
                    value: 10,
                    count_up: true,
                    increment: 1,
                    prefix: '',
                    suffix: ''
                };
            }

            // Use QuizStructure helper to add element
            if (Editor.QuizStructure && Editor.QuizStructure.setPageElement) {
                const currentQuiz = callbacks.getCurrentQuiz();
                const currentPageIndex = callbacks.getCurrentPageIndex();
                // Get the current page reference (in case it changed)
                const currentPage = currentQuiz.pages[currentPageIndex];
                const updatedPage = Editor.QuizStructure.setPageElement(currentPage, element);
                // Always update the page reference in the quiz
                if (currentQuiz && currentQuiz.pages) {
                    currentQuiz.pages[currentPageIndex] = updatedPage;
                } else {
                    console.error('[ElementCreator] Failed to update page - quiz or pages array is null');
                }
            } else {
                console.error('[ElementCreator] QuizStructure.setPageElement not available');
            }
            
            if (callbacks.onElementAdded) {
                callbacks.onElementAdded(element);
            }
            
            return element;
        }
    };

    if (typeof window.Editor === 'undefined') {
        window.Editor = {};
    }
    window.Editor.ElementCreator = Editor.ElementCreator;

})(typeof Editor !== 'undefined' ? Editor : {});

