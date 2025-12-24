// Quiz editor - Main file that coordinates editor modules
let currentQuiz = {
    name: '',
    pages: [],
    background_color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    background_image: null,
    view_settings: {
        display: { canvas_width: 1920, canvas_height: 1080, zoom: 100 },
        participant: { canvas_width: 1920, canvas_height: 1080, zoom: 100 },
        control: { canvas_width: 1920, canvas_height: 1080, zoom: 100 }
    }
};
let currentPageIndex = 0;
let selectedElement = null;
let currentView = 'display'; // 'display', 'participant', or 'control'

// Helper functions to get/set view-specific settings
function getViewSettings(view) {
    if (!currentQuiz.view_settings) {
        currentQuiz.view_settings = {
            display: { canvas_width: 1920, canvas_height: 1080, zoom: 100 },
            participant: { canvas_width: 1920, canvas_height: 1080, zoom: 100 },
            control: { canvas_width: 1920, canvas_height: 1080, zoom: 100 }
        };
    }
    if (!currentQuiz.view_settings[view]) {
        currentQuiz.view_settings[view] = { canvas_width: 1920, canvas_height: 1080, zoom: 100 };
    }
    return currentQuiz.view_settings[view];
}

function getCurrentViewSettings() {
    return getViewSettings(currentView);
}

// Helper functions that bridge to modules
function debounce(func, wait) {
    return Editor.Utils.debounce(func, wait);
}

async function autosaveQuiz() {
    const name = document.getElementById('quiz-name').value.trim();
    await Editor.QuizStorage.autosaveQuiz(currentQuiz, name);
}

async function loadQuiz(quizId) {
    const quiz = await Editor.QuizStorage.loadQuiz(quizId);
    if (quiz) {
        currentQuiz = quiz;
        // Ensure ID is set
        if (!currentQuiz.id) {
            currentQuiz.id = quizId;
        }
        // Migrate old format to new format if needed
        if (currentQuiz.canvas_width && !currentQuiz.view_settings) {
            currentQuiz.view_settings = {
                display: { 
                    canvas_width: currentQuiz.canvas_width || 1920, 
                    canvas_height: currentQuiz.canvas_height || 1080, 
                    zoom: 100 
                },
                participant: { 
                    canvas_width: currentQuiz.canvas_width || 1920, 
                    canvas_height: currentQuiz.canvas_height || 1080, 
                    zoom: 100 
                },
                control: { 
                    canvas_width: currentQuiz.canvas_width || 1920, 
                    canvas_height: currentQuiz.canvas_height || 1080, 
                    zoom: 100 
                }
            };
            delete currentQuiz.canvas_width;
            delete currentQuiz.canvas_height;
        }
        // Ensure view settings exist
        getViewSettings('display');
        getViewSettings('participant');
        getViewSettings('control');
        document.getElementById('quiz-name').value = currentQuiz.name;
        currentPageIndex = 0;
        updateCanvasSize();
        updateScreenSizeControls();
        renderPages();
        renderCanvas();
    }
}

function updateCanvasSize() {
    const settings = getCurrentViewSettings();
    const displayableArea = document.getElementById('displayable-area');
    const displayableAreaWrapper = document.getElementById('displayable-area-wrapper');
    
    if (displayableArea && displayableAreaWrapper && settings.canvas_width && settings.canvas_height) {
        // Set wrapper to exact dimensions (defines the displayable area size)
        displayableAreaWrapper.style.width = `${settings.canvas_width}px`;
        displayableAreaWrapper.style.height = `${settings.canvas_height}px`;
        
        // Set displayable area to match wrapper exactly - use same dimensions
        // so resize handles align properly with the edges
        displayableArea.style.width = `${settings.canvas_width}px`;
        displayableArea.style.height = `${settings.canvas_height}px`;
        displayableArea.style.minWidth = `${settings.canvas_width}px`;
        displayableArea.style.minHeight = `${settings.canvas_height}px`;
        displayableArea.style.maxWidth = `${settings.canvas_width}px`;
        displayableArea.style.maxHeight = `${settings.canvas_height}px`;
        displayableArea.style.display = 'block';
        displayableArea.style.position = 'relative';
        displayableArea.style.boxSizing = 'border-box';
        // Background is set via CSS, no need to set inline styles
    }
    // Apply zoom after setting size
    applyZoom(settings.zoom);
}

function applyZoom(zoomPercent) {
    const settings = getCurrentViewSettings();
    settings.zoom = Math.max(25, Math.min(200, zoomPercent)); // Clamp between 25% and 200%
    const displayableArea = document.getElementById('displayable-area');
    const displayableAreaWrapper = document.getElementById('displayable-area-wrapper');
    
    if (displayableArea && displayableAreaWrapper) {
        // Apply zoom using transform scale
        displayableAreaWrapper.style.transform = `scale(${settings.zoom / 100})`;
        displayableAreaWrapper.style.transformOrigin = 'center center';
        
        // Wrapper size is already set in updateCanvasSize - just ensure it's maintained
        // The wrapper needs to be the actual displayable area size so scaling works correctly
        if (settings.canvas_width && settings.canvas_height) {
            displayableAreaWrapper.style.width = `${settings.canvas_width}px`;
            displayableAreaWrapper.style.height = `${settings.canvas_height}px`;
        }
        
        // Update zoom level display
        const zoomLevelEl = document.getElementById('zoom-level');
        if (zoomLevelEl) {
            zoomLevelEl.textContent = `${Math.round(settings.zoom)}%`;
        }
        
        // Update slider
        const zoomSlider = document.getElementById('zoom-slider');
        if (zoomSlider) {
            zoomSlider.value = Math.round(settings.zoom);
        }
    }
    autosaveQuiz();
}

function zoomIn() {
    const settings = getCurrentViewSettings();
    applyZoom(settings.zoom + 10);
}

function zoomOut() {
    const settings = getCurrentViewSettings();
    applyZoom(settings.zoom - 10);
}

function zoomFit() {
    const settings = getCurrentViewSettings();
    const scrollArea = document.querySelector('.canvas-scroll-area');
    const displayableArea = document.getElementById('displayable-area');
    
    if (scrollArea && displayableArea && settings.canvas_width && settings.canvas_height) {
        const scrollRect = scrollArea.getBoundingClientRect();
        const scrollWidth = scrollRect.width;
        const scrollHeight = scrollRect.height;
        
        const widthRatio = scrollWidth / settings.canvas_width;
        const heightRatio = scrollHeight / settings.canvas_height;
        const fitZoom = Math.min(widthRatio, heightRatio) * 100;
        
        applyZoom(Math.max(25, Math.min(200, fitZoom * 0.95))); // 95% to add some padding
    }
}

function zoomReset() {
    applyZoom(100);
}

function updateScreenSizeControls() {
    const settings = getCurrentViewSettings();
    const width = settings.canvas_width || 1920;
    const height = settings.canvas_height || 1080;
    
    // Update view indicators
    const viewNames = {
        display: 'Display',
        participant: 'Participant',
        control: 'Control'
    };
    const viewIndicator = document.getElementById('view-indicator');
    if (viewIndicator) {
        viewIndicator.textContent = `(${viewNames[currentView]})`;
    }
    const zoomViewIndicator = document.getElementById('zoom-view-indicator');
    if (zoomViewIndicator) {
        zoomViewIndicator.textContent = `(${viewNames[currentView]})`;
    }
    
    // Determine which preset is active
    let activePreset = 'custom';
    if (width === 1920 && height === 1080) {
        activePreset = 'desktop';
    } else if (width === 390 && height === 844) {
        activePreset = 'mobile-portrait';
    } else if (width === 844 && height === 390) {
        activePreset = 'mobile-landscape';
    }
    
    // Update preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`preset-${activePreset}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Show/hide custom inputs
    const customInputs = document.getElementById('custom-size-inputs');
    if (activePreset === 'custom') {
        customInputs.style.display = 'block';
        document.getElementById('canvas-width').value = width;
        document.getElementById('canvas-height').value = height;
    } else {
        customInputs.style.display = 'none';
    }
}

function applyCanvasSize(width, height) {
    const settings = getCurrentViewSettings();
    settings.canvas_width = parseInt(width) || 1920;
    settings.canvas_height = parseInt(height) || 1080;
    updateCanvasSize();
    updateScreenSizeControls();
    autosaveQuiz();
}

