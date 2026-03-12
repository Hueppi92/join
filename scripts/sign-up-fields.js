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


/**
 * Combines all sign-up input and message elements.
 * @param {HTMLFormElement} form - The sign-up form element.
 * @returns {Omit<SignupFields, 'form'>} Collected sign-up fields.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function collectSignupFields(form) {
	const inputFields = collectSignupInputFields(form);
	const messageFields = collectSignupMessageFields(form);
	return { ...inputFields, ...messageFields };
}


/**
 * Collects sign-up input elements.
 * @param {HTMLFormElement} form - The sign-up form element.
 * @returns {{nameInput: HTMLInputElement | null, emailInput: HTMLInputElement | null, passwordInput: HTMLInputElement | null, confirmInput: HTMLInputElement | null, privacyInput: HTMLInputElement | null, submitButton: HTMLButtonElement | null}} Input element map.
 * @category Sign-Up
 * @subcategory UI & Init
 */
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


/**
 * Collects sign-up message elements.
 * @param {HTMLFormElement} form - The sign-up form element.
 * @returns {{nameMessage: HTMLElement | null, emailMessage: HTMLElement | null, passwordMessage: HTMLElement | null, confirmMessage: HTMLElement | null, privacyMessage: HTMLElement | null}} Message element map.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function collectSignupMessageFields(form) {
	return {
		nameMessage: form.querySelector('#msg-name'),
		emailMessage: form.querySelector('#msg-email'),
		passwordMessage: form.querySelector('#msg-password'),
		confirmMessage: form.querySelector('#msg-confirmPassword'),
		privacyMessage: form.querySelector('#msg-privacy'),
	};
}


/**
 * Checks whether required sign-up nodes are missing.
 * @param {Record<string, HTMLElement | HTMLInputElement | HTMLButtonElement | null>} fields - Collected field map.
 * @returns {boolean} True when at least one required element is missing.
 * @category Sign-Up
 * @subcategory Validation
 */
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


/**
 * Binds input handling for one sign-up field.
 * @param {HTMLInputElement} input - Input element to bind.
 * @param {HTMLElement} message - Matching validation message element.
 * @param {() => void} updateState - Callback to refresh submit state.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function bindSignupInputField(input, message, updateState) {
	input.addEventListener('input', () => {
		clearFieldError(input, message);
		updateState();
	});
}


/**
 * Binds blur validation for one sign-up input.
 * @param {HTMLInputElement} input - Input element to validate on blur.
 * @param {(fields: SignupFields) => boolean} validateField - Field validator.
 * @param {SignupFields} fields - Full sign-up field set.
 * @param {() => void} updateState - Callback to refresh submit state.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function bindSignupBlurField(input, validateField, fields, updateState) {
	input.addEventListener('blur', () => {
		validateField(fields);
		updateState();
	});
}


/**
 * Binds privacy checkbox behavior and button state updates.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @param {() => void} updateState - Callback to refresh submit state.
 * @category Sign-Up
 * @subcategory UI & Init
 */
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
	bindSignupBlurField(fields.nameInput, validateNameField, fields, updateState);
	bindSignupBlurField(fields.emailInput, validateEmailField, fields, updateState);
	bindSignupBlurField(fields.passwordInput, validatePasswordField, fields, updateState);
	bindSignupBlurField(fields.confirmInput, validateConfirmField, fields, updateState);
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
	const name = fields.nameInput.value.trim();
	const email = fields.emailInput.value.trim();
	const password = fields.passwordInput.value.trim();
	const confirmPassword = fields.confirmInput.value.trim();

	return (
		name.length > 0 &&
		isEmailValid(email) &&
		password.length >= 6 &&
		password === confirmPassword
	);
}


/**
 * Clears all inline sign-up validation errors.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @category Sign-Up
 * @subcategory Validation
 */
function clearSignupFieldErrors(fields) {
	clearFieldError(fields.nameInput, fields.nameMessage);
	clearFieldError(fields.emailInput, fields.emailMessage);
	clearFieldError(fields.passwordInput, fields.passwordMessage);
	clearFieldError(fields.confirmInput, fields.confirmMessage);
	clearFieldError(fields.privacyInput, fields.privacyMessage);
}
