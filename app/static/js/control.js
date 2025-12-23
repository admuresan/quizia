// Quizmaster control page
const socket = io();
let roomCode = null;
let currentPageIndex = 0;
let quiz = null;
let answers = {};

document.addEventListener('DOMContentLoaded', () => {
    roomCode = window.roomCode;
    
    socket.on('connect', () => {
        socket.emit('quizmaster_join_control', { room_code: roomCode });
    });

    socket.on('joined_control', (data) => {
        loadQuizData();
    });

    socket.on('room_created', (data) => {
        // Room created, ready to go
    });

    socket.on('redirect', (data) => {
        // Already on control page, no redirect needed
    });

    socket.on('page_changed', (data) => {
        currentPageIndex = data.page_index;
        if (data.quiz) {
            quiz = data.quiz;
        }
        loadAnswers();
    });
    
    socket.on('quiz_state', (data) => {
        if (data.quiz) {
            quiz = data.quiz;
        }
        if (data.current_page !== undefined) {
            currentPageIndex = data.current_page;
        }
        loadAnswers();
    });

    socket.on('answer_submitted', (data) => {
        addAnswerToPanel(data);
    });

    socket.on('score_updated', (data) => {
        // Scores updated
    });

    // Navigation buttons
    document.getElementById('prev-page-btn').addEventListener('click', () => {
        socket.emit('quizmaster_navigate', {
            room_code: roomCode,
            direction: 'prev'
        });
    });

    document.getElementById('next-page-btn').addEventListener('click', () => {
        socket.emit('quizmaster_navigate', {
            room_code: roomCode,
            direction: 'next'
        });
    });

    document.getElementById('end-quiz-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to end the quiz?')) {
            socket.emit('quizmaster_end_quiz', { room_code: roomCode });
        }
    });
});

async function loadQuizData() {
    // Quiz data should be sent via socket when joined_control is received
    // For now, we'll wait for page_changed event which should include the quiz
}

function loadAnswers() {
    const canvas = document.getElementById('control-canvas');
    const panel = document.getElementById('answers-panel');
    
    if (!canvas || !panel) return;
    
    // Clear canvas
    canvas.innerHTML = '';
    canvas.style.position = 'relative';
    canvas.style.width = '100%';
    canvas.style.minHeight = '400px';
    canvas.style.marginBottom = '2rem';
    
    // Clear answers panel
    panel.innerHTML = `<h2>Page ${currentPageIndex + 1}</h2>`;
    
    // Render control view elements (audio/video controls, answer displays)
    if (quiz && quiz.pages && quiz.pages[currentPageIndex]) {
        const page = quiz.pages[currentPageIndex];
        
        // Use gradient blue background from main page
        canvas.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
        canvas.style.setProperty('background-image', 'none', 'important');
        if (page.elements) {
            // Filter to only show control view elements
            const controlElements = page.elements.filter(el => el.view === 'control');
            
            controlElements.forEach(element => {
                renderControlElement(canvas, element);
            });
        }
    }
    
    const answersSection = document.createElement('div');
    answersSection.innerHTML = '<p>Answers will appear here when participants submit.</p>';
    panel.appendChild(answersSection);
}

function renderControlElement(container, element) {
    const el = document.createElement('div');
    el.className = 'control-element';
    el.id = `element-${element.id}`;
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
            videoControl.id = `video-control-${element.id}`;
            el.appendChild(videoControl);
        } else {
            const audioControl = document.createElement('audio');
            audioControl.controls = true;
            audioControl.src = element.src || (element.filename ? '/api/media/serve/' + element.filename : '');
            audioControl.style.width = '100%';
            audioControl.id = `audio-control-${element.id}`;
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
}

function addAnswerToPanel(data) {
    const panel = document.getElementById('answers-panel');
    
    // Check if answer already exists
    const existingId = `answer-${data.participant_id}-${data.question_id}`;
    let answerItem = document.getElementById(existingId);
    
    if (!answerItem) {
        answerItem = document.createElement('div');
        answerItem.className = 'answer-item';
        answerItem.id = existingId;
        panel.appendChild(answerItem);
    }
    
    answerItem.innerHTML = `
        <div class="answer-header">
            <div class="answer-avatar" style="font-size: 2rem;">${data.participant_avatar || '👤'}</div>
            <div class="answer-info">
                <div class="answer-name">${data.participant_name}</div>
                <div class="answer-time">Submitted: ${typeof data.submission_time === 'number' ? data.submission_time.toFixed(2) : data.submission_time}s</div>
            </div>
        </div>
        <div class="answer-content">
            ${formatAnswer(data.answer, data.answer_type)}
        </div>
        <div class="answer-controls">
            <label>
                <input type="checkbox" class="correct-checkbox" 
                       data-participant-id="${data.participant_id}"
                       data-question-id="${data.question_id}">
                Correct
            </label>
            <input type="number" class="bonus-points-input" 
                   placeholder="Bonus" min="0" value="0"
                   data-participant-id="${data.participant_id}"
                   data-question-id="${data.question_id}">
            <button class="btn btn-small" onclick="saveAnswerMark('${data.participant_id}', '${data.question_id}')">Save</button>
        </div>
    `;
}

function formatAnswer(answer, answerType) {
    if (answerType === 'image') {
        if (answer && typeof answer === 'object' && answer.x !== undefined) {
            return `<div class="image-answer-display">
                <div>Click coordinates: (${answer.x.toFixed(1)}%, ${answer.y.toFixed(1)}%)</div>
            </div>`;
        }
        return '<div>Image click answer</div>';
    } else if (answerType === 'checkbox') {
        return Array.isArray(answer) ? answer.join(', ') : String(answer);
    } else {
        return String(answer);
    }
}

function saveAnswerMark(participantId, questionId) {
    const item = document.getElementById(`answer-${participantId}-${questionId}`);
    const correct = item.querySelector('.correct-checkbox').checked;
    const bonus = parseInt(item.querySelector('.bonus-points-input').value) || 0;
    
    socket.emit('quizmaster_mark_answer', {
        room_code: roomCode,
        participant_id: participantId,
        question_id: questionId,
        correct: correct,
        bonus_points: bonus
    });
}

