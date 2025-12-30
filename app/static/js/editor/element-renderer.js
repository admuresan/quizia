// Element rendering module - handles rendering different element types on canvas
var Editor = Editor || {};

Editor.ElementRenderer = (function() {
    let selectElementCallback = null;
    let getCurrentQuizCallback = null;
    let getCurrentPageIndexCallback = null;
    let getCurrentViewCallback = null;

    function init(selectElementCb, getCurrentQuizCb, getCurrentPageIndexCb, getCurrentViewCb) {
        selectElementCallback = selectElementCb;
        getCurrentQuizCallback = getCurrentQuizCb;
        getCurrentPageIndexCallback = getCurrentPageIndexCb;
        getCurrentViewCallback = getCurrentViewCb;
    }

    function renderMediaElement(el, element) {
        if (element.media_type === 'image' || (!element.media_type && element.type === 'image')) {
            const img = document.createElement('img');
            img.src = element.src || '/api/media/serve/' + (element.filename || '');
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            el.appendChild(img);
        } else if (element.media_type === 'video' || (!element.media_type && element.type === 'video')) {
            // Show play icon initially
            const playIcon = document.createElement('div');
            playIcon.className = 'video-play-icon';
            playIcon.innerHTML = '▶';
            playIcon.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; color: white; cursor: pointer; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); z-index: 10;';
            playIcon.addEventListener('click', () => {
                const video = document.createElement('video');
                video.src = element.src || '/api/media/serve/' + (element.filename || '');
                video.controls = true;
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'contain';
                el.innerHTML = '';
                el.appendChild(video);
                video.play();
            });
            el.appendChild(playIcon);
        } else if (element.media_type === 'audio' || (!element.media_type && element.type === 'audio')) {
            // Show speaker icon as the visual representation
            const speakerIcon = document.createElement('div');
            speakerIcon.className = 'audio-speaker-icon';
            speakerIcon.innerHTML = '🔊';
            speakerIcon.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 64px;';
            el.appendChild(speakerIcon);
        }
    }

    function renderElementOnCanvas(canvas, element, insideContainer = false) {
        const el = document.createElement('div');
        el.className = 'canvas-element';
        el.id = `element-${element.id}`;
        // Add data attribute for element type to help with CSS targeting and debugging
        if (element.type) {
            el.setAttribute('data-type', element.type);
        }
        
        // If inside a container, don't set absolute positioning
        if (!insideContainer) {
            // CRITICAL: Use absolute pixel values from top-left corner of canvas (0,0 = top-left)
            // For answer_display elements, these coordinates come from answer_display_config
            // and must be respected exactly to match runtime positioning
            el.style.position = 'absolute';
            el.style.left = `${element.x}px`;
            el.style.top = `${element.y}px`;
            el.style.width = `${element.width}px`;
            el.style.height = `${element.height}px`;
            // Ensure no margin or padding that could affect positioning
            el.style.margin = '0';
            el.style.padding = '0';
        } else {
            // When inside a container, use relative positioning and full width
            el.style.position = 'relative';
            el.style.width = '100%';
            el.style.height = 'auto';
            // Don't make elements inside containers draggable - the container handles dragging
        }
        
        // Make draggable only if not inside a container
        if (!insideContainer) {
            Editor.InteractionHandlers.makeDraggable(el, element);
        }
        
        el.addEventListener('click', () => {
            if (selectElementCallback) {
                selectElementCallback(element);
            }
        });
        
        // Add right-click context menu for layering and alignment
        // For main elements (not inside containers and not child elements), add context menu
        // Also add context menu to answer_display and audio_control in control view and appearance_control for alignment
        const currentView = getCurrentViewCallback ? getCurrentViewCallback() : null;
        const isMainElement = !insideContainer && !element.parent_id && 
            element.type !== 'answer_input' && element.type !== 'answer_display' && element.type !== 'audio_control';
        const isAnswerDisplay = element.type === 'answer_display';
        const isAudioControl = element.type === 'audio_control';
        const isAppearanceControl = !insideContainer && element.type === 'appearance_control';
        
        // Add handler for main elements, appearance_control, answer_display, or audio_control
        // We'll check view and conditions at event time
        if (isMainElement || isAnswerDisplay || isAudioControl || isAppearanceControl) {
            el.addEventListener('contextmenu', (e) => {
                // Always check view at event time
                const viewAtEventTime = getCurrentViewCallback ? getCurrentViewCallback() : null;
                const isAnswerDisplayInControl = isAnswerDisplay && viewAtEventTime === 'control';
                const isAudioControlInControl = isAudioControl && viewAtEventTime === 'control';
                
                // Check if we should handle this event
                const shouldHandle = isMainElement || isAppearanceControl || isAnswerDisplayInControl || isAudioControlInControl;
                
                if (!shouldHandle) {
                    return; // Don't handle, let browser show default menu
                }
                
                // For answer_display and audio_control in control view, check if clicking on interactive elements
                if (isAnswerDisplayInControl || isAudioControlInControl) {
                    const target = e.target;
                    // If clicking directly on an interactive element (not the container), let browser handle it
                    if (target !== el && target !== document && 
                        (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || 
                        target.tagName === 'LABEL' || target.tagName === 'SELECT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.closest('button') || target.closest('input') || 
                        target.closest('label') || target.closest('select'))) {
                        return; // Let browser handle interactive elements - don't prevent default
                    }
                }
                
                // Prevent default and show custom menu
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                if (Editor.ContextMenu && Editor.ContextMenu.show) {
                    // Use global function to show context menu (set up in editor.js)
                    if (typeof window.showElementContextMenu === 'function') {
                        window.showElementContextMenu(e, element);
                    }
                }
            }, true); // Use capture phase to ensure we catch it early
        }

        // Render content based on type
        switch (element.type) {
            case 'image':
                const img = document.createElement('img');
                img.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : 'placeholder.png');
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                el.appendChild(img);
                el.style.border = 'none';
                break;
            case 'video':
                const video = document.createElement('video');
                video.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : '');
                video.controls = true;
                video.style.width = '100%';
                video.style.height = '100%';
                el.appendChild(video);
                el.style.border = 'none';
                break;
            case 'audio':
                const audioIcon = document.createElement('div');
                audioIcon.innerHTML = '🔊';
                audioIcon.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 64px;';
                el.appendChild(audioIcon);
                el.style.border = 'none';
                break;
            case 'rectangle':
                el.style.backgroundColor = element.fill_color || '#ddd';
                el.style.border = `${element.border_width || 2}px solid ${element.border_color || '#999'}`;
                break;
            case 'circle':
                el.style.borderRadius = '50%';
                el.style.backgroundColor = element.fill_color || '#ddd';
                el.style.border = `${element.border_width || 2}px solid ${element.border_color || '#999'}`;
                break;
            case 'triangle':
                const triangleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                triangleSvg.setAttribute('width', '100%');
                triangleSvg.setAttribute('height', '100%');
                triangleSvg.setAttribute('viewBox', `0 0 ${element.width} ${element.height}`);
                const trianglePath = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                trianglePath.setAttribute('points', `${element.width/2},0 ${element.width},${element.height} 0,${element.height}`);
                trianglePath.setAttribute('fill', element.fill_color || '#ddd');
                trianglePath.setAttribute('stroke', element.border_color || '#999');
                trianglePath.setAttribute('stroke-width', element.border_width || 2);
                triangleSvg.appendChild(trianglePath);
                el.appendChild(triangleSvg);
                el.style.border = 'none';
                break;
            case 'arrow':
                const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                arrowSvg.setAttribute('width', '100%');
                arrowSvg.setAttribute('height', '100%');
                arrowSvg.setAttribute('viewBox', `0 0 ${element.width} ${element.height}`);
                
                const arrowHeadLength = element.arrow_head_length || Math.min(element.width, element.height) * 0.3;
                const arrowBodyThickness = element.arrow_body_thickness || Math.min(element.width, element.height) * 0.2;
                const arrowBodyWidth = element.width - arrowHeadLength;
                const bodyTop = (element.height - arrowBodyThickness) / 2;
                const bodyBottom = bodyTop + arrowBodyThickness;
                
                const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                arrowPath.setAttribute('d', `M 0 ${bodyTop} L ${arrowBodyWidth} ${bodyTop} L ${arrowBodyWidth} 0 L ${element.width} ${element.height/2} L ${arrowBodyWidth} ${element.height} L ${arrowBodyWidth} ${bodyBottom} L 0 ${bodyBottom} Z`);
                arrowPath.setAttribute('fill', element.fill_color || '#ddd');
                arrowPath.setAttribute('stroke', element.border_color || '#999');
                arrowPath.setAttribute('stroke-width', element.border_width || 2);
                arrowSvg.appendChild(arrowPath);
                el.appendChild(arrowSvg);
                el.style.border = 'none';
                break;
            case 'line':
                el.style.width = `${Math.max(element.width, element.height)}px`;
                el.style.height = `${element.border_width || 2}px`;
                el.style.backgroundColor = element.fill_color || element.border_color || '#999';
                el.style.border = 'none';
                el.style.transformOrigin = '0 0';
                el.style.transform = `rotate(${element.rotation || 0}deg)`;
                break;
            case 'media':
                renderMediaElement(el, element);
                el.style.border = 'none';
                break;
            case 'audio_control':
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
                filenameLabel.style.marginBottom = '0.25rem';
                filenameLabel.style.color = '#333';
                el.appendChild(filenameLabel);
                
                const controlsContainer = document.createElement('div');
                controlsContainer.style.display = 'flex';
                controlsContainer.style.gap = '0.5rem';
                controlsContainer.style.alignItems = 'center';
                
                const playBtn = document.createElement('button');
                playBtn.textContent = '▶ Play';
                playBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;';
                playBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (element.media_type === 'video') {
                        const video = document.getElementById(`video-control-${element.id}`);
                        if (video) video.play();
                    } else {
                        const audio = document.getElementById(`audio-control-${element.id}`);
                        if (audio) audio.play();
                    }
                };
                
                const pauseBtn = document.createElement('button');
                pauseBtn.textContent = '⏸ Pause';
                pauseBtn.style.cssText = 'padding: 0.5rem 1rem; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;';
                pauseBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (element.media_type === 'video') {
                        const video = document.getElementById(`video-control-${element.id}`);
                        if (video) video.pause();
                    } else {
                        const audio = document.getElementById(`audio-control-${element.id}`);
                        if (audio) audio.pause();
                    }
                };
                
                controlsContainer.appendChild(playBtn);
                controlsContainer.appendChild(pauseBtn);
                el.appendChild(controlsContainer);
                
                if (element.media_type === 'video') {
                    const videoControl = document.createElement('video');
                    videoControl.style.display = 'none';
                    videoControl.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : '');
                    videoControl.id = `video-control-${element.id}`;
                    el.appendChild(videoControl);
                } else {
                    const audioControl = document.createElement('audio');
                    audioControl.style.display = 'none';
                    audioControl.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : '');
                    audioControl.id = `audio-control-${element.id}`;
                    el.appendChild(audioControl);
                }
                break;
            case 'navigation_control':
                el.style.backgroundColor = '#2196F3';
                el.style.border = '2px solid #1976D2';
                el.style.borderRadius = '4px';
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.style.cursor = 'pointer';
                el.style.color = 'white';
                el.style.fontWeight = 'bold';
                el.style.fontSize = '1rem';
                
                if (element.button_type === 'next') {
                    el.textContent = 'Next →';
                } else if (element.button_type === 'prev') {
                    el.textContent = '← Previous';
                }
                
                el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (selectElementCallback) {
                        selectElementCallback(element);
                    }
                });
                break;
            case 'answer_input': {
                // Match control view styling: white background with blue border
                el.style.backgroundColor = 'white';
                el.style.border = '2px solid #2196F3';
                el.style.borderRadius = '8px';
                el.style.display = 'flex';
                el.style.flexDirection = 'column';
                el.style.padding = '1rem';
                el.style.overflow = 'hidden';
                el.style.boxSizing = 'border-box';
                el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                
                const quizForInput = getCurrentQuizCallback ? getCurrentQuizCallback() : null;
                const pageIndexForInput = getCurrentPageIndexCallback ? getCurrentPageIndexCallback() : 0;
                const pageForInput = quizForInput && quizForInput.pages ? quizForInput.pages[pageIndexForInput] : null;
                // elements is an object (dictionary) - access directly by ID
                let parentQuestionForInput = null;
                if (pageForInput && pageForInput.elements && typeof pageForInput.elements === 'object' && !Array.isArray(pageForInput.elements)) {
                    parentQuestionForInput = pageForInput.elements[element.parent_id] || null;
                }
                // Get question_type from question_config or fallback to old answer_type
                const parentQuestionType = parentQuestionForInput ? 
                    ((parentQuestionForInput.question_config && parentQuestionForInput.question_config.question_type) || parentQuestionForInput.answer_type) : null;
                const answerType = (element.question_config && element.question_config.question_type) || element.answer_type || parentQuestionType || 'text';
                const options = element.options || (parentQuestionForInput && parentQuestionForInput.question_config ? parentQuestionForInput.question_config.options : []);
                
                // Get question title from question element (new format: in question_config)
                const questionTitle = parentQuestionForInput && parentQuestionForInput.question_config ? (parentQuestionForInput.question_config.question_title || '') : '';
                
                el.innerHTML = '';
                
                // Title header at top (matching control view aesthetic)
                if (questionTitle) {
                    const titleHeader = document.createElement('div');
                    titleHeader.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #2196F3; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3; flex-shrink: 0; margin-bottom: 0.5rem;';
                    titleHeader.textContent = questionTitle;
                    el.appendChild(titleHeader);
                }
                
                // Content area (scrollable if needed)
                const contentArea = document.createElement('div');
                contentArea.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; overflow-x: hidden;';
                
                if (answerType === 'text') {
                    const textInput = document.createElement('input');
                    textInput.type = 'text';
                    textInput.placeholder = 'Type your answer...';
                    textInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 2px solid #ddd; border-radius: 4px; font-size: 0.9rem;';
                    contentArea.appendChild(textInput);
                    
                    const submitBtn = document.createElement('button');
                    submitBtn.textContent = 'Submit';
                    submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
                    submitBtn.onclick = (e) => {
                        e.stopPropagation();
                        alert('Submit clicked (editor mode)');
                    };
                    contentArea.appendChild(submitBtn);
                } else if (answerType === 'radio') {
                    const optionsDiv = document.createElement('div');
                    optionsDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; width: 100%;';
                    
                    (options.length > 0 ? options : ['Option 1', 'Option 2', 'Option 3']).forEach((option, index) => {
                        const label = document.createElement('label');
                        label.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.25rem; word-wrap: break-word; overflow-wrap: break-word;';
                        const radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.name = `answer-${element.id}`;
                        radio.value = option;
                        radio.onclick = (e) => e.stopPropagation();
                        label.appendChild(radio);
                        label.appendChild(document.createTextNode(option));
                        optionsDiv.appendChild(label);
                    });
                    contentArea.appendChild(optionsDiv);
                    
                    const submitBtn = document.createElement('button');
                    submitBtn.textContent = 'Submit';
                    submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
                    submitBtn.onclick = (e) => {
                        e.stopPropagation();
                        alert('Submit clicked (editor mode)');
                    };
                    contentArea.appendChild(submitBtn);
                } else if (answerType === 'checkbox') {
                    const checkboxesDiv = document.createElement('div');
                    checkboxesDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; width: 100%;';
                    
                    (options.length > 0 ? options : ['Option 1', 'Option 2', 'Option 3']).forEach((option) => {
                        const label = document.createElement('label');
                        label.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.25rem; word-wrap: break-word; overflow-wrap: break-word;';
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.value = option;
                        checkbox.onclick = (e) => e.stopPropagation();
                        label.appendChild(checkbox);
                        label.appendChild(document.createTextNode(option));
                        checkboxesDiv.appendChild(label);
                    });
                    contentArea.appendChild(checkboxesDiv);
                    
                    const submitBtn = document.createElement('button');
                    submitBtn.textContent = 'Submit';
                    submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
                    submitBtn.onclick = (e) => {
                        e.stopPropagation();
                        alert('Submit clicked (editor mode)');
                    };
                    contentArea.appendChild(submitBtn);
                } else if (answerType === 'image' || answerType === 'image_click') {
                    let imageSrc = null;
                    if (parentQuestionForInput) {
                        // New format: image sources are in properties
                        const properties = parentQuestionForInput.properties || {};
                        imageSrc = properties.media_url || 
                                  (properties.file_name ? '/api/media/serve/' + properties.file_name : null) ||
                                  (properties.filename ? '/api/media/serve/' + properties.filename : null) ||
                                  '';
                    }
                    
                    if (imageSrc) {
                        const imageContainer = document.createElement('div');
                        imageContainer.style.cssText = 'position: relative; width: 100%; display: inline-block;';
                        
                        let clickIndicator = null;
                        
                        const img = document.createElement('img');
                        img.src = imageSrc;
                        img.style.cssText = 'max-width: 100%; height: auto; display: block; cursor: crosshair; border: 2px solid #ddd; border-radius: 4px;';
                        img.onclick = (e) => {
                            e.stopPropagation();
                            const rect = img.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            
                            if (clickIndicator) {
                                clickIndicator.remove();
                            }
                            
                            clickIndicator = document.createElement('div');
                            clickIndicator.style.cssText = `position: absolute; border-radius: 50%; background: rgba(33, 150, 243, 0.3); border: 2px solid rgba(33, 150, 243, 0.8); pointer-events: none; left: ${x - 5}%; top: ${y - 5}%; width: 10%; height: 10%;`;
                            imageContainer.appendChild(clickIndicator);
                        };
                        imageContainer.appendChild(img);
                        contentArea.appendChild(imageContainer);
                    } else {
                        const placeholder = document.createElement('div');
                        placeholder.textContent = 'Image (set image source on parent question)';
                        placeholder.style.cssText = 'padding: 2rem; text-align: center; border: 2px dashed #ddd; border-radius: 4px; color: #666;';
                        contentArea.appendChild(placeholder);
                    }
                    
                    const submitBtn = document.createElement('button');
                    submitBtn.textContent = 'Submit';
                    submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500; margin-top: 0.5rem;';
                    submitBtn.onclick = (e) => {
                        e.stopPropagation();
                        alert('Submit clicked (editor mode)');
                    };
                    contentArea.appendChild(submitBtn);
                } else if (answerType === 'stopwatch') {
                    const stopwatchContainer = document.createElement('div');
                    stopwatchContainer.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; width: 100%; align-items: center;';
                    
                    const timerDisplay = document.createElement('div');
                    timerDisplay.textContent = '0:00';
                    timerDisplay.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #333; display: none;';
                    stopwatchContainer.appendChild(timerDisplay);
                    
                    const controlsDiv = document.createElement('div');
                    controlsDiv.style.cssText = 'display: flex; gap: 0.5rem;';
                    
                    let startTime = null;
                    let intervalId = null;
                    let elapsedTime = 0;
                    
                    const startBtn = document.createElement('button');
                    startBtn.textContent = 'Start';
                    startBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
                    startBtn.onclick = (e) => {
                        e.stopPropagation();
                        startTime = Date.now();
                        startBtn.disabled = true;
                        startBtn.style.opacity = '0.5';
                        stopBtn.disabled = false;
                        stopBtn.style.opacity = '1';
                        timerDisplay.style.display = 'none';
                        
                        intervalId = setInterval(() => {
                            elapsedTime = Date.now() - startTime;
                        }, 10);
                    };
                    
                    const stopBtn = document.createElement('button');
                    stopBtn.textContent = 'Stop';
                    stopBtn.disabled = true;
                    stopBtn.style.opacity = '0.5';
                    stopBtn.style.cssText = 'padding: 0.5rem 1rem; background: #f44336; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500;';
                    stopBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (startTime) {
                            elapsedTime = Date.now() - startTime;
                            clearInterval(intervalId);
                            
                            const seconds = Math.floor(elapsedTime / 1000);
                            const minutes = Math.floor(seconds / 60);
                            const secs = seconds % 60;
                            timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
                            timerDisplay.style.display = 'block';
                            
                            startBtn.disabled = true;
                            stopBtn.disabled = true;
                            startBtn.style.opacity = '0.5';
                            stopBtn.style.opacity = '0.5';
                        }
                    };
                    
                    controlsDiv.appendChild(startBtn);
                    controlsDiv.appendChild(stopBtn);
                    stopwatchContainer.appendChild(controlsDiv);
                    contentArea.appendChild(stopwatchContainer);
                } else {
                    contentArea.textContent = `Answer Input (${answerType})`;
                    contentArea.style.backgroundColor = '#e3f2fd';
                    contentArea.style.border = '2px dashed #2196F3';
                    contentArea.style.borderRadius = '4px';
                    contentArea.style.padding = '1rem';
                }
                
                // Append content area to element
                el.appendChild(contentArea);
                
                // Add right-click context menu for answer_input in participant view (even when inside container)
                // This allows alignment of answer elements
                const currentViewForInput = getCurrentViewCallback ? getCurrentViewCallback() : null;
                if (insideContainer && currentViewForInput === 'participant') {
                    el.addEventListener('contextmenu', (e) => {
                        // Don't show context menu if clicking on interactive elements
                        const target = e.target;
                        if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || 
                            target.tagName === 'LABEL' || target.tagName === 'SELECT' || 
                            target.tagName === 'TEXTAREA' || target.tagName === 'IMG' ||
                            target.closest('button') || target.closest('input') || 
                            target.closest('label') || target.closest('select')) {
                            return; // Let browser handle it for interactive elements
                        }
                        
                        e.preventDefault();
                        e.stopPropagation();
                        if (Editor.ContextMenu && Editor.ContextMenu.show) {
                            // Use global function to show context menu (set up in editor.js)
                            if (typeof window.showElementContextMenu === 'function') {
                                window.showElementContextMenu(e, element);
                            }
                        }
                    }, true); // Use capture phase to ensure we catch it early
                }
            }
            break;
            case 'appearance_control':
                // Ensure dimensions are set for appearance_control elements
                if (!insideContainer) {
                    el.style.position = 'absolute';
                    el.style.width = `${element.width}px`;
                    el.style.height = `${element.height}px`;
                    el.style.overflow = 'hidden'; // Hide overflow on outer element
                    el.style.boxSizing = 'border-box';
                } else {
                    el.style.overflowY = 'auto';
                    el.style.overflowX = 'hidden';
                    el.style.boxSizing = 'border-box';
                }
                // Use the dedicated appearance control renderer
                if (Editor && Editor.AppearanceControlRenderer && Editor.AppearanceControlRenderer.render) {
                    const quiz = getCurrentQuizCallback ? getCurrentQuizCallback() : null;
                    const pageIndex = getCurrentPageIndexCallback ? getCurrentPageIndexCallback() : 0;
                    const page = quiz && quiz.pages && quiz.pages[pageIndex] ? quiz.pages[pageIndex] : null;
                    Editor.AppearanceControlRenderer.render(el, element, {
                        getCurrentQuiz: getCurrentQuizCallback,
                        getCurrentPageIndex: getCurrentPageIndexCallback,
                        getCurrentView: getCurrentViewCallback,
                        isRuntime: false, // Editor mode - toggles are non-functional
                        quiz: quiz,
                        page: page,
                        autosaveQuiz: function() {
                            if (window.Editor && window.Editor.QuizStorage && window.Editor.QuizStorage.autosaveQuiz) {
                                window.Editor.QuizStorage.autosaveQuiz();
                            }
                        },
                        renderCanvas: function() {
                            if (window.Editor && window.Editor.CanvasRenderer && window.Editor.CanvasRenderer.renderCanvas) {
                                window.Editor.CanvasRenderer.renderCanvas();
                            }
                        }
                    });
                } else {
                    // Fallback if renderer not available
                    el.innerHTML = '<p style="padding: 1rem; color: #666;">Appearance control renderer not available</p>';
                }
                break;
            case 'answer_display':
                // Get parent question to access question title and answer type
                const quizForDisplay = getCurrentQuizCallback ? getCurrentQuizCallback() : null;
                const pageIndexForDisplay = getCurrentPageIndexCallback ? getCurrentPageIndexCallback() : 0;
                const pageForDisplay = quizForDisplay && quizForDisplay.pages ? quizForDisplay.pages[pageIndexForDisplay] : null;
                // elements is an object (dictionary) - access directly by ID
                let parentQuestion = null;
                if (pageForDisplay && pageForDisplay.elements && typeof pageForDisplay.elements === 'object' && !Array.isArray(pageForDisplay.elements)) {
                    parentQuestion = pageForDisplay.elements[element.parent_id] || null;
                }
                
                // Get question_type - prioritize question element's question_config.question_type as source of truth (matching runtime)
                // Fallback to old answer_type for backwards compatibility
                let answerType = null;
                if (parentQuestion) {
                    answerType = (parentQuestion.question_config && parentQuestion.question_config.question_type) || parentQuestion.answer_type;
                }
                if (!answerType && pageForDisplay && pageForDisplay.elements && typeof pageForDisplay.elements === 'object' && !Array.isArray(pageForDisplay.elements)) {
                    // Try to get it from the associated answer_input element
                    // elements is an object - search through values
                    const elementsArray = Object.values(pageForDisplay.elements);
                    const answerInput = elementsArray.find(el => 
                        el.type === 'answer_input' && 
                        el.parent_id === element.parent_id && 
                        el.view === 'participant'
                    );
                    if (answerInput) {
                        answerType = (answerInput.question_config && answerInput.question_config.question_type) || answerInput.answer_type;
                    }
                }
                // Last fallback to answer_display element's question_type or answer_type
                if (!answerType) {
                    answerType = (element.question_config && element.question_config.question_type) || element.answer_type;
                }
                // Default to 'text' if still not found
                if (!answerType) {
                    answerType = 'text';
                }
                
                // Normalize 'image' to 'image_click' for consistency
                if (answerType === 'image') {
                    answerType = 'image_click';
                }
                
                // Use actual question title from question element, not "Question" as fallback
                const questionTitle = parentQuestion ? (parentQuestion.question_title || (parentQuestion.question_config && parentQuestion.question_config.question_title) || '') : '';
                
                // CRITICAL: Ensure answer_display elements use absolute positioning with exact coordinates
                // This is essential to match runtime positioning and allow overlapping elements
                // Enforce the configured width and height strictly (only if not inside a container)
                if (!insideContainer) {
                    // Force absolute positioning - coordinates are absolute pixel values from top-left of canvas
                    // IMPORTANT: Set position AFTER content is rendered to ensure it's not overridden
                    // But we need to set it here first, then re-apply after content is added
                    el.style.position = 'absolute';
                    // CRITICAL: Use exact coordinates from element.x and element.y (already set in renderElementOnCanvas)
                    // These coordinates come from answer_display_config and must be respected exactly
                    el.style.left = `${element.x}px`;
                    el.style.top = `${element.y}px`;
                    el.style.width = `${element.width}px`;
                    el.style.height = `${element.height}px`;
                    el.style.minWidth = `${element.width}px`;
                    el.style.maxWidth = `${element.width}px`;
                    el.style.minHeight = `${element.height}px`;
                    el.style.maxHeight = `${element.height}px`;
                    el.style.overflow = 'hidden'; // Hide overflow on outer element - inner content handles scrolling
                    el.style.boxSizing = 'border-box';
                    // Ensure no margin or padding that could affect positioning
                    el.style.margin = '0';
                    el.style.padding = '0';
                    // Ensure elements can overlap by allowing them to have the same z-index
                    el.style.zIndex = '100';
                } else {
                    el.style.overflowY = 'auto';
                    el.style.overflowX = 'hidden';
                    el.style.boxSizing = 'border-box';
                }
                
                // Clear innerHTML - ControlView.render() will handle all styling and content
                el.innerHTML = '';
                
                // Use control_mockup files for preview (which will call ControlView.render that handles all styling)
                // Get image source from parent question (new format: in properties)
                let imageSrc = '';
                if (parentQuestion) {
                    const properties = parentQuestion.properties || {};
                    imageSrc = properties.media_url || 
                              (properties.file_name ? '/api/media/serve/' + properties.file_name : null) ||
                              (properties.filename ? '/api/media/serve/' + properties.filename : null) ||
                              '';
                }
                
                const mockOptions = {
                    questionId: element.parent_id || 'mock-question',
                    questionTitle: questionTitle,
                    imageSrc: imageSrc,
                    question: parentQuestion || null, // Pass question element for correct_answer access
                    answerType: answerType // Pass answerType for radio/checkbox correct answer display
                };
                
                // Route to appropriate control mockup renderer
                // Check image_click first (before text) to ensure it's matched correctly
                if ((answerType === 'image_click' || answerType === 'image') && QuestionTypes.ImageClick && QuestionTypes.ImageClick.ControlMockup) {
                    QuestionTypes.ImageClick.ControlMockup.render(el, mockOptions);
                } else if (answerType === 'text' && QuestionTypes.Text && QuestionTypes.Text.ControlMockup) {
                    QuestionTypes.Text.ControlMockup.render(el, mockOptions);
                } else if (answerType === 'radio' && QuestionTypes.Radio && QuestionTypes.Radio.ControlMockup) {
                    QuestionTypes.Radio.ControlMockup.render(el, mockOptions);
                } else if (answerType === 'checkbox' && QuestionTypes.Checkbox && QuestionTypes.Checkbox.ControlMockup) {
                    QuestionTypes.Checkbox.ControlMockup.render(el, mockOptions);
                } else if (answerType === 'stopwatch' && QuestionTypes.Stopwatch && QuestionTypes.Stopwatch.ControlMockup) {
                    QuestionTypes.Stopwatch.ControlMockup.render(el, mockOptions);
                } else {
                    console.warn('Control mockup not found for answer type:', answerType);
                    el.textContent = `Preview not available for ${answerType}`;
                }
                
                // CRITICAL: Re-apply absolute positioning after content is rendered
                // ControlView.render() sets position: 'relative' on the container, which breaks absolute positioning
                // We must override this to maintain the exact coordinates from answer_display_config
                if (!insideContainer) {
                    // Force absolute positioning again after content is rendered
                    el.style.position = 'absolute';
                    el.style.left = `${element.x}px`;
                    el.style.top = `${element.y}px`;
                    el.style.width = `${element.width}px`;
                    el.style.height = `${element.height}px`;
                    // Ensure the inner content container doesn't override positioning
                    const innerContainer = el.querySelector('div[style*="position"]');
                    if (innerContainer && innerContainer.style.position === 'relative') {
                        // Keep inner container as relative for its own layout, but ensure outer stays absolute
                        // The inner container should fill the outer container
                        innerContainer.style.width = '100%';
                        innerContainer.style.height = '100%';
                    }
                }
                
                // Old inline rendering code removed - now using control_mockup files
                if (false) { // Disabled - kept for reference
                if (answerType === 'text' || answerType === 'radio') {
                    // Text box or multiple choice: List of participant names with text boxes/options and marking controls
                    const mockParticipants = ['Participant 1', 'Participant 2'];
                    mockParticipants.forEach((name, idx) => {
                        const answerRow = document.createElement('div');
                        answerRow.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;';
                        
                        const nameLabel = document.createElement('div');
                        nameLabel.style.cssText = 'min-width: 100px; font-weight: 500;';
                        nameLabel.textContent = name;
                        answerRow.appendChild(nameLabel);
                        
                        const answerBox = document.createElement('div');
                        answerBox.style.cssText = 'flex: 1; padding: 0.5rem; background: white; border: 1px solid #ddd; border-radius: 4px; min-height: 30px; display: flex; align-items: center;';
                        answerBox.textContent = answerType === 'radio' ? 'Option 1' : 'Sample text answer';
                        answerRow.appendChild(answerBox);
                        
                        const correctCheck = document.createElement('input');
                        correctCheck.type = 'checkbox';
                        correctCheck.disabled = true;
                        correctCheck.style.cssText = 'cursor: not-allowed;';
                        answerRow.appendChild(correctCheck);
                        
                        const correctLabel = document.createElement('label');
                        correctLabel.textContent = 'Correct';
                        correctLabel.style.cssText = 'font-size: 0.85rem;';
                        answerRow.appendChild(correctLabel);
                        
                        const bonusInput = document.createElement('input');
                        bonusInput.type = 'number';
                        bonusInput.placeholder = 'Bonus';
                        bonusInput.value = '0';
                        bonusInput.disabled = true;
                        bonusInput.style.cssText = 'width: 70px; padding: 0.25rem; border: 1px solid #ddd; border-radius: 4px; cursor: not-allowed;';
                        answerRow.appendChild(bonusInput);
                        
                        el.appendChild(answerRow);
                    });
                } else if (answerType === 'checkbox') {
                    // Checkbox: List all chosen options with marking controls
                    const mockParticipants = ['Participant 1', 'Participant 2'];
                    mockParticipants.forEach((name) => {
                        const answerRow = document.createElement('div');
                        answerRow.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;';
                        
                        const nameLabel = document.createElement('div');
                        nameLabel.style.cssText = 'min-width: 100px; font-weight: 500;';
                        nameLabel.textContent = name;
                        answerRow.appendChild(nameLabel);
                        
                        const optionsBox = document.createElement('div');
                        optionsBox.style.cssText = 'flex: 1; padding: 0.5rem; background: white; border: 1px solid #ddd; border-radius: 4px; min-height: 30px; display: flex; align-items: center;';
                        optionsBox.textContent = 'Option 1, Option 2';
                        answerRow.appendChild(optionsBox);
                        
                        const correctCheck = document.createElement('input');
                        correctCheck.type = 'checkbox';
                        correctCheck.disabled = true;
                        correctCheck.style.cssText = 'cursor: not-allowed;';
                        answerRow.appendChild(correctCheck);
                        
                        const correctLabel = document.createElement('label');
                        correctLabel.textContent = 'Correct';
                        correctLabel.style.cssText = 'font-size: 0.85rem;';
                        answerRow.appendChild(correctLabel);
                        
                        const bonusInput = document.createElement('input');
                        bonusInput.type = 'number';
                        bonusInput.placeholder = 'Bonus';
                        bonusInput.value = '0';
                        bonusInput.disabled = true;
                        bonusInput.style.cssText = 'width: 70px; padding: 0.25rem; border: 1px solid #ddd; border-radius: 4px; cursor: not-allowed;';
                        answerRow.appendChild(bonusInput);
                        
                        el.appendChild(answerRow);
                    });
                } else if (answerType === 'stopwatch') {
                    // Timer: Show submitted times in a list with marking controls
                    const mockParticipants = [
                        { name: 'Participant 1', time: '12.34' },
                        { name: 'Participant 2', time: '15.67' }
                    ];
                    mockParticipants.forEach((participant) => {
                        const answerRow = document.createElement('div');
                        answerRow.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;';
                        
                        const nameLabel = document.createElement('div');
                        nameLabel.style.cssText = 'min-width: 100px; font-weight: 500;';
                        nameLabel.textContent = participant.name;
                        answerRow.appendChild(nameLabel);
                        
                        const timeBox = document.createElement('div');
                        timeBox.style.cssText = 'flex: 1; padding: 0.5rem; background: white; border: 1px solid #ddd; border-radius: 4px; min-height: 30px; display: flex; align-items: center; font-weight: 500;';
                        timeBox.textContent = `${participant.time} seconds`;
                        answerRow.appendChild(timeBox);
                        
                        const correctCheck = document.createElement('input');
                        correctCheck.type = 'checkbox';
                        correctCheck.disabled = true;
                        correctCheck.style.cssText = 'cursor: not-allowed;';
                        answerRow.appendChild(correctCheck);
                        
                        const correctLabel = document.createElement('label');
                        correctLabel.textContent = 'Correct';
                        correctLabel.style.cssText = 'font-size: 0.85rem;';
                        answerRow.appendChild(correctLabel);
                        
                        const bonusInput = document.createElement('input');
                        bonusInput.type = 'number';
                        bonusInput.placeholder = 'Bonus';
                        bonusInput.value = '0';
                        bonusInput.disabled = true;
                        bonusInput.style.cssText = 'width: 70px; padding: 0.25rem; border: 1px solid #ddd; border-radius: 4px; cursor: not-allowed;';
                        answerRow.appendChild(bonusInput);
                        
                        el.appendChild(answerRow);
                    });
                } else if (answerType === 'image_click') {
                    // Image click: Show image with highlighted areas (different colors per participant) and legend
                    const imageContainer = document.createElement('div');
                    imageContainer.style.cssText = 'position: relative; margin-bottom: 1.5rem; border: 2px solid #ddd; border-radius: 4px; overflow: visible; background: #f0f0f0; min-height: 200px; display: flex; justify-content: center; align-items: flex-start; padding: 0.5rem;';
                    
                    // Get image from parent question element
                    let imageSrc = null;
                    if (parentQuestion) {
                        imageSrc = parentQuestion.src || 
                                  (parentQuestion.filename ? '/api/media/serve/' + parentQuestion.filename : null) ||
                                  parentQuestion.image_src;
                        
                        if (!imageSrc && parentQuestion.type === 'image') {
                            imageSrc = parentQuestion.src || (parentQuestion.filename ? '/api/media/serve/' + parentQuestion.filename : null);
                        }
                    }
                    
                    // Define mock participants with their colors and click positions
                    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFF00'];
                    const mockParticipantsData = [
                        { name: 'Participant 1', color: colors[0], x: 30, y: 40 },
                        { name: 'Participant 2', color: colors[1], x: 60, y: 50 }
                    ];
                    
                    // Create wrapper for image and highlights
                    if (imageSrc) {
                        const imageWrapper = document.createElement('div');
                        imageWrapper.style.cssText = 'position: relative; display: inline-block; max-width: 100%;';
                        
                        const img = document.createElement('img');
                        img.src = imageSrc.startsWith('/') || imageSrc.startsWith('http') ? imageSrc : '/api/media/serve/' + imageSrc;
                        img.style.cssText = 'width: 100%; height: auto; display: block; max-width: 800px; object-fit: contain;';
                        
                        // Add highlights after image loads (using same 10% radius as runtime)
                        img.onload = () => {
                            const rect = img.getBoundingClientRect();
                            const imgWidth = rect.width;
                            const imgHeight = rect.height;
                            const minDim = Math.min(imgWidth, imgHeight);
                            const radiusPx = minDim * 0.1; // 10% radius = 20% diameter (matches runtime)
                            
                            mockParticipantsData.forEach((participant) => {
                                const highlight = document.createElement('div');
                                const r = parseInt(participant.color.slice(1,3), 16);
                                const g = parseInt(participant.color.slice(3,5), 16);
                                const b = parseInt(participant.color.slice(5,7), 16);
                                
                                highlight.style.cssText = `position: absolute; width: ${radiusPx * 2}px; height: ${radiusPx * 2}px; border-radius: 50%; border: 3px solid ${participant.color}; background: rgba(${r}, ${g}, ${b}, 0.2); left: ${participant.x}%; top: ${participant.y}%; transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 0 8px ${participant.color}80;`;
                                imageWrapper.appendChild(highlight);
                            });
                        };
                        
                        img.onerror = () => {
                            const placeholder = document.createElement('div');
                            placeholder.style.cssText = 'width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;';
                            placeholder.textContent = 'Image preview';
                            imageWrapper.innerHTML = '';
                            imageWrapper.appendChild(placeholder);
                        };
                        
                        imageWrapper.appendChild(img);
                        imageContainer.appendChild(imageWrapper);
                        
                        // Trigger onload if image already loaded
                        if (img.complete) {
                            img.onload();
                        }
                    } else {
                        const placeholder = document.createElement('div');
                        placeholder.style.cssText = 'width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;';
                        placeholder.textContent = 'Image preview (set image source on parent question)';
                        imageContainer.appendChild(placeholder);
                    }
                    
                    el.appendChild(imageContainer);
                    
                    // Legend at the bottom: participant names with color indicators, Correct checkbox, and Bonus points
                    const legend = document.createElement('div');
                    legend.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem;';
                    
                    const legendHeader = document.createElement('div');
                    legendHeader.style.cssText = 'font-weight: bold; font-size: 1rem; color: #333; padding-bottom: 0.5rem; border-bottom: 1px solid #ddd;';
                    legendHeader.textContent = 'Participants';
                    legend.appendChild(legendHeader);
                    
                    mockParticipantsData.forEach((participant) => {
                        const legendRow = document.createElement('div');
                        legendRow.style.cssText = 'display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: #f5f5f5; border-radius: 4px;';
                        
                        // Color indicator dot/circle
                        const colorDot = document.createElement('div');
                        colorDot.style.cssText = `width: 24px; height: 24px; border-radius: 50%; background: ${participant.color}; border: 2px solid ${participant.color}; flex-shrink: 0; box-shadow: 0 0 4px ${participant.color}80;`;
                        legendRow.appendChild(colorDot);
                        
                        // Participant name
                        const nameLabel = document.createElement('div');
                        nameLabel.style.cssText = 'min-width: 150px; font-weight: 500; font-size: 0.95rem; color: #333;';
                        nameLabel.textContent = participant.name;
                        legendRow.appendChild(nameLabel);
                        
                        // Coordinates display
                        const coordInfo = document.createElement('div');
                        coordInfo.style.cssText = 'flex: 1; font-size: 0.85rem; color: #666;';
                        coordInfo.textContent = `(${participant.x.toFixed(1)}%, ${participant.y.toFixed(1)}%)`;
                        legendRow.appendChild(coordInfo);
                        
                        // Marking controls
                        const markingControls = document.createElement('div');
                        markingControls.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
                        
                        // Correct checkbox
                        const correctCheck = document.createElement('input');
                        correctCheck.type = 'checkbox';
                        correctCheck.disabled = true;
                        correctCheck.style.cssText = 'cursor: not-allowed; width: 18px; height: 18px;';
                        markingControls.appendChild(correctCheck);
                        
                        const correctLabel = document.createElement('label');
                        correctLabel.textContent = 'Correct';
                        correctLabel.style.cssText = 'font-size: 0.9rem; cursor: not-allowed; color: #333;';
                        correctLabel.htmlFor = correctCheck.id = `correct-${participant.name.replace(/\s+/g, '-')}`;
                        markingControls.appendChild(correctLabel);
                        
                        // Bonus points input
                        const bonusLabel = document.createElement('label');
                        bonusLabel.textContent = 'Bonus:';
                        bonusLabel.style.cssText = 'font-size: 0.9rem; color: #333;';
                        markingControls.appendChild(bonusLabel);
                        
                        const bonusInput = document.createElement('input');
                        bonusInput.type = 'number';
                        bonusInput.placeholder = '0';
                        bonusInput.min = '0';
                        bonusInput.value = '0';
                        bonusInput.disabled = true;
                        bonusInput.style.cssText = 'width: 70px; padding: 0.35rem; border: 1px solid #ddd; border-radius: 4px; cursor: not-allowed; font-size: 0.85rem;';
                        markingControls.appendChild(bonusInput);
                        
                        // Save button (disabled in editor)
                        const saveBtn = document.createElement('button');
                        saveBtn.textContent = 'Save';
                        saveBtn.disabled = true;
                        saveBtn.style.cssText = 'padding: 0.35rem 0.75rem; background: #ccc; color: #666; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.85rem; font-weight: 500;';
                        markingControls.appendChild(saveBtn);
                        
                        legendRow.appendChild(markingControls);
                        legend.appendChild(legendRow);
                    });
                    
                    el.appendChild(legend);
                } else {
                    // Default fallback
                    el.textContent = `Answer Display (${answerType})`;
                }
                } // End of if (false) block
                
                // Make answer_display elements clickable and selectable
                el.addEventListener('click', (e) => {
                    // Don't select if clicking on disabled controls inside
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'LABEL') {
                        return;
                    }
                    e.stopPropagation();
                    if (selectElementCallback) {
                        selectElementCallback(element);
                    }
                });
                break;
            case 'richtext':
                el.innerHTML = element.content || '<p>Enter your text here</p>';
                el.style.fontSize = `${element.font_size || 16}px`;
                el.style.color = element.text_color || '#000000';
                el.style.backgroundColor = element.background_color || 'transparent';
                el.style.padding = '8px';
                el.style.overflow = 'auto';
                el.style.wordWrap = 'break-word';
                el.style.border = 'none';
                el.style.textAlign = 'left';
                break;
        }

        // Apply rotation for all elements except line (which handles it internally)
        if (element.type !== 'line' && element.rotation) {
            el.style.transform = `rotate(${element.rotation}deg)`;
            el.style.transformOrigin = 'center center';
        }

        // Add resize and rotate handles for shapes
        if (['rectangle', 'circle', 'triangle', 'arrow', 'line'].includes(element.type)) {
            Editor.InteractionHandlers.addResizeHandles(el, element);
            Editor.InteractionHandlers.addRotateHandle(el, element);
        }
        
        // Add resize handles for media elements (no rotation)
        if (['image', 'video', 'audio'].includes(element.type)) {
            Editor.InteractionHandlers.addResizeHandles(el, element);
        }
        
        // Add resize handles for richtext elements
        if (element.type === 'richtext') {
            Editor.InteractionHandlers.addResizeHandles(el, element);
        }
        
        // Add resize handles for child elements (audio_control, answer_input, answer_display, appearance_control)
        // But not if inside a container (participant view question containers)
        // Note: navigation_control elements are static buttons and not editable
        if (!insideContainer && ['audio_control', 'answer_input', 'answer_display', 'appearance_control'].includes(element.type)) {
            Editor.InteractionHandlers.addResizeHandles(el, element);
        }

        // Only append to canvas if not inside a container (container will append it)
        if (!insideContainer) {
            canvas.appendChild(el);
        }
        
        // Return the element so it can be appended to a container if needed
        return el;
    }

    return {
        init: init,
        renderElementOnCanvas: renderElementOnCanvas,
        renderMediaElement: renderMediaElement
    };
})();

