// Counter element properties panel
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
        console.error('Editor.ColorPicker not loaded. Make sure color-picker.js is included before counter-properties.js');
    }
    
    // Legacy function for backwards compatibility
    function openColorPickerModal(currentColor, onColorChange) {
        if (Editor.ColorPicker && Editor.ColorPicker.open) {
            Editor.ColorPicker.open(currentColor, onColorChange);
        }
    }
    
    // Legacy helper function
    function parseColorWithOpacity(colorValue) {
        if (Editor.ColorPicker && Editor.ColorPicker.parseColor) {
            return Editor.ColorPicker.parseColor(colorValue);
        }
        return { hex: colorValue || '#000000', opacity: 1 };
    }
    
    
    Editor.PropertiesPanel.renderCounterProperties = function(container, selectedElement) {
        if (!selectedElement || selectedElement.type !== 'counter') {
            return;
        }
        
        const self = this;
        
        // Ensure properties object exists
        if (!selectedElement.properties) {
            selectedElement.properties = {
                shape: 'rectangle',
                text_color: '#000000',
                text_size: 24,
                background_color: '#ffffff',
                border_color: '#000000',
                value: 10,
                count_up: true,
                increment: 1,
                prefix: '',
                suffix: ''
            };
        }
        
        const props = selectedElement.properties;
        
        // Counter Properties Header
        const counterGroup = document.createElement('div');
        counterGroup.className = 'property-group';
        counterGroup.style.marginTop = '1rem';
        counterGroup.style.paddingTop = '1rem';
        counterGroup.style.borderTop = '1px solid #eee';
        
        const counterLabel = document.createElement('label');
        counterLabel.textContent = 'Counter Properties';
        counterLabel.style.cssText = 'display: block; margin-bottom: 0.75rem; font-size: 1rem; font-weight: 600; color: #2196F3;';
        counterGroup.appendChild(counterLabel);
        
        // Shape selector
        const shapeGroup = document.createElement('div');
        shapeGroup.style.marginBottom = '1rem';
        const shapeLabel = document.createElement('label');
        shapeLabel.textContent = 'Shape';
        shapeLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
        const shapeSelect = document.createElement('select');
        shapeSelect.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        shapeSelect.innerHTML = '<option value="circle">Circle</option><option value="triangle">Triangle</option><option value="rectangle">Rectangle</option>';
        shapeSelect.value = props.shape || 'rectangle';
        shapeSelect.onchange = () => {
            props.shape = shapeSelect.value;
            if (self.updateElementPropertiesInQuiz) {
                self.updateElementPropertiesInQuiz(selectedElement);
            }
            self.renderCanvas();
            self.autosaveQuiz();
        };
        shapeGroup.appendChild(shapeLabel);
        shapeGroup.appendChild(shapeSelect);
        counterGroup.appendChild(shapeGroup);
        
        // Text Color with opacity
        const textColorGroup = document.createElement('div');
        textColorGroup.style.marginBottom = '1rem';
        const textColorLabel = document.createElement('label');
        textColorLabel.textContent = 'Text Color';
        textColorLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
        textColorGroup.appendChild(textColorLabel);
        
        const textColorButton = Editor.ColorPicker ? Editor.ColorPicker.createButton(
            props.text_color || '#000000',
            (rgbaColor) => {
                props.text_color = rgbaColor;
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.renderCanvas();
                self.autosaveQuiz();
            },
            () => self.getCurrentQuiz ? self.getCurrentQuiz() : null
        ) : document.createElement('button');
        textColorGroup.appendChild(textColorButton);
        counterGroup.appendChild(textColorGroup);
        
        // Text Size
        const textSizeGroup = document.createElement('div');
        textSizeGroup.style.marginBottom = '1rem';
        const textSizeLabel = document.createElement('label');
        textSizeLabel.textContent = 'Text Size';
        textSizeLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
        const textSizeInput = document.createElement('input');
        textSizeInput.type = 'number';
        textSizeInput.min = '1';
        textSizeInput.step = '1';
        textSizeInput.value = props.text_size || 24;
        textSizeInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        textSizeInput.onchange = () => {
            const val = parseFloat(textSizeInput.value);
            if (val > 0) {
                props.text_size = val;
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.renderCanvas();
                self.autosaveQuiz();
            }
        };
        textSizeGroup.appendChild(textSizeLabel);
        textSizeGroup.appendChild(textSizeInput);
        counterGroup.appendChild(textSizeGroup);
        
        // Background Color with opacity
        const bgColorGroup = document.createElement('div');
        bgColorGroup.style.marginBottom = '1rem';
        const bgColorLabel = document.createElement('label');
        bgColorLabel.textContent = 'Background Color';
        bgColorLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
        bgColorGroup.appendChild(bgColorLabel);
        
        const bgColorButton = Editor.ColorPicker ? Editor.ColorPicker.createButton(
            props.background_color || '#ffffff',
            (rgbaColor) => {
                props.background_color = rgbaColor;
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.renderCanvas();
                self.autosaveQuiz();
            },
            () => self.getCurrentQuiz ? self.getCurrentQuiz() : null
        ) : document.createElement('button');
        bgColorGroup.appendChild(bgColorButton);
        counterGroup.appendChild(bgColorGroup);
        
        // Border Color with opacity
        const borderColorGroup = document.createElement('div');
        borderColorGroup.style.marginBottom = '1rem';
        const borderColorLabel = document.createElement('label');
        borderColorLabel.textContent = 'Border Color';
        borderColorLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
        borderColorGroup.appendChild(borderColorLabel);
        
        const borderColorButton = Editor.ColorPicker ? Editor.ColorPicker.createButton(
            props.border_color || '#000000',
            (rgbaColor) => {
                props.border_color = rgbaColor;
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.renderCanvas();
                self.autosaveQuiz();
            },
            () => self.getCurrentQuiz ? self.getCurrentQuiz() : null
        ) : document.createElement('button');
        borderColorGroup.appendChild(borderColorButton);
        counterGroup.appendChild(borderColorGroup);
        
        // Value
        const valueGroup = document.createElement('div');
        valueGroup.style.marginBottom = '1rem';
        const valueLabel = document.createElement('label');
        valueLabel.textContent = 'Value (must be positive)';
        valueLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.min = '0.0001';
        valueInput.step = '0.1';
        valueInput.value = props.value || 10;
        valueInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        valueInput.onchange = () => {
            const val = parseFloat(valueInput.value);
            if (val > 0) {
                props.value = val;
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.renderCanvas();
                self.autosaveQuiz();
            } else {
                valueInput.value = props.value || 10;
            }
        };
        valueGroup.appendChild(valueLabel);
        valueGroup.appendChild(valueInput);
        counterGroup.appendChild(valueGroup);
        
        // Count Up/Down Toggle
        const directionGroup = document.createElement('div');
        directionGroup.style.marginBottom = '1rem';
        const directionLabel = document.createElement('label');
        directionLabel.textContent = 'Count Direction';
        directionLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
        const directionContainer = document.createElement('div');
        directionContainer.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
        
        const directionToggle = document.createElement('input');
        directionToggle.type = 'checkbox';
        directionToggle.checked = props.count_up !== false;
        directionToggle.style.cssText = 'width: 40px; height: 20px; cursor: pointer;';
        directionToggle.onchange = () => {
            props.count_up = directionToggle.checked;
            if (self.updateElementPropertiesInQuiz) {
                self.updateElementPropertiesInQuiz(selectedElement);
            }
            self.renderCanvas();
            self.autosaveQuiz();
        };
        
        const directionText = document.createElement('span');
        directionText.textContent = directionToggle.checked ? 'Count Up' : 'Count Down';
        directionText.style.cssText = 'font-size: 0.9rem;';
        directionToggle.onchange = () => {
            props.count_up = directionToggle.checked;
            directionText.textContent = directionToggle.checked ? 'Count Up' : 'Count Down';
            if (self.updateElementPropertiesInQuiz) {
                self.updateElementPropertiesInQuiz(selectedElement);
            }
            self.renderCanvas();
            self.autosaveQuiz();
        };
        
        directionContainer.appendChild(directionToggle);
        directionContainer.appendChild(directionText);
        directionGroup.appendChild(directionLabel);
        directionGroup.appendChild(directionContainer);
        counterGroup.appendChild(directionGroup);
        
        // Increment
        const incrementGroup = document.createElement('div');
        incrementGroup.style.marginBottom = '1rem';
        const incrementLabel = document.createElement('label');
        incrementLabel.textContent = 'Increment (must be > 0)';
        incrementLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
        const incrementInput = document.createElement('input');
        incrementInput.type = 'number';
        incrementInput.min = '0.0001';
        incrementInput.step = '0.1';
        incrementInput.value = props.increment || 1;
        incrementInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        incrementInput.onchange = () => {
            const val = parseFloat(incrementInput.value);
            if (val > 0) {
                props.increment = val;
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.renderCanvas();
                self.autosaveQuiz();
            } else {
                incrementInput.value = props.increment || 1;
            }
        };
        incrementGroup.appendChild(incrementLabel);
        incrementGroup.appendChild(incrementInput);
        counterGroup.appendChild(incrementGroup);
        
        // Prefix
        const prefixGroup = document.createElement('div');
        prefixGroup.style.marginBottom = '1rem';
        const prefixLabel = document.createElement('label');
        prefixLabel.textContent = 'Prefix';
        prefixLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
        const prefixInput = document.createElement('input');
        prefixInput.type = 'text';
        prefixInput.value = props.prefix || '';
        prefixInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        prefixInput.onchange = () => {
            props.prefix = prefixInput.value;
            if (self.updateElementPropertiesInQuiz) {
                self.updateElementPropertiesInQuiz(selectedElement);
            }
            self.renderCanvas();
            self.autosaveQuiz();
        };
        prefixGroup.appendChild(prefixLabel);
        prefixGroup.appendChild(prefixInput);
        counterGroup.appendChild(prefixGroup);
        
        // Suffix
        const suffixGroup = document.createElement('div');
        suffixGroup.style.marginBottom = '1rem';
        const suffixLabel = document.createElement('label');
        suffixLabel.textContent = 'Suffix';
        suffixLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;';
        const suffixInput = document.createElement('input');
        suffixInput.type = 'text';
        suffixInput.value = props.suffix || '';
        suffixInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        suffixInput.onchange = () => {
            props.suffix = suffixInput.value;
            if (self.updateElementPropertiesInQuiz) {
                self.updateElementPropertiesInQuiz(selectedElement);
            }
            self.renderCanvas();
            self.autosaveQuiz();
        };
        suffixGroup.appendChild(suffixLabel);
        suffixGroup.appendChild(suffixInput);
        counterGroup.appendChild(suffixGroup);
        
        container.appendChild(counterGroup);
    };
})();

