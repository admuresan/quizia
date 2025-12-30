// Visibility properties rendering for properties panel
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    if (!Editor.PropertiesPanel) {
        Editor.PropertiesPanel = {};
    }
    
    Editor.PropertiesPanel.renderVisibilityProperties = function(container, selectedElement) {
        if (!selectedElement) {
            container.innerHTML = '<p>No element selected</p>';
            return;
        }
        
        const self = this;
        
        // Arrow-specific properties (for arrow elements only)
        if (selectedElement.type === 'arrow') {
            // Body thickness
                const bodyThicknessGroup = document.createElement('div');
                bodyThicknessGroup.className = 'property-group';
                const bodyThicknessLabel = document.createElement('label');
                bodyThicknessLabel.textContent = 'Body Thickness';
                const bodyThicknessInput = document.createElement('input');
                bodyThicknessInput.type = 'number';
                bodyThicknessInput.value = selectedElement.arrow_body_thickness || Math.min(selectedElement.width, selectedElement.height) * 0.2;
                bodyThicknessInput.min = '1';
                bodyThicknessInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
                bodyThicknessInput.onchange = () => {
                    selectedElement.arrow_body_thickness = parseInt(bodyThicknessInput.value) || 10;
                    if (self.updateElementPropertiesInQuiz) {
                        self.updateElementPropertiesInQuiz(selectedElement);
                    }
                    self.updateElementDisplay();
                    self.autosaveQuiz();
                };
                bodyThicknessGroup.appendChild(bodyThicknessLabel);
                bodyThicknessGroup.appendChild(bodyThicknessInput);
                container.appendChild(bodyThicknessGroup);
                
                // Head length (how far back the line goes)
                const headLengthGroup = document.createElement('div');
                headLengthGroup.className = 'property-group';
                const headLengthLabel = document.createElement('label');
                headLengthLabel.textContent = 'Head Length';
                const headLengthInput = document.createElement('input');
                headLengthInput.type = 'number';
                headLengthInput.value = selectedElement.arrow_head_length || Math.min(selectedElement.width, selectedElement.height) * 0.3;
                headLengthInput.min = '1';
                headLengthInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
                headLengthInput.onchange = () => {
                    selectedElement.arrow_head_length = parseInt(headLengthInput.value) || 30;
                    if (self.updateElementPropertiesInQuiz) {
                        self.updateElementPropertiesInQuiz(selectedElement);
                    }
                    self.updateElementDisplay();
                    self.autosaveQuiz();
                };
                headLengthGroup.appendChild(headLengthLabel);
                headLengthGroup.appendChild(headLengthInput);
                container.appendChild(headLengthGroup);
        }
        
        // Rich text visibility properties
        if (selectedElement.type === 'richtext') {
            // Font size
            const fontSizeGroup = document.createElement('div');
            fontSizeGroup.className = 'property-group';
            const fontSizeLabel = document.createElement('label');
            fontSizeLabel.textContent = 'Font Size';
            const fontSizeInput = document.createElement('input');
            fontSizeInput.type = 'number';
            fontSizeInput.value = selectedElement.font_size || 16;
            fontSizeInput.min = '8';
            fontSizeInput.max = '144';
            fontSizeInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
            fontSizeInput.onchange = () => {
                selectedElement.font_size = parseInt(fontSizeInput.value) || 16;
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.updateElementDisplay();
                self.autosaveQuiz();
            };
            fontSizeGroup.appendChild(fontSizeLabel);
            fontSizeGroup.appendChild(fontSizeInput);
            container.appendChild(fontSizeGroup);
            
            // Text color
            const textColorGroup = document.createElement('div');
            textColorGroup.className = 'property-group';
            const textColorLabel = document.createElement('label');
            textColorLabel.textContent = 'Text Color';
            const textColorInput = document.createElement('input');
            textColorInput.type = 'color';
            textColorInput.value = selectedElement.text_color || '#000000';
            textColorInput.onchange = () => {
                selectedElement.text_color = textColorInput.value;
                if (self.updateElementPropertiesInQuiz) {
                    self.updateElementPropertiesInQuiz(selectedElement);
                }
                self.updateElementDisplay();
                self.autosaveQuiz();
            };
            textColorGroup.appendChild(textColorLabel);
            textColorGroup.appendChild(textColorInput);
            container.appendChild(textColorGroup);
            
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
            bgColorGroup.appendChild(bgColorLabel);
            bgColorGroup.appendChild(bgColorInput);
            container.appendChild(bgColorGroup);
        }
    };
})();


