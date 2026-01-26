// Quiz editor - Main file that coordinates editor modules
let currentQuiz = {
    name: '',
    pages: [],
    background_color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    background_image: null,
    view_settings: {
        display: { zoom: 100 },
        participant: { zoom: 100 },
        control: { zoom: 100 }
    }
};
let currentPageIndex = 0;
let selectedElement = null;
let currentView = 'display'; // 'display', 'participant', or 'control'

// Helper functions to get/set view-specific settings
// Canvas size comes from page.views[view].view_config.size (single source of truth)
// Zoom is stored in view_settings (editor UI state only)
function getViewSettings(view) {
    // Initialize view_settings for zoom (editor UI state only)
    if (!currentQuiz.view_settings) {
        currentQuiz.view_settings = {
            display: { zoom: 100 },
            participant: { zoom: 100 },
            control: { zoom: 100 }
        };
    }
    if (!currentQuiz.view_settings[view]) {
        currentQuiz.view_settings[view] = { zoom: 100 };
    }
    
    // Get canvas size from current page's view_config.size (single source of truth)
    const page = currentQuiz.pages[currentPageIndex];
    let canvasWidth = 1920;
    let canvasHeight = 1080;
    
    if (page && page.views && page.views[view] && page.views[view].view_config && page.views[view].view_config.size) {
        canvasWidth = page.views[view].view_config.size.width || 1920;
        canvasHeight = page.views[view].view_config.size.height || 1080;
    }
    
    // Return combined settings (zoom from view_settings, size from page)
    return {
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
        zoom: currentQuiz.view_settings[view].zoom || 100
    };
}

function getCurrentViewSettings() {
    return getViewSettings(currentView);
}

// Helper to get/set canvas size for current page and view
function getCanvasSize(view) {
    const page = currentQuiz.pages[currentPageIndex];
    if (!page) return { width: 1920, height: 1080 };
    
    if (page.views && page.views[view] && page.views[view].view_config && page.views[view].view_config.size) {
        return {
            width: page.views[view].view_config.size.width || 1920,
            height: page.views[view].view_config.size.height || 1080
        };
    }
    return { width: 1920, height: 1080 };
}

function setCanvasSize(view, width, height) {
    const page = currentQuiz.pages[currentPageIndex];
    if (!page) return;
    
    // Ensure page is in new format
    if (Editor.QuizStructure && Editor.QuizStructure.ensurePageNewFormat) {
        Editor.QuizStructure.ensurePageNewFormat(page);
    }
    
    // Ensure views structure exists
    if (!page.views) {
        page.views = {
            display: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
            participant: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
            control: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} }
        };
    }
    
    if (!page.views[view]) {
        page.views[view] = {
            view_config: {
                background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } },
                size: { width: 1920, height: 1080 }
            },
            local_element_configs: {}
        };
    }
    
    if (!page.views[view].view_config) {
        page.views[view].view_config = {
            background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } },
            size: { width: 1920, height: 1080 }
        };
    }
    
    if (!page.views[view].view_config.size) {
        page.views[view].view_config.size = { width: 1920, height: 1080 };
    }
    
    // Set the canvas size in the page's view_config.size (single source of truth)
    page.views[view].view_config.size.width = parseInt(width) || 1920;
    page.views[view].view_config.size.height = parseInt(height) || 1080;
}

// Helper functions that bridge to modules
function debounce(func, wait) {
    return Editor.Utils.debounce(func, wait);
}

// Cookie helper functions
function setCookie(name, value, days = 365) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// Helper function to get quiz ID (used globally)
function getQuizIdGlobal() {
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('quiz');
    return currentQuiz.id || quizId || urlParams.get('quiz');
}

// Helper function to save current page index to cookie (global scope)
function savePageIndexToCookie() {
    const currentQuizId = getQuizIdGlobal();
    if (currentQuizId && currentQuiz && currentQuiz.pages && currentPageIndex >= 0 && currentPageIndex < currentQuiz.pages.length) {
        setCookie(`editor_page_index_${currentQuizId}`, currentPageIndex.toString());
        return true;
    }
    return false;
}

async function autosaveQuiz() {
    const name = document.getElementById('quiz-name').value.trim();
    await Editor.QuizStorage.autosaveQuiz(currentQuiz, name);
}

// Force save - recreates the save file from scratch
async function forceSaveQuiz() {
    const name = document.getElementById('quiz-name').value.trim();
    if (!name || !name.trim()) {
        alert('Please enter a quiz name before saving.');
        return;
    }
    
    // Ensure quiz is in new format and fully normalized
    if (Editor.QuizStructure && Editor.QuizStructure.ensureQuizNewFormat) {
        currentQuiz = Editor.QuizStructure.ensureQuizNewFormat(currentQuiz);
    }
    
    // Ensure all pages are normalized
    if (currentQuiz.pages && Array.isArray(currentQuiz.pages)) {
        currentQuiz.pages = currentQuiz.pages.map((page, index) => {
            if (Editor.QuizStructure && Editor.QuizStructure.ensurePageNewFormat) {
                return Editor.QuizStructure.ensurePageNewFormat(page, index);
            }
            return page;
        });
    }
    
    // Force save with recreation flag
    await Editor.QuizStorage.forceSaveQuiz(currentQuiz, name);
}

// Update element properties in quiz structure
function updateElementPropertiesInQuiz(element) {
    if (!element || !element.id) return;
    
    const page = currentQuiz.pages[currentPageIndex];
    if (!page || !page.elements || !page.elements[element.id]) return;
    
    // Ensure page is in new format
    if (Editor.QuizStructure && Editor.QuizStructure.ensurePageNewFormat) {
        Editor.QuizStructure.ensurePageNewFormat(page);
    }
    
    const elementData = page.elements[element.id];
    if (!elementData.properties) {
        elementData.properties = {};
    }
    
    // Update element_name directly on elementData (not in properties)
    if (element.hasOwnProperty('element_name')) {
        elementData.element_name = element.element_name;
    }
    
    // Update media_config directly on elementData (not in properties)
    if (element.hasOwnProperty('media_config')) {
        elementData.media_config = element.media_config;
    }
    
    // Update properties that are stored in elementData.properties
    // These are properties that are not position/size/rotation (which go in view configs)
    // Note: For richtext, formatting (font size, font family, colors, etc.) is stored in the HTML content itself
    const propertyKeys = [
        'fill_color', 'border_color', 'border_width', 'arrow_body_thickness', 'arrow_head_length',
        'content', 'background_color', 'text_align_vertical', 'text_align_horizontal', // alignment properties are container-level
        'media_type', 'media_url', 'file_name', 'src', 'filename'
    ];
    
    propertyKeys.forEach(key => {
        if (element.hasOwnProperty(key)) {
            elementData.properties[key] = element[key];
        }
    });
    
    // For counter elements, copy all properties from element.properties to elementData.properties
    if (element.type === 'counter' && element.properties) {
        Object.assign(elementData.properties, element.properties);
    }
    
    // Update question_config if element has it
    if (element.hasOwnProperty('question_config') && element.question_config) {
        if (!elementData.question_config) {
            elementData.question_config = {};
        }
        // Merge question_config properties (don't replace entire object to preserve other properties)
        Object.assign(elementData.question_config, element.question_config);
    }
}

