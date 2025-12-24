// Participant page - matches editor participant view template exactly
const socket = io();
// roomCode is set in template as window.roomCode
let participantId = null;
let currentPageIndex = 0; // Track current page index to stay in sync
let currentPage = null;
let currentScore = 0;
let participantName = null;
let participantAvatar = null;
let quiz = null;

// Avatar utilities are now in avatar-utils.js (getAvatarEmoji function)

function updateParticipantHeader() {
    const avatarEl = document.getElementById('participant-avatar');
    const nameEl = document.getElementById('participant-name');
    const scoreEl = document.getElementById('participant-score');
    
    if (avatarEl) {
        avatarEl.textContent = getAvatarEmoji(participantAvatar);
        avatarEl.style.cssText = 'font-size: 2.5rem; width: 3.5rem; height: 3.5rem; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 50%; border: 2px solid #2196F3;';
    }
    
    if (nameEl) {
        nameEl.textContent = participantName || 'Participant';
        nameEl.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #333; flex: 1;';
    }
    
    if (scoreEl) {
        scoreEl.textContent = `Score: ${currentScore}`;
        scoreEl.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #2196F3;';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.roomCode) {
        console.error('Room code not found');
        return;
    }
    
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
                room_code: window.roomCode,
                participant_id: rejoinId
            });
        } else {
            socket.emit('participant_join', {
                room_code: window.roomCode,
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
        
        // Always update header after receiving data
        updateParticipantHeader();
        
        if (data.quiz) {
            quiz = data.quiz;
        }
        
        // Always use server's current_page to stay in sync
        if (data.current_page !== undefined) {
            currentPageIndex = data.current_page;
        }
        console.log('Joined room - current page index:', currentPageIndex);
        renderPage(currentPageIndex, data.page);
    });
    
    socket.on('error', (data) => {
        console.error('Socket error:', data);
        if (data.message) {
            // If it's a "not running" error, show the error page
            if (data.message.includes('not running') || data.message.includes('not found')) {
                showQuizNotRunning();
            } else if (data.message.includes('already taken') || data.message.includes('combination')) {
                // Duplicate name+avatar combo - redirect back to join page with error
                const errorMsg = encodeURIComponent(data.message);
                window.location.href = `/join?error=${errorMsg}&room=${encodeURIComponent(window.roomCode)}`;
            } else {
                alert('Error: ' + data.message);
            }
        }
    });

    socket.on('quiz_not_running', (data) => {
        showQuizNotRunning();
    });

    socket.on('page_changed', (data) => {
        if (data.quiz) {
            quiz = data.quiz;
        }
        // Always use server's page_index to stay in sync
        if (data.page_index !== undefined) {
            currentPageIndex = data.page_index;
        }
        console.log('Page changed to index:', currentPageIndex);
        renderPage(currentPageIndex, data.page);
    });

    socket.on('score_updated', (data) => {
        if (data.scores[participantId] !== undefined) {
            currentScore = data.scores[participantId];
            updateParticipantHeader();
        }
    });

    socket.on('quiz_ended', (data) => {
        renderFinalResults(data.final_rankings);
    });
    
    // Handle answer submission
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('submit-answer-btn')) {
            const questionId = e.target.dataset.questionId;
            const answerType = e.target.dataset.answerType;
            submitAnswer(questionId, answerType, e.target);
        }
    });
});

