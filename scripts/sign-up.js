/**
 * @typedef {Object} SignupFields
 * @property {HTMLFormElement} form - The form element.
 * @property {HTMLInputElement} nameInput - The name input field.
 * @property {HTMLInputElement} emailInput - The email input field.
 * @property {HTMLInputElement} passwordInput - The password input field.
 * @property {HTMLInputElement} confirmInput - The password confirmation input field.
 * @property {HTMLInputElement} privacyInput - The privacy checkbox.
 * @property {HTMLButtonElement} submitButton - The submit button.
 * @property {HTMLElement} nameMessage - Error message element for name.
 * @property {HTMLElement} emailMessage - Error message element for email.
 * @property {HTMLElement} passwordMessage - Error message element for password.
 * @property {HTMLElement} confirmMessage - Error message element for confirm password.
 * @property {HTMLElement} privacyMessage - Error message element for privacy.
 */

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
 * @param {HTMLFormElement} form
 * @returns {SignupFields | null}
 * @category Sign-Up
 * @subcategory UI & Init
 */
function getSignupFields(form) {
	const nameInput = form.querySelector('input[name="name"]');
	const emailInput = form.querySelector('input[name="email"]');
	const passwordInput = form.querySelector('input[name="password"]');
	const confirmInput = form.querySelector('input[name="confirmPassword"]');
	const privacyInput = form.querySelector('input[name="privacy"]');
	const submitButton = form.querySelector('button[type="submit"]');
	const nameMessage = form.querySelector('#msg-name');
	const emailMessage = form.querySelector('#msg-email');
	const passwordMessage = form.querySelector('#msg-password');
	const confirmMessage = form.querySelector('#msg-confirmPassword');
	const privacyMessage = form.querySelector('#msg-privacy');
	if (
		!nameInput ||
		!emailInput ||
		!passwordInput ||
		!confirmInput ||
		!privacyInput ||
		!submitButton ||
		!nameMessage ||
		!emailMessage ||
		!passwordMessage ||
		!confirmMessage ||
		!privacyMessage
	)
		return null;

	return {
		form,
		nameInput,
		emailInput,
		passwordInput,
		confirmInput,
		privacyInput,
		submitButton,
		nameMessage,
		emailMessage,
		passwordMessage,
		confirmMessage,
		privacyMessage,
	};
}

/**
 * Hides all inline validation messages on initial load.
 * @param {SignupFields} fields
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

/**
 * Binds events to update sign-up form button state.
 * @param {SignupFields} fields
 * @category Sign-Up
 * @subcategory UI & Init
 */
function bindSignupFieldEvents(fields) {
	const updateState = () => updateSignupButtonState(fields);
	initMessageVisibility(fields);
	fields.nameInput.addEventListener('input', () => {
		clearFieldError(fields.nameInput, fields.nameMessage);
		updateState();
	});
	fields.emailInput.addEventListener('input', () => {
		clearFieldError(fields.emailInput, fields.emailMessage);
		updateState();
	});
	fields.passwordInput.addEventListener('input', () => {
		clearFieldError(fields.passwordInput, fields.passwordMessage);
		updateState();
	});
	fields.confirmInput.addEventListener('input', () => {
		clearFieldError(fields.confirmInput, fields.confirmMessage);
		updateState();
	});
	fields.nameInput.addEventListener('blur', () => {
		if (fields.nameInput.value.trim().length > 0) {
			validateNameField(fields);
		}
	});
	fields.emailInput.addEventListener('blur', () => {
		if (fields.emailInput.value.trim().length > 0) {
			validateEmailField(fields);
		}
	});
	fields.passwordInput.addEventListener('blur', () => {
		if (fields.passwordInput.value.trim().length > 0) {
			validatePasswordField(fields);
		}
	});
	fields.confirmInput.addEventListener('blur', () => {
		if (fields.confirmInput.value.trim().length > 0) {
			validateConfirmField(fields);
		}
	});
	fields.privacyInput.addEventListener('change', () => {
		if (fields.privacyInput.checked) {
			clearFieldError(fields.privacyInput, fields.privacyMessage);
		}
		updateState();
	});
	updateSignupButtonState(fields);
}

/**
 * Enables/disables the sign-up button based on form validity.
 * @param {SignupFields} fields
 * @category Sign-Up
 * @subcategory UI & Init
 */
