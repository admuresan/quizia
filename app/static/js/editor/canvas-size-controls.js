// Canvas size controls module for editor
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    Editor.CanvasSizeControls = {
        init: function(getCurrentViewSettings, updateCanvasSize, autosaveQuiz, getCurrentQuiz, getCurrentPageIndex, getCurrentView) {
            this.getCurrentViewSettings = getCurrentViewSettings;
            this.updateCanvasSize = updateCanvasSize;
            this.autosaveQuiz = autosaveQuiz;
            this.getCurrentQuiz = getCurrentQuiz;
            this.getCurrentPageIndex = getCurrentPageIndex;
            this.getCurrentView = getCurrentView;
        },
        
        applyCanvasSize: function(width, height) {
            // Save canvas size to current page's view_config.size (single source of truth)
            const currentQuiz = this.getCurrentQuiz ? this.getCurrentQuiz() : null;
            const currentPageIndex = this.getCurrentPageIndex ? this.getCurrentPageIndex() : 0;
            const currentView = this.getCurrentView ? this.getCurrentView() : 'display';
            
            if (currentQuiz && currentQuiz.pages && currentQuiz.pages[currentPageIndex]) {
                const page = currentQuiz.pages[currentPageIndex];
                
                // Ensure page is in new format
                if (Editor.QuizStructure && Editor.QuizStructure.ensurePageNewFormat) {
                    Editor.QuizStructure.ensurePageNewFormat(page);
                }
                
                // Ensure view structure exists
                if (!page.views) {
                    page.views = {
                        display: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                        participant: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                        control: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} }
                    };
                }
                
                if (!page.views[currentView]) {
                    page.views[currentView] = {
                        view_config: {
                            background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } },
                            size: { width: 1920, height: 1080 }
                        },
                        local_element_configs: {}
                    };
                }
                
                if (!page.views[currentView].view_config) {
                    page.views[currentView].view_config = {
                        background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } },
                        size: { width: 1920, height: 1080 }
                    };
                }
                
                if (!page.views[currentView].view_config.size) {
                    page.views[currentView].view_config.size = { width: 1920, height: 1080 };
                }
                
                // Set canvas size in page's view_config.size (single source of truth)
                page.views[currentView].view_config.size.width = parseInt(width) || 1920;
                page.views[currentView].view_config.size.height = parseInt(height) || 1080;
                
                console.log('[CanvasSizeControls] Saved canvas size to page:', {
                    view: currentView,
                    width: page.views[currentView].view_config.size.width,
                    height: page.views[currentView].view_config.size.height,
                    pageIndex: currentPageIndex
                });
            }
            
            this.updateCanvasSize();
            this.updateScreenSizeControls(currentView);
            this.autosaveQuiz();
        },
        
        updateScreenSizeControls: function(currentView) {
            // Safety check: ensure DOM is ready
            if (typeof document === 'undefined' || !document.getElementById) {
                return;
            }
            
            // Safety check: ensure callbacks are initialized
            if (!this.getCurrentViewSettings || typeof this.getCurrentViewSettings !== 'function') {
                console.warn('CanvasSizeControls: getCurrentViewSettings not initialized');
                return;
            }
            
            let settings;
            try {
                settings = this.getCurrentViewSettings();
            } catch (error) {
                console.error('Error getting view settings:', error);
                return;
            }
            
            if (!settings) {
                console.warn('CanvasSizeControls: getCurrentViewSettings returned null/undefined');
                return;
            }
            
            const width = settings.canvas_width || 1920;
            const height = settings.canvas_height || 1080;
            
            // Chrome-specific: Check if properties panel exists and has been rendered
            // The properties panel creates the elements we're trying to access
            const propertiesPanel = document.getElementById('properties-panel');
            if (!propertiesPanel) {
                // Properties panel not rendered yet, skip updating controls
                // They will be updated when the panel renders
                return;
            }
            
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
            
            // Update preset buttons (both sidebar and properties pane)
            // Chrome-specific: Use try-catch for querySelectorAll as it may fail if DOM is not ready
            let presetButtons = [];
            try {
                presetButtons = Array.from(document.querySelectorAll('.preset-btn'));
            } catch (error) {
                // DOM not ready yet, skip button updates
                console.warn('Could not query preset buttons:', error);
            }
            
            presetButtons.forEach(btn => {
                if (!btn) return; // Safety check
                try {
                    btn.classList.remove('active');
                    // Update button styles
                    if (btn.id && btn.id.startsWith('props-preset-')) {
                        const presetId = btn.id.replace('props-preset-', '');
                        if (btn.style) {
                            btn.style.background = presetId === activePreset ? '#2196F3' : '#f5f5f5';
                            btn.style.color = presetId === activePreset ? 'white' : '#333';
                        }
                    }
                } catch (error) {
                    // Button might not be fully initialized, skip it
                    console.warn('Error updating preset button:', error);
                }
            });
            const activeBtn = document.getElementById(`preset-${activePreset}`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
            const propsActiveBtn = document.getElementById(`props-preset-${activePreset}`);
            if (propsActiveBtn && propsActiveBtn.style) {
                propsActiveBtn.style.background = '#2196F3';
                propsActiveBtn.style.color = 'white';
            }
            
            // Show/hide custom inputs (both sidebar and properties pane)
            const customInputs = document.getElementById('custom-size-inputs');
            if (customInputs && customInputs.style) {
                if (activePreset === 'custom') {
                    customInputs.style.display = 'block';
                    const widthInput = document.getElementById('canvas-width');
                    const heightInput = document.getElementById('canvas-height');
                    if (widthInput) widthInput.value = width;
                    if (heightInput) heightInput.value = height;
                } else {
                    customInputs.style.display = 'none';
                }
            }
            
            const propsCustomInputs = document.getElementById('props-custom-size-inputs');
            if (propsCustomInputs && propsCustomInputs.style) {
                if (activePreset === 'custom') {
                    propsCustomInputs.style.display = 'block';
                    const propsWidthInput = document.getElementById('props-canvas-width');
                    const propsHeightInput = document.getElementById('props-canvas-height');
                    if (propsWidthInput) propsWidthInput.value = width;
                    if (propsHeightInput) propsHeightInput.value = height;
                } else {
                    propsCustomInputs.style.display = 'none';
                }
            }
        }
    };
})();
