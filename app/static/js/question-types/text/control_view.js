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
        
        container.style.backgroundColor = 'white';
        container.style.border = '2px solid #2196F3';
        container.style.borderRadius = '8px';
        container.style.padding = '1rem';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '1rem';
        
        // Title at top
        const titleHeader = document.createElement('div');
        titleHeader.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #2196F3; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3;';
        titleHeader.textContent = questionTitle;
        container.appendChild(titleHeader);
        
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
            answerRow.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; background: #f5f5f5; border-radius: 4px;';
            
            // First row: Avatar + Name + Submission time
            const firstRow = document.createElement('div');
            firstRow.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
            
            // Avatar
            const avatar = document.createElement('div');
            avatar.textContent = window.getAvatarEmoji ? window.getAvatarEmoji(participant.avatar) : '👤';
            avatar.style.cssText = 'font-size: 1.5rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;';
            firstRow.appendChild(avatar);
            
            // Name
            const name = document.createElement('div');
            name.style.cssText = 'font-weight: 500; font-size: 0.95rem;';
            name.textContent = participant.name || 'Unknown';
            firstRow.appendChild(name);
            
            // Submission time (if submitted) - smaller, lighter font
            if (answerData && answerData.submission_time !== undefined) {
                const time = document.createElement('div');
                time.style.cssText = 'color: #999; font-size: 0.8rem; font-weight: normal;';
                time.textContent = Common.formatSubmissionTime(answerData.submission_time);
                firstRow.appendChild(time);
            }
            
            answerRow.appendChild(firstRow);
            
            // Second row: Answer text box + Correct checkbox + Bonus input + Save button
            const secondRow = document.createElement('div');
            secondRow.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
            
            // Answer text box (scrollable)
            const answerTextBox = document.createElement('textarea');
            answerTextBox.readOnly = true;
            answerTextBox.style.cssText = 'flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem; min-height: 60px; max-height: 200px; overflow-y: auto; resize: none; background: white;';
            if (answerData && answerData.answer !== undefined) {
                answerTextBox.value = String(answerData.answer || '');
            } else {
                answerTextBox.value = '';
                answerTextBox.placeholder = 'Waiting for answer...';
                answerTextBox.style.color = '#999';
            }
            secondRow.appendChild(answerTextBox);
            
            // Correct checkbox (centered vertically with answer text box)
            const correctContainer = document.createElement('div');
            correctContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 0.25rem;';
            
            const correctCheck = document.createElement('input');
            correctCheck.type = 'checkbox';
            correctCheck.className = 'correct-checkbox';
            correctCheck.dataset.participantId = participantId;
            correctCheck.dataset.questionId = questionId;
            correctCheck.checked = (answerData && answerData.correct) || false;
            correctCheck.disabled = !answerData;
            correctCheck.style.cssText = 'cursor: pointer; width: 18px; height: 18px;';
            if (!answerData) {
                correctCheck.style.opacity = '0.5';
            }
            correctContainer.appendChild(correctCheck);
            
            const correctLabel = document.createElement('label');
            correctLabel.textContent = 'Correct';
            correctLabel.style.cssText = 'font-size: 0.85rem; cursor: pointer; white-space: nowrap;';
            correctLabel.htmlFor = correctCheck.id = `correct-${participantId}-${questionId}`;
            correctContainer.appendChild(correctLabel);
            secondRow.appendChild(correctContainer);
            
            // Bonus input and label container (label directly beneath input)
            const bonusContainer = document.createElement('div');
            bonusContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 0.25rem;';
            
            const bonusInput = document.createElement('input');
            bonusInput.type = 'number';
            bonusInput.className = 'bonus-points-input';
            bonusInput.dataset.participantId = participantId;
            bonusInput.dataset.questionId = questionId;
            bonusInput.placeholder = '0';
            bonusInput.min = '0';
            bonusInput.value = (answerData && answerData.bonus_points) || 0;
            bonusInput.disabled = !answerData;
            bonusInput.style.cssText = 'width: 70px; padding: 0.35rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem;';
            if (!answerData) {
                bonusInput.style.opacity = '0.5';
            }
            bonusContainer.appendChild(bonusInput);
            
            // Bonus label (inline with "Correct" label, directly beneath bonus input)
            const bonusLabel = document.createElement('div');
            bonusLabel.textContent = 'Bonus';
            bonusLabel.style.cssText = 'font-size: 0.85rem; color: #666; white-space: nowrap;';
            bonusContainer.appendChild(bonusLabel);
            
            secondRow.appendChild(bonusContainer);
            
            // Save button (aligned with bonus input)
            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.className = 'save-answer-btn';
            saveBtn.dataset.participantId = participantId;
            saveBtn.dataset.questionId = questionId;
            saveBtn.style.cssText = 'padding: 0.35rem 0.75rem; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 500;';
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
            secondRow.appendChild(saveBtn);
            
            answerRow.appendChild(secondRow);
            answersList.appendChild(answerRow);
        });
        
        if (allParticipantIds.length === 0) {
            const noAnswers = document.createElement('div');
            noAnswers.style.cssText = 'color: #666; font-style: italic; padding: 1rem; text-align: center;';
            noAnswers.textContent = 'No participants yet';
            answersList.appendChild(noAnswers);
        }
        
        container.appendChild(answersList);
    }
    
    return { render: render };
})();
