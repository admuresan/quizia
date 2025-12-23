// Participant page
const socket = io();
let roomCode = null;
let participantId = null;
let currentPage = null;
let currentScore = 0;
let participantName = null;
let participantAvatar = null;

// Avatar mapping (same as in join.js)
const avatarMap = {
    'avatar_0': '🐶', 'avatar_1': '🐱', 'avatar_2': '🐭', 'avatar_3': '🐹', 'avatar_4': '🐰',
    'avatar_5': '🦊', 'avatar_6': '🐻', 'avatar_7': '🐼', 'avatar_8': '🐨', 'avatar_9': '🐯',
    'avatar_10': '🦁', 'avatar_11': '🐮', 'avatar_12': '🐷', 'avatar_13': '🐸', 'avatar_14': '🐵',
    'avatar_15': '🐔', 'avatar_16': '🐧', 'avatar_17': '🦉', 'avatar_18': '🐺', 'avatar_19': '🦄'
};

function getAvatarEmoji(avatarCode) {
    return avatarMap[avatarCode] || '👤';
}

function updateParticipantHeader() {
    const avatarEl = document.getElementById('participant-avatar');
    const nameEl = document.getElementById('participant-name');
    
    if (avatarEl && participantAvatar) {
        avatarEl.textContent = getAvatarEmoji(participantAvatar);
    }
    
    if (nameEl && participantName) {
        nameEl.textContent = participantName;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    roomCode = window.roomCode;
    
    // Get participant info from URL or session
    const urlParams = new URLSearchParams(window.location.search);
    const name = urlParams.get('name');
    const avatar = urlParams.get('avatar');
    const rejoinId = urlParams.get('rejoin');
    
    // Store name and avatar if available from URL (for new joins)
    if (name) participantName = name;
    if (avatar) participantAvatar = avatar;
    
    // Update header immediately if we have the info
    updateParticipantHeader();

    socket.on('connect', () => {
        if (rejoinId) {
            socket.emit('participant_join', {
                room_code: roomCode,
                participant_id: rejoinId
            });
        } else {
            socket.emit('participant_join', {
                room_code: roomCode,
                name: name,
                avatar: avatar
            });
        }
    });

    socket.on('joined_room', (data) => {
        participantId = data.participant_id;
        sessionStorage.setItem('participant_id', participantId);
        
        // Update participant info from server (especially for rejoins)
        if (data.participant_name) {
            participantName = data.participant_name;
        }
        if (data.participant_avatar) {
            participantAvatar = data.participant_avatar;
        }
        
        updateParticipantHeader();
        renderPage(data.current_page, data.page);
    });

    socket.on('page_changed', (data) => {
        renderPage(data.page_index, data.page);
    });

    socket.on('score_updated', (data) => {
        if (data.scores[participantId] !== undefined) {
            currentScore = data.scores[participantId];
            updateScore();
        }
    });

    socket.on('quiz_ended', (data) => {
        renderFinalResults(data.final_rankings);
    });
});

function renderPage(pageIndex, page) {
    const container = document.getElementById('participant-content');
    
    if (!page) {
        container.innerHTML = '<div class="question-container">Waiting for quiz to start...</div>';
        return;
    }

    if (page.type === 'status' || page.type === 'results') {
        container.innerHTML = '<div class="question-container">Viewing status page...</div>';
        return;
    }

    // Use gradient blue background from main page
    container.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
    container.style.setProperty('background-image', 'none', 'important');

    // Find question elements
    const questionElements = page.elements?.filter(el => el.is_question) || [];
    
    container.innerHTML = '';
    
    questionElements.forEach(question => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-container';
        questionDiv.id = `question-${question.id}`;
        
        // Render question prompt
        if (question.text) {
            const prompt = document.createElement('div');
            prompt.className = 'question-prompt';
            prompt.textContent = question.text;
            questionDiv.appendChild(prompt);
        }
        
        // Render answer input based on type
        renderAnswerInput(questionDiv, question);
        
        container.appendChild(questionDiv);
    });
}