function updateSignupButtonState(fields) {
	const isValid = isSignupInputReady(fields);
	const isLoading = fields.submitButton.dataset.loading === '1';
	fields.submitButton.disabled = isLoading || !isValid;
}

/**
 * Checks if required inputs (except privacy) are filled and valid.
 * @param {SignupFields} fields
 * @returns {boolean}
 * @category Sign-Up
 * @subcategory Validation
 */
function isSignupInputReady(fields) {
	return (
		fields.nameInput.value.trim().length > 0 &&
		isEmailValid(fields.emailInput.value) &&
		fields.passwordInput.value.trim().length >= 6 &&
		fields.passwordInput.value === fields.confirmInput.value
	);
}


/**
 * Handles Firebase sign-up submission.
 * @param {SubmitEvent} event
 * @param {SignupFields} fields
 * @category Sign-Up
 * @subcategory Firebase Logic
 */
async function handleSignupSubmit(event, fields) {
	event.preventDefault();
	clearFieldError(fields.nameInput, fields.nameMessage);
	clearFieldError(fields.emailInput, fields.emailMessage);
	clearFieldError(fields.passwordInput, fields.passwordMessage);
	clearFieldError(fields.confirmInput, fields.confirmMessage);
	clearFieldError(fields.privacyInput, fields.privacyMessage);
	if (!validateSignupFields(fields)) return;

	setLoadingState(fields, true);
	try {
		const credential = await firebase.auth().createUserWithEmailAndPassword(
			fields.emailInput.value.trim(),
			fields.passwordInput.value
		);
		sessionStorage.setItem('userId', credential.user.uid);
		await credential.user.updateProfile({ displayName: fields.nameInput.value.trim() });
		await firebase.database().ref(`users/${credential.user.uid}`).set({
			name: fields.nameInput.value.trim(),
			email: fields.emailInput.value.trim(),
			createdAt: Date.now(),
		});
		sessionStorage.removeItem('guestLogin');
		sessionStorage.setItem('skipSplash', '1');
		showSuccessAnimation();
	} catch (error) {
		setFieldError(fields.emailInput, fields.emailMessage, getAuthErrorMessage(error));
	} finally {
		setLoadingState(fields, false);
	}
}

/**
 * Displays the success overlay and redirects back to login.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function showSuccessAnimation() {
	const overlay = document.getElementById('success-overlay');
	if (!overlay) {
		window.location.href = '../index.html';
		return;
	}

	overlay.classList.remove('d-none');
	const image = overlay.querySelector('img');
	if (image) {
		image.classList.add('slide-in-bottom');
	}

	setTimeout(() => {
		sessionStorage.setItem('skipSplash', '1');
		window.location.href = '../index.html';
	}, 1000);
}

/**
 * Sets the loading state for the sign-up form.
 * @param {SignupFields} fields
 * @param {boolean} isLoading
 * @category Sign-Up
 * @subcategory UI & Init
 */
function setLoadingState(fields, isLoading) {
	fields.submitButton.dataset.loading = isLoading ? '1' : '0';
	updateSignupButtonState(fields);
}

/**
 * Maps Firebase auth errors to readable messages.
 * @param {unknown} error
 * @returns {string}
 * @category Sign-Up
 * @subcategory Firebase Logic
 */
function getAuthErrorMessage(error) {
	const fallback = 'Registration failed. Please try again.';
	if (!error || typeof error !== 'object' || !('code' in error)) return fallback;

	switch (error.code) {
		case 'auth/operation-not-allowed':
			return 'Email/password sign-in is not enabled in Firebase yet.';
		case 'auth/network-request-failed':
			return 'Network error. Please check your connection.';
		case 'auth/email-already-in-use':
			return 'This email address is already registered.';
		case 'auth/invalid-email':
			return 'Please enter a valid email address.';
		case 'auth/weak-password':
			return 'Password is too weak. Please use at least 6 characters.';
		default:
			return fallback;
	}
}

/**
 * Validates sign-up inputs and shows inline errors.
 * @param {SignupFields} fields
 * @returns {boolean}
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
 * @param {SignupFields} fields
 * @returns {boolean}
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
 * @param {SignupFields} fields
 * @returns {boolean}
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
 * @param {SignupFields} fields
 * @returns {boolean}
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
 * @param {SignupFields} fields
 * @returns {boolean}
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
 * @param {SignupFields} fields
 * @returns {boolean}
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
