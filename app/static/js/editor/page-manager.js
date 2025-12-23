// Page management functionality for the editor
// This module handles adding, deleting, and rendering pages

(function(Editor) {
    'use strict';

    Editor.PageManager = {
        addPage: function(type, currentQuiz, currentPageIndex, callbacks) {
            // Generate default page name based on type
            let defaultName = '';
            if (type === 'status') {
                defaultName = 'Status Page';
            } else if (type === 'results') {
                defaultName = 'Results Page';
            } else {
                const pageNumber = currentQuiz.pages.filter(p => p.type === 'display').length + 1;
                defaultName = `Page ${pageNumber}`;
            }
            
            const page = {
                type: type,
                name: defaultName,
                elements: [],
                background_color: currentQuiz.background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                background_image: null
            };
            
            // Auto-populate status page with template
            if (type === 'status') {
                page.elements.push({
                    id: `status-podium-${Date.now()}`,
                    type: 'text',
                    x: 50,
                    y: 50,
                    width: 900,
                    height: 300,
                    text: 'PODIUM',
                    html: '<div style="text-align: center; font-size: 48px; font-weight: bold; color: #FFD700;">🥇 🥈 🥉<br>PODIUM</div>',
                    visible: true,
                    is_question: false
                });
                
                page.elements.push({
                    id: `status-table-${Date.now()}`,
                    type: 'text',
                    x: 50,
                    y: 400,
                    width: 900,
                    height: 400,
                    text: 'PARTICIPANT TABLE',
                    html: '<div style="text-align: center; font-size: 36px; font-weight: bold;">📊 PARTICIPANT RANKINGS TABLE</div>',
                    visible: true,
                    is_question: false
                });
            }
            
            // Auto-populate results page with template
            if (type === 'results') {
                page.elements.push({
                    id: `results-winner-${Date.now()}`,
                    type: 'text',
                    x: 50,
                    y: 50,
                    width: 450,
                    height: 700,
                    text: 'WINNER',
                    html: '<div style="text-align: center; padding: 2rem;"><div style="font-size: 120px;">🎉</div><div style="font-size: 64px; margin: 1rem 0;">👤</div><div style="font-size: 48px; font-weight: bold; margin: 1rem 0;">WINNER NAME</div><div style="font-size: 36px; margin-top: 1rem;">🏆 CHAMPION 🏆</div></div>',
                    visible: true,
                    is_question: false
                });
                
                page.elements.push({
                    id: `results-rankings-${Date.now()}`,
                    type: 'text',
                    x: 550,
                    y: 50,
                    width: 450,
                    height: 700,
                    text: 'RANKINGS',
                    html: '<div style="padding: 2rem;"><div style="font-size: 36px; font-weight: bold; margin-bottom: 1rem;">📋 RANKINGS</div><div style="font-size: 24px; line-height: 2;">2nd Place - Name<br>3rd Place - Name<br>4th Place - Name<br>5th Place - Name<br>...</div></div>',
                    visible: true,
                    is_question: false
                });
            }
            
            currentQuiz.pages.push(page);
            const newPageIndex = currentQuiz.pages.length - 1;
            
            if (callbacks && callbacks.onPageAdded) {
                callbacks.onPageAdded(newPageIndex);
            }
            
            return newPageIndex;
        },

        renderPages: function(currentQuiz, currentPageIndex, callbacks) {
            const list = document.getElementById('pages-list');
            if (!list) return;
            
            list.innerHTML = '';
            
            currentQuiz.pages.forEach((page, index) => {
                const item = document.createElement('div');
                item.className = 'page-item';
                if (index === currentPageIndex) {
                    item.classList.add('active');
                }
                
                const pageContent = document.createElement('div');
                pageContent.style.display = 'flex';
                pageContent.style.alignItems = 'center';
                pageContent.style.justifyContent = 'space-between';
                pageContent.style.width = '100%';
                pageContent.style.gap = '0.5rem';
                
                // Arrow buttons container
                const arrowButtonsContainer = document.createElement('div');
                arrowButtonsContainer.style.display = 'flex';
                arrowButtonsContainer.style.flexDirection = 'column';
                arrowButtonsContainer.style.gap = '0.1rem';
                arrowButtonsContainer.style.alignItems = 'center';
                
                // Move up button
                const moveUpBtn = document.createElement('button');
                moveUpBtn.innerHTML = '↑';
                moveUpBtn.className = 'page-move-btn';
                moveUpBtn.title = 'Move up';
                moveUpBtn.disabled = index === 0;
                moveUpBtn.style.cssText = 'padding: 0.15rem 0.3rem; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 0.75rem; min-width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;';
                
                if (index === currentPageIndex) {
                    moveUpBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                    moveUpBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    moveUpBtn.style.color = 'white';
                }
                
                moveUpBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (index > 0 && callbacks && callbacks.onMovePage) {
                        callbacks.onMovePage(index, index - 1);
                    }
                });
                arrowButtonsContainer.appendChild(moveUpBtn);
                
                // Move down button
                const moveDownBtn = document.createElement('button');
                moveDownBtn.innerHTML = '↓';
                moveDownBtn.className = 'page-move-btn';
                moveDownBtn.title = 'Move down';
                moveDownBtn.disabled = index === currentQuiz.pages.length - 1;
                moveDownBtn.style.cssText = 'padding: 0.15rem 0.3rem; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 0.75rem; min-width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;';
                
                if (index === currentPageIndex) {
                    moveDownBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                    moveDownBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    moveDownBtn.style.color = 'white';
                }
                
                moveDownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (index < currentQuiz.pages.length - 1 && callbacks && callbacks.onMovePage) {
                        callbacks.onMovePage(index, index + 1);
                    }
                });
                arrowButtonsContainer.appendChild(moveDownBtn);
                
                pageContent.appendChild(arrowButtonsContainer);
                
                // Page name input
                const pageNameContainer = document.createElement('div');
                pageNameContainer.style.flex = '1';
                pageNameContainer.style.minWidth = '0';
                pageNameContainer.style.cursor = 'pointer';
                
                const pageNameInput = document.createElement('input');
                pageNameInput.type = 'text';
                pageNameInput.value = page.name || `Page ${index + 1} (${page.type})`;
                pageNameInput.className = 'page-name-input';
                pageNameInput.readOnly = true;
                pageNameInput.style.cssText = 'width: 100%; padding: 0.25rem; border: 1px solid transparent; background: transparent; font-size: 0.9rem; cursor: pointer;';
                if (index === currentPageIndex) {
                    pageNameInput.style.color = 'white';
                }
                
                let isEditing = false;
                
                const startEditing = () => {
                    isEditing = true;
                    pageNameInput.readOnly = false;
                    pageNameInput.style.border = '1px solid #2196F3';
                    pageNameInput.style.background = 'white';
                    pageNameInput.style.color = '#333';
                    pageNameInput.style.cursor = 'text';
                    pageNameInput.focus();
                    pageNameInput.select();
                };
                
                const stopEditing = () => {
                    isEditing = false;
                    pageNameInput.readOnly = true;
                    page.name = pageNameInput.value.trim() || pageNameInput.value || `Page ${index + 1} (${page.type})`;
                    pageNameInput.value = page.name;
                    pageNameInput.style.border = '1px solid transparent';
                    pageNameInput.style.background = 'transparent';
                    if (index === currentPageIndex) {
                        pageNameInput.style.color = 'white';
                    } else {
                        pageNameInput.style.color = '#333';
                    }
                    pageNameInput.style.cursor = 'pointer';
                    if (callbacks && callbacks.onPageRenamed) {
                        callbacks.onPageRenamed();
                    }
                };
                
                pageNameContainer.addEventListener('click', (e) => {
                    if (!isEditing && (e.target === pageNameContainer || e.target === pageNameInput)) {
                        e.stopPropagation();
                        if (callbacks && callbacks.onPageSelected) {
                            callbacks.onPageSelected(index);
                        }
                    }
                });
                
                pageNameInput.addEventListener('blur', () => {
                    if (isEditing) {
                        stopEditing();
                    }
                });
                
                pageNameInput.addEventListener('keydown', (e) => {
                    if (isEditing) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            stopEditing();
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            pageNameInput.value = page.name || `Page ${index + 1} (${page.type})`;
                            stopEditing();
                        }
                    }
                });
                
                pageNameContainer.appendChild(pageNameInput);
                pageContent.appendChild(pageNameContainer);
                
                // Action buttons
                const buttonsContainer = document.createElement('div');
                buttonsContainer.style.display = 'flex';
                buttonsContainer.style.gap = '0.25rem';
                buttonsContainer.style.alignItems = 'center';
                
                // Edit button
                const editBtn = document.createElement('button');
                editBtn.innerHTML = '✏️';
                editBtn.className = 'page-edit-btn';
                editBtn.title = 'Rename page';
                editBtn.style.cssText = 'padding: 0.15rem 0.3rem; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 0.75rem; min-width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; color: #2196F3;';
                
                if (index === currentPageIndex) {
                    editBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                    editBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    editBtn.style.color = '#90CAF9';
                }
                
                editBtn.addEventListener('mouseenter', () => {
                    if (index === currentPageIndex) {
                        editBtn.style.background = 'rgba(255, 255, 255, 0.3)';
                    } else {
                        editBtn.style.background = '#e3f2fd';
                    }
                });
                
                editBtn.addEventListener('mouseleave', () => {
                    if (index === currentPageIndex) {
                        editBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                    } else {
                        editBtn.style.background = 'white';
                    }
                });
                
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    startEditing();
                });
                
                buttonsContainer.appendChild(editBtn);
                
                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '🗑️';
                deleteBtn.className = 'page-delete-btn';
                deleteBtn.title = 'Delete page';
                deleteBtn.style.cssText = 'padding: 0.15rem 0.3rem; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 0.75rem; min-width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; color: #dc3545;';
                deleteBtn.disabled = currentQuiz.pages.length === 1;
                
                if (index === currentPageIndex) {
                    deleteBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                    deleteBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    deleteBtn.style.color = '#ff6b6b';
                }
                
                deleteBtn.addEventListener('mouseenter', () => {
                    if (!deleteBtn.disabled) {
                        deleteBtn.style.background = '#dc3545';
                        deleteBtn.style.color = 'white';
                    }
                });
                
                deleteBtn.addEventListener('mouseleave', () => {
                    if (index === currentPageIndex) {
                        deleteBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                        deleteBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        deleteBtn.style.color = '#ff6b6b';
                    } else {
                        deleteBtn.style.background = 'white';
                        deleteBtn.style.color = '#dc3545';
                    }
                });
                
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (currentQuiz.pages.length === 1) {
                        alert('Cannot delete the last page');
                        return;
                    }
                    
                    if (confirm(`Are you sure you want to delete "${page.name || `Page ${index + 1}`}"?`)) {
                        if (callbacks && callbacks.onDeletePage) {
                            callbacks.onDeletePage(index);
                        }
                    }
                });
                
                buttonsContainer.appendChild(deleteBtn);
                pageContent.appendChild(buttonsContainer);
                item.appendChild(pageContent);
                list.appendChild(item);
            });
        }
    };

    // Create global Editor namespace if it doesn't exist
    if (typeof window.Editor === 'undefined') {
        window.Editor = {};
    }
    window.Editor.PageManager = Editor.PageManager;

})(typeof Editor !== 'undefined' ? Editor : {});

