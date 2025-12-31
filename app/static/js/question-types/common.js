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
     * Format stopwatch time
     */
    function formatStopwatchTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')} (${(milliseconds / 1000).toFixed(1)}s)`;
    }
    
    return {
        getParticipantColor: getParticipantColor,
        hexToRgba: hexToRgba,
        formatSubmissionTime: formatSubmissionTime,
        formatStopwatchTime: formatStopwatchTime
    };
})();