function renderAnswerInput(container, question) {
    const answerType = question.answer_type;
    
    switch (answerType) {
        case 'text':
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'answer-input';
            textInput.placeholder = 'Type your answer...';
            container.appendChild(textInput);
            
            const submitBtn = document.createElement('button');
            submitBtn.className = 'submit-btn';
            submitBtn.textContent = 'Submit';
            submitBtn.onclick = () => submitAnswer(question.id, textInput.value, 'text');
            container.appendChild(submitBtn);
            break;
            
        case 'radio':
            const options = question.options || [];
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'answer-options';
            
            options.forEach((option, index) => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'answer-option';
                optionDiv.textContent = option;
                optionDiv.onclick = () => {
                    document.querySelectorAll(`#question-${question.id} .answer-option`).forEach(o => o.classList.remove('selected'));
                    optionDiv.classList.add('selected');
                };
                optionsDiv.appendChild(optionDiv);
            });
            
            const submitBtn2 = document.createElement('button');
            submitBtn2.className = 'submit-btn';
            submitBtn2.textContent = 'Submit';
            submitBtn2.onclick = () => {
                const selected = container.querySelector('.answer-option.selected');
                if (selected) {
                    submitAnswer(question.id, selected.textContent, 'radio');
                }
            };
            
            container.appendChild(optionsDiv);
            container.appendChild(submitBtn2);
            break;
            
        case 'checkbox':
            const checkboxes = question.options || [];
            const checkboxesDiv = document.createElement('div');
            checkboxesDiv.className = 'answer-options';
            
            checkboxes.forEach(option => {
                const label = document.createElement('label');
                label.className = 'answer-option';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = option;
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(option));
                checkboxesDiv.appendChild(label);
            });
            
            const submitBtn3 = document.createElement('button');
            submitBtn3.className = 'submit-btn';
            submitBtn3.textContent = 'Submit';
            submitBtn3.onclick = () => {
                const selected = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                submitAnswer(question.id, selected, 'checkbox');
            };
            
            container.appendChild(checkboxesDiv);
            container.appendChild(submitBtn3);
            break;
            
        case 'image_click':
            // Get image source from question element (same image as display)
            const imageSrc = question.src || (question.filename ? '/api/media/serve/' + question.filename : question.image_src);
            if (imageSrc) {
                const imageContainer = document.createElement('div');
                imageContainer.className = 'image-answer-container';
                imageContainer.style.position = 'relative';
                imageContainer.style.display = 'inline-block';
                imageContainer.style.maxWidth = '100%';
                
                let clickIndicator = null;
                let clickCoords = null;
                let isSubmitted = false;
                
                const img = document.createElement('img');
                img.src = imageSrc;
                img.className = 'image-answer-image';
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.cursor = 'crosshair';
                
                const submitBtn4 = document.createElement('button');
                submitBtn4.className = 'submit-btn';
                submitBtn4.textContent = 'Submit';
                submitBtn4.disabled = true;
                submitBtn4.style.marginTop = '1rem';
                
                img.onclick = (e) => {
                    if (isSubmitted) return; // Don't allow clicking after submission
                    
                    const rect = img.getBoundingClientRect();
                    // Calculate coordinates as percentage of image size
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    clickCoords = { x, y };
                    
                    // Remove old indicator
                    if (clickIndicator) {
                        clickIndicator.remove();
                    }
                    
                    // Create new indicator circle (10% of image size)
                    clickIndicator = document.createElement('div');
                    clickIndicator.style.position = 'absolute';
                    clickIndicator.style.borderRadius = '50%';
                    clickIndicator.style.backgroundColor = 'rgba(33, 150, 243, 0.3)'; // Light blue highlight
                    clickIndicator.style.border = '2px solid rgba(33, 150, 243, 0.8)';
                    const radiusPercent = 5; // 5% from center = 10% diameter
                    clickIndicator.style.left = `${x - radiusPercent}%`;
                    clickIndicator.style.top = `${y - radiusPercent}%`;
                    clickIndicator.style.width = `${radiusPercent * 2}%`;
                    clickIndicator.style.height = `${radiusPercent * 2}%`;
                    clickIndicator.style.pointerEvents = 'none';
                    imageContainer.appendChild(clickIndicator);
                    
                    // Enable submit button
                    submitBtn4.disabled = false;
                };
                
                submitBtn4.onclick = () => {
                    if (clickCoords && !isSubmitted) {
                        isSubmitted = true;
                        submitBtn4.disabled = true;
                        img.style.cursor = 'default';
                        img.style.opacity = '0.7';
                        submitAnswer(question.id, clickCoords, 'image_click');
                    }
                };
                
                imageContainer.appendChild(img);
                container.appendChild(imageContainer);
                container.appendChild(submitBtn4);
            }
            break;
            
        case 'stopwatch':
            const stopwatchContainer = document.createElement('div');
            stopwatchContainer.className = 'stopwatch-container';
            stopwatchContainer.style.display = 'flex';
            stopwatchContainer.style.flexDirection = 'column';
            stopwatchContainer.style.alignItems = 'center';
            stopwatchContainer.style.gap = '1rem';
            
            const timerDisplay = document.createElement('div');
            timerDisplay.className = 'timer-display';
            timerDisplay.style.fontSize = '2rem';
            timerDisplay.style.fontWeight = 'bold';
            timerDisplay.style.display = 'none'; // Hidden while running
            timerDisplay.textContent = '0:00';
            stopwatchContainer.appendChild(timerDisplay);
            
            const controlsDiv = document.createElement('div');
            controlsDiv.style.display = 'flex';
            controlsDiv.style.gap = '1rem';
            
            const startBtn = document.createElement('button');
            startBtn.className = 'submit-btn';
            startBtn.textContent = 'Start';
            startBtn.disabled = false;
            
            const stopBtn = document.createElement('button');
            stopBtn.className = 'submit-btn';
            stopBtn.textContent = 'Stop';
            stopBtn.disabled = true;
            stopBtn.style.opacity = '0.5';
            stopBtn.style.cursor = 'not-allowed';
            
            let startTime = null;
            let intervalId = null;
            let elapsedTime = 0;
            
            startBtn.onclick = () => {
                startTime = Date.now();
                startBtn.disabled = true;
                startBtn.style.opacity = '0.5';
                startBtn.style.cursor = 'not-allowed';
                stopBtn.disabled = false;
                stopBtn.style.opacity = '1';
                stopBtn.style.cursor = 'pointer';
                timerDisplay.style.display = 'none'; // Hide timer while running
                
                // Update timer every 10ms for smooth display after stop
                intervalId = setInterval(() => {
                    elapsedTime = Date.now() - startTime;
                }, 10);
            };
            
            stopBtn.onclick = () => {
                if (startTime) {
                    elapsedTime = Date.now() - startTime;
                    clearInterval(intervalId);
                    
                    // Show timer
                    timerDisplay.style.display = 'block';
                    const seconds = Math.floor(elapsedTime / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
                    
                    // Disable controls
                    startBtn.disabled = true;
                    stopBtn.disabled = true;
                    startBtn.style.opacity = '0.5';
                    stopBtn.style.opacity = '0.5';
                    startBtn.style.cursor = 'not-allowed';
                    stopBtn.style.cursor = 'not-allowed';
                    
                    // Submit answer automatically
                    submitAnswer(question.id, elapsedTime, 'stopwatch');
                }
            };
            
            controlsDiv.appendChild(startBtn);
            controlsDiv.appendChild(stopBtn);
            stopwatchContainer.appendChild(controlsDiv);
            container.appendChild(stopwatchContainer);
            break;
    }
}

