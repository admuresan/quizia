/**
 * Image click question type - Control view
 * Special layout: Title at top, image below, legend below image with colors
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.ImageClick = QuestionTypes.ImageClick || {};

QuestionTypes.ImageClick.ControlView = (function() {
    const Common = QuestionTypes.Common;
    
    function render(container, options) {
        const questionId = options.questionId;
        const questionTitle = options.questionTitle || 'Question';
        const answers = options.answers || {};
        const participants = options.participants || {};
        const onMarkAnswer = options.onMarkAnswer || null;
        const imageSrc = options.imageSrc || '';
        
        container.style.backgroundColor = 'white';
        container.style.border = '2px solid #2196F3';
        container.style.borderRadius = '8px';
        container.style.padding = '1rem';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '1rem';
        container.style.boxSizing = 'border-box'; // Include padding in width/height calculations
        
        // Title at top
        const titleHeader = document.createElement('div');
        titleHeader.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #2196F3; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3;';
        titleHeader.textContent = questionTitle;
        container.appendChild(titleHeader);
        
        // Image container below title - scrollable if image is larger
        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = 'position: relative; margin-bottom: 1rem; border: 2px solid #ddd; border-radius: 4px; overflow: auto; background: #f0f0f0; min-height: 200px; max-height: 400px; display: flex; justify-content: center; align-items: flex-start; padding: 0.5rem;';
        
        if (imageSrc) {
            const imageWrapper = document.createElement('div');
            imageWrapper.style.cssText = 'position: relative; display: inline-block; max-width: 100%; width: 100%;';
            imageWrapper.id = `image-wrapper-${questionId}`;
            
            const img = document.createElement('img');
            img.src = imageSrc.startsWith('/') || imageSrc.startsWith('http') ? imageSrc : '/api/media/serve/' + imageSrc;
            img.style.cssText = 'width: 100%; height: auto; display: block; max-width: 800px; object-fit: contain;';
            img.id = `image-click-display-${questionId}`;
            
            // Function to update highlights on image
            const updateHighlights = () => {
                const existingHighlights = imageWrapper.querySelectorAll('.click-highlight');
                existingHighlights.forEach(h => h.remove());
                
                const rect = img.getBoundingClientRect();
                const imgWidth = rect.width;
                const imgHeight = rect.height;
                const minDim = Math.min(imgWidth, imgHeight);
                const radiusPx = minDim * 0.1;
                
                const allParticipantIds = Object.keys(participants || {});
                const participantIndexMap = {};
                allParticipantIds.forEach((pid, idx) => {
                    participantIndexMap[pid] = idx;
                });
                
                // Add highlights for each submitted answer with participant's assigned color
                Object.entries(answers || {}).forEach(([participantId, answerData]) => {
                    if (answerData && answerData.answer && typeof answerData.answer === 'object' && 
                        answerData.answer.x !== undefined && answerData.answer.y !== undefined) {
                        const highlight = document.createElement('div');
                        highlight.className = 'click-highlight';
                        const colorIndex = participantIndexMap[participantId] !== undefined ? participantIndexMap[participantId] : 0;
                        const color = Common.getParticipantColor(colorIndex);
                        
                        const leftPercent = answerData.answer.x;
                        const topPercent = answerData.answer.y;
                        
                        highlight.style.cssText = `position: absolute; width: ${radiusPx * 2}px; height: ${radiusPx * 2}px; border-radius: 50%; border: 3px solid ${color}; background: ${Common.hexToRgba(color, 0.2)}; left: ${leftPercent}%; top: ${topPercent}%; transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 0 8px ${color}80;`;
                        highlight.dataset.participantId = participantId;
                        highlight.title = `${participants[participantId]?.name || 'Participant'}: (${leftPercent.toFixed(1)}%, ${topPercent.toFixed(1)}%)`;
                        imageWrapper.appendChild(highlight);
                    }
                });
            };
            
            img.onload = updateHighlights;
            
            let resizeTimeout;
            const resizeHandler = () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(updateHighlights, 100);
            };
            imageWrapper._resizeHandler = resizeHandler;
            window.addEventListener('resize', resizeHandler);
            
            imageWrapper.appendChild(img);
            imageContainer.appendChild(imageWrapper);
            
            if (img.complete) {
                img.onload();
            }
        } else {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = 'width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;';
            placeholder.textContent = 'Image not available';
            imageContainer.appendChild(placeholder);
        }
        
        container.appendChild(imageContainer);
        
        // Legend below image
        const legend = document.createElement('div');
        legend.id = `answers-list-${questionId}`;
        legend.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';
        
        const allParticipantIds = Object.keys(participants || {});
        const participantIndexMap = {};
        allParticipantIds.forEach((pid, idx) => {
            participantIndexMap[pid] = idx;
        });
        
        if (allParticipantIds.length === 0) {
            const noParticipants = document.createElement('div');
            noParticipants.style.cssText = 'color: #666; font-style: italic; padding: 1rem; text-align: center;';
            noParticipants.textContent = 'No participants yet';
            legend.appendChild(noParticipants);
        } else {
            allParticipantIds.forEach((participantId) => {
                const answerData = answers[participantId];
                const participant = participants[participantId] || {};
                const colorIndex = participantIndexMap[participantId] !== undefined ? participantIndexMap[participantId] : 0;
                const color = Common.getParticipantColor(colorIndex);
                
                const legendRow = document.createElement('div');
                legendRow.className = 'answer-row';
                legendRow.id = `answer-${participantId}-${questionId}`;
                legendRow.style.cssText = 'display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: #f5f5f5; border-radius: 4px;';
                
                // Color dot on left
                const colorDot = document.createElement('div');
                colorDot.style.cssText = `width: 24px; height: 24px; border-radius: 50%; background: ${color}; border: 2px solid ${color}; flex-shrink: 0; box-shadow: 0 0 4px ${color}80;`;
                legendRow.appendChild(colorDot);
                
                // Name
                const name = document.createElement('div');
                name.style.cssText = 'font-weight: 500; font-size: 0.95rem; flex: 1;';
                name.textContent = participant.name || 'Unknown';
                legendRow.appendChild(name);
                
                // Correct checkbox
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
                legendRow.appendChild(correctCheck);
                
                // Bonus section (word above, box below - bonus box centered with checkbox and name height-wise)
                const bonusContainer = document.createElement('div');
                bonusContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 0.25rem;';
                
                // Bonus label (above bonus box)
                const bonusLabel = document.createElement('div');
                bonusLabel.textContent = 'bonus';
                bonusLabel.style.cssText = 'font-size: 0.85rem; color: #666;';
                bonusContainer.appendChild(bonusLabel);
                
                // Bonus input (centered with checkbox and name height-wise)
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
                
                legendRow.appendChild(bonusContainer);
                
                // Save button
                if (onMarkAnswer && answerData) {
                    const saveBtn = document.createElement('button');
                    saveBtn.textContent = 'Save';
                    saveBtn.className = 'save-answer-btn';
                    saveBtn.dataset.participantId = participantId;
                    saveBtn.dataset.questionId = questionId;
                    saveBtn.style.cssText = 'padding: 0.35rem 0.75rem; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 500;';
                    saveBtn.onclick = () => {
                        onMarkAnswer(participantId, questionId, correctCheck.checked, parseInt(bonusInput.value) || 0);
                    };
                    legendRow.appendChild(saveBtn);
                }
                
                legend.appendChild(legendRow);
            });
        }
        
        container.appendChild(legend);
    }
    
    return { render: render };
})();