// Update element position/size in quiz structure
function updateElementConfigInQuiz(element) {
    if (!element || !element.id) return;
    
    const page = currentQuiz.pages[currentPageIndex];
    if (!page) return;
    
    // Ensure page is in new format
    if (Editor.QuizStructure && Editor.QuizStructure.ensurePageNewFormat) {
        Editor.QuizStructure.ensurePageNewFormat(page);
    }
    
    // Handle child elements (answer_input, answer_display, audio_control) - update parent's view config
    if (element.parent_id) {
        const parentId = element.parent_id;
        const parentElementData = page.elements[parentId];
        if (!parentElementData) return;
        
        // Ensure views structure exists
        if (!page.views) {
            page.views = {
                display: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                participant: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                control: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} }
            };
        }
        
        // Update parent element's view config with child element position
        if (element.type === 'answer_input' && element.view === 'participant') {
            const view = page.views.participant;
            if (!view.local_element_configs[parentId]) {
                view.local_element_configs[parentId] = { config: {} };
            }
            if (!view.local_element_configs[parentId].answer_input_config) {
                view.local_element_configs[parentId].answer_input_config = {};
            }
            
            // Get default dimensions based on question type
            const parentElement = page.elements && page.elements[parentId];
            const questionType = (parentElement && parentElement.question_config && parentElement.question_config.question_type) || 
                               (parentElement && parentElement.answer_type) || 
                               (element.question_type || element.answer_type) || 'text';
            function getDefaultAnswerInputDimensions(answerType) {
                if (answerType === 'stopwatch') {
                    return { width: 370, height: 120 };
                }
                // Default for other types
                return { width: 380, height: 175 };
            }
            const defaultDims = getDefaultAnswerInputDimensions(questionType);
            
            // Save coordinates as absolute pixel values from top-left corner of canvas (0,0 = top-left)
            // Use explicit values from element, only use defaults if value is undefined/null
            view.local_element_configs[parentId].answer_input_config.x = (element.x !== undefined && element.x !== null) ? element.x : 5;
            view.local_element_configs[parentId].answer_input_config.y = (element.y !== undefined && element.y !== null) ? element.y : 0;
            view.local_element_configs[parentId].answer_input_config.width = (element.width !== undefined && element.width !== null) ? element.width : defaultDims.width;
            view.local_element_configs[parentId].answer_input_config.height = (element.height !== undefined && element.height !== null) ? element.height : defaultDims.height;
            view.local_element_configs[parentId].answer_input_config.rotation = (element.rotation !== undefined && element.rotation !== null) ? element.rotation : 0;
        } else if (element.type === 'answer_display' && element.view === 'control') {
            const view = page.views.control;
            if (!view.local_element_configs[parentId]) {
                view.local_element_configs[parentId] = { config: {} };
            }
            if (!view.local_element_configs[parentId].answer_display_config) {
                view.local_element_configs[parentId].answer_display_config = {};
            }
            // Save coordinates as absolute pixel values from top-left corner of canvas (0,0 = top-left)
            // Use explicit values from element, only use defaults if value is undefined/null
            view.local_element_configs[parentId].answer_display_config.x = (element.x !== undefined && element.x !== null) ? element.x : 0;
            view.local_element_configs[parentId].answer_display_config.y = (element.y !== undefined && element.y !== null) ? element.y : 0;
            view.local_element_configs[parentId].answer_display_config.width = (element.width !== undefined && element.width !== null && element.width > 0) ? element.width : 600;
            view.local_element_configs[parentId].answer_display_config.height = (element.height !== undefined && element.height !== null && element.height > 0) ? element.height : 300;
            view.local_element_configs[parentId].answer_display_config.rotation = (element.rotation !== undefined && element.rotation !== null) ? element.rotation : 0;
        } else if (element.type === 'audio_control' && element.view === 'control') {
            const view = page.views.control;
            if (!view.local_element_configs[parentId]) {
                view.local_element_configs[parentId] = { config: {} };
            }
            if (!view.local_element_configs[parentId].control_config) {
                view.local_element_configs[parentId].control_config = {};
            }
            // Save coordinates as absolute pixel values from top-left corner of canvas (0,0 = top-left)
            view.local_element_configs[parentId].control_config.x = element.x || 0;
            view.local_element_configs[parentId].control_config.y = element.y || 0;
            view.local_element_configs[parentId].control_config.width = element.width || 400;
            view.local_element_configs[parentId].control_config.height = element.height || 80;
            view.local_element_configs[parentId].control_config.rotation = element.rotation || 0;
        }
        return; // Child elements don't have their own entries
    }
    
    // Handle main elements (not child elements)
    // Get the element's view (default to current view if not specified)
    const elementView = element.view || currentView;
    
    // Ensure views structure exists
    if (!page.views) {
        page.views = {
            display: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
            participant: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
            control: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} }
        };
    }
    
    const view = page.views[elementView];
    if (!view) {
        page.views[elementView] = {
            view_config: {
                background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } },
                size: { width: 1920, height: 1080 }
            },
            local_element_configs: {}
        };
    }
    
    if (!view.local_element_configs) {
        view.local_element_configs = {};
    }
    
    // Update the element's config in the view
    if (!view.local_element_configs[element.id]) {
        view.local_element_configs[element.id] = {};
    }
    
    const localConfig = view.local_element_configs[element.id];
    
    // For display view, use simple config
    if (elementView === 'display') {
        if (!localConfig.config) {
            localConfig.config = {};
        }
        localConfig.config.x = element.x || 0;
        localConfig.config.y = element.y || 0;
        localConfig.config.width = element.width || 100;
        localConfig.config.height = element.height || 100;
        localConfig.config.rotation = element.rotation || 0;
    } else if (elementView === 'participant') {
        // For participant view, only questions have configs
        if (element.is_question) {
            if (!localConfig.config) {
                localConfig.config = {};
            }
            localConfig.config.x = element.x || 0;
            localConfig.config.y = element.y || 0;
            localConfig.config.width = element.width || 100;
            localConfig.config.height = element.height || 100;
            localConfig.config.rotation = element.rotation || 0;
        }
    } else if (elementView === 'control') {
        // For control view, handle appearance_control as special case (appearance_control_modal)
        if (element.type === 'appearance_control') {
            // Save to appearance_control_modal (special key, not in local_element_configs)
            if (!view.appearance_control_modal) {
                view.appearance_control_modal = {};
            }
            view.appearance_control_modal.x = element.x || 50;
            view.appearance_control_modal.y = element.y || 100;
            view.appearance_control_modal.width = element.width || 400;
            view.appearance_control_modal.height = element.height || 300;
            view.appearance_control_modal.rotation = element.rotation || 0;
        } else {
            // For control view, questions have config (only position/size)
            const elementData = page.elements[element.id];
            if (elementData && elementData.is_question) {
                if (!localConfig.config) {
                    localConfig.config = {};
                }
                localConfig.config.x = element.x || 0;
                localConfig.config.y = element.y || 0;
                localConfig.config.width = element.width || 600;
                localConfig.config.height = element.height || 300;
                localConfig.config.rotation = element.rotation || 0;
            }
        }
    }
}

async function loadQuiz(quizId) {
    const quiz = await Editor.QuizStorage.loadQuiz(quizId);
    if (quiz) {
        currentQuiz = quiz;
        // Always ensure the ID matches the quizId parameter
        currentQuiz.id = quizId;
        
        // Ensure all pages are in new format
        if (Editor.QuizStructure && Editor.QuizStructure.ensurePageNewFormat) {
            currentQuiz.pages = currentQuiz.pages.map(page => 
                Editor.QuizStructure.ensurePageNewFormat(page)
            );
        }
        
        // Initialize view_settings for zoom only (if not exists)
        if (!currentQuiz.view_settings) {
            currentQuiz.view_settings = {
                display: { zoom: 100 },
                participant: { zoom: 100 },
                control: { zoom: 100 }
            };
        }
        document.getElementById('quiz-name').value = currentQuiz.name;
        
        // Restore saved page index for this quiz from cookie
        const savedPageIndex = getCookie(`editor_page_index_${quizId}`);
        if (savedPageIndex !== null) {
            const pageIndex = parseInt(savedPageIndex, 10);
            if (!isNaN(pageIndex) && pageIndex >= 0 && pageIndex < currentQuiz.pages.length) {
                currentPageIndex = pageIndex;
            } else {
                currentPageIndex = 0;
            }
        } else {
            currentPageIndex = 0;
        }
        
        // Restore saved view for this quiz from cookie
        const savedView = getCookie(`editor_active_view_${quizId}`);
        if (savedView && (savedView === 'display' || savedView === 'participant' || savedView === 'control')) {
            currentView = savedView;
        }
        
        // Don't render here - let the initialization code handle it after quiz is fully loaded
        // This ensures the page index is properly restored before rendering
        return Promise.resolve();
    }
    return Promise.resolve();
}