document.addEventListener('DOMContentLoaded', () => {
    // Ensure Editor namespace exists
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    // Initialize interaction handlers
    if (Editor.InteractionHandlers && Editor.InteractionHandlers.init) {
        Editor.InteractionHandlers.init(autosaveQuiz, updateElementDisplay);
    }
    
    // Initialize element renderer
    if (Editor.ElementRenderer && Editor.ElementRenderer.init) {
        Editor.ElementRenderer.init(
            selectElement,
            () => currentQuiz,
            () => currentPageIndex
        );
    }
    
    // Load quiz if editing (using ID from URL parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('quiz');
    if (quizId) {
        loadQuiz(quizId);
    }

    // Initialize
    if (currentQuiz.pages.length === 0) {
        const newIndex = Editor.PageManager.addPage('display', currentQuiz, currentPageIndex, {
            onPageAdded: (index) => {
                currentPageIndex = index;
                renderPages();
                renderCanvas();
                autosaveQuiz();
            }
        });
        currentPageIndex = newIndex;
    }
    // Ensure view settings exist for all views
    getViewSettings('display');
    getViewSettings('participant');
    getViewSettings('control');
    updateCanvasSize();
    updateScreenSizeControls();
    renderPages();
    renderCanvas();
    
    // Setup resize handles for displayable area
    setupDisplayableAreaResize();

    // Element drag handlers
    document.querySelectorAll('.element-item').forEach(item => {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('element-type', item.dataset.type);
        });
        
        // Also allow clicking to add element at center of displayable area
        item.addEventListener('click', () => {
            const displayableArea = document.getElementById('displayable-area');
            const rect = displayableArea.getBoundingClientRect();
            const x = rect.width / 2 - 100; // Center minus half element width
            const y = rect.height / 2 - 50;  // Center minus half element height
            addElement(item.dataset.type, x, y);
        });
    });

    const displayableArea = document.getElementById('displayable-area');
    displayableArea.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    displayableArea.addEventListener('drop', (e) => {
        e.preventDefault();
        const elementType = e.dataTransfer.getData('element-type');
        const rect = displayableArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        addElement(elementType, x, y);
    });
    
    // Deselect element when clicking on empty space (non-selectable area)
    displayableArea.addEventListener('click', (e) => {
        // Check if the click target is a selectable element or inside one
        const target = e.target;
        const clickedElement = target.closest('.canvas-element') || 
                               target.closest('.question-container') ||
                               target.closest('[id^="element-nav-"]');
        
        // Don't deselect if clicking on interactive elements (inputs, buttons, selects, etc.)
        const isInteractiveElement = target.tagName === 'INPUT' || 
                                     target.tagName === 'BUTTON' || 
                                     target.tagName === 'SELECT' || 
                                     target.tagName === 'TEXTAREA' ||
                                     target.tagName === 'LABEL' ||
                                     target.closest('input') ||
                                     target.closest('button') ||
                                     target.closest('select') ||
                                     target.closest('textarea') ||
                                     target.closest('label');
        
        // Don't deselect if clicking on resize/rotate handles
        const isHandle = target.classList.contains('resize-handle') || 
                        target.classList.contains('rotate-handle');
        
        // Only deselect if clicking on empty space (not on an element and not on interactive controls)
        if (!clickedElement && !isInteractiveElement && !isHandle && selectedElement) {
            deselectElement();
        }
    });

    // Page management
    const pageCallbacks = {
        getCurrentQuiz: () => currentQuiz,
        getCurrentPageIndex: () => currentPageIndex,
        onPageAdded: (index) => {
            currentPageIndex = index;
            renderPages();
            renderCanvas();
            autosaveQuiz();
        },
        onPageSelected: (index) => {
            currentPageIndex = index;
            renderPages();
            renderCanvas();
        },
        onMovePage: (fromIndex, toIndex) => {
            [currentQuiz.pages[fromIndex], currentQuiz.pages[toIndex]] = 
                [currentQuiz.pages[toIndex], currentQuiz.pages[fromIndex]];
            if (currentPageIndex === fromIndex) {
                currentPageIndex = toIndex;
            } else if (currentPageIndex === toIndex) {
                currentPageIndex = fromIndex;
            }
            renderPages();
            renderCanvas();
            autosaveQuiz();
        },
        onPageRenamed: () => {
            autosaveQuiz();
        },
        onDeletePage: (index) => {
            currentQuiz.pages.splice(index, 1);
            if (currentPageIndex >= index) {
                if (currentPageIndex > 0) {
                    currentPageIndex--;
                } else {
                    currentPageIndex = 0;
                }
            }
            if (currentPageIndex >= currentQuiz.pages.length) {
                currentPageIndex = currentQuiz.pages.length - 1;
            }
            renderPages();
            renderCanvas();
            autosaveQuiz();
        }
    };

    document.getElementById('add-page-btn').addEventListener('click', () => {
        const newIndex = Editor.PageManager.addPage('display', currentQuiz, currentPageIndex, pageCallbacks);
        currentPageIndex = newIndex;
        renderPages();
        renderCanvas();
    });

    document.getElementById('add-status-page-btn').addEventListener('click', () => {
        const newIndex = Editor.PageManager.addPage('status', currentQuiz, currentPageIndex, pageCallbacks);
        currentPageIndex = newIndex;
        renderPages();
        renderCanvas();
    });

    document.getElementById('add-results-page-btn').addEventListener('click', () => {
        const newIndex = Editor.PageManager.addPage('results', currentQuiz, currentPageIndex, pageCallbacks);
        currentPageIndex = newIndex;
        renderPages();
        renderCanvas();
    });

    // Autosave on quiz name change
    document.getElementById('quiz-name').addEventListener('input', debounce(() => {
        autosaveQuiz();
    }, 1000));

    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '/quizmaster';
    });

    // Quiz name already handled above for autosave

    // Media modal handlers
    Editor.MediaModal.init();
    
    // Properties panel resize
    Editor.Utils.initPropertiesResize();
    
    // Canvas view tabs
    const canvasTabs = document.querySelectorAll('.canvas-tab');
    
    // Restore saved view on page load
    const savedView = localStorage.getItem('editor_active_view');
    if (savedView && (savedView === 'display' || savedView === 'participant' || savedView === 'control')) {
        const savedViewTab = document.querySelector(`[data-view="${savedView}"]`);
        if (savedViewTab) {
            // Remove active from all tabs
            canvasTabs.forEach(t => t.classList.remove('active'));
            // Set active on saved view tab
            savedViewTab.classList.add('active');
            currentView = savedView;
        }
    }
    
    canvasTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.canvas-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentView = tab.dataset.view;
            // Save active view to localStorage
            localStorage.setItem('editor_active_view', currentView);
            // Update canvas size and zoom for the new view
            updateCanvasSize();
            updateScreenSizeControls();
            renderCanvas();
        });
    });
    
    // Keyboard shortcuts - Delete key to delete selected element
    document.addEventListener('keydown', (e) => {
        // Only handle if no input/textarea is focused (to avoid deleting text while editing)
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.isContentEditable
        );
        
        if (!isInputFocused && selectedElement && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault();
            deleteSelectedElement();
        }
    });
    
    // Screen size controls
    document.getElementById('preset-desktop').addEventListener('click', () => {
        applyCanvasSize(1920, 1080);
    });
    
    document.getElementById('preset-mobile-portrait').addEventListener('click', () => {
        applyCanvasSize(390, 844); // Modern mobile portrait size
    });
    
    document.getElementById('preset-mobile-landscape').addEventListener('click', () => {
        applyCanvasSize(844, 390); // Modern mobile landscape size
    });
    
    document.getElementById('preset-custom').addEventListener('click', () => {
        const settings = getCurrentViewSettings();
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('preset-custom').classList.add('active');
        const customInputs = document.getElementById('custom-size-inputs');
        customInputs.style.display = 'block';
        document.getElementById('canvas-width').value = settings.canvas_width || 1920;
        document.getElementById('canvas-height').value = settings.canvas_height || 1080;
    });
    
    document.getElementById('apply-custom-size').addEventListener('click', () => {
        const width = document.getElementById('canvas-width').value;
        const height = document.getElementById('canvas-height').value;
        applyCanvasSize(width, height);
    });
    
    // Allow Enter key to apply custom size
    document.getElementById('canvas-width').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('apply-custom-size').click();
        }
    });
    
    document.getElementById('canvas-height').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('apply-custom-size').click();
        }
    });
    
    // Initialize canvas size
    updateCanvasSize();
    updateScreenSizeControls();
    
    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', zoomIn);
    document.getElementById('zoom-out').addEventListener('click', zoomOut);
    document.getElementById('zoom-fit').addEventListener('click', zoomFit);
    document.getElementById('zoom-reset').addEventListener('click', zoomReset);
    
    const zoomSlider = document.getElementById('zoom-slider');
    zoomSlider.addEventListener('input', (e) => {
        applyZoom(parseInt(e.target.value));
    });
    
    // Mouse wheel zoom with Ctrl/Cmd key (on scroll area, not tabs)
    const scrollArea = document.querySelector('.canvas-scroll-area');
    scrollArea.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -5 : 5;
            applyZoom(canvasZoom + delta);
        }
    }, { passive: false });
});

function renderPages() {
    const pageCallbacks = {
        getCurrentQuiz: () => currentQuiz,
        getCurrentPageIndex: () => currentPageIndex,
        onPageSelected: (index) => {
            currentPageIndex = index;
            renderPages();
            renderCanvas();
        },
        onMovePage: (fromIndex, toIndex) => {
            [currentQuiz.pages[fromIndex], currentQuiz.pages[toIndex]] = 
                [currentQuiz.pages[toIndex], currentQuiz.pages[fromIndex]];
            if (currentPageIndex === fromIndex) {
                currentPageIndex = toIndex;
            } else if (currentPageIndex === toIndex) {
                currentPageIndex = fromIndex;
            }
            renderPages();
            renderCanvas();
            autosaveQuiz();
        },
        onPageRenamed: () => {
            autosaveQuiz();
        },
        onDeletePage: (index) => {
            currentQuiz.pages.splice(index, 1);
            if (currentPageIndex >= index) {
                if (currentPageIndex > 0) {
                    currentPageIndex--;
                } else {
                    currentPageIndex = 0;
                }
            }
            if (currentPageIndex >= currentQuiz.pages.length) {
                currentPageIndex = currentQuiz.pages.length - 1;
            }
            renderPages();
            renderCanvas();
            autosaveQuiz();
        }
    };
    
    Editor.PageManager.renderPages(currentQuiz, currentPageIndex, pageCallbacks);
}

