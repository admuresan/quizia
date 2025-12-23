// Quiz preview page
let quiz = null;
let currentView = 'display';
let currentPageIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const quizName = window.quizName;
    if (!quizName) {
        console.error('Quiz name not found');
        return;
    }

    await loadQuiz(quizName);
    renderPreview();

    // Tab switching
    document.querySelectorAll('.preview-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentView = tab.dataset.view;
            document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderPreview();
        });
    });

    // Navigation controls
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPageIndex > 0) {
                currentPageIndex--;
                renderPreview();
                updateNavigationControls();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (quiz && quiz.pages && currentPageIndex < quiz.pages.length - 1) {
                currentPageIndex++;
                renderPreview();
                updateNavigationControls();
            }
        });
    }

    updateNavigationControls();
});

function updateNavigationControls() {
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');

    if (prevBtn) {
        prevBtn.disabled = currentPageIndex === 0;
    }
    if (nextBtn) {
        nextBtn.disabled = !quiz || !quiz.pages || currentPageIndex >= quiz.pages.length - 1;
    }
    if (pageInfo && quiz && quiz.pages) {
        const page = quiz.pages[currentPageIndex];
        const pageType = page?.type || 'question';
        pageInfo.textContent = `Page ${currentPageIndex + 1} of ${quiz.pages.length} (${pageType})`;
    }
}

async function loadQuiz(name) {
    try {
        const response = await fetch(`/api/quiz/load/${encodeURIComponent(name)}`);
        const data = await response.json();
        if (data.quiz) {
            quiz = data.quiz;
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
    }
}

function renderPreview() {
    const container = document.getElementById('preview-content');
    
    if (!quiz || !quiz.pages || quiz.pages.length === 0) {
        container.innerHTML = '<p>No pages in quiz</p>';
        updateNavigationControls();
        return;
    }

    const page = quiz.pages[currentPageIndex];
    if (!page) {
        container.innerHTML = '<p>Page not found</p>';
        updateNavigationControls();
        return;
    }

    // Handle special page types
    if (page.type === 'status') {
        renderStatusView(container);
        updateNavigationControls();
        return;
    }

    if (page.type === 'results') {
        renderResultsView(container);
        updateNavigationControls();
        return;
    }

    switch (currentView) {
        case 'display':
            renderDisplayView(container, page);
            break;
        case 'participant':
            renderParticipantView(container, page);
            break;
        case 'control':
            renderControlView(container, page);
            break;
    }

    updateNavigationControls();
}

function renderDisplayView(container, page) {
    container.innerHTML = '';
    // Set background immediately after clearing to prevent white flash
    container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
    container.style.setProperty('background-image', 'none', 'important');
    container.style.width = '100%';
    container.style.height = '600px';
    container.style.position = 'relative';

    // Render elements (only display view elements - matching editor view)
    if (page.elements) {
        const displayElements = page.elements.filter(el => (!el.view || el.view === 'display') && el.visible !== false);
        displayElements.forEach(element => {
            renderElement(container, element);
        });
    }
    
    // Set background again after all content is rendered to ensure it persists
    requestAnimationFrame(() => {
        container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
        container.style.setProperty('background-image', 'none', 'important');
    });
}

function renderElement(container, element) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = `${element.x}px`;
    el.style.top = `${element.y}px`;
    el.style.width = `${element.width}px`;
    el.style.height = `${element.height}px`;

    switch (element.type) {
        case 'text':
            // Use HTML content if available (rich text), otherwise use plain text
            if (element.html) {
                el.innerHTML = element.html;
            } else {
                el.textContent = element.text || '';
            }
            el.style.color = element.color || '#000';
            el.style.fontSize = `${element.font_size || 24}px`;
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.padding = '0.5rem';
            el.style.wordWrap = 'break-word';
            el.style.overflow = 'hidden';
            break;
        case 'image':
            const img = document.createElement('img');
            img.src = element.src || 'placeholder.png';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            el.appendChild(img);
            break;
        case 'video':
            const video = document.createElement('video');
            video.src = element.src || '';
            video.controls = true;
            video.style.width = '100%';
            video.style.height = '100%';
            el.appendChild(video);
            break;
        case 'audio':
            const audio = document.createElement('audio');
            audio.src = element.src || '';
            audio.controls = true;
            el.appendChild(audio);
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
            // Use SVG for arrow
            const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            arrowSvg.setAttribute('width', '100%');
            arrowSvg.setAttribute('height', '100%');
            arrowSvg.setAttribute('viewBox', `0 0 ${element.width} ${element.height}`);
            const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const arrowPoints = `M 0,${element.height/2} L ${element.width*0.7},${element.height/2} L ${element.width*0.7},0 L ${element.width},${element.height/2} L ${element.width*0.7},${element.height} L ${element.width*0.7},${element.height/2}`;
            arrowPath.setAttribute('d', arrowPoints);
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
    }

    // Apply rotation for all elements except line (which handles it internally)
    if (element.type !== 'line' && element.rotation) {
        el.style.transform = `rotate(${element.rotation}deg)`;
        el.style.transformOrigin = 'center center';
    }

    container.appendChild(el);
}