function submitAnswer(questionId, answer, answerType) {
    if (!participantId) return;
    
    socket.emit('participant_submit_answer', {
        room_code: roomCode,
        participant_id: participantId,
        question_id: questionId,
        answer: answer,
        answer_type: answerType
    });
    
    // Disable submit buttons
    document.querySelectorAll('.submit-btn').forEach(btn => {
        btn.disabled = true;
        btn.textContent = 'Submitted';
    });
}

function updateScore() {
    document.getElementById('participant-score').textContent = `Score: ${currentScore}`;
}

function renderFinalResults(rankings) {
    const container = document.getElementById('participant-content');
    const myRanking = rankings.find(r => r.id === participantId);
    
    container.innerHTML = `
        <div class="question-container">
            <h2>Final Results</h2>
            <p>Your Rank: ${myRanking ? myRanking.rank : 'N/A'}</p>
            <p>Your Score: ${myRanking ? myRanking.score : currentScore}</p>
            <h3>Top Players</h3>
            <div class="rankings-list">
                ${rankings.slice(0, 10).map(p => `
                    <div class="ranking-item">
                        <div class="ranking-avatar">${p.avatar || '👤'}</div>
                        <div class="ranking-info">
                            <div class="ranking-name">${p.name}</div>
                            <div class="ranking-score">${p.score} points - Rank ${p.rank}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

