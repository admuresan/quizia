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
        const question = options.question || null; // Question element to get correct_answer
        // Extract correct_answer: check question_config first, then direct property
        const correctAnswer = question ? (
            (question.question_config && question.question_config.question_correct_answer !== undefined) 
                ? question.question_config.question_correct_answer 
                : (question.question_correct_answer !== undefined ? question.question_correct_answer : 
                   (question.correct_answer !== undefined ? question.correct_answer : null))
        ) : null;
        
        container.style.backgroundColor = 'white';
        container.style.border = '2px solid #2196F3';
        container.style.borderRadius = '8px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.position = 'relative';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.overflow = 'hidden';
        container.style.boxSizing = 'border-box';
        
        // Title at top with toggle button in top right - STICKY
        const titleHeader = document.createElement('div');
        titleHeader.style.cssText = 'font-weight: bold; font-size: 1.1rem; color: #2196F3; padding: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10; flex-shrink: 0;';
        
        const titleText = document.createElement('div');
        titleText.textContent = questionTitle;
        titleHeader.appendChild(titleText);
        
        // Toggle button in top right corner
        const toggleContainer = document.createElement('div');
        toggleContainer.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
        
        const toggleLabel = document.createElement('label');
        toggleLabel.textContent = 'Show on Display';
        toggleLabel.style.cssText = 'font-size: 0.85rem; color: #666; cursor: pointer;';
        
        const toggleSwitch = document.createElement('input');
        toggleSwitch.type = 'checkbox';
        toggleSwitch.className = 'answer-display-toggle';
        toggleSwitch.dataset.questionId = questionId;
        toggleSwitch.checked = false; // Default off
        
        toggleLabel.htmlFor = toggleSwitch.id = `toggle-${questionId}`;
        toggleContainer.appendChild(toggleLabel);
        toggleContainer.appendChild(toggleSwitch);
        titleHeader.appendChild(toggleContainer);
        
        // Initialize answer visibility state if not exists
        if (!window.answerVisibility) {
            window.answerVisibility = {};
        }
        if (!window.answerVisibility[questionId]) {
            // Default: all participants checked, control answer unchecked
            const allParticipantIds = Object.keys(participants || {});
            window.answerVisibility[questionId] = {
                visibleParticipants: new Set(allParticipantIds),
                controlAnswerVisible: false
            };
        }
        
        // Helper function to update display if it's currently showing
        const updateDisplayIfVisible = () => {
            if (!window.socket) {
                return;
            }
            // Only update if the toggle switch is checked (display is showing)
            if (toggleSwitch.checked) {
                const visibility = window.answerVisibility[questionId] || {
                    visibleParticipants: new Set(Object.keys(participants || {})),
                    controlAnswerVisible: false
                };
                
                window.socket.emit('quizmaster_toggle_answer_display', {
                    room_code: window.roomCode,
                    question_id: questionId,
                    visible: true,
                    answers: answers,
                    participants: participants,
                    questionTitle: questionTitle,
                    answerType: 'image_click',
                    imageSrc: imageSrc,
                    answerVisibility: {
                        visibleParticipantIds: Array.from(visibility.visibleParticipants),
                        controlAnswerVisible: visibility.controlAnswerVisible
                    },
                    correctAnswer: correctAnswer
                });
            }
        };
        
        // Add event listener for toggle
        toggleSwitch.addEventListener('change', () => {
            if (!window.socket) {
                console.error('Socket not available');
                return;
            }
            // Get current visibility state
            const visibility = window.answerVisibility[questionId] || {
                visibleParticipants: new Set(Object.keys(participants || {})),
                controlAnswerVisible: false
            };
            
            window.socket.emit('quizmaster_toggle_answer_display', {
                room_code: window.roomCode,
                question_id: questionId,
                visible: toggleSwitch.checked,
                answers: answers,
                participants: participants,
                questionTitle: questionTitle,
                answerType: 'image_click',
                imageSrc: imageSrc,
                answerVisibility: {
                    visibleParticipantIds: Array.from(visibility.visibleParticipants),
                    controlAnswerVisible: visibility.controlAnswerVisible
                },
                correctAnswer: correctAnswer
            });
        });
        
        container.appendChild(titleHeader);
        
        // Scrollable content area
        const scrollableContent = document.createElement('div');
        scrollableContent.style.cssText = 'flex: 1; overflow-y: auto; overflow-x: hidden; padding: 1rem; padding-top: 0.5rem; display: flex; flex-direction: column; gap: 1rem;';
        
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
                
                // Get visibility state for this question
                const visibility = window.answerVisibility && window.answerVisibility[questionId] ? window.answerVisibility[questionId] : {
                    visibleParticipants: new Set(Object.keys(participants || {})),
                    controlAnswerVisible: false
                };
                
                // Add highlights for each submitted answer with participant's assigned color (if visible)
                Object.entries(answers || {}).forEach(([participantId, answerData]) => {
                    if (answerData && answerData.answer && typeof answerData.answer === 'object' && 
                        answerData.answer.x !== undefined && answerData.answer.y !== undefined &&
                        visibility.visibleParticipants && visibility.visibleParticipants.has(participantId)) {
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
                
                // Show control answer highlight if visible
                if (visibility.controlAnswerVisible && correctAnswer && typeof correctAnswer === 'object' && 
                    correctAnswer.x !== undefined && correctAnswer.y !== undefined) {
                    const controlHighlight = document.createElement('div');
                    controlHighlight.className = 'click-highlight control-answer-highlight';
                    const color = '#2196F3'; // Blue for control answer
                    
                    const leftPercent = correctAnswer.x;
                    const topPercent = correctAnswer.y;
                    
                    controlHighlight.style.cssText = `position: absolute; width: ${radiusPx * 2}px; height: ${radiusPx * 2}px; border-radius: 50%; border: 4px solid ${color}; background: rgba(33, 150, 243, 0.3); left: ${leftPercent}%; top: ${topPercent}%; transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 0 12px ${color}; z-index: 10;`;
                    controlHighlight.title = `Correct Answer: (${leftPercent.toFixed(1)}%, ${topPercent.toFixed(1)}%)`;
                    imageWrapper.appendChild(controlHighlight);
                }
            };
            
            // Store updateHighlights function reference on imageWrapper so it can be accessed from event listeners
            imageWrapper._updateHighlights = updateHighlights;
            
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
        
        scrollableContent.appendChild(imageContainer);
        
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
                
                // Show this answer checkbox
                const showAnswerContainer = document.createElement('div');
                showAnswerContainer.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;';
                
                const showAnswerCheckbox = document.createElement('input');
                showAnswerCheckbox.type = 'checkbox';
                showAnswerCheckbox.className = 'show-answer-checkbox';
                showAnswerCheckbox.dataset.participantId = participantId;
                showAnswerCheckbox.dataset.questionId = questionId;
                // Default: checked (all participant answers checked by default)
                const visibility = window.answerVisibility && window.answerVisibility[questionId] ? window.answerVisibility[questionId] : { visibleParticipants: new Set(Object.keys(participants || {})) };
                showAnswerCheckbox.checked = visibility.visibleParticipants ? visibility.visibleParticipants.has(participantId) : true;
                showAnswerCheckbox.style.cssText = 'cursor: pointer; width: 18px; height: 18px;';
                
                showAnswerCheckbox.addEventListener('change', () => {
                    if (!window.answerVisibility[questionId]) {
                        window.answerVisibility[questionId] = {
                            visibleParticipants: new Set(),
                            controlAnswerVisible: false
                        };
                    }
                    if (showAnswerCheckbox.checked) {
                        window.answerVisibility[questionId].visibleParticipants.add(participantId);
                    } else {
                        window.answerVisibility[questionId].visibleParticipants.delete(participantId);
                    }
                    // Update highlights on image when participant answer visibility changes
                    if (imageSrc) {
                        const imageWrapper = document.getElementById(`image-wrapper-${questionId}`);
                        if (imageWrapper && typeof imageWrapper._updateHighlights === 'function') {
                            imageWrapper._updateHighlights();
                        }
                    }
                    // Update display if it's currently showing
                    updateDisplayIfVisible();
                });
                
                const showAnswerLabel = document.createElement('label');
                showAnswerLabel.textContent = 'show this answer';
                showAnswerLabel.style.cssText = 'font-size: 0.85rem; color: #666; cursor: pointer; white-space: nowrap;';
                showAnswerLabel.htmlFor = showAnswerCheckbox.id = `show-answer-${participantId}-${questionId}`;
                
                showAnswerContainer.appendChild(showAnswerCheckbox);
                showAnswerContainer.appendChild(showAnswerLabel);
                legendRow.appendChild(showAnswerContainer);
                
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
        
        // Add control answer row at the bottom (if correct_answer exists)
        if (correctAnswer !== null && correctAnswer !== undefined && correctAnswer !== '') {
            const controlAnswerRow = document.createElement('div');
            controlAnswerRow.className = 'answer-row control-answer-row';
            controlAnswerRow.id = `control-answer-${questionId}`;
            controlAnswerRow.style.cssText = 'display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: #f0f7ff; border-radius: 4px; border: 1px solid #2196F3; margin-top: 0.5rem;';
            
            // Control answer indicator dot (similar to color dot)
            const controlDot = document.createElement('div');
            controlDot.style.cssText = 'width: 24px; height: 24px; border-radius: 50%; background: #2196F3; border: 2px solid #2196F3; flex-shrink: 0; box-shadow: 0 0 4px #2196F380;';
            controlAnswerRow.appendChild(controlDot);
            
            // Label
            const controlLabel = document.createElement('div');
            controlLabel.textContent = 'Correct';
            controlLabel.style.cssText = 'font-weight: 500; font-size: 0.95rem; flex-shrink: 0;';
            controlAnswerRow.appendChild(controlLabel);
            
            // Answer label
            const answerLabel = document.createElement('div');
            answerLabel.textContent = 'Answer:';
            answerLabel.style.cssText = 'font-weight: 500; font-size: 0.95rem; flex-shrink: 0;';
            controlAnswerRow.appendChild(answerLabel);
            
            // Answer display (for image_click, show coordinates if object, otherwise show as string)
            const controlAnswerText = document.createElement('div');
            // Handle correctAnswer - could be object, string, or already parsed
            let answerDisplay = '';
            if (correctAnswer !== null && correctAnswer !== undefined) {
                if (typeof correctAnswer === 'object') {
                    // Check if it has x and y properties
                    if (correctAnswer.x !== undefined && correctAnswer.y !== undefined) {
                        answerDisplay = `(${correctAnswer.x.toFixed(1)}%, ${correctAnswer.y.toFixed(1)}%)`;
                    } else {
                        // Try to parse as JSON string if it's a stringified object
                        answerDisplay = JSON.stringify(correctAnswer);
                    }
                } else if (typeof correctAnswer === 'string') {
                    // Try to parse JSON string
                    try {
                        const parsed = JSON.parse(correctAnswer);
                        if (parsed && typeof parsed === 'object' && parsed.x !== undefined && parsed.y !== undefined) {
                            answerDisplay = `(${parsed.x.toFixed(1)}%, ${parsed.y.toFixed(1)}%)`;
                        } else {
                            answerDisplay = correctAnswer;
                        }
                    } catch (e) {
                        answerDisplay = correctAnswer;
                    }
                } else {
                    answerDisplay = String(correctAnswer);
                }
            }
            controlAnswerText.textContent = answerDisplay;
            controlAnswerText.style.cssText = 'font-size: 0.95rem; color: #666; flex: 1;';
            controlAnswerRow.appendChild(controlAnswerText);
            
            // Show this answer checkbox
            const showControlAnswerContainer = document.createElement('div');
            showControlAnswerContainer.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;';
            
            const showControlAnswerCheckbox = document.createElement('input');
            showControlAnswerCheckbox.type = 'checkbox';
            showControlAnswerCheckbox.className = 'show-answer-checkbox control-answer-checkbox';
            showControlAnswerCheckbox.dataset.questionId = questionId;
            showControlAnswerCheckbox.dataset.isControlAnswer = 'true';
            // Default: unchecked (control answer unchecked by default)
            const visibility = window.answerVisibility && window.answerVisibility[questionId] ? window.answerVisibility[questionId] : { controlAnswerVisible: false };
            showControlAnswerCheckbox.checked = visibility.controlAnswerVisible || false;
            showControlAnswerCheckbox.style.cssText = 'cursor: pointer; width: 18px; height: 18px;';
            
            showControlAnswerCheckbox.addEventListener('change', () => {
                if (!window.answerVisibility[questionId]) {
                    window.answerVisibility[questionId] = {
                        visibleParticipants: new Set(),
                        controlAnswerVisible: false
                    };
                }
                window.answerVisibility[questionId].controlAnswerVisible = showControlAnswerCheckbox.checked;
                // Update highlights on image when control answer visibility changes
                if (imageSrc) {
                    const imageWrapper = document.getElementById(`image-wrapper-${questionId}`);
                    if (imageWrapper && typeof imageWrapper._updateHighlights === 'function') {
                        imageWrapper._updateHighlights();
                    }
                }
                // Update display if it's currently showing
                updateDisplayIfVisible();
            });
            
            const showControlAnswerLabel = document.createElement('label');
            showControlAnswerLabel.textContent = 'show this answer';
            showControlAnswerLabel.style.cssText = 'font-size: 0.85rem; color: #666; cursor: pointer; white-space: nowrap;';
            showControlAnswerLabel.htmlFor = showControlAnswerCheckbox.id = `show-control-answer-${questionId}`;
            
            showControlAnswerContainer.appendChild(showControlAnswerCheckbox);
            showControlAnswerContainer.appendChild(showControlAnswerLabel);
            controlAnswerRow.appendChild(showControlAnswerContainer);
            
            legend.appendChild(controlAnswerRow);
        }
        
        scrollableContent.appendChild(legend);
        container.appendChild(scrollableContent);
    }
    
    return { render: render };
})();