function renderPage(pageIndex, page) {
    const container = document.getElementById('participant-content');
    
    if (!page) {
        container.innerHTML = '<div class="question-container">Waiting for quiz to start...</div>';
        return;
    }

    currentPage = page;

    if (page.type === 'status' || page.type === 'results') {
        container.innerHTML = '<div class="question-container">Viewing status page...</div>';
        return;
    }

    // Set up container - match editor participant view
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.minHeight = 'calc(100vh - 120px)';
    
    // Set background - use page background if available, otherwise use quiz background
    const bgColor = page?.background_color || quiz?.background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const bgImage = page?.background_image || quiz?.background_image;
    
    if (bgImage) {
        container.style.backgroundImage = `url(${bgImage})`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
        container.style.backgroundRepeat = 'no-repeat';
    } else {
        container.style.background = bgColor;
        container.style.backgroundImage = 'none';
    }

    // Get canvas dimensions
    const viewSettings = quiz?.view_settings?.participant || { canvas_width: 1920, canvas_height: 1080 };
    const canvasWidth = viewSettings.canvas_width || 1920;
    container.style.width = `${canvasWidth}px`;
    container.style.maxWidth = '100%';

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
    
    // Find question elements and render them - matching editor participant view structure
    const questionElements = page.elements?.filter(el => el.is_question && (!el.view || el.view === 'display')) || [];
    
    // Get questions in appearance order
    const orderedQuestions = page.appearance_order
        .map(id => questionElements.find(el => el.id === id))
        .filter(el => el);
    
    // Track which elements have appeared
    const appearedElements = new Set();
    let pageLoadTime = Date.now();
    
    // Function to show a question and its answer box
    const showQuestion = (questionId) => {
        const questionContainer = document.getElementById(`question-${questionId}`);
        if (questionContainer) {
            questionContainer.style.display = 'block';
            questionContainer.style.visibility = 'visible';
            appearedElements.add(questionId);
        }
    };
    
    // Function to hide a question and its answer box
    const hideQuestion = (questionId) => {
        const questionContainer = document.getElementById(`question-${questionId}`);
        if (questionContainer) {
            questionContainer.style.display = 'none';
            questionContainer.style.visibility = 'hidden';
        }
    };
    
    // Render all questions but hide them initially (except on_load)
    orderedQuestions.forEach((question, index) => {
        // Create question container (matching editor participant view)
        const questionContainer = document.createElement('div');
        questionContainer.className = 'question-container';
        questionContainer.id = `question-${question.id}`;
        questionContainer.style.cssText = 'position: relative; background: white; padding: 2rem; border-radius: 8px; margin-bottom: 1rem; margin-left: auto; margin-right: auto; max-width: 800px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
        
        // Find the answer_input element for this question
        const answerInput = page.elements?.find(el => 
            el.type === 'answer_input' && 
            el.parent_id === question.id && 
            el.view === 'participant'
        );
        
        // Add question title if available
        // Note: We don't render the question element content (image, richtext, etc.) on participant page
        // The question content is shown on the display page; participants only see the title and answer input
        if (question.question_title && question.question_title.trim()) {
            const title = document.createElement('div');
            title.className = 'question-title';
            title.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #2196F3; margin-bottom: 1rem; margin-top: 0.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3; display: block; width: 100%;';
            title.textContent = question.question_title;
            questionContainer.appendChild(title);
        }
        
        // Find and render the answer_input element for this question
        console.log(`Looking for answer_input for question ${question.id}:`, {
            questionId: question.id,
            totalElements: page.elements?.length,
            answerInputs: page.elements?.filter(el => el.type === 'answer_input'),
            matchingInput: answerInput
        });
        
        if (answerInput) {
            console.log(`Found answer_input for question ${question.id}:`, answerInput);
            // Render the answer input inside the question container
            const renderedEl = RuntimeRenderer.ElementRenderer.renderElement(questionContainer, answerInput, {
                mode: 'participant',
                insideContainer: true,
                question: question, // Pass question for context
                submitAnswerCallback: submitAnswer // Pass callback for submission
            });
            
            console.log('Rendered element:', renderedEl, 'Has parent:', renderedEl?.parentElement, 'Children:', renderedEl?.children);
            
            // When insideContainer is true, we need to manually append the element
            if (renderedEl && !renderedEl.parentElement) {
                questionContainer.appendChild(renderedEl);
                console.log('Appended rendered element to question container');
            } else if (renderedEl && renderedEl.parentElement) {
                console.log('Rendered element already has parent, not appending');
            } else {
                console.error('renderedEl is null or undefined!');
            }
            
            // Set up submit handlers for the rendered elements
            const submitBtns = renderedEl?.querySelectorAll?.('.submit-answer-btn') || [];
            console.log(`Found ${submitBtns.length} submit buttons`);
            submitBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const questionId = btn.dataset.questionId;
                    const answerType = btn.dataset.answerType;
                    submitAnswer(questionId, answerType, btn);
                });
            });
            
            if (submitBtns.length === 0) {
                console.warn(`No submit buttons found for answer_input of question ${question.id}`);
            }
        } else {
            console.warn(`No answer_input found for question ${question.id}, using fallback`);
            // Fallback: render answer input based on question type directly
            renderAnswerInputFallback(questionContainer, question);
        }
        
        container.appendChild(questionContainer);
        
        // On participant page, questions should be visible by default
        // appearance_mode 'control' is for display page visibility control
        // Participants need to see questions to answer them
        const appearanceMode = question.appearance_mode || 'on_load';
        if (appearanceMode === 'on_load' || appearanceMode === 'control') {
            // Show questions by default on participant page
            showQuestion(question.id);
        } else {
            // For other modes (delays, etc.), hide initially and show via appearance logic
            hideQuestion(question.id);
        }
    });
    
    // Process appearance logic for questions
    orderedQuestions.forEach((question, index) => {
        const appearanceMode = question.appearance_mode || 'on_load';
        
        if (appearanceMode === 'on_load') {
            // Already shown above
            showQuestion(question.id);
        } else if (appearanceMode === 'global_delay') {
            // Show after X seconds from page load
            const delay = (question.appearance_delay || 0) * 1000;
            setTimeout(() => {
                showQuestion(question.id);
            }, delay);
        } else if (appearanceMode === 'after_previous') {
            // Show when previous element appears
            if (index === 0) {
                // First element - show immediately
                showQuestion(question.id);
            } else {
                // Wait for previous element to appear
                const checkPrevious = setInterval(() => {
                    const prevElement = orderedQuestions[index - 1];
                    if (prevElement && appearedElements.has(prevElement.id)) {
                        clearInterval(checkPrevious);
                        showQuestion(question.id);
                    }
                }, 50);
            }
        } else if (appearanceMode === 'local_delay') {
            // Show X seconds after previous element appears
            if (index === 0) {
                // First element - show after delay from page load
                const delay = (question.appearance_delay || 0) * 1000;
                setTimeout(() => {
                    showQuestion(question.id);
                }, delay);
            } else {
                // Wait for previous element, then add delay
                const checkPrevious = setInterval(() => {
                    const prevElement = orderedQuestions[index - 1];
                    if (prevElement && appearedElements.has(prevElement.id)) {
                        clearInterval(checkPrevious);
                        const delay = (question.appearance_delay || 0) * 1000;
                        setTimeout(() => {
                            showQuestion(question.id);
                        }, delay);
                    }
                }, 50);
            }
        }
        // control mode is handled via socket events from control screen
    });
    
    // Listen for control mode toggles
    socket.on('element_appearance_control', (data) => {
        if (data.element_id && data.visible !== undefined) {
            // Check if this is a question element
            const question = orderedQuestions.find(q => q.id === data.element_id);
            if (question) {
                if (data.visible) {
                    showQuestion(data.element_id);
                } else {
                    hideQuestion(data.element_id);
                }
            }
        }
    });
    
    // If no questions, show message
    if (questionElements.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: white; font-size: 1.2rem;">No questions on this page</div>';
    }
}

