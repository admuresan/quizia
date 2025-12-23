// Quiz editor - Main file that coordinates editor modules
let currentQuiz = {
    name: '',
    pages: [],
    background_color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    background_image: null
};
let currentPageIndex = 0;
let selectedElement = null;
let currentView = 'display'; // 'display', 'participant', or 'control'

// Helper functions that bridge to modules
function debounce(func, wait) {
    return Editor.Utils.debounce(func, wait);
}

async function autosaveQuiz() {
    const name = document.getElementById('quiz-name').value.trim();
    await Editor.QuizStorage.autosaveQuiz(currentQuiz, name);
}

async function loadQuiz(name) {
    const quiz = await Editor.QuizStorage.loadQuiz(name);
    if (quiz) {
        currentQuiz = quiz;
        document.getElementById('quiz-name').value = currentQuiz.name;
        currentPageIndex = 0;
        renderPages();
        renderCanvas();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Load quiz if editing
    const urlParams = new URLSearchParams(window.location.search);
    const quizName = urlParams.get('quiz');
    if (quizName) {
        loadQuiz(quizName);
    }

    // Initialize
    if (currentQuiz.pages.length === 0) {
        const newIndex = Editor.PageManager.addPage('display', currentQuiz, currentPageIndex, {
            onPageAdded: (index) => {
                currentPageIndex = index;
                renderPages();
                renderCanvas();
                autosaveQuiz();
            }
        });
        currentPageIndex = newIndex;
    }
    renderPages();
    renderCanvas();

    // Element drag handlers
    document.querySelectorAll('.element-item').forEach(item => {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('element-type', item.dataset.type);
        });
        
        // Also allow clicking to add element at center of canvas
        item.addEventListener('click', () => {
            const canvas = document.getElementById('editor-canvas');
            const rect = canvas.getBoundingClientRect();
            const x = rect.width / 2 - 100; // Center minus half element width
            const y = rect.height / 2 - 50;  // Center minus half element height
            addElement(item.dataset.type, x, y);
        });
    });

    const canvas = document.getElementById('editor-canvas');
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const elementType = e.dataTransfer.getData('element-type');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        addElement(elementType, x, y);
    });

    // Page management
    const pageCallbacks = {
        getCurrentQuiz: () => currentQuiz,
        getCurrentPageIndex: () => currentPageIndex,
        onPageAdded: (index) => {
            currentPageIndex = index;
            renderPages();
            renderCanvas();
            autosaveQuiz();
        },
        onPageSelected: (index) => {
            currentPageIndex = index;
            renderPages();
            renderCanvas();
        },
        onMovePage: (fromIndex, toIndex) => {
            [currentQuiz.pages[fromIndex], currentQuiz.pages[toIndex]] = 
                [currentQuiz.pages[toIndex], currentQuiz.pages[fromIndex]];
            if (currentPageIndex === fromIndex) {
                currentPageIndex = toIndex;
            } else if (currentPageIndex === toIndex) {
                currentPageIndex = fromIndex;
            }
            renderPages();
            renderCanvas();
            autosaveQuiz();
        },
        onPageRenamed: () => {
            autosaveQuiz();
        },
        onDeletePage: (index) => {
            currentQuiz.pages.splice(index, 1);
            if (currentPageIndex >= index) {
                if (currentPageIndex > 0) {
                    currentPageIndex--;
                } else {
                    currentPageIndex = 0;
                }
            }
            if (currentPageIndex >= currentQuiz.pages.length) {
                currentPageIndex = currentQuiz.pages.length - 1;
            }
            renderPages();
            renderCanvas();
            autosaveQuiz();
        }
    };

    document.getElementById('add-page-btn').addEventListener('click', () => {
        const newIndex = Editor.PageManager.addPage('display', currentQuiz, currentPageIndex, pageCallbacks);
        currentPageIndex = newIndex;
        renderPages();
        renderCanvas();
    });

    document.getElementById('add-status-page-btn').addEventListener('click', () => {
        const newIndex = Editor.PageManager.addPage('status', currentQuiz, currentPageIndex, pageCallbacks);
        currentPageIndex = newIndex;
        renderPages();
        renderCanvas();
    });

    document.getElementById('add-results-page-btn').addEventListener('click', () => {
        const newIndex = Editor.PageManager.addPage('results', currentQuiz, currentPageIndex, pageCallbacks);
        currentPageIndex = newIndex;
        renderPages();
        renderCanvas();
    });

    // Autosave on quiz name change
    document.getElementById('quiz-name').addEventListener('input', debounce(() => {
        autosaveQuiz();
    }, 1000));

    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '/quizmaster';
    });

    // Quiz name already handled above for autosave

    // Media modal handlers
    Editor.MediaModal.init();
    
    // Properties panel resize
    Editor.Utils.initPropertiesResize();
    
    // Canvas view tabs
    document.querySelectorAll('.canvas-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.canvas-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentView = tab.dataset.view;
            renderCanvas();
        });
    });
    
    // Keyboard shortcuts - Delete key to delete selected element
    document.addEventListener('keydown', (e) => {
        // Only handle if no input/textarea is focused (to avoid deleting text while editing)
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.isContentEditable
        );
        
        if (!isInputFocused && selectedElement && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault();
            deleteSelectedElement();
        }
    });
});

function renderPages() {
    const pageCallbacks = {
        getCurrentQuiz: () => currentQuiz,
        getCurrentPageIndex: () => currentPageIndex,
        onPageSelected: (index) => {
            currentPageIndex = index;
            renderPages();
            renderCanvas();
        },
        onMovePage: (fromIndex, toIndex) => {
            [currentQuiz.pages[fromIndex], currentQuiz.pages[toIndex]] = 
                [currentQuiz.pages[toIndex], currentQuiz.pages[fromIndex]];
            if (currentPageIndex === fromIndex) {
                currentPageIndex = toIndex;
            } else if (currentPageIndex === toIndex) {
                currentPageIndex = fromIndex;
            }
            renderPages();
            renderCanvas();
            autosaveQuiz();
        },
        onPageRenamed: () => {
            autosaveQuiz();
        },
        onDeletePage: (index) => {
            currentQuiz.pages.splice(index, 1);
            if (currentPageIndex >= index) {
                if (currentPageIndex > 0) {
                    currentPageIndex--;
                } else {
                    currentPageIndex = 0;
                }
            }
            if (currentPageIndex >= currentQuiz.pages.length) {
                currentPageIndex = currentQuiz.pages.length - 1;
            }
            renderPages();
            renderCanvas();
            autosaveQuiz();
        }
    };
    
    Editor.PageManager.renderPages(currentQuiz, currentPageIndex, pageCallbacks);
}

