/**
 * Radio question type - Participant view
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Radio = QuestionTypes.Radio || {};

QuestionTypes.Radio.ParticipantView = (function() {
    function render(container, element, options) {
        const answerType = 'radio';
        const options_list = element.options || [];
        const questionId = element.parent_id;
        const submittedAnswer = options.submittedAnswer || null;
        
        container.style.backgroundColor = 'transparent';
        container.style.border = 'none';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0.5rem';
        container.style.padding = '0.5rem';
        
        const optionsDiv = document.createElement('div');
        optionsDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';
        options_list.forEach((option, index) => {
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.25rem;';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `answer-${questionId}`;
            radio.value = option;
            radio.disabled = !!submittedAnswer;
            if (submittedAnswer && submittedAnswer.answer === option) {
                radio.checked = true;
            }
            label.appendChild(radio);
            label.appendChild(document.createTextNode(option));
            if (submittedAnswer) {
                label.style.cursor = 'not-allowed';
            }
            optionsDiv.appendChild(label);
        });
        container.appendChild(optionsDiv);
        
        const submitBtn = document.createElement('button');
        submitBtn.textContent = submittedAnswer ? 'Submitted' : 'Submit';
        submitBtn.className = 'submit-answer-btn';
        submitBtn.dataset.questionId = questionId;
        submitBtn.dataset.answerType = 'radio';
        submitBtn.disabled = !!submittedAnswer;
        submitBtn.style.cssText = submittedAnswer 
            ? 'padding: 0.5rem 1rem; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500;'
            : 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
        container.appendChild(submitBtn);
        
        if (submittedAnswer) {
            const submittedMsg = document.createElement('div');
            submittedMsg.textContent = 'Answer already submitted';
            submittedMsg.style.cssText = 'color: #666; font-size: 0.85rem; font-style: italic;';
            container.appendChild(submittedMsg);
        }
    }
    
    return { render: render };
})();

