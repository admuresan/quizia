// Context menu module for element layering controls
(function() {
    'use strict';
    
    if (typeof Editor === 'undefined') {
        window.Editor = {};
    }
    
    Editor.ContextMenu = {
        menuElement: null,
        
        init: function() {
            // Create context menu element
            this.menuElement = document.createElement('div');
            this.menuElement.className = 'element-context-menu';
            this.menuElement.style.cssText = `
                position: fixed;
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 4px 0;
                min-width: 180px;
                z-index: 10000;
                display: none;
            `;
            document.body.appendChild(this.menuElement);
            
            // Hide menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.menuElement.contains(e.target)) {
                    this.hide();
                }
            });
            
            // Hide menu on context menu event (right-click elsewhere)
            document.addEventListener('contextmenu', (e) => {
                if (!this.menuElement.contains(e.target)) {
                    this.hide();
                }
            });
        },
        
        show: function(event, element, getCurrentQuiz, getCurrentPageIndex, getCurrentView, renderCanvas, autosaveQuiz) {
            event.preventDefault();
            event.stopPropagation();
            
            // Hide any existing menu first
            this.hide();
            
            // Clear previous menu items
            this.menuElement.innerHTML = '';
            
            const currentQuiz = getCurrentQuiz();
            const currentPageIndex = getCurrentPageIndex();
            const currentView = getCurrentView();
            const page = currentQuiz.pages[currentPageIndex];
            if (!page || !page.elements) return;
            
            // Get elements for current view (same logic as canvas renderer)
            let elementsArray = [];
            if (Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
                elementsArray = Editor.QuizStructure.getViewElements(page, currentView);
            } else {
                // Should always use new format
                console.error('Editor.QuizStructure.getViewElements not available');
                return;
            }
            
            // Find element index in the filtered array
            const elementIndex = elementsArray.findIndex(el => el.id === element.id);
            if (elementIndex === -1) return;
            
            // Create menu items
            const menuItems = [
                { label: 'Copy', action: 'copy', enabled: true },
                { label: '---', action: 'separator', enabled: true },
                { label: 'Bring to Front', action: 'bringToFront', enabled: elementIndex < elementsArray.length - 1 },
                { label: 'Send One Forward', action: 'sendForward', enabled: elementIndex < elementsArray.length - 1 },
                { label: 'Send One Back', action: 'sendBack', enabled: elementIndex > 0 },
                { label: 'Send to Back', action: 'sendToBack', enabled: elementIndex > 0 },
                { label: '---', action: 'separator', enabled: true },
                { label: 'Align Horizontal', action: 'alignHorizontal', enabled: true },
                { label: 'Align Vertical', action: 'alignVertical', enabled: true }
            ];
            
            menuItems.forEach(item => {
                // Handle separator
                if (item.action === 'separator') {
                    const separator = document.createElement('div');
                    separator.style.cssText = `
                        height: 1px;
                        background: #e0e0e0;
                        margin: 4px 0;
                    `;
                    this.menuElement.appendChild(separator);
                    return;
                }
                
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                menuItem.textContent = item.label;
                menuItem.style.cssText = `
                    padding: 8px 16px;
                    cursor: ${item.enabled ? 'pointer' : 'default'};
                    color: ${item.enabled ? '#333' : '#999'};
                    font-size: 14px;
                    user-select: none;
                `;
                
                if (item.enabled) {
                    menuItem.style.backgroundColor = 'transparent';
                    menuItem.addEventListener('mouseenter', () => {
                        menuItem.style.backgroundColor = '#f0f0f0';
                    });
                    menuItem.addEventListener('mouseleave', () => {
                        menuItem.style.backgroundColor = 'transparent';
                    });
                    
                    menuItem.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.hide();
                        this.handleAction(item.action, element, currentQuiz, currentPageIndex, currentView, renderCanvas, autosaveQuiz, getCurrentQuiz, getCurrentPageIndex);
                    });
                }
                
                this.menuElement.appendChild(menuItem);
            });
            
            // Position menu
            const x = event.clientX;
            const y = event.clientY;
            this.menuElement.style.left = x + 'px';
            this.menuElement.style.top = y + 'px';
            this.menuElement.style.display = 'block';
            
            // Adjust position if menu goes off screen
            setTimeout(() => {
                const rect = this.menuElement.getBoundingClientRect();
                if (rect.right > window.innerWidth) {
                    this.menuElement.style.left = (window.innerWidth - rect.width - 10) + 'px';
                }
                if (rect.bottom > window.innerHeight) {
                    this.menuElement.style.top = (window.innerHeight - rect.height - 10) + 'px';
                }
            }, 0);
        },
        
        hide: function() {
            if (this.menuElement) {
                this.menuElement.style.display = 'none';
            }
        },
        
        showPasteMenu: function(event, x, y, getCurrentQuiz, getCurrentPageIndex, getCurrentView, renderCanvas, selectElement, autosaveQuiz) {
            event.preventDefault();
            event.stopPropagation();
            
            // Hide any existing menu first
            this.hide();
            
            // Clear previous menu items
            this.menuElement.innerHTML = '';
            
            // Only show paste if we have a copied element
            if (!Editor.CopyPaste || !Editor.CopyPaste.hasCopiedElement()) {
                return;
            }
            
            // Create paste menu item
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = 'Paste';
            menuItem.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                color: #333;
                font-size: 14px;
                user-select: none;
            `;
            
            menuItem.style.backgroundColor = 'transparent';
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f0f0f0';
            });
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'transparent';
            });
            
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hide();
                
                // Paste at the click location
                if (Editor.CopyPaste && Editor.CopyPaste.pasteElement) {
                    Editor.CopyPaste.pasteElement(
                        x, y,
                        getCurrentQuiz,
                        getCurrentPageIndex,
                        getCurrentView,
                        renderCanvas,
                        selectElement,
                        autosaveQuiz
                    );
                }
            });
            
            this.menuElement.appendChild(menuItem);
            
            // Position menu
            const menuX = event.clientX;
            const menuY = event.clientY;
            this.menuElement.style.left = menuX + 'px';
            this.menuElement.style.top = menuY + 'px';
            this.menuElement.style.display = 'block';
            
            // Adjust position if menu goes off screen
            setTimeout(() => {
                const rect = this.menuElement.getBoundingClientRect();
                if (rect.right > window.innerWidth) {
                    this.menuElement.style.left = (window.innerWidth - rect.width - 10) + 'px';
                }
                if (rect.bottom > window.innerHeight) {
                    this.menuElement.style.top = (window.innerHeight - rect.height - 10) + 'px';
                }
            }, 0);
        },
        
        handleAction: function(action, element, currentQuiz, currentPageIndex, currentView, renderCanvas, autosaveQuiz, getCurrentQuiz, getCurrentPageIndex) {
            const page = currentQuiz.pages[currentPageIndex];
            if (!page || !page.elements) return;
            
            // Handle copy action
            if (action === 'copy') {
                if (Editor.CopyPaste && Editor.CopyPaste.copyElement) {
                    const getQuiz = getCurrentQuiz || (() => currentQuiz);
                    const getPageIndex = getCurrentPageIndex || (() => currentPageIndex);
                    Editor.CopyPaste.copyElement(element, getQuiz, getPageIndex);
                }
                return;
            }
            
            // Get elements for current view
            let elementsArray = [];
            if (Editor.QuizStructure && Editor.QuizStructure.getViewElements) {
                elementsArray = Editor.QuizStructure.getViewElements(page, currentView);
            } else {
                // Should always use new format
                console.error('Editor.QuizStructure.getViewElements not available');
                return;
            }
            
            // Filter out generated child elements (answer_input, answer_display, audio_control)
            // These don't exist in page.elements and can't be reordered
            const mainElementsArray = elementsArray.filter(el => 
                !el.parent_id && 
                el.type !== 'answer_input' && 
                el.type !== 'answer_display' && 
                el.type !== 'audio_control'
            );
            
            // Find element index in filtered array
            const elementIndex = mainElementsArray.findIndex(el => el.id === element.id);
            if (elementIndex === -1) return;
            
            // Get all element IDs in order for the current view (only main elements)
            const elementIds = mainElementsArray.map(el => el.id);
            
            // Perform the action by reordering IDs
            let newOrder;
            switch (action) {
                case 'bringToFront':
                    // Move to end
                    newOrder = [
                        ...elementIds.filter(id => id !== element.id),
                        element.id
                    ];
                    break;
                case 'sendForward':
                    // Swap with next element
                    if (elementIndex < elementIds.length - 1) {
                        newOrder = [...elementIds];
                        [newOrder[elementIndex], newOrder[elementIndex + 1]] = 
                            [newOrder[elementIndex + 1], newOrder[elementIndex]];
                    } else {
                        return; // Already at front
                    }
                    break;
                case 'sendBack':
                    // Swap with previous element
                    if (elementIndex > 0) {
                        newOrder = [...elementIds];
                        [newOrder[elementIndex], newOrder[elementIndex - 1]] = 
                            [newOrder[elementIndex - 1], newOrder[elementIndex]];
                    } else {
                        return; // Already at back
                    }
                    break;
                case 'sendToBack':
                    // Move to beginning (but still above displayable area background)
                    newOrder = [
                        element.id,
                        ...elementIds.filter(id => id !== element.id)
                    ];
                    break;
                case 'alignVertical':
                case 'alignHorizontal':
                    // Handle alignment - these don't use newOrder, so we'll handle them separately
                    this.handleAlignment(action, element, elementsArray, page, currentView);
                    renderCanvas();
                    autosaveQuiz();
                    return;
                default:
                    return;
            }
            
            // Update layer_order for each element in newOrder
            // layer_order controls visual layering/overlay order (separate from appearance_order)
            // In the new format, page.elements is an object (dict), not an array
            const viewElementIds = new Set(elementIds);
            
            // Update layer_order for elements based on their position in newOrder
            newOrder.forEach((elementId, index) => {
                const elementData = page.elements[elementId];
                if (elementData) {
                    // Set layer_order to index + 1 (1-based ordering)
                    // Higher layer_order = appears on top
                    elementData.layer_order = index + 1;
                }
            });
            
            // Also reorder local_element_configs to match (since getViewElements uses Object.keys order)
            // Ensure views structure exists
            if (!page.views) {
                page.views = {
                    display: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                    participant: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                    control: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} }
                };
            }
            
            const view = page.views[currentView];
            if (view && view.local_element_configs) {
                // Rebuild local_element_configs in the new order
                // JavaScript objects preserve insertion order, so we iterate through newOrder first
                const configs = {};
                const viewElementIdsSet = new Set(elementIds);
                
                // First, add configs for elements in the new order (this sets the correct rendering order)
                // getViewElements uses Object.keys() which will iterate in insertion order
                newOrder.forEach(id => {
                    if (view.local_element_configs[id]) {
                        configs[id] = view.local_element_configs[id];
                    }
                });
                
                // Then, preserve ALL other configs that exist (preserve everything not in our reorder list)
                // This ensures we don't lose any configs for any elements
                Object.keys(view.local_element_configs).forEach(id => {
                    if (!configs[id]) {
                        configs[id] = view.local_element_configs[id];
                    }
                });
                
                // Rebuild local_element_configs with new order
                // Since we added keys in newOrder order first, those will be iterated first by Object.keys()
                view.local_element_configs = configs;
            }
            
            // Re-render canvas to show new order
            renderCanvas();
            autosaveQuiz();
        },
        
        handleAlignment: function(action, selectedElement, elementsArray, page, currentView) {
            // Find the selected element in the view-specific elements array to get its correct coordinates for this view
            const viewElement = elementsArray.find(el => el.id === selectedElement.id);
            if (!viewElement) {
                console.warn('[ContextMenu] Selected element not found in view elements:', selectedElement.id, 'Available elements:', elementsArray.map(e => e.id));
                return;
            }
            
            // Get the selected element's coordinate to align to (from view-specific element)
            const targetX = viewElement.x || 0;
            const targetY = viewElement.y || 0;
            const alignmentWindow = 10; // +/- 10 pixels
            
            console.log('[ContextMenu] Alignment action:', action, 'targetX:', targetX, 'targetY:', targetY, 'selectedElement:', selectedElement.id, 'viewElement:', viewElement);
            
            // Include all elements (both main and child elements) since they're all visible in the view
            // Find elements that need alignment
            let elementsToAlign = [];
            if (action === 'alignVertical') {
                // Align vertical: find elements whose x-coordinate is within +/- 10 pixels
                elementsToAlign = elementsArray.filter(el => {
                    const elX = el.x || 0;
                    return Math.abs(elX - targetX) <= alignmentWindow;
                });
            } else if (action === 'alignHorizontal') {
                // Align horizontal: find elements whose y-coordinate is within +/- 10 pixels
                elementsToAlign = elementsArray.filter(el => {
                    const elY = el.y || 0;
                    return Math.abs(elY - targetY) <= alignmentWindow;
                });
            }
            
            // Ensure views structure exists
            if (!page.views) {
                page.views = {
                    display: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                    participant: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} },
                    control: { view_config: { background: { type: 'gradient', config: { colour1: '#667eea', colour2: '#764ba2', angle: 135 } }, size: { width: 1920, height: 1080 } }, local_element_configs: {} }
                };
            }
            
            const view = page.views[currentView];
            if (!view || !view.local_element_configs) {
                return;
            }
            
            console.log('[ContextMenu] Elements to align:', elementsToAlign.length, elementsToAlign.map(e => ({ id: e.id, type: e.type, x: e.x, y: e.y })));
            
            // Update coordinates for each element that needs alignment
            elementsToAlign.forEach(el => {
                const elementId = el.id;
                console.log('[ContextMenu] Aligning element:', elementId, 'type:', el.type, 'parent_id:', el.parent_id, 'action:', action);
                
                // Handle appearance_control first (special case - no localConfig entry)
                if (el.type === 'appearance_control' && currentView === 'control') {
                    // appearance_control uses appearance_control_modal (not in local_element_configs)
                    if (!view.appearance_control_modal) {
                        view.appearance_control_modal = {};
                    }
                    if (action === 'alignVertical') {
                        view.appearance_control_modal.x = targetX;
                        el.x = targetX; // Update element's x property for visual update
                    } else if (action === 'alignHorizontal') {
                        view.appearance_control_modal.y = targetY;
                        el.y = targetY; // Update element's y property for visual update
                    }
                    // Update DOM element immediately for visual feedback
                    const domElement = document.getElementById(`element-${elementId}`);
                    if (domElement) {
                        if (action === 'alignVertical') {
                            domElement.style.left = `${targetX}px`;
                        } else if (action === 'alignHorizontal') {
                            domElement.style.top = `${targetY}px`;
                        }
                    }
                    return;
                }
                
                // Handle child elements (answer_input, answer_display, audio_control)
                if (el.parent_id) {
                    const parentId = el.parent_id;
                    const parentLocalConfig = view.local_element_configs[parentId];
                    
                    if (!parentLocalConfig) {
                        return;
                    }
                    
                    if (el.type === 'answer_input' && currentView === 'participant') {
                        // answer_input in participant view
                        if (!parentLocalConfig.answer_input_config) {
                            parentLocalConfig.answer_input_config = {};
                        }
                        if (action === 'alignVertical') {
                            parentLocalConfig.answer_input_config.x = targetX;
                            el.x = targetX; // Update element's x property for visual update
                        } else if (action === 'alignHorizontal') {
                            parentLocalConfig.answer_input_config.y = targetY;
                            el.y = targetY; // Update element's y property for visual update
                        }
                    } else if (el.type === 'answer_display' && currentView === 'control') {
                        // answer_display in control view
                        if (!parentLocalConfig.answer_display_config) {
                            parentLocalConfig.answer_display_config = {};
                        }
                        if (action === 'alignVertical') {
                            parentLocalConfig.answer_display_config.x = targetX;
                            el.x = targetX; // Update element's x property for visual update
                        } else if (action === 'alignHorizontal') {
                            parentLocalConfig.answer_display_config.y = targetY;
                            el.y = targetY; // Update element's y property for visual update
                        }
                    } else if (el.type === 'audio_control' && currentView === 'control') {
                        // audio_control in control view
                        if (!parentLocalConfig.control_config) {
                            parentLocalConfig.control_config = {};
                        }
                        if (action === 'alignVertical') {
                            parentLocalConfig.control_config.x = targetX;
                            el.x = targetX; // Update element's x property for visual update
                        } else if (action === 'alignHorizontal') {
                            parentLocalConfig.control_config.y = targetY;
                            el.y = targetY; // Update element's y property for visual update
                        }
                    }
                    // Update DOM element immediately for visual feedback
                    const domElement = document.getElementById(`element-${elementId}`);
                    console.log('[ContextMenu] Child element DOM:', domElement ? 'found' : 'not found', 'id:', `element-${elementId}`, 'type:', el.type);
                    if (domElement) {
                        if (action === 'alignVertical') {
                            domElement.style.left = `${targetX}px`;
                            console.log('[ContextMenu] Updated child element x to:', targetX);
                        } else if (action === 'alignHorizontal') {
                            domElement.style.top = `${targetY}px`;
                            console.log('[ContextMenu] Updated child element y to:', targetY);
                        }
                    } else {
                        console.warn('[ContextMenu] Could not find DOM element for child:', `element-${elementId}`);
                    }
                    return;
                }
                
                // Handle main elements
                const localConfig = view.local_element_configs[elementId];
                
                if (!localConfig) {
                    console.warn('[ContextMenu] No localConfig found for element:', elementId, 'in view:', currentView);
                    return;
                }
                
                // Handle different view types and element types
                if (currentView === 'control') {
                    // For control view, handle special cases
                    // Note: appearance_control is already handled above, so we shouldn't reach here for it
                    if (el.type === 'answer_display') {
                        // answer_display in control view (main element, not child) uses answer_display_config
                        if (!localConfig.answer_display_config) {
                            localConfig.answer_display_config = {};
                        }
                        if (action === 'alignVertical') {
                            localConfig.answer_display_config.x = targetX;
                            el.x = targetX; // Update element's x property for visual update
                        } else if (action === 'alignHorizontal') {
                            localConfig.answer_display_config.y = targetY;
                            el.y = targetY; // Update element's y property for visual update
                        }
                    } else if (el.is_question) {
                        // Questions in control view have config in localConfig.config
                        if (!localConfig.config) {
                            localConfig.config = {};
                        }
                        if (action === 'alignVertical') {
                            localConfig.config.x = targetX;
                            el.x = targetX; // Update element's x property for visual update
                        } else if (action === 'alignHorizontal') {
                            localConfig.config.y = targetY;
                            el.y = targetY; // Update element's y property for visual update
                        }
                    } else {
                        // Other elements in control view use config
                        if (!localConfig.config) {
                            localConfig.config = {};
                        }
                        if (action === 'alignVertical') {
                            localConfig.config.x = targetX;
                            el.x = targetX; // Update element's x property for visual update
                        } else if (action === 'alignHorizontal') {
                            localConfig.config.y = targetY;
                            el.y = targetY; // Update element's y property for visual update
                        }
                    }
                } else {
                    // For display and participant views, update config.x or config.y
                    const config = localConfig.config || localConfig.answer_config || {};
                    if (!localConfig.config) {
                        localConfig.config = config;
                    }
                    
                    if (action === 'alignVertical') {
                        localConfig.config.x = targetX;
                        el.x = targetX; // Update element's x property for visual update
                    } else if (action === 'alignHorizontal') {
                        localConfig.config.y = targetY;
                        el.y = targetY; // Update element's y property for visual update
                    }
                }
                
                // Update DOM element immediately for visual feedback
                const domElement = document.getElementById(`element-${elementId}`);
                console.log('[ContextMenu] Main element DOM:', domElement ? 'found' : 'not found', 'id:', `element-${elementId}`, 'type:', el.type);
                if (domElement) {
                    if (action === 'alignVertical') {
                        domElement.style.left = `${targetX}px`;
                        console.log('[ContextMenu] Updated main element x to:', targetX, 'config updated:', action === 'alignVertical' ? (currentView === 'control' ? (el.type === 'answer_display' ? localConfig.answer_display_config?.x : localConfig.config?.x) : localConfig.config?.x) : 'N/A');
                    } else if (action === 'alignHorizontal') {
                        domElement.style.top = `${targetY}px`;
                        console.log('[ContextMenu] Updated main element y to:', targetY, 'config updated:', action === 'alignHorizontal' ? (currentView === 'control' ? (el.type === 'answer_display' ? localConfig.answer_display_config?.y : localConfig.config?.y) : localConfig.config?.y) : 'N/A');
                    }
                } else {
                    console.warn('[ContextMenu] Could not find DOM element for main element:', `element-${elementId}`);
                }
            });
            
            console.log('[ContextMenu] Alignment complete. Updated', elementsToAlign.length, 'elements');
        }
    };
})();