function renderCanvas() {
    const displayableArea = document.getElementById('displayable-area');
    
    // Clear displayable area content first
    displayableArea.innerHTML = '';
    
    // Ensure displayable area size is set
    updateCanvasSize();
    
    const page = currentQuiz.pages[currentPageIndex];
    if (!page) return;

    // Initialize page elements structure if needed
    if (!page.elements) {
        page.elements = [];
    }
    
    // Show placeholders for status and results pages
    if (page.type === 'status' && currentView === 'display') {
        renderStatusPagePlaceholder(displayableArea);
        return;
    }
    
    if (page.type === 'results' && currentView === 'display') {
        renderResultsPagePlaceholder(displayableArea);
        return;
    }

    // Add participant header if viewing participant view
    if (currentView === 'participant') {
        const participantHeader = document.createElement('div');
        participantHeader.className = 'editor-participant-header';
        participantHeader.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; background: white; border-bottom: 3px solid #2196F3; padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 1000;';
        
        // Avatar placeholder
        const avatar = document.createElement('div');
        avatar.style.cssText = 'font-size: 2.5rem; width: 3.5rem; height: 3.5rem; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 50%; border: 2px solid #2196F3;';
        avatar.textContent = '👤';
        participantHeader.appendChild(avatar);
        
        // Name placeholder
        const name = document.createElement('div');
        name.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #333; flex: 1;';
        name.textContent = 'Participant Name';
        participantHeader.appendChild(name);
        
        // Points placeholder
        const points = document.createElement('div');
        points.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #2196F3;';
        points.textContent = 'Points: 0';
        participantHeader.appendChild(points);
        
        displayableArea.appendChild(participantHeader);
        
        // Add padding to displayable area to account for header
        displayableArea.style.paddingTop = '80px';
    } else {
        // Remove padding for other views
        displayableArea.style.paddingTop = '0';
    }

    // Filter elements by current view
    // Elements with view property matching currentView, or parent elements on display view
    let elementsToRender = [];
    if (currentView === 'display') {
        // Display view shows all elements without a view property or with view='display'
        elementsToRender = page.elements.filter(el => !el.view || el.view === 'display');
    } else if (currentView === 'participant') {
        // Participant view should match the actual participant page structure
        // Find question elements and render them with titles and answer inputs
        const questionElements = page.elements.filter(el => el.is_question && (!el.view || el.view === 'display'));
        questionElements.forEach(question => {
            // Create question container (matching participant page structure)
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
            
            // Find and render the answer_input element for this question
            const answerInput = page.elements.find(el => el.type === 'answer_input' && el.parent_id === question.id && el.view === 'participant');
            if (answerInput) {
                // Render the answer input inside the question container
                const answerEl = Editor.ElementRenderer.renderElementOnCanvas(questionContainer, answerInput, true); // Pass true to indicate it's inside a container
                if (answerEl) {
                    questionContainer.appendChild(answerEl);
                }
            }
            
            // Position the question container on the canvas
            questionContainer.style.position = 'absolute';
            const headerOffset = currentView === 'participant' ? 80 : 0;
            questionContainer.style.left = `${question.x || 50}px`;
            questionContainer.style.top = `${(question.y || 50) + headerOffset}px`;
            
            // Make the question container draggable so the title and answer input move together
            // Create a wrapper for drag handling that accounts for header offset
            let isDragging = false;
            let startX, startY, startLeft, startTop;
            let dragThreshold = 5;
            let hasMoved = false;
            
            questionContainer.addEventListener('mousedown', (e) => {
                // Don't start dragging if clicking on interactive elements (inputs, buttons, etc.)
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
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', function dragMove(e) {
                if (!isDragging) return;
                
                const dx = Math.abs(e.clientX - startX);
                const dy = Math.abs(e.clientY - startY);
                
                if (dx > dragThreshold || dy > dragThreshold) {
                    hasMoved = true;
                }
                
                if (hasMoved) {
                    const totalDx = e.clientX - startX;
                    const totalDy = e.clientY - startY;
                    const newX = startLeft + totalDx;
                    const newY = startTop + totalDy;
                    
                    // Update question element position (without header offset)
                    question.x = newX;
                    question.y = newY;
                    
                    // Update container position (with header offset for display)
                    questionContainer.style.left = `${newX}px`;
                    questionContainer.style.top = `${newY + headerOffset}px`;
                }
            });
            
            document.addEventListener('mouseup', function dragEnd() {
                if (isDragging && hasMoved) {
                    autosaveQuiz();
                }
                isDragging = false;
                hasMoved = false;
            });
            
            // Add click handler to select the question element
            questionContainer.addEventListener('click', (e) => {
                // Don't select if we just dragged
                if (hasMoved) {
                    hasMoved = false;
                    return;
                }
                // Don't select if clicking on interactive elements inside
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || 
                    e.target.tagName === 'LABEL' || e.target.closest('button') || 
                    e.target.closest('input') || e.target.closest('label')) {
                    return;
                }
                selectElement(question);
            });
            
            displayableArea.appendChild(questionContainer);
        });
        // Don't render other elements in participant view - we've handled questions above
        return;
    } else if (currentView === 'control') {
        // Control view shows ONLY control-specific elements
        // Filter out navigation_control elements - they're static buttons, not editable
        elementsToRender = page.elements.filter(el => 
            el.view === currentView && el.type !== 'navigation_control'
        );
        
        // Ensure audio/video controls exist for all audio/video elements
        const audioVideoElements = page.elements.filter(el => 
            (el.type === 'audio' || el.type === 'video' || el.media_type === 'audio' || el.media_type === 'video') &&
            (!el.view || el.view === 'display')
        );
        
        audioVideoElements.forEach(mediaElement => {
            // Check if control element already exists
            const existingControl = page.elements.find(el => 
                el.type === 'audio_control' && 
                el.parent_id === mediaElement.id && 
                el.view === 'control'
            );
            
            if (!existingControl) {
                // Create audio/video control element
                const controlElement = Editor.ElementCreator.createMediaControlElement(mediaElement);
                if (controlElement) {
                    page.elements.push(controlElement);
                    elementsToRender.push(controlElement);
                }
            } else {
                // Add existing control to render list if not already there
                if (!elementsToRender.find(el => el.id === existingControl.id)) {
                    elementsToRender.push(existingControl);
                }
            }
        });
        
        // Ensure answer_display elements exist for all question elements
        const questionElements = page.elements.filter(el => 
            el.is_question && (!el.view || el.view === 'display')
        );
        
        questionElements.forEach(question => {
            // Check if answer_display element already exists
            const existingDisplay = page.elements.find(el => 
                el.type === 'answer_display' && 
                el.parent_id === question.id && 
                el.view === 'control'
            );
            
            if (!existingDisplay) {
                // Create answer_display element
                const displayElement = Editor.ElementCreator.createAnswerDisplayElement(question);
                if (displayElement) {
                    page.elements.push(displayElement);
                    elementsToRender.push(displayElement);
                    // Autosave to persist the new element
                    autosaveQuiz();
                }
            } else {
                // Add existing display to render list if not already there
                if (!elementsToRender.find(el => el.id === existingDisplay.id)) {
                    elementsToRender.push(existingDisplay);
                }
            }
        });
        
        // Ensure appearance_control element exists (one per page)
        const existingAppearanceControl = page.elements.find(el => 
            el.type === 'appearance_control' && 
            el.view === 'control'
        );
        
        if (!existingAppearanceControl) {
            // Create appearance control element
            const appearanceControl = Editor.ElementCreator.createAppearanceControlElement(page);
            if (appearanceControl) {
                page.elements.push(appearanceControl);
                elementsToRender.push(appearanceControl);
                // Autosave to persist the new element
                autosaveQuiz();
            }
        } else {
            // Add existing appearance control to render list if not already there
            if (!elementsToRender.find(el => el.id === existingAppearanceControl.id)) {
                elementsToRender.push(existingAppearanceControl);
            }
        }
    } else {
        // Other views
        elementsToRender = page.elements.filter(el => el.view === currentView);
    }

    // Render elements
    elementsToRender.forEach(element => {
        if (Editor.ElementRenderer && Editor.ElementRenderer.renderElementOnCanvas) {
            Editor.ElementRenderer.renderElementOnCanvas(displayableArea, element);
        }
    });
    
    // Add static navigation buttons for control view (non-editable)
    if (currentView === 'control') {
        // Ensure navigation buttons exist
        let prevBtn = document.getElementById('editor-nav-prev-btn');
        let nextBtn = document.getElementById('editor-nav-next-btn');
        
        if (!prevBtn) {
            prevBtn = document.createElement('button');
            prevBtn.id = 'editor-nav-prev-btn';
            prevBtn.className = 'editor-nav-button editor-nav-button-left';
            prevBtn.textContent = '← Previous';
            prevBtn.style.cssText = 'position: absolute; top: 20px; left: 20px; z-index: 10000; padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; color: white; background: #2196F3; border: 2px solid #1976D2; border-radius: 8px; cursor: default; box-shadow: 0 4px 8px rgba(0,0,0,0.3); pointer-events: none; user-select: none;';
            displayableArea.appendChild(prevBtn);
        }
        
        if (!nextBtn) {
            nextBtn = document.createElement('button');
            nextBtn.id = 'editor-nav-next-btn';
            nextBtn.className = 'editor-nav-button editor-nav-button-right';
            nextBtn.textContent = 'Next →';
            nextBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; z-index: 10000; padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; color: white; background: #2196F3; border: 2px solid #1976D2; border-radius: 8px; cursor: default; box-shadow: 0 4px 8px rgba(0,0,0,0.3); pointer-events: none; user-select: none;';
            displayableArea.appendChild(nextBtn);
        }
        
        // Ensure buttons are visible
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
    } else {
        // Remove navigation buttons when not in control view
        const prevBtn = document.getElementById('editor-nav-prev-btn');
        const nextBtn = document.getElementById('editor-nav-next-btn');
        if (prevBtn) prevBtn.remove();
        if (nextBtn) nextBtn.remove();
        
        // Remove answers mockup
        const answersMockup = document.getElementById('editor-answers-mockup');
        if (answersMockup) answersMockup.remove();
    }

    // Render properties
    renderProperties();
}

function renderStatusPagePlaceholder(canvas) {
    // Create placeholder that matches what status page will look like when running
    const placeholder = document.createElement('div');
    placeholder.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 2rem;';
    
    const title = document.createElement('h1');
    title.textContent = 'Current Rankings';
    title.style.cssText = 'font-size: 3rem; margin-bottom: 2rem; text-align: center;';
    placeholder.appendChild(title);
    
    // Podium placeholder
    const podium = document.createElement('div');
    podium.style.cssText = 'display: flex; align-items: flex-end; justify-content: center; gap: 2rem; margin: 2rem 0;';
    
    // Create 3 podium places
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
        
        // Order: 2nd place (middle), 1st place (left), 3rd place (right)
        place.style.order = i === 0 ? '2' : i === 1 ? '1' : '3';
        podium.appendChild(place);
    }
    
    placeholder.appendChild(podium);
    
    // Rankings list placeholder
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
    
    // Add note that this is a placeholder
    const note = document.createElement('div');
    note.style.cssText = 'margin-top: 2rem; padding: 1rem; background: rgba(255,255,255,0.2); border-radius: 8px; font-size: 0.9rem; opacity: 0.8;';
    note.textContent = '📊 This is a preview. Actual rankings will show real participant data when the quiz is running.';
    placeholder.appendChild(note);
    
    displayableArea.appendChild(placeholder);
}

