// Interaction handlers for editor elements (drag, resize, rotate)
var Editor = Editor || {};

Editor.InteractionHandlers = (function() {
    let autosaveCallback = null;
    let updateDisplayCallback = null;

    function init(autosaveCb, updateDisplayCb) {
        autosaveCallback = autosaveCb;
        updateDisplayCallback = updateDisplayCb;
    }

    function makeDraggable(element, elementData) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        let dragThreshold = 5; // Pixels to move before starting drag
        let hasMoved = false;

        element.addEventListener('mousedown', (e) => {
            // Don't start dragging if clicking on interactive elements (inputs, buttons, etc.)
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'LABEL' || 
                target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.closest('button') || 
                target.closest('input') || target.closest('label') || target.closest('select')) {
                return;
            }
            
            isDragging = true;
            hasMoved = false;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(element.style.left) || 0;
            startTop = parseInt(element.style.top) || 0;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            
            // Only start dragging if moved beyond threshold
            if (dx > dragThreshold || dy > dragThreshold) {
                hasMoved = true;
            }
            
            if (hasMoved) {
                const totalDx = e.clientX - startX;
                const totalDy = e.clientY - startY;
                element.style.left = `${startLeft + totalDx}px`;
                element.style.top = `${startTop + totalDy}px`;
                elementData.x = startLeft + totalDx;
                elementData.y = startTop + totalDy;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging && hasMoved && autosaveCallback) {
                autosaveCallback();
            }
            isDragging = false;
            hasMoved = false;
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
            
            let isResizing = false;
            let startX, startY, startWidth, startHeight, startLeft, startTop;
            
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = elementData.width;
                startHeight = elementData.height;
                startLeft = elementData.x;
                startTop = elementData.y;
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                // Handle corner resizing (both dimensions)
                if (isCorner) {
                    if (pos.includes('e')) {
                        elementData.width = Math.max(20, startWidth + dx);
                    }
                    if (pos.includes('w')) {
                        const newWidth = Math.max(20, startWidth - dx);
                        elementData.x = startLeft + (startWidth - newWidth);
                        elementData.width = newWidth;
                    }
                    if (pos.includes('s')) {
                        elementData.height = Math.max(20, startHeight + dy);
                    }
                    if (pos.includes('n')) {
                        const newHeight = Math.max(20, startHeight - dy);
                        elementData.y = startTop + (startHeight - newHeight);
                        elementData.height = newHeight;
                    }
                } else if (isEdge) {
                    // Handle edge-only resizing (single dimension)
                    if (pos === 'e') {
                        elementData.width = Math.max(20, startWidth + dx);
                    } else if (pos === 'w') {
                        const newWidth = Math.max(20, startWidth - dx);
                        elementData.x = startLeft + (startWidth - newWidth);
                        elementData.width = newWidth;
                    } else if (pos === 's') {
                        elementData.height = Math.max(20, startHeight + dy);
                    } else if (pos === 'n') {
                        const newHeight = Math.max(20, startHeight - dy);
                        elementData.y = startTop + (startHeight - newHeight);
                        elementData.height = newHeight;
                    }
                }
                
                if (updateDisplayCallback) {
                    updateDisplayCallback();
                }
            });
            
            document.addEventListener('mouseup', () => {
                if (isResizing && autosaveCallback) {
                    autosaveCallback();
                }
                isResizing = false;
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
        
        let isRotating = false;
        let startAngle = 0;
        let startRotation = elementData.rotation || 0;
        
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isRotating = true;
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isRotating) return;
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
            const deltaAngle = currentAngle - startAngle;
            elementData.rotation = (startRotation + deltaAngle) % 360;
            
            if (updateDisplayCallback) {
                updateDisplayCallback();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isRotating && autosaveCallback) {
                autosaveCallback();
            }
            isRotating = false;
        });
        
        element.appendChild(handle);
    }

    return {
        init: init,
        makeDraggable: makeDraggable,
        addResizeHandles: addResizeHandles,
        addRotateHandle: addRotateHandle
    };
})();

