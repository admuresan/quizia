// Element rendering module - handles rendering different element types on canvas
var Editor = Editor || {};

Editor.ElementRenderer = (function() {
    let selectElementCallback = null;
    let getCurrentQuizCallback = null;
    let getCurrentPageIndexCallback = null;

    function init(selectElementCb, getCurrentQuizCb, getCurrentPageIndexCb) {
        selectElementCallback = selectElementCb;
        getCurrentQuizCallback = getCurrentQuizCb;
        getCurrentPageIndexCallback = getCurrentPageIndexCb;
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
        
        // If inside a container, don't set absolute positioning
        if (!insideContainer) {
            el.style.left = `${element.x}px`;
            el.style.top = `${element.y}px`;
            el.style.width = `${element.width}px`;
            el.style.height = `${element.height}px`;
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
                el.style.backgroundColor = 'transparent';
                el.style.border = 'none';
                el.style.display = 'flex';
                el.style.flexDirection = 'column';
                el.style.gap = '0.5rem';
                el.style.padding = '0.5rem';
                el.style.overflow = 'visible';
                
                const quizForInput = getCurrentQuizCallback ? getCurrentQuizCallback() : null;
                const pageIndexForInput = getCurrentPageIndexCallback ? getCurrentPageIndexCallback() : 0;
                const pageForInput = quizForInput && quizForInput.pages ? quizForInput.pages[pageIndexForInput] : null;
                const parentQuestionForInput = pageForInput && pageForInput.elements ? pageForInput.elements.find(e => e.id === element.parent_id) : null;
                const answerType = element.answer_type || (parentQuestionForInput ? parentQuestionForInput.answer_type : 'text');
                const options = element.options || (parentQuestionForInput ? parentQuestionForInput.options : []);
                
                el.innerHTML = '';
                
                if (answerType === 'text') {
                    const textInput = document.createElement('input');
                    textInput.type = 'text';
                    textInput.placeholder = 'Type your answer...';
                    textInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 2px solid #2196F3; border-radius: 4px; font-size: 0.9rem;';
                    el.appendChild(textInput);
                    
                    const submitBtn = document.createElement('button');
                    submitBtn.textContent = 'Submit';
                    submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
                    submitBtn.onclick = (e) => {
                        e.stopPropagation();
                        alert('Submit clicked (editor mode)');
                    };
                    el.appendChild(submitBtn);
                } else if (answerType === 'radio') {
                    const optionsDiv = document.createElement('div');
                    optionsDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; width: 100%;';
                    
                    (options.length > 0 ? options : ['Option 1', 'Option 2', 'Option 3']).forEach((option, index) => {
                        const label = document.createElement('label');
                        label.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.25rem;';
                        const radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.name = `answer-${element.id}`;
                        radio.value = option;
                        radio.onclick = (e) => e.stopPropagation();
                        label.appendChild(radio);
                        label.appendChild(document.createTextNode(option));
                        optionsDiv.appendChild(label);
                    });
                    el.appendChild(optionsDiv);
                    
                    const submitBtn = document.createElement('button');
                    submitBtn.textContent = 'Submit';
                    submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
                    submitBtn.onclick = (e) => {
                        e.stopPropagation();
                        alert('Submit clicked (editor mode)');
                    };
                    el.appendChild(submitBtn);
                } else if (answerType === 'checkbox') {
                    const checkboxesDiv = document.createElement('div');
                    checkboxesDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; width: 100%;';
                    
                    (options.length > 0 ? options : ['Option 1', 'Option 2', 'Option 3']).forEach((option) => {
                        const label = document.createElement('label');
                        label.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.25rem;';
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.value = option;
                        checkbox.onclick = (e) => e.stopPropagation();
                        label.appendChild(checkbox);
                        label.appendChild(document.createTextNode(option));
                        checkboxesDiv.appendChild(label);
                    });
                    el.appendChild(checkboxesDiv);
                    
                    const submitBtn = document.createElement('button');
                    submitBtn.textContent = 'Submit';
                    submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
                    submitBtn.onclick = (e) => {
                        e.stopPropagation();
                        alert('Submit clicked (editor mode)');
                    };
                    el.appendChild(submitBtn);
                } else if (answerType === 'image' || answerType === 'image_click') {
                    let imageSrc = null;
                    if (parentQuestionForInput) {
                        imageSrc = parentQuestionForInput.src || 
                                  (parentQuestionForInput.filename ? '/api/media/serve/' + parentQuestionForInput.filename : null) ||
                                  parentQuestionForInput.image_src;
                        
                        if (!imageSrc && parentQuestionForInput.type === 'image') {
                            imageSrc = parentQuestionForInput.src || (parentQuestionForInput.filename ? '/api/media/serve/' + parentQuestionForInput.filename : null);
                        }
                    }
                    
                    if (imageSrc) {
                        const imageContainer = document.createElement('div');
                        imageContainer.style.cssText = 'position: relative; width: 100%; display: inline-block;';
                        
                        let clickIndicator = null;
                        
                        const img = document.createElement('img');
                        img.src = imageSrc;
                        img.style.cssText = 'max-width: 100%; height: auto; display: block; cursor: crosshair; border: 2px solid #2196F3; border-radius: 4px;';
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
                        el.appendChild(imageContainer);
                    } else {
                        const placeholder = document.createElement('div');
                        placeholder.textContent = 'Image (set image source on parent question)';
                        placeholder.style.cssText = 'padding: 2rem; text-align: center; border: 2px dashed #2196F3; border-radius: 4px; color: #666;';
                        el.appendChild(placeholder);
                    }
                    
                    const submitBtn = document.createElement('button');
                    submitBtn.textContent = 'Submit';
                    submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500; margin-top: 0.5rem;';
                    submitBtn.onclick = (e) => {
                        e.stopPropagation();
                        alert('Submit clicked (editor mode)');
                    };
                    el.appendChild(submitBtn);
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
                    el.appendChild(stopwatchContainer);
                } else {
                    el.textContent = `Answer Input (${answerType})`;
                    el.style.backgroundColor = '#e3f2fd';
                    el.style.border = '2px dashed #2196F3';
                    el.style.borderRadius = '4px';
                    el.style.padding = '1rem';
                }
                break;
            }
            case 'appearance_control':
                // Appearance control element - shows toggles for control mode elements
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
                
                // Get page and elements for appearance controls
                const quizForAppearance = getCurrentQuizCallback ? getCurrentQuizCallback() : null;
                const pageIndexForAppearance = getCurrentPageIndexCallback ? getCurrentPageIndexCallback() : 0;
                const pageForAppearance = quizForAppearance && quizForAppearance.pages ? quizForAppearance.pages[pageIndexForAppearance] : null;
                
                if (pageForAppearance && pageForAppearance.elements) {
                    // Initialize appearance_order if it doesn't exist
                    if (!pageForAppearance.appearance_order) {
                        const displayElements = pageForAppearance.elements.filter(el => 
                            (!el.view || el.view === 'display') && 
                            el.type !== 'navigation_control' && 
                            el.type !== 'audio_control' && 
                            el.type !== 'answer_input' && 
                            el.type !== 'answer_display'
                        );
                        pageForAppearance.appearance_order = displayElements.map(el => el.id);
                    }
                    
                    // Get elements in appearance order
                    const orderedElements = (pageForAppearance.appearance_order || [])
                        .map(id => pageForAppearance.elements.find(el => el.id === id))
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
                        
                        // Only show control mode elements in the appearance control
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
                            
                            // Click handler
                            toggleContainer.onclick = (e) => {
                                e.stopPropagation();
                                const currentState = element.appearance_visible || false;
                                const newState = !currentState;
                                updateToggleState(newState);
                                // Trigger autosave
                                if (typeof autosaveQuiz === 'function') {
                                    autosaveQuiz();
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
                } else {
                    const noPage = document.createElement('p');
                    noPage.style.cssText = 'color: #666; font-style: italic; font-size: 0.9rem; padding: 0.5rem;';
                    noPage.textContent = 'No page data available';
                    el.appendChild(noPage);
                }
                break;
            case 'answer_display':
                // Get parent question to access question title and answer type
                const quizForDisplay = getCurrentQuizCallback ? getCurrentQuizCallback() : null;
                const pageIndexForDisplay = getCurrentPageIndexCallback ? getCurrentPageIndexCallback() : 0;
                const pageForDisplay = quizForDisplay && quizForDisplay.pages ? quizForDisplay.pages[pageIndexForDisplay] : null;
                const parentQuestion = pageForDisplay && pageForDisplay.elements ? pageForDisplay.elements.find(e => e.id === element.parent_id) : null;
                const answerType = element.answer_type || (parentQuestion ? parentQuestion.answer_type : 'text');
                const questionTitle = parentQuestion ? (parentQuestion.question_title || 'Question') : 'Question';
                
                el.style.backgroundColor = 'white';
                el.style.border = '2px solid #2196F3';
                el.style.borderRadius = '8px';
                el.style.display = 'flex';
                el.style.flexDirection = 'column';
                el.style.padding = '1rem';
                el.style.overflow = 'auto';
                el.style.fontSize = '0.9rem';
                el.style.color = '#333';
                el.innerHTML = '';
                
                // Question title header
                const titleHeader = document.createElement('div');
                titleHeader.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #2196F3; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3;';
                titleHeader.textContent = questionTitle;
                el.appendChild(titleHeader);
                
                // Render mockup based on answer type
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
                    imageContainer.style.cssText = 'position: relative; margin-bottom: 1rem; border: 2px solid #ddd; border-radius: 4px; overflow: hidden; background: #f0f0f0; min-height: 200px;';
                    
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
                    
                    // Show image if available
                    if (imageSrc) {
                        const img = document.createElement('img');
                        img.src = imageSrc.startsWith('/') || imageSrc.startsWith('http') ? imageSrc : '/api/media/serve/' + imageSrc;
                        img.style.cssText = 'width: 100%; height: auto; display: block; max-height: 400px; object-fit: contain;';
                        img.onerror = () => {
                            const placeholder = document.createElement('div');
                            placeholder.style.cssText = 'width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;';
                            placeholder.textContent = 'Image preview';
                            imageContainer.innerHTML = '';
                            imageContainer.appendChild(placeholder);
                        };
                        imageContainer.appendChild(img);
                    } else {
                        const placeholder = document.createElement('div');
                        placeholder.style.cssText = 'width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;';
                        placeholder.textContent = 'Image preview (set image source on parent question)';
                        imageContainer.appendChild(placeholder);
                    }
                    
                    // Define mock participants with their colors and click positions
                    const mockParticipantsData = [
                        { name: 'Participant 1', color: '#FF0000', x: 30, y: 40 },
                        { name: 'Participant 2', color: '#00FF00', x: 60, y: 50 }
                    ];
                    
                    // Add highlighted radius circles on the image (if image exists)
                    if (imageSrc) {
                        mockParticipantsData.forEach((participant) => {
                            // Create a radius circle to show the click area
                            const highlight = document.createElement('div');
                            const radius = 25; // Radius in percentage
                            highlight.style.cssText = `position: absolute; width: ${radius * 2}%; height: ${radius * 2}%; border-radius: 50%; border: 3px solid ${participant.color}; background: ${participant.color}40; left: ${participant.x}%; top: ${participant.y}%; transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 0 8px ${participant.color}80;`;
                            imageContainer.appendChild(highlight);
                        });
                    }
                    
                    el.appendChild(imageContainer);
                    
                    // Legend at the bottom: participant names with color indicators, Correct checkbox, and Bonus points
                    const legend = document.createElement('div');
                    legend.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;';
                    
                    const legendTitle = document.createElement('div');
                    legendTitle.style.cssText = 'font-weight: bold; font-size: 0.9rem; color: #666; margin-bottom: 0.25rem;';
                    legendTitle.textContent = 'Participant Answers:';
                    legend.appendChild(legendTitle);
                    
                    const mockParticipants = mockParticipantsData;
                    
                    mockParticipants.forEach((participant) => {
                        const legendRow = document.createElement('div');
                        legendRow.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: #f5f5f5; border-radius: 4px;';
                        
                        // Color indicator dot/circle
                        const colorDot = document.createElement('div');
                        colorDot.style.cssText = `width: 24px; height: 24px; border-radius: 50%; background: ${participant.color}; border: 2px solid ${participant.color}; flex-shrink: 0;`;
                        legendRow.appendChild(colorDot);
                        
                        // Participant name
                        const nameLabel = document.createElement('div');
                        nameLabel.style.cssText = 'min-width: 120px; font-weight: 500; font-size: 0.95rem;';
                        nameLabel.textContent = participant.name;
                        legendRow.appendChild(nameLabel);
                        
                        // Correct checkbox
                        const correctCheckContainer = document.createElement('label');
                        correctCheckContainer.style.cssText = 'display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; cursor: not-allowed;';
                        
                        const correctCheck = document.createElement('input');
                        correctCheck.type = 'checkbox';
                        correctCheck.disabled = true;
                        correctCheck.style.cssText = 'cursor: not-allowed;';
                        correctCheckContainer.appendChild(correctCheck);
                        
                        const correctLabel = document.createElement('span');
                        correctLabel.textContent = 'Correct';
                        correctCheckContainer.appendChild(correctLabel);
                        legendRow.appendChild(correctCheckContainer);
                        
                        // Bonus points input
                        const bonusContainer = document.createElement('div');
                        bonusContainer.style.cssText = 'display: flex; align-items: center; gap: 0.25rem;';
                        
                        const bonusLabel = document.createElement('label');
                        bonusLabel.textContent = 'Bonus:';
                        bonusLabel.style.cssText = 'font-size: 0.85rem;';
                        bonusContainer.appendChild(bonusLabel);
                        
                        const bonusInput = document.createElement('input');
                        bonusInput.type = 'number';
                        bonusInput.placeholder = '0';
                        bonusInput.min = '0';
                        bonusInput.value = '0';
                        bonusInput.disabled = true;
                        bonusInput.style.cssText = 'width: 70px; padding: 0.25rem; border: 1px solid #ddd; border-radius: 4px; cursor: not-allowed; font-size: 0.85rem;';
                        bonusContainer.appendChild(bonusInput);
                        legendRow.appendChild(bonusContainer);
                        
                        legend.appendChild(legendRow);
                    });
                    
                    el.appendChild(legend);
                } else {
                    // Default fallback
                    el.textContent = `Answer Display (${answerType})`;
                }
                
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