function renderResultsPagePlaceholder(displayableArea) {
    // Create placeholder that matches what results page will look like when running
    const placeholder = document.createElement('div');
    placeholder.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 2rem;';
    
    const title = document.createElement('h1');
    title.innerHTML = '🎉 Quiz Complete! 🎉';
    title.style.cssText = 'font-size: 3rem; margin-bottom: 2rem; text-align: center;';
    placeholder.appendChild(title);
    
    // Winner section placeholder
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
    
    // Podium for top 3
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
    
    // Add note that this is a placeholder
    const note = document.createElement('div');
    note.style.cssText = 'margin-top: 2rem; padding: 1rem; background: rgba(255,255,255,0.2); border-radius: 8px; font-size: 0.9rem; opacity: 0.8;';
    note.textContent = '🏅 This is a preview. Final results will show actual winners and rankings when the quiz ends.';
    placeholder.appendChild(note);
    
    displayableArea.appendChild(placeholder);
}


// renderElementOnCanvas is now in Editor.ElementRenderer module

// makeDraggable is now in Editor.InteractionHandlers module

// Helper functions that delegate to modules
function createMediaControlElement(parentElement) {
    return Editor.ElementCreator.createMediaControlElement(parentElement);
}

function createQuestionChildElements(parentElement) {
    return Editor.ElementCreator.createQuestionChildElements(parentElement);
}

function addElement(type, x, y) {
    const elementCallbacks = {
        getCurrentQuiz: () => currentQuiz,
        getCurrentPageIndex: () => currentPageIndex,
        getCurrentView: () => currentView,
        openMediaModal: (callback) => {
            Editor.MediaModal.open(callback);
        },
        onElementAdded: (element) => {
            renderCanvas();
            selectElement(element);
            autosaveQuiz();
        }
    };
    
    const element = Editor.ElementCreator.createElement(type, x, y, elementCallbacks);
    if (element) {
        renderCanvas();
        selectElement(element);
        autosaveQuiz();
    }
}

// renderMediaElement is now in Editor.ElementRenderer module

// makeDraggable is now in Editor.InteractionHandlers module

// Helper functions that delegate to modules
function createMediaControlElement(parentElement) {
    return Editor.ElementCreator.createMediaControlElement(parentElement);
}

function createQuestionChildElements(parentElement) {
    return Editor.ElementCreator.createQuestionChildElements(parentElement);
}

function addElement(type, x, y) {
    const elementCallbacks = {
        getCurrentQuiz: () => currentQuiz,
        getCurrentPageIndex: () => currentPageIndex,
        getCurrentView: () => currentView,
        openMediaModal: (callback) => {
            Editor.MediaModal.open(callback);
        },
        onElementAdded: (element) => {
            renderCanvas();
            selectElement(element);
            autosaveQuiz();
        }
    };
    
    const element = Editor.ElementCreator.createElement(type, x, y, elementCallbacks);
    if (element) {
        renderCanvas();
        selectElement(element);
        autosaveQuiz();
    }
}

function selectElement(element) {
    selectedElement = element;
    document.querySelectorAll('.canvas-element').forEach(el => {
        el.classList.remove('selected');
        el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
    });
    // Also clear selection from question containers and navigation controls
    document.querySelectorAll('.question-container, [id^="element-nav-"]').forEach(el => {
        el.classList.remove('selected');
        el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
    });
    
    const el = document.getElementById(`element-${element.id}`);
    if (el) {
        el.classList.add('selected');
        if (['rectangle', 'circle', 'triangle', 'arrow', 'line'].includes(element.type)) {
            Editor.InteractionHandlers.addResizeHandles(el, element);
            Editor.InteractionHandlers.addRotateHandle(el, element);
        } else if (['image', 'video', 'audio', 'richtext'].includes(element.type)) {
            Editor.InteractionHandlers.addResizeHandles(el, element);
        } else if (['audio_control', 'answer_input', 'answer_display'].includes(element.type)) {
            Editor.InteractionHandlers.addResizeHandles(el, element);
        }
    }
    renderProperties();
}

function deselectElement() {
    selectedElement = null;
    // Clear visual selection from all elements
    document.querySelectorAll('.canvas-element').forEach(el => {
        el.classList.remove('selected');
        el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
    });
    // Also clear selection from question containers and navigation controls
    document.querySelectorAll('.question-container, [id^="element-nav-"]').forEach(el => {
        el.classList.remove('selected');
        el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
    });
    renderProperties();
}

function deleteSelectedElement() {
    if (!selectedElement) return;
    
    const page = currentQuiz.pages[currentPageIndex];
    if (!page || !page.elements) return;
    
    // Remove element from array
    const elementIndex = page.elements.findIndex(el => el.id === selectedElement.id);
    if (elementIndex !== -1) {
        const deletedElement = page.elements[elementIndex];
        
        // If deleting a parent element (has view='display' and no parent_id), delete all child elements
        if (deletedElement.view === 'display' && !deletedElement.parent_id) {
            page.elements = page.elements.filter(el => el.parent_id !== deletedElement.id);
        }
        
        // Remove the element itself
        page.elements.splice(elementIndex, 1);
        selectedElement = null;
        renderCanvas();
        autosaveQuiz();
    }
}

let activePropertiesTab = 'general'; // Track active tab

function renderProperties() {
    const panel = document.getElementById('properties-panel');
    
    // Don't re-render if font size dropdown is currently open/interacting
    // Check if any select element in the panel is marked as being interacted with
    const activeSelect = panel.querySelector('select[data-interacting="true"]');
    if (activeSelect) {
        // Don't re-render if a dropdown is being interacted with
        return;
    }
    
    panel.innerHTML = '';

    // Create tabs container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'properties-tabs';
    tabsContainer.style.cssText = 'display: flex; border-bottom: 2px solid #ddd; margin-bottom: 1rem;';
    
    const generalTab = document.createElement('button');
    generalTab.textContent = 'General';
    generalTab.className = 'properties-tab';
    generalTab.dataset.tab = 'general';
    generalTab.style.cssText = 'flex: 1; padding: 0.75rem; border: none; background: ' + (activePropertiesTab === 'general' ? '#2196F3' : '#f5f5f5') + '; color: ' + (activePropertiesTab === 'general' ? 'white' : '#333') + '; cursor: pointer; font-weight: ' + (activePropertiesTab === 'general' ? 'bold' : 'normal') + ';';
    generalTab.onclick = () => {
        activePropertiesTab = 'general';
        renderProperties();
    };
    
    const appearanceTab = document.createElement('button');
    appearanceTab.textContent = 'Appearance';
    appearanceTab.className = 'properties-tab';
    appearanceTab.dataset.tab = 'appearance';
    appearanceTab.style.cssText = 'flex: 1; padding: 0.75rem; border: none; background: ' + (activePropertiesTab === 'appearance' ? '#2196F3' : '#f5f5f5') + '; color: ' + (activePropertiesTab === 'appearance' ? 'white' : '#333') + '; cursor: pointer; font-weight: ' + (activePropertiesTab === 'appearance' ? 'bold' : 'normal') + ';';
    appearanceTab.onclick = () => {
        activePropertiesTab = 'appearance';
        renderProperties();
    };
    
    tabsContainer.appendChild(generalTab);
    tabsContainer.appendChild(appearanceTab);
    panel.appendChild(tabsContainer);
    
    // Create tab content container
    const tabContent = document.createElement('div');
    tabContent.className = 'properties-tab-content';
    panel.appendChild(tabContent);
    
    if (activePropertiesTab === 'general') {
        if (!selectedElement) {
            tabContent.innerHTML = '<p>Select an element to edit properties</p>';
            return;
        }
        renderGeneralProperties(tabContent);
    } else if (activePropertiesTab === 'appearance') {
        renderAppearanceProperties(tabContent);
    }
}

