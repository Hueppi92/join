/**
 * Validates email address format.
 * @param {string} value
 * @returns {boolean}
 */
function isEmailValid(value) {
	return /^\S+@\S+\.\S+$/.test((value || '').trim());
}

/**
 * Sets the error state for a field.
 * @param {HTMLInputElement} input
 * @param {HTMLElement} message
 * @param {string} text
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
 */
function clearFieldError(input, message) {
	if (!input || !message) return;
	input.classList.remove('input-error');
	message.textContent = '';
	message.style.visibility = 'hidden';
}

/**
 * Enables password visibility toggles globally.
 */
function initPasswordToggles() {
	document.querySelectorAll('input[type="password"]').forEach(setupPasswordToggle);
}

/**
 * Wires a password input with toggle icons.
 * @param {HTMLInputElement} input
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
