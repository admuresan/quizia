// Canvas renderer module for editor
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    Editor.CanvasRenderer = {
        init: function(getCurrentQuiz, getCurrentPageIndex, getCurrentView, updateCanvasSize, selectElement, autosaveQuiz, renderProperties) {
            this.getCurrentQuiz = getCurrentQuiz;
            this.getCurrentPageIndex = getCurrentPageIndex;
            this.getCurrentView = getCurrentView;
            this.updateCanvasSize = updateCanvasSize;
            this.selectElement = selectElement;
            this.autosaveQuiz = autosaveQuiz;
            this.renderProperties = renderProperties;
        },
        
        renderCanvas: function() {
            const displayableArea = document.getElementById('displayable-area');
            if (!displayableArea) return;
            
            // Preserve scroll position and zoom before clearing
            const scrollArea = document.querySelector('.canvas-scroll-area');
            const displayableAreaWrapper = document.getElementById('displayable-area-wrapper');
            let savedScrollLeft = 0;
            let savedScrollTop = 0;
            let savedZoom = null;
            
            if (scrollArea) {
                savedScrollLeft = scrollArea.scrollLeft;
                savedScrollTop = scrollArea.scrollTop;
            }
            
            // Preserve current zoom from visual state (transform scale)
            if (displayableAreaWrapper) {
                const transform = displayableAreaWrapper.style.transform;
                if (transform && transform.includes('scale(')) {
                    const match = transform.match(/scale\(([\d.]+)\)/);
                    if (match) {
                        savedZoom = parseFloat(match[1]) * 100; // Convert to percentage
                    }
                }
            }
            
            // If no zoom found in transform, get from settings
            if (savedZoom === null) {
                const settings = this.getCurrentViewSettings ? this.getCurrentViewSettings() : null;
                if (settings && settings.zoom) {
                    savedZoom = settings.zoom;
                }
            }
            
            // Clear displayable area content first
            displayableArea.innerHTML = '';
            
            // Ensure displayable area size is set (skip zoom application since we'll restore it later)
            this.updateCanvasSize(true);
            
            const currentQuiz = this.getCurrentQuiz();
            const currentPageIndex = this.getCurrentPageIndex();
            const currentView = this.getCurrentView();
            let page = currentQuiz.pages[currentPageIndex];
            if (!page) return;

            // Ensure page is in new format
            if (Editor.QuizStructure && Editor.QuizStructure.ensurePageNewFormat) {
                page = Editor.QuizStructure.ensurePageNewFormat(page);
                currentQuiz.pages[currentPageIndex] = page;
            }
            
            // Set page background using shared utility function
            if (window.BackgroundUtils && window.BackgroundUtils.applyBackground) {
                window.BackgroundUtils.applyBackground(displayableArea, page, currentQuiz, currentView);
            } else {
                console.error('BackgroundUtils not available');
            }
            
            // Show placeholders for status and results pages
            if (page.page_type === 'status_page' && currentView === 'display') {
                this.renderStatusPagePlaceholder(displayableArea);
                this.renderProperties();
                return;
            }
            
            if (page.page_type === 'result_page' && currentView === 'display') {
                this.renderResultsPagePlaceholder(displayableArea);
                this.renderProperties();
                return;
            }

            // Add participant header if viewing participant view
            if (currentView === 'participant') {
                this.renderParticipantHeader(displayableArea);
            } else {
                displayableArea.style.paddingTop = '0';
            }

            // Get elements for current view
            const elementsToRender = this.getElementsForView(page, currentView);
            
            // Render elements
            elementsToRender.forEach((element, index) => {
                if (Editor.ElementRenderer && Editor.ElementRenderer.renderElementOnCanvas) {
                    const renderedEl = Editor.ElementRenderer.renderElementOnCanvas(displayableArea, element);
                    if (!renderedEl) {
                        console.error('[CanvasRenderer] Failed to render element:', element);
                    }
                } else {
                    console.error('[CanvasRenderer] ElementRenderer not available');
                }
            });
            
            // Add static navigation buttons for control view
            if (currentView === 'control') {
                this.renderControlNavigationButtons(displayableArea);
            } else {
                this.removeControlNavigationButtons();
            }

            // Add global context menu handler for control and participant views as fallback
            // This ensures we catch contextmenu events even if element handlers fail
            if (currentView === 'control' || currentView === 'participant') {
                // Remove any existing handler first
                if (this.globalContextMenuHandler) {
                    displayableArea.removeEventListener('contextmenu', this.globalContextMenuHandler, true);
                }
                
                // Create new handler
                this.globalContextMenuHandler = (e) => {
                    // Find the closest canvas element
                    const target = e.target;
                    const canvasElement = target.closest('.canvas-element');
                    
                    if (!canvasElement) {
                        // Also check for question containers in participant view
                        const questionContainer = target.closest('.question-container');
                        if (questionContainer) {
                            // This is handled by question container handler, don't interfere
                            return;
                        }
                        return; // Not on a canvas element
                    }
                    
                    // Get element ID from the canvas element
                    const elementId = canvasElement.id;
                    if (!elementId || !elementId.startsWith('element-')) {
                        return;
                    }
                    
                    // Extract the actual element ID (remove 'element-' prefix)
                    const actualElementId = elementId.replace('element-', '');
                    
                    // Get the element data from the quiz
                    const page = this.getCurrentQuiz().pages[this.getCurrentPageIndex()];
                    if (!page || !page.elements) return;
                    
                    // Get all elements for current view to find the matching element
                    let elementsArray = [];
                    if (Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
                        elementsArray = Editor.QuizStructure.getViewElements(page, currentView);
                    }
                    
                    const element = elementsArray.find(el => el.id === actualElementId);
                    if (!element) return;
                    
                    // Check if this is an element type that should have context menu
                    const isAnswerDisplay = element.type === 'answer_display';
                    const isAudioControl = element.type === 'audio_control';
                    const isAppearanceControl = element.type === 'appearance_control';
                    const isMainElement = !element.parent_id && 
                        element.type !== 'answer_input' && element.type !== 'answer_display' && element.type !== 'audio_control';
                    
                    // Only handle if it's a valid element type for this view
                    if (currentView === 'control' && (isAnswerDisplay || isAudioControl || isAppearanceControl || isMainElement)) {
                        // Check if clicking on interactive elements
                        if (target !== canvasElement && 
                            (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || 
                            target.tagName === 'LABEL' || target.tagName === 'SELECT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.closest('button') || target.closest('input') || 
                            target.closest('label') || target.closest('select'))) {
                            return; // Let browser handle interactive elements
                        }
                        
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        if (Editor.ContextMenu && Editor.ContextMenu.show) {
                            if (typeof window.showElementContextMenu === 'function') {
                                window.showElementContextMenu(e, element);
                            }
                        }
                    } else if (currentView === 'participant' && isMainElement) {
                        // For participant view, only handle main elements (question containers handle themselves)
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        if (Editor.ContextMenu && Editor.ContextMenu.show) {
                            if (typeof window.showElementContextMenu === 'function') {
                                window.showElementContextMenu(e, element);
                            }
                        }
                    }
                };
                
                // Add handler with capture phase
                displayableArea.addEventListener('contextmenu', this.globalContextMenuHandler, true);
            } else {
                // Remove handler for other views
                if (this.globalContextMenuHandler) {
                    displayableArea.removeEventListener('contextmenu', this.globalContextMenuHandler, true);
                    this.globalContextMenuHandler = null;
                }
            }
            
            // Restore scroll position and zoom after rendering
            if (scrollArea || savedZoom !== null) {
                // Use requestAnimationFrame to ensure DOM has updated
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        // Restore zoom first (if we saved one)
                        if (savedZoom !== null && Editor.ZoomControls && Editor.ZoomControls.applyZoom) {
                            Editor.ZoomControls.applyZoom(savedZoom);
                        }
                        // Then restore scroll position (so it's correct for the zoom level)
                        if (scrollArea) {
                            scrollArea.scrollLeft = savedScrollLeft;
                            scrollArea.scrollTop = savedScrollTop;
                        }
                    });
                });
            }
            
            // Render properties
            this.renderProperties();
        },
        
        renderParticipantHeader: function(displayableArea) {
            const participantHeader = document.createElement('div');
            participantHeader.className = 'editor-participant-header';
            participantHeader.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; background: white; border-bottom: 3px solid #2196F3; padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 1000;';
            
            const avatar = document.createElement('div');
            avatar.style.cssText = 'font-size: 2.5rem; width: 3.5rem; height: 3.5rem; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 50%; border: 2px solid #2196F3;';
            avatar.textContent = '👤';
            participantHeader.appendChild(avatar);
            
            const name = document.createElement('div');
            name.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #333; flex: 1;';
            name.textContent = 'Participant Name';
            participantHeader.appendChild(name);
            
            const points = document.createElement('div');
            points.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #2196F3;';
            points.textContent = 'Points: 0';
            participantHeader.appendChild(points);
            
            displayableArea.appendChild(participantHeader);
            displayableArea.style.paddingTop = '80px';
        },
        
        getElementsForView: function(page, currentView) {
            let elementsToRender = [];
            
            if (Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
                elementsToRender = Editor.QuizStructure.getViewElements(page, currentView);
                
                // For control view, ensure appearance_control_modal exists
                if (currentView === 'control') {
                    const hasAppearanceControl = elementsToRender.some(el => el.type === 'appearance_control');
                    if (!hasAppearanceControl) {
                        // Create appearance_control_modal if it doesn't exist (special case, not a regular element)
                        if (!page.views) {
                            page.views = {};
                        }
                        if (!page.views.control) {
                            page.views.control = {
                                view_config: {
                                    background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } },
                                    size: { width: 1920, height: 1080 }
                                },
                                local_element_configs: {}
                            };
                        }
                        if (!page.views.control.appearance_control_modal) {
                            page.views.control.appearance_control_modal = {
                                x: 50,
                                y: 100,
                                width: 400,
                                height: 300,
                                rotation: 0
                            };
                            // Re-get elements to include the new appearance_control
                            elementsToRender = Editor.QuizStructure.getViewElements(page, currentView);
                            // Trigger autosave
                            if (this.autosaveQuiz) {
                                this.autosaveQuiz();
                            }
                        }
                    }
                }
            } else {
                // Should always use new format with Editor.QuizStructure.getViewElements
                console.error('Editor.QuizStructure.getViewElements not available');
                return [];
            }
            
            return elementsToRender;
        },
        
        getParticipantViewElements: function(page, currentView) {
            // Participant view renders questions with answer inputs
            // Use new format - get elements from Editor.QuizStructure
            const allElements = Editor.QuizStructure && Editor.QuizStructure.getViewElements 
                ? Editor.QuizStructure.getViewElements(page, 'display') 
                : [];
            const questionElements = allElements.filter(el => el.is_question);
            const displayableArea = document.getElementById('displayable-area');
            
            questionElements.forEach(question => {
                const questionContainer = this.createQuestionContainer(question, currentView);
                displayableArea.appendChild(questionContainer);
            });
            
            return []; // Don't render other elements in participant view
        },
        
        createQuestionContainer: function(question, currentView) {
            const questionContainer = document.createElement('div');
            questionContainer.className = 'question-container';
            questionContainer.id = `question-${question.id}`;
            questionContainer.style.cssText = 'position: relative; background: white; padding: 2rem; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); min-width: 300px;';
            
            // Add question title if available
            if (question.question_title && question.question_title.trim()) {
                const title = document.createElement('div');
                title.className = 'question-title';
                title.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #2196F3; margin-bottom: 1rem; margin-top: 0.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3; display: block; width: 100%;';
                title.textContent = question.question_title;
                questionContainer.appendChild(title);
            }
            
            // Find and render the answer_input element
            let answerInput = null;
            const page = this.getCurrentQuiz().pages[this.getCurrentPageIndex()];
            if (Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
                const participantElements = Editor.QuizStructure.getViewElements(page, 'participant');
                answerInput = participantElements.find(el => el.type === 'answer_input' && el.parent_id === question.id);
            } else {
                // Should always use new format
                console.error('Editor.QuizStructure.getViewElements not available');
            }
            
            if (answerInput) {
                const answerEl = Editor.ElementRenderer.renderElementOnCanvas(questionContainer, answerInput, true);
                if (answerEl) {
                    questionContainer.appendChild(answerEl);
                }
            }
            
            // Position the question container
            questionContainer.style.position = 'absolute';
            const headerOffset = currentView === 'participant' ? 80 : 0;
            questionContainer.style.left = `${question.x || 50}px`;
            questionContainer.style.top = `${(question.y || 50) + headerOffset}px`;
            
            // Make draggable
            this.makeQuestionContainerDraggable(questionContainer, question, headerOffset);
            
            // Add click handler to select
            questionContainer.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || 
                    e.target.tagName === 'LABEL' || e.target.closest('button') || 
                    e.target.closest('input') || e.target.closest('label')) {
                    return;
                }
                this.selectElement(question);
            });
            
            // Add right-click context menu
            questionContainer.addEventListener('contextmenu', (e) => {
                // Don't show context menu if clicking on answer_input element or interactive elements
                const target = e.target;
                // Check if clicking on an answer_input element (ID format: element-{parentId}-answer-input)
                const clickedElement = target.closest('[id^="element-"]');
                const isAnswerInput = clickedElement && clickedElement.id.includes('-answer-input');
                
                // If clicking on answer_input, prevent default (answer_input will handle it)
                if (isAnswerInput) {
                    e.preventDefault();
                    e.stopPropagation();
                    return; // Let answer element handle it
                }
                
                // For interactive elements, let browser handle it
                if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || 
                    target.tagName === 'LABEL' || target.tagName === 'SELECT' || 
                    target.tagName === 'TEXTAREA' || target.closest('button') || 
                    target.closest('input') || target.closest('label')) {
                    return; // Let browser handle interactive elements
                }
                
                e.preventDefault();
                e.stopPropagation();
                if (Editor.ContextMenu && Editor.ContextMenu.show) {
                    // Use global function to show context menu (set up in editor.js)
                    if (typeof window.showElementContextMenu === 'function') {
                        window.showElementContextMenu(e, question);
                    }
                }
            }, true); // Use capture phase
            
            return questionContainer;
        },
        
        makeQuestionContainerDraggable: function(container, question, headerOffset) {
            let isDragging = false;
            let startX, startY, startLeft, startTop;
            let dragThreshold = 5;
            let hasMoved = false;
            let clickOffsetX, clickOffsetY;
            
            // Helper to convert viewport coordinates to canvas coordinates
            const getCanvasCoords = (clientX, clientY) => {
                const displayableArea = document.getElementById('displayable-area');
                if (!displayableArea) return { x: clientX, y: clientY };
                
                const settings = this.getCurrentViewSettings ? this.getCurrentViewSettings() : null;
                const zoom = settings ? (settings.zoom || 100) : 100;
                const zoomFactor = zoom / 100;
                const canvasWidth = settings ? (settings.canvas_width || 1920) : 1920;
                const canvasHeight = settings ? (settings.canvas_height || 1080) : 1080;
                
                const areaRect = displayableArea.getBoundingClientRect();
                const mouseXRelativeToArea = clientX - areaRect.left;
                const mouseYRelativeToArea = clientY - areaRect.top;
                
                const visibleCenterX = areaRect.width / 2;
                const visibleCenterY = areaRect.height / 2;
                
                const mouseXFromVisibleCenter = mouseXRelativeToArea - visibleCenterX;
                const mouseYFromVisibleCenter = mouseYRelativeToArea - visibleCenterY;
                
                const canvasXFromCenter = mouseXFromVisibleCenter / zoomFactor;
                const canvasYFromCenter = mouseYFromVisibleCenter / zoomFactor;
                
                const canvasCenterX = canvasWidth / 2;
                const canvasCenterY = canvasHeight / 2;
                
                return {
                    x: canvasCenterX + canvasXFromCenter,
                    y: canvasCenterY + canvasYFromCenter
                };
            };
            
            container.addEventListener('mousedown', (e) => {
                const target = e.target;
                if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'LABEL' || 
                    target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.closest('button') || 
                    target.closest('input') || target.closest('label') || target.closest('select')) {
                    return;
                }
                
                isDragging = true;
                hasMoved = false;
                startX = e.clientX;
                startY = e.clientY;
                startLeft = question.x || 50;
                startTop = question.y || 50;
                
                // Calculate offset from mouse click to container's top-left corner in canvas coordinates
                const clickCanvasCoords = getCanvasCoords(e.clientX, e.clientY);
                clickOffsetX = clickCanvasCoords.x - startLeft;
                clickOffsetY = clickCanvasCoords.y - startTop;
                
                e.preventDefault();
            });
            
            const dragMove = (e) => {
                if (!isDragging) return;
                
                const dx = Math.abs(e.clientX - startX);
                const dy = Math.abs(e.clientY - startY);
                
                if (dx > dragThreshold || dy > dragThreshold) {
                    hasMoved = true;
                }
                
                if (hasMoved) {
                    // Convert current mouse position to canvas coordinates
                    const canvasCoords = getCanvasCoords(e.clientX, e.clientY);
                    
                    // Position container so the clicked point follows the mouse
                    const newX = canvasCoords.x - clickOffsetX;
                    const newY = canvasCoords.y - clickOffsetY;
                    
                    question.x = newX;
                    question.y = newY;
                    
                    container.style.left = `${newX}px`;
                    container.style.top = `${newY + headerOffset}px`;
                }
            };
            
            const dragEnd = () => {
                if (isDragging && hasMoved) {
                    this.autosaveQuiz();
                }
                isDragging = false;
                hasMoved = false;
                document.removeEventListener('mousemove', dragMove);
                document.removeEventListener('mouseup', dragEnd);
            };
            
            document.addEventListener('mousemove', dragMove);
            document.addEventListener('mouseup', dragEnd);
        },
        
        getControlViewElements: function(page) {
            // Use new format - get elements from Editor.QuizStructure
            let elementsToRender = Editor.QuizStructure && Editor.QuizStructure.getViewElements 
                ? Editor.QuizStructure.getViewElements(page, 'control')
                : [];
            
            // Filter out navigation_control if present
            elementsToRender = elementsToRender.filter(el => el.type !== 'navigation_control');
            
            // Ensure appearance_control element exists
            const existingAppearanceControl = elementsToRender.find(el => 
                el.type === 'appearance_control'
            );
            
            if (!existingAppearanceControl) {
                const appearanceControl = Editor.ElementCreator.createAppearanceControlElement(page);
                if (appearanceControl) {
                    if (Editor.QuizStructure && Editor.QuizStructure.setPageElement) {
                        Editor.QuizStructure.setPageElement(page, appearanceControl);
                        // Re-get elements to include the new appearance_control
                        elementsToRender = Editor.QuizStructure.getViewElements(page, 'control');
                        elementsToRender = elementsToRender.filter(el => el.type !== 'navigation_control');
                    } else {
                        console.error('Editor.QuizStructure.setPageElement not available');
                    }
                    this.autosaveQuiz();
                }
            }
            
            return elementsToRender;
        },
        
        renderControlNavigationButtons: function(displayableArea) {
            let prevBtn = document.getElementById('editor-nav-prev-btn');
            let nextBtn = document.getElementById('editor-nav-next-btn');
            let rerenderBtn = document.getElementById('editor-nav-rerender-btn');
            
            if (!prevBtn) {
                prevBtn = document.createElement('button');
                prevBtn.id = 'editor-nav-prev-btn';
                prevBtn.className = 'editor-nav-button editor-nav-button-left';
                prevBtn.textContent = '← Previous';
                prevBtn.style.cssText = 'position: absolute; top: 20px; left: 20px; z-index: 10000; padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; color: white; background: #2196F3; border: 2px solid #1976D2; border-radius: 8px; cursor: default; box-shadow: 0 4px 8px rgba(0,0,0,0.3); pointer-events: none; user-select: none;';
                displayableArea.appendChild(prevBtn);
            }
            
            if (!rerenderBtn) {
                rerenderBtn = document.createElement('button');
                rerenderBtn.id = 'editor-nav-rerender-btn';
                rerenderBtn.className = 'editor-nav-button editor-nav-button-center';
                rerenderBtn.textContent = '↻ Rerender';
                rerenderBtn.style.cssText = 'position: absolute; top: 20px; left: 50%; transform: translateX(-50%); z-index: 10000; padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; color: white; background: #2196F3; border: 2px solid #1976D2; border-radius: 8px; cursor: default; box-shadow: 0 4px 8px rgba(0,0,0,0.3); pointer-events: none; user-select: none;';
                displayableArea.appendChild(rerenderBtn);
            }
            
            if (!nextBtn) {
                nextBtn = document.createElement('button');
                nextBtn.id = 'editor-nav-next-btn';
                nextBtn.className = 'editor-nav-button editor-nav-button-right';
                nextBtn.textContent = 'Next →';
                nextBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; z-index: 10000; padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; color: white; background: #2196F3; border: 2px solid #1976D2; border-radius: 8px; cursor: default; box-shadow: 0 4px 8px rgba(0,0,0,0.3); pointer-events: none; user-select: none;';
                displayableArea.appendChild(nextBtn);
            }
            
            prevBtn.style.display = 'block';
            rerenderBtn.style.display = 'block';
            nextBtn.style.display = 'block';
        },
        
        removeControlNavigationButtons: function() {
            const prevBtn = document.getElementById('editor-nav-prev-btn');
            const nextBtn = document.getElementById('editor-nav-next-btn');
            const rerenderBtn = document.getElementById('editor-nav-rerender-btn');
            if (prevBtn) prevBtn.remove();
            if (rerenderBtn) rerenderBtn.remove();
            if (nextBtn) nextBtn.remove();
            
            const answersMockup = document.getElementById('editor-answers-mockup');
            if (answersMockup) answersMockup.remove();
        },
        
        renderStatusPagePlaceholder: function(canvas) {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 2rem;';
            
            const title = document.createElement('h1');
            title.textContent = 'Current Rankings';
            title.style.cssText = 'font-size: 3rem; margin-bottom: 2rem; text-align: center;';
            placeholder.appendChild(title);
            
            const podium = document.createElement('div');
            podium.style.cssText = 'display: flex; align-items: flex-end; justify-content: center; gap: 2rem; margin: 2rem 0;';
            
            for (let i = 0; i < 3; i++) {
                const place = document.createElement('div');
                place.style.cssText = 'text-align: center;';
                
                const avatar = document.createElement('div');
                avatar.style.cssText = 'width: 100px; height: 100px; border-radius: 50%; border: 4px solid gold; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: rgba(255,255,255,0.2);';
                avatar.textContent = '👤';
                place.appendChild(avatar);
                
                const name = document.createElement('div');
                name.style.cssText = 'font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;';
                name.textContent = `Player ${i + 1}`;
                place.appendChild(name);
                
                const score = document.createElement('div');
                score.style.cssText = 'font-size: 1.2rem;';
                score.textContent = `${(3 - i) * 10} points`;
                place.appendChild(score);
                
                place.style.order = i === 0 ? '2' : i === 1 ? '1' : '3';
                podium.appendChild(place);
            }
            
            placeholder.appendChild(podium);
            
            const rankingsList = document.createElement('div');
            rankingsList.style.cssText = 'width: 100%; max-width: 800px; margin-top: 2rem;';
            
            for (let i = 4; i <= 7; i++) {
                const item = document.createElement('div');
                item.style.cssText = 'display: flex; align-items: center; padding: 1rem; background: rgba(255,255,255,0.1); margin: 0.5rem 0; border-radius: 8px;';
                
                const avatar = document.createElement('div');
                avatar.style.cssText = 'width: 50px; height: 50px; border-radius: 50%; margin-right: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: rgba(255,255,255,0.2);';
                avatar.textContent = '👤';
                item.appendChild(avatar);
                
                const info = document.createElement('div');
                info.style.cssText = 'flex: 1;';
                
                const name = document.createElement('div');
                name.style.cssText = 'font-size: 1.2rem; font-weight: bold;';
                name.textContent = `Player ${i}`;
                info.appendChild(name);
                
                const score = document.createElement('div');
                score.style.cssText = 'font-size: 1rem; opacity: 0.8;';
                score.textContent = `${(8 - i) * 5} points - Rank ${i}`;
                info.appendChild(score);
                
                item.appendChild(info);
                rankingsList.appendChild(item);
            }
            
            placeholder.appendChild(rankingsList);
            
            const note = document.createElement('div');
            note.style.cssText = 'margin-top: 2rem; padding: 1rem; background: rgba(255,255,255,0.2); border-radius: 8px; font-size: 0.9rem; opacity: 0.8;';
            note.textContent = '📊 This is a preview. Actual rankings will show real participant data when the quiz is running.';
            placeholder.appendChild(note);
            
            canvas.appendChild(placeholder);
        },
        
        renderResultsPagePlaceholder: function(displayableArea) {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 2rem;';
            
            const title = document.createElement('h1');
            title.innerHTML = '🎉 Quiz Complete! 🎉';
            title.style.cssText = 'font-size: 3rem; margin-bottom: 2rem; text-align: center;';
            placeholder.appendChild(title);
            
            const winnerSection = document.createElement('div');
            winnerSection.style.cssText = 'text-align: center; margin-bottom: 3rem;';
            
            const winnerEmoji = document.createElement('div');
            winnerEmoji.style.cssText = 'font-size: 8rem; margin-bottom: 1rem;';
            winnerEmoji.textContent = '🏆';
            winnerSection.appendChild(winnerEmoji);
            
            const winnerAvatar = document.createElement('div');
            winnerAvatar.style.cssText = 'width: 150px; height: 150px; border-radius: 50%; border: 6px solid gold; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 5rem; background: rgba(255,255,255,0.2);';
            winnerAvatar.textContent = '👤';
            winnerSection.appendChild(winnerAvatar);
            
            const winnerName = document.createElement('div');
            winnerName.style.cssText = 'font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;';
            winnerName.textContent = 'WINNER NAME';
            winnerSection.appendChild(winnerName);
            
            const winnerTitle = document.createElement('div');
            winnerTitle.style.cssText = 'font-size: 1.8rem;';
            winnerTitle.textContent = '🏆 CHAMPION 🏆';
            winnerSection.appendChild(winnerTitle);
            
            placeholder.appendChild(winnerSection);
            
            const podium = document.createElement('div');
            podium.style.cssText = 'display: flex; align-items: flex-end; justify-content: center; gap: 2rem; margin: 2rem 0;';
            
            for (let i = 0; i < 3; i++) {
                const place = document.createElement('div');
                place.style.cssText = 'text-align: center;';
                
                const avatar = document.createElement('div');
                avatar.style.cssText = 'width: 100px; height: 100px; border-radius: 50%; border: 4px solid gold; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: rgba(255,255,255,0.2);';
                avatar.textContent = '👤';
                place.appendChild(avatar);
                
                const name = document.createElement('div');
                name.style.cssText = 'font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;';
                name.textContent = `Player ${i + 1}`;
                place.appendChild(name);
                
                const score = document.createElement('div');
                score.style.cssText = 'font-size: 1.2rem;';
                score.textContent = `${(3 - i) * 10} points`;
                place.appendChild(score);
                
                place.style.order = i === 0 ? '2' : i === 1 ? '1' : '3';
                podium.appendChild(place);
            }
            
            placeholder.appendChild(podium);
            
            const note = document.createElement('div');
            note.style.cssText = 'margin-top: 2rem; padding: 1rem; background: rgba(255,255,255,0.2); border-radius: 8px; font-size: 0.9rem; opacity: 0.8;';
            note.textContent = '🏅 This is a preview. Final results will show actual winners and rankings when the quiz ends.';
            placeholder.appendChild(note);
            
            displayableArea.appendChild(placeholder);
        }
    };
})();