function updateCanvasSize(skipZoom) {
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
    // Apply zoom after setting size (unless skipZoom is true, e.g., when called from renderCanvas)
    if (!skipZoom) {
        Editor.ZoomControls.applyZoom(settings.zoom);
    }
}

// Zoom functions now in Editor.ZoomControls module
function applyZoom(zoomPercent) {
    Editor.ZoomControls.applyZoom(zoomPercent);
}

function zoomIn() {
    Editor.ZoomControls.zoomIn();
}

function zoomOut() {
    Editor.ZoomControls.zoomOut();
}

function zoomFit() {
    Editor.ZoomControls.zoomFit();
}

function zoomReset() {
    Editor.ZoomControls.zoomReset();
}

function renderSidebarZoomControls() {
    Editor.ZoomControls.renderSidebarZoomControls(currentView);
}

// Canvas size functions now in Editor.CanvasSizeControls module
function updateScreenSizeControls() {
    // Safety check: ensure module is loaded and initialized
    if (!Editor || !Editor.CanvasSizeControls || typeof Editor.CanvasSizeControls.updateScreenSizeControls !== 'function') {
        console.warn('CanvasSizeControls module not ready, skipping updateScreenSizeControls');
        return;
    }
    
    // Chrome-specific: Use requestAnimationFrame to ensure DOM is fully ready
    // This helps with Chrome's faster execution timing
    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
            try {
                Editor.CanvasSizeControls.updateScreenSizeControls(currentView);
            } catch (error) {
                console.error('Error in updateScreenSizeControls:', error);
                // Fallback: try again after a short delay
                setTimeout(() => {
                    try {
                        Editor.CanvasSizeControls.updateScreenSizeControls(currentView);
                    } catch (retryError) {
                        console.error('Error in updateScreenSizeControls (retry):', retryError);
                    }
                }, 100);
            }
        });
    } else {
        // Fallback for browsers without requestAnimationFrame
        try {
            Editor.CanvasSizeControls.updateScreenSizeControls(currentView);
        } catch (error) {
            console.error('Error in updateScreenSizeControls:', error);
        }
    }
}

