/**
 * Text question type - Participant view
 * Using namespace pattern
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Text = QuestionTypes.Text || {};

QuestionTypes.Text.ParticipantView = (function() {
    const Common = QuestionTypes.Common;
    
    function render(container, element, options) {
        const questionId = element.parent_id;
        const questionTitle = options.questionTitle || '';
        const onSubmitCallback = options.onSubmit || options.submitAnswerCallback || null;
        const submittedAnswer = options.submittedAnswer || null;
        const insideContainer = options.insideContainer !== undefined ? options.insideContainer : true;
        const width = options.width || element.width || 370;
        const height = options.height || element.height || 200;
        
        // Create container and title using common function
        const { outerContainer, innerContainer } = Common.createParticipantContainer(
            questionId, questionTitle, width, height, insideContainer, submittedAnswer
        );
        
        // Content area (scrollable if needed)
        const contentArea = document.createElement('div');
        contentArea.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; overflow-x: hidden;';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'answer-text-input';
        input.placeholder = 'Type your answer...';
        input.dataset.questionId = questionId;
        input.style.cssText = 'width: 100%; padding: 0.5rem; border: 2px solid #ddd; border-radius: 4px; font-size: 0.9rem;';
        
        if (submittedAnswer && submittedAnswer.answer !== undefined) {
            input.value = String(submittedAnswer.answer || '');
            input.disabled = true;
            input.style.backgroundColor = '#f5f5f5';
            input.style.cursor = 'not-allowed';
        }
        
        contentArea.appendChild(input);
        
        const submitBtn = document.createElement('button');
        submitBtn.textContent = submittedAnswer ? 'Submitted' : 'Submit';
        submitBtn.className = 'submit-answer-btn';
        submitBtn.dataset.questionId = questionId;
        submitBtn.dataset.answerType = 'text';
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
        
        innerContainer.appendChild(contentArea);
        
        // Append the outer container to the provided container
        container.appendChild(outerContainer);
    }
    
    return { render: render };
})();
