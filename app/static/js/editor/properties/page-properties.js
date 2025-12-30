// Page properties rendering for properties panel
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    if (!Editor.PropertiesPanel) {
        Editor.PropertiesPanel = {};
    }
    
    Editor.PropertiesPanel.renderPageProperties = function(container) {
        const currentQuiz = this.getCurrentQuiz();
        const currentPageIndex = this.getCurrentPageIndex();
        const currentView = this.getCurrentView();
        
        if (!currentQuiz || !currentQuiz.pages || !currentQuiz.pages[currentPageIndex]) {
            container.innerHTML = '<p>No page selected</p>';
            return;
        }
        
        const page = currentQuiz.pages[currentPageIndex];
        
        // Page Name
        const pageNameGroup = document.createElement('div');
        pageNameGroup.className = 'property-group';
        const pageNameLabel = document.createElement('label');
        pageNameLabel.textContent = 'Page Name';
        const pageNameInput = document.createElement('input');
        pageNameInput.type = 'text';
        pageNameInput.value = page.name || `Page ${currentPageIndex + 1}`;
        pageNameInput.onchange = () => {
            page.name = pageNameInput.value.trim() || `Page ${currentPageIndex + 1}`;
            this.autosaveQuiz();
            this.renderPages();
        };
        pageNameGroup.appendChild(pageNameLabel);
        pageNameGroup.appendChild(pageNameInput);
        container.appendChild(pageNameGroup);
        
        // Page Type
        const pageTypeGroup = document.createElement('div');
        pageTypeGroup.className = 'property-group';
        const pageTypeLabel = document.createElement('label');
        pageTypeLabel.textContent = 'Page Type';
        const pageTypeDisplay = document.createElement('div');
        const pageTypeText = page.page_type === 'status_page' ? 'Status Page' : 
                             page.page_type === 'result_page' ? 'Results Page' : 
                             page.page_type === 'quiz_page' ? 'Quiz Page' : 'Quiz Page';
        pageTypeDisplay.textContent = pageTypeText;
        pageTypeDisplay.style.cssText = 'padding: 0.5rem; background: #f5f5f5; border-radius: 4px;';
        pageTypeGroup.appendChild(pageTypeLabel);
        pageTypeGroup.appendChild(pageTypeDisplay);
        container.appendChild(pageTypeGroup);
        
        // Screen Size & Layout section
        const screenSizeGroup = document.createElement('div');
        screenSizeGroup.className = 'property-group';
        const screenSizeLabel = document.createElement('label');
        screenSizeLabel.textContent = 'Screen Size & Layout';
        screenSizeLabel.style.cssText = 'font-weight: bold; margin-bottom: 0.5rem; display: block;';
        screenSizeGroup.appendChild(screenSizeLabel);
        
        const viewNames = {
            display: 'Display',
            participant: 'Participant',
            control: 'Control'
        };
        const viewIndicator = document.createElement('span');
        viewIndicator.textContent = `(${viewNames[currentView]})`;
        viewIndicator.style.cssText = 'font-size: 0.85rem; font-weight: normal; color: #2196F3; font-style: italic; margin-left: 0.5rem;';
        screenSizeLabel.appendChild(viewIndicator);
        
        // Preset buttons
        const presetButtons = document.createElement('div');
        presetButtons.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;';
        
        const settings = this.getCurrentViewSettings();
        const width = settings.canvas_width || 1920;
        const height = settings.canvas_height || 1080;
        
        let activePreset = 'custom';
        if (width === 1920 && height === 1080) {
            activePreset = 'desktop';
        } else if (width === 390 && height === 844) {
            activePreset = 'mobile-portrait';
        } else if (width === 844 && height === 390) {
            activePreset = 'mobile-landscape';
        }
        
        const presets = [
            { id: 'desktop', label: 'Desktop', width: 1920, height: 1080 },
            { id: 'mobile-portrait', label: 'Mobile (Portrait)', width: 390, height: 844 },
            { id: 'mobile-landscape', label: 'Mobile (Landscape)', width: 844, height: 390 },
            { id: 'custom', label: 'Custom', width: null, height: null }
        ];
        
        presets.forEach(preset => {
            const btn = document.createElement('button');
            btn.textContent = preset.label;
            btn.className = 'preset-btn';
            btn.id = `props-preset-${preset.id}`;
            btn.style.cssText = 'padding: 0.5rem; background: ' + (preset.id === activePreset ? '#2196F3' : '#f5f5f5') + '; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: ' + (preset.id === activePreset ? 'white' : '#333') + ';';
            btn.onclick = () => {
                if (preset.width !== null) {
                    this.applyCanvasSize(preset.width, preset.height);
                } else {
                    // Custom - show inputs
                    presetButtons.querySelectorAll('.preset-btn').forEach(b => {
                        b.style.background = '#f5f5f5';
                        b.style.color = '#333';
                    });
                    btn.style.background = '#2196F3';
                    btn.style.color = 'white';
                    customInputs.style.display = 'block';
                }
                this.render(); // Re-render to update active state
            };
            presetButtons.appendChild(btn);
        });
        
        screenSizeGroup.appendChild(presetButtons);
        
        // Custom size inputs
        const customInputs = document.createElement('div');
        customInputs.id = 'props-custom-size-inputs';
        customInputs.style.display = activePreset === 'custom' ? 'block' : 'none';
        customInputs.style.cssText = 'margin-bottom: 1rem;';
        
        const widthGroup = document.createElement('div');
        widthGroup.style.cssText = 'margin-bottom: 0.5rem;';
        const widthLabel = document.createElement('label');
        widthLabel.textContent = 'Width (px)';
        widthLabel.style.cssText = 'display: block; margin-bottom: 0.25rem;';
        const widthInput = document.createElement('input');
        widthInput.type = 'number';
        widthInput.id = 'props-canvas-width';
        widthInput.min = '100';
        widthInput.max = '5000';
        widthInput.value = width;
        widthInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        widthGroup.appendChild(widthLabel);
        widthGroup.appendChild(widthInput);
        
        const heightGroup = document.createElement('div');
        heightGroup.style.cssText = 'margin-bottom: 0.5rem;';
        const heightLabel = document.createElement('label');
        heightLabel.textContent = 'Height (px)';
        heightLabel.style.cssText = 'display: block; margin-bottom: 0.25rem;';
        const heightInput = document.createElement('input');
        heightInput.type = 'number';
        heightInput.id = 'props-canvas-height';
        heightInput.min = '100';
        heightInput.max = '5000';
        heightInput.value = height;
        heightInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        heightGroup.appendChild(heightLabel);
        heightGroup.appendChild(heightInput);
        
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply';
        applyBtn.className = 'btn btn-small';
        applyBtn.style.cssText = 'width: 100%; margin-top: 0.5rem;';
        applyBtn.onclick = () => {
            this.applyCanvasSize(widthInput.value, heightInput.value);
            this.render(); // Re-render to update preset buttons
        };
        
        widthInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyBtn.click();
            }
        });
        
        heightInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyBtn.click();
            }
        });
        
        customInputs.appendChild(widthGroup);
        customInputs.appendChild(heightGroup);
        customInputs.appendChild(applyBtn);
        screenSizeGroup.appendChild(customInputs);
        
        container.appendChild(screenSizeGroup);
        
        // Background (unified - Color, Gradient, or Image)
        const bgGroup = document.createElement('div');
        bgGroup.className = 'property-group';
        const bgLabel = document.createElement('label');
        bgLabel.textContent = 'Background';
        bgGroup.appendChild(bgLabel);
        
        // Get background for display in properties pane (uses default for UI only)
        const defaultBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        let bgInfo;
        if (window.BackgroundUtils && window.BackgroundUtils.getBackgroundForDisplay) {
            bgInfo = window.BackgroundUtils.getBackgroundForDisplay(page, currentQuiz, defaultBg, currentView);
        } else {
            // Fallback if utility not loaded
            bgInfo = {
                type: 'gradient',
                value: defaultBg,
                previewStyle: `background: ${defaultBg};`,
                hasImage: false
            };
        }
        
        const previewStyle = bgInfo.previewStyle;
        
        // Preview box
        const previewBox = document.createElement('div');
        previewBox.style.cssText = `width: 100%; height: 60px; border: 1px solid #ddd; border-radius: 4px; margin: 0.5rem 0; ${previewStyle} cursor: pointer;`;
        previewBox.title = 'Click to edit background';
        
        // Edit background button
        const editBgBtn = document.createElement('button');
        editBgBtn.textContent = 'Edit Background';
        editBgBtn.className = 'btn btn-small';
        editBgBtn.style.cssText = 'width: 100%; margin-top: 0.5rem;';
        
        editBgBtn.onclick = () => {
            if (Editor.BackgroundModal && Editor.BackgroundModal.open) {
                // Ensure page is in new format
                if (Editor.QuizStructure && Editor.QuizStructure.ensurePageNewFormat) {
                    const pageIndex = currentQuiz.pages.findIndex(p => p === page);
                    if (pageIndex >= 0) {
                        currentQuiz.pages[pageIndex] = Editor.QuizStructure.ensurePageNewFormat(page);
                    }
                }
            
                Editor.BackgroundModal.open(page, currentQuiz, (updatedPage) => {
                    // Page is already updated by BackgroundModal using QuizStructure helpers
                    // Just need to update the preview and re-render
                    const defaultBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    let newBgInfo;
                    if (window.BackgroundUtils && window.BackgroundUtils.getBackgroundForDisplay) {
                        newBgInfo = window.BackgroundUtils.getBackgroundForDisplay(updatedPage, currentQuiz, defaultBg, currentView);
                    } else {
                        newBgInfo = { previewStyle: `background: ${defaultBg};` };
                    }
                    
                    previewBox.style.cssText = `width: 100%; height: 60px; border: 1px solid #ddd; border-radius: 4px; margin: 0.5rem 0; ${newBgInfo.previewStyle} cursor: pointer;`;
                    this.renderCanvas();
                    this.autosaveQuiz();
                    this.render(); // Re-render to update the preview
                }, currentView);
            }
        };
        
        previewBox.onclick = () => editBgBtn.click();
        
        bgGroup.appendChild(previewBox);
        bgGroup.appendChild(editBgBtn);
        container.appendChild(bgGroup);
    };
})();

