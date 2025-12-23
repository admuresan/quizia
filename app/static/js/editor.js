// Quiz editor
let currentQuiz = {
    name: '',
    pages: [],
    background_color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    background_image: null
};
let currentPageIndex = 0;
let selectedElement = null;
let currentView = 'display'; // 'display', 'participant', or 'control'

document.addEventListener('DOMContentLoaded', () => {
    // Load quiz if editing
    const urlParams = new URLSearchParams(window.location.search);
    const quizName = urlParams.get('quiz');
    if (quizName) {
        loadQuiz(quizName);
    }

    // Initialize
    if (currentQuiz.pages.length === 0) {
        addPage('display');
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
    document.getElementById('add-page-btn').addEventListener('click', () => {
        addPage('display');
        renderPages();
        renderCanvas();
    });

    document.getElementById('add-status-page-btn').addEventListener('click', () => {
        addPage('status');
        renderPages();
        renderCanvas();
    });

    document.getElementById('add-results-page-btn').addEventListener('click', () => {
        addPage('results');
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
    initMediaModal();
    
    // Properties panel resize
    initPropertiesResize();
    
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

function addPage(type) {
    // Generate default page name based on type
    let defaultName = '';
    if (type === 'status') {
        defaultName = 'Status Page';
    } else if (type === 'results') {
        defaultName = 'Results Page';
    } else {
        const pageNumber = currentQuiz.pages.filter(p => p.type === 'display').length + 1;
        defaultName = `Page ${pageNumber}`;
    }
    
    const page = {
        type: type,
        name: defaultName,
        elements: [],
        background_color: currentQuiz.background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        background_image: null
    };
    
    // Auto-populate status page with template
    if (type === 'status') {
        // Podium at top
        page.elements.push({
            id: `status-podium-${Date.now()}`,
            type: 'text',
            x: 50,
            y: 50,
            width: 900,
            height: 300,
            text: 'PODIUM',
            html: '<div style="text-align: center; font-size: 48px; font-weight: bold; color: #FFD700;">🥇 🥈 🥉<br>PODIUM</div>',
            visible: true,
            is_question: false
        });
        
        // Participant table below
        page.elements.push({
            id: `status-table-${Date.now()}`,
            type: 'text',
            x: 50,
            y: 400,
            width: 900,
            height: 400,
            text: 'PARTICIPANT TABLE',
            html: '<div style="text-align: center; font-size: 36px; font-weight: bold;">📊 PARTICIPANT RANKINGS TABLE</div>',
            visible: true,
            is_question: false
        });
    }
    
    // Auto-populate results page with template
    if (type === 'results') {
        // Winner section (left half) with confetti/fireworks
        page.elements.push({
            id: `results-winner-${Date.now()}`,
            type: 'text',
            x: 50,
            y: 50,
            width: 450,
            height: 700,
            text: 'WINNER',
            html: '<div style="text-align: center; padding: 2rem;"><div style="font-size: 120px;">🎉</div><div style="font-size: 64px; margin: 1rem 0;">👤</div><div style="font-size: 48px; font-weight: bold; margin: 1rem 0;">WINNER NAME</div><div style="font-size: 36px; margin-top: 1rem;">🏆 CHAMPION 🏆</div></div>',
            visible: true,
            is_question: false
        });
        
        // Rankings list (right half)
        page.elements.push({
            id: `results-rankings-${Date.now()}`,
            type: 'text',
            x: 550,
            y: 50,
            width: 450,
            height: 700,
            text: 'RANKINGS',
            html: '<div style="padding: 2rem;"><div style="font-size: 36px; font-weight: bold; margin-bottom: 1rem;">📋 RANKINGS</div><div style="font-size: 24px; line-height: 2;">2nd Place - Name<br>3rd Place - Name<br>4th Place - Name<br>5th Place - Name<br>...</div></div>',
            visible: true,
            is_question: false
        });
    }
    
    currentQuiz.pages.push(page);
    currentPageIndex = currentQuiz.pages.length - 1;
    
    // Autosave after adding page
    autosaveQuiz();
}

function renderPages() {
    const list = document.getElementById('pages-list');
    list.innerHTML = '';
    
    currentQuiz.pages.forEach((page, index) => {
        const item = document.createElement('div');
        item.className = 'page-item';
        if (index === currentPageIndex) {
            item.classList.add('active');
        }
        
        // Create container for page content
        const pageContent = document.createElement('div');
        pageContent.style.display = 'flex';
        pageContent.style.alignItems = 'center';
        pageContent.style.justifyContent = 'space-between';
        pageContent.style.width = '100%';
        pageContent.style.gap = '0.5rem';
        
        // Arrow buttons container (stacked vertically, before page name)
        const arrowButtonsContainer = document.createElement('div');
        arrowButtonsContainer.style.display = 'flex';
        arrowButtonsContainer.style.flexDirection = 'column';
        arrowButtonsContainer.style.gap = '0.1rem';
        arrowButtonsContainer.style.alignItems = 'center';
        
        // Move up button
        const moveUpBtn = document.createElement('button');
        moveUpBtn.innerHTML = '↑';
        moveUpBtn.className = 'page-move-btn';
        moveUpBtn.title = 'Move up';
        moveUpBtn.disabled = index === 0;
        moveUpBtn.style.cssText = 'padding: 0.15rem 0.3rem; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 0.75rem; min-width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;';
        
        // Style for active page
        if (index === currentPageIndex) {
            moveUpBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            moveUpBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            moveUpBtn.style.color = 'white';
        }
        
        moveUpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (index > 0) {
                // Swap pages
                [currentQuiz.pages[index - 1], currentQuiz.pages[index]] = 
                    [currentQuiz.pages[index], currentQuiz.pages[index - 1]];
                // Update current page index if needed
                if (currentPageIndex === index) {
                    currentPageIndex = index - 1;
                } else if (currentPageIndex === index - 1) {
                    currentPageIndex = index;
                }
                renderPages();
                renderCanvas();
                autosaveQuiz();
            }
        });
        arrowButtonsContainer.appendChild(moveUpBtn);
        
        // Move down button
        const moveDownBtn = document.createElement('button');
        moveDownBtn.innerHTML = '↓';
        moveDownBtn.className = 'page-move-btn';
        moveDownBtn.title = 'Move down';
        moveDownBtn.disabled = index === currentQuiz.pages.length - 1;
        moveDownBtn.style.cssText = 'padding: 0.15rem 0.3rem; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 0.75rem; min-width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;';
        
        // Style for active page
        if (index === currentPageIndex) {
            moveDownBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            moveDownBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            moveDownBtn.style.color = 'white';
        }
        
        moveDownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (index < currentQuiz.pages.length - 1) {
                // Swap pages
                [currentQuiz.pages[index], currentQuiz.pages[index + 1]] = 
                    [currentQuiz.pages[index + 1], currentQuiz.pages[index]];
                // Update current page index if needed
                if (currentPageIndex === index) {
                    currentPageIndex = index + 1;
                } else if (currentPageIndex === index + 1) {
                    currentPageIndex = index;
                }
                renderPages();
                renderCanvas();
                autosaveQuiz();
            }
        });
        arrowButtonsContainer.appendChild(moveDownBtn);
        
        pageContent.appendChild(arrowButtonsContainer);
        
        // Page name (clickable to select page)
        const pageNameContainer = document.createElement('div');
        pageNameContainer.style.flex = '1';
        pageNameContainer.style.minWidth = '0';
        pageNameContainer.style.cursor = 'pointer';
        
        const pageNameInput = document.createElement('input');
        pageNameInput.type = 'text';
        pageNameInput.value = page.name || `Page ${index + 1} (${page.type})`;
        pageNameInput.className = 'page-name-input';
        pageNameInput.readOnly = true;
        pageNameInput.style.cssText = 'width: 100%; padding: 0.25rem; border: 1px solid transparent; background: transparent; font-size: 0.9rem; cursor: pointer;';
        if (index === currentPageIndex) {
            pageNameInput.style.color = 'white';
        }
        
        // Track editing state
        let isEditing = false;
        
        // Function to start editing
        const startEditing = () => {
            isEditing = true;
            pageNameInput.readOnly = false;
            pageNameInput.style.border = '1px solid #2196F3';
            pageNameInput.style.background = 'white';
            pageNameInput.style.color = '#333';
            pageNameInput.style.cursor = 'text';
            pageNameInput.focus();
            pageNameInput.select();
        };
        
        // Function to stop editing
        const stopEditing = () => {
            isEditing = false;
            pageNameInput.readOnly = true;
            page.name = pageNameInput.value.trim() || pageNameInput.value || `Page ${index + 1} (${page.type})`;
            pageNameInput.value = page.name;
            pageNameInput.style.border = '1px solid transparent';
            pageNameInput.style.background = 'transparent';
            if (index === currentPageIndex) {
                pageNameInput.style.color = 'white';
            } else {
                pageNameInput.style.color = '#333';
            }
            pageNameInput.style.cursor = 'pointer';
            autosaveQuiz();
        };
        
        // Click on page name to select page (not edit)
        pageNameContainer.addEventListener('click', (e) => {
            if (!isEditing && (e.target === pageNameContainer || e.target === pageNameInput)) {
                e.stopPropagation();
                currentPageIndex = index;
                renderPages();
                renderCanvas();
            }
        });
        
        // Handle blur to stop editing
        pageNameInput.addEventListener('blur', () => {
            if (isEditing) {
                stopEditing();
            }
        });
        
        // Handle keyboard events
        pageNameInput.addEventListener('keydown', (e) => {
            if (isEditing) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    stopEditing();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    pageNameInput.value = page.name || `Page ${index + 1} (${page.type})`;
                    stopEditing();
                }
            }
        });
        
        pageNameContainer.appendChild(pageNameInput);
        pageContent.appendChild(pageNameContainer);
        
        // Action buttons container (edit and delete)
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '0.25rem';
        buttonsContainer.style.alignItems = 'center';
        
        // Edit button (to rename page)
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '✏️';
        editBtn.className = 'page-edit-btn';
        editBtn.title = 'Rename page';
        editBtn.style.cssText = 'padding: 0.15rem 0.3rem; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 0.75rem; min-width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; color: #2196F3;';
        
        // Style for active page
        if (index === currentPageIndex) {
            editBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            editBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            editBtn.style.color = '#90CAF9';
        }
        
        editBtn.addEventListener('mouseenter', () => {
            if (index === currentPageIndex) {
                editBtn.style.background = 'rgba(255, 255, 255, 0.3)';
            } else {
                editBtn.style.background = '#e3f2fd';
            }
        });
        
        editBtn.addEventListener('mouseleave', () => {
            if (index === currentPageIndex) {
                editBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            } else {
                editBtn.style.background = 'white';
            }
        });
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startEditing();
        });
        
        buttonsContainer.appendChild(editBtn);
        
        // Delete button (trash can icon)
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.className = 'page-delete-btn';
        deleteBtn.title = 'Delete page';
        deleteBtn.style.cssText = 'padding: 0.15rem 0.3rem; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 0.75rem; min-width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; color: #dc3545;';
        deleteBtn.disabled = currentQuiz.pages.length === 1; // Don't allow deleting the last page
        
        // Style for active page
        if (index === currentPageIndex) {
            deleteBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            deleteBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            deleteBtn.style.color = '#ff6b6b';
        }
        
        deleteBtn.addEventListener('mouseenter', () => {
            if (!deleteBtn.disabled) {
                deleteBtn.style.background = '#dc3545';
                deleteBtn.style.color = 'white';
            }
        });
        
        deleteBtn.addEventListener('mouseleave', () => {
            if (index === currentPageIndex) {
                deleteBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                deleteBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                deleteBtn.style.color = '#ff6b6b';
            } else {
                deleteBtn.style.background = 'white';
                deleteBtn.style.color = '#dc3545';
            }
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentQuiz.pages.length === 1) {
                alert('Cannot delete the last page');
                return;
            }
            
            if (confirm(`Are you sure you want to delete "${page.name || `Page ${index + 1}`}"?`)) {
                // Remove the page
                currentQuiz.pages.splice(index, 1);
                
                // Adjust current page index
                if (currentPageIndex >= index) {
                    if (currentPageIndex > 0) {
                        currentPageIndex--;
                    } else {
                        currentPageIndex = 0;
                    }
                }
                
                // Ensure currentPageIndex is valid
                if (currentPageIndex >= currentQuiz.pages.length) {
                    currentPageIndex = currentQuiz.pages.length - 1;
                }
                
                renderPages();
                renderCanvas();
                autosaveQuiz();
            }
        });
        
        buttonsContainer.appendChild(deleteBtn);
        
        pageContent.appendChild(buttonsContainer);
        item.appendChild(pageContent);
        list.appendChild(item);
    });
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

    // Filter elements by current view
    // Elements with view property matching currentView, or parent elements on display view
    let elementsToRender = [];
    if (currentView === 'display') {
        // Display view shows all elements without a view property or with view='display'
        elementsToRender = page.elements.filter(el => !el.view || el.view === 'display');
    } else {
        // Participant and control views show elements with matching view
        elementsToRender = page.elements.filter(el => el.view === currentView);
    }

    // Render elements
    elementsToRender.forEach(element => {
        renderElementOnCanvas(canvas, element);
    });

    // Render properties
    renderProperties();
}

