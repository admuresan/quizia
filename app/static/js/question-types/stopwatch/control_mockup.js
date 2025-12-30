/**
 * Stopwatch question type - Control mockup for editor
 * Imports from control_view with mock data
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Stopwatch = QuestionTypes.Stopwatch || {};

QuestionTypes.Stopwatch.ControlMockup = (function() {
    const ControlView = QuestionTypes.Stopwatch ? QuestionTypes.Stopwatch.ControlView : null;
    
    function render(container, options) {
        // Create mock participants and answers for preview
        const mockParticipants = {
            'participant1': { name: 'Alice', avatar: 'avatar_0' },
            'participant2': { name: 'Bob', avatar: 'avatar_1' },
            'participant3': { name: 'Charlie', avatar: 'avatar_2' }
        };
        
        // Get correct answer from question element (stopwatch answers are in milliseconds)
        let correctAnswer = null;
        if (options.question && options.question.question_config) {
            correctAnswer = options.question.question_config.question_correct_answer;
        }
        
        // Convert correct answer to milliseconds if it's a number (seconds) or use default
        let participant1Answer = 12500; // default 12.5 seconds in milliseconds
        if (correctAnswer !== null && correctAnswer !== undefined) {
            const numAnswer = typeof correctAnswer === 'number' ? correctAnswer : parseFloat(correctAnswer);
            if (!isNaN(numAnswer)) {
                // If less than 1000, assume it's in seconds and convert to milliseconds
                participant1Answer = numAnswer < 1000 ? numAnswer * 1000 : numAnswer;
            }
        }
        
        const mockAnswers = {
            'participant1': {
                answer: participant1Answer, // milliseconds
                submission_time: 12.5,
                correct: true,
                bonus_points: 5
            },
            'participant2': {
                answer: 15200, // milliseconds
                submission_time: 15.2,
                correct: false,
                bonus_points: 0
            }
        };
        
        const mockOptions = {
            questionId: options.questionId || 'mock-question',
            questionTitle: options.questionTitle || '', // Use actual question title, not "Question"
            answers: mockAnswers,
            participants: mockParticipants,
            onMarkAnswer: null, // No-op for mockup
            question: options.question || null // Pass question element for correct_answer
        };
        
        // Use the control view renderer
        if (ControlView) {
            ControlView.render(container, mockOptions);
        } else {
            console.error('Stopwatch.ControlView not available');
        }
    }
    
    return { render: render };
})();


