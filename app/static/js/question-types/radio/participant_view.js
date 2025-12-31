/**
 * Radio question type - Participant view
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Radio = QuestionTypes.Radio || {};

QuestionTypes.Radio.ParticipantView = (function() {
    const Common = QuestionTypes.Common;
    
    function render(container, element, options) {
        const answerType = 'radio';
        const options_list = element.options || [];
        const questionId = element.parent_id;
        const questionTitle = options.questionTitle || '';
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
        
        innerContainer.appendChild(contentArea);
        
        // Append the outer container to the provided container
        container.appendChild(outerContainer);
    }
    
    return { render: render };
})();


