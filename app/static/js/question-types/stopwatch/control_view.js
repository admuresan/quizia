/**
 * Stopwatch question type - Control view
 * Uses same layout as text (same spec), but formats time display
 */

var QuestionTypes = QuestionTypes || {};
QuestionTypes.Stopwatch = QuestionTypes.Stopwatch || {};

QuestionTypes.Stopwatch.ControlView = (function() {
    const Common = QuestionTypes.Common;
    // Reuse text control view logic
    const TextControlView = QuestionTypes.Text ? QuestionTypes.Text.ControlView : null;
    
    function render(container, options) {
        // Stopwatch uses same layout as text - just format the answer as time
        if (TextControlView) {
            // Clone options and format stopwatch answer as formatted time string
            const formattedOptions = Object.assign({}, options);
            if (formattedOptions.answers) {
                const formattedAnswers = {};
                Object.keys(formattedOptions.answers).forEach(pid => {
                    const answerData = formattedOptions.answers[pid];
                    if (answerData && answerData.answer !== undefined) {
                        formattedAnswers[pid] = Object.assign({}, answerData, {
                            answer: Common.formatStopwatchTime(answerData.answer)
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

