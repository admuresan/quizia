// Helper functions for working with new quiz structure format
// Converts quiz data to/from the new standardized format

(function(Editor) {
    'use strict';

    /**
     * Convert entire quiz to new format before saving
     * New format structure:
     * - pages: array of page objects
     *   - page_type: "quiz_page", "status_page", "result_page"
     *   - page_order: number
     *   - name: string
     *   - elements: { elementId: { type, properties, appearance_config, is_question, question_config } }
     *   - views: { display/participant/control: { view_config: { background, size }, local_element_configs: {...} } }
     */
    function ensureQuizNewFormat(quiz) {
        if (!quiz) return quiz;
        
        // Ensure all pages are in new format
        if (quiz.pages && Array.isArray(quiz.pages)) {
            quiz.pages = quiz.pages.map((page, index) => {
                const converted = ensurePageNewFormat(page, index);
                // Remove appearance_order from page level (should only be in element appearance_config)
                if (converted.appearance_order) {
                    delete converted.appearance_order;
                }
                // Remove child elements (answer_input, answer_display, audio_control) from page.elements
                if (converted.elements && typeof converted.elements === 'object') {
                    Object.keys(converted.elements).forEach(elementId => {
                        const element = converted.elements[elementId];
                        if (element.type === 'answer_input' || element.type === 'answer_display' || element.type === 'audio_control') {
                            delete converted.elements[elementId];
                            // Also remove from view configs
                            ['display', 'participant', 'control'].forEach(viewName => {
                                if (converted.views && converted.views[viewName] && converted.views[viewName].local_element_configs) {
                                    delete converted.views[viewName].local_element_configs[elementId];
                                }
                            });
                        }
                    });
                }
                return converted;
            });
        }
        
        return quiz;
    }

    /**
     * Ensure a page is in the new format (normalize if needed)
     */
    function ensurePageNewFormat(page, pageIndex) {
        if (!page) return null;
        
        // Ensure it's fully structured in new format
        // Note: normalizePageNewFormat doesn't need pageIndex, it only normalizes the structure
        return normalizePageNewFormat(page);
    }

    /**
     * Normalize a page that's already in new format to ensure it's complete
     */
    function normalizePageNewFormat(page) {
        // Ensure all required fields exist
        if (!page.page_type) {
            page.page_type = 'quiz_page';
        }
        if (page.page_order === undefined) {
            page.page_order = 1;
        }
        if (!page.elements) {
            page.elements = {};
        }
        if (!page.views) {
            page.views = {
                display: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                participant: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                control: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} }
            };
        }
        
        // Ensure each view has proper structure
        ['display', 'participant', 'control'].forEach(viewName => {
            if (!page.views[viewName]) {
                page.views[viewName] = {
                    view_config: {
                        background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } },
                        size: { width: 1920, height: 1080 }
                    },
                    local_element_configs: {}
                };
            } else {
                if (!page.views[viewName].view_config) {
                    page.views[viewName].view_config = {
                        background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } },
                        size: { width: 1920, height: 1080 }
                    };
                }
                if (!page.views[viewName].local_element_configs) {
                    page.views[viewName].local_element_configs = {};
                }
            }
        });
        
        return page;
    }


    /**
     * Get view data from a page (new format only)
     * New format: page.views[viewName] contains view_config and local_element_configs
     */
    function getPageView(page, viewName) {
        if (!page || !page.views || !page.views[viewName]) {
            return null;
        }
        
        return page.views[viewName];
    }

    /**
     * Get elements dictionary from a page (new format only)
     */
    function getPageElements(page) {
        if (!page || !page.elements || typeof page.elements !== 'object' || Array.isArray(page.elements)) {
            return {};
        }
        
        return page.elements;
    }

    /**
     * Get globals from a page (appearance_order from elements)
     * New format: appearance_order is derived from elements' appearance_config.appearance_order
     */
    function getPageGlobals(page) {
        if (!page || !page.elements || typeof page.elements !== 'object' || Array.isArray(page.elements)) {
            return { appearance_order: [] };
        }
        
        const appearanceOrder = [];
        
        Object.keys(page.elements).forEach(elementId => {
            const element = page.elements[elementId];
            if (element.appearance_config && element.appearance_config.appearance_order) {
                appearanceOrder.push({
                    id: elementId,
                    order: element.appearance_config.appearance_order
                });
            }
        });
        
        appearanceOrder.sort((a, b) => a.order - b.order);
        
        return {
            appearance_order: appearanceOrder.map(item => item.id)
        };
    }

    /**
     * Get all elements for a view (combines element properties with view-specific positioning)
     * New format: elements are in page.elements dict, view configs in page.views[viewName].local_element_configs
     * Child elements (answer_input, answer_display, audio_control) are generated from parent element data
     */
    function getViewElements(page, viewName) {
        const view = getPageView(page, viewName);
        const elementsDict = getPageElements(page);
        if (!view || !view.local_element_configs) {
            return [];
        }
        
        const result = [];
        
        Object.keys(view.local_element_configs).forEach(elementId => {
            // Skip appearance control modal (can appear with underscores or hyphens due to legacy data)
            if (elementId === 'appearance_control_modal' || elementId === 'appearance-control-modal') {
                return; // Skip special case - handled separately below
            }
            
            const elementData = elementsDict[elementId];
            if (!elementData) {
                console.warn('[QuizStructure] Element not found in elementsDict:', elementId, 'Available elements:', Object.keys(elementsDict));
                return;
            }
            
            // Skip child element types - they should not be separate entries
            // They are generated from parent element data below
            if (elementData.type === 'answer_input' || elementData.type === 'answer_display' || elementData.type === 'audio_control') {
                return;
            }
            
            const localConfig = view.local_element_configs[elementId];
            if (!localConfig) {
                console.warn('[QuizStructure] No localConfig found for element:', elementId);
                return;
            }
            
            const config = localConfig.config || localConfig.answer_config || {};
            
            // Extract properties from elementData.properties
            const properties = elementData.properties || {};
            
            // Extract appearance_config
            const appearanceConfig = elementData.appearance_config || {};
            const appearanceType = appearanceConfig.appearance_type || 'on_load';
            const timerTrigger = appearanceConfig.timer_trigger || 'load';
            const timerDelay = appearanceConfig.timer_delay || 0;
            
            // Extract question_config
            const questionConfig = elementData.question_config || {};
            
            // Determine appearance_mode based on appearance_type and timer_trigger
            let appearanceMode = 'on_load';
            if (appearanceType === 'control') {
                appearanceMode = 'control';
            } else if (appearanceType === 'timer') {
                // Map timer with previous_element trigger to local_delay mode
                if (timerTrigger === 'previous_element') {
                    appearanceMode = 'local_delay';
                } else {
                    // Timer with 'load' trigger maps to global_delay
                    appearanceMode = 'global_delay';
                }
            }
            
            // Determine initial visibility - but ONLY if appearance_visible is not already set
            // This preserves the current visibility state from room data (set by control page)
            let initialVisible = true;
            if ('appearance_visible' in elementData) {
                // Use existing visibility state from room data (set by control page)
                initialVisible = elementData.appearance_visible;
            } else {
                // Only calculate initial visibility if not already set (first time on page)
                if (appearanceMode === 'control') {
                    initialVisible = false;
                } else if (appearanceMode === 'local_delay' || appearanceMode === 'global_delay') {
                    initialVisible = false;
                }
            }
            
            // For control view: Do NOT include main elements, only generate control-specific child elements
            if (viewName === 'control') {
                // Only generate child elements for control view, don't add main elements
                if (elementData.is_question) {
                    // Generate answer_display element from parent question
                    // Read position/size from answer_display_config in local_element_configs[elementId]
                    // Structure: local_element_configs[elementId].answer_display_config = { x, y, width, height, rotation }
                    const answerDisplayConfig = localConfig.answer_display_config;
                    
                    if (!answerDisplayConfig) {
                        console.warn('[QuizStructure] No answer_display_config found for question element:', elementId, 'localConfig:', localConfig);
                    }
                    
                    // Use coordinates directly from answer_display_config (absolute pixel values from top-left of canvas)
                    // Coordinates are stored as absolute pixel values relative to the canvas (0,0 = top-left corner)
                    const x = answerDisplayConfig && answerDisplayConfig.x !== undefined ? answerDisplayConfig.x : 0;
                    const y = answerDisplayConfig && answerDisplayConfig.y !== undefined ? answerDisplayConfig.y : 0;
                    const width = answerDisplayConfig && answerDisplayConfig.width !== undefined ? answerDisplayConfig.width : 600;
                    const height = answerDisplayConfig && answerDisplayConfig.height !== undefined ? answerDisplayConfig.height : 300;
                    const rotation = answerDisplayConfig && answerDisplayConfig.rotation !== undefined ? answerDisplayConfig.rotation : 0;
                    
                    const answerDisplayElement = {
                        id: `${elementId}-answer-display`,
                        type: 'answer_display',
                        parent_id: elementId,
                        view: 'control',
                        ...properties, // Inherit properties from parent
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        rotation: rotation,
                        layer_order: elementData.layer_order || 1, // Inherit layer_order from parent
                        question_type: questionConfig.question_type || 'text',
                        answer_type: questionConfig.question_type || 'text',
                        options: questionConfig.options || [],
                        // Add question_config for properties panel compatibility (including timer_start_method)
                        question_config: {
                            question_type: questionConfig.question_type || 'text',
                            options: questionConfig.options || [],
                            timer_start_method: questionConfig.timer_start_method || 'user'
                        }
                    };
                    result.push(answerDisplayElement);
                }
                // Audio/video elements are controlled via play/pause button in visibility panel
                // No separate control element needed
                // Skip all other main elements for control view (including appearance_control - handled separately)
                return;
            }
            
            // For display view: include all main elements
            // For participant view: exclude question elements (only include their answer_input children)
            // Build merged element object
            const mergedElement = {
                id: elementId,
                type: elementData.type,
                is_question: elementData.is_question || false,
                // Add element_name if it exists
                element_name: elementData.element_name || null,
                // Merge properties into element
                ...properties,
                // Add positioning from local config (absolute pixel values from top-left of canvas)
                x: config.x || 0,
                y: config.y || 0,
                width: config.width || 100,
                height: config.height || 100,
                rotation: config.rotation || 0,
                // Add appearance properties (appearance_order stored in element)
                appearance_type: appearanceType,
                appearance_mode: appearanceMode,
                appearance_order: appearanceConfig.appearance_order || 1,
                // Use timer_delay for timer elements, otherwise use config.delay
                appearance_delay: appearanceType === 'timer' ? timerDelay : (appearanceConfig.config?.delay || 0),
                appearance_visible: initialVisible,
                // Add layer_order for overlay/layering (separate from appearance_order)
                layer_order: elementData.layer_order || 1,
                // Add question properties if it's a question
                question_title: questionConfig.question_title || '',
                question_correct_answer: questionConfig.question_correct_answer || '',
                question_type: questionConfig.question_type || 'text',
                answer_type: questionConfig.question_type || 'text', // Keep for runtime compatibility
                options: questionConfig.options || [],
                // Add question_config for properties panel compatibility
                question_config: {
                    question_type: questionConfig.question_type || 'text',
                    question_title: questionConfig.question_title || '',
                    question_correct_answer: questionConfig.question_correct_answer || '',
                    options: questionConfig.options || [],
                    timer_start_method: questionConfig.timer_start_method || 'user'
                }
            };
            
            // For participant view, skip question elements (they shouldn't be rendered as main elements)
            // Only their answer_input children should be included
            if (viewName === 'participant' && elementData.is_question) {
                // Skip adding the main question element - only generate answer_input child
            } else {
                // For display view or non-question elements in participant view, include the main element
                result.push(mergedElement);
            }
            
            // Generate child elements from parent element data (not separate entries)
            if (viewName === 'participant' && elementData.is_question) {
                // Generate answer_input element from parent question
                // Read position/size from answer_input_config in local_element_configs (absolute pixel values)
                const answerInputConfig = localConfig.answer_input_config || {};
                
                // Get default dimensions based on question type
                const questionType = questionConfig.question_type || 'text';
                function getDefaultAnswerInputDimensions(answerType) {
                    if (answerType === 'stopwatch') {
                        return { width: 370, height: 120 };
                    }
                    // Default for other types
                    return { width: 400, height: 100 };
                }
                const defaultDims = getDefaultAnswerInputDimensions(questionType);
                
                    const answerInputElement = {
                        id: `${elementId}-answer-input`,
                        type: 'answer_input',
                        parent_id: elementId,
                        view: 'participant',
                        ...properties, // Inherit properties from parent
                        x: answerInputConfig.x !== undefined ? answerInputConfig.x : 0,
                        y: answerInputConfig.y !== undefined ? answerInputConfig.y : 0,
                        width: answerInputConfig.width !== undefined ? answerInputConfig.width : defaultDims.width,
                        height: answerInputConfig.height !== undefined ? answerInputConfig.height : defaultDims.height,
                        rotation: answerInputConfig.rotation !== undefined ? answerInputConfig.rotation : 0,
                        layer_order: elementData.layer_order || 1, // Inherit layer_order from parent
                        question_type: questionType,
                        answer_type: questionType,
                        options: questionConfig.options || [],
                        // Add question_config for properties panel compatibility (including timer_start_method)
                        question_config: {
                            question_type: questionType,
                            options: questionConfig.options || [],
                            timer_start_method: questionConfig.timer_start_method || 'user'
                        }
                    };
                result.push(answerInputElement);
            }
        });
        
        // Handle appearance_control_modal for control view (special case - not in elements dict)
        // Coordinates are absolute pixel values from top-left of canvas
        if (viewName === 'control' && view.appearance_control_modal) {
            const modalConfig = view.appearance_control_modal;
            const appearanceControlElement = {
                id: 'appearance-control-modal',
                type: 'appearance_control',
                view: 'control',
                is_question: false,
                x: modalConfig.x || 50,
                y: modalConfig.y || 100,
                width: modalConfig.width || 400,
                height: modalConfig.height || 300,
                rotation: modalConfig.rotation || 0,
                layer_order: 1000 // High layer_order so appearance control appears on top
            };
            result.push(appearanceControlElement);
        }
        
        // Sort elements by layer_order to maintain correct overlay/layering
        // Elements with lower layer_order render first (behind), higher values render last (on top)
        result.sort((a, b) => {
            const orderA = a.layer_order || 1;
            const orderB = b.layer_order || 1;
            return orderA - orderB;
        });
        
        return result;
    }

    /**
     * Set background for a view
     */
    function setViewBackground(page, viewName, background_color, background_image) {
        page = ensurePageNewFormat(page, 0); // Ensure format, pageIndex not critical here
        
        if (!page.views) {
            page.views = {
                display: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                participant: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                control: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} }
            };
        }
        
        if (!page.views[viewName]) {
            page.views[viewName] = {
                view_config: {
                    background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } },
                    size: { width: 1920, height: 1080 }
                },
                local_element_configs: {}
            };
        }
        
        if (background_image) {
            page.views[viewName].view_config.background = {
                type: 'image',
                config: { image_url: background_image }
            };
        } else if (background_color) {
            page.views[viewName].view_config.background = {
                type: 'color',
                config: { color: background_color }
            };
        }
        
        return page;
    }

    /**
     * Add or update an element in a page
     */
    function setPageElement(page, element) {
        page = ensurePageNewFormat(page);
        
        const elementId = element.id;
        if (!elementId) return page;
        
        // Determine which view this element belongs to
        const elementView = element.view || 'display';
        
        // Extract properties from element (everything except positioning and view-specific config)
        const properties = {};
        const configKeys = ['x', 'y', 'width', 'height', 'rotation', 'view', 'id', 'type', 'is_question', 'visible', 'element_name'];
        const appearanceKeys = ['appearance_mode', 'appearance_type', 'appearance_order', 'appearance_delay', 'appearance_visible', 'appearance_name', 'timer_trigger', 'timer_delay'];
        const questionKeys = ['question_config', 'question_title', 'question_type', 'question_correct_answer', 'answer_type', 'options'];
        
        // Copy all properties except positioning and special keys
        Object.keys(element).forEach(key => {
            if (!configKeys.includes(key) && !appearanceKeys.includes(key) && !questionKeys.includes(key)) {
                properties[key] = element[key];
            }
        });
        
        // Normalize media element properties (ensure media_url and file_name are set)
        if (['image', 'video', 'audio', 'media'].includes(element.type)) {
            // Use media_url if src is provided but media_url is not
            if (element.src && !properties.media_url) {
                properties.media_url = element.src;
            }
            // Also keep src for backwards compatibility
            if (element.src && !properties.src) {
                properties.src = element.src;
            }
            // Use file_name if filename is provided but file_name is not
            if (element.filename && !properties.file_name) {
                properties.file_name = element.filename;
            }
            // Also keep filename for backwards compatibility
            if (element.filename && !properties.filename) {
                properties.filename = element.filename;
            }
            // Ensure media_type is set
            if (!properties.media_type) {
                properties.media_type = element.media_type || element.type;
            }
        }
        
        // Calculate appearance_order if not provided (for new elements)
        let appearanceOrder = element.appearance_order;
        if (!appearanceOrder) {
            // Find the maximum appearance_order among existing elements and add 1
            let maxOrder = 0;
            if (page.elements && typeof page.elements === 'object') {
                Object.values(page.elements).forEach(existingElement => {
                    if (existingElement.appearance_config && existingElement.appearance_config.appearance_order) {
                        maxOrder = Math.max(maxOrder, existingElement.appearance_config.appearance_order);
                    }
                });
            }
            appearanceOrder = maxOrder + 1;
        }
        
        // Calculate layer_order if not provided (for new elements)
        // Preserve existing layer_order if element already exists
        let layerOrder = element.layer_order;
        if (!layerOrder && page.elements && page.elements[elementId] && page.elements[elementId].layer_order) {
            // Preserve existing layer_order when updating
            layerOrder = page.elements[elementId].layer_order;
        } else if (!layerOrder) {
            // Find the maximum layer_order among existing elements and add 1
            let maxLayerOrder = 0;
            if (page.elements && typeof page.elements === 'object') {
                Object.values(page.elements).forEach(existingElement => {
                    if (existingElement.layer_order) {
                        maxLayerOrder = Math.max(maxLayerOrder, existingElement.layer_order);
                    }
                });
            }
            layerOrder = maxLayerOrder + 1;
        }
        
        // Build element data structure for page.elements dictionary
        const elementData = {
            type: element.type || 'richtext',
            properties: properties,
            appearance_config: {
                appearance_type: element.appearance_type || element.appearance_mode || 'on_load',
                appearance_order: appearanceOrder,
                config: {}
            },
            layer_order: layerOrder, // Separate from appearance_order - controls visual layering
            is_question: element.is_question || false,
            question_config: {}
        };
        
        // Save element_name directly on elementData if it exists
        if (element.element_name !== undefined) {
            elementData.element_name = element.element_name;
        }
        
        // Handle appearance config
        if (element.appearance_delay !== undefined) {
            elementData.appearance_config.config.delay = element.appearance_delay;
        }
        if (element.appearance_name) {
            elementData.appearance_config.config.name = element.appearance_name;
        }
        // Handle timer-specific properties
        if (element.timer_trigger !== undefined) {
            elementData.appearance_config.timer_trigger = element.timer_trigger;
        }
        if (element.timer_delay !== undefined) {
            elementData.appearance_config.timer_delay = element.timer_delay;
        }
        
        // Handle question config
        if (elementData.is_question || element.is_question) {
            let questionType = (element.question_config && element.question_config.question_type) || 
                                element.question_type || 
                                element.answer_type || 
                                'text';
            // Normalize multiple_choice to radio (they're the same thing)
            if (questionType === 'multiple_choice') {
                questionType = 'radio';
            }
            elementData.question_config = {
                question_type: questionType,
                question_title: element.question_title || (element.question_config && element.question_config.question_title) || '',
                question_correct_answer: element.question_correct_answer || (element.question_config && element.question_config.question_correct_answer) || ''
            };
            
            if (questionType === 'radio' || questionType === 'checkbox') {
                elementData.question_config.options = element.options || (element.question_config && element.question_config.options) || [];
            }
            
            // Save timer_start_method for stopwatch questions
            if (questionType === 'stopwatch') {
                elementData.question_config.timer_start_method = element.timer_start_method || (element.question_config && element.question_config.timer_start_method) || 'user';
            }
        }
        
        // Add/update element in page.elements dictionary
        if (!page.elements) {
            page.elements = {};
        }
        page.elements[elementId] = elementData;
        
        // Add/update element config in the appropriate view's local_element_configs
        if (!page.views) {
            page.views = {
                display: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                participant: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                control: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} }
            };
        }
        
        let view = page.views[elementView];
        if (!view) {
            page.views[elementView] = {
                view_config: {
                    background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } },
                    size: { width: 1920, height: 1080 }
                },
                local_element_configs: {}
            };
            view = page.views[elementView]; // Reassign after creating
        }
        
        if (!view.local_element_configs) {
            view.local_element_configs = {};
        }
        
        // Only store position/size in local_element_configs (not child elements)
        // Child elements (answer_input, answer_display, audio_control) are NOT separate entries
        // Their positions are stored within the parent element's view config
        
        // Skip if this is a child element type (should not be saved as separate entry)
        if (element.type === 'answer_input' || element.type === 'answer_display' || element.type === 'audio_control') {
            // Don't create separate entry - child elements are handled via parent
            return page;
        }
        
        // For display view, use simple config (only position/size)
        if (elementView === 'display') {
            // Ensure we're adding to the display view's local_element_configs
            if (!view.local_element_configs) {
                view.local_element_configs = {};
            }
            view.local_element_configs[elementId] = {
                config: {
                    x: element.x || 0,
                    y: element.y || 0,
                    width: element.width || 200,
                    height: element.height || 100,
                    rotation: element.rotation || 0
                }
            };
        } else if (elementView === 'participant') {
            // For participant view, only questions have configs (only position/size)
            if (elementData.is_question) {
                view.local_element_configs[elementId] = {
                    config: {
                        x: element.x || 0,
                        y: element.y || 0,
                        width: element.width || 200,
                        height: element.height || 100,
                        rotation: element.rotation || 0
                    }
                };
                // Store answer_input position within parent element's view config
                if (element.answer_input_config) {
                    view.local_element_configs[elementId].answer_input_config = element.answer_input_config;
                }
            }
        } else if (elementView === 'control') {
            // For control view, questions have answer_display config (only position/size)
            if (elementData.is_question) {
                view.local_element_configs[elementId] = {
                    config: {
                        x: element.x || 0,
                        y: element.y || 0,
                        width: element.width || 600,
                        height: element.height || 300,
                        rotation: element.rotation || 0
                    }
                };
                // Store answer_display position within parent element's view config
                if (element.answer_display_config) {
                    view.local_element_configs[elementId].answer_display_config = element.answer_display_config;
                }
            }
            // For media elements, store control position within parent element's view config
            if ((element.type === 'audio' || element.type === 'video') && element.control_config) {
                if (!view.local_element_configs[elementId]) {
                    view.local_element_configs[elementId] = {
                        config: {
                            x: element.x || 0,
                            y: element.y || 0,
                            width: element.width || 200,
                            height: element.height || 100,
                            rotation: element.rotation || 0
                        }
                    };
                }
                view.local_element_configs[elementId].control_config = element.control_config;
            }
            // For appearance_control elements, store their config in control view
            if (element.type === 'appearance_control') {
                view.local_element_configs[elementId] = {
                    config: {
                        x: element.x || 50,
                        y: element.y || 100,
                        width: element.width || 400,
                        height: element.height || 300,
                        rotation: element.rotation || 0
                    }
                };
            }
        }
        
        return page;
    }

    /**
     * Remove an element from a page
     */
    function removePageElement(page, elementId) {
        page = ensurePageNewFormat(page);
        
        // Remove from elements dict
        if (page.elements) {
            delete page.elements[elementId];
        }
        
        // Remove from all views
        ['display', 'participant', 'control'].forEach(viewName => {
            if (page.views && page.views[viewName] && page.views[viewName].local_element_configs) {
                delete page.views[viewName].local_element_configs[elementId];
            }
        });
        
        return page;
    }

    // Export functions
    Editor.QuizStructure = {
        ensurePageNewFormat: ensurePageNewFormat,
        getPageView: getPageView,
        getPageElements: getPageElements,
        getPageGlobals: getPageGlobals,
        getViewElements: getViewElements,
        setViewBackground: setViewBackground,
        setPageElement: setPageElement,
        removePageElement: removePageElement,
        ensureQuizNewFormat: ensureQuizNewFormat
    };

    if (typeof window.Editor === 'undefined') {
        window.Editor = {};
    }
    window.Editor.QuizStructure = Editor.QuizStructure;

})(typeof Editor !== 'undefined' ? Editor : {});
