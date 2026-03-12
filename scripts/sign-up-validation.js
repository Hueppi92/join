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
	clearFieldError(fields.nameInput, fields.nameMessage);
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
	const email = fields.emailInput.value.trim();
	if (!email) {
		setFieldError(fields.emailInput, fields.emailMessage, 'Please enter your email address.');
		return false;
	}
	if (!isEmailValid(email)) {
		setFieldError(fields.emailInput, fields.emailMessage, 'Please enter a valid email address.');
		return false;
	}
	clearFieldError(fields.emailInput, fields.emailMessage);
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
	const password = fields.passwordInput.value.trim();
	if (!password) {
		setFieldError(fields.passwordInput, fields.passwordMessage, 'Please enter a password.');
		return false;
	}
	if (password.length < 6) {
		setFieldError(fields.passwordInput, fields.passwordMessage, 'Password must be at least 6 characters long.');
		return false;
	}
	clearFieldError(fields.passwordInput, fields.passwordMessage);
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
	const password = fields.passwordInput.value.trim();
	const confirmPassword = fields.confirmInput.value.trim();
	if (!confirmPassword) {
		setFieldError(fields.confirmInput, fields.confirmMessage, 'Please confirm your password.');
		return false;
	}
	if (password !== confirmPassword) {
		setFieldError(fields.confirmInput, fields.confirmMessage, 'Passwords do not match.');
		return false;
	}
	clearFieldError(fields.confirmInput, fields.confirmMessage);
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
	clearFieldError(fields.privacyInput, fields.privacyMessage);
	return true;
}
