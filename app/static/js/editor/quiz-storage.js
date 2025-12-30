// Quiz loading and saving functionality

(function(Editor) {
    'use strict';

    Editor.QuizStorage = {
        loadQuiz: async function(quizId) {
            try {
                const response = await fetch(`/api/quiz/load/${encodeURIComponent(quizId)}`);
                const data = await response.json();
                if (data.quiz) {
                    if (data.quiz.pages) {
                        data.quiz.pages.forEach((page, index) => {
                            if (!page.name) {
                                const pageType = page.page_type;
                                if (pageType === 'status_page') {
                                    page.name = 'Status Page';
                                } else if (pageType === 'result_page') {
                                    page.name = 'Results Page';
                                } else {
                                    const pageNumber = data.quiz.pages.slice(0, index + 1).filter(p => p.page_type === 'quiz_page').length;
                                    page.name = `Page ${pageNumber}`;
                                }
                            }
                            // Ensure page_order is set
                            if (page.page_order === undefined || page.page_order === null) {
                                page.page_order = index + 1;
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
            
            // Convert to new format before saving
            if (Editor.QuizStructure && Editor.QuizStructure.ensureQuizNewFormat) {
                currentQuiz = Editor.QuizStructure.ensureQuizNewFormat(currentQuiz);
            }
            
            // Remove view_settings before saving (editor UI state only, not part of quiz data)
            // Canvas size is stored in page.views[view].view_config.size (single source of truth)
            const quizToSave = { ...currentQuiz };
            if (quizToSave.view_settings) {
                delete quizToSave.view_settings;
            }
            
            // Ensure ID is set (use existing ID or generate new one on save will handle it)
            const saveStatus = document.getElementById('save-status');
            
            if (saveStatus) {
                saveStatus.textContent = 'Saving...';
                saveStatus.style.color = '#ffffff';
            }

            try {
                const response = await fetch('/api/quiz/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: currentQuiz.id, // Include ID if it exists (for updates)
                        quiz: quizToSave
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    // Update currentQuiz with the ID returned from server (for new quizzes)
                    if (data.id && !currentQuiz.id) {
                        currentQuiz.id = data.id;
                        // Update URL to include quiz ID
                        const url = new URL(window.location.href);
                        url.searchParams.set('quiz', data.id);
                        window.history.replaceState({}, '', url);
                    }
                    
                    if (saveStatus) {
                        saveStatus.textContent = 'Saved';
                        saveStatus.style.color = '#ffffff';
                        setTimeout(() => {
                            if (saveStatus) {
                                saveStatus.textContent = 'Saved';
                                saveStatus.style.color = '#ffffff';
                            }
                        }, 2000);
                    }
                } else {
                    if (saveStatus) {
                        saveStatus.textContent = 'Error';
                        saveStatus.style.color = '#ffffff';
                    }
                    console.error('Save error:', data.error);
                }
            } catch (error) {
                if (saveStatus) {
                    saveStatus.textContent = 'Error';
                    saveStatus.style.color = '#f44336';
                }
                console.error('Save error:', error);
            }
        },

        forceSaveQuiz: async function(currentQuiz, quizName) {
            if (!quizName || !quizName.trim()) {
                return;
            }

            currentQuiz.name = quizName;
            
            // Convert to new format before saving
            if (Editor.QuizStructure && Editor.QuizStructure.ensureQuizNewFormat) {
                currentQuiz = Editor.QuizStructure.ensureQuizNewFormat(currentQuiz);
            }
            
            // Remove view_settings before saving (editor UI state only, not part of quiz data)
            // Canvas size is stored in page.views[view].view_config.size (single source of truth)
            const quizToSave = { ...currentQuiz };
            if (quizToSave.view_settings) {
                delete quizToSave.view_settings;
            }
            
            const saveStatus = document.getElementById('save-status');
            
            if (saveStatus) {
                saveStatus.textContent = 'Saving...';
                saveStatus.style.color = '#ffffff';
            }

            try {
                const response = await fetch('/api/quiz/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: currentQuiz.id, // Include ID if it exists (for updates)
                        quiz: quizToSave,
                        force_recreate: true // Flag to force file recreation
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    // Update currentQuiz with the ID returned from server (for new quizzes)
                    if (data.id && !currentQuiz.id) {
                        currentQuiz.id = data.id;
                        // Update URL to include quiz ID
                        const url = new URL(window.location.href);
                        url.searchParams.set('quiz', data.id);
                        window.history.replaceState({}, '', url);
                    }
                    
                    if (saveStatus) {
                        saveStatus.textContent = 'Saved';
                        saveStatus.style.color = '#ffffff';
                        setTimeout(() => {
                            if (saveStatus) {
                                saveStatus.textContent = 'Saved';
                                saveStatus.style.color = '#ffffff';
                            }
                        }, 2000);
                    }
                } else {
                    if (saveStatus) {
                        saveStatus.textContent = 'Error';
                        saveStatus.style.color = '#ffffff';
                    }
                    console.error('Save error:', data.error);
                }
            } catch (error) {
                if (saveStatus) {
                    saveStatus.textContent = 'Error';
                    saveStatus.style.color = '#f44336';
                }
                console.error('Save error:', error);
            }
        }
    };

    if (typeof window.Editor === 'undefined') {
        window.Editor = {};
    }
    window.Editor.QuizStorage = Editor.QuizStorage;

})(typeof Editor !== 'undefined' ? Editor : {});
