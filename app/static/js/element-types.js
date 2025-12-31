// Element type definitions with metadata
(function() {
    'use strict';
    
    if (typeof window.ElementTypes === 'undefined') {
        window.ElementTypes = {};
    }
    
    /**
     * Element type definitions
     * Each element type has metadata including whether it's playable
     */
    const elementTypeDefinitions = {
        'image': {
            playable: false
        },
        'video': {
            playable: true
        },
        'audio': {
            playable: true
        },
        'rectangle': {
            playable: false
        },
        'circle': {
            playable: false
        },
        'triangle': {
            playable: false
        },
        'arrow': {
            playable: false
        },
        'line': {
            playable: false
        },
        'plus': {
            playable: false
        },
        'text': {
            playable: false
        },
        'richtext': {
            playable: false
        },
        'counter': {
            playable: true
        },
        'audio_control': {
            playable: false
        },
        'answer_input': {
            playable: false
        },
        'answer_display': {
            playable: false
        },
        'appearance_control': {
            playable: false
        },
        'navigation_control': {
            playable: false
        }
    };
    
    /**
     * Check if an element type is playable
     * @param {string} elementType - The element type
     * @param {string} mediaType - Optional media_type (for legacy support)
     * @returns {boolean}
     */
    function isPlayable(elementType, mediaType) {
        // Check element type first
        if (elementTypeDefinitions[elementType]) {
            return elementTypeDefinitions[elementType].playable;
        }
        
        // Fallback: check media_type for legacy support
        if (mediaType && elementTypeDefinitions[mediaType]) {
            return elementTypeDefinitions[mediaType].playable;
        }
        
        // Default to false if type not found
        return false;
    }
    
    /**
     * Check if an element data object is playable
     * @param {Object} elementData - Element data object
     * @returns {boolean}
     */
    function isElementPlayable(elementData) {
        if (!elementData) return false;
        
        const elementType = elementData.type;
        const mediaType = elementData.media_type;
        
        return isPlayable(elementType, mediaType);
    }
    
    /**
     * Get all playable element types
     * @returns {Array<string>}
     */
    function getPlayableTypes() {
        return Object.keys(elementTypeDefinitions).filter(type => 
            elementTypeDefinitions[type].playable
        );
    }
    
    // Export API
    window.ElementTypes = {
        isPlayable: isPlayable,
        isElementPlayable: isElementPlayable,
        getPlayableTypes: getPlayableTypes,
        definitions: elementTypeDefinitions
    };
})();