function renderElementOnCanvas(canvas, element) {
    const el = document.createElement('div');
    el.className = 'canvas-element';
    el.id = `element-${element.id}`;
    el.style.left = `${element.x}px`;
    el.style.top = `${element.y}px`;
    el.style.width = `${element.width}px`;
    el.style.height = `${element.height}px`;
    
    // Make draggable
    makeDraggable(el, element);
    
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
            
            const filenameLabel = document.createElement('label');
            filenameLabel.textContent = element.filename || (element.media_type === 'video' ? 'Video' : 'Audio');
            filenameLabel.style.fontWeight = '500';
            filenameLabel.style.fontSize = '0.9rem';
            el.appendChild(filenameLabel);
            
            if (element.media_type === 'video') {
                const videoControl = document.createElement('video');
                videoControl.controls = true;
                videoControl.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : '');
                videoControl.style.width = '100%';
                el.appendChild(videoControl);
            } else {
                const audioControl = document.createElement('audio');
                audioControl.controls = true;
                audioControl.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : '');
                audioControl.style.width = '100%';
                el.appendChild(audioControl);
            }
            break;
        case 'answer_input':
            // Answer input element for participant view
            el.style.backgroundColor = '#e3f2fd';
            el.style.border = '2px dashed #2196F3';
            el.style.borderRadius = '4px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.fontSize = '0.9rem';
            el.style.color = '#666';
            el.textContent = `Answer Input (${element.answer_type || 'text'})`;
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
    
    // Add resize handles for child elements (audio_control, answer_input, answer_display)
    if (['audio_control', 'answer_input', 'answer_display'].includes(element.type)) {
        addResizeHandles(el, element);
    }

    canvas.appendChild(el);
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