(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    Editor.CanvasRenderer = {
        init: function(getCurrentQuiz, getCurrentPageIndex, getCurrentView, updateCanvasSize, selectElement, autosaveQuiz, renderProperties) {
            this.getCurrentQuiz = getCurrentQuiz;
            this.getCurrentPageIndex = getCurrentPageIndex;
            this.getCurrentView = getCurrentView;
            this.updateCanvasSize = updateCanvasSize;
            this.selectElement = selectElement;
            this.autosaveQuiz = autosaveQuiz;
            this.renderProperties = renderProperties;
        },
        
        renderCanvas: function() {
            const displayableArea = document.getElementById('displayable-area');
            if (!displayableArea) return;
            
            // Preserve scroll position and zoom before clearing
            const scrollArea = document.querySelector('.canvas-scroll-area');
            const displayableAreaWrapper = document.getElementById('displayable-area-wrapper');
            let savedScrollLeft = 0;
            let savedScrollTop = 0;
            let savedZoom = null;
            
            if (scrollArea) {
                savedScrollLeft = scrollArea.scrollLeft;
                savedScrollTop = scrollArea.scrollTop;
            }
            
            // Preserve current zoom from visual state (transform scale)
            if (displayableAreaWrapper) {
                const transform = displayableAreaWrapper.style.transform;
                if (transform && transform.includes('scale(')) {
                    const match = transform.match(/scale\(([\d.]+)\)/);
                    if (match) {
                        savedZoom = parseFloat(match[1]) * 100; // Convert to percentage
                    }
                }
            }
            
            // If no zoom found in transform, get from settings
            if (savedZoom === null) {
                const settings = this.getCurrentViewSettings ? this.getCurrentViewSettings() : null;
                if (settings && settings.zoom) {
                    savedZoom = settings.zoom;
                }
            }
            
            // Clear displayable area content first
            displayableArea.innerHTML = '';
            
            // Ensure displayable area size is set (skip zoom application since we'll restore it later)
            this.updateCanvasSize(true);
            
            const currentQuiz = this.getCurrentQuiz();
            const currentPageIndex = this.getCurrentPageIndex();
            const currentView = this.getCurrentView();
            let page = currentQuiz.pages[currentPageIndex];
            if (!page) return;

            // Ensure page is in new format
            if (Editor.QuizStructure && Editor.QuizStructure.ensurePageNewFormat) {
                page = Editor.QuizStructure.ensurePageNewFormat(page);
                currentQuiz.pages[currentPageIndex] = page;
            }
            
            // Set page background using shared utility function
            if (window.BackgroundUtils && window.BackgroundUtils.applyBackground) {
                window.BackgroundUtils.applyBackground(displayableArea, page, currentQuiz, currentView);
            } else {
                console.error('BackgroundUtils not available');
            }
            
            // Show placeholders for status and results pages
            if (page.page_type === 'status_page' && currentView === 'display') {
                this.renderStatusPagePlaceholder(displayableArea);
                this.renderProperties();
                return;
            }
            
            if (page.page_type === 'result_page' && currentView === 'display') {
                this.renderResultsPagePlaceholder(displayableArea);
                this.renderProperties();
                return;
            }

            // Add participant header if viewing participant view
            if (currentView === 'participant') {
                this.renderParticipantHeader(displayableArea);
            } else {
                displayableArea.style.paddingTop = '0';
            }

            // Get elements for current view
            const elementsToRender = this.getElementsForView(page, currentView);
            
            // Render elements
            elementsToRender.forEach((element, index) => {
                if (Editor.ElementRenderer && Editor.ElementRenderer.renderElementOnCanvas) {
                    const renderedEl = Editor.ElementRenderer.renderElementOnCanvas(displayableArea, element);
                    if (!renderedEl) {
                        console.error('[CanvasRenderer] Failed to render element:', element);
                    }
                } else {
                    console.error('[CanvasRenderer] ElementRenderer not available');
                }
            });
            
            // Add static navigation buttons for control view
            if (currentView === 'control') {
                this.renderControlNavigationButtons(displayableArea);
            } else {
                this.removeControlNavigationButtons();
            }

            // Add global context menu handler for control and participant views as fallback
            // This ensures we catch contextmenu events even if element handlers fail
            if (currentView === 'control' || currentView === 'participant') {
                // Remove any existing handler first
                if (this.globalContextMenuHandler) {
                    displayableArea.removeEventListener('contextmenu', this.globalContextMenuHandler, true);
                }
                
                // Create new handler
                this.globalContextMenuHandler = (e) => {
                    // Find the closest canvas element
                    const target = e.target;
                    const canvasElement = target.closest('.canvas-element');
                    
                    if (!canvasElement) {
                        // Also check for question containers in participant view
                        const questionContainer = target.closest('.question-container');
                        if (questionContainer) {
                            // This is handled by question container handler, don't interfere
                            return;
                        }
                        return; // Not on a canvas element
                    }
                    
                    // Get element ID from the canvas element
                    const elementId = canvasElement.id;
                    if (!elementId || !elementId.startsWith('element-')) {
                        return;
                    }
                    
                    // Extract the actual element ID (remove 'element-' prefix)
                    const actualElementId = elementId.replace('element-', '');
                    
                    // Get the element data from the quiz
                    const page = this.getCurrentQuiz().pages[this.getCurrentPageIndex()];
                    if (!page || !page.elements) return;
                    
                    // Get all elements for current view to find the matching element
                    let elementsArray = [];
                    if (Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
                        elementsArray = Editor.QuizStructure.getViewElements(page, currentView);
                    }
                    
                    const element = elementsArray.find(el => el.id === actualElementId);
                    if (!element) return;
                    
                    // Check if this is an element type that should have context menu
                    const isAnswerDisplay = element.type === 'answer_display';
                    const isAudioControl = element.type === 'audio_control';
                    const isAppearanceControl = element.type === 'appearance_control';
                    const isMainElement = !element.parent_id && 
                        element.type !== 'answer_input' && element.type !== 'answer_display' && element.type !== 'audio_control';
                    
                    // Only handle if it's a valid element type for this view
                    if (currentView === 'control' && (isAnswerDisplay || isAudioControl || isAppearanceControl || isMainElement)) {
                        // Check if clicking on interactive elements
                        if (target !== canvasElement && 
                            (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || 
                            target.tagName === 'LABEL' || target.tagName === 'SELECT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.closest('button') || target.closest('input') || 
                            target.closest('label') || target.closest('select'))) {
                            return; // Let browser handle interactive elements
                        }
                        
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        if (Editor.ContextMenu && Editor.ContextMenu.show) {
                            if (typeof window.showElementContextMenu === 'function') {
                                window.showElementContextMenu(e, element);
                            }
                        }
                    } else if (currentView === 'participant' && isMainElement) {
                        // For participant view, only handle main elements (question containers handle themselves)
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        if (Editor.ContextMenu && Editor.ContextMenu.show) {
                            if (typeof window.showElementContextMenu === 'function') {
                                window.showElementContextMenu(e, element);
                            }
                        }
                    }
                };
                
                // Add handler with capture phase
                displayableArea.addEventListener('contextmenu', this.globalContextMenuHandler, true);
            } else {
                // Remove handler for other views
                if (this.globalContextMenuHandler) {
                    displayableArea.removeEventListener('contextmenu', this.globalContextMenuHandler, true);
                    this.globalContextMenuHandler = null;
                }
            }
            
            // Restore scroll position and zoom after rendering
            if (scrollArea || savedZoom !== null) {
                // Use requestAnimationFrame to ensure DOM has updated
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        // Restore zoom first (if we saved one)
                        if (savedZoom !== null && Editor.ZoomControls && Editor.ZoomControls.applyZoom) {
                            Editor.ZoomControls.applyZoom(savedZoom);
                        }
                        // Then restore scroll position (so it's correct for the zoom level)
                        if (scrollArea) {
                            scrollArea.scrollLeft = savedScrollLeft;
                            scrollArea.scrollTop = savedScrollTop;
                        }
                    });
                });
            }
            
            // Render properties
            this.renderProperties();
        },
        
        renderParticipantHeader: function(displayableArea) {
            const participantHeader = document.createElement('div');
            participantHeader.className = 'editor-participant-header';
            participantHeader.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; background: white; border-bottom: 3px solid #2196F3; padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 1000;';
            
            const avatar = document.createElement('div');
            avatar.style.cssText = 'font-size: 2.5rem; width: 3.5rem; height: 3.5rem; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 50%; border: 2px solid #2196F3;';
            avatar.textContent = '👤';
            participantHeader.appendChild(avatar);
            
            const name = document.createElement('div');
            name.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #333; flex: 1;';
            name.textContent = 'Participant Name';
            participantHeader.appendChild(name);
            
            const points = document.createElement('div');
            points.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #2196F3;';
            points.textContent = 'Points: 0';
            participantHeader.appendChild(points);
            
            displayableArea.appendChild(participantHeader);
            displayableArea.style.paddingTop = '80px';
        },
        
        getElementsForView: function(page, currentView) {
            let elementsToRender = [];
            
            if (Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
                elementsToRender = Editor.QuizStructure.getViewElements(page, currentView);
                
                // For control view, ensure appearance_control_modal exists
                if (currentView === 'control') {
                    const hasAppearanceControl = elementsToRender.some(el => el.type === 'appearance_control');
                    if (!hasAppearanceControl) {
                        // Create appearance_control_modal if it doesn't exist (special case, not a regular element)
                        if (!page.views) {
                            page.views = {};
                        }
                        if (!page.views.control) {
                            page.views.control = {
                                view_config: {
                                    background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } },
                                    size: { width: 1920, height: 1080 }
                                },
                                local_element_configs: {}
                            };
                        }
                        if (!page.views.control.appearance_control_modal) {
                            page.views.control.appearance_control_modal = {
                                x: 50,
                                y: 100,
                                width: 400,
                                height: 300,
                                rotation: 0
                            };
                            // Re-get elements to include the new appearance_control
                            elementsToRender = Editor.QuizStructure.getViewElements(page, currentView);
                            // Trigger autosave
                            if (this.autosaveQuiz) {
                                this.autosaveQuiz();
                            }
                        }
                    }
                }
            } else {
                // Should always use new format with Editor.QuizStructure.getViewElements
                console.error('Editor.QuizStructure.getViewElements not available');
                return [];
            }
            
            return elementsToRender;
        },
        
        getParticipantViewElements: function(page, currentView) {
            // Participant view renders questions with answer inputs
            // Use new format - get elements from Editor.QuizStructure
            const allElements = Editor.QuizStructure && Editor.QuizStructure.getViewElements 
                ? Editor.QuizStructure.getViewElements(page, 'display') 
                : [];
            const questionElements = allElements.filter(el => el.is_question);
            const displayableArea = document.getElementById('displayable-area');
            
            questionElements.forEach(question => {
                const questionContainer = this.createQuestionContainer(question, currentView);
                displayableArea.appendChild(questionContainer);
            });
            
            return []; // Don't render other elements in participant view
        },
        
        createQuestionContainer: function(question, currentView) {
            const questionContainer = document.createElement('div');
            questionContainer.className = 'question-container';
            questionContainer.id = `question-${question.id}`;
            questionContainer.style.cssText = 'position: relative; background: white; padding: 2rem; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); min-width: 300px;';
            
            // Add question title if available
            if (question.question_title && question.question_title.trim()) {
                const title = document.createElement('div');
                title.className = 'question-title';
                title.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #2196F3; margin-bottom: 1rem; margin-top: 0.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2196F3; display: block; width: 100%;';
                title.textContent = question.question_title;
                questionContainer.appendChild(title);
            }
            
            // Find and render the answer_input element
            let answerInput = null;
            const page = this.getCurrentQuiz().pages[this.getCurrentPageIndex()];
            if (Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
                const participantElements = Editor.QuizStructure.getViewElements(page, 'participant');
                answerInput = participantElements.find(el => el.type === 'answer_input' && el.parent_id === question.id);
            } else {
                // Should always use new format
                console.error('Editor.QuizStructure.getViewElements not available');
            }
            
            if (answerInput) {
                const answerEl = Editor.ElementRenderer.renderElementOnCanvas(questionContainer, answerInput, true);
                if (answerEl) {
                    questionContainer.appendChild(answerEl);
                }
            }
            
            // Position the question container
            questionContainer.style.position = 'absolute';
            const headerOffset = currentView === 'participant' ? 80 : 0;
            questionContainer.style.left = `${question.x || 50}px`;
            questionContainer.style.top = `${(question.y || 50) + headerOffset}px`;
            
            // Make draggable
            this.makeQuestionContainerDraggable(questionContainer, question, headerOffset);
            
            // Add click handler to select
            questionContainer.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || 
                    e.target.tagName === 'LABEL' || e.target.closest('button') || 
                    e.target.closest('input') || e.target.closest('label')) {
                    return;
                }
                this.selectElement(question);
            });
            
            // Add right-click context menu
            questionContainer.addEventListener('contextmenu', (e) => {
                // Don't show context menu if clicking on answer_input element or interactive elements
                const target = e.target;
                // Check if clicking on an answer_input element (ID format: element-{parentId}-answer-input)
                const clickedElement = target.closest('[id^="element-"]');
                const isAnswerInput = clickedElement && clickedElement.id.includes('-answer-input');
                
                // If clicking on answer_input, prevent default (answer_input will handle it)
                if (isAnswerInput) {
                    e.preventDefault();
                    e.stopPropagation();
                    return; // Let answer element handle it
                }
                
                // For interactive elements, let browser handle it
                if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || 
                    target.tagName === 'LABEL' || target.tagName === 'SELECT' || 
                    target.tagName === 'TEXTAREA' || target.closest('button') || 
                    target.closest('input') || target.closest('label')) {
                    return; // Let browser handle interactive elements
                }
                
                e.preventDefault();
                e.stopPropagation();
                if (Editor.ContextMenu && Editor.ContextMenu.show) {
                    // Use global function to show context menu (set up in editor.js)
                    if (typeof window.showElementContextMenu === 'function') {
                        window.showElementContextMenu(e, question);
                    }
                }
            }, true); // Use capture phase
            
            return questionContainer;
        },
        
        makeQuestionContainerDraggable: function(container, question, headerOffset) {
            let isDragging = false;
            let startX, startY, startLeft, startTop;
            let dragThreshold = 5;
            let hasMoved = false;
            let clickOffsetX, clickOffsetY;
            
            // Helper to convert viewport coordinates to canvas coordinates
            const getCanvasCoords = (clientX, clientY) => {
                const displayableArea = document.getElementById('displayable-area');
                if (!displayableArea) return { x: clientX, y: clientY };
                
                const settings = this.getCurrentViewSettings ? this.getCurrentViewSettings() : null;
                const zoom = settings ? (settings.zoom || 100) : 100;
                const zoomFactor = zoom / 100;
                const canvasWidth = settings ? (settings.canvas_width || 1920) : 1920;
                const canvasHeight = settings ? (settings.canvas_height || 1080) : 1080;
                
                const areaRect = displayableArea.getBoundingClientRect();
                const mouseXRelativeToArea = clientX - areaRect.left;
                const mouseYRelativeToArea = clientY - areaRect.top;
                
                const visibleCenterX = areaRect.width / 2;
                const visibleCenterY = areaRect.height / 2;
                
                const mouseXFromVisibleCenter = mouseXRelativeToArea - visibleCenterX;
                const mouseYFromVisibleCenter = mouseYRelativeToArea - visibleCenterY;
                
                const canvasXFromCenter = mouseXFromVisibleCenter / zoomFactor;
                const canvasYFromCenter = mouseYFromVisibleCenter / zoomFactor;
                
                const canvasCenterX = canvasWidth / 2;
                const canvasCenterY = canvasHeight / 2;
                
                return {
                    x: canvasCenterX + canvasXFromCenter,
                    y: canvasCenterY + canvasYFromCenter
                };
            };
            
            container.addEventListener('mousedown', (e) => {
                const target = e.target;
                if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'LABEL' || 
                    target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.closest('button') || 
                    target.closest('input') || target.closest('label') || target.closest('select')) {
                    return;
                }
                
                isDragging = true;
                hasMoved = false;
                startX = e.clientX;
                startY = e.clientY;
                startLeft = question.x || 50;
                startTop = question.y || 50;
                
                // Calculate offset from mouse click to container's top-left corner in canvas coordinates
                const clickCanvasCoords = getCanvasCoords(e.clientX, e.clientY);
                clickOffsetX = clickCanvasCoords.x - startLeft;
                clickOffsetY = clickCanvasCoords.y - startTop;
                
                e.preventDefault();
            });
            
            const dragMove = (e) => {
                if (!isDragging) return;
                
                const dx = Math.abs(e.clientX - startX);
                const dy = Math.abs(e.clientY - startY);
                
                if (dx > dragThreshold || dy > dragThreshold) {
                    hasMoved = true;
                }
                
                if (hasMoved) {
                    // Convert current mouse position to canvas coordinates
                    const canvasCoords = getCanvasCoords(e.clientX, e.clientY);
                    
                    // Position container so the clicked point follows the mouse
                    const newX = canvasCoords.x - clickOffsetX;
                    const newY = canvasCoords.y - clickOffsetY;
                    
                    question.x = newX;
                    question.y = newY;
                    
                    container.style.left = `${newX}px`;
                    container.style.top = `${newY + headerOffset}px`;
                }
            };
            
            const dragEnd = () => {
                if (isDragging && hasMoved) {
                    this.autosaveQuiz();
                }
                isDragging = false;
                hasMoved = false;
                document.removeEventListener('mousemove', dragMove);
                document.removeEventListener('mouseup', dragEnd);
            };
            
            document.addEventListener('mousemove', dragMove);
            document.addEventListener('mouseup', dragEnd);
        },
        
        getControlViewElements: function(page) {
            // Use new format - get elements from Editor.QuizStructure
            let elementsToRender = Editor.QuizStructure && Editor.QuizStructure.getViewElements 
                ? Editor.QuizStructure.getViewElements(page, 'control')
                : [];
            
            // Filter out navigation_control if present
            elementsToRender = elementsToRender.filter(el => el.type !== 'navigation_control');
            
            // Ensure appearance_control element exists
            const existingAppearanceControl = elementsToRender.find(el => 
                el.type === 'appearance_control'
            );
            
            if (!existingAppearanceControl) {
                const appearanceControl = Editor.ElementCreator.createAppearanceControlElement(page);
                if (appearanceControl) {
                    if (Editor.QuizStructure && Editor.QuizStructure.setPageElement) {
                        Editor.QuizStructure.setPageElement(page, appearanceControl);
                        // Re-get elements to include the new appearance_control
                        elementsToRender = Editor.QuizStructure.getViewElements(page, 'control');
                        elementsToRender = elementsToRender.filter(el => el.type !== 'navigation_control');
                    } else {
                        console.error('Editor.QuizStructure.setPageElement not available');
                    }
                    this.autosaveQuiz();
                }
            }
            
            return elementsToRender;
        },
        
        renderControlNavigationButtons: function(displayableArea) {
            let prevBtn = document.getElementById('editor-nav-prev-btn');
            let nextBtn = document.getElementById('editor-nav-next-btn');
            let rerenderBtn = document.getElementById('editor-nav-rerender-btn');
            
            if (!prevBtn) {
                prevBtn = document.createElement('button');
                prevBtn.id = 'editor-nav-prev-btn';
                prevBtn.className = 'editor-nav-button editor-nav-button-left';
                prevBtn.textContent = '← Previous';
                prevBtn.style.cssText = 'position: absolute; top: 20px; left: 20px; z-index: 10000; padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; color: white; background: #2196F3; border: 2px solid #1976D2; border-radius: 8px; cursor: default; box-shadow: 0 4px 8px rgba(0,0,0,0.3); pointer-events: none; user-select: none;';
                displayableArea.appendChild(prevBtn);
            }
            
            if (!rerenderBtn) {
                rerenderBtn = document.createElement('button');
                rerenderBtn.id = 'editor-nav-rerender-btn';
                rerenderBtn.className = 'editor-nav-button editor-nav-button-center';
                rerenderBtn.textContent = '↻ Rerender';
                rerenderBtn.style.cssText = 'position: absolute; top: 20px; left: 50%; transform: translateX(-50%); z-index: 10000; padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; color: white; background: #2196F3; border: 2px solid #1976D2; border-radius: 8px; cursor: default; box-shadow: 0 4px 8px rgba(0,0,0,0.3); pointer-events: none; user-select: none;';
                displayableArea.appendChild(rerenderBtn);
            }
            
            if (!nextBtn) {
                nextBtn = document.createElement('button');
                nextBtn.id = 'editor-nav-next-btn';
                nextBtn.className = 'editor-nav-button editor-nav-button-right';
                nextBtn.textContent = 'Next →';
                nextBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; z-index: 10000; padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; color: white; background: #2196F3; border: 2px solid #1976D2; border-radius: 8px; cursor: default; box-shadow: 0 4px 8px rgba(0,0,0,0.3); pointer-events: none; user-select: none;';
                displayableArea.appendChild(nextBtn);
            }
            
            prevBtn.style.display = 'block';
            rerenderBtn.style.display = 'block';
            nextBtn.style.display = 'block';
        },
        
        removeControlNavigationButtons: function() {
            const prevBtn = document.getElementById('editor-nav-prev-btn');
            const nextBtn = document.getElementById('editor-nav-next-btn');
            const rerenderBtn = document.getElementById('editor-nav-rerender-btn');
            if (prevBtn) prevBtn.remove();
            if (rerenderBtn) rerenderBtn.remove();
            if (nextBtn) nextBtn.remove();
            
            const answersMockup = document.getElementById('editor-answers-mockup');
            if (answersMockup) answersMockup.remove();
        },
        
        renderStatusPagePlaceholder: function(canvas) {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 2rem;';
            
            const title = document.createElement('h1');
            title.textContent = 'Current Rankings';
            title.style.cssText = 'font-size: 3rem; margin-bottom: 2rem; text-align: center;';
            placeholder.appendChild(title);
            
            const podium = document.createElement('div');
            podium.style.cssText = 'display: flex; align-items: flex-end; justify-content: center; gap: 2rem; margin: 2rem 0;';
            
            for (let i = 0; i < 3; i++) {
                const place = document.createElement('div');
                place.style.cssText = 'text-align: center;';
                
                const avatar = document.createElement('div');
                avatar.style.cssText = 'width: 100px; height: 100px; border-radius: 50%; border: 4px solid gold; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: rgba(255,255,255,0.2);';
                avatar.textContent = '👤';
                place.appendChild(avatar);
                
                const name = document.createElement('div');
                name.style.cssText = 'font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;';
                name.textContent = `Player ${i + 1}`;
                place.appendChild(name);
                
                const score = document.createElement('div');
                score.style.cssText = 'font-size: 1.2rem;';
                score.textContent = `${(3 - i) * 10} points`;
                place.appendChild(score);
                
                place.style.order = i === 0 ? '2' : i === 1 ? '1' : '3';
                podium.appendChild(place);
            }
            
            placeholder.appendChild(podium);
            
            const rankingsList = document.createElement('div');
            rankingsList.style.cssText = 'width: 100%; max-width: 800px; margin-top: 2rem;';
            
            for (let i = 4; i <= 7; i++) {
                const item = document.createElement('div');
                item.style.cssText = 'display: flex; align-items: center; padding: 1rem; background: rgba(255,255,255,0.1); margin: 0.5rem 0; border-radius: 8px;';
                
                const avatar = document.createElement('div');
                avatar.style.cssText = 'width: 50px; height: 50px; border-radius: 50%; margin-right: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: rgba(255,255,255,0.2);';
                avatar.textContent = '👤';
                item.appendChild(avatar);
                
                const info = document.createElement('div');
                info.style.cssText = 'flex: 1;';
                
                const name = document.createElement('div');
                name.style.cssText = 'font-size: 1.2rem; font-weight: bold;';
                name.textContent = `Player ${i}`;
                info.appendChild(name);
                
                const score = document.createElement('div');
                score.style.cssText = 'font-size: 1rem; opacity: 0.8;';
                score.textContent = `${(8 - i) * 5} points - Rank ${i}`;
                info.appendChild(score);
                
                item.appendChild(info);
                rankingsList.appendChild(item);
            }
            
            placeholder.appendChild(rankingsList);
            
            const note = document.createElement('div');
            note.style.cssText = 'margin-top: 2rem; padding: 1rem; background: rgba(255,255,255,0.2); border-radius: 8px; font-size: 0.9rem; opacity: 0.8;';
            note.textContent = '📊 This is a preview. Actual rankings will show real participant data when the quiz is running.';
            placeholder.appendChild(note);
            
            canvas.appendChild(placeholder);
        },
        
        renderResultsPagePlaceholder: function(displayableArea) {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 2rem;';
            
            const title = document.createElement('h1');
            title.innerHTML = '🎉 Quiz Complete! 🎉';
            title.style.cssText = 'font-size: 3rem; margin-bottom: 2rem; text-align: center;';
            placeholder.appendChild(title);
            
            const winnerSection = document.createElement('div');
            winnerSection.style.cssText = 'text-align: center; margin-bottom: 3rem;';
            
            const winnerEmoji = document.createElement('div');
            winnerEmoji.style.cssText = 'font-size: 8rem; margin-bottom: 1rem;';
            winnerEmoji.textContent = '🏆';
            winnerSection.appendChild(winnerEmoji);
            
            const winnerAvatar = document.createElement('div');
            winnerAvatar.style.cssText = 'width: 150px; height: 150px; border-radius: 50%; border: 6px solid gold; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 5rem; background: rgba(255,255,255,0.2);';
            winnerAvatar.textContent = '👤';
            winnerSection.appendChild(winnerAvatar);
            
            const winnerName = document.createElement('div');
            winnerName.style.cssText = 'font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;';
            winnerName.textContent = 'WINNER NAME';
            winnerSection.appendChild(winnerName);
            
            const winnerTitle = document.createElement('div');
            winnerTitle.style.cssText = 'font-size: 1.8rem;';
            winnerTitle.textContent = '🏆 CHAMPION 🏆';
            winnerSection.appendChild(winnerTitle);
            
            placeholder.appendChild(winnerSection);
            
            const podium = document.createElement('div');
            podium.style.cssText = 'display: flex; align-items: flex-end; justify-content: center; gap: 2rem; margin: 2rem 0;';
            
            for (let i = 0; i < 3; i++) {
                const place = document.createElement('div');
                place.style.cssText = 'text-align: center;';
                
                const avatar = document.createElement('div');
                avatar.style.cssText = 'width: 100px; height: 100px; border-radius: 50%; border: 4px solid gold; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: rgba(255,255,255,0.2);';
                avatar.textContent = '👤';
                place.appendChild(avatar);
                
                const name = document.createElement('div');
                name.style.cssText = 'font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;';
                name.textContent = `Player ${i + 1}`;
                place.appendChild(name);
                
                const score = document.createElement('div');
                score.style.cssText = 'font-size: 1.2rem;';
                score.textContent = `${(3 - i) * 10} points`;
                place.appendChild(score);
                
                place.style.order = i === 0 ? '2' : i === 1 ? '1' : '3';
                podium.appendChild(place);
            }
            
            placeholder.appendChild(podium);
            
            const note = document.createElement('div');
            note.style.cssText = 'margin-top: 2rem; padding: 1rem; background: rgba(255,255,255,0.2); border-radius: 8px; font-size: 0.9rem; opacity: 0.8;';
            note.textContent = '🏅 This is a preview. Final results will show actual winners and rankings when the quiz ends.';
            placeholder.appendChild(note);
            
            displayableArea.appendChild(placeholder);
        }
    };
})();