function renderGeneralProperties(container) {

    // Common properties
    addPropertyInput(container, 'X', selectedElement.x, (val) => {
        selectedElement.x = parseInt(val) || 0;
        updateElementDisplay();
    });

    addPropertyInput(container, 'Y', selectedElement.y, (val) => {
        selectedElement.y = parseInt(val) || 0;
        updateElementDisplay();
    });

    addPropertyInput(container, 'Width', selectedElement.width, (val) => {
        selectedElement.width = parseInt(val) || 100;
        updateElementDisplay();
    });

    addPropertyInput(container, 'Height', selectedElement.height, (val) => {
        selectedElement.height = parseInt(val) || 100;
        updateElementDisplay();
    });

    // Type-specific properties
    // Rich text editor
    if (selectedElement.type === 'richtext') {
        // Rich text content editor
        const contentGroup = document.createElement('div');
        contentGroup.className = 'property-group';
        const contentLabel = document.createElement('label');
        contentLabel.textContent = 'Content';
        contentLabel.style.marginBottom = '0.5rem';
        contentLabel.style.display = 'block';
        contentGroup.appendChild(contentLabel);
        
        // Contenteditable div for rich text editing
        const editor = document.createElement('div');
        editor.contentEditable = true;
        editor.innerHTML = selectedElement.content || '<p>Enter your text here</p>';
        editor.style.cssText = 'min-height: 200px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; background: white; overflow-y: auto; font-size: 14px; line-height: 1.5;';
        editor.style.fontSize = `${selectedElement.font_size || 16}px`;
        editor.style.color = selectedElement.text_color || '#000000';
        
        // Store scroll and selection state
        let propertiesScrollPosition = 0;
        let editorScrollPosition = 0;
        let savedSelection = null;
        let fontSizeDropdownSelection = null; // Special selection for font size dropdown
        let isInteractingWithFontSizeDropdown = false; // Flag to prevent blur handler interference
        
        // Function to save selection state
        const saveSelection = () => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                savedSelection = {
                    startContainer: range.startContainer,
                    startOffset: range.startOffset,
                    endContainer: range.endContainer,
                    endOffset: range.endOffset
                };
            }
            
            // Save scroll positions
            const propertiesPanel = document.querySelector('.editor-properties');
            if (propertiesPanel) {
                propertiesScrollPosition = propertiesPanel.scrollTop;
            }
            editorScrollPosition = editor.scrollTop;
        };
        
        // Function to restore selection state
        const restoreSelection = () => {
            if (savedSelection) {
                try {
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.setStart(savedSelection.startContainer, savedSelection.startOffset);
                    range.setEnd(savedSelection.endContainer, savedSelection.endOffset);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } catch (e) {
                    // If restoration fails, just focus the editor
                    editor.focus();
                }
            }
            
            // Restore scroll positions
            const propertiesPanel = document.querySelector('.editor-properties');
            if (propertiesPanel) {
                propertiesPanel.scrollTop = propertiesScrollPosition;
            }
            editor.scrollTop = editorScrollPosition;
        };
        
        // Update content function - debounced display update to prevent scroll issues
        let displayUpdateTimeout = null;
        const updateRichTextDisplay = () => {
            selectedElement.content = editor.innerHTML;
            
            // Debounce the canvas update to prevent scroll/focus issues
            if (displayUpdateTimeout) {
                clearTimeout(displayUpdateTimeout);
            }
            
            saveSelection();
            
            displayUpdateTimeout = setTimeout(() => {
                updateElementDisplay();
                restoreSelection();
            }, 300); // Wait 300ms after user stops typing
        };
        
        // Debounced save function - only for autosave
        const saveRichText = debounce(() => {
            autosaveQuiz();
        }, 500);
        
        // Combined update function for toolbar buttons (immediate update + debounced save)
        const updateRichTextContent = () => {
            saveSelection();
            updateRichTextDisplay();
            saveRichText();
            // Restore selection after a brief delay to ensure DOM is updated
            setTimeout(() => {
                restoreSelection();
            }, 50);
        };
        
        // Formatting toolbar
        const toolbar = document.createElement('div');
        toolbar.style.cssText = 'display: flex; gap: 0.25rem; margin-bottom: 0.5rem; flex-wrap: wrap; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;';
        
        // Bold button
        const boldBtn = document.createElement('button');
        boldBtn.innerHTML = '<strong>B</strong>';
        boldBtn.title = 'Bold';
        boldBtn.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 3px; font-weight: bold;';
        boldBtn.onclick = (e) => {
            e.preventDefault();
            editor.focus();
            document.execCommand('bold', false, null);
            updateRichTextContent();
        };
        toolbar.appendChild(boldBtn);
        
        // Italic button
        const italicBtn = document.createElement('button');
        italicBtn.innerHTML = '<em>I</em>';
        italicBtn.title = 'Italic';
        italicBtn.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 3px; font-style: italic;';
        italicBtn.onclick = (e) => {
            e.preventDefault();
            editor.focus();
            document.execCommand('italic', false, null);
            updateRichTextContent();
        };
        toolbar.appendChild(italicBtn);
        
        // Underline button
        const underlineBtn = document.createElement('button');
        underlineBtn.innerHTML = '<u>U</u>';
        underlineBtn.title = 'Underline';
        underlineBtn.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 3px; text-decoration: underline;';
        underlineBtn.onclick = (e) => {
            e.preventDefault();
            editor.focus();
            document.execCommand('underline', false, null);
            updateRichTextContent();
        };
        toolbar.appendChild(underlineBtn);
        
        // Font size dropdown
        const fontSizeLabel = document.createElement('label');
        fontSizeLabel.textContent = 'Size:';
        fontSizeLabel.style.marginLeft = '0.5rem';
        fontSizeLabel.style.marginRight = '0.25rem';
        // Prevent click events from bubbling
        fontSizeLabel.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
            isInteractingWithFontSizeDropdown = true;
            fontSizeSelect.setAttribute('data-interacting', 'true');
            // Save selection when clicking label too
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                fontSizeDropdownSelection = {
                    startContainer: range.startContainer,
                    startOffset: range.startOffset,
                    endContainer: range.endContainer,
                    endOffset: range.endOffset
                };
            }
        }, true); // Use capture phase
        fontSizeLabel.addEventListener('click', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, true);
        toolbar.appendChild(fontSizeLabel);
        
        const fontSizeSelect = document.createElement('select');
        fontSizeSelect.style.cssText = 'padding: 0.25rem; border: 1px solid #ddd; border-radius: 3px;';
        const sizes = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];
        sizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size;
            if (size === (selectedElement.font_size || 16)) {
                option.selected = true;
            }
            fontSizeSelect.appendChild(option);
        });
        // Prevent click events from bubbling to avoid dropdown closing
        // Save selection before editor loses focus when clicking dropdown
        fontSizeSelect.setAttribute('data-interacting', 'false');
        fontSizeSelect.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
            // Don't prevent default - we want the dropdown to open normally
            isInteractingWithFontSizeDropdown = true;
            fontSizeSelect.setAttribute('data-interacting', 'true');
            // Save the current selection before editor loses focus
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                fontSizeDropdownSelection = {
                    startContainer: range.startContainer,
                    startOffset: range.startOffset,
                    endContainer: range.endContainer,
                    endOffset: range.endOffset
                };
            }
        }, true); // Use capture phase to catch event early
        fontSizeSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, true);
        fontSizeSelect.addEventListener('focus', () => {
            isInteractingWithFontSizeDropdown = true;
            fontSizeSelect.setAttribute('data-interacting', 'true');
        });
        fontSizeSelect.addEventListener('blur', () => {
            // Clear flag after a short delay to allow dropdown to close naturally
            setTimeout(() => {
                isInteractingWithFontSizeDropdown = false;
                fontSizeSelect.setAttribute('data-interacting', 'false');
            }, 100);
        });
        fontSizeSelect.onchange = () => {
            // Clear the flag before focusing editor
            isInteractingWithFontSizeDropdown = false;
            fontSizeSelect.setAttribute('data-interacting', 'false');
            editor.focus();
            
            // Try to restore the selection saved before dropdown interaction
            let range = null;
            const selection = window.getSelection();
            
            if (fontSizeDropdownSelection) {
                try {
                    range = document.createRange();
                    range.setStart(fontSizeDropdownSelection.startContainer, fontSizeDropdownSelection.startOffset);
                    range.setEnd(fontSizeDropdownSelection.endContainer, fontSizeDropdownSelection.endOffset);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } catch (e) {
                    // If restoration fails, try current selection
                    if (selection.rangeCount > 0) {
                        range = selection.getRangeAt(0);
                    }
                }
            } else if (selection.rangeCount > 0) {
                range = selection.getRangeAt(0);
            }
            
            if (range && !range.collapsed) {
                // Apply font size to selected text
                const span = document.createElement('span');
                span.style.fontSize = fontSizeSelect.value + 'px';
                try {
                    range.surroundContents(span);
                } catch (e) {
                    // If surroundContents fails, use alternative method
                    span.appendChild(range.extractContents());
                    range.insertNode(span);
                }
                updateRichTextContent();
                // Clear the saved selection
                fontSizeDropdownSelection = null;
            } else {
                // If no selection, apply to entire content
                editor.style.fontSize = fontSizeSelect.value + 'px';
                selectedElement.font_size = parseInt(fontSizeSelect.value);
                updateRichTextContent();
                fontSizeDropdownSelection = null;
            }
        };
        toolbar.appendChild(fontSizeSelect);
        
        // Text color picker
        const colorLabel = document.createElement('label');
        colorLabel.textContent = 'Color:';
        colorLabel.style.marginLeft = '0.5rem';
        colorLabel.style.marginRight = '0.25rem';
        toolbar.appendChild(colorLabel);
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = selectedElement.text_color || '#000000';
        colorInput.style.cssText = 'width: 40px; height: 24px; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;';
        colorInput.onchange = () => {
            editor.focus();
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                document.execCommand('foreColor', false, colorInput.value);
            } else {
                // If no selection, apply to entire content
                editor.style.color = colorInput.value;
                selectedElement.text_color = colorInput.value;
            }
            updateRichTextContent();
        };
        toolbar.appendChild(colorInput);
        
        contentGroup.appendChild(toolbar);
        
        // Update display as user types, but debounce to prevent scroll issues
        editor.addEventListener('input', () => {
            updateRichTextDisplay();
            saveRichText();
        });
        
        // Save selection on focus
        editor.addEventListener('focus', () => {
            saveSelection();
        });
        
        editor.addEventListener('blur', (e) => {
            // Don't trigger update if we're interacting with the font size dropdown
            // Check if the related target (element receiving focus) is the dropdown or inside toolbar
            const relatedTarget = e.relatedTarget;
            if (isInteractingWithFontSizeDropdown) {
                return;
            }
            // Also check if focus is moving to toolbar elements
            if (relatedTarget && toolbar.contains(relatedTarget)) {
                return;
            }
            updateRichTextContent();
        });
        
        // Prevent default behavior for formatting buttons
        editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'b') {
                    e.preventDefault();
                    document.execCommand('bold', false, null);
                    updateRichTextContent();
                } else if (e.key === 'i') {
                    e.preventDefault();
                    document.execCommand('italic', false, null);
                    updateRichTextContent();
                } else if (e.key === 'u') {
                    e.preventDefault();
                    document.execCommand('underline', false, null);
                    updateRichTextContent();
                }
            }
        });
        
        contentGroup.appendChild(editor);
        container.appendChild(contentGroup);
        
        // Background color
        const bgColorGroup = document.createElement('div');
        bgColorGroup.className = 'property-group';
        const bgColorLabel = document.createElement('label');
        bgColorLabel.textContent = 'Background Color';
        const bgColorInput = document.createElement('input');
        bgColorInput.type = 'color';
        bgColorInput.value = selectedElement.background_color || '#ffffff';
        bgColorInput.onchange = () => {
            selectedElement.background_color = bgColorInput.value;
            updateElementDisplay();
            autosaveQuiz();
        };
        bgColorGroup.appendChild(bgColorLabel);
        bgColorGroup.appendChild(bgColorInput);
        container.appendChild(bgColorGroup);
    }
    
    // Shape properties (rectangle, circle, triangle, arrow, line)
    if (['rectangle', 'circle', 'triangle', 'arrow', 'line'].includes(selectedElement.type)) {
        // Fill color
        const fillColorGroup = document.createElement('div');
        fillColorGroup.className = 'property-group';
        const fillColorLabel = document.createElement('label');
        fillColorLabel.textContent = 'Fill Color';
        const fillColorInput = document.createElement('input');
        fillColorInput.type = 'color';
        fillColorInput.value = selectedElement.fill_color || '#ddd';
        fillColorInput.onchange = () => {
            selectedElement.fill_color = fillColorInput.value;
            updateElementDisplay();
            autosaveQuiz();
        };
        fillColorGroup.appendChild(fillColorLabel);
        fillColorGroup.appendChild(fillColorInput);
        container.appendChild(fillColorGroup);

        // Border color
        const borderColorGroup = document.createElement('div');
        borderColorGroup.className = 'property-group';
        const borderColorLabel = document.createElement('label');
        borderColorLabel.textContent = 'Border Color';
        const borderColorInput = document.createElement('input');
        borderColorInput.type = 'color';
        borderColorInput.value = selectedElement.border_color || '#999';
        borderColorInput.onchange = () => {
            selectedElement.border_color = borderColorInput.value;
            updateElementDisplay();
            autosaveQuiz();
        };
        borderColorGroup.appendChild(borderColorLabel);
        borderColorGroup.appendChild(borderColorInput);
        container.appendChild(borderColorGroup);

        // Border width
        addPropertyInput(container, 'Border Width', selectedElement.border_width || 2, (val) => {
            selectedElement.border_width = parseInt(val) || 0;
            updateElementDisplay();
            autosaveQuiz();
        });
        
        // Arrow-specific properties
        if (selectedElement.type === 'arrow') {
            // Body thickness
            addPropertyInput(container, 'Body Thickness', selectedElement.arrow_body_thickness || Math.min(selectedElement.width, selectedElement.height) * 0.2, (val) => {
                selectedElement.arrow_body_thickness = parseInt(val) || 10;
                updateElementDisplay();
                autosaveQuiz();
            });
            
            // Head length (how far back the line goes)
            addPropertyInput(container, 'Head Length', selectedElement.arrow_head_length || Math.min(selectedElement.width, selectedElement.height) * 0.3, (val) => {
                selectedElement.arrow_head_length = parseInt(val) || 30;
                updateElementDisplay();
                autosaveQuiz();
            });
        }
    }

    // Question checkbox - only appears for display view elements (not child elements)
    if (selectedElement.view === 'display' || !selectedElement.view) {
    const questionGroup = document.createElement('div');
    questionGroup.className = 'property-group';
    questionGroup.style.marginTop = '4px';
    questionGroup.style.paddingTop = '4px';
    questionGroup.style.borderTop = '1px solid #eee';
    questionGroup.style.marginBottom = '4px';
    questionGroup.style.paddingBottom = '4px';
    questionGroup.style.paddingLeft = '0';
    questionGroup.style.marginLeft = '0';
    const questionLabel = document.createElement('div');
    questionLabel.style.display = 'flex';
    questionLabel.style.alignItems = 'center';
    questionLabel.style.gap = '0.25rem';
    questionLabel.style.fontWeight = '500';
    questionLabel.style.whiteSpace = 'nowrap';
    questionLabel.style.justifyContent = 'flex-start';
    questionLabel.style.margin = '0';
    questionLabel.style.marginBottom = '0';
    questionLabel.style.padding = '0';
    questionLabel.style.textAlign = 'left';
    const questionCheckbox = document.createElement('input');
    questionCheckbox.type = 'checkbox';
    questionCheckbox.checked = selectedElement.is_question || false;
    questionCheckbox.style.margin = '0';
    questionCheckbox.style.marginRight = '0.25rem';
    questionCheckbox.style.cursor = 'pointer';
    questionCheckbox.style.width = 'auto';
    questionCheckbox.style.padding = '0';
    questionCheckbox.style.border = 'none';
    questionCheckbox.style.borderRadius = '0';
    questionCheckbox.onchange = () => {
        const page = currentQuiz.pages[currentPageIndex];
        const wasQuestion = selectedElement.is_question;
        selectedElement.is_question = questionCheckbox.checked;
        
        if (!selectedElement.is_question) {
            // Delete child answer elements
            if (page.elements) {
                page.elements = page.elements.filter(el => el.parent_id !== selectedElement.id || 
                    (el.type !== 'answer_input' && el.type !== 'answer_display'));
            }
            delete selectedElement.answer_type;
            delete selectedElement.options;
        } else {
            // Create child answer elements
            selectedElement.answer_type = selectedElement.answer_type || 'text';
            if (!wasQuestion) {
                const childElements = Editor.ElementCreator.createQuestionChildElements(selectedElement);
                childElements.forEach(child => {
                    if (!page.elements) page.elements = [];
                    page.elements.push(child);
                });
            }
        }
        renderProperties(); // Re-render to show/hide answer type dropdown
        renderCanvas(); // Re-render to show/hide child elements
        autosaveQuiz();
    };
    questionLabel.appendChild(questionCheckbox);
    const questionText = document.createElement('span');
    questionText.textContent = 'Is Question';
    questionLabel.appendChild(questionText);
    questionGroup.appendChild(questionLabel);
    container.appendChild(questionGroup);
    
    // Question title - only shown if element is a question
    if (selectedElement.is_question) {
        const titleGroup = document.createElement('div');
        titleGroup.className = 'property-group';
        const titleLabel = document.createElement('label');
        titleLabel.textContent = 'Question Title';
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.value = selectedElement.question_title || '';
        titleInput.style.width = '100%';
        titleInput.style.padding = '0.5rem';
        titleInput.style.border = '1px solid #ddd';
        titleInput.style.borderRadius = '4px';
        
        // Store scroll position before any updates
        let scrollPosition = 0;
        let selectionStart = 0;
        let selectionEnd = 0;
        
        titleInput.addEventListener('focus', () => {
            // Store the properties panel scroll position when input is focused
            const propertiesPanel = document.querySelector('.editor-properties');
            if (propertiesPanel) {
                scrollPosition = propertiesPanel.scrollTop;
            }
        });
        
        // Only save and render when user clicks away (blur/change event)
        titleInput.onchange = () => {
            selectedElement.question_title = titleInput.value;
            
            // Store scroll position before rendering
            const propertiesPanel = document.querySelector('.editor-properties');
            if (propertiesPanel) {
                scrollPosition = propertiesPanel.scrollTop;
            }
            
            renderCanvas(); // Re-render canvas to show updated title
            autosaveQuiz();
            
            // Restore scroll position after render
            if (propertiesPanel) {
                propertiesPanel.scrollTop = scrollPosition;
            }
        };
        
        // Also handle blur event (when clicking away)
        titleInput.onblur = () => {
            // Only update if value actually changed
            if (selectedElement.question_title !== titleInput.value) {
                selectedElement.question_title = titleInput.value;
                
                // Store scroll position before rendering
                const propertiesPanel = document.querySelector('.editor-properties');
                if (propertiesPanel) {
                    scrollPosition = propertiesPanel.scrollTop;
                }
                
                renderCanvas(); // Re-render canvas to show updated title
                autosaveQuiz();
                
                // Restore scroll position after render
                if (propertiesPanel) {
                    propertiesPanel.scrollTop = scrollPosition;
                }
            }
        };
        
        // Update the value in memory as user types (for immediate feedback) but don't save/render
        titleInput.oninput = (e) => {
            // Just update the value in memory, don't save or render yet
            selectedElement.question_title = titleInput.value;
        };
        
        titleGroup.appendChild(titleLabel);
        titleGroup.appendChild(titleInput);
        container.appendChild(titleGroup);
    }
    
    // Answer type dropdown - only shown if element is a question
    if (selectedElement.is_question) {
        const answerTypeGroup = document.createElement('div');
        answerTypeGroup.className = 'property-group';
        const answerTypeLabel = document.createElement('label');
        answerTypeLabel.textContent = 'Answer Type';
        const answerTypeSelect = document.createElement('select');
        answerTypeSelect.style.width = '100%';
        answerTypeSelect.style.padding = '0.5rem';
        answerTypeSelect.style.border = '1px solid #ddd';
        answerTypeSelect.style.borderRadius = '4px';
        
        const answerTypes = [
            { value: 'text', label: 'Text Box' },
            { value: 'radio', label: 'Multiple Choice' },
            { value: 'checkbox', label: 'Checkbox' },
            { value: 'image_click', label: 'Image Click' },
            { value: 'stopwatch', label: 'Stopwatch' }
        ];
        
        answerTypes.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            if (selectedElement.answer_type === option.value) {
                optionEl.selected = true;
            }
            answerTypeSelect.appendChild(optionEl);
        });
        
        answerTypeSelect.onchange = () => {
            const page = currentQuiz.pages[currentPageIndex];
            selectedElement.answer_type = answerTypeSelect.value;
            // Set default options for radio/checkbox
            if (selectedElement.answer_type === 'radio' || selectedElement.answer_type === 'checkbox') {
                if (!selectedElement.options) {
                    selectedElement.options = ['Option 1', 'Option 2', 'Option 3'];
                }
            } else {
                delete selectedElement.options;
            }
            
            // Update child answer_input and answer_display elements
            if (page.elements) {
                page.elements.forEach(el => {
                    if (el.parent_id === selectedElement.id) {
                        if (el.type === 'answer_input') {
                            el.answer_type = selectedElement.answer_type;
                            el.options = selectedElement.options;
                        } else if (el.type === 'answer_display') {
                            el.answer_type = selectedElement.answer_type;
                        }
                    }
                });
            }
            
            renderProperties(); // Re-render to show/hide options
            renderCanvas(); // Re-render canvas to show updated answer input
            autosaveQuiz();
        };
        
        answerTypeGroup.appendChild(answerTypeLabel);
        answerTypeGroup.appendChild(answerTypeSelect);
        container.appendChild(answerTypeGroup);

        // Options for radio/checkbox
        if (selectedElement.answer_type === 'radio' || selectedElement.answer_type === 'checkbox') {
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'property-group';
            optionsDiv.innerHTML = '<label>Options (one per line)</label>';
            const textarea = document.createElement('textarea');
            textarea.value = (selectedElement.options || []).join('\n');
            textarea.rows = 5;
            textarea.style.width = '100%';
            textarea.style.padding = '0.5rem';
            textarea.style.border = '1px solid #ddd';
            textarea.style.borderRadius = '4px';
            textarea.onchange = () => {
                const page = currentQuiz.pages[currentPageIndex];
                selectedElement.options = textarea.value.split('\n').filter(o => o.trim());
                
                // Update child answer elements' options
                if (page.elements) {
                    page.elements.forEach(el => {
                        if (el.parent_id === selectedElement.id && (el.type === 'answer_input' || el.type === 'answer_display')) {
                            el.options = selectedElement.options;
                        }
                    });
                }
                
                renderCanvas(); // Re-render to update child elements
                autosaveQuiz();
            };
            optionsDiv.appendChild(textarea);
            container.appendChild(optionsDiv);
        }
    }
    } // End if statement for display view elements
    
    // Audio controls for audio/video elements (only on display view)
    if ((selectedElement.view === 'display' || !selectedElement.view) && 
        (selectedElement.type === 'audio' || selectedElement.media_type === 'audio' || 
         selectedElement.type === 'video' || selectedElement.media_type === 'video')) {
        const audioGroup = document.createElement('div');
        audioGroup.className = 'property-group';
        audioGroup.style.marginTop = '1rem';
        audioGroup.style.paddingTop = '1rem';
        audioGroup.style.borderTop = '1px solid #eee';
        
        const audioLabel = document.createElement('label');
        audioLabel.textContent = 'Audio Controls';
        audioLabel.style.display = 'block';
        audioLabel.style.marginBottom = '0.5rem';
        audioLabel.style.fontWeight = '500';
        audioGroup.appendChild(audioLabel);
        
        const audioContainer = document.createElement('div');
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = selectedElement.src || (selectedElement.filename ? '/api/media/serve/' + selectedElement.filename : '');
        audio.style.width = '100%';
        audioContainer.appendChild(audio);
        audioGroup.appendChild(audioContainer);
        container.appendChild(audioGroup);
    }
    
    // Delete button
    const deleteGroup = document.createElement('div');
    deleteGroup.className = 'property-group';
    deleteGroup.style.marginTop = '1rem';
    deleteGroup.style.paddingTop = '1rem';
    deleteGroup.style.borderTop = '2px solid #eee';
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete Element';
    deleteButton.className = 'btn';
    deleteButton.style.width = '100%';
    deleteButton.style.padding = '0.75rem';
    deleteButton.style.backgroundColor = '#dc3545';
    deleteButton.style.color = 'white';
    deleteButton.style.border = 'none';
    deleteButton.style.borderRadius = '4px';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.fontWeight = 'bold';
    deleteButton.addEventListener('mouseenter', () => {
        deleteButton.style.backgroundColor = '#c82333';
    });
    deleteButton.addEventListener('mouseleave', () => {
        deleteButton.style.backgroundColor = '#dc3545';
    });
    deleteButton.addEventListener('click', () => {
        deleteSelectedElement();
    });
    deleteGroup.appendChild(deleteButton);
    container.appendChild(deleteGroup);
}