function applyCanvasSize(width, height) {
    // Safety check: ensure module is loaded and initialized
    if (!Editor || !Editor.CanvasSizeControls || typeof Editor.CanvasSizeControls.applyCanvasSize !== 'function') {
        console.warn('CanvasSizeControls module not ready, skipping applyCanvasSize');
        return;
    }
    try {
        Editor.CanvasSizeControls.applyCanvasSize(width, height);
    } catch (error) {
        console.error('Error in applyCanvasSize:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Ensure Editor namespace exists
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    // Handle paste events for images at document level (works even when displayable area doesn't have focus)
    // This must run BEFORE the keyboard handler to prioritize image paste over element paste
    document.addEventListener('paste', async (e) => {
        // Only handle if we're in the editor
        const displayableArea = document.getElementById('displayable-area');
        if (!displayableArea) return;
        
        // Check if we're on a status/result page
        const currentPage = currentQuiz.pages[currentPageIndex];
        const isStatusOrResultPage = currentPage && 
            (currentPage.page_type === 'status_page' || currentPage.page_type === 'result_page');
        
        if (isStatusOrResultPage) {
            return; // Don't paste on status/result pages
        }
        
        // Only handle paste if we're in display view
        if (currentView !== 'display') {
            return;
        }
        
        // Don't handle if user is typing in an input field
        const target = e.target;
        const isInputField = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' ||
                            target.isContentEditable;
        
        if (isInputField) {
            return; // Let the input field handle it
        }
        
        // UNIFIED CLIPBOARD: Check both internal element copy and external clipboard
        // Determine which was copied most recently using timestamps
        const items = e.clipboardData?.items;
        let imageFile = null;
        const now = Date.now();
        
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    imageFile = items[i].getAsFile();
                    // Track when we detect an image in clipboard
                    // If this is the first time we see it, or it's been a while, assume it's new
                    if (Editor.CopyPaste) {
                        const timeSinceLastDetection = now - (Editor.CopyPaste.clipboardImageDetectedAt || 0);
                        // If we haven't seen an image recently (more than 1 second), assume it's a new copy
                        if (timeSinceLastDetection > 1000) {
                            Editor.CopyPaste.clipboardImageDetectedAt = now;
                        }
                    }
                    break;
                }
            }
        }
        
        const hasCopiedElement = Editor.CopyPaste && Editor.CopyPaste.hasCopiedElement();
        const elementCopyTime = Editor.CopyPaste?.lastCopiedTimestamp || 0;
        const imageDetectedTime = Editor.CopyPaste?.clipboardImageDetectedAt || 0;
        const lastCopyWasElement = Editor.CopyPaste?.lastCopiedType === 'element';
        
        // Determine which to paste based on temporal priority
        // Priority: If element was copied recently (within last 5 seconds), it's the most recent action
        // Otherwise, if image exists in clipboard, use that
        let shouldPasteElement = false;
        let shouldPasteImage = false;
        
        const timeSinceElementCopy = now - elementCopyTime;
        const RECENT_COPY_THRESHOLD = 5000; // 5 seconds - if element was copied within this time, it's recent
        
        if (hasCopiedElement && imageFile) {
            // Both exist - if element was copied recently, prioritize it
            // Otherwise, assume image is what user wants (it's in clipboard now)
            if (lastCopyWasElement && timeSinceElementCopy < RECENT_COPY_THRESHOLD) {
                // Element was copied recently, so it's the most recent action
                shouldPasteElement = true;
            } else {
                // Element is old or wasn't the last copy type, so image is what user wants
                shouldPasteImage = true;
            }
        } else if (hasCopiedElement && lastCopyWasElement) {
            // Only element exists
            shouldPasteElement = true;
        } else if (imageFile) {
            // Only image exists
            shouldPasteImage = true;
        }
        
        // Paste element if it's the most recent
        if (shouldPasteElement) {
            e.preventDefault();
            e.stopPropagation();
            
            // Get paste position (center of displayable area or mouse position if available)
            const rect = displayableArea.getBoundingClientRect();
            let pasteX = rect.width / 2;
            let pasteY = rect.height / 2;
            
            // Use selected element position if available
            if (selectedElement) {
                pasteX = (selectedElement.x || 0) + 10;
                pasteY = (selectedElement.y || 0) + 10;
            }
            
            if (Editor.CopyPaste.pasteElement) {
                Editor.CopyPaste.pasteElement(
                    pasteX, pasteY,
                    () => currentQuiz,
                    () => currentPageIndex,
                    () => currentView,
                    renderCanvas,
                    selectElement,
                    autosaveQuiz
                );
            }
            return; // Exit early - element paste handled
        }
        
        // Paste image if it's the most recent
        if (shouldPasteImage) {
            // Image found in clipboard - track it for temporal comparison
            e.preventDefault();
            e.stopPropagation();
            
            // Track that an image was detected/pasted (for temporal tracking)
            if (Editor.CopyPaste) {
                Editor.CopyPaste.lastCopiedType = 'image';
                Editor.CopyPaste.lastCopiedTimestamp = Editor.CopyPaste.clipboardImageDetectedAt || Date.now();
            }
            
            // Get paste position (center of displayable area)
            const rect = displayableArea.getBoundingClientRect();
            let pasteX = rect.width / 2;
            let pasteY = rect.height / 2;
            
            // Upload the image
            if (Editor.MediaModal && Editor.MediaModal.uploadMediaFile) {
                const result = await Editor.MediaModal.uploadMediaFile(imageFile, 'image');
                if (result && result.success) {
                    // Create media element with the uploaded image
                    const img = new Image();
                    img.onload = () => {
                        const element = {
                            id: `element-${Date.now()}`,
                            type: 'image',
                            media_type: 'image',
                            view: 'display',
                            x: pasteX - img.naturalWidth / 2, // Center the image
                            y: pasteY - img.naturalHeight / 2,
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                            visible: true,
                            is_question: false,
                            answer_type: 'text',
                            src: `/api/media/serve/${result.filename}`,
                            filename: result.filename
                        };
                        
                        // Use QuizStructure helper to add element
                        if (Editor.QuizStructure && Editor.QuizStructure.setPageElement) {
                            const currentPage = currentQuiz.pages[currentPageIndex];
                            const updatedPage = Editor.QuizStructure.setPageElement(currentPage, element);
                            if (currentQuiz && currentQuiz.pages && currentQuiz.pages[currentPageIndex] === currentPage) {
                                currentQuiz.pages[currentPageIndex] = updatedPage;
                            }
                            
                            // Audio/video elements are controlled via play/pause button in visibility panel
                            // No separate control element needed
                        }
                        
                        // Render the canvas and select the new element
                        renderCanvas();
                        selectElement(element);
                        autosaveQuiz();
                    };
                    img.onerror = () => {
                        // Fallback to default size if image fails to load
                        const element = {
                            id: `element-${Date.now()}`,
                            type: 'image',
                            media_type: 'image',
                            view: 'display',
                            x: pasteX - 100,
                            y: pasteY - 75,
                            width: 200,
                            height: 150,
                            visible: true,
                            is_question: false,
                            answer_type: 'text',
                            src: `/api/media/serve/${result.filename}`,
                            filename: result.filename
                        };
                        
                        // Use QuizStructure helper to add element
                        if (Editor.QuizStructure && Editor.QuizStructure.setPageElement) {
                            const currentPage = currentQuiz.pages[currentPageIndex];
                            const updatedPage = Editor.QuizStructure.setPageElement(currentPage, element);
                            if (currentQuiz && currentQuiz.pages && currentQuiz.pages[currentPageIndex] === currentPage) {
                                currentQuiz.pages[currentPageIndex] = updatedPage;
                            }
                            
                            // Audio/video elements are controlled via play/pause button in visibility panel
                            // No separate control element needed
                        }
                        
                        renderCanvas();
                        selectElement(element);
                        autosaveQuiz();
                    };
                img.src = `/api/media/serve/${result.filename}`;
                } else {
                    alert('Failed to upload pasted image');
                }
            }
            return; // Exit early - image paste handled
        }
        
        // No image in clipboard and no element was copied - nothing to paste
    });
    
    // Initialize context menu
    if (Editor.ContextMenu && Editor.ContextMenu.init) {
        Editor.ContextMenu.init();
    }
    
    // Create global function for showing context menu (used by element renderer)
    window.showElementContextMenu = function(event, element) {
        if (Editor.ContextMenu && Editor.ContextMenu.show) {
            Editor.ContextMenu.show(
                event,
                element,
                () => currentQuiz,
                () => currentPageIndex,
                () => currentView,
                renderCanvas,
                autosaveQuiz
            );
        }
    };
    
    // Initialize interaction handlers
    if (Editor.InteractionHandlers && Editor.InteractionHandlers.init) {
        Editor.InteractionHandlers.init(
            autosaveQuiz, 
            updateElementDisplay, 
            updateElementConfigInQuiz, 
            getCurrentViewSettings,
            () => selectedElement,  // getSelectedElement callback
            renderProperties  // renderProperties callback
        );
    }
    
    // Initialize element renderer
    if (Editor.ElementRenderer && Editor.ElementRenderer.init) {
        Editor.ElementRenderer.init(
            selectElement,
            () => currentQuiz,
            () => currentPageIndex,
            getCurrentViewSettings
        );
    }
    
    // Initialize zoom controls
    if (Editor.ZoomControls && Editor.ZoomControls.init) {
        Editor.ZoomControls.init(
            getCurrentViewSettings,
            updateCanvasSize,
            autosaveQuiz
        );
    }
    
    // Initialize canvas size controls
    if (Editor.CanvasSizeControls && Editor.CanvasSizeControls.init) {
        Editor.CanvasSizeControls.init(
            getCurrentViewSettings,
            updateCanvasSize,
            autosaveQuiz,
            () => currentQuiz,
            () => currentPageIndex,
            () => currentView
        );
    }
    
    // Initialize undo-redo manager
    if (Editor.UndoRedo && Editor.UndoRedo.init) {
        Editor.UndoRedo.init(
            () => currentQuiz,
            () => currentPageIndex,
            () => currentView,
            renderCanvas,
            autosaveQuiz,
            () => selectedElement,
            selectElement
        );
    }
    
    // Initialize element selection
    if (Editor.ElementSelection && Editor.ElementSelection.init) {
        Editor.ElementSelection.init(
            () => selectedElement,
            (element) => { selectedElement = element; },
            renderProperties,
            renderCanvas,
            autosaveQuiz
        );
    }
    
    // Initialize canvas renderer
    if (Editor.CanvasRenderer && Editor.CanvasRenderer.init) {
        Editor.CanvasRenderer.init(
            () => currentQuiz,
            () => currentPageIndex,
            () => currentView,
            updateCanvasSize,
            selectElement,
            autosaveQuiz,
            renderProperties
        );
    }
    
    // Initialize properties panel
    if (Editor.PropertiesPanel && Editor.PropertiesPanel.init) {
        Editor.PropertiesPanel.init(
            () => selectedElement,
            () => currentQuiz,
            () => currentPageIndex,
            () => currentView,
            updateElementDisplay,
            autosaveQuiz,
            renderPages,
            renderCanvas,
            getCurrentViewSettings,
            applyCanvasSize,
            debounce,
            deleteSelectedElement,
            updateElementPropertiesInQuiz,
            updateElementConfigInQuiz
        );
    }
    
    // Load quiz if editing (using ID from URL parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('quiz');
    
    // Helper function to get quiz ID (used in callbacks)
    const getQuizId = () => {
        return currentQuiz.id || quizId || urlParams.get('quiz');
    };
    
    // Initialize view restoration (will be applied after quiz loads if needed)
    const canvasTabs = document.querySelectorAll('.canvas-tab');
    
    // Function to restore view UI
    const restoreViewUI = () => {
        // Restore saved view on page load (after quiz is loaded)
        // This will be set from loadQuiz if a quiz is loaded, otherwise use global saved view
        const currentQuizId = getQuizId();
        let savedView = null;
        if (currentQuizId) {
            // Use quiz-specific saved view from cookie
            savedView = getCookie(`editor_active_view_${currentQuizId}`);
        }
        // Fallback to global saved view from cookie if no quiz-specific one exists
        if (!savedView) {
            savedView = getCookie('editor_active_view');
        }
        
        if (savedView && (savedView === 'display' || savedView === 'participant' || savedView === 'control')) {
            const savedViewTab = document.querySelector(`[data-view="${savedView}"]`);
            if (savedViewTab) {
                // Remove active from all tabs
                canvasTabs.forEach(t => t.classList.remove('active'));
                // Set active on saved view tab
                savedViewTab.classList.add('active');
                currentView = savedView;
                // Update canvas size and zoom for the restored view
                updateCanvasSize();
                // Delay updateScreenSizeControls to ensure properties panel has rendered
                // Chrome executes faster and may need this delay
                setTimeout(() => {
                    updateScreenSizeControls();
                }, 50);
                renderSidebarZoomControls();
                renderCanvas();
            }
        }
    };
    
    // Function to complete initialization after quiz is loaded (or if no quiz)
    const completeInitialization = () => {
        // Initialize
        if (currentQuiz.pages.length === 0) {
            const newIndex = Editor.PageManager.addPage('display', currentQuiz, currentPageIndex, {
                onPageAdded: (index) => {
                    currentPageIndex = index;
                    savePageIndexToCookie();
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
        // Delay updateScreenSizeControls to ensure properties panel has rendered
        // Chrome executes faster and may need this delay
        setTimeout(() => {
            updateScreenSizeControls();
        }, 50);
        renderSidebarZoomControls();
        renderPages();
        renderCanvas();
        // Auto-fit and center on initial load
        setTimeout(() => {
            if (Editor.ZoomControls && Editor.ZoomControls.zoomFit) {
                Editor.ZoomControls.zoomFit();
            }
        }, 100);
    };
    
    if (quizId) {
        // Load quiz and restore state after it loads
        loadQuiz(quizId).then(() => {
            // Clear undo history when loading a new quiz
            if (Editor.UndoRedo && Editor.UndoRedo.clearHistory) {
                Editor.UndoRedo.clearHistory();
            }
            // Restore saved page index for this quiz from cookie
            const savedPageIndex = getCookie(`editor_page_index_${quizId}`);
            
            // Note: loadQuiz already restored the page index, but we'll verify it here
            // The page index should already be set correctly from loadQuiz
            if (savedPageIndex !== null) {
                const pageIndex = parseInt(savedPageIndex, 10);
                if (!isNaN(pageIndex) && pageIndex >= 0 && pageIndex < currentQuiz.pages.length) {
                    // Only update if it's different (loadQuiz should have already set it)
                    if (currentPageIndex !== pageIndex) {
                        currentPageIndex = pageIndex;
                    }
                } else {
                    // If saved index is invalid, default to 0
                    currentPageIndex = 0;
                }
            } else {
                // If no saved index, default to 0
                currentPageIndex = 0;
            }
            
            // Now complete initialization with the correct page index
            completeInitialization();
            restoreViewUI();
        });
    } else {
        // No quiz to load, just complete initialization and restore view
        completeInitialization();
        restoreViewUI();
    }
    
    // Setup resize handles for displayable area
    setupDisplayableAreaResize();
    
    // Sidebar tabs toggle
    const sidebarTabs = document.querySelectorAll('.sidebar-tab');
    sidebarTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Remove active class from all tabs and content
            document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.sidebar-tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const content = document.getElementById(`sidebar-tab-${tabName}`);
            if (content) {
                content.classList.add('active');
            }
        });
    });
    
    // Shapes dropdown menu toggle
    const shapesHeader = document.getElementById('shapes-header');
    const shapesMenu = document.getElementById('shapes-menu');
    const shapesCategory = shapesHeader ? shapesHeader.closest('.shapes-category') : null;
    
    if (shapesHeader && shapesMenu) {
        shapesHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = shapesMenu.style.display !== 'none';
            if (isExpanded) {
                shapesMenu.style.display = 'none';
                if (shapesCategory) shapesCategory.classList.remove('expanded');
            } else {
                shapesMenu.style.display = 'flex';
                if (shapesCategory) shapesCategory.classList.add('expanded');
            }
        });
    }
    
    // Special dropdown menu toggle
    const specialHeader = document.getElementById('special-header');
    const specialMenu = document.getElementById('special-menu');
    const specialCategory = specialHeader ? specialHeader.closest('.shapes-category') : null;
    
    if (specialHeader && specialMenu) {
        specialHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = specialMenu.style.display !== 'none';
            if (isExpanded) {
                specialMenu.style.display = 'none';
                if (specialCategory) specialCategory.classList.remove('expanded');
            } else {
                specialMenu.style.display = 'flex';
                if (specialCategory) specialCategory.classList.add('expanded');
            }
        });
    }
    
    // Element drag handlers
    document.querySelectorAll('.element-item').forEach(item => {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', (e) => {
            // Check if element items are disabled
            const currentPage = currentQuiz.pages[currentPageIndex];
            const isStatusOrResultPage = currentPage && 
                (currentPage.page_type === 'status_page' || currentPage.page_type === 'result_page');
            
            if (isStatusOrResultPage) {
                e.preventDefault();
                return false;
            }
            
            e.dataTransfer.setData('element-type', item.dataset.type);
        });
        
        // Also allow clicking to add element at center of displayable area
        item.addEventListener('click', () => {
            // Check if element items are disabled
            const currentPage = currentQuiz.pages[currentPageIndex];
            const isStatusOrResultPage = currentPage && 
                (currentPage.page_type === 'status_page' || currentPage.page_type === 'result_page');
            
            if (isStatusOrResultPage) {
                return; // Don't add elements on status/result pages
            }
            
            const displayableArea = document.getElementById('displayable-area');
            const rect = displayableArea.getBoundingClientRect();
            const x = rect.width / 2 - 100; // Center minus half element width
            const y = rect.height / 2 - 50;  // Center minus half element height
            addElement(item.dataset.type, x, y);
        });
    });
    
    // Shape item drag and click handlers
    document.querySelectorAll('.shape-item').forEach(item => {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', (e) => {
            // Check if element items are disabled
            const currentPage = currentQuiz.pages[currentPageIndex];
            const isStatusOrResultPage = currentPage && 
                (currentPage.page_type === 'status_page' || currentPage.page_type === 'result_page');
            
            if (isStatusOrResultPage) {
                e.preventDefault();
                return false;
            }
            
            e.dataTransfer.setData('element-type', item.dataset.type);
        });
        
        // Also allow clicking to add element at center of displayable area
        item.addEventListener('click', () => {
            // Check if element items are disabled
            const currentPage = currentQuiz.pages[currentPageIndex];
            const isStatusOrResultPage = currentPage && 
                (currentPage.page_type === 'status_page' || currentPage.page_type === 'result_page');
            
            if (isStatusOrResultPage) {
                return; // Don't add elements on status/result pages
            }
            
            const displayableArea = document.getElementById('displayable-area');
            const rect = displayableArea.getBoundingClientRect();
            const x = rect.width / 2 - 100; // Center minus half element width
            const y = rect.height / 2 - 50;  // Center minus half element height
            addElement(item.dataset.type, x, y);
        });
    });

    const displayableArea = document.getElementById('displayable-area');
    if (!displayableArea) {
        console.error('displayable-area element not found in DOM');
    } else {
        displayableArea.addEventListener('dragover', (e) => {
            // Check if we're on a status/result page
            const currentPage = currentQuiz.pages[currentPageIndex];
            const isStatusOrResultPage = currentPage && 
                (currentPage.page_type === 'status_page' || currentPage.page_type === 'result_page');
            
            if (!isStatusOrResultPage) {
                e.preventDefault();
            }
        });

        displayableArea.addEventListener('drop', (e) => {
            // Check if we're on a status/result page
            const currentPage = currentQuiz.pages[currentPageIndex];
            const isStatusOrResultPage = currentPage && 
                (currentPage.page_type === 'status_page' || currentPage.page_type === 'result_page');
            
            if (isStatusOrResultPage) {
                e.preventDefault();
                return;
            }
            
            e.preventDefault();
            const elementType = e.dataTransfer.getData('element-type');
            if (!elementType) return; // No element type means drag was cancelled
            
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
        
        // Handle right-click on empty canvas space for paste
        displayableArea.addEventListener('contextmenu', (e) => {
        // Check if clicking on an element
        const target = e.target;
        const clickedElement = target.closest('.canvas-element') || 
                               target.closest('.question-container') ||
                               target.closest('[id^="element-nav-"]');
        
        // Don't handle if clicking on interactive elements
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
        
        // Only show paste menu if clicking on empty space and we have a copied element
        if (!clickedElement && !isInteractiveElement && Editor.CopyPaste && Editor.CopyPaste.hasCopiedElement()) {
            e.preventDefault();
            e.stopPropagation();
            
            // Calculate canvas coordinates
            const rect = displayableArea.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Show paste context menu
            if (Editor.ContextMenu && Editor.ContextMenu.showPasteMenu) {
                Editor.ContextMenu.showPasteMenu(e, x, y, () => currentQuiz, () => currentPageIndex, () => currentView, renderCanvas, selectElement, autosaveQuiz);
            }
        }
        });
    }
    
    // Keyboard shortcuts for copy/paste
    document.addEventListener('keydown', (e) => {
        // Only handle if not typing in an input field
        const target = e.target;
        const isInputField = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' ||
                            target.isContentEditable;
        
        if (isInputField) {
            return; // Let the input field handle it
        }
        
        // Ctrl+C or Cmd+C to copy selected element
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            // Don't handle if user is typing in an input field
            const target = e.target;
            const isInputField = target.tagName === 'INPUT' || 
                                target.tagName === 'TEXTAREA' ||
                                target.isContentEditable;
            
            if (isInputField) {
                return; // Let the input field handle it
            }
            
            if (selectedElement && Editor.CopyPaste && Editor.CopyPaste.copyElement) {
                e.preventDefault();
                const success = Editor.CopyPaste.copyElement(selectedElement, () => currentQuiz, () => currentPageIndex);
                if (!success) {
                    console.warn('[Editor] Failed to copy element:', selectedElement);
                }
            }
        }
        
        // Ctrl+V or Cmd+V - paste is now handled entirely by the 'paste' event listener above
        // This ensures image paste takes priority over element paste
        // (No need to handle paste here since paste event handles both images and elements)
    });
    
    // Page management
    const pageCallbacks = {
        getCurrentQuiz: () => currentQuiz,
        getCurrentPageIndex: () => currentPageIndex,
        onPageAdded: (index) => {
            currentPageIndex = index;
            savePageIndexToCookie();
            renderPages();
            renderCanvas();
            autosaveQuiz();
        },
        onPageSelected: (index) => {
            currentPageIndex = index;
            savePageIndexToCookie();
            renderPages();
            renderCanvas();
            // Update element items state based on page type
            updateElementItemsState();
            // Auto-fit and center when navigating to a page
            setTimeout(() => {
                if (Editor.ZoomControls && Editor.ZoomControls.zoomFit) {
                    Editor.ZoomControls.zoomFit();
                }
            }, 100);
        },
        onMovePage: (fromIndex, toIndex) => {
            // Always reorder the pages array based on the move
            const [movedPage] = currentQuiz.pages.splice(fromIndex, 1);
            currentQuiz.pages.splice(toIndex, 0, movedPage);
            
            // Update current page index if needed
            if (currentPageIndex === fromIndex) {
                currentPageIndex = toIndex;
            } else if (fromIndex < currentPageIndex && toIndex >= currentPageIndex) {
                currentPageIndex = currentPageIndex - 1;
            } else if (fromIndex > currentPageIndex && toIndex <= currentPageIndex) {
                currentPageIndex = currentPageIndex + 1;
            }
            
            // Update page_order for all pages to match their current positions
            currentQuiz.pages.forEach((page, index) => {
                page.page_order = index + 1;
            });
            
            // Save page index to cookie
            savePageIndexToCookie();
            
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
            
            // Update page_order for all remaining pages to match their new positions
            currentQuiz.pages.forEach((page, idx) => {
                page.page_order = idx + 1;
            });
            
            // Save page index to cookie
            savePageIndexToCookie();
            
            renderPages();
            renderCanvas();
            autosaveQuiz();
        }
    };

    document.getElementById('add-page-btn').addEventListener('click', () => {
        const newIndex = Editor.PageManager.addPage('display', currentQuiz, currentPageIndex, pageCallbacks);
        currentPageIndex = newIndex;
        savePageIndexToCookie();
        renderPages();
        renderCanvas();
    });

    document.getElementById('add-status-page-btn').addEventListener('click', () => {
        const newIndex = Editor.PageManager.addPage('status', currentQuiz, currentPageIndex, pageCallbacks);
        currentPageIndex = newIndex;
        savePageIndexToCookie();
        renderPages();
        renderCanvas();
    });

    document.getElementById('add-results-page-btn').addEventListener('click', () => {
        const newIndex = Editor.PageManager.addPage('results', currentQuiz, currentPageIndex, pageCallbacks);
        currentPageIndex = newIndex;
        savePageIndexToCookie();
        renderPages();
        renderCanvas();
    });

    // Autosave on quiz name change
    document.getElementById('quiz-name').addEventListener('input', debounce(() => {
        autosaveQuiz();
    }, 1000));

    // Back button
    document.getElementById('save-btn').addEventListener('click', async () => {
        await forceSaveQuiz();
    });

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/quizmaster';
        });
    } else {
        console.warn('Back button not found in DOM');
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST'
                });
                
                if (response.ok) {
                    window.location.href = '/quizmaster/login';
                } else {
                    alert('Error logging out. Please try again.');
                }
            } catch (error) {
                console.error('Error logging out:', error);
                alert('Error logging out. Please try again.');
            }
        });
    }

    // Quiz name already handled above for autosave

    // Media modal handlers
    Editor.MediaModal.init();
    
    // Properties panel resize
    Editor.Utils.initPropertiesResize();
    
    // Canvas view tabs (already defined above, but ensure we have the reference)
    // View restoration is now handled in restoreViewUI() function above
    
    // Auto-fit and center on initial load
    setTimeout(() => {
        if (Editor.ZoomControls && Editor.ZoomControls.zoomFit) {
            Editor.ZoomControls.zoomFit();
        }
    }, 200);
    
    canvasTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.canvas-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentView = tab.dataset.view;
            // Save active view to cookie (quiz-specific if available)
            const currentQuizId = getQuizId();
            if (currentQuizId) {
                setCookie(`editor_active_view_${currentQuizId}`, currentView);
            }
            // Also save to global cookie for backwards compatibility
            setCookie('editor_active_view', currentView);
            // Update canvas size and zoom for the new view
            updateCanvasSize();
            // Delay for Chrome compatibility - ensure properties panel has rendered
            setTimeout(() => {
                updateScreenSizeControls();
            }, 50);
            renderSidebarZoomControls();
            renderCanvas();
            // Update element items state based on page type
            updateElementItemsState();
            // Auto-fit and center when switching views
            setTimeout(() => {
                if (Editor.ZoomControls && Editor.ZoomControls.zoomFit) {
                    Editor.ZoomControls.zoomFit();
                }
            }, 100);
            // Re-render properties if no element is selected (to update view indicators)
            if (!selectedElement) {
                renderProperties();
            }
        });
    });
    
    // Update element items state on initial load
    updateElementItemsState();
    
    // Keyboard shortcuts - Delete key to delete selected element, Ctrl+Z for undo
    document.addEventListener('keydown', (e) => {
        // Only handle if no input/textarea is focused (to avoid deleting text while editing)
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.isContentEditable
        );
        
        // Ctrl+Z or Cmd+Z for undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            if (!isInputFocused && Editor.UndoRedo && Editor.UndoRedo.undo) {
                e.preventDefault();
                Editor.UndoRedo.undo();
            }
            return;
        }
        
        // Ctrl+Shift+Z or Cmd+Shift+Z for redo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
            if (!isInputFocused && Editor.UndoRedo && Editor.UndoRedo.redo) {
                e.preventDefault();
                Editor.UndoRedo.redo();
            }
            return;
        }
        
        if (!isInputFocused && selectedElement && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault();
            deleteSelectedElement();
        }
    });
    
    // Screen size controls (only if they exist in sidebar - they're now in properties pane)
    const presetDesktop = document.getElementById('preset-desktop');
    if (presetDesktop) {
        presetDesktop.addEventListener('click', () => {
            applyCanvasSize(1920, 1080);
        });
    }
    
    const presetMobilePortrait = document.getElementById('preset-mobile-portrait');
    if (presetMobilePortrait) {
        presetMobilePortrait.addEventListener('click', () => {
            applyCanvasSize(390, 844);
        });
    }
    
    const presetMobileLandscape = document.getElementById('preset-mobile-landscape');
    if (presetMobileLandscape) {
        presetMobileLandscape.addEventListener('click', () => {
            applyCanvasSize(844, 390);
        });
    }
    
    const presetCustom = document.getElementById('preset-custom');
    if (presetCustom) {
        presetCustom.addEventListener('click', () => {
            const settings = getCurrentViewSettings();
            document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
            presetCustom.classList.add('active');
            const customInputs = document.getElementById('custom-size-inputs');
            if (customInputs) {
                customInputs.style.display = 'block';
                const widthInput = document.getElementById('canvas-width');
                const heightInput = document.getElementById('canvas-height');
                if (widthInput) widthInput.value = settings.canvas_width || 1920;
                if (heightInput) heightInput.value = settings.canvas_height || 1080;
            }
        });
    }
    
    const applyCustomSize = document.getElementById('apply-custom-size');
    if (applyCustomSize) {
        applyCustomSize.addEventListener('click', () => {
            const widthInput = document.getElementById('canvas-width');
            const heightInput = document.getElementById('canvas-height');
            if (widthInput && heightInput) {
                applyCanvasSize(widthInput.value, heightInput.value);
            }
        });
    }
    
    // Allow Enter key to apply custom size (sidebar inputs)
    const canvasWidth = document.getElementById('canvas-width');
    if (canvasWidth) {
        canvasWidth.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const applyBtn = document.getElementById('apply-custom-size');
                if (applyBtn) applyBtn.click();
            }
        });
    }
    
    const canvasHeight = document.getElementById('canvas-height');
    if (canvasHeight) {
        canvasHeight.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const applyBtn = document.getElementById('apply-custom-size');
                if (applyBtn) applyBtn.click();
            }
        });
    }
    
    // Initialize canvas size
    updateCanvasSize();
    // Delay for Chrome compatibility - ensure properties panel has rendered
    setTimeout(() => {
        updateScreenSizeControls();
    }, 50);
    
    // Zoom controls (only if they exist in sidebar - they're now in properties pane)
    const zoomInBtn = document.getElementById('zoom-in');
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    
    const zoomOutBtn = document.getElementById('zoom-out');
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    
    const zoomFitBtn = document.getElementById('zoom-fit');
    if (zoomFitBtn) zoomFitBtn.addEventListener('click', zoomFit);
    
    const zoomResetBtn = document.getElementById('zoom-reset');
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', zoomReset);
    
    const zoomSlider = document.getElementById('zoom-slider');
    if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
            applyZoom(parseInt(e.target.value));
        });
    }
    
    // Mouse wheel zoom with Ctrl/Cmd key (on scroll area, not tabs)
    const scrollArea = document.querySelector('.canvas-scroll-area');
    scrollArea.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -5 : 5;
            const settings = getCurrentViewSettings();
            applyZoom(settings.zoom + delta);
        }
    }, { passive: false });
});

