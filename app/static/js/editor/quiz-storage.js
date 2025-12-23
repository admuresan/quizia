// Quiz loading and saving functionality

(function(Editor) {
    'use strict';

    Editor.QuizStorage = {
        loadQuiz: async function(name) {
            try {
                const response = await fetch(`/api/quiz/load/${encodeURIComponent(name)}`);
                const data = await response.json();
                if (data.quiz) {
                    if (data.quiz.pages) {
                        data.quiz.pages.forEach((page, index) => {
                            if (!page.name) {
                                if (page.type === 'status') {
                                    page.name = 'Status Page';
                                } else if (page.type === 'results') {
                                    page.name = 'Results Page';
                                } else {
                                    const pageNumber = data.quiz.pages.slice(0, index + 1).filter(p => p.type === 'display').length;
                                    page.name = `Page ${pageNumber}`;
                                }
                            }
                        });
                    }
                    return data.quiz;
                }
                return null;
            } catch (error) {
                console.error('Error loading quiz:', error);
                return null;
            }
        },

        autosaveQuiz: async function(currentQuiz, quizName) {
            if (!quizName || !quizName.trim()) {
                return;
            }

            currentQuiz.name = quizName;
            const saveStatus = document.getElementById('save-status');
            
            if (saveStatus) {
                saveStatus.textContent = 'Saving...';
                saveStatus.style.color = '#2196F3';
            }

            try {
                const response = await fetch('/api/quiz/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: quizName,
                        quiz: currentQuiz
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    if (saveStatus) {
                        saveStatus.textContent = 'Saved';
                        saveStatus.style.color = '#4CAF50';
                        setTimeout(() => {
                            if (saveStatus) {
                                saveStatus.textContent = 'Saved';
                                saveStatus.style.color = '#666';
                            }
                        }, 2000);
                    }
                } else {
                    if (saveStatus) {
                        saveStatus.textContent = 'Error';
                        saveStatus.style.color = '#f44336';
                    }
                }
            } catch (error) {
                if (saveStatus) {
                    saveStatus.textContent = 'Error';
                    saveStatus.style.color = '#f44336';
                }
            }
        }
    };

    if (typeof window.Editor === 'undefined') {
        window.Editor = {};
    }
    window.Editor.QuizStorage = Editor.QuizStorage;

})(typeof Editor !== 'undefined' ? Editor : {});
