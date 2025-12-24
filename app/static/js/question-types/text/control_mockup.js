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
        
        const mockAnswers = {
            'participant1': {
                answer: 'Sample answer text that might be long',
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
            questionTitle: options.questionTitle || 'Question',
            answers: mockAnswers,
            participants: mockParticipants,
            onMarkAnswer: null // No-op for mockup
        };
        
        // Use the control view renderer
        ControlView.render(container, mockOptions);
    }
    
    return { render: render };
})();