// Helper function to create audio/video control child elements
function createMediaControlElement(parentElement) {
    const isAudio = parentElement.type === 'audio' || parentElement.media_type === 'audio';
    const isVideo = parentElement.type === 'video' || parentElement.media_type === 'video';
    
    if (!isAudio && !isVideo) return null;
    
    return {
        id: `element-${Date.now()}-control`,
        type: 'audio_control',  // Use same type for both audio and video controls
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
}

// Helper function to create question answer child elements
function createQuestionChildElements(parentElement) {
    const childElements = [];
    
    // Answer element for participant view
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
    
    // Answer display/marking element for control view
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
}

function addElement(type, x, y) {
    const page = currentQuiz.pages[currentPageIndex];
    if (!page) return;

    // Only allow adding elements to display view
    if (currentView !== 'display') {
        alert('Elements can only be added to the Display view');
        return;
    }

    // Prevent adding text elements (removed feature)
    if (type === 'text') {
        return;
    }

    // Handle media type - open modal
    if (type === 'media') {
        openMediaModal((selectedMedia) => {
            const element = {
                id: `element-${Date.now()}`,
                type: selectedMedia.media_type,
                media_type: selectedMedia.media_type,
                view: 'display',  // Elements on display view
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
            
            // Create audio/video control child elements
            const controlElement = createMediaControlElement(element);
            if (controlElement) {
                page.elements.push(controlElement);
            }
            
            renderCanvas();
            selectElement(element);
        });
        return;
    }

    const element = {
        id: `element-${Date.now()}`,
        type: type,
        view: 'display',  // Elements added to display view
        x: x,
        y: y,
        width: 200,
        height: 100,
        visible: true,
        is_question: false,
        answer_type: 'text',
        rotation: 0
    };

    // Set defaults based on type
    if (['rectangle', 'circle', 'triangle', 'arrow', 'line'].includes(type)) {
        element.fill_color = '#ddd';
        element.border_color = '#999';
        element.border_width = 2;
        if (type === 'line') {
            element.width = 200;
            element.height = 2;
        } else if (type === 'arrow') {
            // Set default arrow properties
            element.arrow_body_thickness = 20;
            element.arrow_head_length = 30;
        }
    }

    if (!page.elements) {
        page.elements = [];
    }
    page.elements.push(element);
    
    // Create audio/video control child elements (only for media elements)
    // Note: Question answer elements are created when is_question is toggled
    
    renderCanvas();
    selectElement(element);
    autosaveQuiz();
}

function selectElement(element) {
    selectedElement = element;
    document.querySelectorAll('.canvas-element').forEach(el => {
        el.classList.remove('selected');
        el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
    });
    const el = document.getElementById(`element-${element.id}`);
    if (el) {
        el.classList.add('selected');
        if (['rectangle', 'circle', 'triangle', 'arrow', 'line'].includes(element.type)) {
            addResizeHandles(el, element);
            addRotateHandle(el, element);
        } else if (['image', 'video', 'audio'].includes(element.type)) {
            addResizeHandles(el, element);
        }
    }
    renderProperties();
}

function deleteSelectedElement() {
    if (!selectedElement) return;
    
    const page = currentQuiz.pages[currentPageIndex];
    if (!page || !page.elements) return;
    
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
    const questionLabel = document.createElement('label');
    questionLabel.style.display = 'flex';
    questionLabel.style.alignItems = 'center';
    questionLabel.style.gap = '0.25rem';
    questionLabel.style.cursor = 'pointer';
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
                const childElements = createQuestionChildElements(selectedElement);
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
            selectedElement.answer_type = answerTypeSelect.value;
            // Set default options for radio/checkbox
            if (selectedElement.answer_type === 'radio' || selectedElement.answer_type === 'checkbox') {
                if (!selectedElement.options) {
                    selectedElement.options = ['Option 1', 'Option 2', 'Option 3'];
                }
            } else {
                delete selectedElement.options;
            }
            renderProperties(); // Re-render to show/hide options
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
            } else if (['image', 'video', 'audio'].includes(selectedElement.type)) {
                addResizeHandles(el, selectedElement);
            }
        }
    }
}

