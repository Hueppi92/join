/**
 * Sets a flag to skip the splash animation when returning to the login page.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function initSignupBackButton() {
	const backButton = document.querySelector('.signup-back');
	if (!backButton) return;

	backButton.addEventListener('click', () => {
		sessionStorage.setItem('skipSplash', '1');
	});
}

/**
 * Initializes Firebase registration handling for the sign-up form.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function initSignupForm() {
	const form = document.querySelector('.login-form');
	if (!form) return;

	const fields = getSignupFields(form);
	if (!fields) return;

	bindSignupFieldEvents(fields);
	form.addEventListener('submit', (event) => handleSignupSubmit(event, fields));
}

/**
 * Collects sign-up form fields and related message elements.
 * @param {HTMLFormElement} form - The sign-up form element.
 * @returns {Object | null} Collected form fields or null if missing.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function getSignupFields(form) {
	const fields = collectSignupFields(form);
	if (hasMissingSignupField(fields)) return null;
	return { form, ...fields };
}

function collectSignupFields(form) {
	const inputFields = collectSignupInputFields(form);
	const messageFields = collectSignupMessageFields(form);
	return { ...inputFields, ...messageFields };
}

function collectSignupInputFields(form) {
	return {
		nameInput: form.querySelector('input[name="name"]'),
		emailInput: form.querySelector('input[name="email"]'),
		passwordInput: form.querySelector('input[name="password"]'),
		confirmInput: form.querySelector('input[name="confirmPassword"]'),
		privacyInput: form.querySelector('input[name="privacy"]'),
		submitButton: form.querySelector('button[type="submit"]'),
	};
}

function collectSignupMessageFields(form) {
	return {
		nameMessage: form.querySelector('#msg-name'),
		emailMessage: form.querySelector('#msg-email'),
		passwordMessage: form.querySelector('#msg-password'),
		confirmMessage: form.querySelector('#msg-confirmPassword'),
		privacyMessage: form.querySelector('#msg-privacy'),
	};
}

function hasMissingSignupField(fields) {
	return Object.values(fields).some((value) => !value);
}

/**
 * Hides all inline validation messages on initial load.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function initMessageVisibility(fields) {
	[
		fields.nameMessage,
		fields.emailMessage,
		fields.passwordMessage,
		fields.confirmMessage,
		fields.privacyMessage,
	].forEach((message) => {
		message.style.visibility = 'hidden';
	});
}

function bindSignupInputField(input, message, updateState) {
	input.addEventListener('input', () => {
		clearFieldError(input, message);
		updateState();
	});
}

function bindSignupBlurField(input, validateField, fields) {
	input.addEventListener('blur', () => {
		if (input.value.trim().length > 0) validateField(fields);
	});
}

function bindPrivacyField(fields, updateState) {
	fields.privacyInput.addEventListener('change', () => {
		if (fields.privacyInput.checked) clearFieldError(fields.privacyInput, fields.privacyMessage);
		updateState();
	});
}

/**
 * Binds events to update sign-up form button state.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function bindSignupFieldEvents(fields) {
	const updateState = () => updateSignupButtonState(fields);
	initMessageVisibility(fields);
	bindSignupInputField(fields.nameInput, fields.nameMessage, updateState);
	bindSignupInputField(fields.emailInput, fields.emailMessage, updateState);
	bindSignupInputField(fields.passwordInput, fields.passwordMessage, updateState);
	bindSignupInputField(fields.confirmInput, fields.confirmMessage, updateState);
	bindSignupBlurField(fields.nameInput, validateNameField, fields);
	bindSignupBlurField(fields.emailInput, validateEmailField, fields);
	bindSignupBlurField(fields.passwordInput, validatePasswordField, fields);
	bindSignupBlurField(fields.confirmInput, validateConfirmField, fields);
	bindPrivacyField(fields, updateState);
	updateSignupButtonState(fields);
}

/**
 * Enables/disables the sign-up button based on form validity.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function updateSignupButtonState(fields) {
	const isValid = isSignupInputReady(fields);
	const isLoading = fields.submitButton.dataset.loading === '1';
	fields.submitButton.disabled = isLoading || !isValid;
}

/**
 * Checks if required inputs are filled and valid.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @returns {boolean} True if all required inputs are valid.
 * @category Sign-Up
 * @subcategory Validation
 */
function isSignupInputReady(fields) {
	return (
		fields.nameInput.value.trim().length > 0 &&
		isEmailValid(fields.emailInput.value) &&
		fields.passwordInput.value.trim().length >= 6 &&
		fields.passwordInput.value === fields.confirmInput.value &&
		fields.privacyInput.checked
	);
}

function clearSignupFieldErrors(fields) {
	clearFieldError(fields.nameInput, fields.nameMessage);
	clearFieldError(fields.emailInput, fields.emailMessage);
	clearFieldError(fields.passwordInput, fields.passwordMessage);
	clearFieldError(fields.confirmInput, fields.confirmMessage);
	clearFieldError(fields.privacyInput, fields.privacyMessage);
}

function buildSignupUserData(fields, userId) {
	const displayName = fields.nameInput.value.trim();
	return {
		displayName,
		userId,
		email: fields.emailInput.value.trim(),
		color: getAvatarColorFromName(displayName),
		createdAt: Date.now(),
	};
}

async function persistSignupUser(credential, fields) {
	const userData = buildSignupUserData(fields, credential.user.uid);
	sessionStorage.setItem('userId', userData.userId);
	await credential.user.updateProfile({ displayName: userData.displayName });
	await firebase.database().ref(`users/${userData.userId}`).set({
		name: userData.displayName,
		email: userData.email,
		color: userData.color,
		createdAt: userData.createdAt,
	});
}

