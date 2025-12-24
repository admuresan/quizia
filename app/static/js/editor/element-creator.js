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
            return {
                id: `element-${Date.now()}-answer-display`,
                type: 'answer_display',
                parent_id: parentQuestion.id,
                view: 'control',
                answer_type: parentQuestion.answer_type || 'text',
                x: parentQuestion.x || 50,
                y: (parentQuestion.y || 50) + (parentQuestion.height || 100) + 20,
                width: 600,
                height: 300,
                options: parentQuestion.options || [],
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
                height: 300
            };
        },

        createQuestionChildElements: function(parentElement) {
            const childElements = [];
            
            const answerElement = {
                id: `element-${Date.now()}-answer`,
                type: 'answer_input',
                parent_id: parentElement.id,
                view: 'participant',
                answer_type: parentElement.answer_type || 'text',
                x: 50,
                y: 100,
                width: 400,
                height: 100,
                options: parentElement.options || []
            };
            childElements.push(answerElement);
            
            const answerDisplayElement = {
                id: `element-${Date.now()}-answer-display`,
                type: 'answer_display',
                parent_id: parentElement.id,
                view: 'control',
                answer_type: parentElement.answer_type || 'text',
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

                        if (!page.elements) {
                            page.elements = [];
                        }
                        page.elements.push(element);
                        
                        const controlElement = this.createMediaControlElement(element);
                        if (controlElement) {
                            page.elements.push(controlElement);
                        }
                        
                        if (callbacks.onElementAdded) {
                            callbacks.onElementAdded(element);
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

            if (!page.elements) {
                page.elements = [];
            }
            page.elements.push(element);
            
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

