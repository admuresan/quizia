// Zoom controls module for editor
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    Editor.ZoomControls = {
        init: function(getCurrentViewSettings, updateCanvasSize, autosaveQuiz) {
            this.getCurrentViewSettings = getCurrentViewSettings;
            this.updateCanvasSize = updateCanvasSize;
            this.autosaveQuiz = autosaveQuiz;
        },
        
        applyZoom: function(zoomPercent) {
            const settings = this.getCurrentViewSettings();
            settings.zoom = Math.max(25, Math.min(200, zoomPercent)); // Clamp between 25% and 200%
            const displayableArea = document.getElementById('displayable-area');
            const displayableAreaWrapper = document.getElementById('displayable-area-wrapper');
            
            if (displayableArea && displayableAreaWrapper) {
                // Apply zoom using transform scale
                displayableAreaWrapper.style.transform = `scale(${settings.zoom / 100})`;
                displayableAreaWrapper.style.transformOrigin = 'center center';
                
                // Wrapper size is already set in updateCanvasSize - just ensure it's maintained
                if (settings.canvas_width && settings.canvas_height) {
                    displayableAreaWrapper.style.width = `${settings.canvas_width}px`;
                    displayableAreaWrapper.style.height = `${settings.canvas_height}px`;
                }
                
                // Update zoom level display in sidebar
                const zoomLevelEl = document.getElementById('zoom-level');
                if (zoomLevelEl) {
                    zoomLevelEl.textContent = `${Math.round(settings.zoom)}%`;
                }
                
                // Update zoom slider in sidebar
                const zoomSlider = document.getElementById('zoom-slider');
                if (zoomSlider) {
                    zoomSlider.value = Math.round(settings.zoom);
                }
            }
            this.autosaveQuiz();
        },
        
        zoomIn: function() {
            const settings = this.getCurrentViewSettings();
            this.applyZoom(settings.zoom + 10);
        },
        
        zoomOut: function() {
            const settings = this.getCurrentViewSettings();
            this.applyZoom(settings.zoom - 10);
        },
        
        zoomFit: function() {
            const settings = this.getCurrentViewSettings();
            const scrollArea = document.querySelector('.canvas-scroll-area');
            const displayableArea = document.getElementById('displayable-area');
            const displayableAreaWrapper = document.getElementById('displayable-area-wrapper');
            
            if (scrollArea && displayableArea && displayableAreaWrapper && settings.canvas_width && settings.canvas_height) {
                const scrollRect = scrollArea.getBoundingClientRect();
                const scrollWidth = scrollRect.width;
                const scrollHeight = scrollRect.height;
                
                const widthRatio = scrollWidth / settings.canvas_width;
                const heightRatio = scrollHeight / settings.canvas_height;
                const fitZoom = Math.min(widthRatio, heightRatio) * 100;
                
                this.applyZoom(Math.max(25, Math.min(200, fitZoom * 0.95))); // 95% to add some padding
                
                // Center the display area after fitting - wait for zoom transform to apply and layout to update
                setTimeout(() => {
                    this.centerDisplayArea();
                }, 150);
            }
        },
        
        centerDisplayArea: function() {
            const scrollArea = document.querySelector('.canvas-scroll-area');
            const displayableAreaWrapper = document.getElementById('displayable-area-wrapper');
            
            if (!scrollArea || !displayableAreaWrapper) return;
            
            const settings = this.getCurrentViewSettings();
            if (!settings || !settings.canvas_width || !settings.canvas_height) return;
            
            // Wait for layout to update after zoom - use double RAF for more reliable layout update
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Force a layout recalculation by reading layout properties
                    // This ensures the browser has updated all dimensions
                    void scrollArea.offsetHeight;
                    void scrollArea.scrollWidth;
                    void scrollArea.scrollHeight;
                    void displayableAreaWrapper.offsetHeight;
                    void displayableAreaWrapper.getBoundingClientRect();
                    
                    // Get viewport dimensions (the visible area of the scroll container)
                    const scrollViewWidth = scrollArea.clientWidth;
                    const scrollViewHeight = scrollArea.clientHeight;
                    
                    // Calculate the wrapper's visual size after transform scale
                    const zoom = settings.zoom / 100;
                    const wrapperVisualWidth = settings.canvas_width * zoom;
                    const wrapperVisualHeight = settings.canvas_height * zoom;
                    
                    // Get the wrapper's current bounding rect (visual position after transform)
                    const wrapperRect = displayableAreaWrapper.getBoundingClientRect();
                    const scrollAreaRect = scrollArea.getBoundingClientRect();
                    
                    // Calculate the wrapper's center position in viewport coordinates
                    const wrapperCenterXViewport = wrapperRect.left + wrapperRect.width / 2;
                    const wrapperCenterYViewport = wrapperRect.top + wrapperRect.height / 2;
                    
                    // Calculate the scroll area's center in viewport coordinates
                    const scrollAreaCenterXViewport = scrollAreaRect.left + scrollViewWidth / 2;
                    const scrollAreaCenterYViewport = scrollAreaRect.top + scrollViewHeight / 2;
                    
                    // Calculate the offset needed to center the wrapper
                    // This is the difference between where the wrapper center is and where it should be
                    const offsetX = wrapperCenterXViewport - scrollAreaCenterXViewport;
                    const offsetY = wrapperCenterYViewport - scrollAreaCenterYViewport;
                    
                    // Convert the offset to scroll position changes
                    // We need to scroll by the offset amount to move the wrapper center to the viewport center
                    const targetScrollLeft = scrollArea.scrollLeft + offsetX;
                    const targetScrollTop = scrollArea.scrollTop + offsetY;
                    
                    // Get the actual scrollable content dimensions for clamping
                    const scrollContentWidth = scrollArea.scrollWidth;
                    const scrollContentHeight = scrollArea.scrollHeight;
                    
                    // Clamp scroll position to valid bounds
                    const maxScrollLeft = Math.max(0, scrollContentWidth - scrollViewWidth);
                    const maxScrollTop = Math.max(0, scrollContentHeight - scrollViewHeight);
                    
                    scrollArea.scrollLeft = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft));
                    scrollArea.scrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop));
                });
            });
        },
        
        zoomReset: function() {
            this.applyZoom(100);
        },
        
        renderSidebarZoomControls: function(currentView) {
            const container = document.getElementById('sidebar-zoom-controls');
            if (!container) return;
            
            container.innerHTML = '';
            
            const settings = this.getCurrentViewSettings();
            const viewNames = {
                display: 'Display',
                participant: 'Participant',
                control: 'Control'
            };
            
            // Zoom section
            const zoomGroup = document.createElement('div');
            zoomGroup.className = 'zoom-controls';
            
            const zoomLabel = document.createElement('h3');
            zoomLabel.textContent = 'Zoom';
            const zoomIndicator = document.createElement('span');
            zoomIndicator.id = 'zoom-view-indicator';
            zoomIndicator.textContent = `(${viewNames[currentView]})`;
            zoomIndicator.style.cssText = 'font-size: 0.85rem; font-weight: normal; color: #2196F3; font-style: italic; margin-left: 0.5rem;';
            zoomLabel.appendChild(zoomIndicator);
            zoomGroup.appendChild(zoomLabel);
            
            const zoomButtons = document.createElement('div');
            zoomButtons.className = 'zoom-buttons';
            
            const zoomOutBtn = document.createElement('button');
            zoomOutBtn.textContent = '−';
            zoomOutBtn.className = 'zoom-btn';
            zoomOutBtn.title = 'Zoom Out';
            zoomOutBtn.onclick = () => this.zoomOut();
            
            const zoomLevel = document.createElement('span');
            zoomLevel.id = 'zoom-level';
            zoomLevel.className = 'zoom-level';
            zoomLevel.textContent = `${Math.round(settings.zoom || 100)}%`;
            
            const zoomInBtn = document.createElement('button');
            zoomInBtn.textContent = '+';
            zoomInBtn.className = 'zoom-btn';
            zoomInBtn.title = 'Zoom In';
            zoomInBtn.onclick = () => this.zoomIn();
            
            const zoomFitBtn = document.createElement('button');
            zoomFitBtn.className = 'zoom-btn';
            zoomFitBtn.title = 'Fit to Screen';
            zoomFitBtn.onclick = () => this.zoomFit();
            // Box with diagonal arrows icon (fit to screen)
            zoomFitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M3 3 L6 6 M13 3 L10 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M3 13 L6 10 M13 13 L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>`;
            
            const zoomResetBtn = document.createElement('button');
            zoomResetBtn.className = 'zoom-btn';
            zoomResetBtn.title = 'Reset Zoom';
            zoomResetBtn.onclick = () => this.zoomReset();
            // Refresh icon (circular arrow)
            zoomResetBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 3 C11.5 1.5 9.5 0.5 7.5 1 C5.5 1.5 4 3 3 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                <path d="M10.5 1.5 L13 3 L11.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <path d="M3 13 C4.5 14.5 6.5 15.5 8.5 15 C10.5 14.5 12 13 13 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                <path d="M5.5 14.5 L3 13 L4.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>`;
            
            zoomButtons.appendChild(zoomOutBtn);
            zoomButtons.appendChild(zoomLevel);
            zoomButtons.appendChild(zoomInBtn);
            zoomButtons.appendChild(zoomFitBtn);
            zoomButtons.appendChild(zoomResetBtn);
            zoomGroup.appendChild(zoomButtons);
            
            const zoomSlider = document.createElement('input');
            zoomSlider.type = 'range';
            zoomSlider.id = 'zoom-slider';
            zoomSlider.className = 'zoom-slider';
            zoomSlider.min = '25';
            zoomSlider.max = '200';
            zoomSlider.value = Math.round(settings.zoom || 100);
            zoomSlider.oninput = (e) => {
                this.applyZoom(parseInt(e.target.value));
            };
            zoomGroup.appendChild(zoomSlider);
            
            container.appendChild(zoomGroup);
        }
    };
})();


