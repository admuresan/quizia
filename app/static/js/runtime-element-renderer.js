// Shared element renderer for runtime (display, participant, control pages)
// Based on editor element renderer but without editing capabilities

var RuntimeRenderer = RuntimeRenderer || {};

RuntimeRenderer.ElementRenderer = (function() {
    /**
     * Render an element on a canvas (display/control/participant view)
     * @param {HTMLElement} container - The container to render into
     * @param {Object} element - The element data
     * @param {Object} options - Rendering options (insideContainer, runtime mode)
     */
    function renderElement(container, element, options = {}) {
        const insideContainer = options.insideContainer || false;
        const mode = options.mode || 'display'; // 'display', 'participant', 'control'
        
        const el = document.createElement('div');
        el.className = 'runtime-element';
        el.id = `element-${element.id}`;
        
        // Positioning
        if (!insideContainer) {
            el.style.position = 'absolute';
            el.style.left = `${element.x}px`;
            el.style.top = `${element.y}px`;
            el.style.width = `${element.width}px`;
            el.style.height = `${element.height}px`;
        } else {
            el.style.position = 'relative';
            el.style.width = '100%';
            el.style.height = 'auto';
        }
        
        // Render based on element type
        switch (element.type) {
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
                console.warn('Unknown element type:', element.type, element);
                break;
        }
        
        // Apply rotation
        if (element.type !== 'line' && element.rotation) {
            el.style.transform = `rotate(${element.rotation}deg)`;
            el.style.transformOrigin = 'center center';
        }
        
        // Apply visibility
        if (element.visible === false) {
            el.style.display = 'none';
        }
        
        if (!insideContainer) {
            container.appendChild(el);
        } else {
            // For insideContainer mode, don't append - caller will append
            console.log(`Element ${element.id} rendered with insideContainer=true, not appending to container`);
        }
        
        return el;
    }
    
    function renderImage(el, element) {
        const img = document.createElement('img');
        img.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : '');
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        el.appendChild(img);
        el.style.border = 'none';
    }
    
    function renderVideo(el, element) {
        const video = document.createElement('video');
        video.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : '');
        video.controls = false; // Control via quizmaster only
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
        audioElement.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : '');
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
        // Text elements can have html or text property
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
        let filename = element.filename || (element.media_type === 'video' ? 'Video' : 'Audio');
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
        
        // Hidden media element for playback
        if (element.media_type === 'video') {
            const video = document.createElement('video');
            video.style.display = 'none';
            video.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : '');
            video.id = `video-control-${element.id}`;
            el.appendChild(video);
        } else {
            const audio = document.createElement('audio');
            audio.style.display = 'none';
            audio.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : '');
            audio.id = `audio-control-${element.id}`;
            el.appendChild(audio);
        }
    }
    
    function renderAnswerInput(el, element, options) {
        const answerType = element.answer_type || 'text';
        const questionId = element.parent_id;
        const question = options.question || null; // Get question element from options for image_click
        const submittedAnswer = options.submittedAnswer || null;
        
        // Use new modular question type participant views
        const renderOptions = Object.assign({}, options, { question: question });
        
        // Route to appropriate question type participant view renderer
        if (answerType === 'text' && QuestionTypes.Text && QuestionTypes.Text.ParticipantView) {
            QuestionTypes.Text.ParticipantView.render(el, element, renderOptions);
        } else if (answerType === 'radio' && QuestionTypes.Radio && QuestionTypes.Radio.ParticipantView) {
            QuestionTypes.Radio.ParticipantView.render(el, element, renderOptions);
        } else if (answerType === 'checkbox' && QuestionTypes.Checkbox && QuestionTypes.Checkbox.ParticipantView) {
            QuestionTypes.Checkbox.ParticipantView.render(el, element, renderOptions);
        } else if (answerType === 'image_click' && QuestionTypes.ImageClick && QuestionTypes.ImageClick.ParticipantView) {
            QuestionTypes.ImageClick.ParticipantView.render(el, element, renderOptions);
        } else if (answerType === 'stopwatch' && QuestionTypes.Stopwatch && QuestionTypes.Stopwatch.ParticipantView) {
            QuestionTypes.Stopwatch.ParticipantView.render(el, element, renderOptions);
        } else {
            // Unknown question type - show error message
            console.error('Question type', answerType, 'participant view not found');
            el.textContent = `Answer input type "${answerType}" not supported`;
            el.style.cssText = 'padding: 1rem; color: red; border: 2px solid red;';
        }
    }
    
    function renderAnswerDisplay(el, element, options) {
        // Get answer_type from options first (control.js does fallback logic), then element, then default to text
        // options.answerType is determined with fallback: answer_display -> answer_input -> question
        const answerType = options.answerType || element.answer_type || 'text';
        
        // Debug logging
        console.log('[DEBUG runtime-element-renderer] renderAnswerDisplay', {
            elementId: element.id,
            elementAnswerType: element.answer_type,
            optionsAnswerType: options.answerType,
            finalAnswerType: answerType,
            parentId: element.parent_id
        });
        
        // For image_click questions, enable scrolling while maintaining fixed size
        if (answerType === 'image_click') {
            el.style.overflowY = 'auto';
            el.style.overflowX = 'hidden';
            // Keep the fixed height from element.height (set earlier in renderElement)
        }
        
        const questionId = element.parent_id;
        const questionTitle = options.questionTitle || 'Question';
        const answers = options.answers || {}; // { participant_id: { answer, submission_time, correct, bonus_points } }
        const participants = options.participants || {}; // { participant_id: { name, avatar } }
        const onMarkAnswer = options.onMarkAnswer || null;
        const imageSrc = options.imageSrc || '';
        
        // Use new modular question type renderers
        const renderOptions = {
            questionId: questionId,
            questionTitle: questionTitle,
            answers: answers,
            participants: participants,
            onMarkAnswer: onMarkAnswer,
            imageSrc: imageSrc
        };
        
        // Route to appropriate question type renderer
        if (answerType === 'image_click' && QuestionTypes.ImageClick && QuestionTypes.ImageClick.ControlView) {
            QuestionTypes.ImageClick.ControlView.render(el, renderOptions);
        } else if (answerType === 'text' && QuestionTypes.Text && QuestionTypes.Text.ControlView) {
            QuestionTypes.Text.ControlView.render(el, renderOptions);
        } else if (answerType === 'radio' && QuestionTypes.Radio && QuestionTypes.Radio.ControlView) {
            QuestionTypes.Radio.ControlView.render(el, renderOptions);
        } else if (answerType === 'checkbox' && QuestionTypes.Checkbox && QuestionTypes.Checkbox.ControlView) {
            QuestionTypes.Checkbox.ControlView.render(el, renderOptions);
        } else if (answerType === 'stopwatch' && QuestionTypes.Stopwatch && QuestionTypes.Stopwatch.ControlView) {
            QuestionTypes.Stopwatch.ControlView.render(el, renderOptions);
        } else {
            // Unknown question type - show error message
            console.error('Question type', answerType, 'control view not found');
            el.textContent = `Answer display type "${answerType}" not supported`;
            el.style.cssText = 'padding: 1rem; color: red; border: 2px solid red;';
        }
    }
    
    function renderAppearanceControl(el, element, options) {
        // Appearance control element for runtime - shows toggles for control mode elements
        const quiz = options.quiz || null;
        const page = options.page || null;
        const socket = options.socket || null;
        const roomCode = options.roomCode || null;
        
        el.style.backgroundColor = '#f9f9f9';
        el.style.border = '2px solid #2196F3';
        el.style.borderRadius = '8px';
        el.style.padding = '1rem';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.overflow = 'auto';
        el.style.boxSizing = 'border-box';
        
        const appearanceTitle = document.createElement('div');
        appearanceTitle.textContent = 'Element Appearance';
        appearanceTitle.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #333; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid #ddd;';
        el.appendChild(appearanceTitle);
        
        if (!page || !page.elements) {
            const noPage = document.createElement('p');
            noPage.style.cssText = 'color: #666; font-style: italic; font-size: 0.9rem; padding: 0.5rem;';
            noPage.textContent = 'No page data available';
            el.appendChild(noPage);
            return;
        }
        
        // Get all display elements (not just those in appearance_order)
        const allDisplayElements = page.elements.filter(el => 
            el && (!el.view || el.view === 'display') && 
            el.type !== 'navigation_control' && 
            el.type !== 'audio_control' && 
            el.type !== 'answer_input' && 
            el.type !== 'answer_display' &&
            el.type !== 'appearance_control'
        );
        
        // Initialize appearance_order if it doesn't exist
        if (!page.appearance_order) {
            page.appearance_order = allDisplayElements.map(el => el.id);
        }
        
        // Order elements according to appearance_order, but include any elements not in the order array
        const orderedIds = page.appearance_order || [];
        const orderedElements = [];
        const addedIds = new Set();
        
        // First add elements in appearance_order
        orderedIds.forEach(id => {
            const el = allDisplayElements.find(e => e.id === id);
            if (el) {
                orderedElements.push(el);
                addedIds.add(id);
            }
        });
        
        // Then add any remaining elements not in appearance_order
        allDisplayElements.forEach(el => {
            if (!addedIds.has(el.id)) {
                orderedElements.push(el);
            }
        });
        
        // Generate unique names for elements (fallback if no custom name)
        const typeCounts = {};
        const elementNames = {};
        orderedElements.forEach(el => {
            const type = el.type || 'element';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
            elementNames[el.id] = type + (typeCounts[type] || 1);
        });
        
        const controlsList = document.createElement('div');
        controlsList.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';
        
        // Show ALL display elements, not just those with appearance_mode === 'control'
        orderedElements.forEach(element => {
            const controlItem = document.createElement('div');
            controlItem.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: white; border: 1px solid #ddd; border-radius: 4px;';
            controlItem.dataset.elementId = element.id;
            
            const nameLabel = document.createElement('span');
            // Use custom appearance_name if available, otherwise fallback to generated name
            nameLabel.textContent = element.appearance_name || elementNames[element.id] || element.type || 'element';
            nameLabel.style.cssText = 'flex: 1; font-weight: 500; font-size: 0.9rem;';
            controlItem.appendChild(nameLabel);
            
            // Create toggle switch container
            const toggleContainer = document.createElement('div');
            toggleContainer.style.cssText = 'position: relative; width: 50px; height: 26px; cursor: pointer; flex-shrink: 0;';
            
            // Toggle track (background)
            const toggleTrack = document.createElement('div');
            toggleTrack.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 13px; transition: background-color 0.3s ease;';
            toggleContainer.appendChild(toggleTrack);
            
            // Toggle ball (slider)
            const toggleBall = document.createElement('div');
            toggleBall.style.cssText = 'position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: transform 0.3s ease, box-shadow 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
            toggleContainer.appendChild(toggleBall);
            
            // Function to update toggle state
            const updateToggleState = (isOn) => {
                element.appearance_visible = isOn;
                if (isOn) {
                    toggleTrack.style.backgroundColor = '#2196F3'; // Blue when on
                    toggleBall.style.transform = 'translateX(24px)'; // Move to right
                } else {
                    toggleTrack.style.backgroundColor = '#ccc'; // Grey when off
                    toggleBall.style.transform = 'translateX(0)'; // Move to left
                }
            };
            
            // Initialize toggle state based on appearance_mode
            // Control mode elements start hidden (false), others start visible (true)
            const appearanceMode = element.appearance_mode || 'on_load';
            let initialVisible;
            if (element.appearance_visible !== undefined) {
                initialVisible = element.appearance_visible;
            } else {
                // Default: control mode starts hidden, others start visible
                initialVisible = appearanceMode === 'control' ? false : true;
            }
            updateToggleState(initialVisible);
            
            // Click handler
            toggleContainer.onclick = (e) => {
                e.stopPropagation();
                // Get current state - use appearance_visible if set, otherwise infer from mode
                let currentState;
                if (element.appearance_visible !== undefined) {
                    currentState = element.appearance_visible;
                } else {
                    currentState = appearanceMode === 'control' ? false : true;
                }
                const newState = !currentState;
                updateToggleState(newState);
                
                // Emit socket event to show/hide element on display screen
                if (socket && roomCode) {
                    socket.emit('quizmaster_control_element_appearance', {
                        room_code: roomCode,
                        element_id: element.id,
                        visible: newState
                    });
                }
            };
            
            // Store update function on element for external updates
            element._updateAppearanceToggle = updateToggleState;
            
            controlItem.appendChild(toggleContainer);
            controlsList.appendChild(controlItem);
        });
        
        if (controlsList.children.length === 0) {
            const noControls = document.createElement('p');
            noControls.style.cssText = 'color: #666; font-style: italic; font-size: 0.9rem; padding: 0.5rem;';
            noControls.textContent = 'No display elements available';
            controlsList.appendChild(noControls);
        }
        
        el.appendChild(controlsList);
    }
    
    return {
        renderElement: renderElement
    };
})();
