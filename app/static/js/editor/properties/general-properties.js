// General properties rendering for properties panel
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    if (!Editor.PropertiesPanel) {
        Editor.PropertiesPanel = {};
    }
    
    // Use centralized color picker from Editor.ColorPicker
    if (!Editor.ColorPicker) {
        console.error('Editor.ColorPicker not loaded. Make sure color-picker.js is included before general-properties.js');
    }
    
    // Legacy function for backwards compatibility - redirects to centralized picker
    function openColorPickerModal(currentColor, onColorChange) {
        if (Editor.ColorPicker && Editor.ColorPicker.open) {
            Editor.ColorPicker.open(currentColor, onColorChange);
        }
    }
    
    // Legacy helper functions - redirect to centralized picker
    function parseColorWithOpacity(colorValue) {
        if (Editor.ColorPicker && Editor.ColorPicker.parseColor) {
            return Editor.ColorPicker.parseColor(colorValue);
        }
        return { hex: colorValue || '#000000', opacity: 1 };
    }
    
    function hexToRgba(hex, opacity) {
        if (Editor.ColorPicker && Editor.ColorPicker.hexToRgba) {
            return Editor.ColorPicker.hexToRgba(hex, opacity);
        }
        return hex;
    }
    
    // Helper function to normalize media URLs - always works, even if Utils isn't loaded
    function normalizeMediaUrlSafe(url) {
        if (!url || typeof url !== 'string') {
            return url || '';
        }
        
        // If already relative, return as-is
        if (url.startsWith('/')) {
            return url;
        }
        
        // Try to use Editor.Utils or window.UrlUtils if available
        if (Editor && Editor.Utils && Editor.Utils.normalizeMediaUrl) {
            return Editor.Utils.normalizeMediaUrl(url);
        }
        if (window.UrlUtils && window.UrlUtils.normalizeMediaUrl) {
            return window.UrlUtils.normalizeMediaUrl(url);
        }
        
        // Fallback: Always convert HTTP URLs pointing to /api/media/serve/ to relative
        // This is critical for IP addresses which can't be upgraded to HTTPS
        if (url.startsWith('http://') && url.includes('/api/media/serve/')) {
            const match = url.match(/\/api\/media\/serve\/.+$/);
            if (match) {
                return match[0];
            }
        }
        
        // If not absolute URL, assume it's a filename
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return '/api/media/serve/' + url;
        }
        
        // Return as-is if we can't normalize
        return url;
    }
    
    Editor.PropertiesPanel.renderGeneralProperties = function(container, selectedElement) {
        if (!selectedElement) {
            container.innerHTML = '<p>No element selected</p>';
            return;
        }
        
        const self = this;
        const currentQuiz = this.getCurrentQuiz();
        const currentPageIndex = this.getCurrentPageIndex();
        const currentView = this.getCurrentView();
        const page = currentQuiz.pages[currentPageIndex];
        
        // Position - absolute pixel values from top-left corner of canvas (0,0 = top-left)
        const positionGroup = document.createElement('div');
        positionGroup.className = 'property-group';
        const positionLabel = document.createElement('label');
        positionLabel.textContent = 'Position (px from top-left)';
        positionLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
        positionGroup.appendChild(positionLabel);
        
        const positionContainer = document.createElement('div');
        positionContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;';
        
        // For answer_input/answer_display elements, read position from config
        let currentX = selectedElement.x || 0;
        let currentY = selectedElement.y || 0;
        
        if (selectedElement.type === 'answer_input' && selectedElement.view === 'participant' && selectedElement.parent_id) {
            // Read from answer_input_config in parent element's local_element_configs
            const parentId = selectedElement.parent_id;
            const participantView = page.views && page.views.participant;
            if (participantView && participantView.local_element_configs && participantView.local_element_configs[parentId]) {
                const answerInputConfig = participantView.local_element_configs[parentId].answer_input_config;
                if (answerInputConfig) {
                    currentX = answerInputConfig.x !== undefined ? answerInputConfig.x : currentX;
                    currentY = answerInputConfig.y !== undefined ? answerInputConfig.y : currentY;
                }
            }
        } else if (selectedElement.type === 'answer_display' && selectedElement.view === 'control' && selectedElement.parent_id) {
            // Read from answer_display_config in parent element's local_element_configs
            const parentId = selectedElement.parent_id;
            const controlView = page.views && page.views.control;
            if (controlView && controlView.local_element_configs && controlView.local_element_configs[parentId]) {
                const answerDisplayConfig = controlView.local_element_configs[parentId].answer_display_config;
                if (answerDisplayConfig) {
                    currentX = answerDisplayConfig.x !== undefined ? answerDisplayConfig.x : currentX;
                    currentY = answerDisplayConfig.y !== undefined ? answerDisplayConfig.y : currentY;
                }
            }
        }
        
        const xGroup = document.createElement('div');
        const xLabel = document.createElement('label');
        xLabel.textContent = 'X (left)';
        xLabel.style.cssText = 'display: block; margin-bottom: 0.25rem; font-size: 0.85rem; color: #666;';
        const xInput = document.createElement('input');
        xInput.type = 'number';
        xInput.step = '1';
        xInput.dataset.property = 'x'; // Add data attribute for easy selection
        // Display absolute pixel value from top-left corner (0,0 = top-left)
        xInput.value = Math.round(currentX);
        xInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        xInput.title = 'Absolute pixel position from left edge of canvas (0 = left edge)';
        xInput.onchange = () => {
                const newX = parseFloat(xInput.value) || 0;
                selectedElement.x = newX;
                // Also update the config immediately
                if (selectedElement.type === 'answer_input' && selectedElement.view === 'participant' && selectedElement.parent_id) {
                    const parentId = selectedElement.parent_id;
                    const participantView = page.views && page.views.participant;
                    if (participantView && participantView.local_element_configs && participantView.local_element_configs[parentId]) {
                        if (!participantView.local_element_configs[parentId].answer_input_config) {
                            participantView.local_element_configs[parentId].answer_input_config = {};
                        }
                        participantView.local_element_configs[parentId].answer_input_config.x = newX;
                    }
                } else if (selectedElement.type === 'answer_display' && selectedElement.view === 'control' && selectedElement.parent_id) {
                    const parentId = selectedElement.parent_id;
                    const controlView = page.views && page.views.control;
                    if (controlView && controlView.local_element_configs && controlView.local_element_configs[parentId]) {
                        if (!controlView.local_element_configs[parentId].answer_display_config) {
                            controlView.local_element_configs[parentId].answer_display_config = {};
                        }
                        controlView.local_element_configs[parentId].answer_display_config.x = newX;
                    }
                }
                if (self.updateElementConfigInQuiz) {
                    self.updateElementConfigInQuiz(selectedElement);
                }
                self.updateElementDisplay();
                self.autosaveQuiz();
            };
        xGroup.appendChild(xLabel);
        xGroup.appendChild(xInput);
        
        const yGroup = document.createElement('div');
        const yLabel = document.createElement('label');
        yLabel.textContent = 'Y (top)';
        yLabel.style.cssText = 'display: block; margin-bottom: 0.25rem; font-size: 0.85rem; color: #666;';
        const yInput = document.createElement('input');
        yInput.type = 'number';
        yInput.step = '1';
        yInput.dataset.property = 'y'; // Add data attribute for easy selection
        // Display absolute pixel value from top-left corner (0,0 = top-left)
        yInput.value = Math.round(currentY);
        yInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        yInput.title = 'Absolute pixel position from top edge of canvas (0 = top edge)';
        yInput.onchange = () => {
                const newY = parseFloat(yInput.value) || 0;
                selectedElement.y = newY;
                // Also update the config immediately
                if (selectedElement.type === 'answer_input' && selectedElement.view === 'participant' && selectedElement.parent_id) {
                    const parentId = selectedElement.parent_id;
                    const participantView = page.views && page.views.participant;
                    if (participantView && participantView.local_element_configs && participantView.local_element_configs[parentId]) {
                        if (!participantView.local_element_configs[parentId].answer_input_config) {
                            participantView.local_element_configs[parentId].answer_input_config = {};
                        }
                        participantView.local_element_configs[parentId].answer_input_config.y = newY;
                    }
                } else if (selectedElement.type === 'answer_display' && selectedElement.view === 'control' && selectedElement.parent_id) {
                    const parentId = selectedElement.parent_id;
                    const controlView = page.views && page.views.control;
                    if (controlView && controlView.local_element_configs && controlView.local_element_configs[parentId]) {
                        if (!controlView.local_element_configs[parentId].answer_display_config) {
                            controlView.local_element_configs[parentId].answer_display_config = {};
                        }
                        controlView.local_element_configs[parentId].answer_display_config.y = newY;
                    }
                }
                if (self.updateElementConfigInQuiz) {
                    self.updateElementConfigInQuiz(selectedElement);
                }
                self.updateElementDisplay();
                self.autosaveQuiz();
            };
        yGroup.appendChild(yLabel);
        yGroup.appendChild(yInput);
        
        positionContainer.appendChild(xGroup);
        positionContainer.appendChild(yGroup);
        positionGroup.appendChild(positionContainer);
        container.appendChild(positionGroup);
        
        // Size
        const sizeGroup = document.createElement('div');
        sizeGroup.className = 'property-group';
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'Size';
        sizeGroup.appendChild(sizeLabel);
        
        const sizeContainer = document.createElement('div');
        sizeContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;';
        
        // For answer_input elements in participant view, read from answer_input_config
        // For answer_display elements in control view, read from answer_display_config
        let currentWidth = selectedElement.width || 100;
        let currentHeight = selectedElement.height || 100;
        
        if (selectedElement.type === 'answer_input' && selectedElement.view === 'participant' && selectedElement.parent_id) {
            // Read from answer_input_config in parent element's local_element_configs
            const parentId = selectedElement.parent_id;
            const participantView = page.views && page.views.participant;
            if (participantView && participantView.local_element_configs && participantView.local_element_configs[parentId]) {
                const answerInputConfig = participantView.local_element_configs[parentId].answer_input_config;
                if (answerInputConfig) {
                    currentWidth = answerInputConfig.width !== undefined ? answerInputConfig.width : currentWidth;
                    currentHeight = answerInputConfig.height !== undefined ? answerInputConfig.height : currentHeight;
                }
            }
        } else if (selectedElement.type === 'answer_display' && selectedElement.view === 'control' && selectedElement.parent_id) {
            // Read from answer_display_config in parent element's local_element_configs
            const parentId = selectedElement.parent_id;
            const controlView = page.views && page.views.control;
            if (controlView && controlView.local_element_configs && controlView.local_element_configs[parentId]) {
                const answerDisplayConfig = controlView.local_element_configs[parentId].answer_display_config;
                if (answerDisplayConfig) {
                    currentWidth = answerDisplayConfig.width !== undefined ? answerDisplayConfig.width : currentWidth;
                    currentHeight = answerDisplayConfig.height !== undefined ? answerDisplayConfig.height : currentHeight;
                }
            }
        }
        
        const widthGroup = document.createElement('div');
        const widthLabel = document.createElement('label');
        widthLabel.textContent = 'Width';
        widthLabel.style.cssText = 'display: block; margin-bottom: 0.25rem; font-size: 0.9rem;';
        const widthInput = document.createElement('input');
        widthInput.type = 'number';
        widthInput.dataset.property = 'width'; // Add data attribute for easy selection
        widthInput.value = currentWidth;
        widthInput.min = '1';
        widthInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        widthInput.onchange = () => {
                const newWidth = parseFloat(widthInput.value) || 100;
                selectedElement.width = newWidth;
                // Also update the element object immediately so it reflects the change
                if (selectedElement.type === 'answer_input' && selectedElement.view === 'participant' && selectedElement.parent_id) {
                    const parentId = selectedElement.parent_id;
                    const participantView = page.views && page.views.participant;
                    if (participantView && participantView.local_element_configs && participantView.local_element_configs[parentId]) {
                        if (!participantView.local_element_configs[parentId].answer_input_config) {
                            participantView.local_element_configs[parentId].answer_input_config = {};
                        }
                        participantView.local_element_configs[parentId].answer_input_config.width = newWidth;
                    }
                } else if (selectedElement.type === 'answer_display' && selectedElement.view === 'control' && selectedElement.parent_id) {
                    const parentId = selectedElement.parent_id;
                    const controlView = page.views && page.views.control;
                    if (controlView && controlView.local_element_configs && controlView.local_element_configs[parentId]) {
                        if (!controlView.local_element_configs[parentId].answer_display_config) {
                            controlView.local_element_configs[parentId].answer_display_config = {};
                        }
                        controlView.local_element_configs[parentId].answer_display_config.width = newWidth;
                    }
                }
                if (self.updateElementConfigInQuiz) {
                    self.updateElementConfigInQuiz(selectedElement);
                }
                self.updateElementDisplay();
                self.autosaveQuiz();
            };
        widthGroup.appendChild(widthLabel);
        widthGroup.appendChild(widthInput);
        
        const heightGroup = document.createElement('div');
        const heightLabel = document.createElement('label');
        heightLabel.textContent = 'Height';
        heightLabel.style.cssText = 'display: block; margin-bottom: 0.25rem; font-size: 0.9rem;';
        const heightInput = document.createElement('input');
        heightInput.type = 'number';
        heightInput.dataset.property = 'height'; // Add data attribute for easy selection
        heightInput.value = currentHeight;
        heightInput.min = '1';
        heightInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        heightInput.onchange = () => {
                const newHeight = parseFloat(heightInput.value) || 100;
                selectedElement.height = newHeight;
                // Also update the element object immediately so it reflects the change
                if (selectedElement.type === 'answer_input' && selectedElement.view === 'participant' && selectedElement.parent_id) {
                    const parentId = selectedElement.parent_id;
                    const participantView = page.views && page.views.participant;
                    if (participantView && participantView.local_element_configs && participantView.local_element_configs[parentId]) {
                        if (!participantView.local_element_configs[parentId].answer_input_config) {
                            participantView.local_element_configs[parentId].answer_input_config = {};
                        }
                        participantView.local_element_configs[parentId].answer_input_config.height = newHeight;
                    }
                } else if (selectedElement.type === 'answer_display' && selectedElement.view === 'control' && selectedElement.parent_id) {
                    const parentId = selectedElement.parent_id;
                    const controlView = page.views && page.views.control;
                    if (controlView && controlView.local_element_configs && controlView.local_element_configs[parentId]) {
                        if (!controlView.local_element_configs[parentId].answer_display_config) {
                            controlView.local_element_configs[parentId].answer_display_config = {};
                        }
                        controlView.local_element_configs[parentId].answer_display_config.height = newHeight;
                    }
                }
                if (self.updateElementConfigInQuiz) {
                    self.updateElementConfigInQuiz(selectedElement);
                }
                self.updateElementDisplay();
                self.autosaveQuiz();
            };
        heightGroup.appendChild(heightLabel);
        heightGroup.appendChild(heightInput);
        
        sizeContainer.appendChild(widthGroup);
        sizeContainer.appendChild(heightGroup);
        sizeGroup.appendChild(sizeContainer);
        container.appendChild(sizeGroup);
        
        // Rotation (for shapes and some media)
        if (['rectangle', 'circle', 'triangle', 'arrow', 'line', 'plus', 'image', 'video'].includes(selectedElement.type)) {
            const rotationGroup = document.createElement('div');
            rotationGroup.className = 'property-group';
            const rotationLabel = document.createElement('label');
            rotationLabel.textContent = 'Rotation (degrees)';
            const rotationInput = document.createElement('input');
            rotationInput.type = 'number';
            rotationInput.dataset.property = 'rotation'; // Add data attribute for easy selection
            rotationInput.value = selectedElement.rotation || 0;
            rotationInput.min = '-360';
            rotationInput.max = '360';
            rotationInput.step = '1';
            rotationInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
            rotationInput.onchange = () => {
                selectedElement.rotation = parseFloat(rotationInput.value) || 0;
                if (self.updateElementConfigInQuiz) {
                    self.updateElementConfigInQuiz(selectedElement);
                }
                self.updateElementDisplay();
                self.autosaveQuiz();
            };
            rotationGroup.appendChild(rotationLabel);
            rotationGroup.appendChild(rotationInput);
            container.appendChild(rotationGroup);
        }
        
        // Fill and border properties for shapes
        if (['rectangle', 'circle', 'triangle', 'arrow', 'line', 'plus'].includes(selectedElement.type)) {
            // Fill color with opacity
            const fillColorGroup = document.createElement('div');
            fillColorGroup.className = 'property-group';
            const fillColorLabel = document.createElement('label');
            fillColorLabel.textContent = 'Fill Color';
            fillColorLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
            fillColorGroup.appendChild(fillColorLabel);
            
            const fillColorButton = Editor.ColorPicker.createButton(
                selectedElement.fill_color || '#ddd',
                (rgbaColor) => {
                    selectedElement.fill_color = rgbaColor;
                    if (self.updateElementPropertiesInQuiz) {
                        self.updateElementPropertiesInQuiz(selectedElement);
                    }
                    self.updateElementDisplay();
                    self.autosaveQuiz();
                },
                () => self.getCurrentQuiz()
            );
            fillColorGroup.appendChild(fillColorButton);
            container.appendChild(fillColorGroup);
            
            // Border color with opacity
            const borderColorGroup = document.createElement('div');
            borderColorGroup.className = 'property-group';
            const borderColorLabel = document.createElement('label');
            borderColorLabel.textContent = 'Border Color';
            borderColorLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
            borderColorGroup.appendChild(borderColorLabel);
            
            const borderColorButton = Editor.ColorPicker.createButton(
                selectedElement.border_color || '#999',
                (rgbaColor) => {
                    selectedElement.border_color = rgbaColor;
                    if (self.updateElementPropertiesInQuiz) {
                        self.updateElementPropertiesInQuiz(selectedElement);
                    }
                    self.updateElementDisplay();
                    self.autosaveQuiz();
                },
                () => self.getCurrentQuiz()
            );
            borderColorGroup.appendChild(borderColorButton);
            container.appendChild(borderColorGroup);
            
            // Border width
            const borderWidthGroup = document.createElement('div');
            borderWidthGroup.className = 'property-group';
            const borderWidthLabel = document.createElement('label');
            borderWidthLabel.textContent = 'Border Width';
            const borderWidthInput = document.createElement('input');
            borderWidthInput.type = 'number';
            borderWidthInput.value = selectedElement.border_width || 2;
            borderWidthInput.min = '0';
            borderWidthInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
            borderWidthInput.onchange = () => {
                selectedElement.border_width = parseInt(borderWidthInput.value) || 0;
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.updateElementDisplay();
                self.autosaveQuiz();
            };
            borderWidthGroup.appendChild(borderWidthLabel);
            borderWidthGroup.appendChild(borderWidthInput);
            container.appendChild(borderWidthGroup);
        }
        
        // Rich text editor with toolbar - completely rewritten using deltabooks approach
        if (selectedElement.type === 'richtext') {
            const contentGroup = document.createElement('div');
            contentGroup.className = 'property-group';
            const contentLabel = document.createElement('label');
            contentLabel.textContent = 'Content';
            contentLabel.style.marginBottom = '0.5rem';
            contentLabel.style.display = 'block';
            contentGroup.appendChild(contentLabel);
            
            // Contenteditable div for rich text editing - declare early so it can be referenced
            const editor = document.createElement('div');
            editor.contentEditable = true;
            editor.innerHTML = selectedElement.content || '<p>Enter your text here</p>';
            const backgroundColor = selectedElement.background_color || 'transparent';
            
            // Simple editor styling - no complex property management
            editor.style.cssText = 'border: 1px solid #ddd; border-top: none; border-radius: 0 0 4px 4px; min-height: 200px; max-height: 300px; padding: 15px; background: ' + backgroundColor + '; font-family: inherit; overflow-y: auto; display: flex; flex-direction: column;';
            
            // Initialize vertical alignment from element properties
            const vAlign = selectedElement.text_align_vertical || 'top';
            if (vAlign === 'middle') {
                editor.style.justifyContent = 'center';
            } else if (vAlign === 'bottom') {
                editor.style.justifyContent = 'flex-end';
            } else {
                editor.style.justifyContent = 'flex-start'; // top or default
            }
            
            // Initialize horizontal alignment from element properties
            const hAlign = selectedElement.text_align_horizontal || 'left';
            if (hAlign === 'center') {
                editor.style.alignItems = 'center';
            } else if (hAlign === 'right') {
                editor.style.alignItems = 'flex-end';
            } else {
                editor.style.alignItems = 'flex-start'; // left or default
            }
            
            // Mark editor as interacting to prevent panel re-renders while typing
            editor.dataset.interacting = 'false';
            
            // Simple save function - just save the HTML content (declared early so it can be referenced)
            let bgColorInput = null; // Will be set later
            let currentBackgroundColor = selectedElement.background_color || null; // Track current background color
            const saveRichTextContent = () => {
                selectedElement.content = editor.innerHTML;
                // Save background color from the tracked value
                // currentBackgroundColor is updated when user selects a color via the picker
                // If it's null, use the editor's current background color (which may have been set initially)
                if (currentBackgroundColor !== null) {
                    selectedElement.background_color = currentBackgroundColor;
                } else if (editor.style.backgroundColor && editor.style.backgroundColor !== 'transparent' && editor.style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    // Fallback to editor style if no explicit selection was made in this session
                    selectedElement.background_color = editor.style.backgroundColor;
                }
                // If currentBackgroundColor is null and editor has no background, preserve existing background_color
                // Save vertical alignment if changed
                if (editor.style.justifyContent) {
                    if (editor.style.justifyContent === 'center') {
                        selectedElement.text_align_vertical = 'middle';
                    } else if (editor.style.justifyContent === 'flex-end') {
                        selectedElement.text_align_vertical = 'bottom';
                    } else {
                        selectedElement.text_align_vertical = 'top';
                    }
                }
                // Save horizontal alignment if changed
                if (editor.style.alignItems) {
                    if (editor.style.alignItems === 'center') {
                        selectedElement.text_align_horizontal = 'center';
                    } else if (editor.style.alignItems === 'flex-end') {
                        selectedElement.text_align_horizontal = 'right';
                    } else {
                        selectedElement.text_align_horizontal = 'left';
                    }
                }
                // Update quiz structure
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                // Update canvas
                if (self.renderCanvas) {
                    self.renderCanvas();
                }
                // Autosave
                self.autosaveQuiz();
            };
            
            // Simple format function - just use execCommand like deltabooks
            // No automatic saving - only Apply button saves
            const formatText = (command, value = null) => {
                editor.focus();
                document.execCommand(command, false, value);
                // Update toolbar to reflect formatting changes (will be defined later)
                if (typeof updateToolbarFromContent === 'function') {
                    setTimeout(updateToolbarFromContent, 0);
                }
                // Don't save - wait for Apply button
            };
            
            // Toolbar container with two rows
            const toolbarContainer = document.createElement('div');
            toolbarContainer.style.cssText = 'border: 1px solid #ddd; border-bottom: none; border-radius: 4px 4px 0 0; background: #f5f5f5;';
            
            // First row - main formatting controls
            const toolbar = document.createElement('div');
            toolbar.style.cssText = 'padding: 4px; display: flex; gap: 3px; align-items: center; flex-wrap: nowrap;';
            
            // Bold button
            const boldBtn = document.createElement('button');
            boldBtn.innerHTML = '<strong>B</strong>';
            boldBtn.title = 'Bold';
            boldBtn.type = 'button';
            boldBtn.style.cssText = 'padding: 4px 8px; border: 1px solid #dee2e6; background: white; cursor: pointer; border-radius: 3px; font-size: 12px; font-weight: 500; min-width: 28px;';
            boldBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                formatText('bold');
            };
            toolbar.appendChild(boldBtn);
            
            // Italic button
            const italicBtn = document.createElement('button');
            italicBtn.innerHTML = '<em>I</em>';
            italicBtn.title = 'Italic';
            italicBtn.type = 'button';
            italicBtn.style.cssText = 'padding: 4px 8px; border: 1px solid #dee2e6; background: white; cursor: pointer; border-radius: 3px; font-size: 12px; font-style: italic; min-width: 28px;';
            italicBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                formatText('italic');
            };
            toolbar.appendChild(italicBtn);
            
            // Underline button
            const underlineBtn = document.createElement('button');
            underlineBtn.innerHTML = '<u>U</u>';
            underlineBtn.title = 'Underline';
            underlineBtn.type = 'button';
            underlineBtn.style.cssText = 'padding: 4px 8px; border: 1px solid #dee2e6; background: white; cursor: pointer; border-radius: 3px; font-size: 12px; text-decoration: underline; min-width: 28px;';
            underlineBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                formatText('underline');
            };
            toolbar.appendChild(underlineBtn);
            
            // Strikethrough button
            const strikethroughBtn = document.createElement('button');
            strikethroughBtn.innerHTML = '<s>S</s>';
            strikethroughBtn.title = 'Strikethrough';
            strikethroughBtn.type = 'button';
            strikethroughBtn.style.cssText = 'padding: 4px 8px; border: 1px solid #dee2e6; background: white; cursor: pointer; border-radius: 3px; font-size: 12px; text-decoration: line-through; min-width: 28px;';
            strikethroughBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                formatText('strikeThrough');
            };
            toolbar.appendChild(strikethroughBtn);
            
            // Separator
            const separator1 = document.createElement('div');
            separator1.style.cssText = 'width: 1px; height: 20px; background: #dee2e6; margin: 0 2px;';
            toolbar.appendChild(separator1);
            
            // Text color picker button that opens modal
            const colorInput = document.createElement('button');
            const parsedTextColor = Editor.ColorPicker ? Editor.ColorPicker.parseColor(editor.style.color || '#000000') : { hex: '#000000', opacity: 1 };
            colorInput.title = 'Text Color';
            colorInput.style.cssText = 'width: 28px; height: 24px; border: 1px solid #dee2e6; border-radius: 3px; cursor: pointer; padding: 0; background: ' + (parsedTextColor.opacity < 1 && Editor.ColorPicker ? Editor.ColorPicker.hexToRgba(parsedTextColor.hex, parsedTextColor.opacity) : parsedTextColor.hex) + '; position: relative;';
            
            // Store selection before clicking color input
            let savedSelection = null;
            colorInput.onmousedown = (e) => {
                e.stopPropagation();
                e.preventDefault();
                // Save current selection before focus is lost
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const container = range.commonAncestorContainer;
                    const containerNode = container.nodeType === 3 ? container.parentNode : container;
                    if (editor.contains(containerNode) || containerNode === editor) {
                        savedSelection = range.cloneRange();
                    }
                }
                
                // Open color picker modal
                const currentColor = editor.style.color || '#000000';
                if (Editor.ColorPicker && Editor.ColorPicker.open) {
                    Editor.ColorPicker.open(currentColor, (rgbaColor) => {
                    editor.focus();
                    
                    // Restore selection if we had one
                    const selection = window.getSelection();
                    if (savedSelection) {
                        try {
                            selection.removeAllRanges();
                            selection.addRange(savedSelection);
                        } catch (e) {
                            if (selection.rangeCount === 0) {
                                const range = document.createRange();
                                range.selectNodeContents(editor);
                                range.collapse(false);
                                selection.removeAllRanges();
                                selection.addRange(range);
                            }
                        }
                    } else {
                        if (selection.rangeCount === 0) {
                            const range = document.createRange();
                            range.selectNodeContents(editor);
                            range.collapse(false);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                    }
                    
                    // Apply color to selection
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        if (!range.collapsed) {
                            const span = document.createElement('span');
                            span.style.color = rgbaColor;
                            try {
                                range.surroundContents(span);
                            } catch (e) {
                                const contents = range.extractContents();
                                span.appendChild(contents);
                                range.insertNode(span);
                            }
                        } else {
                            editor.style.color = rgbaColor;
                        }
                    } else {
                        editor.style.color = rgbaColor;
                    }
                    
                    // Update button appearance
                    const newParsed = Editor.ColorPicker ? Editor.ColorPicker.parseColor(rgbaColor) : { hex: rgbaColor, opacity: 1 };
                    colorInput.style.background = newParsed.opacity < 1 && Editor.ColorPicker ? Editor.ColorPicker.hexToRgba(newParsed.hex, newParsed.opacity) : newParsed.hex;
                    
                    // Update toolbar to reflect changes
                    setTimeout(updateToolbarFromContent, 0);
                    savedSelection = null;
                    }, () => self.getCurrentQuiz());
                }
            };
            
            toolbar.appendChild(colorInput);
            
            // Background color picker button that opens modal
            bgColorInput = document.createElement('button');
            const parsedBgColor = Editor.ColorPicker ? Editor.ColorPicker.parseColor(selectedElement.background_color || editor.style.backgroundColor || '#ffffff') : { hex: '#ffffff', opacity: 1 };
            bgColorInput.title = 'Background Color';
            bgColorInput.style.cssText = 'width: 28px; height: 24px; border: 1px solid #dee2e6; border-radius: 3px; cursor: pointer; padding: 0; background: ' + (parsedBgColor.opacity < 1 && Editor.ColorPicker ? Editor.ColorPicker.hexToRgba(parsedBgColor.hex, parsedBgColor.opacity) : parsedBgColor.hex) + '; position: relative;';
            
            bgColorInput.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                const currentBgColor = editor.style.backgroundColor || selectedElement.background_color || '#ffffff';
                if (Editor.ColorPicker && Editor.ColorPicker.open) {
                    Editor.ColorPicker.open(currentBgColor, (rgbaColor) => {
                        editor.style.backgroundColor = rgbaColor;
                        // Save the selected color to the tracked variable
                        currentBackgroundColor = rgbaColor;
                        // Update button appearance
                        const newParsed = Editor.ColorPicker ? Editor.ColorPicker.parseColor(rgbaColor) : { hex: rgbaColor, opacity: 1 };
                        bgColorInput.style.background = newParsed.opacity < 1 && Editor.ColorPicker ? Editor.ColorPicker.hexToRgba(newParsed.hex, newParsed.opacity) : newParsed.hex;
                    }, () => self.getCurrentQuiz());
                }
            };
            
            toolbar.appendChild(bgColorInput);
            
            // Separator
            const separator3 = document.createElement('div');
            separator3.style.cssText = 'width: 1px; height: 20px; background: #dee2e6; margin: 0 2px;';
            toolbar.appendChild(separator3);
            
            // Alignment dropdown button with menu
            const alignContainer = document.createElement('div');
            alignContainer.style.cssText = 'position: relative; display: inline-block;';
            
            const alignBtn = document.createElement('button');
            alignBtn.innerHTML = '⬌ ⬍';
            alignBtn.title = 'Alignment';
            alignBtn.type = 'button';
            alignBtn.style.cssText = 'padding: 4px 8px; border: 1px solid #dee2e6; background: white; cursor: pointer; border-radius: 3px; font-size: 12px; min-width: 28px;';
            
            const alignDropdown = document.createElement('div');
            alignDropdown.style.cssText = 'display: none; position: absolute; top: 100%; left: 0; background: white; border: 1px solid #dee2e6; border-radius: 3px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1000; margin-top: 2px; min-width: 120px;';
            
            // Horizontal alignment options
            const hAlignLabel = document.createElement('div');
            hAlignLabel.textContent = 'Horizontal:';
            hAlignLabel.style.cssText = 'padding: 4px 8px; font-size: 11px; font-weight: bold; color: #666; border-bottom: 1px solid #eee;';
            alignDropdown.appendChild(hAlignLabel);
            
            const alignLeftOption = document.createElement('div');
            alignLeftOption.innerHTML = '⬅ Left';
            alignLeftOption.style.cssText = 'padding: 6px 8px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px;';
            alignLeftOption.onmouseover = () => alignLeftOption.style.background = '#f0f0f0';
            alignLeftOption.onmouseout = () => alignLeftOption.style.background = 'white';
            alignLeftOption.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                formatText('justifyLeft');
                editor.style.alignItems = 'flex-start';
                selectedElement.text_align_horizontal = 'left';
                // Don't save - wait for Apply button
                alignDropdown.style.display = 'none';
            };
            alignDropdown.appendChild(alignLeftOption);
            
            const alignCenterOption = document.createElement('div');
            alignCenterOption.innerHTML = '⬌ Center';
            alignCenterOption.style.cssText = 'padding: 6px 8px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px;';
            alignCenterOption.onmouseover = () => alignCenterOption.style.background = '#f0f0f0';
            alignCenterOption.onmouseout = () => alignCenterOption.style.background = 'white';
            alignCenterOption.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                formatText('justifyCenter');
                editor.style.alignItems = 'center';
                selectedElement.text_align_horizontal = 'center';
                // Don't save - wait for Apply button
                alignDropdown.style.display = 'none';
            };
            alignDropdown.appendChild(alignCenterOption);
            
            const alignRightOption = document.createElement('div');
            alignRightOption.innerHTML = '➡ Right';
            alignRightOption.style.cssText = 'padding: 6px 8px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px;';
            alignRightOption.onmouseover = () => alignRightOption.style.background = '#f0f0f0';
            alignRightOption.onmouseout = () => alignRightOption.style.background = 'white';
            alignRightOption.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                formatText('justifyRight');
                editor.style.alignItems = 'flex-end';
                selectedElement.text_align_horizontal = 'right';
                // Don't save - wait for Apply button
                alignDropdown.style.display = 'none';
            };
            alignDropdown.appendChild(alignRightOption);
            
            // Vertical alignment options
            const vAlignLabel = document.createElement('div');
            vAlignLabel.textContent = 'Vertical:';
            vAlignLabel.style.cssText = 'padding: 4px 8px; font-size: 11px; font-weight: bold; color: #666; border-top: 1px solid #eee; border-bottom: 1px solid #eee; margin-top: 2px;';
            alignDropdown.appendChild(vAlignLabel);
            
            const alignTopOption = document.createElement('div');
            alignTopOption.innerHTML = '▲ Top';
            alignTopOption.style.cssText = 'padding: 6px 8px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px;';
            alignTopOption.onmouseover = () => alignTopOption.style.background = '#f0f0f0';
            alignTopOption.onmouseout = () => alignTopOption.style.background = 'white';
            alignTopOption.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                editor.style.justifyContent = 'flex-start';
                selectedElement.text_align_vertical = 'top';
                // Don't save - wait for Apply button
                alignDropdown.style.display = 'none';
            };
            alignDropdown.appendChild(alignTopOption);
            
            const alignMiddleOption = document.createElement('div');
            alignMiddleOption.innerHTML = '⬌ Middle';
            alignMiddleOption.style.cssText = 'padding: 6px 8px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px;';
            alignMiddleOption.onmouseover = () => alignMiddleOption.style.background = '#f0f0f0';
            alignMiddleOption.onmouseout = () => alignMiddleOption.style.background = 'white';
            alignMiddleOption.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                editor.style.justifyContent = 'center';
                selectedElement.text_align_vertical = 'middle';
                // Don't save - wait for Apply button
                alignDropdown.style.display = 'none';
            };
            alignDropdown.appendChild(alignMiddleOption);
            
            const alignBottomOption = document.createElement('div');
            alignBottomOption.innerHTML = '▼ Bottom';
            alignBottomOption.style.cssText = 'padding: 6px 8px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px;';
            alignBottomOption.onmouseover = () => alignBottomOption.style.background = '#f0f0f0';
            alignBottomOption.onmouseout = () => alignBottomOption.style.background = 'white';
            alignBottomOption.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                editor.style.justifyContent = 'flex-end';
                selectedElement.text_align_vertical = 'bottom';
                // Don't save - wait for Apply button
                alignDropdown.style.display = 'none';
            };
            alignDropdown.appendChild(alignBottomOption);
            
            alignBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Toggle dropdown
                const isVisible = alignDropdown.style.display === 'block';
                alignDropdown.style.display = isVisible ? 'none' : 'block';
            };
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!alignContainer.contains(e.target)) {
                    alignDropdown.style.display = 'none';
                }
            });
            
            alignContainer.appendChild(alignBtn);
            alignContainer.appendChild(alignDropdown);
            toolbar.appendChild(alignContainer);
            
            toolbarContainer.appendChild(toolbar);
            
            // Second row - font size and font family dropdowns
            const toolbarRow2 = document.createElement('div');
            toolbarRow2.style.cssText = 'padding: 4px; border-top: 1px solid #ddd; display: flex; gap: 6px; align-items: center;';
            
            // Font size dropdown
            const fontSizeLabel = document.createElement('label');
            fontSizeLabel.textContent = 'Size:';
            fontSizeLabel.style.cssText = 'font-size: 12px; margin-right: 4px; flex-shrink: 0;';
            toolbarRow2.appendChild(fontSizeLabel);
            
            const fontSizeContainer = document.createElement('div');
            fontSizeContainer.style.cssText = 'flex: 0 0 auto; min-width: 0;';
            const fontSizeSelect = document.createElement('select');
            fontSizeSelect.style.cssText = 'padding: 4px 6px; border: 1px solid #dee2e6; background: white; cursor: pointer; border-radius: 3px; font-size: 12px; min-width: 50px; max-width: 60px; width: 60px; box-sizing: border-box;';
            fontSizeSelect.dataset.interacting = 'false';
            
            // Font sizes - execCommand fontSize values map to: 1=10px, 2=13px, 3=16px, 4=18px, 5=24px, 6=32px, 7=48px
            // We'll use pixel values directly by applying inline styles
            const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];
            fontSizes.forEach(size => {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = size;
                fontSizeSelect.appendChild(option);
            });
            
            // Set default to 16 if no selection
            fontSizeSelect.value = '16';
            
            fontSizeSelect.addEventListener('mousedown', () => {
                fontSizeSelect.dataset.interacting = 'true';
            });
            fontSizeSelect.addEventListener('blur', () => {
                fontSizeSelect.dataset.interacting = 'false';
            });
            fontSizeSelect.onchange = () => {
                fontSizeSelect.dataset.interacting = 'true'; // Mark as interacting to prevent re-render
                editor.focus();
                const size = fontSizeSelect.value + 'px';
                const selection = window.getSelection();
                
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    if (!range.collapsed) {
                        // Apply to selected text - wrap in span with fontSize
                        const span = document.createElement('span');
                        span.style.fontSize = size;
                        try {
                            range.surroundContents(span);
                        } catch (e) {
                            // If surroundContents fails, extract and wrap
                            const contents = range.extractContents();
                            span.appendChild(contents);
                            range.insertNode(span);
                        }
                        // Move selection to after the span
                        range.setStartAfter(span);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        // No selection - wrap entire content in span with fontSize
                        const allContent = editor.innerHTML;
                        editor.innerHTML = `<span style="font-size: ${size};">${allContent}</span>`;
                        // Move cursor to end
                        const range = document.createRange();
                        range.selectNodeContents(editor);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                } else {
                    // No selection - wrap entire content in span with fontSize
                    const allContent = editor.innerHTML;
                    editor.innerHTML = `<span style="font-size: ${size};">${allContent}</span>`;
                    // Move cursor to end
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(editor);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                
                // Update toolbar to reflect changes
                setTimeout(updateToolbarFromContent, 0);
                // Don't save - wait for Apply button
                fontSizeSelect.dataset.interacting = 'false';
            };
            
            fontSizeContainer.appendChild(fontSizeSelect);
            toolbarRow2.appendChild(fontSizeContainer);
            
            // Font family dropdown
            const fontLabel = document.createElement('label');
            fontLabel.textContent = 'Font:';
            fontLabel.style.cssText = 'font-size: 12px; margin-right: 4px; margin-left: 8px; flex-shrink: 0;';
            toolbarRow2.appendChild(fontLabel);
            
            const fontFamilyContainer = document.createElement('div');
            fontFamilyContainer.style.cssText = 'flex: 1 1 auto; min-width: 0; max-width: 200px;';
            const fontFamilySelect = document.createElement('select');
            fontFamilySelect.style.cssText = 'padding: 4px 6px; border: 1px solid #dee2e6; background: white; cursor: pointer; border-radius: 3px; font-size: 12px; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis;';
            fontFamilySelect.dataset.interacting = 'false';
            
            const fonts = [
                { value: 'Arial', label: 'Arial' },
                { value: 'Times New Roman', label: 'Times New Roman' },
                { value: 'Courier New', label: 'Courier New' },
                { value: 'Georgia', label: 'Georgia' },
                { value: 'Verdana', label: 'Verdana' },
                { value: 'Helvetica', label: 'Helvetica' },
                { value: 'Comic Sans MS', label: 'Comic Sans MS' },
                { value: 'Trebuchet MS', label: 'Trebuchet MS' },
                { value: 'Impact', label: 'Impact' },
                { value: 'Lucida Console', label: 'Lucida Console' },
                { value: 'Tahoma', label: 'Tahoma' },
                { value: 'Palatino', label: 'Palatino' },
                { value: 'Garamond', label: 'Garamond' },
                { value: 'Bookman', label: 'Bookman' },
                { value: 'Century Gothic', label: 'Century Gothic' },
                { value: 'Lucida Sans Unicode', label: 'Lucida Sans Unicode' }
            ];
            
            fonts.forEach(font => {
                const option = document.createElement('option');
                option.value = font.value;
                option.textContent = font.label;
                option.style.fontFamily = font.value;
                fontFamilySelect.appendChild(option);
            });
            
            fontFamilySelect.addEventListener('mousedown', () => {
                fontFamilySelect.dataset.interacting = 'true';
            });
            fontFamilySelect.addEventListener('blur', () => {
                fontFamilySelect.dataset.interacting = 'false';
            });
            fontFamilySelect.onchange = () => {
                fontFamilySelect.dataset.interacting = 'true'; // Mark as interacting to prevent re-render
                editor.focus();
                const fontFamily = fontFamilySelect.value;
                const selection = window.getSelection();
                
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    if (!range.collapsed) {
                        // Apply to selected text - wrap in span with fontFamily
                        const span = document.createElement('span');
                        span.style.fontFamily = fontFamily;
                        try {
                            range.surroundContents(span);
                        } catch (e) {
                            // If surroundContents fails, extract and wrap
                            const contents = range.extractContents();
                            span.appendChild(contents);
                            range.insertNode(span);
                        }
                        // Move selection to after the span
                        range.setStartAfter(span);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        // No selection - wrap entire content in span with font
                        const allContent = editor.innerHTML;
                        editor.innerHTML = `<span style="font-family: ${fontFamily};">${allContent}</span>`;
                        // Move cursor to end
                        const range = document.createRange();
                        range.selectNodeContents(editor);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                } else {
                    // No selection - wrap entire content in span with font
                    const allContent = editor.innerHTML;
                    editor.innerHTML = `<span style="font-family: ${fontFamily};">${allContent}</span>`;
                    // Move cursor to end
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(editor);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                
                // Update toolbar to reflect changes
                setTimeout(updateToolbarFromContent, 0);
                // Don't save - wait for Apply button
                fontFamilySelect.dataset.interacting = 'false';
            };
            
            fontFamilyContainer.appendChild(fontFamilySelect);
            toolbarRow2.appendChild(fontFamilyContainer);
            toolbarContainer.appendChild(toolbarRow2);
            
            contentGroup.appendChild(toolbarContainer);
            
            // Function to extract formatting from content and update toolbar
            const updateToolbarFromContent = () => {
                if (!editor || !editor.innerHTML) return;
                
                const content = editor.innerHTML;
                
                // Extract font size from HTML (look for font-size in style attributes)
                const fontSizeMatches = content.match(/font-size:\s*(\d+)px/gi);
                if (fontSizeMatches && fontSizeMatches.length > 0) {
                    // Get the most recent/last font size found
                    const lastMatch = fontSizeMatches[fontSizeMatches.length - 1];
                    const size = parseInt(lastMatch.match(/\d+/)[0]);
                    if (fontSizes && fontSizes.includes(size) && fontSizeSelect) {
                        fontSizeSelect.value = size.toString();
                    }
                } else {
                    // Try to get from the editor's first child element
                    try {
                        const firstChild = editor.firstElementChild || editor;
                        if (firstChild) {
                            const computedSize = window.getComputedStyle(firstChild).fontSize;
                            const size = parseInt(computedSize);
                            if (fontSizes && fontSizes.includes(size) && fontSizeSelect) {
                                fontSizeSelect.value = size.toString();
                            }
                        }
                    } catch (e) {
                        // Ignore errors
                    }
                }
                
                // Extract font family from HTML
                const fontFamilyMatches = content.match(/font-family:\s*['"]?([^'";}]+)['"]?/gi);
                if (fontFamilyMatches && fontFamilyMatches.length > 0) {
                    const lastMatch = fontFamilyMatches[fontFamilyMatches.length - 1];
                    const familyMatch = lastMatch.match(/font-family:\s*['"]?([^'";}]+)['"]?/i);
                    if (familyMatch && fontFamilySelect) {
                        const family = familyMatch[1].trim();
                        const fontOption = Array.from(fontFamilySelect.options).find(opt => opt.value === family);
                        if (fontOption) {
                            fontFamilySelect.value = family;
                        }
                    }
                } else {
                    // Try to get from computed style
                    try {
                        const firstChild = editor.firstElementChild || editor;
                        if (firstChild && fontFamilySelect) {
                            const computedFamily = window.getComputedStyle(firstChild).fontFamily;
                            const family = computedFamily.split(',')[0].replace(/['"]/g, '').trim();
                            const fontOption = Array.from(fontFamilySelect.options).find(opt => opt.value === family);
                            if (fontOption) {
                                fontFamilySelect.value = family;
                            }
                        }
                    } catch (e) {
                        // Ignore errors
                    }
                }
                
                // Extract text color from HTML
                const colorMatches = content.match(/color:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\))/gi);
                if (colorMatches && colorMatches.length > 0 && colorInput) {
                    const lastMatch = colorMatches[colorMatches.length - 1];
                    const colorMatch = lastMatch.match(/color:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\))/i);
                    if (colorMatch) {
                        let color = colorMatch[1];
                        // Convert rgb to hex if needed
                        if (color.startsWith('rgb')) {
                            const rgbMatch = color.match(/\d+/g);
                            if (rgbMatch && rgbMatch.length >= 3) {
                                const r = parseInt(rgbMatch[0]).toString(16).padStart(2, '0');
                                const g = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
                                const b = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
                                color = `#${r}${g}${b}`;
                            }
                        }
                        colorInput.value = color;
                    }
                } else {
                    // Try to get from computed style
                    try {
                        const firstChild = editor.firstElementChild || editor;
                        if (firstChild && colorInput) {
                            const computedColor = window.getComputedStyle(firstChild).color;
                            const rgbMatch = computedColor.match(/\d+/g);
                            if (rgbMatch && rgbMatch.length >= 3) {
                                const r = parseInt(rgbMatch[0]).toString(16).padStart(2, '0');
                                const g = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
                                const b = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
                                colorInput.value = `#${r}${g}${b}`;
                            }
                        }
                    } catch (e) {
                        // Ignore errors
                    }
                }
                
                // Check for bold, italic, underline, strikethrough in HTML
                const hasBold = content.includes('<strong>') || content.includes('<b>') || 
                               (content.includes('font-weight') && content.match(/font-weight:\s*(bold|700|800|900)/i));
                const hasItalic = content.includes('<em>') || content.includes('<i>') || 
                                 content.includes('font-style:\s*italic');
                const hasUnderline = content.includes('<u>') || 
                                    (content.includes('text-decoration') && content.includes('underline'));
                const hasStrikethrough = content.includes('<s>') || content.includes('<strike>') || content.includes('<del>') ||
                                        (content.includes('text-decoration') && content.includes('line-through'));
                
                // Update button states
                if (boldBtn) {
                    if (hasBold) {
                        boldBtn.style.background = '#2196F3';
                        boldBtn.style.color = 'white';
                    } else {
                        boldBtn.style.background = 'white';
                        boldBtn.style.color = '#333';
                    }
                }
                
                if (italicBtn) {
                    if (hasItalic) {
                        italicBtn.style.background = '#2196F3';
                        italicBtn.style.color = 'white';
                    } else {
                        italicBtn.style.background = 'white';
                        italicBtn.style.color = '#333';
                    }
                }
                
                if (underlineBtn) {
                    if (hasUnderline) {
                        underlineBtn.style.background = '#2196F3';
                        underlineBtn.style.color = 'white';
                    } else {
                        underlineBtn.style.background = 'white';
                        underlineBtn.style.color = '#333';
                    }
                }
                
                if (strikethroughBtn) {
                    if (hasStrikethrough) {
                        strikethroughBtn.style.background = '#2196F3';
                        strikethroughBtn.style.color = 'white';
                    } else {
                        strikethroughBtn.style.background = 'white';
                        strikethroughBtn.style.color = '#333';
                    }
                }
            };
            
            // Update toolbar when selection changes
            editor.addEventListener('mouseup', () => {
                setTimeout(updateToolbarFromContent, 0);
            });
            editor.addEventListener('keyup', () => {
                setTimeout(updateToolbarFromContent, 0);
            });
            
            // Initial update after editor is added to DOM
            setTimeout(() => {
                updateToolbarFromContent();
            }, 0);
            
            // Editor event listeners
            editor.addEventListener('focus', () => {
                editor.dataset.interacting = 'true';
            });
            editor.addEventListener('blur', () => {
                editor.dataset.interacting = 'false';
                // Don't save on blur - wait for Apply button
            });
            
            // No automatic saving - only Apply button saves
            
            // Keyboard shortcuts
            editor.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'b') {
                        e.preventDefault();
                        formatText('bold');
                    } else if (e.key === 'i') {
                        e.preventDefault();
                        formatText('italic');
                    } else if (e.key === 'u') {
                        e.preventDefault();
                        formatText('underline');
                    }
                }
            });
            
            contentGroup.appendChild(editor);
            
            // Apply button - only way to save richtext changes
            const applyButton = document.createElement('button');
            applyButton.textContent = 'Apply';
            applyButton.type = 'button';
            applyButton.style.cssText = 'margin-top: 0.5rem; padding: 0.5rem 1rem; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; width: 100%;';
            applyButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Save all richtext properties
                saveRichTextContent();
            };
            contentGroup.appendChild(applyButton);
            
            container.appendChild(contentGroup);
        }
        
        // Question checkbox - only appears for display view elements (not child elements)
        if ((selectedElement.view === 'display' || !selectedElement.view)) {
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
                const wasQuestion = selectedElement.is_question;
                selectedElement.is_question = questionCheckbox.checked;
                
                // Get current page reference
                const currentQuiz = self.getCurrentQuiz();
                const currentPageIndex = self.getCurrentPageIndex();
                let currentPage = currentQuiz.pages[currentPageIndex];
                
                if (!selectedElement.is_question) {
                    // Remove child element configs from parent element's view configs (not separate entries)
                    if (currentPage.views) {
                        // Remove answer_input_config from participant view
                        if (currentPage.views.participant && 
                            currentPage.views.participant.local_element_configs && 
                            currentPage.views.participant.local_element_configs[selectedElement.id]) {
                            delete currentPage.views.participant.local_element_configs[selectedElement.id].answer_input_config;
                        }
                        // Remove answer_display_config from control view
                        if (currentPage.views.control && 
                            currentPage.views.control.local_element_configs && 
                            currentPage.views.control.local_element_configs[selectedElement.id]) {
                            delete currentPage.views.control.local_element_configs[selectedElement.id].answer_display_config;
                        }
                    }
                    // Remove question_config if it exists
                    if (selectedElement.question_config) {
                        delete selectedElement.question_config;
                    }
                    delete selectedElement.answer_type;
                    delete selectedElement.options;
                } else {
                    // Create child answer elements
                    if (!selectedElement.question_config) {
                        selectedElement.question_config = {};
                    }
                    if (!selectedElement.question_config.question_type) {
                        selectedElement.question_config.question_type = 'text';
                    }
                    
                    if (!wasQuestion) {
                        // Store child element positions in parent element's view configs (not separate entries)
                        const childElements = Editor.ElementCreator.createQuestionChildElements(selectedElement, currentPage);
                        
                        // Find answer_input and answer_display child elements
                        const answerInput = childElements.find(el => el.type === 'answer_input');
                        const answerDisplay = childElements.find(el => el.type === 'answer_display');
                        
                        // Store answer_input position in participant view config
                        if (answerInput) {
                            if (!currentPage.views) {
                                currentPage.views = {
                                    display: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                                    participant: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                                    control: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} }
                                };
                            }
                            if (!currentPage.views.participant.local_element_configs[selectedElement.id]) {
                                currentPage.views.participant.local_element_configs[selectedElement.id] = { config: {} };
                            }
                            
                            // Get default dimensions based on question type
                            const questionType = (selectedElement.question_config && selectedElement.question_config.question_type) || selectedElement.answer_type || 'text';
                            function getDefaultAnswerInputDimensions(answerType) {
                                if (answerType === 'stopwatch') {
                                    return { width: 370, height: 120 };
                                }
                                // Default for other types
                                return { width: 380, height: 175 };
                            }
                            const defaultDims = getDefaultAnswerInputDimensions(questionType);
                            
                            currentPage.views.participant.local_element_configs[selectedElement.id].answer_input_config = {
                                x: answerInput.x || 5,
                                y: answerInput.y || 0,
                                width: answerInput.width || defaultDims.width,
                                height: answerInput.height || defaultDims.height,
                                rotation: answerInput.rotation || 0
                            };
                        }
                        
                        // Store answer_display position in control view config
                        if (answerDisplay) {
                            if (!currentPage.views) {
                                currentPage.views = {
                                    display: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                                    participant: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                                    control: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} }
                                };
                            }
                            if (!currentPage.views.control.local_element_configs[selectedElement.id]) {
                                currentPage.views.control.local_element_configs[selectedElement.id] = { config: {} };
                            }
                            currentPage.views.control.local_element_configs[selectedElement.id].answer_display_config = {
                                x: answerDisplay.x || 0,
                                y: answerDisplay.y || 0,
                                width: answerDisplay.width || 600,
                                height: answerDisplay.height || 300,
                                rotation: answerDisplay.rotation || 0
                            };
                        }
                    }
                }
                
                // Save the is_question change to quiz structure
                currentPage = Editor.QuizStructure.setPageElement(currentPage, selectedElement);
                if (currentQuiz && currentQuiz.pages && currentQuiz.pages[currentPageIndex] !== currentPage) {
                    currentQuiz.pages[currentPageIndex] = currentPage;
                }
                
                self.render(); // Re-render to show/hide answer type dropdown
                self.renderCanvas(); // Re-render to show/hide child elements
                self.autosaveQuiz();
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
                titleInput.dataset.interacting = 'false';
                
                // Function to save question title to quiz structure
                const saveQuestionTitle = () => {
                    selectedElement.question_title = titleInput.value;
                    
                    // Save to quiz structure using setPageElement
                    const currentQuiz = self.getCurrentQuiz();
                    const currentPageIndex = self.getCurrentPageIndex();
                    let currentPage = currentQuiz.pages[currentPageIndex];
                    
                    if (currentPage && Editor.QuizStructure && Editor.QuizStructure.setPageElement) {
                        currentPage = Editor.QuizStructure.setPageElement(currentPage, selectedElement);
                        if (currentQuiz && currentQuiz.pages && currentQuiz.pages[currentPageIndex] !== currentPage) {
                            currentQuiz.pages[currentPageIndex] = currentPage;
                        }
                    }
                };
                
                // Debounced functions for canvas update and autosave
                const debouncedRenderCanvas = self.debounce(() => {
                    self.renderCanvas(); // Re-render canvas to show updated title
                }, 300);
                const debouncedSaveAndAutosave = self.debounce(() => {
                    saveQuestionTitle();
                    self.autosaveQuiz();
                }, 500);
                
                // Track focus/blur to prevent re-rendering while typing
                titleInput.addEventListener('focus', () => {
                    titleInput.dataset.interacting = 'true';
                });
                titleInput.addEventListener('blur', () => {
                    // Save scroll position before any re-renders
                    const panel = document.getElementById('properties-panel');
                    if (panel && typeof setCookie === 'function') {
                        const scrollableContainer = panel.querySelector('.properties-content') || panel;
                        if (scrollableContainer && scrollableContainer.scrollTop !== undefined) {
                            const quizId = typeof getQuizIdGlobal === 'function' ? getQuizIdGlobal() : '';
                            const currentPageIndex = self.getCurrentPageIndex ? self.getCurrentPageIndex() : 0;
                            const cookieName = `properties_panel_scroll_${quizId}_${currentPageIndex}`;
                            setCookie(cookieName, scrollableContainer.scrollTop.toString(), 365);
                        }
                    }
                    
                    titleInput.dataset.interacting = 'false';
                    // Update on blur - save immediately
                    saveQuestionTitle();
                    self.renderCanvas();
                    self.autosaveQuiz();
                });
                
                // Update value on input, but don't trigger full re-render
                titleInput.addEventListener('input', () => {
                    selectedElement.question_title = titleInput.value;
                    debouncedRenderCanvas();
                    debouncedSaveAndAutosave();
                });
                
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
                    // Check question_config first, then fallback to question_type/answer_type
                    let currentType = (selectedElement.question_config && selectedElement.question_config.question_type) || 
                                     selectedElement.question_type || 
                                     selectedElement.answer_type || 
                                     'text';
                    // Normalize multiple_choice to radio (they're the same thing)
                    if (currentType === 'multiple_choice') {
                        currentType = 'radio';
                    }
                    if (currentType === option.value) {
                        optionEl.selected = true;
                    }
                    answerTypeSelect.appendChild(optionEl);
                });
                
                answerTypeSelect.onchange = () => {
                    const newType = answerTypeSelect.value;
                    // Update question_config.question_type (new format)
                    if (!selectedElement.question_config) {
                        selectedElement.question_config = {};
                    }
                    selectedElement.question_config.question_type = newType;
                    // Also update answer_type for backwards compatibility
                    selectedElement.answer_type = newType;
                    
                    // Set default options for radio/checkbox
                    if (newType === 'radio' || newType === 'checkbox') {
                        if (!selectedElement.options) {
                            selectedElement.options = ['Option 1', 'Option 2', 'Option 3'];
                        }
                        // Also store in question_config
                        selectedElement.question_config.options = selectedElement.options;
                    } else {
                        delete selectedElement.options;
                        if (selectedElement.question_config) {
                            delete selectedElement.question_config.options;
                        }
                    }
                    
                    // Save to quiz structure before autosave
                    if (self.updateElementPropertiesInQuiz) {
                        self.updateElementPropertiesInQuiz(selectedElement);
                    }
                    
                    // Child elements (answer_input, answer_display) inherit properties from parent
                    // No need to update them separately - they're generated from parent element data
                    
                    self.render(); // Re-render to show/hide options
                    self.renderCanvas(); // Re-render canvas to show updated answer input
                    self.autosaveQuiz();
                };
                
                answerTypeGroup.appendChild(answerTypeLabel);
                answerTypeGroup.appendChild(answerTypeSelect);
                container.appendChild(answerTypeGroup);
                
                // Correct Answer input - only shown if element is a question
                const correctAnswerGroup = document.createElement('div');
                correctAnswerGroup.className = 'property-group';
                const correctAnswerLabel = document.createElement('label');
                correctAnswerLabel.textContent = 'Correct Answer';
                correctAnswerGroup.appendChild(correctAnswerLabel);
                
                // Function to render correct answer input based on answer type
                const renderCorrectAnswerInput = () => {
                    // Clear existing correct answer input
                    const existingInput = correctAnswerGroup.querySelector('.correct-answer-input-container');
                    if (existingInput) {
                        existingInput.remove();
                    }
                    
                    const currentType = (selectedElement.question_config && selectedElement.question_config.question_type) || 'text';
                    // Extract correct_answer: check question_config first, then direct property (for backwards compatibility)
                    const currentCorrectAnswer = (selectedElement.question_config && selectedElement.question_config.question_correct_answer !== undefined) 
                        ? selectedElement.question_config.question_correct_answer 
                        : (selectedElement.question_correct_answer !== undefined ? selectedElement.question_correct_answer : 
                           (selectedElement.correct_answer !== undefined ? selectedElement.correct_answer : ''));
                    
                    const inputContainer = document.createElement('div');
                    inputContainer.className = 'correct-answer-input-container';
                    inputContainer.style.cssText = 'margin-top: 0.5rem;';
                    
                    // Function to save correct answer
                    const saveCorrectAnswer = (value) => {
                        if (!selectedElement.question_config) {
                            selectedElement.question_config = {};
                        }
                        // Preserve question_type when saving correct answer
                        if (!selectedElement.question_config.question_type) {
                            selectedElement.question_config.question_type = selectedElement.answer_type || 'text';
                        }
                        // Normalize multiple_choice to radio
                        if (selectedElement.question_config.question_type === 'multiple_choice') {
                            selectedElement.question_config.question_type = 'radio';
                        }
                        selectedElement.question_config.question_correct_answer = value;
                        selectedElement.question_correct_answer = value; // Backwards compatibility
                        
                        // Save to quiz structure
                        const currentQuiz = self.getCurrentQuiz();
                        const currentPageIndex = self.getCurrentPageIndex();
                        let currentPage = currentQuiz.pages[currentPageIndex];
                        
                        if (currentPage && Editor.QuizStructure && Editor.QuizStructure.setPageElement) {
                            currentPage = Editor.QuizStructure.setPageElement(currentPage, selectedElement);
                            if (currentQuiz && currentQuiz.pages && currentQuiz.pages[currentPageIndex] !== currentPage) {
                                currentQuiz.pages[currentPageIndex] = currentPage;
                            }
                        }
                    };
                    
                    if (currentType === 'text' || currentType === 'stopwatch') {
                        // Text input for text and stopwatch
                        const textInput = document.createElement('input');
                        textInput.type = 'text';
                        textInput.value = currentCorrectAnswer || '';
                        textInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
                        textInput.dataset.interacting = 'false';
                        
                        const debouncedSave = self.debounce(() => {
                            saveCorrectAnswer(textInput.value);
                            self.autosaveQuiz();
                        }, 500);
                        
                        textInput.addEventListener('focus', () => {
                            textInput.dataset.interacting = 'true';
                        });
                        textInput.addEventListener('blur', () => {
                            // Save immediately and synchronously before allowing re-render
                            // This ensures the value is saved even if the panel re-renders
                            saveCorrectAnswer(textInput.value);
                            self.autosaveQuiz();
                            // Set interacting to false after save completes
                            textInput.dataset.interacting = 'false';
                        });
                        textInput.addEventListener('input', () => {
                            debouncedSave();
                        });
                        
                        inputContainer.appendChild(textInput);
                    } else if (currentType === 'radio') {
                        // Dropdown for multiple choice (radio)
                        const select = document.createElement('select');
                        select.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
                        
                        const options = selectedElement.options || (selectedElement.question_config && selectedElement.question_config.options) || [];
                        
                        // Add empty option
                        const emptyOption = document.createElement('option');
                        emptyOption.value = '';
                        emptyOption.textContent = '-- Select --';
                        select.appendChild(emptyOption);
                        
                        options.forEach(option => {
                            const optionEl = document.createElement('option');
                            optionEl.value = option;
                            optionEl.textContent = option;
                            if (currentCorrectAnswer === option) {
                                optionEl.selected = true;
                            }
                            select.appendChild(optionEl);
                        });
                        
                        select.onchange = () => {
                            saveCorrectAnswer(select.value);
                            self.autosaveQuiz();
                        };
                        
                        inputContainer.appendChild(select);
                    } else if (currentType === 'checkbox') {
                        // Checkboxes for multiple selection
                        const options = selectedElement.options || (selectedElement.question_config && selectedElement.question_config.options) || [];
                        const selectedAnswers = Array.isArray(currentCorrectAnswer) ? currentCorrectAnswer : 
                                               (currentCorrectAnswer ? [currentCorrectAnswer] : []);
                        
                        options.forEach(option => {
                            const label = document.createElement('label');
                            label.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; cursor: pointer;';
                            
                            const checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.value = option;
                            checkbox.checked = selectedAnswers.includes(option);
                            checkbox.style.cssText = 'cursor: pointer;';
                            
                            checkbox.onchange = () => {
                                let newAnswers = Array.from(inputContainer.querySelectorAll('input[type="checkbox"]:checked'))
                                    .map(cb => cb.value);
                                saveCorrectAnswer(newAnswers);
                                self.autosaveQuiz();
                            };
                            
                            label.appendChild(checkbox);
                            label.appendChild(document.createTextNode(option));
                            inputContainer.appendChild(label);
                        });
                    } else if (currentType === 'image_click') {
                        // Image click - show image and allow clicking to set coordinates
                        const imageContainer = document.createElement('div');
                        imageContainer.style.cssText = 'border: 2px solid #ddd; border-radius: 4px; padding: 0.5rem; background: #f9f9f9;';
                        
                        // Get image source from the question element (if it's an image element)
                        let imageSrc = null;
                        if (selectedElement.type === 'image' || selectedElement.media_type === 'image') {
                            imageSrc = selectedElement.media_url || selectedElement.src || 
                                      (selectedElement.file_name ? '/api/media/serve/' + selectedElement.file_name : '') ||
                                      (selectedElement.filename ? '/api/media/serve/' + selectedElement.filename : '');
                        }
                        
                        if (imageSrc) {
                            const img = document.createElement('img');
                            // Normalize URL to prevent mixed content errors (HTTP -> HTTPS or absolute -> relative)
                            img.src = normalizeMediaUrlSafe(imageSrc);
                            img.style.cssText = 'max-width: 100%; height: auto; cursor: crosshair; border: 1px solid #ccc; border-radius: 4px;';
                            img.alt = 'Click to set correct answer';
                            
                            // Show current coordinates if set
                            let currentCoords = null;
                            if (currentCorrectAnswer && typeof currentCorrectAnswer === 'object') {
                                currentCoords = currentCorrectAnswer;
                            } else if (currentCorrectAnswer && typeof currentCorrectAnswer === 'string') {
                                try {
                                    currentCoords = JSON.parse(currentCorrectAnswer);
                                } catch (e) {
                                    // Not JSON, ignore
                                }
                            }
                            
                            // Draw indicator if coordinates exist
                            const indicator = document.createElement('div');
                            indicator.style.cssText = 'position: absolute; width: 20px; height: 20px; border: 3px solid #4CAF50; border-radius: 50%; background: rgba(76, 175, 80, 0.3); pointer-events: none; transform: translate(-50%, -50%); display: none;';
                            
                            const wrapper = document.createElement('div');
                            wrapper.style.cssText = 'position: relative; display: inline-block; width: 100%;';
                            wrapper.appendChild(img);
                            wrapper.appendChild(indicator);
                            
                            // Function to update indicator position
                            const updateIndicator = (coords) => {
                                if (coords && coords.x !== undefined && coords.y !== undefined) {
                                    indicator.style.left = `${coords.x}%`;
                                    indicator.style.top = `${coords.y}%`;
                                    indicator.style.display = 'block';
                                } else {
                                    indicator.style.display = 'none';
                                }
                            };
                            
                            if (currentCoords && currentCoords.x !== undefined && currentCoords.y !== undefined) {
                                img.onload = () => {
                                    updateIndicator(currentCoords);
                                };
                                if (img.complete) img.onload();
                            }
                            
                            img.onclick = (e) => {
                                const rect = img.getBoundingClientRect();
                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                
                                const coords = { x, y };
                                saveCorrectAnswer(coords);
                                self.autosaveQuiz();
                                
                                // Update indicator and display
                                updateIndicator(coords);
                                coordsDisplay.textContent = `Coordinates: (${coords.x.toFixed(1)}%, ${coords.y.toFixed(1)}%)`;
                            };
                            
                            imageContainer.appendChild(wrapper);
                            
                            // Show coordinates display
                            const coordsDisplay = document.createElement('div');
                            coordsDisplay.style.cssText = 'margin-top: 0.5rem; font-size: 0.9rem; color: #666;';
                            coordsDisplay.textContent = currentCoords ? 
                                `Coordinates: (${currentCoords.x.toFixed(1)}%, ${currentCoords.y.toFixed(1)}%)` : 
                                'Click on the image to set correct answer coordinates';
                            imageContainer.appendChild(coordsDisplay);
                        } else {
                            const noImageMsg = document.createElement('div');
                            noImageMsg.style.cssText = 'padding: 1rem; text-align: center; color: #999; font-style: italic;';
                            noImageMsg.textContent = 'This question element must be an image to set coordinates';
                            imageContainer.appendChild(noImageMsg);
                        }
                        
                        inputContainer.appendChild(imageContainer);
                    }
                    
                    correctAnswerGroup.appendChild(inputContainer);
                };
                
                // Initial render
                renderCorrectAnswerInput();
                
                // Re-render when answer type changes
                const originalOnChange = answerTypeSelect.onchange;
                answerTypeSelect.onchange = () => {
                    originalOnChange();
                    renderCorrectAnswerInput();
                };
                
                container.appendChild(correctAnswerGroup);
                
                // Timer Start Method for stopwatch questions
                const currentType = (selectedElement.question_config && selectedElement.question_config.question_type) || 'text';
                if (currentType === 'stopwatch') {
                    const timerStartMethodGroup = document.createElement('div');
                    timerStartMethodGroup.className = 'property-group';
                    const timerStartMethodLabel = document.createElement('label');
                    timerStartMethodLabel.textContent = 'Timer Start Method';
                    timerStartMethodGroup.appendChild(timerStartMethodLabel);
                    
                    const timerStartMethodSelect = document.createElement('select');
                    timerStartMethodSelect.style.width = '100%';
                    timerStartMethodSelect.style.padding = '0.5rem';
                    timerStartMethodSelect.style.border = '1px solid #ddd';
                    timerStartMethodSelect.style.borderRadius = '4px';
                    
                    // Get current timer start method (default to 'user')
                    const currentTimerStartMethod = (selectedElement.question_config && selectedElement.question_config.timer_start_method) || 'user';
                    
                    // Check if the question element is playable
                    let isPlayable = false;
                    // If this is a child element (answer_input), find the parent question
                    if (selectedElement.parent_id) {
                        const currentQuiz = self.getCurrentQuiz();
                        const currentPageIndex = self.getCurrentPageIndex();
                        if (currentQuiz && currentQuiz.pages && currentQuiz.pages[currentPageIndex]) {
                            const page = currentQuiz.pages[currentPageIndex];
                            if (page.elements && page.elements[selectedElement.parent_id]) {
                                const parentElement = page.elements[selectedElement.parent_id];
                                if (window.ElementTypes && window.ElementTypes.isElementPlayable) {
                                    isPlayable = window.ElementTypes.isElementPlayable(parentElement);
                                } else {
                                    isPlayable = (parentElement.type === 'audio' || parentElement.type === 'video' || parentElement.type === 'counter' ||
                                                 parentElement.media_type === 'audio' || parentElement.media_type === 'video');
                                }
                            }
                        }
                    } else {
                        // This is the question element itself
                        if (window.ElementTypes && window.ElementTypes.isElementPlayable) {
                            isPlayable = window.ElementTypes.isElementPlayable(selectedElement);
                        } else {
                            isPlayable = (selectedElement.type === 'audio' || selectedElement.type === 'video' || selectedElement.type === 'counter' ||
                                         selectedElement.media_type === 'audio' || selectedElement.media_type === 'video');
                        }
                    }
                    
                    // Add options
                    const options = [
                        { value: 'user', label: 'User' },
                        { value: 'on_appear', label: 'On Appear' }
                    ];
                    
                    // Add playable-only options if element is playable
                    if (isPlayable) {
                        options.push(
                            { value: 'on_play', label: 'On Play' },
                            { value: 'on_end', label: 'On End' }
                        );
                    }
                    
                    options.forEach(option => {
                        const optionEl = document.createElement('option');
                        optionEl.value = option.value;
                        optionEl.textContent = option.label;
                        if (currentTimerStartMethod === option.value) {
                            optionEl.selected = true;
                        }
                        timerStartMethodSelect.appendChild(optionEl);
                    });
                    
                    timerStartMethodSelect.onchange = () => {
                        const newMethod = timerStartMethodSelect.value;
                        if (!selectedElement.question_config) {
                            selectedElement.question_config = {};
                        }
                        selectedElement.question_config.timer_start_method = newMethod;
                        
                        // Save to quiz structure
                        if (self.updateElementPropertiesInQuiz) {
                            self.updateElementPropertiesInQuiz(selectedElement);
                        }
                        
                        self.autosaveQuiz();
                    };
                    
                    timerStartMethodGroup.appendChild(timerStartMethodSelect);
                    container.appendChild(timerStartMethodGroup);
                }
                
                // Options for radio/checkbox
                if (currentType === 'radio' || currentType === 'checkbox') {
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
                        selectedElement.options = textarea.value.split('\n').filter(o => o.trim());
                        // Also store in question_config
                        if (!selectedElement.question_config) {
                            selectedElement.question_config = {};
                        }
                        selectedElement.question_config.options = selectedElement.options;
                        
                        // Save to quiz structure before autosave
                        if (self.updateElementPropertiesInQuiz) {
                            self.updateElementPropertiesInQuiz(selectedElement);
                        }
                        
                        // Re-render correct answer input to update options
                        renderCorrectAnswerInput();
                        
                        // Child elements (answer_input, answer_display) inherit options from parent
                        // No need to update them separately - they're generated from parent element data
                        
                        self.renderCanvas(); // Re-render to update child elements
                        self.autosaveQuiz();
                    };
                    optionsDiv.appendChild(textarea);
                    container.appendChild(optionsDiv);
                }
            }
        }
        
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
            const audioSrc = selectedElement.media_url || selectedElement.src || (selectedElement.filename ? '/api/media/serve/' + selectedElement.filename : '');
            // Normalize URL to prevent mixed content errors (HTTP -> HTTPS or absolute -> relative)
            audio.src = normalizeMediaUrlSafe(audioSrc);
            audio.style.width = '100%';
            audioContainer.appendChild(audio);
            audioGroup.appendChild(audioContainer);
            container.appendChild(audioGroup);
        }
        
        // Media-specific properties
        if (['image', 'video', 'audio'].includes(selectedElement.type) || selectedElement.media_type) {
            if (selectedElement.media_url || selectedElement.url) {
                const mediaUrlGroup = document.createElement('div');
                mediaUrlGroup.className = 'property-group';
                const mediaUrlLabel = document.createElement('label');
                mediaUrlLabel.textContent = 'Media URL';
                const mediaUrlInput = document.createElement('input');
                mediaUrlInput.type = 'text';
                mediaUrlInput.value = selectedElement.media_url || selectedElement.url || '';
                mediaUrlInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
                mediaUrlInput.onchange = () => {
                    if (selectedElement.media_url !== undefined) {
                        selectedElement.media_url = mediaUrlInput.value.trim();
                    } else {
                        selectedElement.url = mediaUrlInput.value.trim();
                    }
                    self.updateElementDisplay();
                    self.autosaveQuiz();
                };
                mediaUrlGroup.appendChild(mediaUrlLabel);
                mediaUrlGroup.appendChild(mediaUrlInput);
                container.appendChild(mediaUrlGroup);
            }
        }
        
        // Counter-specific properties
        if (selectedElement.type === 'counter' && Editor.PropertiesPanel && Editor.PropertiesPanel.renderCounterProperties) {
            Editor.PropertiesPanel.renderCounterProperties.call(self, container, selectedElement);
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
            if (self.deleteSelectedElement) {
                self.deleteSelectedElement();
            }
        });
        deleteGroup.appendChild(deleteButton);
        container.appendChild(deleteGroup);
    };
})();
