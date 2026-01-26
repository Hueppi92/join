/**
 * Sets a flag to skip the splash animation when returning to the login page.
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
 * Enables password visibility toggles.
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

/**
 * Collects sign-up form fields.
 * @param {HTMLFormElement} form
 * @returns {{form: HTMLFormElement, nameInput: HTMLInputElement, emailInput: HTMLInputElement, passwordInput: HTMLInputElement, confirmInput: HTMLInputElement, privacyInput: HTMLInputElement, submitButton: HTMLButtonElement, message: HTMLElement} | null}
 */
function getSignupFields(form) {
	const nameInput = form.querySelector('input[name="name"]');
	const emailInput = form.querySelector('input[name="email"]');
	const passwordInput = form.querySelector('input[name="password"]');
	const confirmInput = form.querySelector('input[name="confirmPassword"]');
	const privacyInput = form.querySelector('input[name="privacy"]');
	const submitButton = form.querySelector('button[type="submit"]');
	if (!nameInput || !emailInput || !passwordInput || !confirmInput || !privacyInput || !submitButton) return null;

	return {
		form,
		nameInput,
		emailInput,
		passwordInput,
		confirmInput,
		privacyInput,
		submitButton,
		nameMessage: ensureFieldMessage(nameInput),
		emailMessage: ensureFieldMessage(emailInput),
		passwordMessage: ensureFieldMessage(passwordInput),
		confirmMessage: ensureFieldMessage(confirmInput),
	};
}

/**
 * Ensures an input has a field message element.
 * @param {HTMLInputElement} input
 * @returns {HTMLElement}
 */
function ensureFieldMessage(input) {
	const wrapper = input.closest('.input-field');
	if (!wrapper) return document.createElement('p');

	let message = wrapper.querySelector('.field-message');
	if (message) return message;

	message = document.createElement('p');
	message.className = 'field-message';
	message.setAttribute('role', 'alert');
	message.style.display = 'none';
	wrapper.appendChild(message);
	return message;
}

/**
 * Binds events to update sign-up form button state.
 * @param {ReturnType<typeof getSignupFields>} fields
 */
function bindSignupFieldEvents(fields) {
	const updateState = () => updateSignupButtonState(fields);
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
	fields.nameInput.addEventListener('blur', () => validateSignupFields(fields));
	fields.emailInput.addEventListener('blur', () => validateSignupFields(fields));
	fields.passwordInput.addEventListener('blur', () => validateSignupFields(fields));
	fields.confirmInput.addEventListener('blur', () => validateSignupFields(fields));
	fields.privacyInput.addEventListener('change', () => {
		validateSignupFields(fields);
		updateState();
	});
	updateSignupButtonState(fields);
}

/**
 * Enables/disables the sign-up button based on form validity.
 * @param {ReturnType<typeof getSignupFields>} fields
 */
function updateSignupButtonState(fields) {
	const isValid = isSignupInputValid(fields);
	const isLoading = fields.submitButton.dataset.loading === '1';
	fields.submitButton.disabled = isLoading || !isValid;
}

/**
 * Validates sign-up inputs.
 * @param {ReturnType<typeof getSignupFields>} fields
 * @returns {boolean}
 */
function isSignupInputValid(fields) {
	return (
		fields.nameInput.value.trim().length > 0 &&
		isEmailValid(fields.emailInput.value) &&
		fields.passwordInput.value.trim().length >= 6 &&
		fields.passwordInput.value === fields.confirmInput.value &&
		fields.privacyInput.checked
	);
}

/**
 * Validates email address format.
 * @param {string} value
 * @returns {boolean}
 */
function isEmailValid(value) {
	return /^\S+@\S+\.\S+$/.test(value.trim());
}

/**
 * Handles Firebase sign-up submission.
 * @param {SubmitEvent} event
 * @param {ReturnType<typeof getSignupFields>} fields
 */
async function handleSignupSubmit(event, fields) {
	event.preventDefault();
	clearFieldError(fields.nameInput, fields.nameMessage);
	clearFieldError(fields.emailInput, fields.emailMessage);
	clearFieldError(fields.passwordInput, fields.passwordMessage);
	clearFieldError(fields.confirmInput, fields.confirmMessage);
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
		window.location.href = './summary.html';
	} catch (error) {
		setFieldError(fields.emailInput, fields.emailMessage, getAuthErrorMessage(error));
	} finally {
		setLoadingState(fields, false);
	}
}

/**
 * Sets the loading state for the sign-up form.
 * @param {ReturnType<typeof getSignupFields>} fields
 * @param {boolean} isLoading
 */
function setLoadingState(fields, isLoading) {
	fields.submitButton.dataset.loading = isLoading ? '1' : '0';
	updateSignupButtonState(fields);
}

/**
 * Maps Firebase auth errors to readable messages.
 * @param {unknown} error
 * @returns {string}
 */
function getAuthErrorMessage(error) {
	const fallback = 'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
	if (!error || typeof error !== 'object' || !('code' in error)) return fallback;

	switch (error.code) {
		case 'auth/operation-not-allowed':
			return 'E-Mail/Passwort-Login ist in Firebase noch nicht aktiviert.';
		case 'auth/network-request-failed':
			return 'Netzwerkfehler. Bitte Verbindung prüfen.';
		case 'auth/email-already-in-use':
			return 'Diese E-Mail-Adresse ist bereits registriert.';
		case 'auth/invalid-email':
			return 'Bitte eine gültige E-Mail-Adresse eingeben.';
		case 'auth/weak-password':
			return 'Das Passwort ist zu schwach. Bitte mindestens 6 Zeichen verwenden.';
		default:
			return fallback;
	}
}

/**
 * Validates sign-up inputs and shows inline errors.
 * @param {ReturnType<typeof getSignupFields>} fields
 * @returns {boolean}
 */
function validateSignupFields(fields) {
	let isValid = true;
	if (!fields.nameInput.value.trim()) {
		setFieldError(fields.nameInput, fields.nameMessage, 'Bitte einen Namen eingeben.');
		isValid = false;
	}
	if (!isEmailValid(fields.emailInput.value)) {
		setFieldError(fields.emailInput, fields.emailMessage, 'Bitte eine gültige E-Mail-Adresse eingeben.');
		isValid = false;
	}
	if (fields.passwordInput.value.trim().length < 6) {
		setFieldError(fields.passwordInput, fields.passwordMessage, 'Passwort muss mindestens 6 Zeichen haben.');
		isValid = false;
	}
	if (fields.passwordInput.value !== fields.confirmInput.value) {
		setFieldError(fields.confirmInput, fields.confirmMessage, 'Die Passwörter stimmen nicht überein.');
		isValid = false;
	}
	if (!fields.privacyInput.checked) {
		setFieldError(fields.confirmInput, fields.confirmMessage, 'Bitte die Datenschutzerklärung akzeptieren.');
		isValid = false;
	}
	return isValid;
}

/**
 * Sets the error state for a field.
 * @param {HTMLInputElement} input
 * @param {HTMLElement} message
 * @param {string} text
 */
function setFieldError(input, message, text) {
	input.classList.add('input-error');
	message.textContent = text;
	message.style.display = 'block';
}

/**
 * Clears the error state for a field.
 * @param {HTMLInputElement} input
 * @param {HTMLElement} message
 */
function clearFieldError(input, message) {
	input.classList.remove('input-error');
	message.textContent = '';
	message.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
	initSignupBackButton();
	initSignupForm();
	initPasswordToggles();
});
