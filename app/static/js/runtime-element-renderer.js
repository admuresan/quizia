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
        const options_list = element.options || [];
        const questionId = element.parent_id;
        const question = options.question || null; // Get question element from options for image_click
        const onSubmitCallback = options.onSubmit || options.submitAnswerCallback || null;
        
        el.style.backgroundColor = 'transparent';
        el.style.border = 'none';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.gap = '0.5rem';
        el.style.padding = '0.5rem';
        
        if (answerType === 'text') {
            console.log('Rendering text answer input for question:', questionId);
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'answer-text-input';
            input.placeholder = 'Type your answer...';
            input.dataset.questionId = questionId;
            input.style.cssText = 'width: 100%; padding: 0.5rem; border: 2px solid #2196F3; border-radius: 4px; font-size: 0.9rem;';
            el.appendChild(input);
            
            const submitBtn = document.createElement('button');
            submitBtn.textContent = 'Submit';
            submitBtn.className = 'submit-answer-btn';
            submitBtn.dataset.questionId = questionId;
            submitBtn.dataset.answerType = 'text';
            submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
            el.appendChild(submitBtn);
            console.log('Text answer input rendered, el.children.length:', el.children.length);
        } else if (answerType === 'radio') {
            const optionsDiv = document.createElement('div');
            optionsDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';
            options_list.forEach((option, index) => {
                const label = document.createElement('label');
                label.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.25rem;';
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `answer-${questionId}`;
                radio.value = option;
                label.appendChild(radio);
                label.appendChild(document.createTextNode(option));
                optionsDiv.appendChild(label);
            });
            el.appendChild(optionsDiv);
            
            const submitBtn = document.createElement('button');
            submitBtn.textContent = 'Submit';
            submitBtn.className = 'submit-answer-btn';
            submitBtn.dataset.questionId = questionId;
            submitBtn.dataset.answerType = 'radio';
            submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
            el.appendChild(submitBtn);
        } else if (answerType === 'checkbox') {
            const checkboxesDiv = document.createElement('div');
            checkboxesDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';
            options_list.forEach(option => {
                const label = document.createElement('label');
                label.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.25rem;';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = option;
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(option));
                checkboxesDiv.appendChild(label);
            });
            el.appendChild(checkboxesDiv);
            
            const submitBtn = document.createElement('button');
            submitBtn.textContent = 'Submit';
            submitBtn.className = 'submit-answer-btn';
            submitBtn.dataset.questionId = questionId;
            submitBtn.dataset.answerType = 'checkbox';
            submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
            el.appendChild(submitBtn);
        } else if (answerType === 'image_click') {
            // Image click input - render interactive image
            const question = options.question || null;
            console.log('Rendering image_click answer input:', { question, element, options });
            // Get image source from question element (for image questions)
            let imageSrc = null;
            if (question) {
                imageSrc = question.src || (question.filename ? '/api/media/serve/' + question.filename : null);
            }
            // Fallback to element's own src if question doesn't have one
            if (!imageSrc) {
                imageSrc = element.image_src || element.src;
            }
            console.log('Image source determined:', imageSrc);
            
            if (imageSrc) {
                const imageContainer = document.createElement('div');
                imageContainer.className = 'image-answer-container';
                imageContainer.style.cssText = 'position: relative; display: inline-block; max-width: 100%;';
                
                let clickIndicator = null;
                let clickCoords = null;
                let isSubmitted = false;
                
                const img = document.createElement('img');
                img.src = imageSrc;
                img.style.cssText = 'max-width: 100%; height: auto; cursor: crosshair; border: 2px solid #2196F3; border-radius: 4px;';
                img.alt = 'Click to answer';
                
                const submitBtn = document.createElement('button');
                submitBtn.textContent = 'Submit';
                submitBtn.className = 'submit-answer-btn';
                submitBtn.dataset.questionId = questionId;
                submitBtn.dataset.answerType = 'image_click';
                submitBtn.disabled = true;
                submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500; margin-top: 1rem;';
                
                img.onclick = (e) => {
                    if (isSubmitted) return;
                    
                    const rect = img.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    clickCoords = { x, y };
                    
                    // Remove previous indicator
                    if (clickIndicator) {
                        clickIndicator.remove();
                    }
                    
                    // Create click indicator (circle with 10% radius)
                    clickIndicator = document.createElement('div');
                    const radius = Math.min(rect.width, rect.height) * 0.1;
                    clickIndicator.style.cssText = `position: absolute; width: ${radius * 2}px; height: ${radius * 2}px; border: 3px solid #FF5722; border-radius: 50%; background: rgba(255, 87, 34, 0.2); pointer-events: none; left: ${e.clientX - rect.left - radius}px; top: ${e.clientY - rect.top - radius}px;`;
                    imageContainer.appendChild(clickIndicator);
                    
                    submitBtn.disabled = false;
                };
                
                submitBtn.onclick = () => {
                    if (clickCoords && !isSubmitted) {
                        isSubmitted = true;
                        submitBtn.disabled = true;
                        if (options.submitAnswerCallback) {
                            options.submitAnswerCallback(questionId, 'image_click', submitBtn, clickCoords);
                        }
                    }
                };
                
                imageContainer.appendChild(img);
                el.appendChild(imageContainer);
                el.appendChild(submitBtn);
                console.log('Image click input rendered, children count:', el.children.length);
            } else {
                console.warn('No image source found for image_click answer input');
                el.textContent = 'Image not available';
            }
        } else if (answerType === 'stopwatch') {
            // Stopwatch - render timer controls
            const stopwatchContainer = document.createElement('div');
            stopwatchContainer.className = 'stopwatch-container';
            stopwatchContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 1rem;';
            
            const timerDisplay = document.createElement('div');
            timerDisplay.className = 'timer-display';
            timerDisplay.style.cssText = 'font-size: 2rem; font-weight: bold; display: none;';
            timerDisplay.textContent = '0:00';
            stopwatchContainer.appendChild(timerDisplay);
            
            const controlsDiv = document.createElement('div');
            controlsDiv.style.cssText = 'display: flex; gap: 1rem;';
            
            const startBtn = document.createElement('button');
            startBtn.textContent = 'Start';
            startBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
            
            const stopBtn = document.createElement('button');
            stopBtn.textContent = 'Stop';
            stopBtn.style.cssText = 'padding: 0.5rem 1rem; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
            stopBtn.disabled = true;
            
            let startTime = null;
            let elapsedTime = 0;
            let intervalId = null;
            let isSubmitted = false;
            
            startBtn.onclick = () => {
                if (isSubmitted) return;
                startTime = Date.now() - elapsedTime;
                startBtn.disabled = true;
                stopBtn.disabled = false;
                timerDisplay.style.display = 'none'; // Hide timer while running
                
                intervalId = setInterval(() => {
                    elapsedTime = Date.now() - startTime;
                    // Don't update display text while running - only show time after stopping
                }, 100);
            };
            
            stopBtn.onclick = () => {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                if (startTime) {
                    elapsedTime = Date.now() - startTime;
                }
                startBtn.disabled = false;
                stopBtn.disabled = true;
                
                // Show the final time only after stopping
                const seconds = Math.floor(elapsedTime / 1000);
                const minutes = Math.floor(seconds / 60);
                const secs = seconds % 60;
                timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
                timerDisplay.style.display = 'block';
                
                if (elapsedTime > 0 && !isSubmitted) {
                    isSubmitted = true;
                    if (options.submitAnswerCallback) {
                        options.submitAnswerCallback(questionId, 'stopwatch', stopBtn, elapsedTime);
                    }
                }
            };
            
            controlsDiv.appendChild(startBtn);
            controlsDiv.appendChild(stopBtn);
            stopwatchContainer.appendChild(controlsDiv);
            el.appendChild(stopwatchContainer);
        }
    }
    
    function renderAnswerDisplay(el, element, options) {
        const answerType = element.answer_type || 'text';
        const questionId = element.parent_id;
        const questionTitle = options.questionTitle || 'Question';
        const answers = options.answers || {}; // { participant_id: { answer, submission_time, correct, bonus_points } }
        const participants = options.participants || {}; // { participant_id: { name, avatar } }
        const onMarkAnswer = options.onMarkAnswer || null;
        
        el.style.backgroundColor = 'white';
        el.style.border = '2px solid #2196F3';
        el.style.borderRadius = '8px';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.padding = '1rem';
        el.style.overflow = 'auto';
        el.style.fontSize = '0.9rem';
        el.style.color = '#333';
        
        const titleHeader = document.createElement('div');
        titleHeader.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #2196F3; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3;';
        titleHeader.textContent = questionTitle;
        el.appendChild(titleHeader);
        
        // Render answers based on type
        if (answerType === 'image_click') {
            renderImageClickAnswers(el, element, answers, participants, questionId, onMarkAnswer, options);
        } else {
            renderTextAnswers(el, answerType, answers, participants, questionId, onMarkAnswer);
        }
    }
    
    function renderTextAnswers(el, answerType, answers, participants, questionId, onMarkAnswer) {
        const answersList = document.createElement('div');
        answersList.id = `answers-list-${questionId}`;
        
        // Avatar utilities are now in avatar-utils.js (getAvatarEmoji function)
        
        // Show ALL participants, even if they haven't submitted yet
        const allParticipantIds = Object.keys(participants || {});
        
        // Debug: Log participant IDs
        console.log(`[DEBUG renderTextAnswers] Participant IDs for question ${questionId}:`, allParticipantIds);
        console.log(`[DEBUG renderTextAnswers] Participants object:`, participants);
        
        allParticipantIds.forEach((participantId) => {
            const answerData = answers[participantId]; // May be undefined if not submitted yet
            const participant = participants[participantId] || {};
            const answerRow = document.createElement('div');
            answerRow.className = 'answer-row';
            answerRow.id = `answer-${participantId}-${questionId}`;
            answerRow.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;';
            
            const avatar = document.createElement('div');
            const avatarEmoji = getAvatarEmoji(participant.avatar);
            avatar.textContent = avatarEmoji;
            avatar.style.cssText = 'font-size: 1.5rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;';
            answerRow.appendChild(avatar);
            
            const info = document.createElement('div');
            info.style.cssText = 'flex: 1; min-width: 0;';
            
            const name = document.createElement('div');
            name.style.cssText = 'font-weight: 500; font-size: 0.95rem; margin-bottom: 0.25rem;';
            name.textContent = participant.name || 'Unknown';
            info.appendChild(name);
            
            // Show submission time only if answer was submitted
            if (answerData && answerData.submission_time !== undefined) {
                const time = document.createElement('div');
                time.style.cssText = 'color: #666; font-size: 0.85rem; margin-bottom: 0.25rem;';
                time.textContent = `Submitted: ${typeof answerData.submission_time === 'number' ? answerData.submission_time.toFixed(2) : answerData.submission_time}s`;
                info.appendChild(time);
            } else {
                const waiting = document.createElement('div');
                waiting.style.cssText = 'color: #999; font-size: 0.85rem; font-style: italic; margin-bottom: 0.25rem;';
                waiting.textContent = 'Waiting for answer...';
                info.appendChild(waiting);
            }
            
            // Show answer content only if answer was submitted
            if (answerData && answerData.answer !== undefined) {
                const answerContent = document.createElement('div');
                answerContent.style.cssText = 'padding: 0.5rem; background: white; border: 1px solid #ddd; border-radius: 4px; margin-top: 0.25rem;';
                if (answerType === 'checkbox' && Array.isArray(answerData.answer)) {
                    answerContent.textContent = answerData.answer.join(', ');
                } else if (answerType === 'stopwatch') {
                    const seconds = Math.floor(answerData.answer / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    answerContent.textContent = `${minutes}:${secs.toString().padStart(2, '0')} (${answerData.answer / 1000}s)`;
                } else {
                    answerContent.textContent = String(answerData.answer || '');
                }
                info.appendChild(answerContent);
            }
            
            answerRow.appendChild(info);
            
            const correctCheck = document.createElement('input');
            correctCheck.type = 'checkbox';
            correctCheck.className = 'correct-checkbox';
            correctCheck.dataset.participantId = participantId;
            correctCheck.dataset.questionId = questionId;
            correctCheck.checked = (answerData && answerData.correct) || false;
            correctCheck.disabled = !answerData; // Disable if no answer submitted yet
            correctCheck.style.cssText = 'cursor: pointer;';
            if (!answerData) {
                correctCheck.style.opacity = '0.5';
            }
            answerRow.appendChild(correctCheck);
            
            const correctLabel = document.createElement('label');
            correctLabel.textContent = 'Correct';
            correctLabel.style.cssText = 'font-size: 0.85rem; cursor: pointer;';
            correctLabel.htmlFor = correctCheck.id = `correct-${participantId}-${questionId}`;
            answerRow.appendChild(correctLabel);
            
            const bonusInput = document.createElement('input');
            bonusInput.type = 'number';
            bonusInput.className = 'bonus-points-input';
            bonusInput.dataset.participantId = participantId;
            bonusInput.dataset.questionId = questionId;
            bonusInput.placeholder = 'Bonus';
            bonusInput.min = '0';
            bonusInput.value = (answerData && answerData.bonus_points) || 0;
            bonusInput.disabled = !answerData; // Disable if no answer submitted yet
            bonusInput.style.cssText = 'width: 70px; padding: 0.25rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem;';
            if (!answerData) {
                bonusInput.style.opacity = '0.5';
            }
            answerRow.appendChild(bonusInput);
            
            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.className = 'save-answer-btn';
            saveBtn.dataset.participantId = participantId;
            saveBtn.dataset.questionId = questionId;
            saveBtn.style.cssText = 'padding: 0.25rem 0.5rem; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;';
            if (onMarkAnswer) {
                saveBtn.onclick = () => {
                    onMarkAnswer(participantId, questionId, correctCheck.checked, parseInt(bonusInput.value) || 0);
                };
            }
            answerRow.appendChild(saveBtn);
            
            answersList.appendChild(answerRow);
        });
        
        // Only show "no answers" message if there are no participants at all
        if (allParticipantIds.length === 0) {
            const noAnswers = document.createElement('div');
            noAnswers.style.cssText = 'color: #666; font-style: italic; padding: 1rem; text-align: center;';
            noAnswers.textContent = 'No participants yet';
            answersList.appendChild(noAnswers);
        }
        
        el.appendChild(answersList);
    }
    
    function renderImageClickAnswers(el, element, answers, participants, questionId, onMarkAnswer, options) {
        // Get image source from parent question
        const imageSrc = options.imageSrc || '';
        
        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = 'position: relative; margin-bottom: 1rem; border: 2px solid #ddd; border-radius: 4px; overflow: visible; background: #f0f0f0; min-height: 200px; display: flex; justify-content: center; align-items: flex-start;';
        
        if (imageSrc) {
            // Create wrapper that will match image dimensions
            const imageWrapper = document.createElement('div');
            imageWrapper.style.cssText = 'position: relative; display: inline-block; max-width: 100%;';
            imageWrapper.id = `image-wrapper-${questionId}`;
            
            const img = document.createElement('img');
            img.src = imageSrc.startsWith('/') || imageSrc.startsWith('http') ? imageSrc : '/api/media/serve/' + imageSrc;
            img.style.cssText = 'width: 100%; height: auto; display: block; max-height: 400px; object-fit: contain;';
            img.id = `image-click-display-${questionId}`;
            
            // Add highlighted circles for each participant's click after image loads
            // We need to wait for image to load to get accurate dimensions
            const colors = ['#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFF00'];
            const participantIndexMap = {}; // Map participant IDs to their color index
            const allParticipantIds = Object.keys(participants || {});
            allParticipantIds.forEach((pid, idx) => {
                participantIndexMap[pid] = idx;
            });
            
            const updateHighlights = () => {
                // Remove any existing highlights
                const existingHighlights = imageWrapper.querySelectorAll('.click-highlight');
                existingHighlights.forEach(h => h.remove());
                
                // Get image dimensions
                const rect = img.getBoundingClientRect();
                const imgWidth = rect.width;
                const imgHeight = rect.height;
                const minDim = Math.min(imgWidth, imgHeight);
                const radiusPx = minDim * 0.1; // 10% of minimum dimension (matches participant view)
                
                // Add highlights for each submitted answer
                Object.entries(answers || {}).forEach(([participantId, answerData]) => {
                    if (answerData && answerData.answer && typeof answerData.answer === 'object' && answerData.answer.x !== undefined && answerData.answer.y !== undefined) {
                        const highlight = document.createElement('div');
                        highlight.className = 'click-highlight';
                        const colorIndex = participantIndexMap[participantId] !== undefined ? participantIndexMap[participantId] : 0;
                        const color = colors[colorIndex % colors.length];
                        
                        // Calculate position: x and y are percentages (0-100), position relative to image wrapper
                        const leftPercent = answerData.answer.x;
                        const topPercent = answerData.answer.y;
                        
                        // Convert hex color to rgba for background
                        const r = parseInt(color.slice(1,3), 16);
                        const g = parseInt(color.slice(3,5), 16);
                        const b = parseInt(color.slice(5,7), 16);
                        
                        highlight.style.cssText = `position: absolute; width: ${radiusPx * 2}px; height: ${radiusPx * 2}px; border-radius: 50%; border: 3px solid ${color}; background: rgba(${r}, ${g}, ${b}, 0.2); left: ${leftPercent}%; top: ${topPercent}%; transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 0 8px ${color}80;`;
                        highlight.dataset.participantId = participantId;
                        imageWrapper.appendChild(highlight);
                    }
                });
            };
            
            img.onload = updateHighlights;
            
            // Handle window resize to update highlight positions
            // Use a debounced resize handler
            let resizeTimeout;
            const resizeHandler = () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(updateHighlights, 100);
            };
            
            // Store resize handler reference on the wrapper so we can clean it up if needed
            imageWrapper._resizeHandler = resizeHandler;
            window.addEventListener('resize', resizeHandler);
            
            imageWrapper.appendChild(img);
            imageContainer.appendChild(imageWrapper);
            
            // If image already loaded, trigger onload manually
            if (img.complete) {
                img.onload();
            }
        } else {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = 'width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;';
            placeholder.textContent = 'Image preview';
            imageContainer.appendChild(placeholder);
        }
        
        el.appendChild(imageContainer);
        
        // Legend with participant names and marking controls
        const legend = document.createElement('div');
        legend.id = `answers-list-${questionId}`;
        legend.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';
        
        const colors = ['#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFF00'];
        // Show ALL participants, even if they haven't submitted yet
        const allParticipantIds = Object.keys(participants || {});
        
        // Debug: Log participant IDs
        console.log(`[DEBUG renderImageClickAnswers] Participant IDs for question ${questionId}:`, allParticipantIds);
        console.log(`[DEBUG renderImageClickAnswers] Participants object:`, participants);
        
        allParticipantIds.forEach((participantId, index) => {
            const answerData = answers[participantId]; // May be undefined if not submitted yet
            const participant = participants[participantId] || {};
            const color = colors[index % colors.length];
            
            const legendRow = document.createElement('div');
            legendRow.className = 'answer-row';
            legendRow.id = `answer-${participantId}-${questionId}`;
            legendRow.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: #f5f5f5; border-radius: 4px;';
            
            const colorDot = document.createElement('div');
            colorDot.style.cssText = `width: 24px; height: 24px; border-radius: 50%; background: ${color}; border: 2px solid ${color}; flex-shrink: 0;`;
            legendRow.appendChild(colorDot);
            
            const nameLabel = document.createElement('div');
            nameLabel.style.cssText = 'min-width: 120px; font-weight: 500; font-size: 0.95rem;';
            nameLabel.textContent = participant.name || 'Unknown';
            legendRow.appendChild(nameLabel);
            
            const answerInfo = document.createElement('div');
            answerInfo.style.cssText = 'flex: 1; font-size: 0.85rem; color: #666;';
            if (answerData && answerData.answer && typeof answerData.answer === 'object') {
                answerInfo.textContent = `(${answerData.answer.x.toFixed(1)}%, ${answerData.answer.y.toFixed(1)}%)`;
            } else {
                answerInfo.textContent = 'Waiting for click...';
                answerInfo.style.fontStyle = 'italic';
                answerInfo.style.color = '#999';
            }
            legendRow.appendChild(answerInfo);
            
            const correctCheck = document.createElement('input');
            correctCheck.type = 'checkbox';
            correctCheck.className = 'correct-checkbox';
            correctCheck.dataset.participantId = participantId;
            correctCheck.dataset.questionId = questionId;
            correctCheck.checked = (answerData && answerData.correct) || false;
            correctCheck.disabled = !answerData; // Disable if no answer submitted yet
            correctCheck.style.cssText = 'cursor: pointer;';
            if (!answerData) {
                correctCheck.style.opacity = '0.5';
            }
            legendRow.appendChild(correctCheck);
            
            const correctLabel = document.createElement('label');
            correctLabel.textContent = 'Correct';
            correctLabel.style.cssText = 'font-size: 0.85rem; cursor: pointer;';
            correctLabel.htmlFor = correctCheck.id = `correct-${participantId}-${questionId}`;
            legendRow.appendChild(correctLabel);
            
            const bonusInput = document.createElement('input');
            bonusInput.type = 'number';
            bonusInput.className = 'bonus-points-input';
            bonusInput.dataset.participantId = participantId;
            bonusInput.dataset.questionId = questionId;
            bonusInput.placeholder = '0';
            bonusInput.min = '0';
            bonusInput.value = (answerData && answerData.bonus_points) || 0;
            bonusInput.disabled = !answerData; // Disable if no answer submitted yet
            if (!answerData) {
                bonusInput.style.opacity = '0.5';
            }
            bonusInput.style.cssText = 'width: 70px; padding: 0.25rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem;';
            legendRow.appendChild(bonusInput);
            
            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.className = 'save-answer-btn';
            saveBtn.dataset.participantId = participantId;
            saveBtn.dataset.questionId = questionId;
            saveBtn.style.cssText = 'padding: 0.25rem 0.5rem; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;';
            if (onMarkAnswer) {
                saveBtn.onclick = () => {
                    onMarkAnswer(participantId, questionId, correctCheck.checked, parseInt(bonusInput.value) || 0);
                };
            }
            legendRow.appendChild(saveBtn);
            
            legend.appendChild(legendRow);
        });
        
        if (Object.keys(answers).length === 0) {
            const noAnswers = document.createElement('div');
            noAnswers.style.cssText = 'color: #666; font-style: italic; padding: 1rem; text-align: center;';
            noAnswers.textContent = 'No answers submitted yet';
            legend.appendChild(noAnswers);
        }
        
        el.appendChild(legend);
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
        
        // Initialize appearance_order if it doesn't exist
        if (!page.appearance_order) {
            const displayElements = page.elements.filter(el => 
                (!el.view || el.view === 'display') && 
                el.type !== 'navigation_control' && 
                el.type !== 'audio_control' && 
                el.type !== 'answer_input' && 
                el.type !== 'answer_display'
            );
            page.appearance_order = displayElements.map(el => el.id);
        }
        
        // Get elements in appearance order
        const orderedElements = (page.appearance_order || [])
            .map(id => page.elements.find(el => el.id === id))
            .filter(el => el && (!el.view || el.view === 'display') && 
                    el.type !== 'navigation_control' && 
                    el.type !== 'audio_control' && 
                    el.type !== 'answer_input' && 
                    el.type !== 'answer_display');
        
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
        
        orderedElements.forEach(element => {
            const appearanceMode = element.appearance_mode || 'on_load';
            const isControlMode = appearanceMode === 'control';
            
            // Only show control mode elements
            if (isControlMode) {
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
                
                // Initialize toggle state
                const initialVisible = element.appearance_visible || false;
                updateToggleState(initialVisible);
                
                // Function to check if element is visible on display screen
                const checkElementVisibility = () => {
                    // Try to find the element on the display screen
                    // We'll use a polling approach or listen to events
                    // For now, we'll check the element's appearance_visible property
                    // and also listen to socket events
                    return element.appearance_visible || false;
                };
                
                // Click handler
                toggleContainer.onclick = (e) => {
                    e.stopPropagation();
                    const currentState = element.appearance_visible || false;
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
            }
        });
        
        if (controlsList.children.length === 0) {
            const noControls = document.createElement('p');
            noControls.style.cssText = 'color: #666; font-style: italic; font-size: 0.9rem; padding: 0.5rem;';
            noControls.textContent = 'No elements with control mode';
            controlsList.appendChild(noControls);
        }
        
        el.appendChild(controlsList);
    }
    
    return {
        renderElement: renderElement
    };
})();
