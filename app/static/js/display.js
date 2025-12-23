// Display page (for large screen)
const socket = io();
let currentPage = null;
let roomCode = null;
let participants = {};

document.addEventListener('DOMContentLoaded', () => {
    roomCode = window.roomCode;
    if (!roomCode) {
        console.error('Room code not found');
        return;
    }

    socket.on('connect', () => {
        socket.emit('display_join', { room_code: roomCode });
    });

    socket.on('display_state', (data) => {
        renderPage(data.current_page, data.page);
    });

    socket.on('page_changed', (data) => {
        renderPage(data.page_index, data.page);
    });

    socket.on('element_control', (data) => {
        handleElementControl(data.element_id, data.action);
    });

    socket.on('quiz_ended', (data) => {
        renderFinalResults(data.final_rankings);
    });

    socket.on('participant_joined', (data) => {
        participants[data.participant_id] = data;
    });

    socket.on('score_updated', (data) => {
        updateStatusPage(data.scores);
    });
});

function renderPage(pageIndex, page) {
    const container = document.getElementById('display-content');
    
    if (!page) {
        container.innerHTML = '<div class="display-text">Waiting for quiz to start...</div>';
        return;
    }

    if (page.type === 'status') {
        renderStatusPage(container);
        return;
    }

    if (page.type === 'results') {
        renderFinalResultsPage(container);
        return;
    }

    // Render question/display page
    container.innerHTML = '';
    // Use gradient blue background from main page
    container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
    container.style.setProperty('background-image', 'none', 'important');

    // Render elements (only display view elements - matching editor view)
    if (page.elements) {
        // Filter to only show display view elements (elements without view property or with view='display')
        const displayElements = page.elements.filter(el => (!el.view || el.view === 'display') && el.visible !== false);
        displayElements.forEach(element => {
            renderElement(container, element);
        });
    }
}

function renderElement(container, element) {
    const el = document.createElement('div');
    el.className = 'display-element';
    el.id = `element-${element.id}`;
    el.style.left = `${element.x}px`;
    el.style.top = `${element.y}px`;
    el.style.width = `${element.width}px`;
    el.style.height = `${element.height}px`;

    switch (element.type) {
        case 'text':
            el.className += ' display-text';
            // Use HTML content if available (rich text), otherwise use plain text
            if (element.html) {
                el.innerHTML = element.html;
            } else {
                el.textContent = element.text || '';
            }
            el.style.fontSize = `${element.font_size || 24}px`;
            el.style.color = element.color || '#fff';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.padding = '0.5rem';
            el.style.wordWrap = 'break-word';
            el.style.overflow = 'hidden';
            break;
        case 'image':
            const img = document.createElement('img');
            img.src = element.src;
            img.className = 'display-image';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            el.appendChild(img);
            break;
        case 'video':
            const video = document.createElement('video');
            video.src = element.src;
            video.controls = true;
            video.style.width = '100%';
            video.style.height = '100%';
            el.appendChild(video);
            break;
        case 'audio':
            // Show speaker icon as the visual representation (matching editor view)
            const audioIcon = document.createElement('div');
            audioIcon.innerHTML = '🔊';
            audioIcon.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 64px;';
            el.appendChild(audioIcon);
            // Store audio element for playback control
            const audioElement = document.createElement('audio');
            audioElement.src = element.src;
            audioElement.style.display = 'none';
            audioElement.id = `audio-${element.id}`;
            el.appendChild(audioElement);
            break;
    }

    container.appendChild(el);
}

function handleElementControl(elementId, action) {
    const element = document.getElementById(`element-${elementId}`);
    if (!element) return;

    switch (action) {
        case 'show':
            element.style.display = 'block';
            break;
        case 'hide':
            element.style.display = 'none';
            break;
        case 'play':
            // Find audio element (might be hidden)
            const audio = element.querySelector('audio') || document.getElementById(`audio-${elementId}`);
            const video = element.querySelector('video');
            if (audio) audio.play();
            if (video) video.play();
            break;
        case 'pause':
            const audio2 = element.querySelector('audio') || document.getElementById(`audio-${elementId}`);
            const video2 = element.querySelector('video');
            if (audio2) audio2.pause();
            if (video2) video2.pause();
            break;
    }
}

function renderStatusPage(container) {
    // This will be updated via WebSocket with real-time scores
    container.innerHTML = '<div class="status-page"><h1>Current Rankings</h1><div id="rankings-content"></div></div>';
}

function updateStatusPage(scores) {
    const content = document.getElementById('rankings-content');
    if (!content) return;

    // Get participants with scores
    const rankings = Object.entries(scores).map(([id, score]) => ({
        id,
        name: participants[id]?.name || 'Unknown',
        avatar: participants[id]?.avatar || '👤',
        score
    })).sort((a, b) => b.score - a.score);

    // Top 3 podium
    const top3 = rankings.slice(0, 3);
    const rest = rankings.slice(3);

    content.innerHTML = `
        <div class="podium">
            ${top3.map((p, i) => `
                <div class="podium-place" style="order: ${i === 0 ? 2 : i === 1 ? 1 : 3};">
                    <div class="podium-avatar">${p.avatar}</div>
                    <div class="podium-name">${p.name}</div>
                    <div class="podium-score">${p.score} points</div>
                </div>
            `).join('')}
        </div>
        <div class="rankings-list">
            ${rest.map((p, i) => `
                <div class="ranking-item">
                    <div class="ranking-avatar">${p.avatar}</div>
                    <div class="ranking-info">
                        <div class="ranking-name">${p.name}</div>
                        <div class="ranking-score">${p.score} points - Rank ${i + 4}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderFinalResultsPage(container) {
    // This will be updated via WebSocket with final results
    container.innerHTML = '<div class="status-page"><h1>Final Results</h1><div id="results-content"></div></div>';
}

function renderFinalResults(rankings) {
    const container = document.getElementById('display-content');
    container.innerHTML = `
        <div class="status-page">
            <h1>🎉 Quiz Complete! 🎉</h1>
            <div class="podium">
                ${rankings.slice(0, 3).map((p, i) => `
                    <div class="podium-place" style="order: ${i === 0 ? 2 : i === 1 ? 1 : 3};">
                        <div class="podium-avatar">${p.avatar || '👤'}</div>
                        <div class="podium-name">${p.name}</div>
                        <div class="podium-score">${p.score} points</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

