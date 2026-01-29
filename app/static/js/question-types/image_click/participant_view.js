/**
 * Image click question type - Participant view
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.ImageClick = QuestionTypes.ImageClick || {};

QuestionTypes.ImageClick.ParticipantView = (function() {
    const Common = QuestionTypes.Common;
    
    function render(container, element, options) {
        const questionId = element.parent_id;
        const question = options.question || null;
        const questionTitle = options.questionTitle || '';
        const submittedAnswer = options.submittedAnswer || null;
        const submitAnswerCallback = options.submitAnswerCallback || null;
        const insideContainer = options.insideContainer !== undefined ? options.insideContainer : true;
        const width = options.width || element.width || 370;
        const height = options.height || element.height || 200;
        
        // Create container and title using common function
        const { outerContainer, innerContainer } = Common.createParticipantContainer(
            questionId, questionTitle, width, height, insideContainer, submittedAnswer
        );
        
        // Content area - scrollable if content exceeds container height
        // This ensures content fits within fixed dimensions, matching editor behavior
        const contentArea = document.createElement('div');
        contentArea.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; overflow-x: hidden; min-height: 0;';
        
        // Get image source from question element (new format: in properties)
        let imageSrc = null;
        if (question) {
            const properties = question.properties || {};
            imageSrc = properties.media_url || 
                      (properties.file_name ? '/api/media/serve/' + properties.file_name : null) ||
                      (properties.filename ? '/api/media/serve/' + properties.filename : null) ||
                      question.src || 
                      (question.filename ? '/api/media/serve/' + question.filename : null);
        }
        if (!imageSrc) {
            imageSrc = element.image_src || element.src;
        }
        
        if (imageSrc) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'image-answer-container';
            // Set margin: 0 explicitly to override any CSS that might add spacing
            imageContainer.style.cssText = 'position: relative !important; display: inline-block !important; max-width: 100% !important; margin: 0 !important;';
            
            let clickIndicator = null;
            let clickCoords = null;
            let isSubmitted = !!submittedAnswer;
            
            const img = document.createElement('img');
            // Normalize URL to prevent mixed content errors (HTTP -> HTTPS or absolute -> relative)
            img.src = (window.UrlUtils && window.UrlUtils.normalizeMediaUrl) ? 
                window.UrlUtils.normalizeMediaUrl(imageSrc) : imageSrc;
            img.style.cssText = submittedAnswer 
                ? 'max-width: 100%; height: auto; cursor: not-allowed; border: 2px solid #9e9e9e; border-radius: 4px; opacity: 0.7;'
                : 'max-width: 100%; height: auto; cursor: crosshair; border: 2px solid #2196F3; border-radius: 4px;';
            img.alt = 'Click to answer';
            
            // If already submitted, show the click location
            if (submittedAnswer && submittedAnswer.answer) {
                const coords = submittedAnswer.answer;
                img.onload = () => {
                    // Use natural image dimensions to calculate radius (10% of actual image size)
                    const rect = img.getBoundingClientRect();
                    const naturalWidth = img.naturalWidth || img.width || rect.width;
                    const naturalHeight = img.naturalHeight || img.height || rect.height;
                    const naturalMinDim = Math.min(naturalWidth, naturalHeight);
                    const naturalRadius = naturalMinDim * 0.1; // 10% of actual image size
                    
                    // Scale radius based on current display size vs natural size
                    const scale = naturalWidth > 0 ? (rect.width / naturalWidth) : 1;
                    const radius = naturalRadius * scale;
                    
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
                    
                    // Create click indicator (circle with 10% radius of actual image size)
                    // Use natural image dimensions to calculate radius (10% of actual image size)
                    const naturalWidth = img.naturalWidth || img.width || rect.width;
                    const naturalHeight = img.naturalHeight || img.height || rect.height;
                    const naturalMinDim = Math.min(naturalWidth, naturalHeight);
                    const naturalRadius = naturalMinDim * 0.1; // 10% of actual image size
                    
                    // Scale radius based on current display size vs natural size
                    const scale = naturalWidth > 0 ? (rect.width / naturalWidth) : 1;
                    const radius = naturalRadius * scale;
                    
                    clickIndicator = document.createElement('div');
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
            contentArea.appendChild(imageContainer);
            contentArea.appendChild(submitBtn);
            
            if (submittedAnswer) {
                const submittedMsg = document.createElement('div');
                submittedMsg.textContent = 'Answer already submitted';
                submittedMsg.style.cssText = 'color: #666; font-size: 0.85rem; font-style: italic;';
                contentArea.appendChild(submittedMsg);
            }
            
            innerContainer.appendChild(contentArea);
        } else {
            const noImageMsg = document.createElement('div');
            noImageMsg.textContent = 'Image not available';
            noImageMsg.style.cssText = 'color: #666; font-style: italic; text-align: center; padding: 2rem;';
            contentArea.appendChild(noImageMsg);
            innerContainer.appendChild(contentArea);
        }
        
        // Append the outer container to the provided container
        container.appendChild(outerContainer);
    }
    
    return { render: render };
})();