function renderAnswerInputFallback(container, question) {
    const answerType = question.answer_type || 'text';
    
    if (answerType === 'image_click') {
        // Get image source from question element
        const imageSrc = question.src || (question.filename ? '/api/media/serve/' + question.filename : question.image_src);
        if (imageSrc) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'image-answer-container';
            imageContainer.style.cssText = 'position: relative; display: inline-block; max-width: 100%;';
            
            let clickIndicator = null;
            let clickCoords = null;
            let isSubmitted = false;
            
            const img = document.createElement('img');
            img.src = imageSrc;
            img.className = 'image-answer-image';
            img.style.cssText = 'max-width: 100%; height: auto; display: block; cursor: crosshair;';
            
            const submitBtn = document.createElement('button');
            submitBtn.textContent = 'Submit';
            submitBtn.className = 'submit-answer-btn';
            submitBtn.dataset.questionId = question.id;
            submitBtn.dataset.answerType = 'image_click';
            submitBtn.disabled = true;
            submitBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500; margin-top: 1rem;';
            
            img.onclick = (e) => {
                if (isSubmitted) return;
                
                const rect = img.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                clickCoords = { x, y };
                
                if (clickIndicator) {
                    clickIndicator.remove();
                }
                
                clickIndicator = document.createElement('div');
                const radiusPercent = 5; // 5% radius = 10% diameter
                clickIndicator.style.cssText = `position: absolute; border-radius: 50%; background: rgba(33, 150, 243, 0.3); border: 2px solid rgba(33, 150, 243, 0.8); pointer-events: none; left: ${x - radiusPercent}%; top: ${y - radiusPercent}%; width: ${radiusPercent * 2}%; height: ${radiusPercent * 2}%;`;
                imageContainer.appendChild(clickIndicator);
                
                submitBtn.disabled = false;
            };
            
            submitBtn.onclick = () => {
                if (clickCoords && !isSubmitted) {
                    isSubmitted = true;
                    submitBtn.disabled = true;
                    img.style.cursor = 'default';
                    img.style.opacity = '0.7';
                    submitAnswer(question.id, 'image_click', submitBtn, clickCoords);
                }
            };
            
            imageContainer.appendChild(img);
            container.appendChild(imageContainer);
            container.appendChild(submitBtn);
        }
    } else if (answerType === 'stopwatch') {
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
        stopBtn.disabled = true;
        stopBtn.style.cssText = 'padding: 0.5rem 1rem; background: #f44336; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500; opacity: 0.5;';
        
        let startTime = null;
        let intervalId = null;
        let elapsedTime = 0;
        
        startBtn.onclick = () => {
            startTime = Date.now();
            startBtn.disabled = true;
            startBtn.style.opacity = '0.5';
            stopBtn.disabled = false;
            stopBtn.style.opacity = '1';
            stopBtn.style.cursor = 'pointer';
            timerDisplay.style.display = 'none';
            
            intervalId = setInterval(() => {
                elapsedTime = Date.now() - startTime;
            }, 10);
        };
        
        stopBtn.onclick = () => {
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
                
                submitAnswer(question.id, 'stopwatch', stopBtn, elapsedTime);
            }
        };
        
        controlsDiv.appendChild(startBtn);
        controlsDiv.appendChild(stopBtn);
        stopwatchContainer.appendChild(controlsDiv);
        container.appendChild(stopwatchContainer);
    }
}

