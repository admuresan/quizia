/**
 * Image click question type - Participant view
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.ImageClick = QuestionTypes.ImageClick || {};

QuestionTypes.ImageClick.ParticipantView = (function() {
    function render(container, element, options) {
        const questionId = element.parent_id;
        const question = options.question || null;
        const submittedAnswer = options.submittedAnswer || null;
        const submitAnswerCallback = options.submitAnswerCallback || null;
        
        container.style.backgroundColor = 'transparent';
        container.style.border = 'none';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0.5rem';
        container.style.padding = '0.5rem';
        
        // Get image source from question element
        let imageSrc = null;
        if (question) {
            imageSrc = question.src || (question.filename ? '/api/media/serve/' + question.filename : null);
        }
        if (!imageSrc) {
            imageSrc = element.image_src || element.src;
        }
        
        if (imageSrc) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'image-answer-container';
            imageContainer.style.cssText = 'position: relative; display: inline-block; max-width: 100%;';
            
            let clickIndicator = null;
            let clickCoords = null;
            let isSubmitted = !!submittedAnswer;
            
            const img = document.createElement('img');
            img.src = imageSrc;
            img.style.cssText = submittedAnswer 
                ? 'max-width: 100%; height: auto; cursor: not-allowed; border: 2px solid #9e9e9e; border-radius: 4px; opacity: 0.7;'
                : 'max-width: 100%; height: auto; cursor: crosshair; border: 2px solid #2196F3; border-radius: 4px;';
            img.alt = 'Click to answer';
            
            // If already submitted, show the click location
            if (submittedAnswer && submittedAnswer.answer) {
                const coords = submittedAnswer.answer;
                img.onload = () => {
                    const rect = img.getBoundingClientRect();
                    const radius = Math.min(rect.width, rect.height) * 0.1;
                    clickIndicator = document.createElement('div');
                    clickIndicator.style.cssText = `position: absolute; width: ${radius * 2}px; height: ${radius * 2}px; border: 3px solid #FF5722; border-radius: 50%; background: rgba(255, 87, 34, 0.2); pointer-events: none; left: ${(coords.x / 100) * rect.width - radius}px; top: ${(coords.y / 100) * rect.height - radius}px;`;
                    imageContainer.appendChild(clickIndicator);
                };
            }
            
            const submitBtn = document.createElement('button');
            submitBtn.textContent = submittedAnswer ? 'Submitted' : 'Submit';
            submitBtn.className = 'submit-answer-btn';
            submitBtn.dataset.questionId = questionId;
            submitBtn.dataset.answerType = 'image_click';
            submitBtn.disabled = submittedAnswer || true; // Disabled if submitted or if no click yet
            submitBtn.style.cssText = submittedAnswer
                ? 'padding: 0.5rem 1rem; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500; margin-top: 1rem;'
                : 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500; margin-top: 1rem;';
            
            if (!submittedAnswer) {
                img.onclick = (e) => {
                    if (isSubmitted) return;
                    
                    const rect = img.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    clickCoords = { x, y };
                    
                    // Remove previous indicator
                    if (clickIndicator) {
                        clickIndicator.remove();
                    }
                    
                    // Create click indicator (circle with 10% radius)
                    clickIndicator = document.createElement('div');
                    const radius = Math.min(rect.width, rect.height) * 0.1;
                    clickIndicator.style.cssText = `position: absolute; width: ${radius * 2}px; height: ${radius * 2}px; border: 3px solid #FF5722; border-radius: 50%; background: rgba(255, 87, 34, 0.2); pointer-events: none; left: ${e.clientX - rect.left - radius}px; top: ${e.clientY - rect.top - radius}px;`;
                    imageContainer.appendChild(clickIndicator);
                    
                    submitBtn.disabled = false;
                };
                
                submitBtn.onclick = () => {
                    if (clickCoords && !isSubmitted && submitAnswerCallback) {
                        isSubmitted = true;
                        submitBtn.disabled = true;
                        submitAnswerCallback(questionId, 'image_click', submitBtn, clickCoords);
                    }
                };
            }
            
            imageContainer.appendChild(img);
            container.appendChild(imageContainer);
            container.appendChild(submitBtn);
            
            if (submittedAnswer) {
                const submittedMsg = document.createElement('div');
                submittedMsg.textContent = 'Answer already submitted';
                submittedMsg.style.cssText = 'color: #666; font-size: 0.85rem; font-style: italic;';
                container.appendChild(submittedMsg);
            }
        } else {
            container.textContent = 'Image not available';
        }
    }
    
    return { render: render };
})();