function renderCanvas() {
    const canvas = document.getElementById('editor-canvas');
    canvas.innerHTML = '';
    
    const page = currentQuiz.pages[currentPageIndex];
    if (!page) return;

    // Set background for all views - always use the gradient blue from main page
    canvas.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
    canvas.style.setProperty('background-image', 'none', 'important');

    // Initialize page elements structure if needed
    if (!page.elements) {
        page.elements = [];
    }

    // Add participant header if viewing participant view
    if (currentView === 'participant') {
        const participantHeader = document.createElement('div');
        participantHeader.className = 'editor-participant-header';
        participantHeader.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; background: white; border-bottom: 3px solid #2196F3; padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 1000;';
        
        // Avatar placeholder
        const avatar = document.createElement('div');
        avatar.style.cssText = 'font-size: 2.5rem; width: 3.5rem; height: 3.5rem; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 50%; border: 2px solid #2196F3;';
        avatar.textContent = '👤';
        participantHeader.appendChild(avatar);
        
        // Name placeholder
        const name = document.createElement('div');
        name.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #333; flex: 1;';
        name.textContent = 'Participant Name';
        participantHeader.appendChild(name);
        
        // Points placeholder
        const points = document.createElement('div');
        points.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #2196F3;';
        points.textContent = 'Points: 0';
        participantHeader.appendChild(points);
        
        canvas.appendChild(participantHeader);
        
        // Add padding to canvas to account for header
        canvas.style.paddingTop = '80px';
    } else {
        // Remove padding for other views
        canvas.style.paddingTop = '0';
    }

    // Filter elements by current view
    // Elements with view property matching currentView, or parent elements on display view
    let elementsToRender = [];
    if (currentView === 'display') {
        // Display view shows all elements without a view property or with view='display'
        elementsToRender = page.elements.filter(el => !el.view || el.view === 'display');
    } else if (currentView === 'participant') {
        // Participant view should match the actual participant page structure
        // Find question elements and render them with titles and answer inputs
        const questionElements = page.elements.filter(el => el.is_question && (!el.view || el.view === 'display'));
        questionElements.forEach(question => {
            // Create question container (matching participant page structure)
            const questionContainer = document.createElement('div');
            questionContainer.className = 'question-container';
            questionContainer.id = `question-${question.id}`;
            questionContainer.style.cssText = 'position: relative; background: white; padding: 2rem; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); min-width: 300px;';
            
            // Add question title if available
            if (question.question_title && question.question_title.trim()) {
                const title = document.createElement('div');
                title.className = 'question-title';
                title.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #2196F3; margin-bottom: 1rem; margin-top: 0.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3; display: block; width: 100%;';
                title.textContent = question.question_title;
                questionContainer.appendChild(title);
            }
            
            // Find and render the answer_input element for this question
            const answerInput = page.elements.find(el => el.type === 'answer_input' && el.parent_id === question.id && el.view === 'participant');
            if (answerInput) {
                // Render the answer input inside the question container
                const answerEl = renderElementOnCanvas(questionContainer, answerInput, true); // Pass true to indicate it's inside a container
                if (answerEl) {
                    questionContainer.appendChild(answerEl);
                }
            }
            
            // Position the question container on the canvas
            questionContainer.style.position = 'absolute';
            const headerOffset = currentView === 'participant' ? 80 : 0;
            questionContainer.style.left = `${question.x || 50}px`;
            questionContainer.style.top = `${(question.y || 50) + headerOffset}px`;
            
            // Make the question container draggable so the title and answer input move together
            // Create a wrapper for drag handling that accounts for header offset
            let isDragging = false;
            let startX, startY, startLeft, startTop;
            let dragThreshold = 5;
            let hasMoved = false;
            
            questionContainer.addEventListener('mousedown', (e) => {
                // Don't start dragging if clicking on interactive elements (inputs, buttons, etc.)
                const target = e.target;
                if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'LABEL' || 
                    target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.closest('button') || 
                    target.closest('input') || target.closest('label') || target.closest('select')) {
                    return;
                }
                
                isDragging = true;
                hasMoved = false;
                startX = e.clientX;
                startY = e.clientY;
                startLeft = question.x || 50;
                startTop = question.y || 50;
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', function dragMove(e) {
                if (!isDragging) return;
                
                const dx = Math.abs(e.clientX - startX);
                const dy = Math.abs(e.clientY - startY);
                
                if (dx > dragThreshold || dy > dragThreshold) {
                    hasMoved = true;
                }
                
                if (hasMoved) {
                    const totalDx = e.clientX - startX;
                    const totalDy = e.clientY - startY;
                    const newX = startLeft + totalDx;
                    const newY = startTop + totalDy;
                    
                    // Update question element position (without header offset)
                    question.x = newX;
                    question.y = newY;
                    
                    // Update container position (with header offset for display)
                    questionContainer.style.left = `${newX}px`;
                    questionContainer.style.top = `${newY + headerOffset}px`;
                }
            });
            
            document.addEventListener('mouseup', function dragEnd() {
                if (isDragging && hasMoved) {
                    autosaveQuiz();
                }
                isDragging = false;
                hasMoved = false;
            });
            
            // Add click handler to select the question element
            questionContainer.addEventListener('click', (e) => {
                // Don't select if we just dragged
                if (hasMoved) {
                    hasMoved = false;
                    return;
                }
                // Don't select if clicking on interactive elements inside
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || 
                    e.target.tagName === 'LABEL' || e.target.closest('button') || 
                    e.target.closest('input') || e.target.closest('label')) {
                    return;
                }
                selectElement(question);
            });
            
            canvas.appendChild(questionContainer);
        });
        // Don't render other elements in participant view - we've handled questions above
        return;
    } else if (currentView === 'control') {
        // Control view shows elements with matching view
        elementsToRender = page.elements.filter(el => el.view === currentView);
        
        // Always add next/previous navigation buttons to control view
        // Check if navigation buttons already exist
        const existingNavButtons = page.elements.filter(el => 
            el.type === 'navigation_control' && el.view === 'control'
        );
        
        if (existingNavButtons.length === 0) {
            // Create next button
            const nextButton = {
                id: `nav-next-${Date.now()}`,
                type: 'navigation_control',
                view: 'control',
                button_type: 'next',
                x: 50,
                y: 50,
                width: 150,
                height: 50,
                visible: true
            };
            page.elements.push(nextButton);
            elementsToRender.push(nextButton);
            
            // Create previous button
            const prevButton = {
                id: `nav-prev-${Date.now()}`,
                type: 'navigation_control',
                view: 'control',
                button_type: 'prev',
                x: 220,
                y: 50,
                width: 150,
                height: 50,
                visible: true
            };
            page.elements.push(prevButton);
            elementsToRender.push(prevButton);
            
            // Autosave to persist navigation buttons
            autosaveQuiz();
        } else {
            // Add existing navigation buttons to render list
            elementsToRender.push(...existingNavButtons);
        }
        
        // Ensure audio/video controls exist for all audio/video elements
        const audioVideoElements = page.elements.filter(el => 
            (el.type === 'audio' || el.type === 'video' || el.media_type === 'audio' || el.media_type === 'video') &&
            (!el.view || el.view === 'display')
        );
        
        audioVideoElements.forEach(mediaElement => {
            // Check if control element already exists
            const existingControl = page.elements.find(el => 
                el.type === 'audio_control' && 
                el.parent_id === mediaElement.id && 
                el.view === 'control'
            );
            
            if (!existingControl) {
                // Create audio/video control element
                const controlElement = Editor.ElementCreator.createMediaControlElement(mediaElement);
                if (controlElement) {
                    page.elements.push(controlElement);
                    elementsToRender.push(controlElement);
                }
            } else {
                // Add existing control to render list if not already there
                if (!elementsToRender.find(el => el.id === existingControl.id)) {
                    elementsToRender.push(existingControl);
                }
            }
        });
    } else {
        // Other views
        elementsToRender = page.elements.filter(el => el.view === currentView);
    }

    // Render elements
    elementsToRender.forEach(element => {
        renderElementOnCanvas(canvas, element);
    });

    // Render properties
    renderProperties();
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
        makeDraggable(el, element);
    }
    
    el.addEventListener('click', () => {
        selectElement(element);
    });

    // Render content based on type
    switch (element.type) {
        case 'image':
            const img = document.createElement('img');
            // Use src if available, otherwise try media serve path with filename, fallback to placeholder
            img.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : 'placeholder.png');
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            el.appendChild(img);
            // No border for media elements
            el.style.border = 'none';
            break;
        case 'video':
            const video = document.createElement('video');
            // Use src if available, otherwise try media serve path with filename
            video.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : '');
            video.controls = true;
            video.style.width = '100%';
            video.style.height = '100%';
            el.appendChild(video);
            // No border for media elements
            el.style.border = 'none';
            break;
        case 'audio':
            // Show speaker icon as the visual representation
            const audioIcon = document.createElement('div');
            audioIcon.innerHTML = '🔊';
            audioIcon.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 64px;';
            el.appendChild(audioIcon);
            // No border for media elements
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
            // Use SVG for triangle to support rotation
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
            // Use SVG for arrow to support rotation
            const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            arrowSvg.setAttribute('width', '100%');
            arrowSvg.setAttribute('height', '100%');
            arrowSvg.setAttribute('viewBox', `0 0 ${element.width} ${element.height}`);
            
            const arrowHeadLength = element.arrow_head_length || Math.min(element.width, element.height) * 0.3;
            const arrowBodyThickness = element.arrow_body_thickness || Math.min(element.width, element.height) * 0.2;
            const arrowBodyWidth = element.width - arrowHeadLength;
            const bodyTop = (element.height - arrowBodyThickness) / 2;
            const bodyBottom = bodyTop + arrowBodyThickness;
            
            // Create arrow path: body rectangle + triangle head
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
            // Media elements from media modal - handled separately
            renderMediaElement(el, element);
            // No border for media elements
            el.style.border = 'none';
            break;
        case 'audio_control':
            // Audio/video control element for control view
            el.style.backgroundColor = '#f5f5f5';
            el.style.border = '1px solid #ddd';
            el.style.borderRadius = '4px';
            el.style.padding = '0.5rem';
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.gap = '0.5rem';
            
            // Filename label above controls
            const filenameLabel = document.createElement('div');
            let filename = element.filename || (element.media_type === 'video' ? 'Video' : 'Audio');
            // Extract just the filename without path
            if (filename && typeof filename === 'string') {
                filename = filename.split('/').pop().split('\\').pop();
            }
            filenameLabel.textContent = filename || (element.media_type === 'video' ? 'Video' : 'Audio');
            filenameLabel.style.fontWeight = '500';
            filenameLabel.style.fontSize = '0.9rem';
            filenameLabel.style.marginBottom = '0.25rem';
            filenameLabel.style.color = '#333';
            el.appendChild(filenameLabel);
            
            // Play/pause controls
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
            
            // Hidden media element for actual playback
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
            // Navigation button for control view
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
            
            // Make it look like a button but non-functional in editor
            el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                // In editor mode, just select the element
                selectElement(element);
            });
            break;
        case 'answer_input':
            // Answer input element for participant view - show actual interactive elements
            el.style.backgroundColor = 'transparent';
            el.style.border = 'none';
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.gap = '0.5rem';
            el.style.padding = '0.5rem';
            el.style.overflow = 'visible';
            
            // Find parent question element to get answer_type and options
            const page = currentQuiz.pages[currentPageIndex];
            const parentQuestion = page.elements.find(e => e.id === element.parent_id);
            const answerType = element.answer_type || (parentQuestion ? parentQuestion.answer_type : 'text');
            const options = element.options || (parentQuestion ? parentQuestion.options : []);
            
            // Clear any existing content
            el.innerHTML = '';
            
            // Render based on answer type
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
                // Find the parent question element to get the image source
                // The parent question might be an image element, so check for src, filename, or image_src
                let imageSrc = null;
                if (parentQuestion) {
                    imageSrc = parentQuestion.src || 
                              (parentQuestion.filename ? '/api/media/serve/' + parentQuestion.filename : null) ||
                              parentQuestion.image_src;
                    
                    // If parent is an image element, it might have the image in a different property
                    if (!imageSrc && parentQuestion.type === 'image') {
                        imageSrc = parentQuestion.src || (parentQuestion.filename ? '/api/media/serve/' + parentQuestion.filename : null);
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
                        
                        // Remove old indicator
                        if (clickIndicator) {
                            clickIndicator.remove();
                        }
                        
                        // Create click indicator (10% of image size)
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
                // Fallback for unknown types
                el.textContent = `Answer Input (${answerType})`;
                el.style.backgroundColor = '#e3f2fd';
                el.style.border = '2px dashed #2196F3';
                el.style.borderRadius = '4px';
                el.style.padding = '1rem';
            }
            break;
        case 'answer_display':
            // Answer display element for control view
            el.style.backgroundColor = '#fff3e0';
            el.style.border = '2px dashed #ff9800';
            el.style.borderRadius = '4px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.fontSize = '0.9rem';
            el.style.color = '#666';
            el.textContent = `Answer Display (${element.answer_type || 'text'})`;
            break;
        case 'richtext':
            // Display the rich text content with formatting
            el.innerHTML = element.content || '<p>Enter your text here</p>';
            el.style.fontSize = `${element.font_size || 16}px`;
            el.style.color = element.text_color || '#000000';
            el.style.backgroundColor = element.background_color || 'transparent';
            el.style.padding = '8px';
            el.style.overflow = 'auto';
            el.style.wordWrap = 'break-word';
            el.style.border = 'none';
            // Make sure the element can display HTML properly
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
        addResizeHandles(el, element);
        addRotateHandle(el, element);
    }
    
    // Add resize handles for media elements (no rotation)
    if (['image', 'video', 'audio'].includes(element.type)) {
        addResizeHandles(el, element);
    }
    
    // Add resize handles for child elements (audio_control, answer_input, answer_display, navigation_control)
    if (['audio_control', 'answer_input', 'answer_display', 'navigation_control'].includes(element.type)) {
        addResizeHandles(el, element);
    }
    
    // Add resize handles for richtext elements
    if (element.type === 'richtext') {
        addResizeHandles(el, element);
    }
    
    // Add resize handles for child elements (audio_control, answer_input, answer_display, navigation_control)
    // But not if inside a container (participant view question containers)
    if (!insideContainer && ['audio_control', 'answer_input', 'answer_display', 'navigation_control'].includes(element.type)) {
        addResizeHandles(el, element);
    }

    // Only append to canvas if not inside a container (container will append it)
    if (!insideContainer) {
        canvas.appendChild(el);
    }
    
    // Return the element so it can be appended to a container if needed
    return el;
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

