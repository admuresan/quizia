/**
 * Stopwatch question type - Participant view
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Stopwatch = QuestionTypes.Stopwatch || {};

QuestionTypes.Stopwatch.ParticipantView = (function() {
    function render(container, element, options) {
        const questionId = element.parent_id;
        const submittedAnswer = options.submittedAnswer || null;
        const submitAnswerCallback = options.submitAnswerCallback || null;
        
        container.style.backgroundColor = 'transparent';
        container.style.border = 'none';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0.5rem';
        container.style.padding = '0.5rem';
        
        const stopwatchContainer = document.createElement('div');
        stopwatchContainer.className = 'stopwatch-container';
        stopwatchContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 1rem;';
        
        const timerDisplay = document.createElement('div');
        timerDisplay.className = 'timer-display';
        timerDisplay.style.cssText = 'font-size: 2rem; font-weight: bold; display: none;';
        timerDisplay.textContent = '0:00';
        stopwatchContainer.appendChild(timerDisplay);
        
        const controlsDiv = document.createElement('div');
        controlsDiv.style.cssText = 'display: flex; gap: 1rem;';
        
        const startBtn = document.createElement('button');
        startBtn.textContent = 'Start';
        startBtn.style.cssText = 'padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500;';
        startBtn.disabled = !!submittedAnswer;
        
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
            const seconds = Math.floor(elapsedTime / 1000);
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
            timerDisplay.style.display = 'block';
            startBtn.style.cssText = 'padding: 0.5rem 1rem; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500;';
            stopBtn.style.cssText = 'padding: 0.5rem 1rem; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; font-weight: 500;';
        }
        
        startBtn.onclick = () => {
            if (isSubmitted) return;
            startTime = Date.now() - elapsedTime;
            startBtn.disabled = true;
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
            startBtn.disabled = false;
            stopBtn.disabled = true;
            
            // Show the final time only after stopping
            const seconds = Math.floor(elapsedTime / 1000);
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
            timerDisplay.style.display = 'block';
            
            if (elapsedTime > 0 && !isSubmitted && submitAnswerCallback) {
                isSubmitted = true;
                submitAnswerCallback(questionId, 'stopwatch', stopBtn, elapsedTime);
            }
        };
        
        controlsDiv.appendChild(startBtn);
        controlsDiv.appendChild(stopBtn);
        stopwatchContainer.appendChild(controlsDiv);
        container.appendChild(stopwatchContainer);
        
        if (submittedAnswer) {
            const submittedMsg = document.createElement('div');
            submittedMsg.textContent = 'Answer already submitted';
            submittedMsg.style.cssText = 'color: #666; font-size: 0.85rem; font-style: italic;';
            container.appendChild(submittedMsg);
        }
    }
    
    return { render: render };
})();

