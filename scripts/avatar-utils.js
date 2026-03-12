const AVATAR_COLOR_PALETTE = [
	'#6e52ff',
	'#1fd7c1',
	'#fc71ff',
	'#c3ff2b',
	'#ffbb2b',
	'#ff5eb3',
	'#00bee8',
	'#ffa35e',
	'#0038ff',
	'#ff4646',
	'#ff7a00',
	'#9327ff',
	'#ff745e',
	'#ffc701',
	'#ffe62b',
];

/**
 * Normalizes a name before deterministic color hashing.
 * @param {string} name - Raw name value.
 * @returns {string} Normalized lowercase name.
 */
function normalizeAvatarName(name) {
	return String(name || '').trim().toLowerCase();
}


/**
 * Computes a small deterministic hash for a normalized name.
 * @param {string} value - Normalized name.
 * @returns {number} Deterministic hash value.
 */
function getAvatarNameHash(value) {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash + value.charCodeAt(index) * (index + 1)) % 1000;
	}
	return hash;
}


/**
 * Computes a stable avatar color for a user name.
 * @param {string} name - User name.
 * @returns {string} Hex color string.
 */
function getAvatarColorFromName(name) {
	const normalizedName = normalizeAvatarName(name);
	const colorIndex = getAvatarNameHash(normalizedName) % AVATAR_COLOR_PALETTE.length;
	return AVATAR_COLOR_PALETTE[colorIndex];
}
