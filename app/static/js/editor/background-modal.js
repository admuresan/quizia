// Background modal functionality for the editor

(function(Editor) {
    'use strict';

    Editor.BackgroundModal = {
        open: function(page, currentQuiz, callback, currentView) {
            // Default to display view if not provided
            if (!currentView) {
                currentView = 'display';
            }
            // Create modal overlay
            const modal = document.createElement('div');
            modal.id = 'background-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
            
            // Modal content
            const modalContent = document.createElement('div');
            modalContent.style.cssText = 'background: white; border-radius: 8px; padding: 1.5rem; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
            
            // Modal header
            const header = document.createElement('div');
            header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;';
            const title = document.createElement('h2');
            title.textContent = 'Background Settings';
            title.style.cssText = 'margin: 0; font-size: 1.5rem;';
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = 'background: none; border: none; font-size: 2rem; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px; line-height: 1;';
            closeBtn.onclick = () => modal.remove();
            header.appendChild(title);
            header.appendChild(closeBtn);
            modalContent.appendChild(header);
            
            // Tabs
            const tabsContainer = document.createElement('div');
            tabsContainer.style.cssText = 'display: flex; border-bottom: 2px solid #ddd; margin-bottom: 1.5rem;';
            
            const tabs = ['color', 'gradient', 'image'];
            let activeTab = 'gradient';
            
            // Get current background from new structure
            let currentBgImage = null;
            let currentBgColor = null;
            
            if (page.views && page.views[currentView] && page.views[currentView].view_config && page.views[currentView].view_config.background) {
                const bg = page.views[currentView].view_config.background;
                if (bg.type === 'image' && bg.config && bg.config.image_url) {
                    currentBgImage = bg.config.image_url;
                } else if (bg.type === 'color' && bg.config && bg.config.color) {
                    currentBgColor = bg.config.color;
                } else if (bg.type === 'gradient' && bg.config) {
                    currentBgColor = `linear-gradient(${bg.config.angle || 135}deg, ${bg.config.colour1 || '#667eea'} 0%, ${bg.config.colour2 || '#764ba2'} 100%)`;
                }
            }
            
            // Determine active tab based on current background
            if (currentBgImage) {
                activeTab = 'image';
            } else {
                const defaultBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                const bgToCheck = currentBgColor || defaultBg;
                if (bgToCheck.includes('gradient')) {
                    activeTab = 'gradient';
                } else {
                    activeTab = 'color';
                }
            }
            
            const tabContents = {};
            
            tabs.forEach(tabName => {
                const tab = document.createElement('button');
                tab.textContent = tabName.charAt(0).toUpperCase() + tabName.slice(1);
                tab.dataset.tab = tabName;
                tab.style.cssText = `flex: 1; padding: 0.75rem; border: none; background: ${activeTab === tabName ? '#2196F3' : '#f5f5f5'}; color: ${activeTab === tabName ? 'white' : '#333'}; cursor: pointer; font-weight: ${activeTab === tabName ? 'bold' : 'normal'}; border-radius: 4px 4px 0 0;`;
                tab.onclick = () => {
                    activeTab = tabName;
                    tabs.forEach(t => {
                        const tabEl = tabsContainer.querySelector(`[data-tab="${t}"]`);
                        if (tabEl) {
                            tabEl.style.background = t === tabName ? '#2196F3' : '#f5f5f5';
                            tabEl.style.color = t === tabName ? 'white' : '#333';
                            tabEl.style.fontWeight = t === tabName ? 'bold' : 'normal';
                        }
                    });
                    Object.keys(tabContents).forEach(key => {
                        tabContents[key].style.display = key === tabName ? 'block' : 'none';
                    });
                };
                tabsContainer.appendChild(tab);
                
                // Tab content
                const content = document.createElement('div');
                content.id = `bg-tab-${tabName}`;
                content.style.display = tabName === activeTab ? 'block' : 'none';
                tabContents[tabName] = content;
            });
            
            modalContent.appendChild(tabsContainer);
            
            // Parse current background (already extracted above)
            const defaultBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            const currentBg = currentBgColor || defaultBg;
            let isGradient = currentBg.includes('gradient');
            let color1 = '#667eea';
            let color2 = '#764ba2';
            let angle = 135;
            
            if (isGradient) {
                const match = currentBg.match(/linear-gradient\((\d+)deg,\s*([^,]+)\s+\d+%,\s*([^)]+)\s+\d+%\)/);
                if (match) {
                    angle = parseInt(match[1]);
                    color1 = match[2].trim();
                    color2 = match[3].trim();
                }
            } else {
                color1 = currentBg;
            }
            
            // Color tab content
            const colorTab = tabContents['color'];
            const colorLabel = document.createElement('label');
            colorLabel.textContent = 'Color';
            colorLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-weight: 500;';
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = isGradient ? color1 : color1;
            colorInput.style.cssText = 'width: 100%; height: 50px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;';
            colorTab.appendChild(colorLabel);
            colorTab.appendChild(colorInput);
            
            // Gradient tab content
            const gradientTab = tabContents['gradient'];
            const gradientLabel = document.createElement('label');
            gradientLabel.textContent = 'Gradient';
            gradientLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-weight: 500;';
            gradientTab.appendChild(gradientLabel);
            
            const color1Group = document.createElement('div');
            color1Group.style.cssText = 'margin-bottom: 1rem;';
            const color1Label = document.createElement('label');
            color1Label.textContent = 'Color 1';
            color1Label.style.cssText = 'display: block; margin-bottom: 0.5rem;';
            const color1Input = document.createElement('input');
            color1Input.type = 'color';
            color1Input.value = color1;
            color1Input.style.cssText = 'width: 100%; height: 50px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;';
            color1Group.appendChild(color1Label);
            color1Group.appendChild(color1Input);
            
            const color2Group = document.createElement('div');
            color2Group.style.cssText = 'margin-bottom: 1rem;';
            const color2Label = document.createElement('label');
            color2Label.textContent = 'Color 2';
            color2Label.style.cssText = 'display: block; margin-bottom: 0.5rem;';
            const color2Input = document.createElement('input');
            color2Input.type = 'color';
            color2Input.value = color2;
            color2Input.style.cssText = 'width: 100%; height: 50px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;';
            color2Group.appendChild(color2Label);
            color2Group.appendChild(color2Input);
            
            const angleGroup = document.createElement('div');
            angleGroup.style.cssText = 'margin-bottom: 1rem;';
            const angleLabel = document.createElement('label');
            angleLabel.textContent = `Angle: ${angle}°`;
            angleLabel.style.cssText = 'display: block; margin-bottom: 0.5rem;';
            const angleSlider = document.createElement('input');
            angleSlider.type = 'range';
            angleSlider.min = '0';
            angleSlider.max = '360';
            angleSlider.value = angle;
            angleSlider.style.cssText = 'width: 100%;';
            angleSlider.oninput = () => {
                angleLabel.textContent = `Angle: ${angleSlider.value}°`;
                updateGradientPreview();
            };
            angleGroup.appendChild(angleLabel);
            angleGroup.appendChild(angleSlider);
            
            const gradientPreview = document.createElement('div');
            gradientPreview.id = 'gradient-preview';
            gradientPreview.style.cssText = 'width: 100%; height: 60px; border: 1px solid #ddd; border-radius: 4px; margin-top: 1rem;';
            
            const updateGradientPreview = () => {
                const grad = `linear-gradient(${angleSlider.value}deg, ${color1Input.value} 0%, ${color2Input.value} 100%)`;
                gradientPreview.style.background = grad;
            };
            
            color1Input.oninput = updateGradientPreview;
            color2Input.oninput = updateGradientPreview;
            updateGradientPreview();
            
            gradientTab.appendChild(color1Group);
            gradientTab.appendChild(color2Group);
            gradientTab.appendChild(angleGroup);
            gradientTab.appendChild(gradientPreview);
            
            // Image tab content
            const imageTab = tabContents['image'];
            const imageLabel = document.createElement('label');
            imageLabel.textContent = 'Background Image';
            imageLabel.style.cssText = 'display: block; margin-bottom: 0.5rem; font-weight: 500;';
            imageTab.appendChild(imageLabel);
            
            const currentImageContainer = document.createElement('div');
            currentImageContainer.style.cssText = 'margin: 0.5rem 0; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;';
            
            if (currentBgImage) {
                const currentImage = document.createElement('img');
                currentImage.src = currentBgImage.startsWith('/') || currentBgImage.startsWith('http') 
                    ? currentBgImage 
                    : '/api/media/serve/' + currentBgImage;
                currentImage.style.cssText = 'max-width: 100%; max-height: 150px; border-radius: 4px; margin-bottom: 0.5rem;';
                currentImageContainer.appendChild(currentImage);
                
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remove Image';
                removeBtn.className = 'btn btn-small';
                removeBtn.style.cssText = 'width: 100%; margin-top: 0.5rem;';
                removeBtn.onclick = () => {
                    // Use QuizStructure helper to set background
                    if (Editor.QuizStructure && Editor.QuizStructure.setViewBackground) {
                        Editor.QuizStructure.setViewBackground(page, currentView, null, null);
                    }
                    callback(page);
                    modal.remove();
                };
                currentImageContainer.appendChild(removeBtn);
            } else {
                const noImageText = document.createElement('div');
                noImageText.textContent = 'No background image set';
                noImageText.style.cssText = 'color: #999; font-style: italic; padding: 0.5rem;';
                currentImageContainer.appendChild(noImageText);
            }
            
            imageTab.appendChild(currentImageContainer);
            
            // Store selected image temporarily (not applied until Apply is clicked)
            let selectedImageUrl = currentBgImage || null;
            
            const selectImageBtn = document.createElement('button');
            selectImageBtn.textContent = currentBgImage ? 'Change Image' : 'Select Image';
            selectImageBtn.className = 'btn btn-small';
            selectImageBtn.style.cssText = 'width: 100%; margin-top: 0.5rem;';
            selectImageBtn.onclick = () => {
                if (Editor.MediaModal && Editor.MediaModal.open) {
                    Editor.MediaModal.open((selectedMedia) => {
                        const imageUrl = selectedMedia.url || '/api/media/serve/' + selectedMedia.filename;
                        selectedImageUrl = imageUrl; // Store temporarily
                        // Update the preview in the modal
                        currentImageContainer.innerHTML = '';
                        const newImage = document.createElement('img');
                        newImage.src = imageUrl;
                        newImage.style.cssText = 'max-width: 100%; max-height: 150px; border-radius: 4px; margin-bottom: 0.5rem;';
                        currentImageContainer.appendChild(newImage);
                        
                        const removeBtn = document.createElement('button');
                        removeBtn.textContent = 'Remove Image';
                        removeBtn.className = 'btn btn-small';
                        removeBtn.style.cssText = 'width: 100%; margin-top: 0.5rem;';
                        removeBtn.onclick = () => {
                            selectedImageUrl = null; // Clear selection (not saved until Apply is clicked)
                            currentImageContainer.innerHTML = '';
                            const noImageText = document.createElement('div');
                            noImageText.textContent = 'No background image set';
                            noImageText.style.cssText = 'color: #999; font-style: italic; padding: 0.5rem;';
                            currentImageContainer.appendChild(noImageText);
                            selectImageBtn.textContent = 'Select Image';
                        };
                        currentImageContainer.appendChild(removeBtn);
                        selectImageBtn.textContent = 'Change Image';
                        // Don't close modal or call callback yet - wait for Apply button
                    }, 'images');
                }
            };
            imageTab.appendChild(selectImageBtn);
            
            // Buttons
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 1.5rem;';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.className = 'btn';
            cancelBtn.style.cssText = 'flex: 1;';
            cancelBtn.onclick = () => modal.remove();
            
            const applyBtn = document.createElement('button');
            applyBtn.textContent = 'Apply';
            applyBtn.className = 'btn btn-primary';
            applyBtn.style.cssText = 'flex: 1;';
            applyBtn.onclick = () => {
                // Use QuizStructure helper to set background in new format
                if (Editor.QuizStructure && Editor.QuizStructure.setViewBackground) {
                    if (activeTab === 'color') {
                        Editor.QuizStructure.setViewBackground(page, currentView, colorInput.value, null);
                    } else if (activeTab === 'gradient') {
                        const gradient = `linear-gradient(${angleSlider.value}deg, ${color1Input.value} 0%, ${color2Input.value} 100%)`;
                        Editor.QuizStructure.setViewBackground(page, currentView, gradient, null);
                    } else if (activeTab === 'image') {
                        Editor.QuizStructure.setViewBackground(page, currentView, null, selectedImageUrl || null);
                    }
                } else {
                    // Fallback for old format
                    if (activeTab === 'color') {
                        page.background_color = colorInput.value;
                        delete page.background_image;
                    } else if (activeTab === 'gradient') {
                        page.background_color = `linear-gradient(${angleSlider.value}deg, ${color1Input.value} 0%, ${color2Input.value} 100%)`;
                        delete page.background_image;
                    } else if (activeTab === 'image') {
                        if (selectedImageUrl) {
                            page.background_image = selectedImageUrl;
                        } else {
                            delete page.background_image;
                        }
                        delete page.background_color;
                    }
                }
                
                callback(page);
                modal.remove();
            };
            
            buttonsContainer.appendChild(cancelBtn);
            buttonsContainer.appendChild(applyBtn);
            
            modalContent.appendChild(colorTab);
            modalContent.appendChild(gradientTab);
            modalContent.appendChild(imageTab);
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
    };

    if (typeof window.Editor === 'undefined') {
        window.Editor = {};
    }
    window.Editor.BackgroundModal = Editor.BackgroundModal;

})(typeof Editor !== 'undefined' ? Editor : {});

