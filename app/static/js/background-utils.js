// Shared background utility - used by both editor and runtime views
// This ensures backgrounds are always applied consistently from quiz/page data

(function(window) {
    'use strict';

    /**
     * Applies background to an element based on page and quiz data
     * @param {HTMLElement} element - The DOM element to apply background to
     * @param {Object} page - Page object (must have views structure)
     * @param {Object} quiz - Quiz object (not used for background in new format, kept for backwards compatibility)
     * @param {string} viewName - View name ('display', 'participant', 'control') - required for new format
     * @param {string} defaultBackground - Default background for editor properties pane only (not used in renderers)
     */
    function applyBackground(element, page, quiz, viewName, defaultBackground) {
        if (!element) {
            console.warn('applyBackground: element is null or undefined');
            return;
        }

        // Default viewName to 'display' if not provided (for backwards compatibility)
        if (!viewName) {
            viewName = 'display';
        }

        // Get background from new format (view_config structure)
        let bgImage = null;
        let bgColor = null;
        
        if (page && page.views && page.views[viewName] && page.views[viewName].view_config) {
            // New format: background is in views[viewName].view_config.background
            const viewConfig = page.views[viewName].view_config;
            const background = viewConfig.background || {};
            const bgType = background.type || 'color';
            const bgConfig = background.config || {};
            
            if (bgType === 'image') {
                bgImage = bgConfig.image_url || null;
            } else if (bgType === 'gradient') {
                // Convert gradient config to CSS gradient string
                const color1 = bgConfig.colour1 || '#667eea';
                const color2 = bgConfig.colour2 || '#764ba2';
                const angle = bgConfig.angle || 135;
                bgColor = `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
            } else {
                // Color type
                bgColor = bgConfig.color || '#000000';
            }
        }

        // Clear all background styles first
        element.style.removeProperty('background');
        element.style.removeProperty('background-image');
        element.style.removeProperty('background-size');
        element.style.removeProperty('background-position');
        element.style.removeProperty('background-repeat');

        // Apply background image if we have a valid non-empty string
        if (bgImage !== null && bgImage !== undefined && typeof bgImage === 'string' && bgImage.trim() !== '') {
            // Background image - stretch to fit
            let imageUrl = bgImage.startsWith('/') || bgImage.startsWith('http') 
                ? bgImage 
                : '/api/media/serve/' + bgImage;
            // Normalize URL to prevent mixed content errors (HTTP -> HTTPS or absolute -> relative)
            if (window.UrlUtils && window.UrlUtils.normalizeMediaUrl) {
                imageUrl = window.UrlUtils.normalizeMediaUrl(imageUrl);
            }
            
            element.style.setProperty('background-image', `url("${imageUrl}")`, 'important');
            element.style.setProperty('background-size', 'cover', 'important');
            element.style.setProperty('background-position', 'center', 'important');
            element.style.setProperty('background-repeat', 'no-repeat', 'important');
            // Don't set background-color when using background-image - let the image show through
        } else if (bgColor !== null && bgColor !== undefined && typeof bgColor === 'string' && bgColor.trim() !== '') {
            // Background color/gradient
            // For gradients, use background-image; for solid colors, use background-color
            if (bgColor.includes('gradient')) {
                element.style.setProperty('background-image', bgColor, 'important');
                element.style.setProperty('background-color', 'transparent', 'important');
            } else {
                element.style.setProperty('background-color', bgColor, 'important');
                element.style.setProperty('background-image', 'none', 'important');
            }
        } else {
            // No background set in quiz - leave transparent/empty
            // NO fallback to defaultBackground - that's only for editor properties pane display
            element.style.setProperty('background', 'transparent', 'important');
            element.style.setProperty('background-image', 'none', 'important');
        }
    }

    /**
     * Gets the background value for display in editor properties pane
     * This is the ONLY place where defaultBackground is used
     * @param {Object} page - Page object
     * @param {Object} quiz - Quiz object
     * @param {string} defaultBackground - Default background for editor UI only
     * @returns {Object} - { type: 'image'|'gradient'|'color', value: string, previewStyle: string }
     */
    function getBackgroundForDisplay(page, quiz, defaultBackground, viewName) {
        // Default viewName to 'display' if not provided
        if (!viewName) {
            viewName = 'display';
        }
        
        // Get background from new format (view_config structure)
        let bgImage = null;
        let bgColor = null;
        
        if (page && page.views && page.views[viewName] && page.views[viewName].view_config) {
            // New format: background is in views[viewName].view_config.background
            const viewConfig = page.views[viewName].view_config;
            const background = viewConfig.background || {};
            const bgType = background.type || 'color';
            const bgConfig = background.config || {};
            
            if (bgType === 'image') {
                bgImage = bgConfig.image_url || null;
            } else if (bgType === 'gradient') {
                // Convert gradient config to CSS gradient string
                const color1 = bgConfig.colour1 || '#667eea';
                const color2 = bgConfig.colour2 || '#764ba2';
                const angle = bgConfig.angle || 135;
                bgColor = `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
            } else {
                // Color type
                bgColor = bgConfig.color || '#000000';
            }
        }
        const displayBg = bgColor || defaultBackground || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        
        let type = 'gradient';
        let previewStyle = '';

        if (bgImage !== null && bgImage !== undefined && typeof bgImage === 'string' && bgImage.trim() !== '') {
            type = 'image';
            let imageUrl = bgImage.startsWith('/') || bgImage.startsWith('http') 
                ? bgImage 
                : '/api/media/serve/' + bgImage;
            // Normalize URL to prevent mixed content errors (HTTP -> HTTPS or absolute -> relative)
            if (window.UrlUtils && window.UrlUtils.normalizeMediaUrl) {
                imageUrl = window.UrlUtils.normalizeMediaUrl(imageUrl);
            }
            previewStyle = `background-image: url(${imageUrl}); background-size: cover; background-position: center;`;
        } else if (displayBg.includes('gradient')) {
            type = 'gradient';
            previewStyle = `background: ${displayBg};`;
        } else {
            type = 'color';
            previewStyle = `background: ${displayBg};`;
        }

        return {
            type: type,
            value: bgColor || defaultBackground,
            previewStyle: previewStyle,
            hasImage: !!bgImage,
            imageUrl: bgImage
        };
    }

    // Export functions
    window.BackgroundUtils = {
        applyBackground: applyBackground,
        getBackgroundForDisplay: getBackgroundForDisplay
    };

})(window);

