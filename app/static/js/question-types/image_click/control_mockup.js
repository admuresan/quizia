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
        
        // Get correct answer from question element (image_click answers are {x, y} coordinates)
        let correctAnswer = null;
        if (options.question && options.question.question_config) {
            correctAnswer = options.question.question_config.question_correct_answer;
        }
        
        // Parse correct answer - could be object {x, y} or string/array that needs parsing
        let participant1Answer = { x: 30, y: 40 }; // default
        if (correctAnswer !== null && correctAnswer !== undefined) {
            if (typeof correctAnswer === 'object' && correctAnswer.x !== undefined && correctAnswer.y !== undefined) {
                participant1Answer = { x: correctAnswer.x, y: correctAnswer.y };
            } else if (Array.isArray(correctAnswer) && correctAnswer.length >= 2) {
                participant1Answer = { x: correctAnswer[0], y: correctAnswer[1] };
            } else if (typeof correctAnswer === 'string') {
                // Try to parse string like "30,40" or JSON
                try {
                    const parsed = JSON.parse(correctAnswer);
                    if (parsed && typeof parsed === 'object' && (parsed.x !== undefined || parsed[0] !== undefined)) {
                        participant1Answer = parsed.x !== undefined ? { x: parsed.x, y: parsed.y } : { x: parsed[0], y: parsed[1] };
                    }
                } catch (e) {
                    // Try comma-separated values
                    const parts = correctAnswer.split(',');
                    if (parts.length >= 2) {
                        const x = parseFloat(parts[0]);
                        const y = parseFloat(parts[1]);
                        if (!isNaN(x) && !isNaN(y)) {
                            participant1Answer = { x: x, y: y };
                        }
                    }
                }
            }
        }
        
        const mockAnswers = {
            'participant1': {
                answer: participant1Answer,
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
            questionTitle: options.questionTitle || '', // Use actual question title, not "Question"
            answers: mockAnswers,
            participants: mockParticipants,
            onMarkAnswer: null, // No-op for mockup
            imageSrc: options.imageSrc || '',
            question: options.question || null // Pass question element for correct_answer
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