function submitAnswer(questionId, answerType, buttonElement, customAnswer = null) {
    if (!participantId) return;
    
    let answer = customAnswer;
    
    if (!answer) {
        // Get answer from form elements
        const questionContainer = document.getElementById(`question-${questionId}`);
        if (!questionContainer) return;
        
        if (answerType === 'text') {
            const input = questionContainer.querySelector('.answer-text-input');
            answer = input ? input.value : '';
        } else if (answerType === 'radio') {
            const selected = questionContainer.querySelector(`input[name="answer-${questionId}"]:checked`);
            answer = selected ? selected.value : null;
        } else if (answerType === 'checkbox') {
            const checked = Array.from(questionContainer.querySelectorAll(`input[type="checkbox"]:checked`));
            answer = checked.map(cb => cb.value);
        }
    }
    
    if (answer === null || answer === undefined || answer === '') {
        return;
    }
    
    socket.emit('participant_submit_answer', {
        room_code: window.roomCode,
        participant_id: participantId,
        question_id: questionId,
        answer: answer,
        answer_type: answerType
    });
    
    // Disable submit buttons for this question
    if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.textContent = 'Submitted';
    } else {
        questionContainer.querySelectorAll('.submit-answer-btn').forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Submitted';
        });
    }
    
    // Disable input fields
    questionContainer.querySelectorAll('input, button').forEach(el => {
        if (!el.classList.contains('submit-answer-btn')) {
            el.disabled = true;
        }
    });
}

