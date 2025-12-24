/**
 * Image click question type - Control mockup for editor
 * Imports from control_view with mock data
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.ImageClick = QuestionTypes.ImageClick || {};

QuestionTypes.ImageClick.ControlMockup = (function() {
    const ControlView = QuestionTypes.ImageClick ? QuestionTypes.ImageClick.ControlView : null;
    
    function render(container, options) {
        // Create mock participants and answers for preview
        const mockParticipants = {
            'participant1': { name: 'Alice', avatar: 'avatar_0' },
            'participant2': { name: 'Bob', avatar: 'avatar_1' },
            'participant3': { name: 'Charlie', avatar: 'avatar_2' }
        };
        
        const mockAnswers = {
            'participant1': {
                answer: { x: 30, y: 40 },
                submission_time: 12.5,
                correct: true,
                bonus_points: 5
            },
            'participant2': {
                answer: { x: 60, y: 70 },
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
            onMarkAnswer: null, // No-op for mockup
            imageSrc: options.imageSrc || ''
        };
        
        // Use the control view renderer
        if (ControlView) {
            ControlView.render(container, mockOptions);
        } else {
            console.error('ImageClick.ControlView not available');
        }
    }
    
    return { render: render };
})();

