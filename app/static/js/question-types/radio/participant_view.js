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
        const questionTitle = options.questionTitle || '';
        const submittedAnswer = options.submittedAnswer || null;
        
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0.5rem';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.overflow = 'hidden';
        container.style.boxSizing = 'border-box';
        
        // Title header at top (matching control view aesthetic)
        if (questionTitle) {
            const titleHeader = document.createElement('div');
            titleHeader.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #2196F3; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3; flex-shrink: 0;';
            titleHeader.textContent = questionTitle;
            container.appendChild(titleHeader);
        }
        
        // Content area (scrollable if needed)
        const contentArea = document.createElement('div');
        contentArea.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; overflow-x: hidden;';
        
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
        contentArea.appendChild(optionsDiv);
        
        const submitBtn = document.createElement('button');
        submitBtn.textContent = submittedAnswer ? 'Submitted' : 'Submit';
        submitBtn.className = 'submit-answer-btn';
        submitBtn.dataset.questionId = questionId;
        submitBtn.dataset.answerType = 'radio';
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