function renderPages() {
    const pageCallbacks = {
        getCurrentQuiz: () => currentQuiz,
        getCurrentPageIndex: () => currentPageIndex,
        onPageSelected: (index) => {
            currentPageIndex = index;
            savePageIndexToCookie();
            renderPages();
            renderCanvas();
            // Update element items state based on page type
            updateElementItemsState();
            // Auto-fit and center when navigating to a page
            setTimeout(() => {
                if (Editor.ZoomControls && Editor.ZoomControls.zoomFit) {
                    Editor.ZoomControls.zoomFit();
                }
            }, 100);
        },
        onMovePage: (fromIndex, toIndex) => {
            // Always reorder the pages array based on the move
            const [movedPage] = currentQuiz.pages.splice(fromIndex, 1);
            currentQuiz.pages.splice(toIndex, 0, movedPage);
            
            // Update current page index if needed
            if (currentPageIndex === fromIndex) {
                currentPageIndex = toIndex;
            } else if (fromIndex < currentPageIndex && toIndex >= currentPageIndex) {
                currentPageIndex = currentPageIndex - 1;
            } else if (fromIndex > currentPageIndex && toIndex <= currentPageIndex) {
                currentPageIndex = currentPageIndex + 1;
            }
            
            // Update page_order for all pages to match their current positions
            currentQuiz.pages.forEach((page, index) => {
                page.page_order = index + 1;
            });
            
            // Save page index to cookie
            savePageIndexToCookie();
            
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
            
            // Update page_order for all remaining pages to match their new positions
            currentQuiz.pages.forEach((page, idx) => {
                page.page_order = idx + 1;
            });
            
            // Save page index to cookie
            savePageIndexToCookie();
            
            renderPages();
            renderCanvas();
            autosaveQuiz();
        }
    };
    
    Editor.PageManager.renderPages(currentQuiz, currentPageIndex, pageCallbacks);
}