function makeDraggable(element, elementData) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    let dragThreshold = 5; // Pixels to move before starting drag
    let hasMoved = false;

    element.addEventListener('mousedown', (e) => {
        // Don't start dragging if clicking on interactive elements (inputs, buttons, etc.)
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'LABEL' || 
            target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.closest('button') || 
            target.closest('input') || target.closest('label') || target.closest('select')) {
            return;
        }
        
        isDragging = true;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(element.style.left) || 0;
        startTop = parseInt(element.style.top) || 0;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        
        // Only start dragging if moved beyond threshold
        if (dx > dragThreshold || dy > dragThreshold) {
            hasMoved = true;
        }
        
        if (hasMoved) {
            const totalDx = e.clientX - startX;
            const totalDy = e.clientY - startY;
            element.style.left = `${startLeft + totalDx}px`;
            element.style.top = `${startTop + totalDy}px`;
            elementData.x = startLeft + totalDx;
            elementData.y = startTop + totalDy;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging && hasMoved) {
            autosaveQuiz();
        }
        isDragging = false;
        hasMoved = false;
    });
}

// Helper functions that delegate to modules
function createMediaControlElement(parentElement) {
    return Editor.ElementCreator.createMediaControlElement(parentElement);
}

function createQuestionChildElements(parentElement) {
    return Editor.ElementCreator.createQuestionChildElements(parentElement);
}

