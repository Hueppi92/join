/**
 * @typedef {Object} LoginFields
 * @property {HTMLFormElement} form - The login form element.
 * @property {HTMLInputElement} emailInput - The email input field.
 * @property {HTMLInputElement} passwordInput - The password input field.
 * @property {HTMLButtonElement} submitButton - The submit button.
 * @property {HTMLElement} message - The login error message element.
 */

/**
 * Initializes Firebase login handling for the login form.
 * @category Login
 * @subcategory UI & Init
 */
function initLoginForm() {
	const form = document.querySelector('.login-form');
	if (!form) return;

	const fields = getLoginFields(form);
	if (!fields) return;

	bindLoginFieldEvents(fields);
	form.addEventListener('submit', (event) => handleLoginSubmit(event, fields));
}

/**
 * Collects login form fields.
 * @param {HTMLFormElement} form - The login form element.
 * @returns {LoginFields | null} Collected form fields or null if missing.
 * @category Login
 * @subcategory UI & Init
 */
function getLoginFields(form) {
	const emailInput = form.querySelector('input[name="email"]');
	const passwordInput = form.querySelector('input[name="password"]');
	const submitButton = form.querySelector('button[type="submit"]');
	const message = document.getElementById('login-error-message');
	if (!emailInput || !passwordInput || !submitButton || !message) return null;

	return { form, emailInput, passwordInput, submitButton, message };
}

/**
 * Binds events to update login form button state.
 * @param {LoginFields} fields - Collected login form fields.
 * @category Login
 * @subcategory UI & Init
 */
function bindLoginFieldEvents(fields) {
	const updateState = () => updateLoginButtonState(fields);
	fields.emailInput.addEventListener('input', () => {
		setLoginFieldErrorState(fields, false);
		setFormMessage(fields.message, '');
		updateState();
	});
	fields.passwordInput.addEventListener('input', () => {
		setLoginFieldErrorState(fields, false);
		setFormMessage(fields.message, '');
		updateState();
	});
	updateLoginButtonState(fields);
}

/**
 * Enables/disables the login button based on form validity.
 * @param {LoginFields} fields - Collected login form fields.
 * @category Login
 * @subcategory UI & Init
 */
function updateLoginButtonState(fields) {
	const isValid = isLoginInputValid(fields);
	const isLoading = fields.submitButton.dataset.loading === '1';
	fields.submitButton.disabled = isLoading || !isValid;
}

/**
 * Validates login inputs.
 * @param {LoginFields} fields - Collected login form fields.
 * @returns {boolean} True if the login inputs are valid.
 * @category Login
 * @subcategory Validation
 */
function isLoginInputValid(fields) {
	return isEmailValid(fields.emailInput.value) && fields.passwordInput.value.trim().length > 0;
}

/**
 * Handles Firebase login submission.
 * @param {SubmitEvent} event - The form submit event.
 * @param {LoginFields} fields - Collected login form fields.
 * @category Login
 * @subcategory Firebase Logic
 */
async function handleLoginSubmit(event, fields) {
	event.preventDefault();
	setFormMessage(fields.message, '');

	if (!isLoginInputValid(fields)) {
		setFormMessage(fields.message, 'Please enter valid credentials.');
		setLoginFieldErrorState(fields, true);
		return;
	}

	setLoadingState(fields, true);
	try {
		const credential = await firebase.auth().signInWithEmailAndPassword(
			fields.emailInput.value.trim(),
			fields.passwordInput.value
		);
		sessionStorage.setItem('userId', credential.user.uid);
		sessionStorage.removeItem('guestLogin');
		sessionStorage.setItem('skipSplash', '1');
		window.location.href = './sites/summary.html';
	} catch (error) {
		setFormMessage(fields.message, getAuthErrorMessage(error));
		setLoginFieldErrorState(fields, true);
	} finally {
		setLoadingState(fields, false);
	}
}

/**
 * Sets error state on login inputs.
 * @param {LoginFields} fields - Collected login form fields.
 * @param {boolean} hasError - Whether inputs should be marked as invalid.
 * @category Login
 * @subcategory UI & Init
 */
function setLoginFieldErrorState(fields, hasError) {
	fields.emailInput.classList.toggle('input-error', hasError);
	fields.passwordInput.classList.toggle('input-error', hasError);
}

/**
 * Sets the loading state for the login form.
 * @param {LoginFields} fields - Collected login form fields.
 * @param {boolean} isLoading - Whether the submit action is in progress.
 * @category Login
 * @subcategory UI & Init
 */
function setLoadingState(fields, isLoading) {
	fields.submitButton.dataset.loading = isLoading ? '1' : '0';
	updateLoginButtonState(fields);
}

/**
 * Updates the form message.
 * @param {HTMLElement} message - Message element to update.
 * @param {string} text - Message content to display.
 * @category Login
 * @subcategory UI & Init
 */
function setFormMessage(message, text) {
	message.textContent = text;
	message.classList.toggle('is-hidden', !text);
}

/**
 * Maps Firebase auth errors to readable messages.
 * @param {unknown} error - Firebase auth error.
 * @returns {string} User-facing error message.
 * @category Login
 * @subcategory Firebase Logic
 */
function getAuthErrorMessage(error) {
	const fallback = 'Login failed. Please try again.';
	if (!error || typeof error !== 'object' || !('code' in error)) return fallback;

	switch (error.code) {
		case 'auth/invalid-credential':
		case 'auth/invalid-login-credentials':
			return 'Check your email and password. Please try again.';
		case 'auth/invalid-email':
			return 'Please enter a valid email address.';
		case 'auth/user-not-found':
		case 'auth/wrong-password':
			return 'Check your email and password. Please try again.';
		case 'auth/user-disabled':
			return 'This user is disabled.';
		case 'auth/too-many-requests':
			return 'Too many attempts. Please try again later.';
		default:
			return fallback;
	}
}

/**
 * Wires the guest login button to open the summary page.
 * @category Login
 * @subcategory UI & Init
 */
function initGuestLogin() {
	const guestButton = document.querySelector('.guest-login');
	if (!guestButton) return;

	guestButton.addEventListener('click', handleGuestLogin);
}

/**
 * Navigates to the summary page for guest access.
 * @category Login
 * @subcategory UI & Init
 */
function handleGuestLogin() {
	sessionStorage.setItem('guestLogin', '1');
	sessionStorage.removeItem('userId');
	window.location.href = './sites/summary.html';
}

document.addEventListener('DOMContentLoaded', () => {
	initGuestLogin();
	initLoginForm();
	initPasswordToggles();
});
