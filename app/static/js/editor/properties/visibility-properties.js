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
    };
})();