function showQuizNotRunning() {
    const container = document.getElementById('participant-content');
    if (!container) return;
    
    container.innerHTML = '';
    container.style.cssText = 'width: 100%; min-height: calc(100vh - 120px); display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);';
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'background: white; border-radius: 16px; padding: 3rem; max-width: 600px; width: 90%; text-align: center; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);';
    
    const icon = document.createElement('div');
    icon.textContent = '🔍';
    icon.style.cssText = 'font-size: 5rem; margin-bottom: 1.5rem;';
    errorDiv.appendChild(icon);
    
    const title = document.createElement('h1');
    title.textContent = 'Quiz Not Found';
    title.style.cssText = 'font-size: 2rem; font-weight: bold; color: #333; margin-bottom: 1rem;';
    errorDiv.appendChild(title);
    
    const message = document.createElement('p');
    message.textContent = 'No quiz is currently running with this code. The quiz may have ended, or the code may be incorrect.';
    message.style.cssText = 'font-size: 1.2rem; color: #666; margin-bottom: 1rem; line-height: 1.6;';
    errorDiv.appendChild(message);
    
    const roomCodeEl = document.createElement('div');
    roomCodeEl.textContent = window.roomCode || 'Unknown';
    roomCodeEl.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #667eea; margin: 1rem 0; padding: 0.5rem; background: #f5f5f5; border-radius: 8px; font-family: "Courier New", monospace;';
    errorDiv.appendChild(roomCodeEl);
    
    const backButton = document.createElement('a');
    backButton.href = '/join';
    backButton.textContent = 'Join a Different Quiz';
    backButton.style.cssText = 'display: inline-block; padding: 1rem 2rem; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-size: 1.1rem; font-weight: 500; margin-top: 1rem;';
    errorDiv.appendChild(backButton);
    
    container.appendChild(errorDiv);
}

function renderFinalResults(rankings) {
    const container = document.getElementById('participant-content');
    const myRanking = rankings.find(r => r.id === participantId);
    
    container.innerHTML = '';
    container.style.cssText = 'padding: 2rem; text-align: center;';
    
    const resultsDiv = document.createElement('div');
    resultsDiv.style.cssText = 'max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
    
    const title = document.createElement('h2');
    title.textContent = 'Final Results';
    title.style.cssText = 'font-size: 2rem; margin-bottom: 1rem; color: #2196F3;';
    resultsDiv.appendChild(title);
    
    if (myRanking) {
        const myRank = document.createElement('p');
        myRank.textContent = `Your Rank: ${myRanking.rank}`;
        myRank.style.cssText = 'font-size: 1.5rem; font-weight: bold; margin: 1rem 0;';
        resultsDiv.appendChild(myRank);
        
        const myScore = document.createElement('p');
        myScore.textContent = `Your Score: ${myRanking.score}`;
        myScore.style.cssText = 'font-size: 1.2rem; margin-bottom: 2rem;';
        resultsDiv.appendChild(myScore);
    }
    
    const topPlayers = document.createElement('h3');
    topPlayers.textContent = 'Top Players';
    topPlayers.style.cssText = 'font-size: 1.5rem; margin-top: 2rem; margin-bottom: 1rem;';
    resultsDiv.appendChild(topPlayers);
    
    const rankingsList = document.createElement('div');
    rankingsList.className = 'rankings-list';
    rankingsList.style.cssText = 'text-align: left;';
    
    rankings.slice(0, 10).forEach(p => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; padding: 1rem; background: #f5f5f5; margin: 0.5rem 0; border-radius: 8px;';
        
        const avatar = document.createElement('div');
        avatar.textContent = getAvatarEmoji(p.avatar) || '👤';
        avatar.style.cssText = 'font-size: 1.5rem; margin-right: 1rem;';
        item.appendChild(avatar);
        
        const info = document.createElement('div');
        info.style.cssText = 'flex: 1;';
        
        const name = document.createElement('div');
        name.textContent = p.name;
        name.style.cssText = 'font-size: 1.1rem; font-weight: bold;';
        info.appendChild(name);
        
        const score = document.createElement('div');
        score.textContent = `${p.score} points - Rank ${p.rank}`;
        score.style.cssText = 'font-size: 0.9rem; color: #666;';
        info.appendChild(score);
        
        item.appendChild(info);
        rankingsList.appendChild(item);
    });
    
    resultsDiv.appendChild(rankingsList);
    container.appendChild(resultsDiv);
}