function addElement(type, x, y) {
    const elementCallbacks = {
        getCurrentQuiz: () => currentQuiz,
        getCurrentPageIndex: () => currentPageIndex,
        getCurrentView: () => currentView,
        openMediaModal: (callback) => {
            Editor.MediaModal.open(callback);
        },
        onElementAdded: (element) => {
            renderCanvas();
            selectElement(element);
            autosaveQuiz();
        }
    };
    
    const element = Editor.ElementCreator.createElement(type, x, y, elementCallbacks);
    if (element) {
        renderCanvas();
        selectElement(element);
        autosaveQuiz();
    }
}

function selectElement(element) {
    selectedElement = element;
    document.querySelectorAll('.canvas-element').forEach(el => {
        el.classList.remove('selected');
        el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
    });
    // Also clear selection from question containers and navigation controls
    document.querySelectorAll('.question-container, [id^="element-nav-"]').forEach(el => {
        el.classList.remove('selected');
        el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
    });
    
    const el = document.getElementById(`element-${element.id}`);
    if (el) {
        el.classList.add('selected');
        if (['rectangle', 'circle', 'triangle', 'arrow', 'line'].includes(element.type)) {
            addResizeHandles(el, element);
            addRotateHandle(el, element);
        } else if (['image', 'video', 'audio', 'richtext'].includes(element.type)) {
            addResizeHandles(el, element);
        } else if (['audio_control', 'answer_input', 'answer_display', 'navigation_control'].includes(element.type)) {
            addResizeHandles(el, element);
        }
    }
    renderProperties();
}

function deleteSelectedElement() {
    if (!selectedElement) return;
    
    const page = currentQuiz.pages[currentPageIndex];
    if (!page || !page.elements) return;
    
    // Don't allow deleting navigation controls - they're always needed
    if (selectedElement.type === 'navigation_control') {
        alert('Navigation buttons cannot be deleted. They are always shown in control view.');
        return;
    }
    
    // Remove element from array
    const elementIndex = page.elements.findIndex(el => el.id === selectedElement.id);
    if (elementIndex !== -1) {
        const deletedElement = page.elements[elementIndex];
        
        // If deleting a parent element (has view='display' and no parent_id), delete all child elements
        if (deletedElement.view === 'display' && !deletedElement.parent_id) {
            page.elements = page.elements.filter(el => el.parent_id !== deletedElement.id);
        }
        
        // Remove the element itself
        page.elements.splice(elementIndex, 1);
        selectedElement = null;
        renderCanvas();
        autosaveQuiz();
    }
}

