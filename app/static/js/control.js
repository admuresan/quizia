// Quizmaster control page - matches editor control view exactly with live answers
const socket = io();
// roomCode is set in template as window.roomCode
let currentPageIndex = 0;
let quiz = null;
let answers = {}; // { question_id: { participant_id: { answer, submission_time, correct, bonus_points } } }
let participants = {}; // { participant_id: { name, avatar } }

document.addEventListener('DOMContentLoaded', () => {
    if (!window.roomCode) {
        console.error('Room code not found');
        return;
    }
    
    socket.on('connect', () => {
        socket.emit('quizmaster_join_control', { room_code: window.roomCode });
    });

    socket.on('joined_control', (data) => {
        if (data.quiz) {
            quiz = data.quiz;
        }
        // Always use server's current_page to stay in sync
        if (data.current_page !== undefined) {
            currentPageIndex = data.current_page;
        }
        // Update participants from initial join if provided
        if (data.participants) {
            participants = data.participants;
        }
        // Load all submitted answers from server
        if (data.answers) {
            answers = data.answers;
        }
        console.log('Joined control - current page index:', currentPageIndex);
        updateNavigationButtons();
        loadPage();
    });

    socket.on('quiz_state', (data) => {
        if (data.quiz) {
            quiz = data.quiz;
        }
        // Always use server's current_page to stay in sync
        if (data.current_page !== undefined) {
            currentPageIndex = data.current_page;
        }
        // Update answers if provided
        if (data.answers) {
            answers = data.answers;
        }
        console.log('Quiz state updated - current page index:', currentPageIndex);
        loadPage();
        updateNavigationButtons();
    });

    socket.on('page_changed', (data) => {
        // Always use server's page_index to stay in sync
        if (data.page_index !== undefined) {
            currentPageIndex = data.page_index;
        }
        if (data.quiz) {
            quiz = data.quiz;
        }
        console.log('Page changed to index:', currentPageIndex);
        loadPage();
        updateNavigationButtons();
    });
    
    socket.on('participant_joined', (data) => {
        // Add/update single participant
        if (data.participant_id) {
            participants[data.participant_id] = {
                name: data.name,
                avatar: data.avatar
            };
            console.log('Participant joined - updated participants:', Object.keys(participants));
            // Refresh the page to show new participant in answer sections
            loadPage();
        }
    });
    
    socket.on('participant_list_update', (data) => {
        if (data.participants) {
            console.log('Participant list update received - participant IDs:', Object.keys(data.participants));
            console.log('Participant list update - full data:', data.participants);
            // Replace entire participants object to ensure consistency with server
            participants = data.participants;
            console.log('Participants after update:', Object.keys(participants));
            // Refresh the page to show updated participant list in answer sections
            loadPage();
        }
    });

    socket.on('answer_submitted', (data) => {
        // Store answer
        if (!answers[data.question_id]) {
            answers[data.question_id] = {};
        }
        answers[data.question_id][data.participant_id] = {
            answer: data.answer,
            submission_time: data.submission_time,
            timestamp: data.timestamp,
            correct: false,
            bonus_points: 0
        };
        
        // Update answer display if we're on the page with this question
        updateAnswerDisplay(data.question_id);
    });

    socket.on('score_updated', (data) => {
        // Scores updated - answer displays will update on next render
    });
    
    socket.on('quiz_ended', (data) => {
        alert('Quiz has ended!');
    });
    
    socket.on('error', (data) => {
        console.error('Socket error:', data);
        if (data.message) {
            alert('Error: ' + data.message);
            // If access denied, redirect to quizmaster dashboard
            if (data.message.includes('Access denied') || data.message.includes('access denied')) {
                setTimeout(() => {
                    window.location.href = '/quizmaster';
                }, 2000);
            }
        }
    });
    
    // Listen for element appearance changes to update toggles
    socket.on('element_appearance_control', (data) => {
        // Update toggle state when element visibility changes
        const elementId = data.element_id;
        const visible = data.visible;
        
        // Find the element in the quiz data and update its toggle
        if (quiz && quiz.pages) {
            quiz.pages.forEach(page => {
                if (page.elements) {
                    const element = page.elements.find(el => el.id === elementId);
                    if (element && element._updateAppearanceToggle) {
                        element._updateAppearanceToggle(visible);
                    }
                }
            });
        }
    });

    // Navigation buttons
    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
        socket.emit('quizmaster_navigate', {
            room_code: window.roomCode,
            direction: 'prev'
        });
    });

    document.getElementById('next-page-btn')?.addEventListener('click', () => {
        socket.emit('quizmaster_navigate', {
            room_code: window.roomCode,
            direction: 'next'
        });
    });

    // End quiz button
    document.getElementById('end-quiz-btn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to end the quiz?')) {
            socket.emit('quizmaster_end_quiz', { room_code: window.roomCode });
        }
    });
    
    // Media control buttons (event delegation for dynamically created buttons)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('control-play-btn')) {
            const elementId = e.target.dataset.elementId;
            socket.emit('quizmaster_control_element', {
                room_code: window.roomCode,
                element_id: elementId,
                action: 'play'
            });
        } else if (e.target.classList.contains('control-pause-btn')) {
            const elementId = e.target.dataset.elementId;
            socket.emit('quizmaster_control_element', {
                room_code: window.roomCode,
                element_id: elementId,
                action: 'pause'
            });
        } else if (e.target.classList.contains('save-answer-btn')) {
            const participantId = e.target.dataset.participantId;
            const questionId = e.target.dataset.questionId;
            const row = document.getElementById(`answer-${participantId}-${questionId}`);
            if (row) {
                const correctCheck = row.querySelector('.correct-checkbox');
                const bonusInput = row.querySelector('.bonus-points-input');
                saveAnswerMark(participantId, questionId, correctCheck.checked, parseInt(bonusInput.value) || 0);
            }
        }
    });
});

