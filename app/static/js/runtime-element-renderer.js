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
        // Use element.id directly as the container ID (no prefix)
        const el = document.createElement('div');
        el.className = 'runtime-element';
        el.id = element.id;
        
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
            case 'plus':
                renderPlus(el, element);
                break;
            case 'text':
                renderText(el, element);
                break;
            case 'richtext':
                renderRichText(el, element);
                break;
            case 'counter':
                renderCounter(el, element);
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
        
        // Set volume from properties if available
        if (element.properties && element.properties.volume !== undefined) {
            video.volume = parseFloat(element.properties.volume);
        } else {
            video.volume = 1.0; // Default to full volume
        }
        
        el.appendChild(video);
        el.style.border = 'none';
    }
    
    function renderAudio(el, element) {
        const audioIcon = document.createElement('div');
        audioIcon.innerHTML = '🔊';
        audioIcon.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 64px;';
        el.appendChild(audioIcon);
        
        const audioElement = document.createElement('audio');
        // Construct src URL - match editor and tvdisplay logic
        let src = element.media_url || element.src || element.url || element.file_name || element.filename || '';
        // If src is a filename without path prefix, add the API path
        if (src && !src.startsWith('http') && !src.startsWith('/')) {
            src = '/api/media/serve/' + src;
        }
        audioElement.src = src;
        audioElement.style.display = 'none';
        audioElement.id = `audio-${element.id}`;
        
        // Preload audio to reduce delay when playing
        // 'auto' preloads the entire file, 'metadata' only preloads metadata
        // Using 'auto' for better responsiveness, but could use 'metadata' to save bandwidth
        audioElement.preload = 'auto';
        
        // Set volume from properties if available
        if (element.properties && element.properties.volume !== undefined) {
            audioElement.volume = parseFloat(element.properties.volume);
        } else {
            audioElement.volume = 1.0; // Default to full volume
        }
        
        // Check media_config.start_method to determine autoplay behavior
        // If start_method is 'control', don't autoplay (user must click play)
        const mediaConfig = element.media_config || {};
        const startMethod = mediaConfig.start_method || 'control'; // Default to 'control' for safety
        
        // Set autoplay and loop if specified
        // Only autoplay if start_method is 'on_load' or if autoplay is explicitly true
        if (startMethod === 'on_load' || (element.autoplay === true && startMethod !== 'control')) {
            audioElement.autoplay = true;
        } else {
            audioElement.autoplay = false;
        }
        if (element.loop === true) {
            audioElement.loop = true;
        }
        
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
    
    function renderPlus(el, element) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${element.width} ${element.height}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        
        // Calculate plus sign dimensions (thickness based on smaller dimension)
        const plusThickness = Math.min(element.width, element.height) * 0.2;
        const centerX = element.width / 2;
        const centerY = element.height / 2;
        const halfThickness = plusThickness / 2;
        
        // Create a single unified path for the plus sign
        // This creates a plus shape without overlapping borders
        const plusPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = `
            M ${centerX - halfThickness} 0
            L ${centerX + halfThickness} 0
            L ${centerX + halfThickness} ${centerY - halfThickness}
            L ${element.width} ${centerY - halfThickness}
            L ${element.width} ${centerY + halfThickness}
            L ${centerX + halfThickness} ${centerY + halfThickness}
            L ${centerX + halfThickness} ${element.height}
            L ${centerX - halfThickness} ${element.height}
            L ${centerX - halfThickness} ${centerY + halfThickness}
            L 0 ${centerY + halfThickness}
            L 0 ${centerY - halfThickness}
            L ${centerX - halfThickness} ${centerY - halfThickness}
            Z
        `.replace(/\s+/g, ' ').trim();
        
        plusPath.setAttribute('d', pathData);
        plusPath.setAttribute('fill', element.fill_color || '#ddd');
        plusPath.setAttribute('stroke', element.border_color || '#999');
        plusPath.setAttribute('stroke-width', element.border_width || 2);
        plusPath.setAttribute('stroke-linejoin', 'miter');
        svg.appendChild(plusPath);
        
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
        
        // Apply vertical alignment
        const vAlign = element.text_align_vertical || 'middle';
        if (vAlign === 'top') {
            el.style.alignItems = 'flex-start';
        } else if (vAlign === 'bottom') {
            el.style.alignItems = 'flex-end';
        } else {
            el.style.alignItems = 'center'; // middle or default
        }
        
        // Apply horizontal alignment
        const hAlign = element.text_align_horizontal || element.text_align || 'center';
        if (hAlign === 'left') {
            el.style.justifyContent = 'flex-start';
        } else if (hAlign === 'right') {
            el.style.justifyContent = 'flex-end';
        } else {
            el.style.justifyContent = 'center'; // center or default
        }
        
        el.style.padding = '0.5rem';
        el.style.wordWrap = 'break-word';
        el.style.overflow = 'hidden';
        el.style.border = 'none';
        // textAlign affects text within the flex container, not the container itself
        el.style.textAlign = element.text_align || 'center';
    }
    
    function renderRichText(el, element) {
        // Simple approach - just render the HTML content as-is (formatting is in HTML)
        el.innerHTML = element.content || '';
        el.style.color = element.color || element.text_color || '#000000';
        el.style.backgroundColor = element.background_color || 'transparent';
        el.style.padding = '8px';
        el.style.overflow = 'auto';
        el.style.wordWrap = 'break-word';
        el.style.border = 'none';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        
        // Vertical alignment for container
        // Note: For vertical centering to work, the container must have a defined height
        // The height is set by applyElementPosition() before this function is called
        // Properties should be merged into element object by getViewElements() in quiz-structure.js
        const vAlign = element.text_align_vertical || 'top';
        if (vAlign === 'middle') {
            el.style.justifyContent = 'center';
        } else if (vAlign === 'bottom') {
            el.style.justifyContent = 'flex-end';
        } else {
            el.style.justifyContent = 'flex-start'; // top or default
        }
        
        // Horizontal alignment for container (aligns content horizontally within the flex container)
        const hAlign = element.text_align_horizontal || 'left';
        if (hAlign === 'center') {
            el.style.alignItems = 'center';
        } else if (hAlign === 'right') {
            el.style.alignItems = 'flex-end';
        } else {
            el.style.alignItems = 'flex-start'; // left or default
        }
    }
    
    function renderCounter(el, element) {
        const props = element.properties || {};
        const shape = props.shape || 'rectangle';
        const textColor = props.text_color || '#000000';
        const textSize = props.text_size || 24;
        const bgColor = props.background_color || '#ffffff';
        const borderColor = props.border_color || '#000000';
        const prefix = props.prefix || '';
        const suffix = props.suffix || '';
        const value = props.value || 10;
        const increment = props.increment || 1;
        
        // Helper function to calculate decimal places from increment
        function getDecimalPlaces(inc) {
            if (inc % 1 === 0) {
                return 0; // Integer increment
            }
            const str = inc.toString();
            if (str.includes('e') || str.includes('E')) {
                const match = str.match(/e([+-]?\d+)/i);
                if (match) {
                    const exponent = parseInt(match[1]);
                    const baseStr = str.split(/e/i)[0];
                    const baseDecimalPlaces = baseStr.includes('.') ? baseStr.split('.')[1].length : 0;
                    return Math.max(0, baseDecimalPlaces - exponent);
                }
            }
            if (str.includes('.')) {
                return str.split('.')[1].length;
            }
            return 0;
        }
        
        // Format initial value to match increment precision
        function formatCounterValue(val, inc) {
            const decimalPlaces = getDecimalPlaces(inc);
            // Round to nearest increment
            const rounded = Math.round(val / inc) * inc;
            return parseFloat(rounded.toFixed(decimalPlaces)).toFixed(decimalPlaces);
        }
        
        // Set background and border based on shape
        if (shape === 'circle') {
            el.style.borderRadius = '50%';
        } else if (shape === 'triangle') {
            // Triangle requires SVG
            const triangleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            triangleSvg.setAttribute('width', '100%');
            triangleSvg.setAttribute('height', '100%');
            triangleSvg.setAttribute('viewBox', `0 0 ${element.width} ${element.height}`);
            const trianglePath = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            trianglePath.setAttribute('points', `${element.width/2},0 ${element.width},${element.height} 0,${element.height}`);
            trianglePath.setAttribute('fill', bgColor);
            trianglePath.setAttribute('stroke', borderColor);
            trianglePath.setAttribute('stroke-width', '2');
            triangleSvg.appendChild(trianglePath);
            el.appendChild(triangleSvg);
            el.style.border = 'none';
        } else {
            // rectangle
            el.style.borderRadius = '0';
        }
        
        if (shape !== 'triangle') {
            el.style.backgroundColor = bgColor;
            el.style.border = `2px solid ${borderColor}`;
        }
        
        // Add text content container
        const textContent = document.createElement('div');
        textContent.id = `counter-text-${element.id}`;
        const initialValue = 0; // Start at 0
        const formattedInitialValue = formatCounterValue(initialValue, increment);
        textContent.textContent = `${prefix}${formattedInitialValue}${suffix}`;
        textContent.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${textColor};
            font-size: ${textSize}px;
            font-weight: bold;
            text-align: center;
            position: ${shape === 'triangle' ? 'absolute' : 'relative'};
            top: ${shape === 'triangle' ? '0' : 'auto'};
            left: ${shape === 'triangle' ? '0' : 'auto'};
        `;
        el.appendChild(textContent);
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.position = 'relative';
        
        // Store element reference for counter updates
        el.dataset.counterId = element.id;
        el.dataset.counterProps = JSON.stringify(props);
    }
    
    function renderAudioControl(el, element, options) {
        // Modern styling matching control view elements
        el.style.backgroundColor = 'white';
        el.style.border = '2px solid #2196F3';
        el.style.borderRadius = '8px';
        el.style.padding = '1rem';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.gap = '0.75rem';
        el.style.boxSizing = 'border-box';
        el.style.overflow = 'hidden';
        
        // Get parent audio element name - control element is a "shadow" element
        // Use parent_id to look up the original audio element and get its element_name
        let parentElementName = null;
        if (element.parent_id && options && options.page) {
            const page = options.page;
            if (page.elements && typeof page.elements === 'object' && !Array.isArray(page.elements)) {
                const parentElementData = page.elements[element.parent_id] || null;
                if (parentElementData) {
                    // element_name is stored directly on elementData (set in visibility panel)
                    parentElementName = parentElementData.element_name || null;
                }
            }
        }
        
        // Title header matching control view style with loop button in top right
        const titleHeader = document.createElement('div');
        titleHeader.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #2196F3; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3; display: flex; justify-content: space-between; align-items: center;';
        const titleText = document.createElement('span');
        // Use parent element's element_name (control element is a shadow of the parent)
        const displayName = parentElementName || element.element_name || 'Audio Controls';
        titleText.textContent = displayName;
        titleHeader.appendChild(titleText);
        
        // Loop checkbox in top right
        const loopContainer = document.createElement('div');
        loopContainer.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
        
        const loopCheckbox = document.createElement('input');
        loopCheckbox.type = 'checkbox';
        loopCheckbox.id = `loop-${element.id}`;
        loopCheckbox.onchange = (e) => {
            e.stopPropagation();
            const media = element.media_type === 'video' 
                ? document.getElementById(`video-control-${element.id}`)
                : document.getElementById(`audio-control-${element.id}`);
            if (media) {
                media.loop = e.target.checked;
            }
        };
        loopContainer.appendChild(loopCheckbox);
        
        const loopLabel = document.createElement('label');
        loopLabel.htmlFor = `loop-${element.id}`;
        loopLabel.textContent = 'Loop';
        loopLabel.style.cssText = 'font-size: 0.9rem; color: #666; cursor: pointer; font-weight: normal;';
        loopContainer.appendChild(loopLabel);
        
        titleHeader.appendChild(loopContainer);
        el.appendChild(titleHeader);
        
        // Create hidden audio element
        const mediaSrc = element.media_url || element.src || (element.file_name ? '/api/media/serve/' + element.file_name : '') || (element.filename ? '/api/media/serve/' + element.filename : '');
        const audioControl = document.createElement('audio');
        audioControl.style.display = 'none';
        audioControl.src = mediaSrc;
        audioControl.id = `audio-control-${element.id}`;
        if (element.media_type === 'video') {
            const videoControl = document.createElement('video');
            videoControl.style.display = 'none';
            videoControl.src = mediaSrc;
            videoControl.id = `video-control-${element.id}`;
            el.appendChild(videoControl);
        } else {
            el.appendChild(audioControl);
        }
        
        // Audio player container
        const playerContainer = document.createElement('div');
        playerContainer.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';
        
        // Main controls row
        const mainControlsRow = document.createElement('div');
        mainControlsRow.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
        
        // Play/Pause button
        const playPauseBtn = document.createElement('button');
        playPauseBtn.innerHTML = '▶';
        playPauseBtn.className = 'control-play-btn';
        playPauseBtn.dataset.elementId = element.parent_id || element.id;
        playPauseBtn.style.cssText = 'width: 40px; height: 40px; border-radius: 50%; background: #2196F3; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; transition: background 0.2s;';
        playPauseBtn.onmouseover = () => playPauseBtn.style.background = '#1976D2';
        playPauseBtn.onmouseout = () => playPauseBtn.style.background = '#2196F3';
        playPauseBtn.onclick = (e) => {
            e.stopPropagation();
            const media = element.media_type === 'video' 
                ? document.getElementById(`video-control-${element.id}`)
                : document.getElementById(`audio-control-${element.id}`);
            if (media) {
                if (media.paused) {
                    media.play();
                    playPauseBtn.innerHTML = '⏸';
                } else {
                    media.pause();
                    playPauseBtn.innerHTML = '▶';
                }
            }
        };
        mainControlsRow.appendChild(playPauseBtn);
        
        // Time display
        const timeDisplay = document.createElement('div');
        timeDisplay.textContent = '0:00 / 0:00';
        timeDisplay.style.cssText = 'font-size: 0.9rem; color: #666; min-width: 80px; font-variant-numeric: tabular-nums;';
        mainControlsRow.appendChild(timeDisplay);
        
        // Progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = 'flex: 1; display: flex; align-items: center; gap: 0.5rem;';
        
        const progressBar = document.createElement('div');
        progressBar.style.cssText = 'flex: 1; height: 6px; background: #e0e0e0; border-radius: 3px; cursor: pointer; position: relative; overflow: hidden;';
        
        const progressFill = document.createElement('div');
        progressFill.style.cssText = 'height: 100%; background: #2196F3; width: 0%; border-radius: 3px; transition: width 0.1s;';
        progressBar.appendChild(progressFill);
        
        progressBar.onclick = (e) => {
            e.stopPropagation();
            const media = element.media_type === 'video' 
                ? document.getElementById(`video-control-${element.id}`)
                : document.getElementById(`audio-control-${element.id}`);
            if (media && media.duration) {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                media.currentTime = percent * media.duration;
            }
        };
        
        progressContainer.appendChild(progressBar);
        mainControlsRow.appendChild(progressContainer);
        
        // Volume control
        const volumeContainer = document.createElement('div');
        volumeContainer.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;';
        
        const volumeIcon = document.createElement('div');
        volumeIcon.innerHTML = '🔊';
        volumeIcon.style.cssText = 'font-size: 1.2rem; cursor: pointer;';
        volumeContainer.appendChild(volumeIcon);
        
        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.min = '0';
        volumeSlider.max = '100';
        volumeSlider.value = '100';
        volumeSlider.style.cssText = 'width: 80px; cursor: pointer;';
        volumeSlider.oninput = (e) => {
            e.stopPropagation();
            const media = element.media_type === 'video' 
                ? document.getElementById(`video-control-${element.id}`)
                : document.getElementById(`audio-control-${element.id}`);
            if (media) {
                media.volume = e.target.value / 100;
                volumeIcon.innerHTML = e.target.value > 50 ? '🔊' : e.target.value > 0 ? '🔉' : '🔇';
            }
        };
        volumeContainer.appendChild(volumeSlider);
        mainControlsRow.appendChild(volumeContainer);
        
        playerContainer.appendChild(mainControlsRow);
        el.appendChild(playerContainer);
        
        // Update progress and time display
        const updateProgress = () => {
            const media = element.media_type === 'video' 
                ? document.getElementById(`video-control-${element.id}`)
                : document.getElementById(`audio-control-${element.id}`);
            if (media) {
                if (media.duration) {
                    const percent = (media.currentTime / media.duration) * 100;
                    progressFill.style.width = percent + '%';
                    
                    const formatTime = (seconds) => {
                        const mins = Math.floor(seconds / 60);
                        const secs = Math.floor(seconds % 60);
                        return `${mins}:${secs.toString().padStart(2, '0')}`;
                    };
                    
                    timeDisplay.textContent = `${formatTime(media.currentTime)} / ${formatTime(media.duration)}`;
                }
                
                // Update play/pause button
                playPauseBtn.innerHTML = media.paused ? '▶' : '⏸';
            }
        };
        
        if (element.media_type === 'video') {
            const video = document.getElementById(`video-control-${element.id}`);
            if (video) {
                video.addEventListener('timeupdate', updateProgress);
                video.addEventListener('loadedmetadata', updateProgress);
                video.addEventListener('play', () => playPauseBtn.innerHTML = '⏸');
                video.addEventListener('pause', () => playPauseBtn.innerHTML = '▶');
            }
        } else {
            if (audioControl) {
                audioControl.addEventListener('timeupdate', updateProgress);
                audioControl.addEventListener('loadedmetadata', updateProgress);
                audioControl.addEventListener('play', () => playPauseBtn.innerHTML = '⏸');
                audioControl.addEventListener('pause', () => playPauseBtn.innerHTML = '▶');
            }
        }
    }
    
    function renderAnswerInput(el, element, options) {
        let answerType = (element.question_config && element.question_config.question_type) || element.answer_type || 'text';
        const questionId = element.parent_id;
        const question = options.question || null;
        const submittedAnswer = options.submittedAnswer || null;
        
        // Normalize multiple_choice to radio (they're the same thing)
        if (answerType === 'multiple_choice') {
            answerType = 'radio';
        }
        
        // Ensure options are available for radio/checkbox questions
        // Options can be on element.options, element.question_config.options, or question.question_config.options
        if ((answerType === 'radio' || answerType === 'checkbox') && (!element.options || element.options.length === 0)) {
            if (element.question_config && element.question_config.options && element.question_config.options.length > 0) {
                element.options = element.question_config.options;
            } else if (question && question.question_config && question.question_config.options && question.question_config.options.length > 0) {
                element.options = question.question_config.options;
            } else if (question && question.options && question.options.length > 0) {
                element.options = question.options;
            }
        }
        
        // No wrapper styling needed - the questionContainer in participant.js already provides the wrapper
        // Just set basic layout styles that participant view renderer expects
        el.style.boxSizing = 'border-box';
        // Layout styles will be set by participant view renderer
        
        const questionTitle = question && question.question_config ? (question.question_config.question_title || '') : '';
        const renderOptions = Object.assign({}, options, { 
            question: question, 
            questionTitle: questionTitle,
            width: element.width,
            height: element.height
        });
        
        // Call participant view renderer directly on el (no extra wrapper)
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
            console.error('[RuntimeRenderer] Question type', answerType, 'participant view not found');
            el.textContent = `Answer input type "${answerType}" not supported`;
            el.style.cssText = 'padding: 1rem; color: red; border: 2px solid red;';
        }
    }
    
    function renderAnswerDisplay(el, element, options) {
        // Get answerType from options first, then element, with normalization
        let answerType = options.answerType || (element.question_config && element.question_config.question_type) || element.answer_type || 'text';
        
        // Normalize 'image' to 'image_click' for consistency
        if (answerType === 'image') {
            answerType = 'image_click';
        }
        
        // Normalize multiple_choice to radio (they're the same thing)
        if (answerType === 'multiple_choice') {
            answerType = 'radio';
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
