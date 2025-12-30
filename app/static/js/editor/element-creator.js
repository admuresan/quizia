// Element creation functionality for the editor

(function(Editor) {
    'use strict';

    Editor.ElementCreator = {
        createMediaControlElement: function(parentElement) {
            const isAudio = parentElement.type === 'audio' || parentElement.media_type === 'audio';
            const isVideo = parentElement.type === 'video' || parentElement.media_type === 'video';
            
            if (!isAudio && !isVideo) return null;
            
            return {
                id: `element-${Date.now()}-control`,
                type: 'audio_control',
                media_type: isAudio ? 'audio' : 'video',
                parent_id: parentElement.id,
                view: 'control',
                x: 50,
                y: 50,
                width: 400,
                height: 80,
                filename: parentElement.filename,
                src: parentElement.src
            };
        },

        createAnswerDisplayElement: function(parentQuestion) {
            // Always use parent question's question_type to ensure they match
            const answerType = (parentQuestion.question_config && parentQuestion.question_config.question_type) || parentQuestion.answer_type || 'text';
            return {
                id: `element-${Date.now()}-answer-display`,
                type: 'answer_display',
                parent_id: parentQuestion.id,
                view: 'control',
                question_config: { question_type: answerType }, // New format
                answer_type: answerType, // Backwards compatibility
                x: parentQuestion.x || 50,
                y: (parentQuestion.y || 50) + (parentQuestion.height || 100) + 20,
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

        createQuestionChildElements: function(parentElement) {
            const childElements = [];
            
            const answerType = (parentElement.question_config && parentElement.question_config.question_type) || parentElement.answer_type || 'text';
            const options = parentElement.options || (parentElement.question_config && parentElement.question_config.options) || [];
            
            const answerElement = {
                id: `element-${Date.now()}-answer`,
                type: 'answer_input',
                parent_id: parentElement.id,
                view: 'participant',
                question_config: { question_type: answerType, options: options }, // New format
                answer_type: answerType, // Backwards compatibility
                x: 50,
                y: 100,
                width: 400,
                height: 100,
                options: options
            };
            childElements.push(answerElement);
            
            const answerDisplayElement = {
                id: `element-${Date.now()}-answer-display`,
                type: 'answer_display',
                parent_id: parentElement.id,
                view: 'control',
                question_config: { question_type: answerType, options: options }, // New format
                answer_type: answerType, // Backwards compatibility
                x: 50,
                y: 200,
                width: 600,
                height: 300
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
                                    
                                    // Store media control position in parent element's control view config (not separate entry)
                                    const controlElement = this.createMediaControlElement(element);
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
                                    
                                    // Store media control position in parent element's control view config (not separate entry)
                                    const controlElement = this.createMediaControlElement(element);
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
                                const updatedPage = Editor.QuizStructure.setPageElement(page, element);
                                // Update the page in the quiz (in case setPageElement created a new object)
                                const currentQuiz = callbacks.getCurrentQuiz();
                                const currentPageIndex = callbacks.getCurrentPageIndex();
                                if (currentQuiz && currentQuiz.pages && currentQuiz.pages[currentPageIndex] === page) {
                                    currentQuiz.pages[currentPageIndex] = updatedPage;
                                    page = updatedPage; // Update local reference
                                }
                                
                                const controlElement = this.createMediaControlElement(element);
                                if (controlElement) {
                                    const updatedPage2 = Editor.QuizStructure.setPageElement(page, controlElement);
                                    if (currentQuiz && currentQuiz.pages && currentQuiz.pages[currentPageIndex] === page) {
                                        currentQuiz.pages[currentPageIndex] = updatedPage2;
                                        page = updatedPage2; // Update local reference
                                    }
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

            if (['rectangle', 'circle', 'triangle', 'arrow', 'line'].includes(type)) {
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

