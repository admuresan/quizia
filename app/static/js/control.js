// Quizmaster control page - matches editor control view exactly with live answers
const socket = io({ transports: ['polling', 'websocket'], upgrade: true, reconnection: true });
window.socket = socket; // Make socket available globally for question type views
// roomCode is set in template as window.roomCode
let currentPageIndex = 0;
let quiz = null;
let answers = {}; // { question_id: { participant_id: { answer, submission_time, correct, bonus_points } } }
let participants = {}; // { participant_id: { name, avatar } }
// Answer visibility state: { question_id: { participant_ids: [participant_id], control_answer: boolean } }
// Store on window so it's accessible from control view renderers
window.answerVisibility = {}; // { question_id: { visibleParticipants: Set, controlAnswerVisible: boolean } }

document.addEventListener('DOMContentLoaded', () => {
    if (!window.roomCode) {
        console.error('Room code not found');
        return;
    }
    
    // Ensure rerender button is visible from the start
    const rerenderBtn = document.getElementById('rerender-btn');
    if (rerenderBtn) {
        rerenderBtn.style.cssText = 'position: absolute; top: 20px; left: 50%; transform: translateX(-50%); z-index: 10000; padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; color: white; background: #2196F3; border: 2px solid #1976D2; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: block; visibility: visible;';
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
            // Add new participant to visibility sets for all questions (default: visible)
            if (!window.answerVisibility) {
                window.answerVisibility = {};
            }
            // Add to all existing question visibility sets
            Object.keys(window.answerVisibility).forEach(questionId => {
                if (!window.answerVisibility[questionId].visibleParticipants) {
                    window.answerVisibility[questionId].visibleParticipants = new Set();
                }
                window.answerVisibility[questionId].visibleParticipants.add(data.participant_id);
            });
            // Update answer displays for all questions to show new participant
            // Don't call loadPage() as it re-renders everything including appearance control,
            // which would reset visibility toggles. Instead, update only answer displays.
            if (quiz && quiz.pages && quiz.pages[currentPageIndex]) {
                const page = quiz.pages[currentPageIndex];
                const elementsDict = page.elements || {};
                // Find all question elements and update their answer displays
                if (page.views && page.views.display && page.views.display.local_element_configs) {
                    const displayLocalConfigs = page.views.display.local_element_configs || {};
                    Object.keys(displayLocalConfigs).forEach(elementId => {
                        const elementData = elementsDict[elementId];
                        if (elementData && elementData.is_question) {
                            updateAnswerDisplay(elementId);
                        }
                    });
                }
            }
        }
    });
    
    socket.on('participant_list_update', (data) => {
        if (data.participants) {
            // Replace entire participants object to ensure consistency with server
            const oldParticipantIds = new Set(Object.keys(participants));
            participants = data.participants;
            const newParticipantIds = new Set(Object.keys(participants));
            
            // Update visibility sets: add new participants, remove removed participants
            if (!window.answerVisibility) {
                window.answerVisibility = {};
            }
            Object.keys(window.answerVisibility).forEach(questionId => {
                const visibility = window.answerVisibility[questionId];
                if (!visibility.visibleParticipants) {
                    visibility.visibleParticipants = new Set();
                }
                // Add new participants (default: visible)
                newParticipantIds.forEach(pid => {
                    if (!oldParticipantIds.has(pid)) {
                        visibility.visibleParticipants.add(pid);
                    }
                });
                // Remove participants that left
                oldParticipantIds.forEach(pid => {
                    if (!newParticipantIds.has(pid)) {
                        visibility.visibleParticipants.delete(pid);
                    }
                });
            });
            
            // Update answer displays for all questions to show updated participant list
            // Don't call loadPage() as it re-renders everything including appearance control,
            // which would reset visibility toggles. Instead, update only answer displays.
            if (quiz && quiz.pages && quiz.pages[currentPageIndex]) {
                const page = quiz.pages[currentPageIndex];
                const elementsDict = page.elements || {};
                // Find all question elements and update their answer displays
                if (page.views && page.views.display && page.views.display.local_element_configs) {
                    const displayLocalConfigs = page.views.display.local_element_configs || {};
                    Object.keys(displayLocalConfigs).forEach(elementId => {
                        const elementData = elementsDict[elementId];
                        if (elementData && elementData.is_question) {
                            updateAnswerDisplay(elementId);
                        }
                    });
                }
            }
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
    
    // Helper function to update toggle state for an element
    function updateElementToggle(elementId, visible) {
        // Find the appearance control container by looking for an element with _toggleUpdateFunctions
        const canvas = document.getElementById('control-canvas');
        if (canvas) {
            // Find all elements that might be the appearance control container
            const allElements = canvas.querySelectorAll('.runtime-element');
            let appearanceControlContainer = null;
            
            for (let el of allElements) {
                if (el._toggleUpdateFunctions) {
                    appearanceControlContainer = el;
                    break;
                }
            }
            
            if (appearanceControlContainer && appearanceControlContainer._toggleUpdateFunctions) {
                const updateFunction = appearanceControlContainer._toggleUpdateFunctions[elementId];
                if (updateFunction) {
                    updateFunction(visible);
                }
            }
        }
    }
    
    // Listen for element appearance control events (when user toggles visibility)
    socket.on('element_appearance_control', (data) => {
        // Update toggle state when element visibility changes
        const elementId = data.element_id;
        const visible = data.visible;
        updateElementToggle(elementId, visible);
    });
    
    socket.on('element_media_control', (data) => {
        // Update media play/pause state when changed
        const elementId = data.element_id;
        const playing = data.playing;
        if (window.MediaControlManager) {
            window.MediaControlManager.setMediaState(elementId, playing);
        }
    });
    
    // REMOVED: Listen for element_appearance_changed from display
    // Control is the source of truth - display should never update control
    // Control initializes visibility from room data on load, and only updates via user toggles

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

    // Rerender button
    document.getElementById('rerender-btn')?.addEventListener('click', () => {
        if (confirm('Reload quiz from saved file? This will update the quiz based on any changes made to the quiz file.')) {
            socket.emit('quizmaster_rerender_quiz', { room_code: window.roomCode });
        }
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
        child => child.id === 'prev-page-btn' || child.id === 'next-page-btn' || child.id === 'rerender-btn'
    );
    canvas.innerHTML = '';
    navButtons.forEach(btn => canvas.appendChild(btn));
    
    // Get canvas dimensions from page view_config.size (new format)
    let canvasWidth = 1920;
    let canvasHeight = 1080;
    if (page && page.views && page.views.control && page.views.control.view_config && page.views.control.view_config.size) {
        canvasWidth = page.views.control.view_config.size.width || 1920;
        canvasHeight = page.views.control.view_config.size.height || 1080;
    }
    
    console.log('[Control] Canvas dimensions from quiz file:', {
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight,
        source: 'views.control.view_config.size',
        viewConfig: page && page.views && page.views.control ? page.views.control.view_config : null
    });
    
    // Set up canvas with exact dimensions (matching editor setup)
    canvas.style.position = 'relative';
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.style.minWidth = `${canvasWidth}px`;
    canvas.style.maxWidth = `${canvasWidth}px`;
    canvas.style.minHeight = `${canvasHeight}px`;
    canvas.style.maxHeight = `${canvasHeight}px`;
    canvas.style.boxSizing = 'border-box';
    canvas.style.overflow = 'hidden';
    canvas.style.marginBottom = '2rem';
    
    // Position in top-left when screen is larger than view (runtime mode only)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const canvasWrapper = document.getElementById('control-canvas-wrapper');
    if (canvasWrapper && viewportWidth >= canvasWidth && viewportHeight >= canvasHeight) {
        // Screen is larger - position in top-left
        canvasWrapper.style.justifyContent = 'flex-start';
        canvasWrapper.style.alignItems = 'flex-start';
        canvasWrapper.style.padding = '0';
        canvas.style.margin = '0';
    } else {
        // Screen is smaller or equal - use default behavior (centered)
        if (canvasWrapper) {
            canvasWrapper.style.justifyContent = 'center';
            canvasWrapper.style.alignItems = 'center';
            canvasWrapper.style.padding = '2rem';
        }
    }
    
    console.log('[Control] Canvas element computed styles after setup:', {
        width: canvas.style.width,
        height: canvas.style.height,
        position: canvas.style.position,
        actualWidth: canvas.offsetWidth,
        actualHeight: canvas.offsetHeight,
        boundingRect: canvas.getBoundingClientRect()
    });
    
    // Set background using shared utility function
    // Use current page for page-specific background, quiz for quiz-level background
    // NO hardcoded fallbacks - only use what's in the saved quiz
    if (window.BackgroundUtils && window.BackgroundUtils.applyBackground) {
        window.BackgroundUtils.applyBackground(canvas, page, quiz, 'control');
    } else {
        console.error('BackgroundUtils not available');
    }
    
    // Ensure navigation buttons are positioned correctly
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const rerenderBtn = document.getElementById('rerender-btn');
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
    if (rerenderBtn) {
        rerenderBtn.style.cssText = 'position: absolute; top: 20px; left: 50%; transform: translateX(-50%); z-index: 10000; padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; color: white; background: #2196F3; border: 2px solid #1976D2; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: block; visibility: visible;';
    }
    
    // Handle special page types - but still show navigation buttons
    const pageType = page.page_type;
    if (pageType === 'status_page' || pageType === 'result_page') {
        // Clear canvas content but preserve navigation buttons
        const navButtons = Array.from(canvas.children).filter(
            child => child.id === 'prev-page-btn' || child.id === 'next-page-btn' || child.id === 'rerender-btn' || child.id === 'finalize-scores-btn'
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
        if (pageType === 'results' || pageType === 'result_page') {
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
    // Get elements from new structure
    let controlElements = [];
    let displayElements = [];
    let elementsDict = page.elements || {};
    
    // Use helper functions
    if (Editor && Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
        controlElements = Editor.QuizStructure.getViewElements(page, 'control');
        displayElements = Editor.QuizStructure.getViewElements(page, 'display');
    } else {
        console.error('Editor.QuizStructure.getViewElements not available');
    }
    
    if (controlElements.length > 0 || displayElements.length > 0) {
        // Playable elements (audio/video/counter) control elements (for controlling media)
        const audioVideoElements = displayElements.filter(el => {
            if (window.ElementTypes && window.ElementTypes.isElementPlayable) {
                return window.ElementTypes.isElementPlayable(el);
            }
            // Fallback for when ElementTypes is not loaded
            return (el.type === 'audio' || el.type === 'video' || el.type === 'counter' || 
                   el.media_type === 'audio' || el.media_type === 'video');
        });
        
        audioVideoElements.forEach(mediaElement => {
            // Check if control element exists
            const existingControl = controlElements.find(el => 
                el.type === 'audio_control' && el.parent_id === mediaElement.id
            );
            
            if (existingControl) {
                RuntimeRenderer.ElementRenderer.renderElement(canvas, existingControl, {
                    mode: 'control',
                    page: page // Pass page so runtime renderer can look up parent element
                });
            }
        });
        
        // Answer display elements (for showing and marking answers)
        const questionElements = displayElements.filter(el => el.is_question);
        
        questionElements.forEach(questionViewElement => {
            const answerDisplay = controlElements.find(el => 
                el.type === 'answer_display' && el.parent_id === questionViewElement.id
            );
            
            if (answerDisplay) {
                // Get the actual question element from page.elements (contains question_config)
                const questionElement = elementsDict[questionViewElement.id];
                
                // Get answers for this question
                const questionAnswers = answers[questionViewElement.id] || {};
                
                // Get question_type from the actual question element's question_config (from page.elements)
                let answerType = 'text';
                if (questionElement && questionElement.question_config && questionElement.question_config.question_type) {
                    answerType = questionElement.question_config.question_type;
                }
                
                // Normalize 'image' to 'image_click' for consistency
                if (answerType === 'image') {
                    answerType = 'image_click';
                }
                
                // If still not found, try to get it from the associated answer_input element
                if (!answerType || answerType === 'text') {
                    if (page.views && page.views.participant && page.views.participant.local_element_configs) {
                        const participantLocalConfigs = page.views.participant.local_element_configs || {};
                        
                        Object.keys(participantLocalConfigs).forEach(elementId => {
                            const elementData = elementsDict[elementId];
                            if (elementData && elementData.type === 'answer_input') {
                                const questionConfig = elementData.question_config || {};
                                const parentId = questionConfig.parent_id || elementData.parent_id;
                                if (parentId === questionViewElement.id) {
                                    const foundType = questionConfig.question_type || 'text';
                                    // Normalize 'image' to 'image_click'
                                    answerType = (foundType === 'image') ? 'image_click' : foundType;
                                }
                            }
                        });
                    }
                }
                
                // Last fallback to answer_display element's question_type
                if (!answerType || answerType === 'text') {
                    if (answerDisplay) {
                        const foundType = (answerDisplay.question_config && answerDisplay.question_config.question_type) || 'text';
                        // Normalize 'image' to 'image_click'
                        answerType = (foundType === 'image') ? 'image_click' : foundType;
                    }
                }
                
                // Get image source if image_click question (image is stored in the question element's properties)
                let imageSrc = null;
                if (answerType === 'image_click' && questionElement) {
                    const properties = questionElement.properties || {};
                    imageSrc = properties.media_url || 
                              (properties.file_name ? '/api/media/serve/' + properties.file_name : null) ||
                              (properties.filename ? '/api/media/serve/' + properties.filename : null) ||
                              questionViewElement.src || 
                              (questionViewElement.filename ? '/api/media/serve/' + questionViewElement.filename : null);
                }
        
                // Initialize answer visibility state for this question if not exists
                if (!window.answerVisibility[questionViewElement.id]) {
                    const allParticipantIds = Object.keys(participants || {});
                    window.answerVisibility[questionViewElement.id] = {
                        visibleParticipants: new Set(allParticipantIds),
                        controlAnswerVisible: false
                    };
                }
        
                // Extract question title from question_config first, then fallback to question_title
                const questionTitle = (questionElement && questionElement.question_config && questionElement.question_config.question_title) 
                    || (questionViewElement.question_config && questionViewElement.question_config.question_title)
                    || questionViewElement.question_title 
                    || 'Question';
                
                RuntimeRenderer.ElementRenderer.renderElement(canvas, answerDisplay, {
                    mode: 'control',
                    answers: questionAnswers,
                    participants: participants,
                    questionTitle: questionTitle,
                    imageSrc: imageSrc,
                    answerType: answerType, // Pass answerType to renderer
                    onMarkAnswer: saveAnswerMark,
                    question: questionElement || questionViewElement // Pass actual question element to access correct_answer
                });
            }
        });
        
        // Appearance control element (for controlling element appearance)
        // Always ensure it exists - create default if not found
        let appearanceControl = controlElements.find(el => el.type === 'appearance_control');
        
        if (!appearanceControl) {
            // Create a default appearance control element if one doesn't exist
            appearanceControl = {
                id: `element-${Date.now()}-appearance-control`,
                type: 'appearance_control',
                view: 'control',
                x: 50,
                y: 100,
                width: 400,
                height: 300
            };
        }
        
        // Always render the appearance control element
        RuntimeRenderer.ElementRenderer.renderElement(canvas, appearanceControl, {
            mode: 'control',
            quiz: quiz,
            page: page,
            socket: socket,
            roomCode: window.roomCode
        });
    }
}

function updateAnswerDisplay(questionId) {
    // Find the answer display element for this question and re-render it
    if (!quiz || !quiz.pages || !quiz.pages[currentPageIndex]) return;
    
    const page = quiz.pages[currentPageIndex];
    
    // Get question from new structure
    let question = null;
    const elementsDict = page.elements || {};
    
    if (page.views && page.views.display && page.views.display.local_element_configs) {
        const displayLocalConfigs = page.views.display.local_element_configs || {};
        
        Object.keys(displayLocalConfigs).forEach(elementId => {
            if (elementId === questionId) {
                const elementData = elementsDict[elementId];
                if (elementData && elementData.is_question) {
                    const localConfig = displayLocalConfigs[elementId];
                    const config = localConfig.config || {};
                    const properties = elementData.properties || {};
                    const questionConfig = elementData.question_config || {};
                    
                    question = {
                        id: elementId,
                        type: elementData.type,
                        is_question: true,
                        ...properties,
                        x: config.x || 0,
                        y: config.y || 0,
                        width: config.width || 100,
                        height: config.height || 100,
                        question_title: questionConfig.question_title || '',
                        question_type: questionConfig.question_type || 'text',
                        answer_type: questionConfig.question_type || 'text',
                        options: questionConfig.options || []
                    };
                }
            }
        });
    }
    
    if (!question || !question.is_question) return;
    
    // Get answer_display from new structure
    const canvas = document.getElementById('control-canvas');
    const questionAnswers = answers[questionId] || {};
    let answerDisplay = null;
        if (page.views && page.views.control && page.views.control.local_element_configs) {
            const controlLocalConfigs = page.views.control.local_element_configs || {};
            
            Object.keys(controlLocalConfigs).forEach(elementId => {
                const elementData = elementsDict[elementId];
                if (elementData && elementData.type === 'answer_display') {
                    const questionConfig = elementData.question_config || {};
                    const parentId = questionConfig.parent_id || elementData.parent_id;
                    if (parentId === questionId) {
                        const localConfig = controlLocalConfigs[elementId];
                        const answerConfig = localConfig.answer_config || {};
                        const properties = elementData.properties || {};
                        
                        answerDisplay = {
                            id: elementId,
                            type: elementData.type,
                            parent_id: parentId,
                            ...properties,
                            x: answerConfig.x || 0,
                            y: answerConfig.y || 0,
                            width: answerConfig.width || 100,
                            height: answerConfig.height || 100,
                            question_type: questionConfig.question_type || 'text',
                            answer_type: questionConfig.question_type || 'text',
                            options: questionConfig.options || []
                        };
                    }
                }
            });
        }
        
        if (!answerDisplay) return;
        
        // Get question_type from question element's question_config
        let answerType = (question.question_config && question.question_config.question_type) || 'text';
        
        // If not found, try to get it from the associated answer_input element
        if (!answerType && page.views && page.views.participant && page.views.participant.local_element_configs) {
            const participantLocalConfigs = page.views.participant.local_element_configs || {};
            
            Object.keys(participantLocalConfigs).forEach(elementId => {
                const elementData = elementsDict[elementId];
                if (elementData && elementData.type === 'answer_input') {
                    const questionConfig = elementData.question_config || {};
                    const parentId = questionConfig.parent_id || elementData.parent_id;
                    if (parentId === questionId) {
                        answerType = questionConfig.question_type || 'text';
                    }
                }
            });
        }
        
        // Last fallback to answer_display element's question_type
        if (!answerType && answerDisplay) {
            answerType = (answerDisplay.question_config && answerDisplay.question_config.question_type) || 'text';
        }
        
        // Get image source if image_click question (image is stored in the question element)
        let imageSrc = null;
        if (answerType === 'image_click') {
            imageSrc = question.src || (question.filename ? '/api/media/serve/' + question.filename : null);
        }
        
        // Extract question title from question_config first, then fallback to question_title
        const questionTitle = (question.question_config && question.question_config.question_title) 
            || question.question_title 
            || 'Question';
        
        RuntimeRenderer.ElementRenderer.renderElement(canvas, answerDisplay, {
            mode: 'control',
            answers: questionAnswers,
            participants: participants,
            questionTitle: questionTitle,
            imageSrc: imageSrc,
            answerType: answerType, // Pass answerType to renderer
            onMarkAnswer: saveAnswerMark,
            question: question // Pass question element to access correct_answer
        });
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
        const currentPage = quiz.pages[currentPageIndex];
        const pageName = currentPage && currentPage.name ? currentPage.name : `Page ${currentPageIndex + 1}`;
        pageIndicator.textContent = `Page ${currentPageIndex + 1} of ${totalPages} - ${pageName}`;
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