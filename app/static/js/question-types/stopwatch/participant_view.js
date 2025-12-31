/**
 * Stopwatch question type - Participant view
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Stopwatch = QuestionTypes.Stopwatch || {};

QuestionTypes.Stopwatch.ParticipantView = (function() {
    function render(container, element, options) {
        const questionId = element.parent_id;
        const questionTitle = options.questionTitle || '';
        const submittedAnswer = options.submittedAnswer || null;
        const submitAnswerCallback = options.submitAnswerCallback || null;
        
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
        
        const stopwatchContainer = document.createElement('div');
        stopwatchContainer.className = 'stopwatch-container';
        stopwatchContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 1rem;';
        
        const timerDisplay = document.createElement('div');
        timerDisplay.className = 'timer-display';
        timerDisplay.style.cssText = 'font-size: 2rem; font-weight: bold; display: none;';
        timerDisplay.textContent = '0:00.0';
        stopwatchContainer.appendChild(timerDisplay);
        
        const controlsDiv = document.createElement('div');
        controlsDiv.style.cssText = 'display: flex; gap: 1rem;';
        
        // Get timer start method from question config
        const question = options.question || null;
        const timerStartMethod = (question && question.question_config && question.question_config.timer_start_method) || 'user';
        const isAutoStart = timerStartMethod !== 'user';
        
        const startBtn = document.createElement('button');
        startBtn.textContent = 'Start';
        // Grey out if auto-start or already submitted
        if (isAutoStart || submittedAnswer) {
            startBtn.style.cssText = 'padding: 0.5rem 1rem; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500;';
            startBtn.disabled = true;
        } else {
            startBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
            startBtn.disabled = false;
        }
        
        const stopBtn = document.createElement('button');
        stopBtn.textContent = 'Stop';
        stopBtn.style.cssText = 'padding: 0.5rem 1rem; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
        stopBtn.disabled = true;
        
        let startTime = null;
        let elapsedTime = submittedAnswer && submittedAnswer.answer ? submittedAnswer.answer : 0;
        let intervalId = null;
        let isSubmitted = !!submittedAnswer;
        
        // If already submitted, show the time
        if (submittedAnswer && submittedAnswer.answer) {
            const totalSeconds = elapsedTime / 1000;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const secs = Math.floor(seconds);
            const tenths = Math.floor((seconds % 1) * 10);
            timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}.${tenths}`;
            timerDisplay.style.display = 'block';
            startBtn.style.cssText = 'padding: 0.5rem 1rem; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500;';
            stopBtn.style.cssText = 'padding: 0.5rem 1rem; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500;';
        }
        
        startBtn.onclick = () => {
            if (isSubmitted) return;
            startTime = Date.now() - elapsedTime;
            startBtn.disabled = true;
            startBtn.textContent = 'Timing...';
            startBtn.style.cssText = 'padding: 0.5rem 1rem; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500;';
            stopBtn.disabled = false;
            timerDisplay.style.display = 'none'; // Hide timer while running
            
            intervalId = setInterval(() => {
                elapsedTime = Date.now() - startTime;
                // Don't update display text while running - only show time after stopping
            }, 100);
        };
        
        stopBtn.onclick = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            if (startTime) {
                elapsedTime = Date.now() - startTime;
            }
            stopBtn.disabled = true;
            stopBtn.style.cssText = 'padding: 0.5rem 1rem; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500;';
            
            // Show the final time with tenths of a second
            const totalSeconds = elapsedTime / 1000;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const secs = Math.floor(seconds);
            const tenths = Math.floor((seconds % 1) * 10);
            timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}.${tenths}`;
            timerDisplay.style.display = 'block';
            
            if (elapsedTime > 0 && !isSubmitted && submitAnswerCallback) {
                isSubmitted = true;
                submitAnswerCallback(questionId, 'stopwatch', stopBtn, elapsedTime);
            }
        };
        
        controlsDiv.appendChild(startBtn);
        controlsDiv.appendChild(stopBtn);
        stopwatchContainer.appendChild(controlsDiv);
        contentArea.appendChild(stopwatchContainer);
        
        if (submittedAnswer) {
            const submittedMsg = document.createElement('div');
            submittedMsg.textContent = 'Answer already submitted';
            submittedMsg.style.cssText = 'color: #666; font-size: 0.85rem; font-style: italic;';
            contentArea.appendChild(submittedMsg);
        }
        
        container.appendChild(contentArea);
        
        // Expose a function to programmatically start the stopwatch (for auto-start)
        container.startStopwatch = () => {
            if (!isSubmitted && !startBtn.disabled && startTime === null) {
                startBtn.click();
            }
        };
    }
    
    return { render: render };
})();

