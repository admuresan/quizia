// Shared element renderer for runtime (display, participant, control pages)
// Positioning and sizing are handled in ONE place only: applyElementPosition()

var RuntimeRenderer = RuntimeRenderer || {};

RuntimeRenderer.ElementRenderer = (function() {
    /**
     * Apply positioning and sizing to an element - THE ONLY PLACE THIS HAPPENS
     * @param {HTMLElement} el - The DOM element to position
     * @param {Object} element - The element data with x, y, width, height
     * @param {boolean} insideContainer - Whether element is inside a container (participant view question containers)
     */
    function applyElementPosition(el, element, insideContainer) {
        if (insideContainer) {
            // Inside container: use relative positioning, fill container
            el.style.position = 'relative';
            el.style.width = '100%';
            el.style.height = 'auto';
            el.style.left = 'auto';
            el.style.top = 'auto';
        } else {
            // Direct on canvas: use absolute positioning with exact coordinates
            // Coordinates are absolute pixel values from top-left corner of canvas (0,0 = top-left)
            // Ensure we have valid numeric values
            const x = typeof element.x === 'number' ? element.x : (parseFloat(element.x) || 0);
            const y = typeof element.y === 'number' ? element.y : (parseFloat(element.y) || 0);
            const width = typeof element.width === 'number' ? element.width : (parseFloat(element.width) || 100);
            const height = typeof element.height === 'number' ? element.height : (parseFloat(element.height) || 100);
            
            // Debug logging for positioning issues
            if (!element.x && !element.y && !element.width && !element.height) {
                console.warn('[RuntimeRenderer] Element missing coordinates:', element.id, element.type, element);
            }
            
            el.style.position = 'absolute';
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.style.width = `${width}px`;
            el.style.height = `${height}px`;
        }
    }
    
    /**
     * Render an element on a canvas (display/control/participant view)
     * @param {HTMLElement} container - The container to render into
     * @param {Object} element - The element data (must have x, y, width, height properties)
     * @param {Object} options - Rendering options (insideContainer, mode, etc.)
     */
    function renderElement(container, element, options = {}) {
        if (!element || !element.id) {
            console.error('[RuntimeRenderer] Invalid element:', element);
            return null;
        }
        
        const insideContainer = options.insideContainer || false;
        const mode = options.mode || 'display'; // 'display', 'participant', 'control'
        
        // Create the element container
        const el = document.createElement('div');
        el.className = 'runtime-element';
        el.id = `element-${element.id}`;
        
        // APPLY POSITIONING - THE ONLY PLACE THIS HAPPENS
        applyElementPosition(el, element, insideContainer);
        
        // Set box-sizing for consistent sizing
        el.style.boxSizing = 'border-box';
        
        // Set z-index based on layer_order to maintain correct overlay/layering in runtime
        // Higher layer_order = higher z-index (appears on top)
        if (!insideContainer) {
            const layerOrder = element.layer_order || 1;
            el.style.zIndex = layerOrder.toString();
        }
        
        // Render content based on element type
        const elementType = element.type || element.media_type;
        
        switch (elementType) {
            case 'image':
                renderImage(el, element);
                break;
            case 'video':
                renderVideo(el, element);
                break;
            case 'audio':
                renderAudio(el, element);
                break;
            case 'rectangle':
                renderRectangle(el, element);
                break;
            case 'circle':
                renderCircle(el, element);
                break;
            case 'triangle':
                renderTriangle(el, element);
                break;
            case 'arrow':
                renderArrow(el, element);
                break;
            case 'line':
                renderLine(el, element);
                break;
            case 'text':
                renderText(el, element);
                break;
            case 'richtext':
                renderRichText(el, element);
                break;
            case 'audio_control':
                if (mode === 'control') {
                    renderAudioControl(el, element, options);
                }
                break;
            case 'answer_input':
                if (mode === 'participant') {
                    renderAnswerInput(el, element, options);
                }
                break;
            case 'answer_display':
                if (mode === 'control') {
                    renderAnswerDisplay(el, element, options);
                }
                break;
            case 'appearance_control':
                if (mode === 'control') {
                    renderAppearanceControl(el, element, options);
                }
                break;
            default:
                console.warn('[RuntimeRenderer] Unknown element type:', elementType, element);
                break;
        }
        
        // Apply rotation (except for line which handles it internally)
        if (elementType !== 'line' && element.rotation) {
            el.style.transform = `rotate(${element.rotation}deg)`;
            el.style.transformOrigin = 'center center';
        }
        
        // Apply visibility (only hide if explicitly false)
        if (element.visible === false) {
            el.style.display = 'none';
        }
        
        // Append to container if not inside a container
        if (!insideContainer) {
            container.appendChild(el);
        }
        
        return el;
    }
    
    // ==================== CONTENT RENDERING FUNCTIONS ====================
    // These functions only handle content, NOT positioning/sizing
    
    function renderImage(el, element) {
        const img = document.createElement('img');
        let imageSrc = element.media_url || 
                      element.src || 
                      (element.file_name ? '/api/media/serve/' + element.file_name : '') ||
                      (element.filename ? '/api/media/serve/' + element.filename : '') ||
                      (element.image_src || '');
        
        if (!imageSrc) {
            console.warn('[RuntimeRenderer] Image element has no source:', element);
            el.textContent = 'Image (no source)';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.color = '#999';
            el.style.border = '2px dashed #ccc';
            return;
        }
        
        img.src = imageSrc;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'fill';
        img.onerror = () => {
            console.error('[RuntimeRenderer] Failed to load image:', imageSrc, element);
            el.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #999; border: 2px dashed #ccc;">Image failed to load</div>';
        };
        el.appendChild(img);
        el.style.border = 'none';
    }
    
    function renderVideo(el, element) {
        const video = document.createElement('video');
        video.src = element.media_url || element.src || (element.file_name ? '/api/media/serve/' + element.file_name : '') || (element.filename ? '/api/media/serve/' + element.filename : '');
        video.controls = false;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'contain';
        video.id = `video-${element.id}`;
        el.appendChild(video);
        el.style.border = 'none';
    }
    
    function renderAudio(el, element) {
        const audioIcon = document.createElement('div');
        audioIcon.innerHTML = '🔊';
        audioIcon.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 64px;';
        el.appendChild(audioIcon);
        
        const audioElement = document.createElement('audio');
        audioElement.src = element.media_url || element.src || (element.file_name ? '/api/media/serve/' + element.file_name : '') || (element.filename ? '/api/media/serve/' + element.filename : '');
        audioElement.style.display = 'none';
        audioElement.id = `audio-${element.id}`;
        el.appendChild(audioElement);
        el.style.border = 'none';
    }
    
    function renderRectangle(el, element) {
        el.style.backgroundColor = element.fill_color || '#ddd';
        el.style.border = `${element.border_width || 2}px solid ${element.border_color || '#999'}`;
    }
    
    function renderCircle(el, element) {
        el.style.borderRadius = '50%';
        el.style.backgroundColor = element.fill_color || '#ddd';
        el.style.border = `${element.border_width || 2}px solid ${element.border_color || '#999'}`;
    }
    
    function renderTriangle(el, element) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${element.width} ${element.height}`);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        path.setAttribute('points', `${element.width/2},0 ${element.width},${element.height} 0,${element.height}`);
        path.setAttribute('fill', element.fill_color || '#ddd');
        path.setAttribute('stroke', element.border_color || '#999');
        path.setAttribute('stroke-width', element.border_width || 2);
        svg.appendChild(path);
        el.appendChild(svg);
        el.style.border = 'none';
    }
    
    function renderArrow(el, element) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${element.width} ${element.height}`);
        
        const arrowHeadLength = element.arrow_head_length || Math.min(element.width, element.height) * 0.3;
        const arrowBodyThickness = element.arrow_body_thickness || Math.min(element.width, element.height) * 0.2;
        const arrowBodyWidth = element.width - arrowHeadLength;
        const bodyTop = (element.height - arrowBodyThickness) / 2;
        const bodyBottom = bodyTop + arrowBodyThickness;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M 0 ${bodyTop} L ${arrowBodyWidth} ${bodyTop} L ${arrowBodyWidth} 0 L ${element.width} ${element.height/2} L ${arrowBodyWidth} ${element.height} L ${arrowBodyWidth} ${bodyBottom} L 0 ${bodyBottom} Z`);
        path.setAttribute('fill', element.fill_color || '#ddd');
        path.setAttribute('stroke', element.border_color || '#999');
        path.setAttribute('stroke-width', element.border_width || 2);
        svg.appendChild(path);
        el.appendChild(svg);
        el.style.border = 'none';
    }
    
    function renderLine(el, element) {
        // Line elements need special handling for rotation
        // Width and height are set by applyElementPosition, but line overrides width
        el.style.width = `${Math.max(element.width, element.height)}px`;
        el.style.height = `${element.border_width || 2}px`;
        el.style.backgroundColor = element.fill_color || element.border_color || '#999';
        el.style.border = 'none';
        el.style.transformOrigin = '0 0';
        if (element.rotation) {
            el.style.transform = `rotate(${element.rotation}deg)`;
        }
    }
    
    function renderText(el, element) {
        if (element.html) {
            el.innerHTML = element.html;
        } else if (element.text) {
            el.textContent = element.text;
        }
        el.style.fontSize = `${element.font_size || 24}px`;
        el.style.color = element.color || element.text_color || '#fff';
        el.style.backgroundColor = element.background_color || 'transparent';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.padding = '0.5rem';
        el.style.wordWrap = 'break-word';
        el.style.overflow = 'hidden';
        el.style.border = 'none';
        el.style.textAlign = element.text_align || 'center';
    }
    
    function renderRichText(el, element) {
        el.innerHTML = element.content || '';
        el.style.fontSize = `${element.font_size || 16}px`;
        el.style.color = element.text_color || '#000000';
        el.style.backgroundColor = element.background_color || 'transparent';
        el.style.padding = '8px';
        el.style.overflow = 'auto';
        el.style.wordWrap = 'break-word';
        el.style.border = 'none';
        el.style.textAlign = 'left';
    }
    
    function renderAudioControl(el, element, options) {
        el.style.backgroundColor = '#f5f5f5';
        el.style.border = '1px solid #ddd';
        el.style.borderRadius = '4px';
        el.style.padding = '0.5rem';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.gap = '0.5rem';
        
        const filenameLabel = document.createElement('div');
        let filename = element.file_name || element.filename || (element.media_type === 'video' ? 'Video' : 'Audio');
        if (filename && typeof filename === 'string') {
            filename = filename.split('/').pop().split('\\').pop();
        }
        filenameLabel.textContent = filename || (element.media_type === 'video' ? 'Video' : 'Audio');
        filenameLabel.style.fontWeight = '500';
        filenameLabel.style.fontSize = '0.9rem';
        filenameLabel.style.color = '#333';
        el.appendChild(filenameLabel);
        
        const controlsContainer = document.createElement('div');
        controlsContainer.style.display = 'flex';
        controlsContainer.style.gap = '0.5rem';
        controlsContainer.style.alignItems = 'center';
        
        const playBtn = document.createElement('button');
        playBtn.textContent = '▶ Play';
        playBtn.className = 'control-play-btn';
        playBtn.dataset.elementId = element.parent_id || element.id;
        playBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;';
        controlsContainer.appendChild(playBtn);
        
        const pauseBtn = document.createElement('button');
        pauseBtn.textContent = '⏸ Pause';
        pauseBtn.className = 'control-pause-btn';
        pauseBtn.dataset.elementId = element.parent_id || element.id;
        pauseBtn.style.cssText = 'padding: 0.5rem 1rem; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;';
        controlsContainer.appendChild(pauseBtn);
        
        el.appendChild(controlsContainer);
        
        const mediaSrc = element.media_url || element.src || (element.file_name ? '/api/media/serve/' + element.file_name : '') || (element.filename ? '/api/media/serve/' + element.filename : '');
        
        if (element.media_type === 'video') {
            const video = document.createElement('video');
            video.style.display = 'none';
            video.src = mediaSrc;
            video.id = `video-control-${element.id}`;
            el.appendChild(video);
        } else {
            const audio = document.createElement('audio');
            audio.style.display = 'none';
            audio.src = mediaSrc;
            audio.id = `audio-control-${element.id}`;
            el.appendChild(audio);
        }
    }
    
    function renderAnswerInput(el, element, options) {
        const answerType = (element.question_config && element.question_config.question_type) || element.answer_type || 'text';
        const questionId = element.parent_id;
        const question = options.question || null;
        const submittedAnswer = options.submittedAnswer || null;
        
        const container = document.createElement('div');
        container.style.cssText = 'background-color: white; padding: 1rem; border: 2px solid #2196F3; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); width: 100%; height: 100%; box-sizing: border-box; display: flex; flex-direction: column;';
        el.appendChild(container);
        
        const questionTitle = question && question.question_config ? (question.question_config.question_title || '') : '';
        const renderOptions = Object.assign({}, options, { question: question, questionTitle: questionTitle });
        
        if (answerType === 'text' && QuestionTypes.Text && QuestionTypes.Text.ParticipantView) {
            QuestionTypes.Text.ParticipantView.render(container, element, renderOptions);
        } else if (answerType === 'radio' && QuestionTypes.Radio && QuestionTypes.Radio.ParticipantView) {
            QuestionTypes.Radio.ParticipantView.render(container, element, renderOptions);
        } else if (answerType === 'checkbox' && QuestionTypes.Checkbox && QuestionTypes.Checkbox.ParticipantView) {
            QuestionTypes.Checkbox.ParticipantView.render(container, element, renderOptions);
        } else if (answerType === 'image_click' && QuestionTypes.ImageClick && QuestionTypes.ImageClick.ParticipantView) {
            QuestionTypes.ImageClick.ParticipantView.render(container, element, renderOptions);
        } else if (answerType === 'stopwatch' && QuestionTypes.Stopwatch && QuestionTypes.Stopwatch.ParticipantView) {
            QuestionTypes.Stopwatch.ParticipantView.render(container, element, renderOptions);
        } else {
            console.error('[RuntimeRenderer] Question type', answerType, 'participant view not found');
            container.textContent = `Answer input type "${answerType}" not supported`;
            container.style.cssText = 'padding: 1rem; color: red; border: 2px solid red;';
        }
    }
    
    function renderAnswerDisplay(el, element, options) {
        // Get answerType from options first, then element, with normalization
        let answerType = options.answerType || (element.question_config && element.question_config.question_type) || element.answer_type || 'text';
        
        // Normalize 'image' to 'image_click' for consistency
        if (answerType === 'image') {
            answerType = 'image_click';
        }
        
        // Create inner container - width/height are already set by applyElementPosition
        const container = document.createElement('div');
        container.style.cssText = 'background-color: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); width: 100%; height: 100%; box-sizing: border-box;';
        
        if (answerType === 'image_click') {
            container.style.overflowY = 'auto';
            container.style.overflowX = 'hidden';
        }
        
        el.appendChild(container);
        
        const questionId = element.parent_id;
        const questionTitle = options.questionTitle || 'Question';
        const answers = options.answers || {};
        const participants = options.participants || {};
        const onMarkAnswer = options.onMarkAnswer || null;
        const imageSrc = options.imageSrc || '';
        
        const renderOptions = {
            questionId: questionId,
            questionTitle: questionTitle,
            answers: answers,
            participants: participants,
            onMarkAnswer: onMarkAnswer,
            imageSrc: imageSrc,
            answerType: answerType,
            question: options.question || null
        };
        
        // Check for image_click or image type (both should use image_click control view)
        if ((answerType === 'image_click' || answerType === 'image') && QuestionTypes.ImageClick && QuestionTypes.ImageClick.ControlView) {
            QuestionTypes.ImageClick.ControlView.render(container, renderOptions);
        } else if (answerType === 'text' && QuestionTypes.Text && QuestionTypes.Text.ControlView) {
            QuestionTypes.Text.ControlView.render(container, renderOptions);
        } else if (answerType === 'radio' && QuestionTypes.Radio && QuestionTypes.Radio.ControlView) {
            QuestionTypes.Radio.ControlView.render(container, renderOptions);
        } else if (answerType === 'checkbox' && QuestionTypes.Checkbox && QuestionTypes.Checkbox.ControlView) {
            QuestionTypes.Checkbox.ControlView.render(container, renderOptions);
        } else if (answerType === 'stopwatch' && QuestionTypes.Stopwatch && QuestionTypes.Stopwatch.ControlView) {
            QuestionTypes.Stopwatch.ControlView.render(container, renderOptions);
        } else {
            console.error('[RuntimeRenderer] Question type', answerType, 'control view not found');
            container.textContent = `Answer display type "${answerType}" not supported`;
            container.style.cssText = 'padding: 1rem; color: red; border: 2px solid red;';
        }
    }
    
    function renderAppearanceControl(el, element, options) {
        if (Editor && Editor.AppearanceControlRenderer && Editor.AppearanceControlRenderer.render) {
            Editor.AppearanceControlRenderer.render(el, element, {
                getCurrentQuiz: () => options.quiz || null,
                getCurrentPageIndex: () => {
                    if (options.quiz && options.page) {
                        const index = options.quiz.pages.findIndex(p => p === options.page);
                        return index >= 0 ? index : 0;
                    }
                    return 0;
                },
                getCurrentView: () => 'control',
                isRuntime: true,
                socket: options.socket || null,
                roomCode: options.roomCode || null
            });
        } else {
            el.innerHTML = '<p style="padding: 1rem; color: #666;">Appearance control renderer not available</p>';
        }
    }
    
    return {
        renderElement: renderElement
    };
})();
