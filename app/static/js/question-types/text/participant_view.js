/**
 * Text question type - Participant view
 * Using namespace pattern
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Text = QuestionTypes.Text || {};

QuestionTypes.Text.ParticipantView = (function() {
    function render(container, element, options) {
        const questionId = element.parent_id;
        const onSubmitCallback = options.onSubmit || options.submitAnswerCallback || null;
        const submittedAnswer = options.submittedAnswer || null;
        
        container.style.backgroundColor = 'transparent';
        container.style.border = 'none';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0.5rem';
        container.style.padding = '0.5rem';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'answer-text-input';
        input.placeholder = 'Type your answer...';
        input.dataset.questionId = questionId;
        input.style.cssText = 'width: 100%; padding: 0.5rem; border: 2px solid #2196F3; border-radius: 4px; font-size: 0.9rem;';
        
        if (submittedAnswer && submittedAnswer.answer !== undefined) {
            input.value = String(submittedAnswer.answer || '');
            input.disabled = true;
            input.style.backgroundColor = '#f5f5f5';
            input.style.cursor = 'not-allowed';
        }
        
        container.appendChild(input);
        
        const submitBtn = document.createElement('button');
        submitBtn.textContent = submittedAnswer ? 'Submitted' : 'Submit';
        submitBtn.className = 'submit-answer-btn';
        submitBtn.dataset.questionId = questionId;
        submitBtn.dataset.answerType = 'text';
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