function renderProperties() {
    const panel = document.getElementById('properties-panel');
    panel.innerHTML = '';

    if (!selectedElement) {
        panel.innerHTML = '<p>Select an element to edit properties</p>';
        return;
    }

    // Common properties
    addPropertyInput(panel, 'X', selectedElement.x, (val) => {
        selectedElement.x = parseInt(val) || 0;
        updateElementDisplay();
    });

    addPropertyInput(panel, 'Y', selectedElement.y, (val) => {
        selectedElement.y = parseInt(val) || 0;
        updateElementDisplay();
    });

    addPropertyInput(panel, 'Width', selectedElement.width, (val) => {
        selectedElement.width = parseInt(val) || 100;
        updateElementDisplay();
    });

    addPropertyInput(panel, 'Height', selectedElement.height, (val) => {
        selectedElement.height = parseInt(val) || 100;
        updateElementDisplay();
    });

    // Type-specific properties
    // Rich text editor
    if (selectedElement.type === 'richtext') {
        // Rich text content editor
        const contentGroup = document.createElement('div');
        contentGroup.className = 'property-group';
        const contentLabel = document.createElement('label');
        contentLabel.textContent = 'Content';
        contentLabel.style.marginBottom = '0.5rem';
        contentLabel.style.display = 'block';
        contentGroup.appendChild(contentLabel);
        
        // Contenteditable div for rich text editing
        const editor = document.createElement('div');
        editor.contentEditable = true;
        editor.innerHTML = selectedElement.content || '<p>Enter your text here</p>';
        editor.style.cssText = 'min-height: 200px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; background: white; overflow-y: auto; font-size: 14px; line-height: 1.5;';
        editor.style.fontSize = `${selectedElement.font_size || 16}px`;
        editor.style.color = selectedElement.text_color || '#000000';
        
        // Update content function - immediate display update
        const updateRichTextDisplay = () => {
            selectedElement.content = editor.innerHTML;
            updateElementDisplay();
        };
        
        // Debounced save function - only for autosave
        const saveRichText = debounce(() => {
            autosaveQuiz();
        }, 500);
        
        // Combined update function for toolbar buttons (immediate update + debounced save)
        const updateRichTextContent = () => {
            updateRichTextDisplay();
            saveRichText();
        };
        
        // Formatting toolbar
        const toolbar = document.createElement('div');
        toolbar.style.cssText = 'display: flex; gap: 0.25rem; margin-bottom: 0.5rem; flex-wrap: wrap; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;';
        
        // Bold button
        const boldBtn = document.createElement('button');
        boldBtn.innerHTML = '<strong>B</strong>';
        boldBtn.title = 'Bold';
        boldBtn.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 3px; font-weight: bold;';
        boldBtn.onclick = (e) => {
            e.preventDefault();
            editor.focus();
            document.execCommand('bold', false, null);
            updateRichTextContent();
        };
        toolbar.appendChild(boldBtn);
        
        // Italic button
        const italicBtn = document.createElement('button');
        italicBtn.innerHTML = '<em>I</em>';
        italicBtn.title = 'Italic';
        italicBtn.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 3px; font-style: italic;';
        italicBtn.onclick = (e) => {
            e.preventDefault();
            editor.focus();
            document.execCommand('italic', false, null);
            updateRichTextContent();
        };
        toolbar.appendChild(italicBtn);
        
        // Underline button
        const underlineBtn = document.createElement('button');
        underlineBtn.innerHTML = '<u>U</u>';
        underlineBtn.title = 'Underline';
        underlineBtn.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 3px; text-decoration: underline;';
        underlineBtn.onclick = (e) => {
            e.preventDefault();
            editor.focus();
            document.execCommand('underline', false, null);
            updateRichTextContent();
        };
        toolbar.appendChild(underlineBtn);
        
        // Font size dropdown
        const fontSizeLabel = document.createElement('label');
        fontSizeLabel.textContent = 'Size:';
        fontSizeLabel.style.marginLeft = '0.5rem';
        fontSizeLabel.style.marginRight = '0.25rem';
        toolbar.appendChild(fontSizeLabel);
        
        const fontSizeSelect = document.createElement('select');
        fontSizeSelect.style.cssText = 'padding: 0.25rem; border: 1px solid #ddd; border-radius: 3px;';
        const sizes = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];
        sizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size;
            if (size === (selectedElement.font_size || 16)) {
                option.selected = true;
            }
            fontSizeSelect.appendChild(option);
        });
        fontSizeSelect.onchange = () => {
            editor.focus();
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (!range.collapsed) {
                    const span = document.createElement('span');
                    span.style.fontSize = fontSizeSelect.value + 'px';
                    try {
                        range.surroundContents(span);
                    } catch (e) {
                        // If surroundContents fails, use alternative method
                        span.appendChild(range.extractContents());
                        range.insertNode(span);
                    }
                    updateRichTextContent();
                } else {
                    // If no selection, apply to entire content
                    editor.style.fontSize = fontSizeSelect.value + 'px';
                    selectedElement.font_size = parseInt(fontSizeSelect.value);
                    updateRichTextContent();
                }
            }
        };
        toolbar.appendChild(fontSizeSelect);
        
        // Text color picker
        const colorLabel = document.createElement('label');
        colorLabel.textContent = 'Color:';
        colorLabel.style.marginLeft = '0.5rem';
        colorLabel.style.marginRight = '0.25rem';
        toolbar.appendChild(colorLabel);
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = selectedElement.text_color || '#000000';
        colorInput.style.cssText = 'width: 40px; height: 24px; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;';
        colorInput.onchange = () => {
            editor.focus();
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                document.execCommand('foreColor', false, colorInput.value);
            } else {
                // If no selection, apply to entire content
                editor.style.color = colorInput.value;
                selectedElement.text_color = colorInput.value;
            }
            updateRichTextContent();
        };
        toolbar.appendChild(colorInput);
        
        contentGroup.appendChild(toolbar);
        
        // Update display immediately as user types, but debounce autosave
        editor.addEventListener('input', () => {
            updateRichTextDisplay();
            saveRichText();
        });
        editor.addEventListener('blur', updateRichTextContent);
        
        // Prevent default behavior for formatting buttons
        editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'b') {
                    e.preventDefault();
                    document.execCommand('bold', false, null);
                    updateRichTextContent();
                } else if (e.key === 'i') {
                    e.preventDefault();
                    document.execCommand('italic', false, null);
                    updateRichTextContent();
                } else if (e.key === 'u') {
                    e.preventDefault();
                    document.execCommand('underline', false, null);
                    updateRichTextContent();
                }
            }
        });
        
        contentGroup.appendChild(editor);
        panel.appendChild(contentGroup);
        
        // Background color
        const bgColorGroup = document.createElement('div');
        bgColorGroup.className = 'property-group';
        const bgColorLabel = document.createElement('label');
        bgColorLabel.textContent = 'Background Color';
        const bgColorInput = document.createElement('input');
        bgColorInput.type = 'color';
        bgColorInput.value = selectedElement.background_color || '#ffffff';
        bgColorInput.onchange = () => {
            selectedElement.background_color = bgColorInput.value;
            updateElementDisplay();
            autosaveQuiz();
        };
        bgColorGroup.appendChild(bgColorLabel);
        bgColorGroup.appendChild(bgColorInput);
        panel.appendChild(bgColorGroup);
    }
    
    // Shape properties (rectangle, circle, triangle, arrow, line)
    if (['rectangle', 'circle', 'triangle', 'arrow', 'line'].includes(selectedElement.type)) {
        // Fill color
        const fillColorGroup = document.createElement('div');
        fillColorGroup.className = 'property-group';
        const fillColorLabel = document.createElement('label');
        fillColorLabel.textContent = 'Fill Color';
        const fillColorInput = document.createElement('input');
        fillColorInput.type = 'color';
        fillColorInput.value = selectedElement.fill_color || '#ddd';
        fillColorInput.onchange = () => {
            selectedElement.fill_color = fillColorInput.value;
            updateElementDisplay();
            autosaveQuiz();
        };
        fillColorGroup.appendChild(fillColorLabel);
        fillColorGroup.appendChild(fillColorInput);
        panel.appendChild(fillColorGroup);

        // Border color
        const borderColorGroup = document.createElement('div');
        borderColorGroup.className = 'property-group';
        const borderColorLabel = document.createElement('label');
        borderColorLabel.textContent = 'Border Color';
        const borderColorInput = document.createElement('input');
        borderColorInput.type = 'color';
        borderColorInput.value = selectedElement.border_color || '#999';
        borderColorInput.onchange = () => {
            selectedElement.border_color = borderColorInput.value;
            updateElementDisplay();
            autosaveQuiz();
        };
        borderColorGroup.appendChild(borderColorLabel);
        borderColorGroup.appendChild(borderColorInput);
        panel.appendChild(borderColorGroup);

        // Border width
        addPropertyInput(panel, 'Border Width', selectedElement.border_width || 2, (val) => {
            selectedElement.border_width = parseInt(val) || 0;
            updateElementDisplay();
            autosaveQuiz();
        });
        
        // Arrow-specific properties
        if (selectedElement.type === 'arrow') {
            // Body thickness
            addPropertyInput(panel, 'Body Thickness', selectedElement.arrow_body_thickness || Math.min(selectedElement.width, selectedElement.height) * 0.2, (val) => {
                selectedElement.arrow_body_thickness = parseInt(val) || 10;
                updateElementDisplay();
                autosaveQuiz();
            });
            
            // Head length (how far back the line goes)
            addPropertyInput(panel, 'Head Length', selectedElement.arrow_head_length || Math.min(selectedElement.width, selectedElement.height) * 0.3, (val) => {
                selectedElement.arrow_head_length = parseInt(val) || 30;
                updateElementDisplay();
                autosaveQuiz();
            });
        }
    }

    // Question checkbox - only appears for display view elements (not child elements)
    if (selectedElement.view === 'display' || !selectedElement.view) {
    const questionGroup = document.createElement('div');
    questionGroup.className = 'property-group';
    questionGroup.style.marginTop = '4px';
    questionGroup.style.paddingTop = '4px';
    questionGroup.style.borderTop = '1px solid #eee';
    questionGroup.style.marginBottom = '4px';
    questionGroup.style.paddingBottom = '4px';
    questionGroup.style.paddingLeft = '0';
    questionGroup.style.marginLeft = '0';
    const questionLabel = document.createElement('div');
    questionLabel.style.display = 'flex';
    questionLabel.style.alignItems = 'center';
    questionLabel.style.gap = '0.25rem';
    questionLabel.style.fontWeight = '500';
    questionLabel.style.whiteSpace = 'nowrap';
    questionLabel.style.justifyContent = 'flex-start';
    questionLabel.style.margin = '0';
    questionLabel.style.marginBottom = '0';
    questionLabel.style.padding = '0';
    questionLabel.style.textAlign = 'left';
    const questionCheckbox = document.createElement('input');
    questionCheckbox.type = 'checkbox';
    questionCheckbox.checked = selectedElement.is_question || false;
    questionCheckbox.style.margin = '0';
    questionCheckbox.style.marginRight = '0.25rem';
    questionCheckbox.style.cursor = 'pointer';
    questionCheckbox.style.width = 'auto';
    questionCheckbox.style.padding = '0';
    questionCheckbox.style.border = 'none';
    questionCheckbox.style.borderRadius = '0';
    questionCheckbox.onchange = () => {
        const page = currentQuiz.pages[currentPageIndex];
        const wasQuestion = selectedElement.is_question;
        selectedElement.is_question = questionCheckbox.checked;
        
        if (!selectedElement.is_question) {
            // Delete child answer elements
            if (page.elements) {
                page.elements = page.elements.filter(el => el.parent_id !== selectedElement.id || 
                    (el.type !== 'answer_input' && el.type !== 'answer_display'));
            }
            delete selectedElement.answer_type;
            delete selectedElement.options;
        } else {
            // Create child answer elements
            selectedElement.answer_type = selectedElement.answer_type || 'text';
            if (!wasQuestion) {
                const childElements = Editor.ElementCreator.createQuestionChildElements(selectedElement);
                childElements.forEach(child => {
                    if (!page.elements) page.elements = [];
                    page.elements.push(child);
                });
            }
        }
        renderProperties(); // Re-render to show/hide answer type dropdown
        renderCanvas(); // Re-render to show/hide child elements
        autosaveQuiz();
    };
    questionLabel.appendChild(questionCheckbox);
    const questionText = document.createElement('span');
    questionText.textContent = 'Is Question';
    questionLabel.appendChild(questionText);
    questionGroup.appendChild(questionLabel);
    panel.appendChild(questionGroup);
    
    // Question title - only shown if element is a question
    if (selectedElement.is_question) {
        const titleGroup = document.createElement('div');
        titleGroup.className = 'property-group';
        const titleLabel = document.createElement('label');
        titleLabel.textContent = 'Question Title';
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.value = selectedElement.question_title || '';
        titleInput.style.width = '100%';
        titleInput.style.padding = '0.5rem';
        titleInput.style.border = '1px solid #ddd';
        titleInput.style.borderRadius = '4px';
        titleInput.onchange = () => {
            selectedElement.question_title = titleInput.value;
            renderCanvas(); // Re-render canvas to show updated title
            autosaveQuiz();
        };
        titleInput.oninput = () => {
            selectedElement.question_title = titleInput.value;
            renderCanvas(); // Re-render canvas to show updated title
            autosaveQuiz();
        };
        titleGroup.appendChild(titleLabel);
        titleGroup.appendChild(titleInput);
        panel.appendChild(titleGroup);
    }
    
    // Answer type dropdown - only shown if element is a question
    if (selectedElement.is_question) {
        const answerTypeGroup = document.createElement('div');
        answerTypeGroup.className = 'property-group';
        const answerTypeLabel = document.createElement('label');
        answerTypeLabel.textContent = 'Answer Type';
        const answerTypeSelect = document.createElement('select');
        answerTypeSelect.style.width = '100%';
        answerTypeSelect.style.padding = '0.5rem';
        answerTypeSelect.style.border = '1px solid #ddd';
        answerTypeSelect.style.borderRadius = '4px';
        
        const answerTypes = [
            { value: 'text', label: 'Text Box' },
            { value: 'radio', label: 'Multiple Choice' },
            { value: 'checkbox', label: 'Checkbox' },
            { value: 'image_click', label: 'Image Click' },
            { value: 'stopwatch', label: 'Stopwatch' }
        ];
        
        answerTypes.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            if (selectedElement.answer_type === option.value) {
                optionEl.selected = true;
            }
            answerTypeSelect.appendChild(optionEl);
        });
        
        answerTypeSelect.onchange = () => {
            const page = currentQuiz.pages[currentPageIndex];
            selectedElement.answer_type = answerTypeSelect.value;
            // Set default options for radio/checkbox
            if (selectedElement.answer_type === 'radio' || selectedElement.answer_type === 'checkbox') {
                if (!selectedElement.options) {
                    selectedElement.options = ['Option 1', 'Option 2', 'Option 3'];
                }
            } else {
                delete selectedElement.options;
            }
            
            // Update child answer_input elements
            if (page.elements) {
                page.elements.forEach(el => {
                    if (el.parent_id === selectedElement.id && el.type === 'answer_input') {
                        el.answer_type = selectedElement.answer_type;
                        el.options = selectedElement.options;
                    }
                });
            }
            
            renderProperties(); // Re-render to show/hide options
            renderCanvas(); // Re-render canvas to show updated answer input
            autosaveQuiz();
        };
        
        answerTypeGroup.appendChild(answerTypeLabel);
        answerTypeGroup.appendChild(answerTypeSelect);
        panel.appendChild(answerTypeGroup);

        // Options for radio/checkbox
        if (selectedElement.answer_type === 'radio' || selectedElement.answer_type === 'checkbox') {
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'property-group';
            optionsDiv.innerHTML = '<label>Options (one per line)</label>';
            const textarea = document.createElement('textarea');
            textarea.value = (selectedElement.options || []).join('\n');
            textarea.rows = 5;
            textarea.style.width = '100%';
            textarea.style.padding = '0.5rem';
            textarea.style.border = '1px solid #ddd';
            textarea.style.borderRadius = '4px';
            textarea.onchange = () => {
                const page = currentQuiz.pages[currentPageIndex];
                selectedElement.options = textarea.value.split('\n').filter(o => o.trim());
                
                // Update child answer elements' options
                if (page.elements) {
                    page.elements.forEach(el => {
                        if (el.parent_id === selectedElement.id && (el.type === 'answer_input' || el.type === 'answer_display')) {
                            el.options = selectedElement.options;
                        }
                    });
                }
                
                renderCanvas(); // Re-render to update child elements
                autosaveQuiz();
            };
            optionsDiv.appendChild(textarea);
            panel.appendChild(optionsDiv);
        }
    }
    } // End if statement for display view elements
    
    // Audio controls for audio/video elements (only on display view)
    if ((selectedElement.view === 'display' || !selectedElement.view) && 
        (selectedElement.type === 'audio' || selectedElement.media_type === 'audio' || 
         selectedElement.type === 'video' || selectedElement.media_type === 'video')) {
        const audioGroup = document.createElement('div');
        audioGroup.className = 'property-group';
        audioGroup.style.marginTop = '1rem';
        audioGroup.style.paddingTop = '1rem';
        audioGroup.style.borderTop = '1px solid #eee';
        
        const audioLabel = document.createElement('label');
        audioLabel.textContent = 'Audio Controls';
        audioLabel.style.display = 'block';
        audioLabel.style.marginBottom = '0.5rem';
        audioLabel.style.fontWeight = '500';
        audioGroup.appendChild(audioLabel);
        
        const audioContainer = document.createElement('div');
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = selectedElement.src || (selectedElement.filename ? '/api/media/serve/' + selectedElement.filename : '');
        audio.style.width = '100%';
        audioContainer.appendChild(audio);
        audioGroup.appendChild(audioContainer);
        panel.appendChild(audioGroup);
    }
    
    // Delete button
    const deleteGroup = document.createElement('div');
    deleteGroup.className = 'property-group';
    deleteGroup.style.marginTop = '1rem';
    deleteGroup.style.paddingTop = '1rem';
    deleteGroup.style.borderTop = '2px solid #eee';
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete Element';
    deleteButton.className = 'btn';
    deleteButton.style.width = '100%';
    deleteButton.style.padding = '0.75rem';
    deleteButton.style.backgroundColor = '#dc3545';
    deleteButton.style.color = 'white';
    deleteButton.style.border = 'none';
    deleteButton.style.borderRadius = '4px';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.fontWeight = 'bold';
    deleteButton.addEventListener('mouseenter', () => {
        deleteButton.style.backgroundColor = '#c82333';
    });
    deleteButton.addEventListener('mouseleave', () => {
        deleteButton.style.backgroundColor = '#dc3545';
    });
    deleteButton.addEventListener('click', () => {
        deleteSelectedElement();
    });
    deleteGroup.appendChild(deleteButton);
    panel.appendChild(deleteGroup);
}