// Function to update element items state based on current page type
function updateElementItemsState() {
    if (!currentQuiz || !currentQuiz.pages || currentQuiz.pages.length === 0) {
        return; // No pages yet, skip
    }
    
    const currentPage = currentQuiz.pages[currentPageIndex];
    const isStatusOrResultPage = currentPage && 
        (currentPage.page_type === 'status_page' || currentPage.page_type === 'result_page');
    
    document.querySelectorAll('.element-item').forEach(item => {
        if (isStatusOrResultPage) {
            // Disable element items on status/result pages
            item.setAttribute('draggable', 'false');
            item.classList.add('disabled');
            item.style.opacity = '0.5';
            item.style.cursor = 'not-allowed';
            item.style.pointerEvents = 'none';
        } else {
            // Enable element items on regular quiz pages
            item.setAttribute('draggable', 'true');
            item.classList.remove('disabled');
            item.style.opacity = '1';
            item.style.cursor = 'move';
            item.style.pointerEvents = 'auto';
        }
    });
    
    // Also update shape items
    document.querySelectorAll('.shape-item').forEach(item => {
        if (isStatusOrResultPage) {
            // Disable shape items on status/result pages
            item.setAttribute('draggable', 'false');
            item.classList.add('disabled');
            item.style.opacity = '0.5';
            item.style.cursor = 'not-allowed';
            item.style.pointerEvents = 'none';
        } else {
            // Enable shape items on regular quiz pages
            item.setAttribute('draggable', 'true');
            item.classList.remove('disabled');
            item.style.opacity = '1';
            item.style.cursor = 'move';
            item.style.pointerEvents = 'auto';
        }
    });
}