function renderAppearanceProperties(container) {
    const page = currentQuiz.pages[currentPageIndex];
    if (!page || !page.elements) {
        container.innerHTML = '<p>No elements on this page</p>';
        return;
    }
    
    // Initialize appearance_order if it doesn't exist
    if (!page.appearance_order) {
        // Create initial order from display view elements (creation order)
        page.appearance_order = page.elements
            .filter(el => (!el.view || el.view === 'display') && 
                    el.type !== 'navigation_control' && 
                    el.type !== 'audio_control' && 
                    el.type !== 'answer_input' && 
                    el.type !== 'answer_display')
            .map(el => el.id);
    }
    
    // Get elements in appearance order
    const orderedElements = page.appearance_order
        .map(id => page.elements.find(el => el.id === id))
        .filter(el => el && (!el.view || el.view === 'display') && 
                el.type !== 'navigation_control' && 
                el.type !== 'audio_control' && 
                el.type !== 'answer_input' && 
                el.type !== 'answer_display');
    
    // Add any missing elements to the end
    const missingElements = page.elements.filter(el => 
        (!el.view || el.view === 'display') && 
        el.type !== 'navigation_control' && 
        el.type !== 'audio_control' && 
        el.type !== 'answer_input' && 
        el.type !== 'answer_display' &&
        !page.appearance_order.includes(el.id)
    );
    missingElements.forEach(el => {
        page.appearance_order.push(el.id);
        orderedElements.push(el);
    });
    
    // Create element list container
    const listContainer = document.createElement('div');
    listContainer.className = 'appearance-list';
    listContainer.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; max-height: 500px; overflow-y: auto;';
    
    // Generate unique names for elements
    const typeCounts = {};
    const elementNames = {};
    orderedElements.forEach(el => {
        const type = el.type || 'element';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        elementNames[el.id] = type + (typeCounts[type] || 1);
    });
    
    orderedElements.forEach((element, index) => {
        const item = document.createElement('div');
        item.className = 'appearance-item';
        item.dataset.elementId = element.id;
        item.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: move;';
        item.draggable = true;
        
        // Drag handle icon
        const dragHandle = document.createElement('span');
        dragHandle.textContent = '☰';
        dragHandle.style.cssText = 'cursor: move; color: #999; font-size: 1.2rem;';
        item.appendChild(dragHandle);
        
        // Element name container
        const nameContainer = document.createElement('div');
        nameContainer.style.cssText = 'flex: 1; display: flex; align-items: center; gap: 0.5rem;';
        
        // Element name (editable)
        const nameSpan = document.createElement('span');
        const displayName = element.appearance_name || elementNames[element.id] || element.type || 'element';
        nameSpan.textContent = displayName;
        nameSpan.style.cssText = 'flex: 1; font-weight: 500;';
        nameSpan.addEventListener('mouseenter', () => {
            // Highlight element on canvas with a subtle orange glow
            const canvasEl = document.getElementById(`element-${element.id}`);
            if (canvasEl) {
                // Store original box shadow if it exists
                if (!canvasEl.dataset.originalBoxShadow) {
                    canvasEl.dataset.originalBoxShadow = canvasEl.style.boxShadow || 'none';
                }
                // Apply glow effect
                canvasEl.style.boxShadow = '0 0 15px rgba(255, 165, 0, 0.7), 0 0 25px rgba(255, 165, 0, 0.5), 0 0 35px rgba(255, 165, 0, 0.3)';
                canvasEl.style.transition = 'box-shadow 0.2s ease';
                // Add a subtle outline for extra visibility (doesn't interfere with existing borders)
                canvasEl.style.outline = '2px solid rgba(255, 165, 0, 0.9)';
                canvasEl.style.outlineOffset = '3px';
            }
        });
        nameSpan.addEventListener('mouseleave', () => {
            // Remove highlight and restore original styles
            const canvasEl = document.getElementById(`element-${element.id}`);
            if (canvasEl && canvasEl !== document.getElementById(`element-${selectedElement?.id}`)) {
                // Restore original box shadow
                const originalBoxShadow = canvasEl.dataset.originalBoxShadow;
                canvasEl.style.boxShadow = originalBoxShadow === 'none' ? '' : originalBoxShadow;
                canvasEl.style.outline = '';
                canvasEl.style.outlineOffset = '';
            }
        });
        nameContainer.appendChild(nameSpan);
        
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️';
        editBtn.title = 'Edit name';
        editBtn.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 3px; font-size: 0.9rem; flex-shrink: 0;';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            // Replace span with input
            const input = document.createElement('input');
            input.type = 'text';
            input.value = element.appearance_name || elementNames[element.id] || element.type || 'element';
            input.style.cssText = 'flex: 1; padding: 0.25rem; border: 1px solid #2196F3; border-radius: 3px; font-size: 0.9rem; font-weight: 500;';
            input.onblur = () => {
                const newName = input.value.trim();
                if (newName) {
                    element.appearance_name = newName;
                    nameSpan.textContent = newName;
                } else {
                    // If empty, remove custom name and use default
                    delete element.appearance_name;
                    nameSpan.textContent = elementNames[element.id] || element.type || 'element';
                }
                nameContainer.replaceChild(nameSpan, input);
                editBtn.style.display = 'block';
                autosaveQuiz();
                // Re-render canvas to update appearance control element with new name
                if (currentView === 'control') {
                    renderCanvas();
                }
            };
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    input.blur(); // This will trigger onblur which saves and updates
                } else if (e.key === 'Escape') {
                    nameContainer.replaceChild(nameSpan, input);
                    editBtn.style.display = 'block';
                }
            };
            nameContainer.replaceChild(input, nameSpan);
            editBtn.style.display = 'none';
            input.focus();
            input.select();
        };
        nameContainer.appendChild(editBtn);
        item.appendChild(nameContainer);
        
        // Appearance mode dropdown
        const modeSelect = document.createElement('select');
        modeSelect.style.cssText = 'padding: 0.25rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem;';
        const modes = [
            { value: 'on_load', label: 'On Load' },
            { value: 'control', label: 'Control' },
            { value: 'global_delay', label: 'Global Delay' },
            { value: 'after_previous', label: 'After Previous' },
            { value: 'local_delay', label: 'Local Delay' }
        ];
        modes.forEach(mode => {
            const option = document.createElement('option');
            option.value = mode.value;
            option.textContent = mode.label;
            // Disable "after_previous" and "local_delay" for the first element
            if (index === 0 && (mode.value === 'after_previous' || mode.value === 'local_delay')) {
                option.disabled = true;
            }
            if ((element.appearance_mode || 'on_load') === mode.value) {
                option.selected = true;
                // If first element has an invalid mode, reset to on_load
                if (index === 0 && (mode.value === 'after_previous' || mode.value === 'local_delay')) {
                    element.appearance_mode = 'on_load';
                    // Find and select the on_load option instead
                    setTimeout(() => {
                        modeSelect.value = 'on_load';
                    }, 0);
                }
            }
            modeSelect.appendChild(option);
        });
        
        // If first element has invalid mode, change it
        if (index === 0 && (element.appearance_mode === 'after_previous' || element.appearance_mode === 'local_delay')) {
            element.appearance_mode = 'on_load';
            modeSelect.value = 'on_load';
            autosaveQuiz();
        }
        
        // Delay input (shown for global_delay and local_delay)
        const delayInput = document.createElement('input');
        delayInput.type = 'number';
        delayInput.min = '0';
        delayInput.step = '0.1';
        delayInput.value = element.appearance_delay || '0';
        delayInput.placeholder = 'Seconds';
        delayInput.style.cssText = 'width: 70px; padding: 0.25rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem; display: ' + 
            ((element.appearance_mode === 'global_delay' || element.appearance_mode === 'local_delay') ? 'block' : 'none') + ';';
        
        modeSelect.onchange = () => {
            // Prevent first element from using after_previous or local_delay
            if (index === 0 && (modeSelect.value === 'after_previous' || modeSelect.value === 'local_delay')) {
                modeSelect.value = element.appearance_mode || 'on_load';
                return;
            }
            element.appearance_mode = modeSelect.value;
            delayInput.style.display = (modeSelect.value === 'global_delay' || modeSelect.value === 'local_delay') ? 'block' : 'none';
            autosaveQuiz();
        };
        
        delayInput.onchange = () => {
            element.appearance_delay = parseFloat(delayInput.value) || 0;
            autosaveQuiz();
        };
        
        // Container for dropdown and delay input
        const controlsContainer = document.createElement('div');
        controlsContainer.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
        controlsContainer.appendChild(modeSelect);
        controlsContainer.appendChild(delayInput);
        item.appendChild(controlsContainer);
        
        // Drag and drop handlers
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index.toString());
            item.classList.add('dragging');
            item.style.opacity = '0.5';
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            item.style.opacity = '1';
        });
        
        listContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const afterElement = getDragAfterElement(listContainer, e.clientY);
            const draggingItem = listContainer.querySelector('.dragging');
            if (draggingItem) {
                if (afterElement == null) {
                    listContainer.appendChild(draggingItem);
                } else {
                    listContainer.insertBefore(draggingItem, afterElement);
                }
            }
        });
        
        listContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const draggingItem = listContainer.querySelector('.dragging');
            if (draggingItem) {
                draggingItem.classList.remove('dragging');
                const items = Array.from(listContainer.querySelectorAll('.appearance-item'));
                const newIndex = items.indexOf(draggingItem);
                
                if (draggedIndex !== newIndex && draggedIndex >= 0 && newIndex >= 0) {
                    // Reorder appearance_order array
                    const [moved] = page.appearance_order.splice(draggedIndex, 1);
                    page.appearance_order.splice(newIndex, 0, moved);
                    autosaveQuiz();
                    renderProperties(); // Re-render to update order
                }
            }
        });
        
        listContainer.appendChild(item);
    });
    
    container.appendChild(listContainer);
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.appearance-item:not(.dragging)')];
    
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