function addPropertyInput(panel, label, value, onChange) {
    const group = document.createElement('div');
    group.className = 'property-group';
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value;
    input.onchange = () => onChange(input.value);
    group.appendChild(labelEl);
    group.appendChild(input);
    panel.appendChild(group);
}

function addPropertyTextarea(panel, label, value, onChange) {
    const group = document.createElement('div');
    group.className = 'property-group';
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.onchange = () => onChange(textarea.value);
    group.appendChild(labelEl);
    group.appendChild(textarea);
    panel.appendChild(group);
}

function updateElementDisplay() {
    const el = document.getElementById(`element-${selectedElement.id}`);
    if (el) {
        el.style.left = `${selectedElement.x}px`;
        el.style.top = `${selectedElement.y}px`;
        el.style.width = `${selectedElement.width}px`;
        el.style.height = `${selectedElement.height}px`;
        
        // If in participant view and this is a question element, also update the question container
        if (currentView === 'participant' && selectedElement.is_question) {
            const questionContainer = document.getElementById(`question-${selectedElement.id}`);
            if (questionContainer) {
                const headerOffset = 80;
                questionContainer.style.left = `${selectedElement.x}px`;
                questionContainer.style.top = `${selectedElement.y + headerOffset}px`;
            }
        }
        
        if (selectedElement.type === 'rectangle') {
            el.style.backgroundColor = selectedElement.fill_color || '#ddd';
            el.style.border = `${selectedElement.border_width || 2}px solid ${selectedElement.border_color || '#999'}`;
        } else if (selectedElement.type === 'circle') {
            el.style.backgroundColor = selectedElement.fill_color || '#ddd';
            el.style.border = `${selectedElement.border_width || 2}px solid ${selectedElement.border_color || '#999'}`;
        } else if (selectedElement.type === 'triangle') {
            el.innerHTML = '';
            const triangleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            triangleSvg.setAttribute('width', '100%');
            triangleSvg.setAttribute('height', '100%');
            triangleSvg.setAttribute('viewBox', `0 0 ${selectedElement.width} ${selectedElement.height}`);
            const trianglePath = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            trianglePath.setAttribute('points', `${selectedElement.width/2},0 ${selectedElement.width},${selectedElement.height} 0,${selectedElement.height}`);
            trianglePath.setAttribute('fill', selectedElement.fill_color || '#ddd');
            trianglePath.setAttribute('stroke', selectedElement.border_color || '#999');
            trianglePath.setAttribute('stroke-width', selectedElement.border_width || 2);
            triangleSvg.appendChild(trianglePath);
            el.appendChild(triangleSvg);
            el.style.border = 'none';
        } else if (selectedElement.type === 'arrow') {
            el.innerHTML = '';
            const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            arrowSvg.setAttribute('width', '100%');
            arrowSvg.setAttribute('height', '100%');
            arrowSvg.setAttribute('viewBox', `0 0 ${selectedElement.width} ${selectedElement.height}`);
            
            const arrowHeadLength = selectedElement.arrow_head_length || Math.min(selectedElement.width, selectedElement.height) * 0.3;
            const arrowBodyThickness = selectedElement.arrow_body_thickness || Math.min(selectedElement.width, selectedElement.height) * 0.2;
            const arrowBodyWidth = selectedElement.width - arrowHeadLength;
            const bodyTop = (selectedElement.height - arrowBodyThickness) / 2;
            const bodyBottom = bodyTop + arrowBodyThickness;
            
            // Create arrow path: body rectangle + triangle head
            const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            arrowPath.setAttribute('d', `M 0 ${bodyTop} L ${arrowBodyWidth} ${bodyTop} L ${arrowBodyWidth} 0 L ${selectedElement.width} ${selectedElement.height/2} L ${arrowBodyWidth} ${selectedElement.height} L ${arrowBodyWidth} ${bodyBottom} L 0 ${bodyBottom} Z`);
            arrowPath.setAttribute('fill', selectedElement.fill_color || '#ddd');
            arrowPath.setAttribute('stroke', selectedElement.border_color || '#999');
            arrowPath.setAttribute('stroke-width', selectedElement.border_width || 2);
            arrowSvg.appendChild(arrowPath);
            el.appendChild(arrowSvg);
            el.style.border = 'none';
        } else if (selectedElement.type === 'line') {
            el.style.width = `${Math.max(selectedElement.width, selectedElement.height)}px`;
            el.style.height = `${selectedElement.border_width || 2}px`;
            el.style.backgroundColor = selectedElement.fill_color || selectedElement.border_color || '#999';
            el.style.border = 'none';
        } else if (['image', 'video', 'audio'].includes(selectedElement.type)) {
            // No border for media elements
            el.style.border = 'none';
        } else if (selectedElement.type === 'richtext') {
            // Update rich text content immediately
            el.innerHTML = selectedElement.content || '<p>Enter your text here</p>';
            el.style.fontSize = `${selectedElement.font_size || 16}px`;
            el.style.color = selectedElement.text_color || '#000000';
            el.style.backgroundColor = selectedElement.background_color || 'transparent';
        }
        
        // Apply rotation
        if (selectedElement.rotation) {
            if (selectedElement.type === 'line') {
                el.style.transformOrigin = '0 0';
                el.style.transform = `rotate(${selectedElement.rotation}deg)`;
            } else {
                el.style.transform = `rotate(${selectedElement.rotation}deg)`;
                el.style.transformOrigin = 'center center';
            }
        } else {
            el.style.transform = '';
        }
        
        // Update handles
        el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
        if (el.classList.contains('selected')) {
            if (['rectangle', 'circle', 'triangle', 'arrow', 'line'].includes(selectedElement.type)) {
                addResizeHandles(el, selectedElement);
                addRotateHandle(el, selectedElement);
            } else if (['image', 'video', 'audio', 'richtext'].includes(selectedElement.type)) {
                addResizeHandles(el, selectedElement);
            }
        }
    }
}

