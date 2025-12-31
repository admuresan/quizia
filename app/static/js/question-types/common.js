/**
 * Common utilities for question type rendering
 * Using namespace pattern for browser compatibility
 */

var QuestionTypes = QuestionTypes || {};

QuestionTypes.Common = (function() {
    // Participant colors for image_click questions (green #00FF00 reserved for correct answer only)
    const PARTICIPANT_COLORS = ['#FF0000', '#0000FF', '#FF00FF', '#00FFFF', '#FFFF00', '#FF8000', '#8000FF', '#00FF80', '#FF0080', '#FFA500'];
    
    /**
     * Get color for a participant based on their index
     */
    function getParticipantColor(participantIndex) {
        return PARTICIPANT_COLORS[participantIndex % PARTICIPANT_COLORS.length];
    }
    
    /**
     * Convert hex color to rgba string
     */
    function hexToRgba(hex, alpha = 0.2) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    /**
     * Format submission time for display
     */
    function formatSubmissionTime(submissionTime) {
        if (typeof submissionTime === 'number') {
            return `${submissionTime.toFixed(2)}s`;
        }
        return String(submissionTime || '');
    }
    
    /**
     * Format time with tenths of a second (e.g., "0:05.3")
     */
    function formatTimeWithTenths(milliseconds) {
        const totalSeconds = milliseconds / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const secs = Math.floor(seconds);
        const tenths = Math.floor((seconds % 1) * 10);
        return `${minutes}:${secs.toString().padStart(2, '0')}.${tenths}`;
    }
    
    /**
     * Format stopwatch time
     */
    function formatStopwatchTime(milliseconds) {
        const totalSeconds = milliseconds / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const secs = Math.floor(seconds);
        const tenths = Math.floor((seconds % 1) * 10);
        return `${minutes}:${secs.toString().padStart(2, '0')}.${tenths} (${totalSeconds.toFixed(1)}s)`;
    }
    
    /**
     * Create participant view container with title
     * Returns { outerContainer, innerContainer }
     */
    function createParticipantContainer(questionId, questionTitle, width, height, insideContainer, submittedAnswer) {
        // Create the outer container with white background, reduced padding, border-radius, box-shadow
        // Make it a flex container so innerContainer can use flex: 1 to fill remaining space
        // Use fixed height to prevent overlap - both editor and runtime must use identical dimensions
        const outerContainer = document.createElement('div');
        outerContainer.className = 'question-container';
        outerContainer.id = `question-${questionId}`;
        // Use !important for padding to ensure it overrides any CSS that might be loaded
        outerContainer.style.cssText = `position: relative !important; background: white !important; padding: 1rem !important; border-radius: 8px !important; margin-bottom: 1rem !important; box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; box-sizing: border-box !important; width: ${width}px !important; min-width: ${width}px !important; max-width: ${width}px !important; height: ${height}px !important; min-height: ${height}px !important; max-height: ${height}px !important; display: flex !important; flex-direction: column !important; overflow: hidden !important;`;
        
        // Add question title if available (with reduced spacing)
        // Use !important to ensure these styles override any CSS that might be loaded
        if (questionTitle && questionTitle.trim()) {
            const title = document.createElement('div');
            title.className = 'question-title';
            title.style.cssText = 'font-size: 1.5rem !important; font-weight: bold !important; color: #2196F3 !important; margin-bottom: 0.75rem !important; margin-top: 0 !important; padding-bottom: 0.5rem !important; border-bottom: 2px solid #2196F3 !important; display: block !important; width: 100% !important; flex-shrink: 0 !important;';
            title.textContent = questionTitle;
            outerContainer.appendChild(title);
        }
        
        // Inner container for the content - uses flex: 1 to fill remaining space
        const innerContainer = document.createElement('div');
        innerContainer.style.display = 'flex';
        innerContainer.style.flexDirection = 'column';
        innerContainer.style.gap = '0.5rem';
        innerContainer.style.width = '100%';
        innerContainer.style.flex = '1';
        innerContainer.style.minHeight = '0'; // Allow flex item to shrink below content size
        innerContainer.style.overflow = 'hidden'; // Always clip to maintain fixed dimensions
        innerContainer.style.boxSizing = 'border-box';
        
        outerContainer.appendChild(innerContainer);
        
        // If insideContainer is false, we need to position the outer container absolutely
        if (!insideContainer) {
            outerContainer.style.position = 'absolute';
        }
        
        // If question has a submitted answer, grey out the container
        if (submittedAnswer) {
            outerContainer.style.opacity = '0.6';
            outerContainer.style.backgroundColor = '#f5f5f5';
            outerContainer.style.pointerEvents = 'none';
        }
        
        return {
            outerContainer: outerContainer,
            innerContainer: innerContainer
        };
    }
    
    return {
        getParticipantColor: getParticipantColor,
        hexToRgba: hexToRgba,
        formatSubmissionTime: formatSubmissionTime,
        formatStopwatchTime: formatStopwatchTime,
        formatTimeWithTenths: formatTimeWithTenths,
        createParticipantContainer: createParticipantContainer
    };
})();