async function loadQuiz(name) {
    try {
        const response = await fetch(`/api/quiz/load/${encodeURIComponent(name)}`);
        const data = await response.json();
        if (data.quiz) {
            currentQuiz = data.quiz;
            document.getElementById('quiz-name').value = currentQuiz.name;
            
            // Ensure all pages have names
            if (currentQuiz.pages) {
                currentQuiz.pages.forEach((page, index) => {
                    if (!page.name) {
                        if (page.type === 'status') {
                            page.name = 'Status Page';
                        } else if (page.type === 'results') {
                            page.name = 'Results Page';
                        } else {
                            const pageNumber = currentQuiz.pages.slice(0, index + 1).filter(p => p.type === 'display').length;
                            page.name = `Page ${pageNumber}`;
                        }
                    }
                });
            }
            
            currentPageIndex = 0;
            renderPages();
            renderCanvas();
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
    }
}

let autosaveTimeout = null;

function debounce(func, wait) {
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(autosaveTimeout);
            func(...args);
        };
        clearTimeout(autosaveTimeout);
        autosaveTimeout = setTimeout(later, wait);
    };
}

async function autosaveQuiz() {
    const name = document.getElementById('quiz-name').value.trim();
    if (!name) {
        return; // Don't save if no name
    }

    currentQuiz.name = name;
    const saveStatus = document.getElementById('save-status');
    
    if (saveStatus) {
        saveStatus.textContent = 'Saving...';
        saveStatus.style.color = '#2196F3';
    }

    try {
        const response = await fetch('/api/quiz/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                quiz: currentQuiz
            })
        });

        const data = await response.json();
        if (response.ok) {
            if (saveStatus) {
                saveStatus.textContent = 'Saved';
                saveStatus.style.color = '#4CAF50';
                setTimeout(() => {
                    if (saveStatus) {
                        saveStatus.textContent = 'Saved';
                        saveStatus.style.color = '#666';
                    }
                }, 2000);
            }
        } else {
            if (saveStatus) {
                saveStatus.textContent = 'Error';
                saveStatus.style.color = '#f44336';
            }
        }
    } catch (error) {
        if (saveStatus) {
            saveStatus.textContent = 'Error';
            saveStatus.style.color = '#f44336';
        }
    }
}

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