(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    if (!Editor.PropertiesPanel) {
        Editor.PropertiesPanel = {};
    }
    
    Editor.PropertiesPanel.renderPageProperties = function(container) {
        const currentQuiz = this.getCurrentQuiz();
        const currentPageIndex = this.getCurrentPageIndex();
        const currentView = this.getCurrentView();
        
        if (!currentQuiz || !currentQuiz.pages || !currentQuiz.pages[currentPageIndex]) {
            container.innerHTML = '<p>No page selected</p>';
            return;
        }
        
        const page = currentQuiz.pages[currentPageIndex];
        
        // Page Name
        const pageNameGroup = document.createElement('div');
        pageNameGroup.className = 'property-group';
        const pageNameLabel = document.createElement('label');
        pageNameLabel.textContent = 'Page Name';
        const pageNameInput = document.createElement('input');
        pageNameInput.type = 'text';
        pageNameInput.value = page.name || `Page ${currentPageIndex + 1}`;
        pageNameInput.onchange = () => {
            page.name = pageNameInput.value.trim() || `Page ${currentPageIndex + 1}`;
            this.autosaveQuiz();
            this.renderPages();
        };
        pageNameGroup.appendChild(pageNameLabel);
        pageNameGroup.appendChild(pageNameInput);
        container.appendChild(pageNameGroup);
        
        // Page Type
        const pageTypeGroup = document.createElement('div');
        pageTypeGroup.className = 'property-group';
        const pageTypeLabel = document.createElement('label');
        pageTypeLabel.textContent = 'Page Type';
        const pageTypeDisplay = document.createElement('div');
        const pageTypeText = page.page_type === 'status_page' ? 'Status Page' : 
                             page.page_type === 'result_page' ? 'Results Page' : 
                             page.page_type === 'quiz_page' ? 'Quiz Page' : 'Quiz Page';
        pageTypeDisplay.textContent = pageTypeText;
        pageTypeDisplay.style.cssText = 'padding: 0.5rem; background: #f5f5f5; border-radius: 4px;';
        pageTypeGroup.appendChild(pageTypeLabel);
        pageTypeGroup.appendChild(pageTypeDisplay);
        container.appendChild(pageTypeGroup);
        
        // Screen Size & Layout section
        const screenSizeGroup = document.createElement('div');
        screenSizeGroup.className = 'property-group';
        const screenSizeLabel = document.createElement('label');
        screenSizeLabel.textContent = 'Screen Size & Layout';
        screenSizeLabel.style.cssText = 'font-weight: bold; margin-bottom: 0.5rem; display: block;';
        screenSizeGroup.appendChild(screenSizeLabel);
        
        const viewNames = {
            display: 'Display',
            participant: 'Participant',
            control: 'Control'
        };
        const viewIndicator = document.createElement('span');
        viewIndicator.textContent = `(${viewNames[currentView]})`;
        viewIndicator.style.cssText = 'font-size: 0.85rem; font-weight: normal; color: #2196F3; font-style: italic; margin-left: 0.5rem;';
        screenSizeLabel.appendChild(viewIndicator);
        
        // Preset buttons
        const presetButtons = document.createElement('div');
        presetButtons.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;';
        
        const settings = this.getCurrentViewSettings();
        const width = settings.canvas_width || 1920;
        const height = settings.canvas_height || 1080;
        
        let activePreset = 'custom';
        if (width === 1920 && height === 1080) {
            activePreset = 'desktop';
        } else if (width === 390 && height === 844) {
            activePreset = 'mobile-portrait';
        } else if (width === 844 && height === 390) {
            activePreset = 'mobile-landscape';
        }
        
        const presets = [
            { id: 'desktop', label: 'Desktop', width: 1920, height: 1080 },
            { id: 'mobile-portrait', label: 'Mobile (Portrait)', width: 390, height: 844 },
            { id: 'mobile-landscape', label: 'Mobile (Landscape)', width: 844, height: 390 },
            { id: 'custom', label: 'Custom', width: null, height: null }
        ];
        
        presets.forEach(preset => {
            const btn = document.createElement('button');
            btn.textContent = preset.label;
            btn.className = 'preset-btn';
            btn.id = `props-preset-${preset.id}`;
            btn.style.cssText = 'padding: 0.5rem; background: ' + (preset.id === activePreset ? '#2196F3' : '#f5f5f5') + '; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: ' + (preset.id === activePreset ? 'white' : '#333') + ';';
            btn.onclick = () => {
                if (preset.width !== null) {
                    this.applyCanvasSize(preset.width, preset.height);
                } else {
                    // Custom - show inputs
                    presetButtons.querySelectorAll('.preset-btn').forEach(b => {
                        b.style.background = '#f5f5f5';
                        b.style.color = '#333';
                    });
                    btn.style.background = '#2196F3';
                    btn.style.color = 'white';
                    customInputs.style.display = 'block';
                }
                this.render(); // Re-render to update active state
            };
            presetButtons.appendChild(btn);
        });
        
        screenSizeGroup.appendChild(presetButtons);
        
        // Custom size inputs
        const customInputs = document.createElement('div');
        customInputs.id = 'props-custom-size-inputs';
        customInputs.style.display = activePreset === 'custom' ? 'block' : 'none';
        customInputs.style.cssText = 'margin-bottom: 1rem;';
        
        const widthGroup = document.createElement('div');
        widthGroup.style.cssText = 'margin-bottom: 0.5rem;';
        const widthLabel = document.createElement('label');
        widthLabel.textContent = 'Width (px)';
        widthLabel.style.cssText = 'display: block; margin-bottom: 0.25rem;';
        const widthInput = document.createElement('input');
        widthInput.type = 'number';
        widthInput.id = 'props-canvas-width';
        widthInput.min = '100';
        widthInput.max = '5000';
        widthInput.value = width;
        widthInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        widthGroup.appendChild(widthLabel);
        widthGroup.appendChild(widthInput);
        
        const heightGroup = document.createElement('div');
        heightGroup.style.cssText = 'margin-bottom: 0.5rem;';
        const heightLabel = document.createElement('label');
        heightLabel.textContent = 'Height (px)';
        heightLabel.style.cssText = 'display: block; margin-bottom: 0.25rem;';
        const heightInput = document.createElement('input');
        heightInput.type = 'number';
        heightInput.id = 'props-canvas-height';
        heightInput.min = '100';
        heightInput.max = '5000';
        heightInput.value = height;
        heightInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        heightGroup.appendChild(heightLabel);
        heightGroup.appendChild(heightInput);
        
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply';
        applyBtn.className = 'btn btn-small';
        applyBtn.style.cssText = 'width: 100%; margin-top: 0.5rem;';
        applyBtn.onclick = () => {
            this.applyCanvasSize(widthInput.value, heightInput.value);
            this.render(); // Re-render to update preset buttons
        };
        
        widthInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyBtn.click();
            }
        });
        
        heightInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyBtn.click();
            }
        });
        
        customInputs.appendChild(widthGroup);
        customInputs.appendChild(heightGroup);
        customInputs.appendChild(applyBtn);
        screenSizeGroup.appendChild(customInputs);
        
        container.appendChild(screenSizeGroup);
        
        // Background (unified - Color, Gradient, or Image)
        const bgGroup = document.createElement('div');
        bgGroup.className = 'property-group';
        const bgLabel = document.createElement('label');
        bgLabel.textContent = 'Background';
        bgGroup.appendChild(bgLabel);
        
        // Get background for display in properties pane (uses default for UI only)
        const defaultBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        let bgInfo;
        if (window.BackgroundUtils && window.BackgroundUtils.getBackgroundForDisplay) {
            bgInfo = window.BackgroundUtils.getBackgroundForDisplay(page, currentQuiz, defaultBg, currentView);
        } else {
            // Fallback if utility not loaded
            bgInfo = {
                type: 'gradient',
                value: defaultBg,
                previewStyle: `background: ${defaultBg};`,
                hasImage: false
            };
        }
        
        const previewStyle = bgInfo.previewStyle;
        
        // Preview box
        const previewBox = document.createElement('div');
        previewBox.style.cssText = `width: 100%; height: 60px; border: 1px solid #ddd; border-radius: 4px; margin: 0.5rem 0; ${previewStyle} cursor: pointer;`;
        previewBox.title = 'Click to edit background';
        
        // Edit background button
        const editBgBtn = document.createElement('button');
        editBgBtn.textContent = 'Edit Background';
        editBgBtn.className = 'btn btn-small';
        editBgBtn.style.cssText = 'width: 100%; margin-top: 0.5rem;';
        
        editBgBtn.onclick = () => {
            if (Editor.BackgroundModal && Editor.BackgroundModal.open) {
                // Ensure page is in new format
                if (Editor.QuizStructure && Editor.QuizStructure.ensurePageNewFormat) {
                    const pageIndex = currentQuiz.pages.findIndex(p => p === page);
                    if (pageIndex >= 0) {
                        currentQuiz.pages[pageIndex] = Editor.QuizStructure.ensurePageNewFormat(page);
                    }
                }
            
                Editor.BackgroundModal.open(page, currentQuiz, (updatedPage) => {
                    // Page is already updated by BackgroundModal using QuizStructure helpers
                    // Just need to update the preview and re-render
                    const defaultBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    let newBgInfo;
                    if (window.BackgroundUtils && window.BackgroundUtils.getBackgroundForDisplay) {
                        newBgInfo = window.BackgroundUtils.getBackgroundForDisplay(updatedPage, currentQuiz, defaultBg, currentView);
                    } else {
                        newBgInfo = { previewStyle: `background: ${defaultBg};` };
                    }
                    
                    previewBox.style.cssText = `width: 100%; height: 60px; border: 1px solid #ddd; border-radius: 4px; margin: 0.5rem 0; ${newBgInfo.previewStyle} cursor: pointer;`;
                    this.renderCanvas();
                    this.autosaveQuiz();
                    this.render(); // Re-render to update the preview
                }, currentView);
            }
        };
        
        previewBox.onclick = () => editBgBtn.click();
        
        bgGroup.appendChild(previewBox);
        bgGroup.appendChild(editBgBtn);
        container.appendChild(bgGroup);
    };
})();


