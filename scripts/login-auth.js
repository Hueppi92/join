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
	bindLoginInputListener(fields.emailInput, fields, updateState);
	bindLoginInputListener(fields.passwordInput, fields, updateState);
	updateLoginButtonState(fields);
}


function bindLoginInputListener(input, fields, updateState) {
	input.addEventListener('input', () => {
		clearLoginFeedback(fields);
		updateState();
	});
}


function clearLoginFeedback(fields) {
	setLoginFieldErrorState(fields, false);
	setFormMessage(fields.message, '');
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
	clearLoginFeedback(fields);
	if (!validateLoginBeforeSubmit(fields)) return;
	setLoadingState(fields, true);
	try {
		const credential = await signInWithCredentials(fields);
		handleSuccessfulLogin(credential);
	} catch (error) {
		handleFailedLogin(fields, error);
	} finally {
		setLoadingState(fields, false);
	}
}


function validateLoginBeforeSubmit(fields) {
	if (isLoginInputValid(fields)) return true;
	setFormMessage(fields.message, 'Please enter valid credentials.');
	setLoginFieldErrorState(fields, true);
	return false;
}


async function signInWithCredentials(fields) {
	const email = fields.emailInput.value.trim();
	const password = fields.passwordInput.value;
	return firebase.auth().signInWithEmailAndPassword(email, password);
}


function handleSuccessfulLogin(credential) {
	sessionStorage.setItem('userId', credential.user.uid);
	sessionStorage.removeItem('guestLogin');
	sessionStorage.setItem('skipSplash', '1');
	window.location.href = './sites/summary.html';
}


function handleFailedLogin(fields, error) {
	setFormMessage(fields.message, getAuthErrorMessage(error));
	setLoginFieldErrorState(fields, true);
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
	return getLoginAuthErrorMessages()[error.code] || fallback;
}


function getLoginAuthErrorMessages() {
	return {
		'auth/invalid-credential': 'Check your email and password. Please try again.',
		'auth/invalid-login-credentials': 'Check your email and password. Please try again.',
		'auth/invalid-email': 'Please enter a valid email address.',
		'auth/user-not-found': 'Check your email and password. Please try again.',
		'auth/wrong-password': 'Check your email and password. Please try again.',
		'auth/user-disabled': 'This user is disabled.',
		'auth/too-many-requests': 'Too many attempts. Please try again later.',
	};
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
