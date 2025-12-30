// Interaction handlers for editor elements (drag, resize, rotate)
var Editor = Editor || {};

Editor.InteractionHandlers = (function() {
    let autosaveCallback = null;
    let updateDisplayCallback = null;
    let updateElementConfigCallback = null;
    let getCurrentViewSettings = null;
    let getSelectedElementCallback = null;
    let renderPropertiesCallback = null;
    
    // Global state to track which element is currently being manipulated
    let activeResizeHandle = null; // { element, elementData, handle, pos }
    let activeDragElement = null; // { element, elementData }
    let activeRotateElement = null; // { element, elementData }

    // Helper function to update property input values without re-rendering the whole panel
    function updatePropertiesInputs(element) {
        const xInput = document.querySelector('#properties-panel input[data-property="x"]');
        const yInput = document.querySelector('#properties-panel input[data-property="y"]');
        const widthInput = document.querySelector('#properties-panel input[data-property="width"]');
        const heightInput = document.querySelector('#properties-panel input[data-property="height"]');
        const rotationInput = document.querySelector('#properties-panel input[data-property="rotation"]');
        
        if (xInput) xInput.value = Math.round(element.x || 0);
        if (yInput) yInput.value = Math.round(element.y || 0);
        if (widthInput) widthInput.value = Math.round(element.width || 100);
        if (heightInput) heightInput.value = Math.round(element.height || 100);
        if (rotationInput) rotationInput.value = Math.round(element.rotation || 0);
    }

    function init(autosaveCb, updateDisplayCb, updateElementConfigCb, getViewSettingsCb, getSelectedElementCb, renderPropertiesCb) {
        autosaveCallback = autosaveCb;
        updateDisplayCallback = updateDisplayCb;
        updateElementConfigCallback = updateElementConfigCb;
        getCurrentViewSettings = getViewSettingsCb;
        getSelectedElementCallback = getSelectedElementCb;
        renderPropertiesCallback = renderPropertiesCb;
    }
    
    // Store state before operations for undo
    let dragStartState = null;
    let resizeStartState = null;
    let rotateStartState = null;

    // Helper function to convert viewport mouse coordinates to canvas coordinates
    // Returns absolute pixel values from top-left corner of canvas (0,0 = top-left)
    // Accounts for zoom and canvas container position
    function getCanvasCoordinates(clientX, clientY) {
        const displayableArea = document.getElementById('displayable-area');
        if (!displayableArea) return { x: clientX, y: clientY };
        
        // Get zoom factor and canvas dimensions from view settings
        let zoom = 100;
        let canvasWidth = 1920;
        let canvasHeight = 1080;
        if (getCurrentViewSettings) {
            const settings = getCurrentViewSettings();
            if (settings) {
                zoom = settings.zoom || 100;
                canvasWidth = settings.canvas_width || 1920;
                canvasHeight = settings.canvas_height || 1080;
            }
        }
        const zoomFactor = zoom / 100;
        
        // Get the displayable-area's bounding rect
        // This already accounts for the parent's transform, so it's in the transformed coordinate space
        const areaRect = displayableArea.getBoundingClientRect();
        
        // Calculate mouse position relative to the displayable-area's top-left corner
        // This is in the transformed (viewport) coordinate space
        const mouseXRelativeToArea = clientX - areaRect.left;
        const mouseYRelativeToArea = clientY - areaRect.top;
        
        // The displayable-area's bounding rect is scaled, but we need to convert to the original canvas space
        // Since the transform origin is center, the top-left of the visible area doesn't map to (0,0)
        // We need to find where (0,0) would be in the visible area
        
        // The visible area's center corresponds to the canvas center
        const visibleCenterX = areaRect.width / 2;
        const visibleCenterY = areaRect.height / 2;
        
        // Mouse position relative to visible center (in viewport pixels)
        const mouseXFromVisibleCenter = mouseXRelativeToArea - visibleCenterX;
        const mouseYFromVisibleCenter = mouseYRelativeToArea - visibleCenterY;
        
        // Convert to canvas coordinates by dividing by zoom factor
        const canvasXFromCenter = mouseXFromVisibleCenter / zoomFactor;
        const canvasYFromCenter = mouseYFromVisibleCenter / zoomFactor;
        
        // Canvas center in canvas coordinates
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;
        
        // Add canvas center to get absolute canvas coordinates
        const x = canvasCenterX + canvasXFromCenter;
        const y = canvasCenterY + canvasYFromCenter;
        
        return { x, y };
    }

    function makeDraggable(element, elementData) {
        let isDragging = false;
        let startClientX, startClientY, startLeft, startTop;
        let dragThreshold = 5; // Pixels to move before starting drag (in viewport coordinates)
        let hasMoved = false;
        let rafId = null;
        let clickOffsetX, clickOffsetY; // Offset from mouse click to element's top-left corner
        
        // Single global mousemove handler for all drag operations
        const globalMouseMove = (e) => {
            if (!activeDragElement || activeDragElement.element !== element) return;
            
            // Calculate mouse movement delta in viewport coordinates
            const viewportDx = e.clientX - startClientX;
            const viewportDy = e.clientY - startClientY;
            
            const absDx = Math.abs(viewportDx);
            const absDy = Math.abs(viewportDy);
            
            // Only start dragging if moved beyond threshold
            if (absDx > dragThreshold || absDy > dragThreshold) {
                hasMoved = true;
            }
            
            if (hasMoved) {
                // Convert current mouse position to canvas coordinates
                const canvasCoords = getCanvasCoordinates(e.clientX, e.clientY);
                
                // Position element so the clicked point follows the mouse
                // Subtract the offset to keep the same point under the mouse
                const newX = canvasCoords.x - clickOffsetX;
                const newY = canvasCoords.y - clickOffsetY;
                
                // Update element on canvas directly (immediate visual feedback - no RAF delay)
                element.style.left = `${newX}px`;
                element.style.top = `${newY}px`;
                
                // Update element data
                elementData.x = newX;
                elementData.y = newY;
                
                // Throttle property panel updates with requestAnimationFrame
                if (rafId === null) {
                    rafId = requestAnimationFrame(() => {
                        // If this element is selected, update selectedElement and UI in real-time
                        if (getSelectedElementCallback) {
                            const selectedElement = getSelectedElementCallback();
                            if (selectedElement && selectedElement.id === elementData.id) {
                                selectedElement.x = elementData.x;
                                selectedElement.y = elementData.y;
                                // Update properties panel values in real-time
                                updatePropertiesInputs(selectedElement);
                            }
                        }
                        rafId = null;
                    });
                }
            }
        };
        
        // Single global mouseup handler for all drag operations
        const globalMouseUp = () => {
            if (activeDragElement && activeDragElement.element === element) {
                // Cancel any pending animation frame
                if (rafId !== null) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                
                if (isDragging && hasMoved) {
                    // Save state after move for undo
                    if (dragStartState && Editor.UndoRedo && Editor.UndoRedo.captureElementState) {
                        const afterState = Editor.UndoRedo.captureElementState(elementData.id);
                        if (afterState) {
                            Editor.UndoRedo.saveState('move', elementData.id, dragStartState, afterState);
                        }
                        dragStartState = null;
                    }
                    
                    // Update element config in quiz structure
                    if (updateElementConfigCallback) {
                        updateElementConfigCallback(elementData);
                    }
                    
                    // If this element is currently selected, update selectedElement and refresh properties panel
                    if (getSelectedElementCallback && renderPropertiesCallback) {
                        const selectedElement = getSelectedElementCallback();
                        if (selectedElement && selectedElement.id === elementData.id) {
                            // Update selectedElement with new position
                            selectedElement.x = elementData.x;
                            selectedElement.y = elementData.y;
                            // Refresh properties panel to show updated values
                            renderPropertiesCallback();
                        }
                    }
                    
                    // Save to file
                    if (autosaveCallback) {
                        autosaveCallback();
                    }
                } else {
                    // If we didn't move, clear the drag start state
                    dragStartState = null;
                }
                isDragging = false;
                hasMoved = false;
                activeDragElement = null;
                document.removeEventListener('mousemove', globalMouseMove);
                document.removeEventListener('mouseup', globalMouseUp);
            }
        };

        element.addEventListener('mousedown', (e) => {
            // Don't start dragging if clicking on interactive elements (inputs, buttons, etc.)
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'LABEL' || 
                target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.closest('button') || 
                target.closest('input') || target.closest('label') || target.closest('select') ||
                target.closest('.resize-handle') || target.closest('.rotate-handle')) {
                return;
            }
            
            // Don't start if another element is being manipulated
            if (activeResizeHandle || activeRotateElement) return;
            
            // Capture state before drag for undo
            if (Editor.UndoRedo && Editor.UndoRedo.captureElementState) {
                dragStartState = Editor.UndoRedo.captureElementState(elementData.id);
            }
            
            isDragging = true;
            hasMoved = false;
            activeDragElement = { element, elementData };
            // Store initial mouse position in viewport coordinates
            startClientX = e.clientX;
            startClientY = e.clientY;
            // Read initial position from elementData (source of truth) rather than style
            // This ensures we start from the correct position even if style is stale
            startLeft = elementData.x || parseInt(element.style.left) || 0;
            startTop = elementData.y || parseInt(element.style.top) || 0;
            
            // Calculate offset from mouse click to element's top-left corner in canvas coordinates
            const clickCanvasCoords = getCanvasCoordinates(e.clientX, e.clientY);
            clickOffsetX = clickCanvasCoords.x - startLeft;
            clickOffsetY = clickCanvasCoords.y - startTop;
            
            e.preventDefault();
            e.stopPropagation();
            
            document.addEventListener('mousemove', globalMouseMove);
            document.addEventListener('mouseup', globalMouseUp);
        });
    }

    function addResizeHandles(element, elementData) {
        if (!element.classList.contains('selected')) return;
        
        // Corner handles
        const cornerHandles = ['nw', 'ne', 'sw', 'se'];
        // Edge handles
        const edgeHandles = ['n', 's', 'e', 'w'];
        const allHandles = [...cornerHandles, ...edgeHandles];
        
        allHandles.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle resize-${pos}`;
            
            // Determine if it's a corner or edge handle
            const isCorner = cornerHandles.includes(pos);
            const isEdge = edgeHandles.includes(pos);
            
            if (isCorner) {
                // Corner handles - small circular
                handle.style.cssText = `
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: #2196F3;
                    border: 2px solid white;
                    border-radius: 50%;
                    cursor: ${pos === 'nw' || pos === 'se' ? 'nwse-resize' : 'nesw-resize'};
                    z-index: 1000;
                `;
                
                const positions = {
                    nw: { top: '-5px', left: '-5px' },
                    ne: { top: '-5px', right: '-5px' },
                    sw: { bottom: '-5px', left: '-5px' },
                    se: { bottom: '-5px', right: '-5px' }
                };
                
                Object.assign(handle.style, positions[pos]);
            } else if (isEdge) {
                // Edge handles - rectangular bars
                const isVertical = pos === 'n' || pos === 's';
                const isHorizontal = pos === 'e' || pos === 'w';
                
                handle.style.cssText = `
                    position: absolute;
                    background: #2196F3;
                    border: 2px solid white;
                    z-index: 1000;
                `;
                
                if (isVertical) {
                    // North/South handles - horizontal bar
                    handle.style.width = '60px';
                    handle.style.height = '8px';
                    handle.style.cursor = 'ns-resize';
                    handle.style.left = '50%';
                    handle.style.transform = 'translateX(-50%)';
                    if (pos === 'n') {
                        handle.style.top = '-4px';
                    } else {
                        handle.style.bottom = '-4px';
                    }
                } else {
                    // East/West handles - vertical bar
                    handle.style.width = '8px';
                    handle.style.height = '60px';
                    handle.style.cursor = 'ew-resize';
                    handle.style.top = '50%';
                    handle.style.transform = 'translateY(-50%)';
                    if (pos === 'e') {
                        handle.style.right = '-4px';
                    } else {
                        handle.style.left = '-4px';
                    }
                }
            }
            
            let startClientX, startClientY, startWidth, startHeight, startLeft, startTop;
            let rafId = null;
            
            // Create unique handlers for this specific handle
            const handleMouseMove = (e) => {
                if (!activeResizeHandle || activeResizeHandle.handle !== handle) return;
                
                // Convert current mouse position to canvas coordinates
                const canvasCoords = getCanvasCoordinates(e.clientX, e.clientY);
                
                // Handle corner resizing (both dimensions)
                // Position the handle at the mouse position
                if (isCorner) {
                    if (pos.includes('e')) {
                        // Right edge follows mouse X
                        elementData.width = Math.max(20, canvasCoords.x - startLeft);
                    }
                    if (pos.includes('w')) {
                        // Left edge follows mouse X
                        const newWidth = Math.max(20, (startLeft + startWidth) - canvasCoords.x);
                        elementData.x = canvasCoords.x;
                        elementData.width = newWidth;
                    }
                    if (pos.includes('s')) {
                        // Bottom edge follows mouse Y
                        elementData.height = Math.max(20, canvasCoords.y - startTop);
                    }
                    if (pos.includes('n')) {
                        // Top edge follows mouse Y
                        const newHeight = Math.max(20, (startTop + startHeight) - canvasCoords.y);
                        elementData.y = canvasCoords.y;
                        elementData.height = newHeight;
                    }
                } else if (isEdge) {
                    // Handle edge-only resizing (single dimension)
                    if (pos === 'e') {
                        // Right edge follows mouse X
                        elementData.width = Math.max(20, canvasCoords.x - startLeft);
                    } else if (pos === 'w') {
                        // Left edge follows mouse X
                        const newWidth = Math.max(20, (startLeft + startWidth) - canvasCoords.x);
                        elementData.x = canvasCoords.x;
                        elementData.width = newWidth;
                    } else if (pos === 's') {
                        // Bottom edge follows mouse Y
                        elementData.height = Math.max(20, canvasCoords.y - startTop);
                    } else if (pos === 'n') {
                        // Top edge follows mouse Y
                        const newHeight = Math.max(20, (startTop + startHeight) - canvasCoords.y);
                        elementData.y = canvasCoords.y;
                        elementData.height = newHeight;
                    }
                }
                
                // Update element on canvas directly (immediate visual feedback - no RAF delay)
                element.style.left = `${elementData.x}px`;
                element.style.top = `${elementData.y}px`;
                element.style.width = `${elementData.width}px`;
                element.style.height = `${elementData.height}px`;
                
                // For answer_display and other elements that use min/max width/height, update those too
                if (elementData.type === 'answer_display' || elementData.type === 'answer_input' || elementData.type === 'audio_control') {
                    element.style.minWidth = `${elementData.width}px`;
                    element.style.maxWidth = `${elementData.width}px`;
                    element.style.minHeight = `${elementData.height}px`;
                    element.style.maxHeight = `${elementData.height}px`;
                }
                
                // Update SVG viewBox for triangle and arrow if they exist
                if (elementData.type === 'triangle' || elementData.type === 'arrow') {
                    const svg = element.querySelector('svg');
                    if (svg) {
                        svg.setAttribute('viewBox', `0 0 ${elementData.width} ${elementData.height}`);
                    }
                }
                
                // Throttle property panel updates with requestAnimationFrame
                if (rafId === null) {
                    rafId = requestAnimationFrame(() => {
                        // If this element is selected, update selectedElement and UI in real-time
                        if (getSelectedElementCallback) {
                            const selectedElement = getSelectedElementCallback();
                            if (selectedElement && selectedElement.id === elementData.id) {
                                selectedElement.x = elementData.x;
                                selectedElement.y = elementData.y;
                                selectedElement.width = elementData.width;
                                selectedElement.height = elementData.height;
                                // Update properties panel values in real-time
                                updatePropertiesInputs(selectedElement);
                            }
                        }
                        rafId = null;
                    });
                }
            };
            
            const handleMouseUp = () => {
                if (activeResizeHandle && activeResizeHandle.handle === handle) {
                    // Cancel any pending animation frame
                    if (rafId !== null) {
                        cancelAnimationFrame(rafId);
                        rafId = null;
                    }
                    
                    // Save state after resize for undo
                    if (resizeStartState && Editor.UndoRedo && Editor.UndoRedo.captureElementState) {
                        const afterState = Editor.UndoRedo.captureElementState(elementData.id);
                        if (afterState) {
                            Editor.UndoRedo.saveState('resize', elementData.id, resizeStartState, afterState);
                        }
                        resizeStartState = null;
                    }
                    
                    // Update element config in quiz structure
                    if (updateElementConfigCallback) {
                        updateElementConfigCallback(elementData);
                    }
                    
                    // Save to file
                    if (autosaveCallback) {
                        autosaveCallback();
                    }
                    activeResizeHandle = null;
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                }
            };
            
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                // Don't start if another element is being manipulated
                if (activeDragElement || activeRotateElement) return;
                
                // Capture state before resize for undo
                if (Editor.UndoRedo && Editor.UndoRedo.captureElementState) {
                    resizeStartState = Editor.UndoRedo.captureElementState(elementData.id);
                }
                
                activeResizeHandle = { element, elementData, handle, pos };
                // Store initial mouse position in viewport coordinates
                startClientX = e.clientX;
                startClientY = e.clientY;
                // Read initial values from elementData (source of truth) to ensure accuracy
                startWidth = elementData.width || parseInt(element.style.width) || 100;
                startHeight = elementData.height || parseInt(element.style.height) || 100;
                startLeft = elementData.x || parseInt(element.style.left) || 0;
                startTop = elementData.y || parseInt(element.style.top) || 0;
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });
            
            element.appendChild(handle);
        });
    }

    function addRotateHandle(element, elementData) {
        if (!element.classList.contains('selected')) return;
        
        const handle = document.createElement('div');
        handle.className = 'rotate-handle';
        handle.style.cssText = `
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            width: 20px;
            height: 20px;
            background: #4CAF50;
            border: 2px solid white;
            border-radius: 50%;
            cursor: grab;
            z-index: 1000;
        `;
        handle.innerHTML = '⟳';
        handle.style.fontSize = '14px';
        handle.style.display = 'flex';
        handle.style.alignItems = 'center';
        handle.style.justifyContent = 'center';
        
        let startAngle = 0;
        let startRotation = elementData.rotation || 0;
        
        // Create unique handlers for this specific rotate handle
        const handleMouseMove = (e) => {
            if (!activeRotateElement || activeRotateElement.element !== element) return;
            
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
            const deltaAngle = currentAngle - startAngle;
            elementData.rotation = (startRotation + deltaAngle) % 360;
            
            // Update element on canvas
            if (updateDisplayCallback) {
                updateDisplayCallback();
            }
            
            // If this element is selected, update selectedElement and UI in real-time
            if (getSelectedElementCallback && renderPropertiesCallback) {
                const selectedElement = getSelectedElementCallback();
                if (selectedElement && selectedElement.id === elementData.id) {
                    selectedElement.rotation = elementData.rotation;
                    // Update properties panel values in real-time
                    updatePropertiesInputs(selectedElement);
                }
            }
        };
        
        const handleMouseUp = () => {
            if (activeRotateElement && activeRotateElement.element === element) {
                // Save state after rotate for undo
                if (rotateStartState && Editor.UndoRedo && Editor.UndoRedo.captureElementState) {
                    const afterState = Editor.UndoRedo.captureElementState(elementData.id);
                    if (afterState) {
                        Editor.UndoRedo.saveState('resize', elementData.id, rotateStartState, afterState);
                    }
                    rotateStartState = null;
                }
                
                // Update element config in quiz structure
                if (updateElementConfigCallback) {
                    updateElementConfigCallback(elementData);
                }
                
                // Save to file
                if (autosaveCallback) {
                    autosaveCallback();
                }
                activeRotateElement = null;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            }
        };
        
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Don't start if another element is being manipulated
            if (activeDragElement || activeResizeHandle) return;
            
            // Capture state before rotate for undo
            if (Editor.UndoRedo && Editor.UndoRedo.captureElementState) {
                rotateStartState = Editor.UndoRedo.captureElementState(elementData.id);
            }
            
            activeRotateElement = { element, elementData };
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        element.appendChild(handle);
    }

    // Function to cancel any active manipulation (called when deselecting)
    function cancelActiveManipulation() {
        activeResizeHandle = null;
        activeDragElement = null;
        activeRotateElement = null;
    }

    return {
        init: init,
        makeDraggable: makeDraggable,
        addResizeHandles: addResizeHandles,
        addRotateHandle: addRotateHandle,
        cancelActiveManipulation: cancelActiveManipulation
    };
})();