function loadPage() {
    const canvas = document.getElementById('control-canvas');
    
    if (!canvas || !quiz || !quiz.pages) {
        console.error('Missing required elements:', { canvas: !!canvas, quiz: !!quiz });
        return;
    }
    
    // Ensure currentPageIndex is valid
    if (currentPageIndex < 0 || currentPageIndex >= quiz.pages.length) {
        console.warn('Invalid page index, resetting to 0:', currentPageIndex);
        currentPageIndex = 0;
    }
    
    const page = quiz.pages[currentPageIndex];
    
    // Clear canvas but preserve navigation buttons
    const navButtons = Array.from(canvas.children).filter(
        child => child.id === 'prev-page-btn' || child.id === 'next-page-btn'
    );
    canvas.innerHTML = '';
    navButtons.forEach(btn => canvas.appendChild(btn));
    
    // Set up canvas
    canvas.style.position = 'relative';
    canvas.style.width = '100%';
    canvas.style.minHeight = '400px';
    canvas.style.marginBottom = '2rem';
    
    // Set background
    const bgColor = quiz?.background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const bgImage = quiz?.background_image;
    
    if (bgImage) {
        canvas.style.backgroundImage = `url(${bgImage})`;
        canvas.style.backgroundSize = 'cover';
        canvas.style.backgroundPosition = 'center';
        canvas.style.backgroundRepeat = 'no-repeat';
    } else {
        canvas.style.background = bgColor;
        canvas.style.backgroundImage = 'none';
    }
    
    // Get canvas dimensions
    const viewSettings = quiz?.view_settings?.control || { canvas_width: 1920, canvas_height: 1080 };
    const canvasWidth = viewSettings.canvas_width || 1920;
    const canvasHeight = viewSettings.canvas_height || 1080;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.style.maxWidth = '100%';
    canvas.style.overflow = 'hidden';
    
    // Ensure navigation buttons are positioned correctly
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    if (prevBtn) {
        prevBtn.style.position = 'absolute';
        prevBtn.style.top = '20px';
        prevBtn.style.left = '20px';
        prevBtn.style.zIndex = '10000';
        prevBtn.style.cssText += 'padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; color: white; background: #2196F3; border: 2px solid #1976D2; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3);';
    }
    if (nextBtn) {
        nextBtn.style.position = 'absolute';
        nextBtn.style.top = '20px';
        nextBtn.style.right = '20px';
        nextBtn.style.zIndex = '10000';
        nextBtn.style.cssText += 'padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; color: white; background: #2196F3; border: 2px solid #1976D2; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3);';
    }
    
    // Handle special page types - but still show navigation buttons
    if (page.type === 'status' || page.type === 'results') {
        // Clear canvas content but preserve navigation buttons
        const navButtons = Array.from(canvas.children).filter(
            child => child.id === 'prev-page-btn' || child.id === 'next-page-btn' || child.id === 'finalize-scores-btn'
        );
        canvas.innerHTML = '';
        // Re-add navigation buttons first
        navButtons.forEach(btn => canvas.appendChild(btn));
        
        // Add status message
        const statusMsg = document.createElement('div');
        statusMsg.style.cssText = 'display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 2rem; position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 1;';
        statusMsg.textContent = 'Status/Results page - view on display screen';
        canvas.appendChild(statusMsg);
        
        // Add Finalize Scores button for results page
        if (page.type === 'results') {
            let finalizeBtn = document.getElementById('finalize-scores-btn');
            if (!finalizeBtn) {
                finalizeBtn = document.createElement('button');
                finalizeBtn.id = 'finalize-scores-btn';
                finalizeBtn.textContent = 'Finalize Scores';
                finalizeBtn.className = 'finalize-scores-button';
                finalizeBtn.style.cssText = 'position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 10000; padding: 1rem 2rem; font-size: 1.2rem; font-weight: bold; color: white; background: #4CAF50; border: 2px solid #45a049; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3);';
                finalizeBtn.addEventListener('click', () => {
                    socket.emit('quizmaster_finalize_scores', { room_code: window.roomCode });
                });
                canvas.appendChild(finalizeBtn);
            }
        } else {
            // Remove button if not on results page
            const existingBtn = document.getElementById('finalize-scores-btn');
            if (existingBtn) {
                existingBtn.remove();
            }
        }
        
        // Navigation buttons are preserved and visible, update their state
        updateNavigationButtons();
        return;
    }
    
    // Remove finalize button if not on results page
    const existingBtn = document.getElementById('finalize-scores-btn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    // Render control view elements - ONLY control-specific elements
    if (page.elements) {
        // Audio/video control elements (for controlling media)
        const audioVideoElements = page.elements.filter(el => 
            (el.type === 'audio' || el.type === 'video' || el.media_type === 'audio' || el.media_type === 'video') &&
            (!el.view || el.view === 'display')
        );
        
        audioVideoElements.forEach(mediaElement => {
            // Check if control element exists
            const existingControl = page.elements.find(el => 
                el.type === 'audio_control' && 
                el.parent_id === mediaElement.id && 
                el.view === 'control'
            );
            
            if (existingControl) {
                RuntimeRenderer.ElementRenderer.renderElement(canvas, existingControl, {
                    mode: 'control'
                });
            }
        });
        
        // Answer display elements (for showing and marking answers)
        const questionElements = page.elements.filter(el => 
            el.is_question && (!el.view || el.view === 'display')
        );
        
        questionElements.forEach(question => {
            const answerDisplay = page.elements.find(el => 
                el.type === 'answer_display' && 
                el.parent_id === question.id && 
                el.view === 'control'
            );
            
            if (answerDisplay) {
                // Get answers for this question
                const questionAnswers = answers[question.id] || {};
                
                // Get answer_type - prioritize question element's answer_type as source of truth
                // Fallback to answer_input element, then to answer_display element
                // This handles legacy quizzes where answer_display.answer_type might be incorrect
                let answerType = question.answer_type;
                if (!answerType) {
                    // Try to get it from the associated answer_input element
                    const answerInput = page.elements.find(el => 
                        el.type === 'answer_input' && 
                        el.parent_id === question.id && 
                        el.view === 'participant'
                    );
                    if (answerInput && answerInput.answer_type) {
                        answerType = answerInput.answer_type;
                    } else if (answerDisplay.answer_type) {
                        // Last fallback to answer_display element's answer_type
                        answerType = answerDisplay.answer_type;
                    }
                }
                
                // Get image source if image_click question (image is stored in the question element)
                let imageSrc = null;
                if (answerType === 'image_click') {
                    imageSrc = question.src || (question.filename ? '/api/media/serve/' + question.filename : null);
                    console.log('[DEBUG control.js] Image source:', imageSrc);
                }
                
                RuntimeRenderer.ElementRenderer.renderElement(canvas, answerDisplay, {
                    mode: 'control',
                    answers: questionAnswers,
                    participants: participants,
                    questionTitle: question.question_title || 'Question',
                    imageSrc: imageSrc,
                    answerType: answerType, // Pass answerType to renderer
                    onMarkAnswer: saveAnswerMark
                });
            }
        });
        
        // Appearance control element (for controlling element appearance)
        const appearanceControl = page.elements.find(el => 
            el.type === 'appearance_control' && 
            el.view === 'control'
        );
        
        if (appearanceControl) {
            RuntimeRenderer.ElementRenderer.renderElement(canvas, appearanceControl, {
                mode: 'control',
                quiz: quiz,
                page: page,
                socket: socket,
                roomCode: window.roomCode
            });
        }
    }
}

function updateAnswerDisplay(questionId) {
    // Find the answer display element for this question and re-render it
    if (!quiz || !quiz.pages || !quiz.pages[currentPageIndex]) return;
    
    const page = quiz.pages[currentPageIndex];
    const question = page.elements?.find(el => el.id === questionId);
    
    if (!question || !question.is_question) return;
    
    const answerDisplay = page.elements.find(el => 
        el.type === 'answer_display' && 
        el.parent_id === questionId && 
        el.view === 'control'
    );
    
    if (answerDisplay) {
        // Remove old answer display
        const oldEl = document.getElementById(`element-${answerDisplay.id}`);
        if (oldEl) {
            oldEl.remove();
        }
        
        // Re-render with updated answers
        const canvas = document.getElementById('control-canvas');
        const questionAnswers = answers[questionId] || {};
        
        // Get answer_type - prioritize question element's answer_type as source of truth
        // Fallback to answer_input element, then to answer_display element
        // This handles legacy quizzes where answer_display.answer_type might be incorrect
        let answerType = question.answer_type;
        if (!answerType) {
            // Try to get it from the associated answer_input element
            const answerInput = page.elements.find(el => 
                el.type === 'answer_input' && 
                el.parent_id === questionId && 
                el.view === 'participant'
            );
            if (answerInput && answerInput.answer_type) {
                answerType = answerInput.answer_type;
            } else if (answerDisplay.answer_type) {
                // Last fallback to answer_display element's answer_type
                answerType = answerDisplay.answer_type;
            }
        }
        
        // Get image source if image_click question (image is stored in the question element)
        let imageSrc = null;
        if (answerType === 'image_click') {
            imageSrc = question.src || (question.filename ? '/api/media/serve/' + question.filename : null);
        }
        
        RuntimeRenderer.ElementRenderer.renderElement(canvas, answerDisplay, {
            mode: 'control',
            answers: questionAnswers,
            participants: participants,
            questionTitle: question.question_title || 'Question',
            imageSrc: imageSrc,
            answerType: answerType, // Pass answerType to renderer
            onMarkAnswer: saveAnswerMark
        });
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    
    if (!prevBtn || !nextBtn || !quiz || !quiz.pages) return;
    
    const totalPages = quiz.pages.length;
    
    prevBtn.disabled = currentPageIndex === 0;
    nextBtn.disabled = currentPageIndex >= totalPages - 1;
    
    // Update footer page indicator
    const pageIndicator = document.getElementById('page-indicator');
    if (pageIndicator) {
        pageIndicator.textContent = `Page ${currentPageIndex + 1} of ${totalPages}`;
    }
}

function saveAnswerMark(participantId, questionId, correct, bonusPoints) {
    socket.emit('quizmaster_mark_answer', {
        room_code: window.roomCode,
        participant_id: participantId,
        question_id: questionId,
        correct: correct,
        bonus_points: bonusPoints
    });
    
    // Update local answer data
    if (!answers[questionId]) {
        answers[questionId] = {};
    }
    if (!answers[questionId][participantId]) {
        answers[questionId][participantId] = {};
    }
    answers[questionId][participantId].correct = correct;
    answers[questionId][participantId].bonus_points = bonusPoints;
}