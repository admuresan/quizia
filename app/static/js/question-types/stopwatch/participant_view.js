/**
 * Stopwatch question type - Participant view
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Stopwatch = QuestionTypes.Stopwatch || {};

QuestionTypes.Stopwatch.ParticipantView = (function() {
    const Common = QuestionTypes.Common;
    
    function render(container, element, options) {
        const questionId = element.parent_id;
        const questionTitle = options.questionTitle || '';
        const submittedAnswer = options.submittedAnswer || null;
        const submitAnswerCallback = options.submitAnswerCallback || null;
        const insideContainer = options.insideContainer !== undefined ? options.insideContainer : true;
        const width = options.width || element.width || 370;
        const height = options.height || element.height || 120;
        
        // Create container and title using common function
        const { outerContainer, innerContainer } = Common.createParticipantContainer(
            questionId, questionTitle, width, height, insideContainer, submittedAnswer
        );
        
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
        
        // Find the question title element in our own container
        const findQuestionTitle = () => {
            return outerContainer.querySelector('.question-title');
        };
        
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
            
            // Update title to show "Timing"
            const titleElement = findQuestionTitle();
            if (titleElement) {
                const originalTitle = questionTitle || 'Question';
                titleElement.textContent = `${originalTitle} - Timing`;
            }
            
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
            
            // Show the final time with tenths of a second
            const totalSeconds = elapsedTime / 1000;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const secs = Math.floor(seconds);
            const tenths = Math.floor((seconds % 1) * 10);
            const timeString = `${minutes}:${secs.toString().padStart(2, '0')}.${tenths}`;
            timerDisplay.textContent = timeString;
            timerDisplay.style.display = 'block';
            
            // Replace stop button with "Submitted" button
            stopBtn.textContent = 'Submitted';
            stopBtn.disabled = true;
            stopBtn.style.cssText = 'padding: 0.5rem 1rem; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500;';
            
            // Update title to show the time
            const titleElement = findQuestionTitle();
            if (titleElement) {
                const originalTitle = questionTitle || 'Question';
                titleElement.textContent = `${originalTitle} - ${timeString}`;
            }
            
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
        
        innerContainer.appendChild(contentArea);
        
        // Append the outer container to the provided container
        container.appendChild(outerContainer);
        
        // Expose a function to programmatically start the stopwatch (for auto-start)
        outerContainer.startStopwatch = () => {
            if (!isSubmitted && startTime === null) {
                // Temporarily enable button if it's disabled (for auto-start)
                const wasDisabled = startBtn.disabled;
                if (wasDisabled) {
                    startBtn.disabled = false;
                    startBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
                }
                startBtn.click();
            }
        };
    }
    
    return { render: render };
})();