function addPropertyInput(container, label, value, onChange) {
    const group = document.createElement('div');
    group.className = 'property-group';
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value;
    input.onchange = () => onChange(input.value);
    group.appendChild(labelEl);
    group.appendChild(input);
    container.appendChild(group);
}

function addPropertyTextarea(container, label, value, onChange) {
    const group = document.createElement('div');
    group.className = 'property-group';
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.onchange = () => onChange(textarea.value);
    group.appendChild(labelEl);
    group.appendChild(textarea);
    container.appendChild(group);
}

function updateElementDisplay() {
    const el = document.getElementById(`element-${selectedElement.id}`);
    if (el) {
        el.style.left = `${selectedElement.x}px`;
        el.style.top = `${selectedElement.y}px`;
        el.style.width = `${selectedElement.width}px`;
        el.style.height = `${selectedElement.height}px`;
        
        // If in participant view and this is a question element, also update the question container
        if (currentView === 'participant' && selectedElement.is_question) {
            const questionContainer = document.getElementById(`question-${selectedElement.id}`);
            if (questionContainer) {
                const headerOffset = 80;
                questionContainer.style.left = `${selectedElement.x}px`;
                questionContainer.style.top = `${selectedElement.y + headerOffset}px`;
            }
        }
        
        if (selectedElement.type === 'rectangle') {
            el.style.backgroundColor = selectedElement.fill_color || '#ddd';
            el.style.border = `${selectedElement.border_width || 2}px solid ${selectedElement.border_color || '#999'}`;
        } else if (selectedElement.type === 'circle') {
            el.style.backgroundColor = selectedElement.fill_color || '#ddd';
            el.style.border = `${selectedElement.border_width || 2}px solid ${selectedElement.border_color || '#999'}`;
        } else if (selectedElement.type === 'triangle') {
            el.innerHTML = '';
            const triangleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            triangleSvg.setAttribute('width', '100%');
            triangleSvg.setAttribute('height', '100%');
            triangleSvg.setAttribute('viewBox', `0 0 ${selectedElement.width} ${selectedElement.height}`);
            const trianglePath = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            trianglePath.setAttribute('points', `${selectedElement.width/2},0 ${selectedElement.width},${selectedElement.height} 0,${selectedElement.height}`);
            trianglePath.setAttribute('fill', selectedElement.fill_color || '#ddd');
            trianglePath.setAttribute('stroke', selectedElement.border_color || '#999');
            trianglePath.setAttribute('stroke-width', selectedElement.border_width || 2);
            triangleSvg.appendChild(trianglePath);
            el.appendChild(triangleSvg);
            el.style.border = 'none';
        } else if (selectedElement.type === 'arrow') {
            el.innerHTML = '';
            const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            arrowSvg.setAttribute('width', '100%');
            arrowSvg.setAttribute('height', '100%');
            arrowSvg.setAttribute('viewBox', `0 0 ${selectedElement.width} ${selectedElement.height}`);
            
            const arrowHeadLength = selectedElement.arrow_head_length || Math.min(selectedElement.width, selectedElement.height) * 0.3;
            const arrowBodyThickness = selectedElement.arrow_body_thickness || Math.min(selectedElement.width, selectedElement.height) * 0.2;
            const arrowBodyWidth = selectedElement.width - arrowHeadLength;
            const bodyTop = (selectedElement.height - arrowBodyThickness) / 2;
            const bodyBottom = bodyTop + arrowBodyThickness;
            
            // Create arrow path: body rectangle + triangle head
            const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            arrowPath.setAttribute('d', `M 0 ${bodyTop} L ${arrowBodyWidth} ${bodyTop} L ${arrowBodyWidth} 0 L ${selectedElement.width} ${selectedElement.height/2} L ${arrowBodyWidth} ${selectedElement.height} L ${arrowBodyWidth} ${bodyBottom} L 0 ${bodyBottom} Z`);
            arrowPath.setAttribute('fill', selectedElement.fill_color || '#ddd');
            arrowPath.setAttribute('stroke', selectedElement.border_color || '#999');
            arrowPath.setAttribute('stroke-width', selectedElement.border_width || 2);
            arrowSvg.appendChild(arrowPath);
            el.appendChild(arrowSvg);
            el.style.border = 'none';
        } else if (selectedElement.type === 'line') {
            el.style.width = `${Math.max(selectedElement.width, selectedElement.height)}px`;
            el.style.height = `${selectedElement.border_width || 2}px`;
            el.style.backgroundColor = selectedElement.fill_color || selectedElement.border_color || '#999';
            el.style.border = 'none';
        } else if (['image', 'video', 'audio'].includes(selectedElement.type)) {
            // No border for media elements
            el.style.border = 'none';
        } else if (selectedElement.type === 'richtext') {
            // Update rich text content immediately
            el.innerHTML = selectedElement.content || '<p>Enter your text here</p>';
            el.style.fontSize = `${selectedElement.font_size || 16}px`;
            el.style.color = selectedElement.text_color || '#000000';
            el.style.backgroundColor = selectedElement.background_color || 'transparent';
        }
        
        // Apply rotation
        if (selectedElement.rotation) {
            if (selectedElement.type === 'line') {
                el.style.transformOrigin = '0 0';
                el.style.transform = `rotate(${selectedElement.rotation}deg)`;
            } else {
                el.style.transform = `rotate(${selectedElement.rotation}deg)`;
                el.style.transformOrigin = 'center center';
            }
        } else {
            el.style.transform = '';
        }
        
        // Update handles
        el.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
        if (el.classList.contains('selected')) {
            if (['rectangle', 'circle', 'triangle', 'arrow', 'line'].includes(selectedElement.type)) {
                Editor.InteractionHandlers.addResizeHandles(el, selectedElement);
                Editor.InteractionHandlers.addRotateHandle(el, selectedElement);
            } else if (['image', 'video', 'audio', 'richtext'].includes(selectedElement.type)) {
                Editor.InteractionHandlers.addResizeHandles(el, selectedElement);
            }
        }
    }
}

