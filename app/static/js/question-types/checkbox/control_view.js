/**
 * Checkbox question type - Control view
 * Uses same layout as text (same spec)
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Checkbox = QuestionTypes.Checkbox || {};

QuestionTypes.Checkbox.ControlView = (function() {
    // Reuse text control view logic
    const TextControlView = QuestionTypes.Text ? QuestionTypes.Text.ControlView : null;
    
    function render(container, options) {
        // Checkbox uses same layout as text - just format the answer as comma-separated string
        if (TextControlView) {
            // Clone options and format checkbox answer as comma-separated string
            const formattedOptions = Object.assign({}, options);
            if (formattedOptions.answers) {
                const formattedAnswers = {};
                Object.keys(formattedOptions.answers).forEach(pid => {
                    const answerData = formattedOptions.answers[pid];
                    if (answerData && answerData.answer !== undefined) {
                        formattedAnswers[pid] = Object.assign({}, answerData, {
                            answer: Array.isArray(answerData.answer) 
                                ? answerData.answer.join(', ') 
                                : String(answerData.answer)
                        });
                    } else {
                        formattedAnswers[pid] = answerData;
                    }
                });
                formattedOptions.answers = formattedAnswers;
            }
            TextControlView.render(container, formattedOptions);
        } else {
            console.error('Text.ControlView not available');
        }
    }
    
    return { render: render };
})();



