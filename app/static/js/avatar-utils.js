/**
 * Avatar utilities - centralized avatar code to emoji mapping
 */

// Avatar mapping to convert avatar codes to emojis
const avatarMap = {
    'avatar_0': '🐶', 'avatar_1': '🐱', 'avatar_2': '🐭', 'avatar_3': '🐹', 'avatar_4': '🐰',
    'avatar_5': '🦊', 'avatar_6': '🐻', 'avatar_7': '🐼', 'avatar_8': '🐨', 'avatar_9': '🐯',
    'avatar_10': '🦁', 'avatar_11': '🐮', 'avatar_12': '🐷', 'avatar_13': '🐸', 'avatar_14': '🐵',
    'avatar_15': '🐔', 'avatar_16': '🐧', 'avatar_17': '🦉', 'avatar_18': '🐺', 'avatar_19': '🦄'
};

/**
 * Convert an avatar code (e.g., "avatar_0") to its corresponding emoji
 * @param {string} avatarCode - The avatar code (e.g., "avatar_0")
 * @returns {string} The emoji character or '👤' if not found
 */
function getAvatarEmoji(avatarCode) {
    if (!avatarCode) return '👤';
    return avatarMap[avatarCode] || '👤';
}

// Make it available globally
if (typeof window !== 'undefined') {
    window.getAvatarEmoji = getAvatarEmoji;
    window.avatarMap = avatarMap; // Also export map in case needed
}



