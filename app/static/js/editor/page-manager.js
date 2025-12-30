// Page management functionality for the editor
// This module handles adding, deleting, and rendering pages

(function(Editor) {
    'use strict';

    Editor.PageManager = {
        addPage: function(type, currentQuiz, currentPageIndex, callbacks) {
            // Convert type to page_type
            let pageType = 'quiz_page';
            if (type === 'status') {
                pageType = 'status_page';
            } else if (type === 'results') {
                pageType = 'result_page';
            }
            
            // Generate default page name based on page_type
            let defaultName = '';
            if (pageType === 'status_page') {
                defaultName = 'Status Page';
            } else if (pageType === 'result_page') {
                defaultName = 'Results Page';
            } else {
                const pageNumber = currentQuiz.pages.filter(p => p.page_type === 'quiz_page').length + 1;
                defaultName = `Page ${pageNumber}`;
            }
            
            // Calculate page_order
            const pageOrder = currentQuiz.pages.length + 1;
            
            // Get settings from last page if it exists, otherwise use defaults
            let defaultBackground = {
                type: 'gradient',
                config: {
                    colour1: '#667eea',
                    colour2: '#764ba2',
                    angle: 135
                }
            };
            let defaultSize = {
                width: 1920,
                height: 1080
            };
            
            // If there are existing pages, use the last page's settings
            if (currentQuiz.pages && currentQuiz.pages.length > 0) {
                const lastPage = currentQuiz.pages[currentQuiz.pages.length - 1];
                if (lastPage.views) {
                    // Use display view settings as template (or any view that exists)
                    const templateView = lastPage.views.display || lastPage.views.participant || lastPage.views.control;
                    if (templateView && templateView.view_config) {
                        if (templateView.view_config.background) {
                            // Deep copy the background config
                            defaultBackground = JSON.parse(JSON.stringify(templateView.view_config.background));
                        }
                        if (templateView.view_config.size) {
                            // Deep copy the size config
                            defaultSize = JSON.parse(JSON.stringify(templateView.view_config.size));
                        }
                    }
                }
            }
            
            // Create page in new format with inherited settings
            const page = {
                name: defaultName,
                page_type: pageType,
                page_order: pageOrder,
                elements: {},
                views: {
                    display: {
                        view_config: {
                            background: JSON.parse(JSON.stringify(defaultBackground)),
                            size: JSON.parse(JSON.stringify(defaultSize))
                        },
                        local_element_configs: {}
                    },
                    participant: {
                        view_config: {
                            background: JSON.parse(JSON.stringify(defaultBackground)),
                            size: JSON.parse(JSON.stringify(defaultSize))
                        },
                        local_element_configs: {}
                    },
                    control: {
                        view_config: {
                            background: JSON.parse(JSON.stringify(defaultBackground)),
                            size: JSON.parse(JSON.stringify(defaultSize))
                        },
                        local_element_configs: {}
                    }
                }
            };
            
            // Auto-populate status page with template
            if (type === 'status') {
                const podiumId = `status-podium-${Date.now()}`;
                const tableId = `status-table-${Date.now()}`;
                
                // Add element properties (global)
                page.elements[podiumId] = {
                    properties: {
                        id: podiumId,
                        type: 'text',
                        text: 'PODIUM',
                        html: '<div style="text-align: center; font-size: 48px; font-weight: bold; color: #FFD700;">🥇 🥈 🥉<br>PODIUM</div>'
                    },
                    appearance_config: {
                        appearance_order: 0
                    },
                    is_question: false
                };
                
                page.elements[tableId] = {
                    properties: {
                        id: tableId,
                        type: 'text',
                        text: 'PARTICIPANT TABLE',
                        html: '<div style="text-align: center; font-size: 36px; font-weight: bold;">📊 PARTICIPANT RANKINGS TABLE</div>'
                    },
                    appearance_config: {
                        appearance_order: 1
                    },
                    is_question: false
                };
                
                // Add to display view local_element_configs
                page.views.display.local_element_configs[podiumId] = {
                    config: {
                        x: 50,
                        y: 50,
                        width: 900,
                        height: 300,
                        rotation: 0
                    }
                };
                
                page.views.display.local_element_configs[tableId] = {
                    config: {
                        x: 50,
                        y: 400,
                        width: 900,
                        height: 400,
                        rotation: 0
                    }
                };
            }
            
            // Auto-populate results page with template
            if (type === 'results') {
                const winnerId = `results-winner-${Date.now()}`;
                const rankingsId = `results-rankings-${Date.now()}`;
                
                // Add element properties (global)
                page.elements[winnerId] = {
                    properties: {
                        id: winnerId,
                        type: 'text',
                        text: 'WINNER',
                        html: '<div style="text-align: center; padding: 2rem;"><div style="font-size: 120px;">🎉</div><div style="font-size: 64px; margin: 1rem 0;">👤</div><div style="font-size: 48px; font-weight: bold; margin: 1rem 0;">WINNER NAME</div><div style="font-size: 36px; margin-top: 1rem;">🏆 CHAMPION 🏆</div></div>'
                    },
                    appearance_config: {
                        appearance_order: 0
                    },
                    is_question: false
                };
                
                page.elements[rankingsId] = {
                    properties: {
                        id: rankingsId,
                        type: 'text',
                        text: 'RANKINGS',
                        html: '<div style="padding: 2rem;"><div style="font-size: 36px; font-weight: bold; margin-bottom: 1rem;">📋 RANKINGS</div><div style="font-size: 24px; line-height: 2;">2nd Place - Name<br>3rd Place - Name<br>4th Place - Name<br>5th Place - Name<br>...</div></div>'
                    },
                    appearance_config: {
                        appearance_order: 1
                    },
                    is_question: false
                };
                
                // Add to display view local_element_configs
                page.views.display.local_element_configs[winnerId] = {
                    config: {
                        x: 50,
                        y: 50,
                        width: 450,
                        height: 700,
                        rotation: 0
                    }
                };
                
                page.views.display.local_element_configs[rankingsId] = {
                    config: {
                        x: 550,
                        y: 50,
                        width: 450,
                        height: 700,
                        rotation: 0
                    }
                };
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
            
            // Shared drag state
            let draggedIndex = null;
            let draggedElement = null;
            
            // Helper function to determine drop position
            function getDragAfterElement(container, y) {
                const draggableElements = [...container.querySelectorAll('.page-item:not(.dragging)')];
                
                return draggableElements.reduce((closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = y - box.top - box.height / 2;
                    
                    if (offset < 0 && offset > closest.offset) {
                        return { offset: offset, element: child };
                    } else {
                        return closest;
                    }
                }, { offset: Number.NEGATIVE_INFINITY }).element;
            }
            
            currentQuiz.pages.forEach((page, index) => {
                const item = document.createElement('div');
                item.className = 'page-item';
                item.draggable = true;
                item.dataset.pageIndex = index;
                item.style.cursor = 'grab';
                if (index === currentPageIndex) {
                    item.classList.add('active');
                }
                
                // Drag start - prevent dragging when clicking on buttons or inputs
                item.addEventListener('dragstart', (e) => {
                    // Don't start drag if clicking on interactive elements
                    const target = e.target;
                    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || 
                        target.closest('button') || target.closest('input')) {
                        e.preventDefault();
                        return;
                    }
                    
                    draggedElement = item;
                    draggedIndex = index;
                    item.classList.add('dragging');
                    item.style.opacity = '0.5';
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', index.toString());
                });
                
                // Drag end
                item.addEventListener('dragend', (e) => {
                    item.classList.remove('dragging');
                    item.style.opacity = '1';
                    // Remove all drag-over classes
                    list.querySelectorAll('.page-item').forEach(pageItem => {
                        pageItem.classList.remove('drag-over');
                    });
                    draggedElement = null;
                    draggedIndex = null;
                });
                
                // Drag over
                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    
                    if (draggedElement && draggedElement !== item) {
                        const afterElement = getDragAfterElement(list, e.clientY);
                        
                        if (afterElement == null) {
                            list.appendChild(draggedElement);
                        } else {
                            list.insertBefore(draggedElement, afterElement);
                        }
                        
                        // Add visual feedback
                        item.classList.add('drag-over');
                    }
                });
                
                // Drag leave
                item.addEventListener('dragleave', (e) => {
                    item.classList.remove('drag-over');
                });
                
                // Drop
                item.addEventListener('drop', (e) => {
                    e.preventDefault();
                    item.classList.remove('drag-over');
                    
                    if (draggedIndex !== null && draggedIndex !== index) {
                        // Find the new index after drop
                        const items = Array.from(list.querySelectorAll('.page-item'));
                        const newIndex = items.indexOf(draggedElement);
                        
                        if (newIndex !== -1 && newIndex !== draggedIndex) {
                            // Trigger page move callback (which will handle reordering, rendering and saving)
                            // Don't reorder here - let onMovePage handle it to avoid double-reordering
                            if (callbacks && callbacks.onMovePage) {
                                callbacks.onMovePage(draggedIndex, newIndex);
                            }
                        }
                    }
                });
                
                // Click handler for page item - select page when clicking anywhere on it
                let clickStartX = 0;
                let clickStartY = 0;
                let hasMoved = false;
                
                item.addEventListener('mousedown', (e) => {
                    // Don't track if clicking on buttons, inputs
                    const target = e.target;
                    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || 
                        target.closest('button') || target.closest('input') ||
                        target.closest('.arrow-btn')) {
                        return;
                    }
                    clickStartX = e.clientX;
                    clickStartY = e.clientY;
                    hasMoved = false;
                });
                
                item.addEventListener('mousemove', (e) => {
                    if (clickStartX !== 0 || clickStartY !== 0) {
                        const dx = Math.abs(e.clientX - clickStartX);
                        const dy = Math.abs(e.clientY - clickStartY);
                        if (dx > 5 || dy > 5) {
                            hasMoved = true;
                        }
                    }
                });
                
                item.addEventListener('click', (e) => {
                    // Don't trigger if clicking on buttons, inputs
                    const target = e.target;
                    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || 
                        target.closest('button') || target.closest('input') ||
                        target.closest('.arrow-btn')) {
                        return;
                    }
                    
                    // Don't trigger if user moved the mouse (was dragging)
                    if (hasMoved) {
                        clickStartX = 0;
                        clickStartY = 0;
                        hasMoved = false;
                        return;
                    }
                    
                    // Select this page
                    if (index !== currentPageIndex && callbacks && callbacks.onPageSelected) {
                        callbacks.onPageSelected(index);
                    }
                    
                    clickStartX = 0;
                    clickStartY = 0;
                    hasMoved = false;
                });
                
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
                const pageTypeLabel = page.page_type === 'status_page' ? 'Status' : 
                                     page.page_type === 'result_page' ? 'Results' : 'Quiz';
                pageNameInput.value = page.name || `Page ${index + 1} (${pageTypeLabel})`;
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
                    const pageTypeLabel = page.page_type === 'status_page' ? 'Status' : 
                                         page.page_type === 'result_page' ? 'Results' : 'Quiz';
                    page.name = pageNameInput.value.trim() || pageNameInput.value || `Page ${index + 1} (${pageTypeLabel})`;
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
                            const pageTypeLabel = page.page_type === 'status_page' ? 'Status' : 
                                     page.page_type === 'result_page' ? 'Results' : 'Quiz';
                pageNameInput.value = page.name || `Page ${index + 1} (${pageTypeLabel})`;
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

