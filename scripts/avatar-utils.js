/**
 * Computes a stable avatar color for a user name.
 * @param {string} name - User name.
 * @returns {string} Hex color string.
 */
function getAvatarColorFromName(name) {
	const palette = [
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
	const value = String(name || '').trim().toLowerCase();
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash + value.charCodeAt(i) * (i + 1)) % 1000;
	}
	return palette[hash % palette.length];
}
