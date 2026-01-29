// URL normalization utility - prevents mixed content errors
// Used by both editor and runtime views

(function(window) {
    'use strict';

    /**
     * Normalize image/media URLs to prevent mixed content errors.
     * Converts HTTP URLs to HTTPS when page is loaded over HTTPS,
     * or converts absolute URLs to relative URLs when they match the current origin.
     * 
     * @param {string} url - The URL to normalize
     * @returns {string} - Normalized URL
     */
    function normalizeMediaUrl(url) {
        if (!url || typeof url !== 'string') {
            return url || '';
        }
        
        // If it's already a relative URL, return as-is
        if (url.startsWith('/')) {
            return url;
        }
        
        // If it's not an absolute URL, assume it's a filename and make it relative
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return '/api/media/serve/' + url;
        }
        
        // Handle absolute URLs
        try {
            const urlObj = new URL(url);
            const currentOrigin = window.location.origin;
            const currentProtocol = window.location.protocol;
            
            // If the URL is from the same origin, convert to relative
            if (urlObj.origin === currentOrigin) {
                return urlObj.pathname + (urlObj.search || '') + (urlObj.hash || '');
            }
            
            // If page is HTTPS but URL is HTTP, ALWAYS convert HTTP URLs to relative if they point to /api/media/serve/
            // This is critical for IP addresses which can't be upgraded to HTTPS
            if (currentProtocol === 'https:' && urlObj.protocol === 'http:') {
                // If the path is /api/media/serve/, ALWAYS convert to relative URL
                // This handles IP addresses and any HTTP URLs pointing to the same server's media API
                if (urlObj.pathname.startsWith('/api/media/serve/')) {
                    // Extract the path and convert to relative - this works for same-server scenarios
                    // This is safe because /api/media/serve/ is always served by the same server
                    return urlObj.pathname + (urlObj.search || '') + (urlObj.hash || '');
                }
                // For other HTTP URLs on HTTPS pages, try converting to HTTPS
                // But this will fail for IP addresses, so we should still convert to relative if possible
                // Check if it's likely the same server (same port or common ports)
                const currentPort = window.location.port || (currentProtocol === 'https:' ? '443' : '80');
                const urlPort = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');
                // If ports match or URL is on common media-serving ports, convert to relative
                if (urlPort === currentPort || urlObj.pathname.startsWith('/api/') || urlObj.pathname.startsWith('/static/')) {
                    return urlObj.pathname + (urlObj.search || '') + (urlObj.hash || '');
                }
                // Last resort: try converting HTTP to HTTPS (will fail for IP addresses)
                urlObj.protocol = 'https:';
                return urlObj.toString();
            }
            
            // Otherwise return as-is (external HTTPS URL or different origin)
            return url;
        } catch (e) {
            // If URL parsing fails, return as-is
            console.warn('Failed to normalize URL:', url, e);
            return url;
        }
    }

    // Export function
    window.UrlUtils = {
        normalizeMediaUrl: normalizeMediaUrl
    };

    // Also export to Editor.Utils for backwards compatibility with editor code
    if (typeof window.Editor === 'undefined') {
        window.Editor = {};
    }
    if (!window.Editor.Utils) {
        window.Editor.Utils = {};
    }
    window.Editor.Utils.normalizeMediaUrl = normalizeMediaUrl;

})(window);
