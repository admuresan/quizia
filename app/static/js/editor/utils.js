// Utility functions for the editor

(function(Editor) {
    'use strict';

    let autosaveTimeout = null;

    Editor.Utils = {
        debounce: function(func, wait) {
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(autosaveTimeout);
                    func(...args);
                };
                clearTimeout(autosaveTimeout);
                autosaveTimeout = setTimeout(later, wait);
            };
        },

        initPropertiesResize: function() {
            const resizeHandle = document.querySelector('.properties-resize-handle');
            const propertiesPanel = document.querySelector('.editor-properties');
            
            if (!resizeHandle || !propertiesPanel) return;
            
            let isResizing = false;
            let startX = 0;
            let startWidth = 0;
            
            resizeHandle.addEventListener('mousedown', (e) => {
                isResizing = true;
                startX = e.clientX;
                startWidth = parseInt(window.getComputedStyle(propertiesPanel).width, 10);
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                
                const diff = startX - e.clientX;
                const newWidth = startWidth + diff;
                const minWidth = 200;
                const maxWidth = 600;
                
                if (newWidth >= minWidth && newWidth <= maxWidth) {
                    propertiesPanel.style.width = `${newWidth}px`;
                }
            });
            
            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                }
            });
        }
    };

    if (typeof window.Editor === 'undefined') {
        window.Editor = {};
    }
    window.Editor.Utils = Editor.Utils;

})(typeof Editor !== 'undefined' ? Editor : {});
