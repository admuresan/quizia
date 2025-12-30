// General properties rendering for properties panel
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    if (!Editor.PropertiesPanel) {
        Editor.PropertiesPanel = {};
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
        
        const xGroup = document.createElement('div');
        const xLabel = document.createElement('label');
        xLabel.textContent = 'X (left)';
        xLabel.style.cssText = 'display: block; margin-bottom: 0.25rem; font-size: 0.85rem; color: #666;';
        const xInput = document.createElement('input');
        xInput.type = 'number';
        xInput.step = '1';
        xInput.dataset.property = 'x'; // Add data attribute for easy selection
        // Display absolute pixel value from top-left corner (0,0 = top-left)
        xInput.value = Math.round(selectedElement.x || 0);
        xInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        xInput.title = 'Absolute pixel position from left edge of canvas (0 = left edge)';
        xInput.onchange = () => {
                // Save as absolute pixel value from top-left corner
                selectedElement.x = parseFloat(xInput.value) || 0;
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
        yInput.value = Math.round(selectedElement.y || 0);
        yInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        yInput.title = 'Absolute pixel position from top edge of canvas (0 = top edge)';
        yInput.onchange = () => {
                // Save as absolute pixel value from top-left corner
                selectedElement.y = parseFloat(yInput.value) || 0;
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
        
        const widthGroup = document.createElement('div');
        const widthLabel = document.createElement('label');
        widthLabel.textContent = 'Width';
        widthLabel.style.cssText = 'display: block; margin-bottom: 0.25rem; font-size: 0.9rem;';
        const widthInput = document.createElement('input');
        widthInput.type = 'number';
        widthInput.dataset.property = 'width'; // Add data attribute for easy selection
        widthInput.value = selectedElement.width || 100;
        widthInput.min = '1';
        widthInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        widthInput.onchange = () => {
                selectedElement.width = parseFloat(widthInput.value) || 100;
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
        heightInput.value = selectedElement.height || 100;
        heightInput.min = '1';
        heightInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        heightInput.onchange = () => {
                selectedElement.height = parseFloat(heightInput.value) || 100;
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
        if (['rectangle', 'circle', 'triangle', 'arrow', 'line', 'image', 'video'].includes(selectedElement.type)) {
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
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.updateElementDisplay();
                self.autosaveQuiz();
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
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.updateElementDisplay();
                self.autosaveQuiz();
            };
            borderColorGroup.appendChild(borderColorLabel);
            borderColorGroup.appendChild(borderColorInput);
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
        
        // Rich text editor with toolbar
        if (selectedElement.type === 'richtext') {
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
            const backgroundColor = selectedElement.background_color || 'transparent';
            editor.style.cssText = 'min-height: 200px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; background: ' + backgroundColor + '; overflow-y: auto; font-size: 14px; line-height: 1.5;';
            editor.style.fontSize = `${selectedElement.font_size || 16}px`;
            editor.style.color = selectedElement.text_color || '#000000';
            // Background color matches the element's background color
            
            // Mark editor as interacting to prevent panel re-renders while typing
            editor.dataset.interacting = 'false';
            editor.addEventListener('focus', () => {
                editor.dataset.interacting = 'true';
            });
            editor.addEventListener('blur', () => {
                editor.dataset.interacting = 'false';
            });
            
            // Update content function - updates display and canvas
            const updateRichTextDisplay = () => {
                // Get the HTML content from the editor
                const htmlContent = editor.innerHTML;
                // Save it to the element
                selectedElement.content = htmlContent;
                
                // Debug: log the content being saved
                console.log('[RichText] Saving content:', htmlContent.substring(0, 100));
                
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.updateElementDisplay();
                // Update canvas to show changes
                if (self.renderCanvas) {
                    self.renderCanvas();
                }
            };
            
            // Debounced save function - only for autosave (saves to storage without updating display)
            const saveRichText = self.debounce(() => {
                // Only save the content to the element, don't update display
                selectedElement.content = editor.innerHTML;
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.autosaveQuiz();
            }, 500);
            
            // Combined update function for toolbar buttons (immediate update + debounced save)
            const updateRichTextContent = () => {
                updateRichTextDisplay();
                saveRichText();
                // Canvas update is handled in updateRichTextDisplay
            };
            
            // Store the last selection range globally for this editor
            let lastSelectionRange = null;
            
            // Track selection changes in the editor
            editor.addEventListener('mouseup', () => {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const container = range.commonAncestorContainer;
                    const containerNode = container.nodeType === 3 ? container.parentNode : container;
                    if (editor.contains(containerNode) || containerNode === editor) {
                        lastSelectionRange = range.cloneRange();
                    }
                }
            });
            
            editor.addEventListener('keyup', () => {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const container = range.commonAncestorContainer;
                    const containerNode = container.nodeType === 3 ? container.parentNode : container;
                    if (editor.contains(containerNode) || containerNode === editor) {
                        lastSelectionRange = range.cloneRange();
                    }
                }
            });
            
            // Helper function to apply formatting command and save
            const applyFormattingCommand = (command, value = null) => {
                // Focus the editor first
                editor.focus();
                
                // Restore the last known selection
                const selection = window.getSelection();
                if (lastSelectionRange) {
                    try {
                        selection.removeAllRanges();
                        selection.addRange(lastSelectionRange);
                    } catch (e) {
                        // If range is invalid, try to find current selection
                        if (selection.rangeCount === 0) {
                            const range = document.createRange();
                            range.selectNodeContents(editor);
                            range.collapse(false);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                    }
                } else {
                    // If no saved selection, try to get current one or place at end
                    if (selection.rangeCount === 0) {
                        const range = document.createRange();
                        range.selectNodeContents(editor);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
                
                // Execute the command immediately
                let commandExecuted = false;
                if (value !== null) {
                    commandExecuted = document.execCommand(command, false, value);
                } else {
                    commandExecuted = document.execCommand(command, false, null);
                }
                
                // Update the saved selection after command execution
                if (selection.rangeCount > 0) {
                    lastSelectionRange = selection.getRangeAt(0).cloneRange();
                }
                
                // Use setTimeout to ensure DOM is updated before saving
                setTimeout(() => {
                    // Save the formatted content
                    updateRichTextContent();
                }, 0);
            };
            
            // Formatting toolbar
            const toolbar = document.createElement('div');
            toolbar.style.cssText = 'display: flex; gap: 0.25rem; margin-bottom: 0.5rem; flex-wrap: wrap; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;';
            
            // Bold button
            const boldBtn = document.createElement('button');
            boldBtn.innerHTML = '<strong>B</strong>';
            boldBtn.title = 'Bold';
            boldBtn.type = 'button'; // Prevent form submission
            boldBtn.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 3px; font-weight: bold;';
            boldBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            boldBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                applyFormattingCommand('bold');
            });
            toolbar.appendChild(boldBtn);
            
            // Italic button
            const italicBtn = document.createElement('button');
            italicBtn.innerHTML = '<em>I</em>';
            italicBtn.title = 'Italic';
            italicBtn.type = 'button';
            italicBtn.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 3px; font-style: italic;';
            italicBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            italicBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                applyFormattingCommand('italic');
            });
            toolbar.appendChild(italicBtn);
            
            // Underline button
            const underlineBtn = document.createElement('button');
            underlineBtn.innerHTML = '<u>U</u>';
            underlineBtn.title = 'Underline';
            underlineBtn.type = 'button';
            underlineBtn.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 3px; text-decoration: underline;';
            underlineBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            underlineBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                applyFormattingCommand('underline');
            });
            toolbar.appendChild(underlineBtn);
            
            // Font size dropdown
            const fontSizeLabel = document.createElement('label');
            fontSizeLabel.textContent = 'Size:';
            fontSizeLabel.style.marginLeft = '0.5rem';
            fontSizeLabel.style.marginRight = '0.25rem';
            toolbar.appendChild(fontSizeLabel);
            
            const fontSizeSelect = document.createElement('select');
            fontSizeSelect.style.cssText = 'padding: 0.25rem; border: 1px solid #ddd; border-radius: 3px;';
            fontSizeSelect.dataset.interacting = 'false';
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
            fontSizeSelect.addEventListener('mousedown', () => {
                fontSizeSelect.dataset.interacting = 'true';
            });
            fontSizeSelect.addEventListener('blur', () => {
                fontSizeSelect.dataset.interacting = 'false';
            });
            fontSizeSelect.onchange = () => {
                editor.focus();
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    if (!range.collapsed) {
                        const span = document.createElement('span');
                        span.style.fontSize = fontSizeSelect.value + 'px';
                        try {
                            range.surroundContents(span);
                        } catch (e) {
                            span.appendChild(range.extractContents());
                            range.insertNode(span);
                        }
                        // Use requestAnimationFrame to ensure DOM is updated before saving
                        requestAnimationFrame(() => {
                            updateRichTextContent();
                        });
                    } else {
                        editor.style.fontSize = fontSizeSelect.value + 'px';
                        selectedElement.font_size = parseInt(fontSizeSelect.value);
                        requestAnimationFrame(() => {
                            updateRichTextContent();
                        });
                    }
                }
                fontSizeSelect.dataset.interacting = 'false';
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
                    // Preserve selection
                    const range = selection.getRangeAt(0);
                    document.execCommand('foreColor', false, colorInput.value);
                    // Use requestAnimationFrame to ensure DOM is updated before saving
                    requestAnimationFrame(() => {
                        updateRichTextContent();
                    });
                } else {
                    editor.style.color = colorInput.value;
                    selectedElement.text_color = colorInput.value;
                    if (self.updateElementPropertiesInQuiz) {
                        self.updateElementPropertiesInQuiz(selectedElement);
                    }
                    requestAnimationFrame(() => {
                        updateRichTextContent();
                    });
                }
            };
            toolbar.appendChild(colorInput);
            
            // Background color picker
            const bgColorLabel = document.createElement('label');
            bgColorLabel.textContent = 'BG:';
            bgColorLabel.style.marginLeft = '0.5rem';
            bgColorLabel.style.marginRight = '0.25rem';
            toolbar.appendChild(bgColorLabel);
            
            const bgColorInput = document.createElement('input');
            bgColorInput.type = 'color';
            bgColorInput.value = selectedElement.background_color || '#ffffff';
            bgColorInput.style.cssText = 'width: 40px; height: 24px; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;';
            bgColorInput.onchange = () => {
                selectedElement.background_color = bgColorInput.value;
                // Update the editor background color to match
                editor.style.backgroundColor = bgColorInput.value;
                // Background color applies to the element on canvas and editor preview
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.updateElementDisplay();
                // Update canvas to show background color change immediately
                if (self.renderCanvas) {
                    self.renderCanvas();
                }
                self.autosaveQuiz();
            };
            toolbar.appendChild(bgColorInput);
            
            contentGroup.appendChild(toolbar);
            
            // Only save content while typing (debounced), but don't update display/canvas
            // This prevents the panel from updating and keeps focus on the editor
            editor.addEventListener('input', () => {
                // Only save content, don't update display or canvas while typing
                saveRichText();
            });
            
            // Update display and canvas when user clicks away from text box (loses focus)
            editor.addEventListener('blur', () => {
                // Update everything when focus is lost
                updateRichTextDisplay();
                // Ensure autosave happens
                self.autosaveQuiz();
            });
            
            // Prevent default behavior for formatting buttons
            editor.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'b') {
                        e.preventDefault();
                        applyFormattingCommand('bold');
                    } else if (e.key === 'i') {
                        e.preventDefault();
                        applyFormattingCommand('italic');
                    } else if (e.key === 'u') {
                        e.preventDefault();
                        applyFormattingCommand('underline');
                    }
                }
            });
            
            contentGroup.appendChild(editor);
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
                        const childElements = Editor.ElementCreator.createQuestionChildElements(selectedElement);
                        
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
                            currentPage.views.participant.local_element_configs[selectedElement.id].answer_input_config = {
                                x: answerInput.x || 0,
                                y: answerInput.y || 0,
                                width: answerInput.width || 400,
                                height: answerInput.height || 100,
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
                    const currentType = (selectedElement.question_config && selectedElement.question_config.question_type) || 'text';
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
                    const currentCorrectAnswer = (selectedElement.question_config && selectedElement.question_config.question_correct_answer) || '';
                    
                    const inputContainer = document.createElement('div');
                    inputContainer.className = 'correct-answer-input-container';
                    inputContainer.style.cssText = 'margin-top: 0.5rem;';
                    
                    // Function to save correct answer
                    const saveCorrectAnswer = (value) => {
                        if (!selectedElement.question_config) {
                            selectedElement.question_config = {};
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
                            textInput.dataset.interacting = 'false';
                            saveCorrectAnswer(textInput.value);
                            self.autosaveQuiz();
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
                            img.src = imageSrc.startsWith('/') || imageSrc.startsWith('http') ? imageSrc : '/api/media/serve/' + imageSrc;
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
                
                // Options for radio/checkbox
                const currentType = (selectedElement.question_config && selectedElement.question_config.question_type) || 'text';
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
            audio.src = selectedElement.src || (selectedElement.filename ? '/api/media/serve/' + selectedElement.filename : '');
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