function initMediaModal() {
    const modal = document.getElementById('media-modal');
    const closeBtn = document.getElementById('media-modal-close');
    const tabs = document.querySelectorAll('.modal-tab');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`media-tab-${tabName}`).classList.add('active');
            loadMediaForTab(tabName);
        });
    });
    
    // Upload handlers
    ['image', 'audio', 'video'].forEach(type => {
        const uploadBtn = document.getElementById(`upload-${type}-btn`);
        const uploadFile = document.getElementById(`upload-${type}-file`);
        
        uploadBtn.addEventListener('click', () => uploadFile.click());
        
        uploadFile.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await uploadMediaFile(file, type);
            }
            loadMediaForTab(type);
        });
    });
}

let mediaModalCallback = null;

function openMediaModal(callback) {
    mediaModalCallback = callback;
    const modal = document.getElementById('media-modal');
    modal.style.display = 'flex';
    loadMediaForTab('images');
}

async function loadMediaForTab(tabType) {
    try {
        const response = await fetch('/api/media/list');
        const data = await response.json();
        
        const checkResponse = await fetch('/api/auth/check');
        const checkData = await checkResponse.json();
        const currentUsername = checkData.username;
        
        const myList = document.getElementById(`my-${tabType}-list`);
        const publicList = document.getElementById(`public-${tabType}-list`);
        
        myList.innerHTML = '';
        publicList.innerHTML = '';
        
        const fileTypes = {
            images: ['jpg', 'jpeg', 'png', 'gif', 'svg'],
            audio: ['mp3', 'wav', 'ogg'],
            video: ['mp4', 'webm']
        };
        
        const myMedia = data.files.filter(f => {
            const ext = f.filename.split('.').pop().toLowerCase();
            return f.creator === currentUsername && fileTypes[tabType].includes(ext);
        });
        
        const publicMedia = data.files.filter(f => {
            const ext = f.filename.split('.').pop().toLowerCase();
            return f.public && f.creator !== currentUsername && fileTypes[tabType].includes(ext);
        });
        
        myMedia.forEach(file => {
            const item = createMediaItem(file, tabType);
            myList.appendChild(item);
        });
        
        publicMedia.forEach(file => {
            const item = createMediaItem(file, tabType);
            publicList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading media:', error);
    }
}

function createMediaItem(file, tabType) {
    const item = document.createElement('div');
    item.className = 'media-item';
    item.style.cssText = 'padding: 0.5rem; border: 1px solid #ddd; margin: 0.5rem 0; cursor: pointer; border-radius: 4px;';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '0.5rem';
    
    if (tabType === 'images') {
        const img = document.createElement('img');
        img.src = `/api/media/serve/${file.filename}`;
        img.style.width = '50px';
        img.style.height = '50px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        item.appendChild(img);
    } else if (tabType === 'video') {
        const icon = document.createElement('div');
        icon.innerHTML = '▶';
        icon.style.fontSize = '24px';
        item.appendChild(icon);
    } else if (tabType === 'audio') {
        const icon = document.createElement('div');
        icon.innerHTML = '🔊';
        icon.style.fontSize = '24px';
        item.appendChild(icon);
    }
    
    const name = document.createElement('span');
    name.textContent = file.original_name;
    item.appendChild(name);
    
    item.addEventListener('click', () => {
        const mediaType = tabType === 'images' ? 'image' : tabType;
        mediaModalCallback({
            media_type: mediaType,
            url: `/api/media/serve/${file.filename}`,
            filename: file.filename
        });
        document.getElementById('media-modal').style.display = 'none';
    });
    
    return item;
}

async function uploadMediaFile(file, type) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('public', 'false');
    
    try {
        const response = await fetch('/api/media/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (!response.ok) {
            alert(`Error uploading ${file.name}: ${data.error}`);
        }
    } catch (error) {
        alert(`Error uploading ${file.name}`);
    }
}

function initPropertiesResize() {
    const resizeHandle = document.querySelector('.properties-resize-handle');
    const propertiesPanel = document.querySelector('.editor-properties');
    
    if (!resizeHandle || !propertiesPanel) return;
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(window.getComputedStyle(propertiesPanel).width, 10);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const diff = startX - e.clientX; // Reverse because we're resizing from the left
        const newWidth = startWidth + diff;
        const minWidth = 200;
        const maxWidth = 600;
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            propertiesPanel.style.width = `${newWidth}px`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