/**
 * Handles Firebase sign-up submission.
 * @param {SubmitEvent} event - The form submit event.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @category Sign-Up
 * @subcategory Firebase Logic
 */
async function handleSignupSubmit(event, fields) {
	event.preventDefault();
	clearSignupFieldErrors(fields);
	if (!validateSignupFields(fields)) return;
	await submitSignupWithLoading(fields);
}

async function submitSignupWithLoading(fields) {
	setLoadingState(fields, true);
	try {
		await performSignup(fields);
	} catch (error) {
		setFieldError(fields.emailInput, fields.emailMessage, getAuthErrorMessage(error));
	} finally {
		setLoadingState(fields, false);
	}
}

async function performSignup(fields) {
	const credential = await firebase.auth().createUserWithEmailAndPassword(
		fields.emailInput.value.trim(),
		fields.passwordInput.value
	);
	await persistSignupUser(credential, fields);
	sessionStorage.removeItem('guestLogin');
	sessionStorage.setItem('skipSplash', '1');
	showSuccessAnimation();
}

/**
 * Displays the success overlay and redirects back to login.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function showSuccessAnimation() {
	const overlay = document.getElementById('success-overlay');
	if (!overlay) {
		redirectToLoginWithSplashSkip();
		return;
	}

	overlay.classList.remove('d-none');
	animateSignupSuccessMessage(overlay);
	setTimeout(redirectToLoginWithSplashSkip, 1000);
}

function animateSignupSuccessMessage(overlay) {
	const message = overlay.querySelector('.success-message');
	if (message) message.classList.add('slide-in-bottom');
}

function redirectToLoginWithSplashSkip() {
	sessionStorage.setItem('skipSplash', '1');
	window.location.href = '../index.html';
}

/**
 * Sets the loading state for the sign-up form.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @param {boolean} isLoading - Whether the submit action is in progress.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function setLoadingState(fields, isLoading) {
	fields.submitButton.dataset.loading = isLoading ? '1' : '0';
	updateSignupButtonState(fields);
}

/**
 * Maps Firebase auth errors to readable messages.
 * @param {unknown} error - Firebase auth error.
 * @returns {string} User-facing error message.
 * @category Sign-Up
 * @subcategory Firebase Logic
 */
function getAuthErrorMessage(error) {
	const fallback = 'Registration failed. Please try again.';
	if (!error || typeof error !== 'object' || !('code' in error)) return fallback;
	return getSignupAuthErrorMessages()[error.code] || fallback;
}

function getSignupAuthErrorMessages() {
	return {
		'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase yet.',
		'auth/network-request-failed': 'Network error. Please check your connection.',
		'auth/email-already-in-use': 'This email address is already registered.',
		'auth/invalid-email': 'Please enter a valid email address.',
		'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
	};
}

/**
 * Validates sign-up inputs and shows inline errors.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @returns {boolean} True if all sign-up fields are valid.
 * @category Sign-Up
 * @subcategory Validation
 */
function validateSignupFields(fields) {
	let isValid = true;
	if (!validateNameField(fields)) isValid = false;
	if (!validateEmailField(fields)) isValid = false;
	if (!validatePasswordField(fields)) isValid = false;
	if (!validateConfirmField(fields)) isValid = false;
	if (!validatePrivacyField(fields)) isValid = false;
	return isValid;
}

/**
 * Validates the name field.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @returns {boolean} True if the name field is valid.
 * @category Sign-Up
 * @subcategory Validation
 */
function validateNameField(fields) {
	if (!fields.nameInput.value.trim()) {
		setFieldError(fields.nameInput, fields.nameMessage, 'Please enter a name.');
		return false;
	}
	return true;
}

/**
 * Validates the email field.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @returns {boolean} True if the email field is valid.
 * @category Sign-Up
 * @subcategory Validation
 */
function validateEmailField(fields) {
	if (!isEmailValid(fields.emailInput.value)) {
		setFieldError(fields.emailInput, fields.emailMessage, 'Please enter a valid email address.');
		return false;
	}
	return true;
}

/**
 * Validates the password field.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @returns {boolean} True if the password field is valid.
 * @category Sign-Up
 * @subcategory Validation
 */
function validatePasswordField(fields) {
	if (fields.passwordInput.value.trim().length < 6) {
		setFieldError(fields.passwordInput, fields.passwordMessage, 'Password must be at least 6 characters long.');
		return false;
	}
	return true;
}

/**
 * Validates the confirm password field.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @returns {boolean} True if the confirmation matches the password.
 * @category Sign-Up
 * @subcategory Validation
 */
function validateConfirmField(fields) {
	if (fields.passwordInput.value !== fields.confirmInput.value) {
		setFieldError(fields.confirmInput, fields.confirmMessage, 'Passwords do not match.');
		return false;
	}
	return true;
}

/**
 * Validates the privacy checkbox.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @returns {boolean} True if the privacy checkbox is accepted.
 * @category Sign-Up
 * @subcategory Validation
 */
function validatePrivacyField(fields) {
	if (!fields.privacyInput.checked) {
		setFieldError(fields.privacyInput, fields.privacyMessage, 'Please accept the privacy policy.');
		return false;
	}
	return true;
}

document.addEventListener('DOMContentLoaded', () => {
	initSignupBackButton();
	initSignupForm();
	initPasswordToggles();
});
