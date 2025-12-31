/**
 * Checkbox question type - Participant view
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Checkbox = QuestionTypes.Checkbox || {};

QuestionTypes.Checkbox.ParticipantView = (function() {
    function render(container, element, options) {
        const options_list = element.options || [];
        const questionId = element.parent_id;
        const questionTitle = options.questionTitle || '';
        const submittedAnswer = options.submittedAnswer || null;
        
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0.5rem';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.overflow = 'hidden';
        container.style.boxSizing = 'border-box';
        
        // Note: Title is rendered by participant.js in the questionContainer, not here
        
        // Content area (scrollable if needed)
        const contentArea = document.createElement('div');
        contentArea.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; overflow-x: hidden;';
        
        const checkboxesDiv = document.createElement('div');
        checkboxesDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';
        const submittedAnswersArray = submittedAnswer && Array.isArray(submittedAnswer.answer) ? submittedAnswer.answer : [];
        options_list.forEach(option => {
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.25rem;';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = option;
            checkbox.disabled = !!submittedAnswer;
            if (submittedAnswer && submittedAnswersArray.includes(option)) {
                checkbox.checked = true;
            }
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(option));
            if (submittedAnswer) {
                label.style.cursor = 'not-allowed';
            }
            checkboxesDiv.appendChild(label);
        });
        contentArea.appendChild(checkboxesDiv);
        
        const submitBtn = document.createElement('button');
        submitBtn.textContent = submittedAnswer ? 'Submitted' : 'Submit';
        submitBtn.className = 'submit-answer-btn';
        submitBtn.dataset.questionId = questionId;
        submitBtn.dataset.answerType = 'checkbox';
        submitBtn.disabled = !!submittedAnswer;
        submitBtn.style.cssText = submittedAnswer 
            ? 'padding: 0.5rem 1rem; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500;'
            : 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
        contentArea.appendChild(submitBtn);
        
        if (submittedAnswer) {
            const submittedMsg = document.createElement('div');
            submittedMsg.textContent = 'Answer already submitted';
            submittedMsg.style.cssText = 'color: #666; font-size: 0.85rem; font-style: italic;';
            contentArea.appendChild(submittedMsg);
        }
        
        container.appendChild(contentArea);
    }
    
    return { render: render };
})();


