/**
 * Text question type - Control mockup for editor
 * Imports from control_view with mock data
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Text = QuestionTypes.Text || {};

QuestionTypes.Text.ControlMockup = (function() {
    const ControlView = QuestionTypes.Text.ControlView;
    
    function render(container, options) {
        // Create mock participants and answers for preview
        const mockParticipants = {
            'participant1': { name: 'Alice', avatar: 'avatar_0' },
            'participant2': { name: 'Bob', avatar: 'avatar_1' },
            'participant3': { name: 'Charlie', avatar: 'avatar_2' }
        };
        
        // Get correct answer from question element
        let correctAnswer = null;
        if (options.question && options.question.question_config) {
            correctAnswer = options.question.question_config.question_correct_answer;
        }
        
        const mockAnswers = {
            'participant1': {
                answer: correctAnswer !== null && correctAnswer !== undefined ? String(correctAnswer) : 'Sample answer text that might be long',
                submission_time: 12.5,
                correct: true,
                bonus_points: 5
            },
            'participant2': {
                answer: 'Another answer',
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
            question: options.question || null, // Pass question element for correct_answer
            answerType: options.answerType || 'text' // Pass answerType for radio/checkbox
        };
        
        // Use the control view renderer
        ControlView.render(container, mockOptions);
    }
    
    return { render: render };
})();


