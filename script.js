/**
 * Validates email address format.
 * @param {string} value
 * @returns {boolean}
 * @category Shared
 * @subcategory Validation
 */
function isEmailValid(value) {
	return /^\S+@\S+\.\S+$/.test((value || '').trim());
}

/**
 * Sets the error state for a field.
 * @param {HTMLInputElement} input
 * @param {HTMLElement} message
 * @param {string} text
 * @category Shared
 * @subcategory Validation
 */
function setFieldError(input, message, text) {
	if (!input || !message) return;
	input.classList.add('input-error');
	message.textContent = text;
	message.style.visibility = 'visible';
}

/**
 * Clears the error state for a field.
 * @param {HTMLInputElement} input
 * @param {HTMLElement} message
 * @category Shared
 * @subcategory Validation
 */
function clearFieldError(input, message) {
	if (!input || !message) return;
	input.classList.remove('input-error');
	message.textContent = '';
	message.style.visibility = 'hidden';
}

/**
 * Enables password visibility toggles globally.
 * @category Shared
 * @subcategory UI & Init
 */
function initPasswordToggles() {
	document.querySelectorAll('input[type="password"]').forEach(setupPasswordToggle);
}

/**
 * Wires a password input with toggle icons.
 * @param {HTMLInputElement} input
 * @category Shared
 * @subcategory UI & Init
 */
function setupPasswordToggle(input) {
	const wrapper = input.closest('.input-field');
	const iconBox = wrapper ? wrapper.querySelector('.input-icon') : null;
	const icon = iconBox ? iconBox.querySelector('img') : null;
	if (!iconBox || !icon) return;

	iconBox.classList.add('password-toggle');
	const lockSrc = icon.getAttribute('src') || '';
	const offSrc = lockSrc.replace(/[^/]+$/, 'visibility_off.svg');
	const onSrc = lockSrc.replace(/[^/]+$/, 'visibility.svg');

	const updateIcon = () => {
		if (!input.value) {
			icon.src = lockSrc;
			return;
		}
		icon.src = input.type === 'password' ? offSrc : onSrc;
	};

	iconBox.addEventListener('click', () => {
		if (!input.value) return;
		input.type = input.type === 'password' ? 'text' : 'password';
		updateIcon();
	});

	input.addEventListener('input', updateIcon);
	updateIcon();
}