// Canvas rendering now in Editor.CanvasRenderer module
function renderCanvas() {
    Editor.CanvasRenderer.renderCanvas();
    // Update element items state based on current page type
    updateElementItemsState();
}

// Duplicate renderPages function removed - using Editor.PageManager.renderPages instead

// Placeholder functions now in Editor.CanvasRenderer module

// Placeholder functions now in Editor.CanvasRenderer module
function renderStatusPagePlaceholder(canvas) {
    Editor.CanvasRenderer.renderStatusPagePlaceholder(canvas);
}

function renderResultsPagePlaceholder(displayableArea) {
    Editor.CanvasRenderer.renderResultsPagePlaceholder(displayableArea);
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
    // Prevent adding elements on status/result pages
    const currentPage = currentQuiz.pages[currentPageIndex];
    const isStatusOrResultPage = currentPage && 
        (currentPage.page_type === 'status_page' || currentPage.page_type === 'result_page');
    
    if (isStatusOrResultPage) {
        console.warn('Cannot add elements to status or result pages');
        return;
    }
    
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

// Element selection functions now in Editor.ElementSelection module
function selectElement(element) {
    selectedElement = element;
    Editor.ElementSelection.selectElement(element);
}

function deselectElement() {
    selectedElement = null;
    Editor.ElementSelection.deselectElement();
}

function deleteSelectedElement() {
    // Capture state before deletion for undo
    if (selectedElement && Editor.UndoRedo && Editor.UndoRedo.captureFullElementState) {
        const beforeState = Editor.UndoRedo.captureFullElementState(selectedElement.id);
        if (beforeState) {
            Editor.UndoRedo.saveState('delete', selectedElement.id, beforeState, null);
        }
    }
    
    Editor.ElementSelection.deleteSelectedElement(
        () => currentQuiz,
        () => currentPageIndex,
        (index) => { currentPageIndex = index; }
    );
}

// Properties panel now in Editor.PropertiesPanel module
function renderProperties() {
    Editor.PropertiesPanel.render();
}

// Properties rendering functions now in Editor.PropertiesPanel module
function renderGeneralProperties(container) {
    Editor.PropertiesPanel.renderGeneralProperties(container, selectedElement);
}

function renderVisibilityProperties(container) {
    Editor.PropertiesPanel.renderVisibilityProperties(container, selectedElement);
}

function renderPageProperties(container) {
    Editor.PropertiesPanel.renderPageProperties(container);
}

function renderPageVisibilityProperties(container) {
    Editor.PropertiesPanel.renderPageVisibilityProperties(container);
}

// Drag helper now in Editor.PropertiesPanel module

// Drag helper now in Editor.PropertiesPanel module

// Drag helper now in Editor.PropertiesPanel module
function getDragAfterElement(container, y) {
    return Editor.PropertiesPanel.getDragAfterElement(container, y);
}

// Property input helpers now in Editor.PropertiesPanel module
function addPropertyInput(container, label, value, onChange) {
    Editor.PropertiesPanel.addPropertyInput(container, label, value, onChange);
}

function addPropertyTextarea(container, label, value, onChange) {
    Editor.PropertiesPanel.addPropertyTextarea(container, label, value, onChange);
}

function updateElementDisplay() {
    if (!selectedElement) return;
    
    const el = document.getElementById(selectedElement.id);
    if (!el) return;
    
    // Simple: Just apply the position and size directly
    el.style.left = `${selectedElement.x}px`;
    el.style.top = `${selectedElement.y}px`;
    el.style.width = `${selectedElement.width}px`;
    
    // Set height (line elements use border_width)
    if (selectedElement.type === 'line') {
        el.style.height = `${selectedElement.border_width || 2}px`;
    } else {
        el.style.height = `${selectedElement.height}px`;
    }
    
    // For answer_input elements in participant view, the participant view renderer creates
    // a question-container inside the wrapper. We need to update that container's dimensions too.
    if (selectedElement.type === 'answer_input' && selectedElement.view === 'participant' && selectedElement.parent_id) {
        const questionContainer = document.getElementById(`question-${selectedElement.parent_id}`);
        if (questionContainer) {
            questionContainer.style.width = `${selectedElement.width}px`;
            questionContainer.style.minWidth = `${selectedElement.width}px`;
            questionContainer.style.maxWidth = `${selectedElement.width}px`;
            questionContainer.style.height = `${selectedElement.height}px`;
            questionContainer.style.minHeight = `${selectedElement.height}px`;
            questionContainer.style.maxHeight = `${selectedElement.height}px`;
        }
    }
    
    // For answer_display and other elements that use min/max width/height, update those too
    if (selectedElement.type === 'answer_display' || selectedElement.type === 'answer_input' || selectedElement.type === 'audio_control') {
        el.style.minWidth = `${selectedElement.width}px`;
        el.style.maxWidth = `${selectedElement.width}px`;
        el.style.minHeight = `${selectedElement.height}px`;
        el.style.maxHeight = `${selectedElement.height}px`;
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
        
        // Update SVG viewBox and colors for triangle, arrow, and plus if they exist
        if (selectedElement.type === 'triangle' || selectedElement.type === 'arrow' || selectedElement.type === 'plus') {
            const svg = el.querySelector('svg');
            if (svg) {
                svg.setAttribute('viewBox', `0 0 ${selectedElement.width} ${selectedElement.height}`);
                
                // For plus shape, recalculate the path data based on new dimensions
                if (selectedElement.type === 'plus') {
                    const plusThickness = Math.min(selectedElement.width, selectedElement.height) * 0.2;
                    const centerX = selectedElement.width / 2;
                    const centerY = selectedElement.height / 2;
                    const halfThickness = plusThickness / 2;
                    
                    const pathData = `
                        M ${centerX - halfThickness} 0
                        L ${centerX + halfThickness} 0
                        L ${centerX + halfThickness} ${centerY - halfThickness}
                        L ${selectedElement.width} ${centerY - halfThickness}
                        L ${selectedElement.width} ${centerY + halfThickness}
                        L ${centerX + halfThickness} ${centerY + halfThickness}
                        L ${centerX + halfThickness} ${selectedElement.height}
                        L ${centerX - halfThickness} ${selectedElement.height}
                        L ${centerX - halfThickness} ${centerY + halfThickness}
                        L 0 ${centerY + halfThickness}
                        L 0 ${centerY - halfThickness}
                        L ${centerX - halfThickness} ${centerY - halfThickness}
                        Z
                    `.replace(/\s+/g, ' ').trim();
                    
                    const path = svg.querySelector('path');
                    if (path) {
                        path.setAttribute('d', pathData);
                    }
                }
                
                // Update fill and stroke colors for SVG paths
                const paths = svg.querySelectorAll('path, polygon, rect');
                paths.forEach(path => {
                    if (selectedElement.fill_color) {
                        path.setAttribute('fill', selectedElement.fill_color);
                    }
                    if (selectedElement.border_color) {
                        path.setAttribute('stroke', selectedElement.border_color);
                    }
                    if (selectedElement.border_width !== undefined) {
                        path.setAttribute('stroke-width', selectedElement.border_width);
                    }
                });
            }
        }
        
        // Update colors for rectangle and circle (CSS-based)
        if (selectedElement.type === 'rectangle' || selectedElement.type === 'circle') {
            if (selectedElement.fill_color) {
                el.style.backgroundColor = selectedElement.fill_color;
            }
            if (selectedElement.border_color && selectedElement.border_width !== undefined) {
                el.style.border = `${selectedElement.border_width}px solid ${selectedElement.border_color}`;
            }
        }
        
        // Update richtext properties - only background color and alignment
        // Formatting (font size, font family, colors, etc.) is stored in the HTML content itself
        if (selectedElement.type === 'richtext') {
            if (selectedElement.background_color) {
                el.style.backgroundColor = selectedElement.background_color;
            }
            if (selectedElement.text_align_vertical) {
                const vAlign = selectedElement.text_align_vertical;
                if (vAlign === 'middle') {
                    el.style.justifyContent = 'center';
                } else if (vAlign === 'bottom') {
                    el.style.justifyContent = 'flex-end';
                } else {
                    el.style.justifyContent = 'flex-start';
                }
            }
            // Horizontal alignment
            if (selectedElement.text_align_horizontal) {
                const hAlign = selectedElement.text_align_horizontal;
                if (hAlign === 'center') {
                    el.style.alignItems = 'center';
                } else if (hAlign === 'right') {
                    el.style.alignItems = 'flex-end';
                } else {
                    el.style.alignItems = 'flex-start';
                }
            }
        }
        
        // Update text element alignment
        if (selectedElement.type === 'text') {
            if (selectedElement.text_align_vertical) {
                const vAlign = selectedElement.text_align_vertical;
                if (vAlign === 'top') {
                    el.style.alignItems = 'flex-start';
                } else if (vAlign === 'bottom') {
                    el.style.alignItems = 'flex-end';
                } else {
                    el.style.alignItems = 'center'; // middle or default
                }
            }
            if (selectedElement.text_align_horizontal || selectedElement.text_align) {
                const hAlign = selectedElement.text_align_horizontal || selectedElement.text_align;
                if (hAlign === 'left') {
                    el.style.justifyContent = 'flex-start';
                } else if (hAlign === 'right') {
                    el.style.justifyContent = 'flex-end';
                } else {
                    el.style.justifyContent = 'center'; // center or default
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
            // Don't start canvas resize if an element is being manipulated
            if (Editor.InteractionHandlers) {
                // Check if any element manipulation is active by trying to cancel it
                // If cancelActiveManipulation exists, we'll check if manipulation is active
                // For now, just make sure we're not interfering with element handles
                const target = e.target;
                // If the target is inside an element (not the canvas wrapper), don't resize canvas
                if (target.closest('.canvas-element')) {
                    return;
                }
            }
            
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
        // Delay for Chrome compatibility
        setTimeout(() => {
            updateScreenSizeControls();
        }, 50);
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

