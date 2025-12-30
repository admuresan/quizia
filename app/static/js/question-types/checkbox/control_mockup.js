/**
 * Checkbox question type - Control mockup for editor
 * Imports from control_view with mock data
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Checkbox = QuestionTypes.Checkbox || {};

QuestionTypes.Checkbox.ControlMockup = (function() {
    const ControlView = QuestionTypes.Checkbox ? QuestionTypes.Checkbox.ControlView : null;
    
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
        
        // Get options list for fallback
        const optionsList = (options.question && options.question.question_config && options.question.question_config.options) || ['Option A', 'Option B', 'Option C'];
        
        // For checkbox, correct answer is an array, participant1 should have the correct answer(s)
        const participant1Answer = Array.isArray(correctAnswer) ? correctAnswer : (correctAnswer !== null && correctAnswer !== undefined ? [String(correctAnswer)] : [optionsList[0]]);
        const participant2Answer = optionsList.length > 1 ? [optionsList[1]] : ['Option B'];
        
        const mockAnswers = {
            'participant1': {
                answer: participant1Answer,
                submission_time: 12.5,
                correct: true,
                bonus_points: 5
            },
            'participant2': {
                answer: participant2Answer,
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
            answerType: 'checkbox' // Pass answerType for radio/checkbox
        };
        
        // Use the control view renderer
        if (ControlView) {
            ControlView.render(container, mockOptions);
        } else {
            console.error('Checkbox.ControlView not available');
        }
    }
    
    return { render: render };
})();