// Setup resize functionality for displayable area
function setupDisplayableAreaResize() {
    const wrapper = document.getElementById('displayable-area-wrapper');
    if (!wrapper) return;
    
    let isResizing = false;
    let resizeDirection = null;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    
    const handles = wrapper.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            resizeDirection = handle.dataset.direction;
            startX = e.clientX;
            startY = e.clientY;
            const settings = getCurrentViewSettings();
            startWidth = settings.canvas_width;
            startHeight = settings.canvas_height;
            
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
        });
    });
    
    function handleResize(e) {
        if (!isResizing) return;
        
        const settings = getCurrentViewSettings();
        const zoom = settings.zoom || 100;
        const scale = zoom / 100;
        
        // Account for transform scale when calculating delta
        const deltaX = (e.clientX - startX) / scale;
        const deltaY = (e.clientY - startY) / scale;
        
        let newWidth = startWidth;
        let newHeight = startHeight;
        
        // Calculate new dimensions based on resize direction
        if (resizeDirection.includes('e')) {
            newWidth = Math.max(100, startWidth + deltaX);
        }
        if (resizeDirection.includes('w')) {
            newWidth = Math.max(100, startWidth - deltaX);
        }
        if (resizeDirection.includes('s')) {
            newHeight = Math.max(100, startHeight + deltaY);
        }
        if (resizeDirection.includes('n')) {
            newHeight = Math.max(100, startHeight - deltaY);
        }
        
        // Update settings
        settings.canvas_width = newWidth;
        settings.canvas_height = newHeight;
        
        // Update canvas size
        updateCanvasSize();
        updateScreenSizeControls();
        autosaveQuiz();
    }
    
    function stopResize() {
        isResizing = false;
        resizeDirection = null;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    }
}

// loadQuiz is now handled by Editor.QuizStorage module
// Function removed - using Editor.QuizStorage.loadQuiz instead

// debounce and autosaveQuiz are now handled by modules
// Functions removed - using Editor.Utils.debounce and Editor.QuizStorage.autosaveQuiz instead

// addResizeHandles and addRotateHandle are now in Editor.InteractionHandlers module

// Media modal and properties resize are now handled by modules
// Functions removed - using Editor.MediaModal and Editor.Utils instead