function renderParticipantView(container, page) {
    container.innerHTML = '';
    // Set background immediately after clearing to prevent white flash
    container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
    container.style.setProperty('background-image', 'none', 'important');
    container.style.padding = '2rem';
    container.style.width = '100%';
    container.style.height = '600px';
    container.style.position = 'relative';

    const questionElements = page.elements?.filter(el => el.is_question) || [];

    if (questionElements.length === 0) {
        container.innerHTML = '<p>No questions on this page</p>';
        // Set background again after content
        requestAnimationFrame(() => {
            container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
            container.style.setProperty('background-image', 'none', 'important');
        });
        return;
    }

    questionElements.forEach(question => {
        const div = document.createElement('div');
        div.id = `question-${question.id}`;
        div.style.marginBottom = '2rem';
        div.style.padding = '1rem';
        div.style.background = '#f5f5f5';
        div.style.borderRadius = '8px';

        // Show question text/prompt
        if (question.html) {
            const prompt = document.createElement('div');
            prompt.innerHTML = question.html;
            prompt.style.marginBottom = '1rem';
            prompt.style.fontWeight = 'bold';
            div.appendChild(prompt);
        } else if (question.text) {
            const prompt = document.createElement('div');
            prompt.textContent = question.text;
            prompt.style.marginBottom = '1rem';
            prompt.style.fontWeight = 'bold';
            div.appendChild(prompt);
        }

        // Render answer input based on type
        const answerType = question.answer_type || 'text';
        
        switch (answerType) {
            case 'text':
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = 'Type your answer...';
                input.style.width = '100%';
                input.style.padding = '0.5rem';
                input.style.border = '1px solid #ddd';
                input.style.borderRadius = '4px';
                div.appendChild(input);
                break;
            case 'radio':
                const optionsDiv = document.createElement('div');
                optionsDiv.style.display = 'flex';
                optionsDiv.style.flexDirection = 'column';
                optionsDiv.style.gap = '0.5rem';
                question.options?.forEach(option => {
                    const label = document.createElement('label');
                    label.style.display = 'flex';
                    label.style.alignItems = 'center';
                    label.style.gap = '0.5rem';
                    label.style.cursor = 'pointer';
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = `question-${question.id}`;
                    radio.value = option;
                    label.appendChild(radio);
                    label.appendChild(document.createTextNode(option));
                    optionsDiv.appendChild(label);
                });
                div.appendChild(optionsDiv);
                break;
            case 'checkbox':
                const checkboxesDiv = document.createElement('div');
                checkboxesDiv.style.display = 'flex';
                checkboxesDiv.style.flexDirection = 'column';
                checkboxesDiv.style.gap = '0.5rem';
                question.options?.forEach(option => {
                    const label = document.createElement('label');
                    label.style.display = 'flex';
                    label.style.alignItems = 'center';
                    label.style.gap = '0.5rem';
                    label.style.cursor = 'pointer';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = option;
                    label.appendChild(checkbox);
                    label.appendChild(document.createTextNode(option));
                    checkboxesDiv.appendChild(label);
                });
                div.appendChild(checkboxesDiv);
                break;
            case 'image':
                if (question.image_src) {
                    const imgContainer = document.createElement('div');
                    imgContainer.style.position = 'relative';
                    imgContainer.style.marginBottom = '1rem';
                    const img = document.createElement('img');
                    img.src = question.image_src;
                    img.style.width = '100%';
                    img.style.cursor = 'crosshair';
                    img.style.border = '2px solid #ddd';
                    img.style.borderRadius = '4px';
                    imgContainer.appendChild(img);
                    div.appendChild(imgContainer);
                    div.appendChild(document.createTextNode('(Click on the image to select your answer)'));
                }
                break;
            case 'stopwatch':
                div.appendChild(document.createTextNode('(Stopwatch - submit when ready)'));
                break;
        }

        container.appendChild(div);
    });
    
    // Set background again after all content is rendered to ensure it persists
    requestAnimationFrame(() => {
        container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
        container.style.setProperty('background-image', 'none', 'important');
    });
}

function renderControlView(container, page) {
    container.innerHTML = '';
    // Set background immediately after clearing to prevent white flash
    container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
    container.style.setProperty('background-image', 'none', 'important');
    container.style.width = '100%';
    container.style.height = '600px';
    container.style.position = 'relative';
    
    // Render control view elements (audio/video controls, answer displays)
    if (page.elements) {
        const controlElements = page.elements.filter(el => el.view === 'control');
        controlElements.forEach(element => {
            const el = document.createElement('div');
            el.style.position = 'absolute';
            el.style.left = `${element.x}px`;
            el.style.top = `${element.y}px`;
            el.style.width = `${element.width}px`;
            el.style.height = `${element.height}px`;
            
            if (element.type === 'audio_control') {
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
            } else if (element.type === 'answer_display') {
                el.style.backgroundColor = '#fff3e0';
                el.style.border = '2px dashed #ff9800';
                el.style.borderRadius = '4px';
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.style.fontSize = '0.9rem';
                el.style.color = '#666';
                el.textContent = `Answer Display (${element.answer_type || 'text'})`;
            }
            
            container.appendChild(el);
        });
    }
    
    // Set background again after all content is rendered to ensure it persists
    requestAnimationFrame(() => {
        container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
        container.style.setProperty('background-image', 'none', 'important');
    });
}

function renderStatusView(container) {
    container.innerHTML = '<div style="padding: 2rem;"><h2>Status Page</h2><p>This page shows current rankings during the quiz.</p></div>';
    // Set background immediately
    container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
    container.style.setProperty('background-image', 'none', 'important');
    // Set again after paint to ensure it sticks
    requestAnimationFrame(() => {
        container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
        container.style.setProperty('background-image', 'none', 'important');
    });
}

function renderResultsView(container) {
    container.innerHTML = '<div style="padding: 2rem;"><h2>Final Results Page</h2><p>This page shows the final results at the end of the quiz.</p></div>';
    // Set background immediately
    container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
    container.style.setProperty('background-image', 'none', 'important');
    // Set again after paint to ensure it sticks
    requestAnimationFrame(() => {
        container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
        container.style.setProperty('background-image', 'none', 'important');
    });
}

