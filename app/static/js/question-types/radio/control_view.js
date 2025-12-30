/**
 * Radio question type - Control view
 * Uses same layout as text (same spec)
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Radio = QuestionTypes.Radio || {};

QuestionTypes.Radio.ControlView = (function() {
    // Reuse text control view logic
    const TextControlView = QuestionTypes.Text ? QuestionTypes.Text.ControlView : null;
    
    function render(container, options) {
        // Radio uses same layout as text - just format the answer differently
        if (TextControlView) {
            // Clone options and format radio answer as string
            const formattedOptions = Object.assign({}, options);
            if (formattedOptions.answers) {
                const formattedAnswers = {};
                Object.keys(formattedOptions.answers).forEach(pid => {
                    const answerData = formattedOptions.answers[pid];
                    if (answerData && answerData.answer !== undefined) {
                        formattedAnswers[pid] = Object.assign({}, answerData, {
                            answer: String(answerData.answer)
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



