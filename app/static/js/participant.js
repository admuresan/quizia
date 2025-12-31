// Participant page - matches editor participant view template exactly
const socket = io({ transports: ['polling', 'websocket'], upgrade: true, reconnection: true });
// roomCode is set in template as window.roomCode
let participantId = null;
let currentPageIndex = 0; // Track current page index to stay in sync
let currentPage = null;
let currentScore = 0;
let participantName = null;
let participantAvatar = null;
let quiz = null;
let submittedAnswers = {}; // Track submitted answers: { question_id: { answer, submission_time, ... } }

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
        nameEl.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #333;';
    }
    
    if (scoreEl) {
        scoreEl.textContent = `Score: ${currentScore}`;
        scoreEl.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #2196F3; margin-left: 1rem;';
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
        
        // Load submitted answers from room file (stored on server)
        if (data.submitted_answers) {
            submittedAnswers = data.submitted_answers;
        }
        
        // Always use server's current_page to stay in sync
        if (data.current_page !== undefined) {
            currentPageIndex = data.current_page;
        }
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

    socket.on('winner_announced', (data) => {
        if (data.winner_id === participantId) {
            // Show trophy and confetti for the winner
            showWinnerCelebration();
        }
        // Update scores if provided
        if (data.scores && data.scores[participantId] !== undefined) {
            currentScore = data.scores[participantId];
            updateParticipantHeader();
        }
    });
    
    // Handle answer submission
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('submit-answer-btn')) {
            const questionId = e.target.dataset.questionId;
            const answerType = e.target.dataset.answerType;
            submitAnswer(questionId, answerType, e.target);
        }
    });
    
    // Listen for element appearance control (show/hide elements via control page)
    // When a question element is hidden on display page, hide its answer on participant page
    socket.on('element_appearance_control', (data) => {
        if (data.element_id && data.visible !== undefined) {
            // Find the question container by element_id
            const questionContainer = document.getElementById(`question-${data.element_id}`);
            if (questionContainer) {
                // This is a question element - show or hide its answer container
                if (data.visible) {
                    questionContainer.style.display = 'block';
                    questionContainer.style.visibility = 'visible';
                } else {
                    questionContainer.style.display = 'none';
                    questionContainer.style.visibility = 'hidden';
                }
            }
        }
    });
    
    // Listen for element appearance changes from display page (delays, after_previous, etc.)
    // When a question element appears on display page, show its answer on participant page
    socket.on('element_appearance_changed', (data) => {
        if (data.element_id && data.visible !== undefined && data.visible) {
            // Find the question container by element_id
            const questionContainer = document.getElementById(`question-${data.element_id}`);
            if (questionContainer) {
                // Question element appeared on display page - show its answer container
                questionContainer.style.display = 'block';
                questionContainer.style.visibility = 'visible';
            }
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

    // Check page type
    const pageType = page.page_type;
    if (pageType === 'status_page' || pageType === 'result_page') {
        container.innerHTML = '<div class="question-container">Viewing status page...</div>';
        return;
    }

    // Get canvas dimensions from page view_config.size (new format) FIRST
    let canvasWidth = 1920;
    let canvasHeight = 1080;
    if (page && page.views && page.views.participant && page.views.participant.view_config && page.views.participant.view_config.size) {
        canvasWidth = page.views.participant.view_config.size.width || 1920;
        canvasHeight = page.views.participant.view_config.size.height || 1080;
    }
    
    // Set up container - match editor participant view with exact dimensions
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.width = `${canvasWidth}px`;
    container.style.height = `${canvasHeight}px`;
    container.style.minWidth = `${canvasWidth}px`;
    container.style.maxWidth = `${canvasWidth}px`;
    container.style.minHeight = `${canvasHeight}px`;
    container.style.maxHeight = `${canvasHeight}px`;
    container.style.boxSizing = 'border-box';
    container.style.overflow = 'auto';
    
    // Position in top-left when screen is larger than view (runtime mode only)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (viewportWidth >= canvasWidth && viewportHeight >= canvasHeight) {
        // Screen is larger - position in top-left
        container.style.margin = '0';
        container.style.padding = '0';
        container.style.alignSelf = 'flex-start';
    } else {
        // Screen is smaller or equal - use default behavior (centered with padding)
        container.style.padding = '2rem';
        container.style.margin = '0 auto';
    }
    
    // Set background using shared utility function
    // NO hardcoded fallbacks - only use what's in the saved quiz
    if (window.BackgroundUtils && window.BackgroundUtils.applyBackground) {
        window.BackgroundUtils.applyBackground(container, page, quiz, 'participant');
    } else {
        console.error('BackgroundUtils not available');
    }

    // Get appearance_order and question elements
    let appearanceOrder = [];
    let questionElements = [];
    let participantElements = []; // Includes dynamically generated answer_input elements
    
    // Use helper function to get globals
    if (Editor && Editor.QuizStructure && Editor.QuizStructure.getPageGlobals) {
        const globals = Editor.QuizStructure.getPageGlobals(page);
        appearanceOrder = globals.appearance_order || [];
    } else {
        console.error('Editor.QuizStructure.getPageGlobals not available');
    }
    
    // Get question elements from display view (for question data)
    if (Editor && Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
        const displayElements = Editor.QuizStructure.getViewElements(page, 'display');
        questionElements = displayElements.filter(el => el.is_question);
        
        // Get participant view elements (includes dynamically generated answer_input elements)
        // Filter out any question elements that might have slipped through (they shouldn't be rendered)
        // Only answer_input elements should be in participant view (main question elements are excluded by getViewElements)
        participantElements = Editor.QuizStructure.getViewElements(page, 'participant')
            .filter(el => {
                // Only allow answer_input elements - question elements should not be rendered in participant view
                return el.type === 'answer_input' && !el.is_question;
            });
    } else {
        console.error('Editor.QuizStructure.getViewElements not available');
    }
    
    // Get questions in appearance order
    const orderedQuestions = appearanceOrder.length > 0
        ? appearanceOrder
            .map(id => questionElements.find(el => el.id === id))
            .filter(el => el)
        : questionElements;
    
    // Function to show a question and its answer box
    const showQuestion = (questionId) => {
        const questionContainer = document.getElementById(`question-${questionId}`);
        if (questionContainer) {
            questionContainer.style.display = 'block';
            questionContainer.style.visibility = 'visible';
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
        
        // Find the answer_input element for this question from participant view elements
        // answer_input elements are dynamically generated by getViewElements and have parent_id pointing to the question
        let answerInput = participantElements.find(el => 
            el.type === 'answer_input' && el.parent_id === question.id
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
        if (answerInput) {
            // Check if this question was already answered
            const submittedAnswer = submittedAnswers[question.id];
            
            // Render the answer input inside the question container
            const renderedEl = RuntimeRenderer.ElementRenderer.renderElement(questionContainer, answerInput, {
                mode: 'participant',
                insideContainer: true,
                question: question, // Pass question for context
                submitAnswerCallback: submitAnswer, // Pass callback for submission
                submittedAnswer: submittedAnswer // Pass submitted answer if exists
            });
            
            // When insideContainer is true, we need to manually append the element
            if (renderedEl && !renderedEl.parentElement) {
                questionContainer.appendChild(renderedEl);
            } else if (!renderedEl) {
                console.error('renderedEl is null or undefined!');
            }
            
            // Set up submit handlers for the rendered elements
            const submitBtns = renderedEl?.querySelectorAll?.('.submit-answer-btn') || [];
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
            console.warn(`No answer_input found for question ${question.id}`);
            questionContainer.textContent = 'Answer input not available';
        }
        
        container.appendChild(questionContainer);
        
        // CRITICAL: Always respect appearance_visible if it's already set (from server/room state)
        // This ensures participant page shows what control has set, matching display page behavior
        // Control is the source of truth for visibility
        let isVisible = false;
        
        if (question.appearance_visible !== undefined) {
            // Use the stored visibility state from server (what control has set)
            // This takes priority over appearance_mode
            isVisible = question.appearance_visible;
        } else {
            // Fall back to appearance_mode defaults only if appearance_visible is not set
            const appearanceMode = question.appearance_mode || 'on_load';
            if (appearanceMode === 'control') {
                // Control mode elements start hidden, shown only via element_appearance_control events
                isVisible = false;
            } else if (appearanceMode === 'on_load') {
                // On_load elements are visible immediately
                isVisible = true;
            }
            // All other modes (delays, after_previous) start hidden
        }
        
        if (isVisible) {
            // Element is already visible - show immediately
            showQuestion(question.id);
        } else {
            // Element is not visible yet - hide and wait for appearance event from display page
            hideQuestion(question.id);
        }
    });
    
    // Listen for control mode toggles - moved outside renderPage to work across page changes
    // This handler will be set up once in DOMContentLoaded, not inside renderPage
    
    // If no questions, show message
    if (questionElements.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: white; font-size: 1.2rem;">No questions on this page</div>';
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

function showWinnerCelebration() {
    // Create overlay for winner celebration
    const overlay = document.createElement('div');
    overlay.id = 'winner-celebration-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: fadeIn 0.5s ease-in;';
    
    // Add fadeIn animation if not already in style
    if (!document.getElementById('winner-celebration-styles')) {
        const style = document.createElement('style');
        style.id = 'winner-celebration-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes bounce {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-20px) scale(1.1); }
            }
            .winner-trophy {
                animation: bounce 1s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Trophy emoji
    const trophy = document.createElement('div');
    trophy.textContent = '🏆';
    trophy.className = 'winner-trophy';
    trophy.style.cssText = 'font-size: 10rem; margin-bottom: 2rem;';
    overlay.appendChild(trophy);
    
    // Winner message
    const message = document.createElement('div');
    message.textContent = 'YOU WON!';
    message.style.cssText = 'font-size: 4rem; font-weight: bold; color: gold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); margin-bottom: 1rem;';
    overlay.appendChild(message);
    
    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.textContent = 'Congratulations! You are the champion!';
    subtitle.style.cssText = 'font-size: 1.5rem; color: white; margin-bottom: 2rem;';
    overlay.appendChild(subtitle);
    
    // Close button (optional, could auto-hide after a few seconds)
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Continue';
    closeBtn.style.cssText = 'padding: 1rem 2rem; font-size: 1.2rem; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;';
    closeBtn.onclick = () => {
        overlay.remove();
    };
    overlay.appendChild(closeBtn);
    
    document.body.appendChild(overlay);
    
    // Trigger confetti
    if (typeof confetti !== 'undefined') {
        // Multiple bursts of confetti
        const duration = 5000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10001 };
        
        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }
        
        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            
            if (timeLeft <= 0) {
                return clearInterval(interval);
            }
            
            const particleCount = 50 * (timeLeft / duration);
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
        
        // Also trigger a big burst at the start
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            zIndex: 10001
        });
    }
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (overlay.parentElement) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 1s ease-out';
            setTimeout(() => {
                if (overlay.parentElement) {
                    overlay.remove();
                }
            }, 1000);
        }
    }, 10000);
}