// loadQuiz is now handled by Editor.QuizStorage module
// Function removed - using Editor.QuizStorage.loadQuiz instead

// debounce and autosaveQuiz are now handled by modules
// Functions removed - using Editor.Utils.debounce and Editor.QuizStorage.autosaveQuiz instead

function addResizeHandles(element, elementData) {
    if (!element.classList.contains('selected')) return;
    
    const handles = ['nw', 'ne', 'sw', 'se'];
    handles.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-${pos}`;
        handle.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: #2196F3;
            border: 2px solid white;
            border-radius: 50%;
            cursor: ${pos === 'nw' || pos === 'se' ? 'nwse-resize' : 'nesw-resize'};
            z-index: 1000;
        `;
        
        const positions = {
            nw: { top: '-5px', left: '-5px' },
            ne: { top: '-5px', right: '-5px' },
            sw: { bottom: '-5px', left: '-5px' },
            se: { bottom: '-5px', right: '-5px' }
        };
        
        Object.assign(handle.style, positions[pos]);
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight, startLeft, startTop;
        
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = elementData.width;
            startHeight = elementData.height;
            startLeft = elementData.x;
            startTop = elementData.y;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            if (pos.includes('e')) {
                elementData.width = Math.max(20, startWidth + dx);
            }
            if (pos.includes('w')) {
                const newWidth = Math.max(20, startWidth - dx);
                elementData.x = startLeft + (startWidth - newWidth);
                elementData.width = newWidth;
            }
            if (pos.includes('s')) {
                elementData.height = Math.max(20, startHeight + dy);
            }
            if (pos.includes('n')) {
                const newHeight = Math.max(20, startHeight - dy);
                elementData.y = startTop + (startHeight - newHeight);
                elementData.height = newHeight;
            }
            
            updateElementDisplay();
        });
        
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            autosaveQuiz();
        }
        isResizing = false;
    });
        
        element.appendChild(handle);
    });
}

function addRotateHandle(element, elementData) {
    if (!element.classList.contains('selected')) return;
    
    const handle = document.createElement('div');
    handle.className = 'rotate-handle';
    handle.style.cssText = `
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 20px;
        background: #4CAF50;
        border: 2px solid white;
        border-radius: 50%;
        cursor: grab;
        z-index: 1000;
    `;
    handle.innerHTML = '⟳';
    handle.style.fontSize = '14px';
    handle.style.display = 'flex';
    handle.style.alignItems = 'center';
    handle.style.justifyContent = 'center';
    
    let isRotating = false;
    let startAngle, startX, startY, centerX, centerY;
    
    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isRotating = true;
        const rect = element.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
        startX = e.clientX;
        startY = e.clientY;
        startAngle = elementData.rotation || 0;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isRotating) return;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const newAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        elementData.rotation = newAngle;
        updateElementDisplay();
    });
    
    document.addEventListener('mouseup', () => {
        if (isRotating) {
            autosaveQuiz();
        }
        isRotating = false;
    });
    
    element.appendChild(handle);
}

// Media modal and properties resize are now handled by modules
// Functions removed - using Editor.MediaModal and Editor.Utils instead

