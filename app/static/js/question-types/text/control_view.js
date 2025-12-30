/**
 * Text question type - Control view
 * New layout: First row (avatar+name+time), Second row (answer textbox + correct checkbox + bonus)
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Text = QuestionTypes.Text || {};

QuestionTypes.Text.ControlView = (function() {
    const Common = QuestionTypes.Common;
    
    function render(container, options) {
        const questionId = options.questionId;
        const questionTitle = options.questionTitle || 'Question';
        const answers = options.answers || {};
        const participants = options.participants || {};
        const onMarkAnswer = options.onMarkAnswer || null;
        const answerType = options.answerType || 'text';
        const question = options.question || null; // Question element to get correct_answer
        // Extract correct_answer: check question_config first, then direct property
        const correctAnswer = question ? (
            (question.question_config && question.question_config.question_correct_answer !== undefined) 
                ? question.question_config.question_correct_answer 
                : (question.question_correct_answer !== undefined ? question.question_correct_answer : 
                   (question.correct_answer !== undefined ? question.correct_answer : null))
        ) : null;
        
        container.style.backgroundColor = 'white';
        container.style.border = '2px solid #2196F3';
        container.style.borderRadius = '8px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.position = 'relative';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.overflow = 'hidden';
        container.style.boxSizing = 'border-box';
        
        // Title at top with toggle button in top right - STICKY
        const titleHeader = document.createElement('div');
        titleHeader.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #2196F3; padding: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10; flex-shrink: 0;';
        
        const titleText = document.createElement('div');
        titleText.textContent = questionTitle;
        titleHeader.appendChild(titleText);
        
        // Toggle button in top right corner
        const toggleContainer = document.createElement('div');
        toggleContainer.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
        
        const toggleLabel = document.createElement('label');
        toggleLabel.textContent = 'Show on Display';
        toggleLabel.style.cssText = 'font-size: 0.85rem; color: #666; cursor: pointer;';
        
        const toggleSwitch = document.createElement('input');
        toggleSwitch.type = 'checkbox';
        toggleSwitch.className = 'answer-display-toggle';
        toggleSwitch.dataset.questionId = questionId;
        toggleSwitch.checked = false; // Default off
        
        toggleLabel.htmlFor = toggleSwitch.id = `toggle-${questionId}`;
        toggleContainer.appendChild(toggleLabel);
        toggleContainer.appendChild(toggleSwitch);
        titleHeader.appendChild(toggleContainer);
        
        // Initialize answer visibility state if not exists
        if (!window.answerVisibility) {
            window.answerVisibility = {};
        }
        if (!window.answerVisibility[questionId]) {
            // Default: all participants checked, control answer unchecked
            const allParticipantIds = Object.keys(participants || {});
            window.answerVisibility[questionId] = {
                visibleParticipants: new Set(allParticipantIds),
                controlAnswerVisible: false
            };
        }
        
        // Helper function to update display if it's currently showing
        const updateDisplayIfVisible = () => {
            if (!window.socket) {
                return;
            }
            // Only update if the toggle switch is checked (display is showing)
            if (toggleSwitch.checked) {
                const visibility = window.answerVisibility[questionId] || {
                    visibleParticipants: new Set(Object.keys(participants || {})),
                    controlAnswerVisible: false
                };
                
                window.socket.emit('quizmaster_toggle_answer_display', {
                    room_code: window.roomCode,
                    question_id: questionId,
                    visible: true,
                    answers: answers,
                    participants: participants,
                    questionTitle: questionTitle,
                    answerType: answerType,
                    answerVisibility: {
                        visibleParticipantIds: Array.from(visibility.visibleParticipants),
                        controlAnswerVisible: visibility.controlAnswerVisible
                    },
                    correctAnswer: correctAnswer
                });
            }
        };
        
        // Add event listener for toggle
        toggleSwitch.addEventListener('change', () => {
            if (!window.socket) {
                console.error('Socket not available');
                return;
            }
            // Get current visibility state
            const visibility = window.answerVisibility[questionId] || {
                visibleParticipants: new Set(Object.keys(participants || {})),
                controlAnswerVisible: false
            };
            
            window.socket.emit('quizmaster_toggle_answer_display', {
                room_code: window.roomCode,
                question_id: questionId,
                visible: toggleSwitch.checked,
                answers: answers,
                participants: participants,
                questionTitle: questionTitle,
                answerType: answerType,
                answerVisibility: {
                    visibleParticipantIds: Array.from(visibility.visibleParticipants),
                    controlAnswerVisible: visibility.controlAnswerVisible
                },
                correctAnswer: correctAnswer
            });
        });
        
        container.appendChild(titleHeader);
        
        // Scrollable content area
        const scrollableContent = document.createElement('div');
        scrollableContent.style.cssText = 'flex: 1; overflow-y: auto; overflow-x: hidden; padding: 1rem; padding-top: 0.5rem;';
        
        // Answers list
        const answersList = document.createElement('div');
        answersList.id = `answers-list-${questionId}`;
        answersList.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';
        
        const allParticipantIds = Object.keys(participants || {});
        
        allParticipantIds.forEach((participantId) => {
            const answerData = answers[participantId];
            const participant = participants[participantId] || {};
            
            // Main container for this participant's answer
            const answerRow = document.createElement('div');
            answerRow.className = 'answer-row';
            answerRow.id = `answer-${participantId}-${questionId}`;
            answerRow.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; padding: 0.4rem; background: #f5f5f5; border-radius: 4px;';
            
            // Single row: Avatar + Name + Time + Eye + Answer + Correct + Bonus + Save
            const singleRow = document.createElement('div');
            singleRow.style.cssText = 'display: flex; align-items: center; gap: 0.25rem; flex-wrap: nowrap; min-width: 0;';
            
            // Avatar
            const avatar = document.createElement('div');
            avatar.textContent = window.getAvatarEmoji ? window.getAvatarEmoji(participant.avatar) : '👤';
            avatar.style.cssText = 'font-size: 1.1rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;';
            singleRow.appendChild(avatar);
            
            // Name
            const name = document.createElement('div');
            name.style.cssText = 'font-weight: 500; font-size: 0.8rem; min-width: 60px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0;';
            name.textContent = participant.name || 'Unknown';
            singleRow.appendChild(name);
            
            // Submission time (if submitted) - smaller, lighter font
            if (answerData && answerData.submission_time !== undefined) {
                const time = document.createElement('div');
                time.style.cssText = 'color: #999; font-size: 0.7rem; font-weight: normal; white-space: nowrap; flex-shrink: 0;';
                time.textContent = Common.formatSubmissionTime(answerData.submission_time);
                singleRow.appendChild(time);
            }
            
            // Show toggle (eye icon)
            const showAnswerCheckbox = document.createElement('input');
            showAnswerCheckbox.type = 'checkbox';
            showAnswerCheckbox.className = 'show-answer-checkbox';
            showAnswerCheckbox.dataset.participantId = participantId;
            showAnswerCheckbox.dataset.questionId = questionId;
            // Default: checked (all participant answers checked by default)
            const visibility = window.answerVisibility && window.answerVisibility[questionId] ? window.answerVisibility[questionId] : { visibleParticipants: new Set(Object.keys(participants || {})) };
            showAnswerCheckbox.checked = visibility.visibleParticipants ? visibility.visibleParticipants.has(participantId) : true;
            showAnswerCheckbox.style.cssText = 'position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0;';
            
            const showAnswerLabel = document.createElement('div');
            showAnswerLabel.textContent = showAnswerCheckbox.checked ? '👁️' : '👁️‍🗨️';
            showAnswerLabel.style.cssText = 'font-size: 0.9rem; cursor: pointer; white-space: nowrap; display: flex; align-items: center; opacity: ' + (showAnswerCheckbox.checked ? '1' : '0.4') + '; flex-shrink: 0;';
            showAnswerLabel.title = 'Toggle answer visibility';
            
            const toggleVisibility = () => {
                showAnswerCheckbox.checked = !showAnswerCheckbox.checked;
                if (!window.answerVisibility[questionId]) {
                    window.answerVisibility[questionId] = {
                        visibleParticipants: new Set(),
                        controlAnswerVisible: false
                    };
                }
                if (showAnswerCheckbox.checked) {
                    window.answerVisibility[questionId].visibleParticipants.add(participantId);
                    showAnswerLabel.textContent = '👁️';
                    showAnswerLabel.style.opacity = '1';
                } else {
                    window.answerVisibility[questionId].visibleParticipants.delete(participantId);
                    showAnswerLabel.textContent = '👁️‍🗨️';
                    showAnswerLabel.style.opacity = '0.4';
                }
                // Update display if it's currently showing
                updateDisplayIfVisible();
            };
            
            showAnswerLabel.addEventListener('click', toggleVisibility);
            
            singleRow.appendChild(showAnswerCheckbox);
            singleRow.appendChild(showAnswerLabel);
            
            // Answer text box (single line)
            const answerTextBox = document.createElement('input');
            answerTextBox.type = 'text';
            answerTextBox.readOnly = true;
            answerTextBox.style.cssText = 'flex: 1; padding: 0.1rem 0.3rem; border: 1px solid #ddd; border-radius: 3px; font-size: 0.8rem; min-width: 0; overflow-x: auto; resize: none; background: white; user-select: text; -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text;';
            if (answerData && answerData.answer !== undefined) {
                answerTextBox.value = String(answerData.answer || '');
            } else {
                answerTextBox.value = '';
                answerTextBox.placeholder = 'Waiting for answer...';
                answerTextBox.style.color = '#999';
            }
            singleRow.appendChild(answerTextBox);
            
            // Correct toggle (checkmark icon)
            const correctCheck = document.createElement('input');
            correctCheck.type = 'checkbox';
            correctCheck.className = 'correct-checkbox';
            correctCheck.dataset.participantId = participantId;
            correctCheck.dataset.questionId = questionId;
            correctCheck.checked = (answerData && answerData.correct) || false;
            correctCheck.disabled = !answerData;
            correctCheck.style.cssText = 'position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0;';
            
            const correctToggle = document.createElement('div');
            correctToggle.textContent = '✓';
            correctToggle.style.cssText = 'font-size: 1.1rem; cursor: pointer; white-space: nowrap; flex-shrink: 0; color: ' + (correctCheck.checked ? '#4CAF50' : '#999') + '; opacity: ' + (correctCheck.checked ? '1' : '0.4') + ';';
            correctToggle.title = 'Toggle correct answer';
            
            const toggleCorrect = () => {
                if (!answerData) return;
                correctCheck.checked = !correctCheck.checked;
                if (correctCheck.checked) {
                    correctToggle.style.color = '#4CAF50';
                    correctToggle.style.opacity = '1';
                } else {
                    correctToggle.style.color = '#999';
                    correctToggle.style.opacity = '0.4';
                }
            };
            
            correctToggle.addEventListener('click', toggleCorrect);
            if (!answerData) {
                correctToggle.style.cursor = 'not-allowed';
            }
            
            singleRow.appendChild(correctCheck);
            singleRow.appendChild(correctToggle);
            
            // Bonus input with plus sign
            const bonusContainer = document.createElement('div');
            bonusContainer.style.cssText = 'display: flex; align-items: center; gap: 0.15rem; flex-shrink: 0;';
            
            const bonusLabel = document.createElement('div');
            bonusLabel.textContent = '+';
            bonusLabel.style.cssText = 'font-size: 0.9rem; color: #666; white-space: nowrap; flex-shrink: 0; font-weight: bold;';
            bonusContainer.appendChild(bonusLabel);
            
            const bonusInput = document.createElement('input');
            bonusInput.type = 'number';
            bonusInput.className = 'bonus-points-input';
            bonusInput.dataset.participantId = participantId;
            bonusInput.dataset.questionId = questionId;
            bonusInput.placeholder = '0';
            bonusInput.min = '0';
            bonusInput.value = (answerData && answerData.bonus_points) || 0;
            bonusInput.disabled = !answerData;
            bonusInput.style.cssText = 'width: 40px; padding: 0.1rem 0.2rem; border: 1px solid #ddd; border-radius: 3px; font-size: 0.8rem; flex-shrink: 0;';
            if (!answerData) {
                bonusInput.style.opacity = '0.5';
            }
            bonusContainer.appendChild(bonusInput);
            
            singleRow.appendChild(bonusContainer);
            
            // Save button with floppy icon
            const saveBtn = document.createElement('button');
            saveBtn.textContent = '💾';
            saveBtn.className = 'save-answer-btn';
            saveBtn.dataset.participantId = participantId;
            saveBtn.dataset.questionId = questionId;
            saveBtn.style.cssText = 'padding: 0.1rem 0.4rem; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.9rem; font-weight: 500; flex-shrink: 0; display: flex; align-items: center; justify-content: center;';
            saveBtn.title = 'Save';
            saveBtn.disabled = !answerData;
            if (!answerData) {
                saveBtn.style.opacity = '0.5';
                saveBtn.style.cursor = 'not-allowed';
            }
            if (onMarkAnswer && answerData) {
                saveBtn.onclick = () => {
                    onMarkAnswer(participantId, questionId, correctCheck.checked, parseInt(bonusInput.value) || 0);
                };
            }
            singleRow.appendChild(saveBtn);
            
            answerRow.appendChild(singleRow);
            answersList.appendChild(answerRow);
        });
        
        // For radio/checkbox questions, add correct answer as last option if available
        if ((answerType === 'radio' || answerType === 'checkbox') && correctAnswer !== null && correctAnswer !== undefined && correctAnswer !== '') {
            // Create a special row showing the correct answer option(s)
            const correctAnswerRow = document.createElement('div');
            correctAnswerRow.className = 'answer-row correct-answer-option-row';
            correctAnswerRow.id = `correct-answer-option-${questionId}`;
            correctAnswerRow.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; background: #e8f5e9; border-radius: 4px; border: 2px solid #4CAF50; margin-top: 0.5rem;';
            
            // First row: Label
            const firstRow = document.createElement('div');
            firstRow.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
            
            const correctAnswerLabel = document.createElement('div');
            correctAnswerLabel.textContent = 'Correct Answer:';
            correctAnswerLabel.style.cssText = 'font-weight: 600; font-size: 0.95rem; color: #2e7d32; flex: 1;';
            firstRow.appendChild(correctAnswerLabel);
            
            correctAnswerRow.appendChild(firstRow);
            
            // Second row: Answer text
            const secondRow = document.createElement('div');
            secondRow.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
            
            const correctAnswerText = document.createElement('div');
            if (answerType === 'checkbox' && Array.isArray(correctAnswer)) {
                correctAnswerText.textContent = correctAnswer.join(', ');
            } else {
                correctAnswerText.textContent = String(correctAnswer);
            }
            correctAnswerText.style.cssText = 'flex: 1; padding: 0.5rem; border: 1px solid #4CAF50; border-radius: 4px; font-size: 0.9rem; background: white; color: #2e7d32; font-weight: 500;';
            secondRow.appendChild(correctAnswerText);
            
            correctAnswerRow.appendChild(secondRow);
            answersList.appendChild(correctAnswerRow);
        }
        
        if (allParticipantIds.length === 0) {
            const noAnswers = document.createElement('div');
            noAnswers.style.cssText = 'color: #666; font-style: italic; padding: 1rem; text-align: center;';
            noAnswers.textContent = 'No participants yet';
            answersList.appendChild(noAnswers);
        }
        
        // Add control answer row at the bottom (if correct_answer exists and not radio/checkbox)
        // For radio/checkbox, we show it above as an option instead
        if (answerType !== 'radio' && answerType !== 'checkbox' && correctAnswer !== null && correctAnswer !== undefined && correctAnswer !== '') {
            const controlAnswerRow = document.createElement('div');
            controlAnswerRow.className = 'answer-row control-answer-row';
            controlAnswerRow.id = `control-answer-${questionId}`;
            controlAnswerRow.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: #e8f5e9; border-radius: 4px; border: 2px solid #4CAF50; margin-top: 0.5rem;';
            
            // Label
            const controlLabel = document.createElement('div');
            controlLabel.textContent = 'Correct Answer:';
            controlLabel.style.cssText = 'font-weight: 600; font-size: 0.95rem; color: #2e7d32; flex: 1;';
            controlAnswerRow.appendChild(controlLabel);
            
            // Answer text
            const controlAnswerText = document.createElement('div');
            controlAnswerText.textContent = String(correctAnswer);
            controlAnswerText.style.cssText = 'font-size: 0.95rem; color: #2e7d32; font-weight: 500; flex: 1; padding: 0.5rem; border: 1px solid #4CAF50; border-radius: 4px; background: white;';
            controlAnswerRow.appendChild(controlAnswerText);
            
            // Show this answer checkbox
            const showControlAnswerContainer = document.createElement('div');
            showControlAnswerContainer.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;';
            
            const showControlAnswerCheckbox = document.createElement('input');
            showControlAnswerCheckbox.type = 'checkbox';
            showControlAnswerCheckbox.className = 'show-answer-checkbox control-answer-checkbox';
            showControlAnswerCheckbox.dataset.questionId = questionId;
            showControlAnswerCheckbox.dataset.isControlAnswer = 'true';
            // Default: unchecked (control answer unchecked by default)
            const visibility = window.answerVisibility && window.answerVisibility[questionId] ? window.answerVisibility[questionId] : { controlAnswerVisible: false };
            showControlAnswerCheckbox.checked = visibility.controlAnswerVisible || false;
            showControlAnswerCheckbox.style.cssText = 'position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0;';
            
            const showControlAnswerLabel = document.createElement('div');
            showControlAnswerLabel.textContent = showControlAnswerCheckbox.checked ? '👁️' : '👁️‍🗨️';
            showControlAnswerLabel.style.cssText = 'font-size: 1.1rem; cursor: pointer; white-space: nowrap; display: flex; align-items: center; opacity: ' + (showControlAnswerCheckbox.checked ? '1' : '0.4') + ';';
            showControlAnswerLabel.title = 'Toggle answer visibility';
            
            const toggleControlVisibility = () => {
                showControlAnswerCheckbox.checked = !showControlAnswerCheckbox.checked;
                if (!window.answerVisibility[questionId]) {
                    window.answerVisibility[questionId] = {
                        visibleParticipants: new Set(),
                        controlAnswerVisible: false
                    };
                }
                window.answerVisibility[questionId].controlAnswerVisible = showControlAnswerCheckbox.checked;
                if (showControlAnswerCheckbox.checked) {
                    showControlAnswerLabel.textContent = '👁️';
                    showControlAnswerLabel.style.opacity = '1';
                } else {
                    showControlAnswerLabel.textContent = '👁️‍🗨️';
                    showControlAnswerLabel.style.opacity = '0.4';
                }
                // Update display if it's currently showing
                updateDisplayIfVisible();
            };
            
            showControlAnswerLabel.addEventListener('click', toggleControlVisibility);
            
            showControlAnswerContainer.appendChild(showControlAnswerCheckbox);
            showControlAnswerContainer.appendChild(showControlAnswerLabel);
            controlAnswerRow.appendChild(showControlAnswerContainer);
            
            answersList.appendChild(controlAnswerRow);
        }
        
        scrollableContent.appendChild(answersList);
        container.appendChild(scrollableContent);
    }
    
    return { render: render };
})();
