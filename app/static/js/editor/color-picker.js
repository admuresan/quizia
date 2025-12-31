// Color picker with opacity - reusable module
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    // Helper functions for color/opacity conversion
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    function rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join("");
    }
    
    function hexToRgba(hex, opacity) {
        const rgb = hexToRgb(hex);
        if (!rgb) return hex;
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }
    
    function rgbaToHexAndOpacity(rgba) {
        if (!rgba || !rgba.startsWith('rgba')) {
            return { hex: rgba || '#000000', opacity: 1 };
        }
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
            return { hex: rgbToHex(r, g, b), opacity: a };
        }
        return { hex: '#000000', opacity: 1 };
    }
    
    function parseColorWithOpacity(colorValue) {
        if (!colorValue) return { hex: '#000000', opacity: 1 };
        if (colorValue.startsWith('rgba')) {
            return rgbaToHexAndOpacity(colorValue);
        }
        return { hex: colorValue, opacity: 1 };
    }
    
    // Helper function to collect all colors used in the quiz
    function getUsedColors(quiz) {
        const colors = new Set();
        
        if (!quiz || !quiz.pages) return Array.from(colors);
        
        quiz.pages.forEach(page => {
            if (!page.elements) return;
            
            Object.values(page.elements).forEach(element => {
                // Collect fill colors
                if (element.properties && element.properties.fill_color) {
                    const color = element.properties.fill_color;
                    // Extract hex from rgba if needed
                    const parsed = parseColorWithOpacity(color);
                    colors.add(parsed.hex.toLowerCase());
                }
                // Collect border colors
                if (element.properties && element.properties.border_color) {
                    const color = element.properties.border_color;
                    const parsed = parseColorWithOpacity(color);
                    colors.add(parsed.hex.toLowerCase());
                }
                // Collect background colors
                if (element.properties && element.properties.background_color) {
                    const color = element.properties.background_color;
                    const parsed = parseColorWithOpacity(color);
                    colors.add(parsed.hex.toLowerCase());
                }
                // Collect text colors
                if (element.properties && element.properties.text_color) {
                    const color = element.properties.text_color;
                    const parsed = parseColorWithOpacity(color);
                    colors.add(parsed.hex.toLowerCase());
                }
            });
            
            // Also check view configs for background colors
            if (page.views) {
                Object.values(page.views).forEach(view => {
                    if (view.view_config && view.view_config.background) {
                        if (view.view_config.background.type === 'color' && view.view_config.background.config && view.view_config.background.config.colour) {
                            const color = view.view_config.background.config.colour;
                            const parsed = parseColorWithOpacity(color);
                            colors.add(parsed.hex.toLowerCase());
                        }
                    }
                });
            }
        });
        
        return Array.from(colors);
    }
    
    // Custom color picker modal that mimics native browser picker with opacity
    function openColorPickerModal(currentColor, onColorChange, getCurrentQuizFn) {
        const parsed = parseColorWithOpacity(currentColor);
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;';
        
        // Modal content - styled like native color picker
        const modalContent = document.createElement('div');
        modalContent.style.cssText = 'background: white; border-radius: 4px; padding: 16px; width: 320px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); font-family: system-ui, -apple-system, sans-serif;';
        
        // Main color picker area (native input, but we'll overlay our own)
        const colorPickerContainer = document.createElement('div');
        colorPickerContainer.style.cssText = 'position: relative; width: 100%; height: 200px; margin-bottom: 16px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;';
        
        // Use native color input but make it full size
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = parsed.hex;
        colorInput.style.cssText = 'width: 100%; height: 100%; border: none; padding: 0; cursor: pointer;';
        
        // RGB inputs row (like native picker)
        const rgbContainer = document.createElement('div');
        rgbContainer.style.cssText = 'display: flex; gap: 8px; margin-bottom: 16px; align-items: center;';
        
        const rInput = document.createElement('input');
        rInput.type = 'number';
        rInput.min = '0';
        rInput.max = '255';
        rInput.value = hexToRgb(parsed.hex)?.r || 0;
        rInput.style.cssText = 'width: 60px; padding: 4px; border: 1px solid #ddd; border-radius: 2px; text-align: center;';
        
        const gInput = document.createElement('input');
        gInput.type = 'number';
        gInput.min = '0';
        gInput.max = '255';
        gInput.value = hexToRgb(parsed.hex)?.g || 0;
        gInput.style.cssText = 'width: 60px; padding: 4px; border: 1px solid #ddd; border-radius: 2px; text-align: center;';
        
        const bInput = document.createElement('input');
        bInput.type = 'number';
        bInput.min = '0';
        bInput.max = '255';
        bInput.value = hexToRgb(parsed.hex)?.b || 0;
        bInput.style.cssText = 'width: 60px; padding: 4px; border: 1px solid #ddd; border-radius: 2px; text-align: center;';
        
        const labelsContainer = document.createElement('div');
        labelsContainer.style.cssText = 'display: flex; gap: 8px; margin-left: 8px;';
        const rLabel = document.createElement('span');
        rLabel.textContent = 'R';
        rLabel.style.cssText = 'width: 60px; text-align: center; font-size: 12px; color: #666;';
        const gLabel = document.createElement('span');
        gLabel.textContent = 'G';
        gLabel.style.cssText = 'width: 60px; text-align: center; font-size: 12px; color: #666;';
        const bLabel = document.createElement('span');
        bLabel.textContent = 'B';
        bLabel.style.cssText = 'width: 60px; text-align: center; font-size: 12px; color: #666;';
        
        // Opacity slider (NEW - added to native picker layout)
        const opacityContainer = document.createElement('div');
        opacityContainer.style.cssText = 'margin-bottom: 16px;';
        
        const opacityLabel = document.createElement('div');
        opacityLabel.textContent = `Opacity: ${Math.round(parsed.opacity * 100)}%`;
        opacityLabel.style.cssText = 'font-size: 12px; color: #666; margin-bottom: 4px;';
        
        const opacitySlider = document.createElement('input');
        opacitySlider.type = 'range';
        opacitySlider.min = '0';
        opacitySlider.max = '100';
        opacitySlider.value = Math.round(parsed.opacity * 100);
        opacitySlider.style.cssText = 'width: 100%;';
        
        // Recent colors section (inside the modal)
        const recentColorsContainer = document.createElement('div');
        recentColorsContainer.style.cssText = 'margin-bottom: 16px; padding-top: 12px; border-top: 1px solid #eee;';
        
        let usedColors = [];
        if (getCurrentQuizFn) {
            try {
                const currentQuiz = getCurrentQuizFn();
                if (currentQuiz) {
                    usedColors = getUsedColors(currentQuiz);
                }
            } catch (e) {
                // Silently fail if getCurrentQuiz is not available
            }
        }
        
        if (usedColors.length > 0) {
            const recentLabel = document.createElement('div');
            recentLabel.textContent = 'Recently Used';
            recentLabel.style.cssText = 'font-size: 12px; color: #666; margin-bottom: 8px; font-weight: 500;';
            recentColorsContainer.appendChild(recentLabel);
            
            const colorsGrid = document.createElement('div');
            colorsGrid.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px;';
            
            // Show up to 12 most recent colors
            const colorsToShow = usedColors.slice(0, 12);
            
            colorsToShow.forEach(color => {
                const colorSquare = document.createElement('div');
                colorSquare.style.cssText = `
                    width: 28px;
                    height: 28px;
                    background-color: ${color};
                    border: 1px solid #ddd;
                    border-radius: 3px;
                    cursor: pointer;
                    transition: transform 0.1s, box-shadow 0.1s;
                `;
                colorSquare.title = color;
                
                colorSquare.addEventListener('mouseenter', () => {
                    colorSquare.style.transform = 'scale(1.15)';
                    colorSquare.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
                });
                
                colorSquare.addEventListener('mouseleave', () => {
                    colorSquare.style.transform = 'scale(1)';
                    colorSquare.style.boxShadow = 'none';
                });
                
                colorSquare.addEventListener('click', () => {
                    colorInput.value = color;
                    const rgb = hexToRgb(color);
                    if (rgb) {
                        rInput.value = rgb.r;
                        gInput.value = rgb.g;
                        bInput.value = rgb.b;
                    }
                    updatePreview();
                });
                
                colorsGrid.appendChild(colorSquare);
            });
            
            recentColorsContainer.appendChild(colorsGrid);
        }
        
        // Update functions
        const updateFromColorInput = () => {
            const rgb = hexToRgb(colorInput.value);
            if (rgb) {
                rInput.value = rgb.r;
                gInput.value = rgb.g;
                bInput.value = rgb.b;
            }
            updatePreview();
        };
        
        const updateFromRGB = () => {
            const r = Math.max(0, Math.min(255, parseInt(rInput.value) || 0));
            const g = Math.max(0, Math.min(255, parseInt(gInput.value) || 0));
            const b = Math.max(0, Math.min(255, parseInt(bInput.value) || 0));
            colorInput.value = rgbToHex(r, g, b);
            updatePreview();
        };
        
        const updatePreview = () => {
            const opacity = opacitySlider.value / 100;
            opacityLabel.textContent = `Opacity: ${Math.round(opacity * 100)}%`;
        };
        
        colorInput.oninput = updateFromColorInput;
        rInput.oninput = updateFromRGB;
        gInput.oninput = updateFromRGB;
        bInput.oninput = updateFromRGB;
        opacitySlider.oninput = updatePreview;
        
        updatePreview();
        
        // Buttons row
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'padding: 6px 16px; border: 1px solid #ddd; background: white; border-radius: 2px; cursor: pointer; font-size: 13px;';
        cancelBtn.onclick = () => modal.remove();
        
        const okBtn = document.createElement('button');
        okBtn.textContent = 'OK';
        okBtn.style.cssText = 'padding: 6px 16px; border: none; background: #0078d4; color: white; border-radius: 2px; cursor: pointer; font-size: 13px; font-weight: 500;';
        okBtn.onclick = () => {
            const opacity = opacitySlider.value / 100;
            const rgbaColor = hexToRgba(colorInput.value, opacity);
            onColorChange(rgbaColor);
            modal.remove();
        };
        
        // Assemble
        colorPickerContainer.appendChild(colorInput);
        rgbContainer.appendChild(rInput);
        rgbContainer.appendChild(gInput);
        rgbContainer.appendChild(bInput);
        labelsContainer.appendChild(rLabel);
        labelsContainer.appendChild(gLabel);
        labelsContainer.appendChild(bLabel);
        opacityContainer.appendChild(opacityLabel);
        opacityContainer.appendChild(opacitySlider);
        buttonsContainer.appendChild(cancelBtn);
        buttonsContainer.appendChild(okBtn);
        
        modalContent.appendChild(colorPickerContainer);
        modalContent.appendChild(rgbContainer);
        modalContent.appendChild(labelsContainer);
        modalContent.appendChild(opacityContainer);
        if (usedColors.length > 0) {
            modalContent.appendChild(recentColorsContainer);
        }
        modalContent.appendChild(buttonsContainer);
        modal.appendChild(modalContent);
        
        // Close on overlay click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        
        document.body.appendChild(modal);
    }
    
    // Helper function to create color picker button that opens the modal
    function createColorPickerButton(colorValue, onColorChange, getCurrentQuizFn) {
        const parsed = parseColorWithOpacity(colorValue);
        
        const colorButton = document.createElement('button');
        colorButton.style.cssText = 'width: 100%; height: 40px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; background: ' + (parsed.opacity < 1 ? hexToRgba(parsed.hex, parsed.opacity) : parsed.hex) + '; position: relative;';
        
        // Add checkerboard pattern for transparency indication
        if (parsed.opacity < 1) {
            colorButton.style.backgroundImage = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';
            colorButton.style.backgroundSize = '10px 10px';
            colorButton.style.backgroundPosition = '0 0, 0 5px, 5px -5px, -5px 0px';
            const colorOverlay = document.createElement('div');
            colorOverlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: ' + hexToRgba(parsed.hex, parsed.opacity) + '; border-radius: 4px;';
            colorButton.appendChild(colorOverlay);
        }
        
        colorButton.onclick = (e) => {
            e.preventDefault();
            openColorPickerModal(colorValue, (rgbaColor) => {
                onColorChange(rgbaColor);
                // Update button appearance
                const newParsed = parseColorWithOpacity(rgbaColor);
                colorButton.style.background = newParsed.opacity < 1 ? hexToRgba(newParsed.hex, newParsed.opacity) : newParsed.hex;
                if (newParsed.opacity < 1 && !colorButton.querySelector('div')) {
                    colorButton.style.backgroundImage = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';
                    colorButton.style.backgroundSize = '10px 10px';
                    colorButton.style.backgroundPosition = '0 0, 0 5px, 5px -5px, -5px 0px';
                    const colorOverlay = document.createElement('div');
                    colorOverlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: ' + rgbaColor + '; border-radius: 4px;';
                    colorButton.appendChild(colorOverlay);
                } else if (newParsed.opacity < 1 && colorButton.querySelector('div')) {
                    colorButton.querySelector('div').style.background = rgbaColor;
                } else if (newParsed.opacity >= 1 && colorButton.querySelector('div')) {
                    colorButton.removeChild(colorButton.querySelector('div'));
                    colorButton.style.backgroundImage = 'none';
                }
            }, getCurrentQuizFn);
        };
        
        return colorButton;
    }
    
    // Export public API
    Editor.ColorPicker = {
        open: openColorPickerModal,
        createButton: createColorPickerButton,
        parseColor: parseColorWithOpacity,
        hexToRgba: hexToRgba,
        rgbaToHexAndOpacity: rgbaToHexAndOpacity,
        getUsedColors: getUsedColors
    };
    
})();

