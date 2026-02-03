/**
 * Validates email address format.
 * @param {string} value - Email address to validate.
 * @returns {boolean} True if the email format is valid.
 * @category Shared
 * @subcategory Validation
 */
function isEmailValid(value) {
	return /^\S+@\S+\.\S+$/.test((value || '').trim());
}

/**
 * Sets the error state for a field.
 * @param {HTMLInputElement} input - Input element to mark as invalid.
 * @param {HTMLElement} message - Message element to show the error.
 * @param {string} text - Error text to display.
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
 * @param {HTMLInputElement} input - Input element to clear.
 * @param {HTMLElement} message - Message element to reset.
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
 * @param {HTMLInputElement} input - Password input to toggle.
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

/**
 * Returns whether Firebase auth is available.
 * @returns {boolean} True if Firebase auth is available.
 * @category Shared
 * @subcategory Firebase Logic
 */
function hasFirebaseAuth() {
	return typeof firebase !== 'undefined' && typeof firebase.auth === 'function';
}

/**
 * Clears session markers for the current user.
 * @category Shared
 * @subcategory Firebase Logic
 */
function clearUserSession() {
	sessionStorage.removeItem('userId');
	sessionStorage.removeItem('guestLogin');
	sessionStorage.removeItem('skipSplash');
}

/**
 * Resolves the login path based on current page location.
 * @returns {string} Login page path.
 * @category Shared
 * @subcategory UI & Init
 */
function getLoginPath() {
	return window.location.pathname.includes('/sites/') ? '../index.html' : './index.html';
}

/**
 * Signs the current user out if Firebase auth is available.
 * @returns {Promise<void>} Resolves after sign-out attempt.
 * @category Shared
 * @subcategory Firebase Logic
 */
async function signOutIfPossible() {
	if (!hasFirebaseAuth()) return;
	try {
		await firebase.auth().signOut();
	} catch (error) {
		return;
	}
}

/**
 * Handles logging out and redirects to login.
 * @returns {Promise<void>} Resolves after redirect is triggered.
 * @category Shared
 * @subcategory Firebase Logic
 */
async function handleLogout() {
	await signOutIfPossible();
	clearUserSession();
	window.location.href = getLoginPath();
}

/**
 * Wires logout links to clear auth state safely.
 * @category Shared
 * @subcategory UI & Init
 */
function initLogoutLinks() {
	const links = document.querySelectorAll('[data-logout="1"]');
	if (!links.length) return;
	links.forEach((link) =>
		link.addEventListener('click', (event) => {
			event.preventDefault();
			handleLogout();
		})
	);
}

/**
 * Initializes the profile menu toggle functionality.
 * @category Shared
 * @subcategory UI & Init
 */
document.addEventListener('DOMContentLoaded', () => {
	const profileBtn = document.querySelector('#profile-btn');
	const profileMenu = document.querySelector('#profile-menu');

	if (profileBtn && profileMenu) {
		profileBtn.addEventListener('click', (event) => {
			event.stopPropagation();
			profileMenu.classList.toggle('is-open');
		});

		document.addEventListener('click', () => {
			profileMenu.classList.remove('is-open');
		});
	}

	initLogoutLinks();
});