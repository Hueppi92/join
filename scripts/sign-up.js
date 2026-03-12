/**
 * @typedef {Object} SignupFields
 * @property {HTMLFormElement} form - The sign-up form element.
 * @property {HTMLInputElement} nameInput - The name input field.
 * @property {HTMLInputElement} emailInput - The email input field.
 * @property {HTMLInputElement} passwordInput - The password input field.
 * @property {HTMLInputElement} confirmInput - The confirm password input field.
 * @property {HTMLInputElement} privacyInput - The privacy consent checkbox.
 * @property {HTMLButtonElement} submitButton - The submit button.
 * @property {HTMLElement} nameMessage - The inline name error message element.
 * @property {HTMLElement} emailMessage - The inline email error message element.
 * @property {HTMLElement} passwordMessage - The inline password error message element.
 * @property {HTMLElement} confirmMessage - The inline confirm password error message element.
 * @property {HTMLElement} privacyMessage - The inline privacy error message element.
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


/**
 * Wraps sign-up submission with loading-state handling.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @returns {Promise<void>} Resolves when submission flow finishes.
 * @category Sign-Up
 * @subcategory Firebase Logic
 */
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


document.addEventListener('DOMContentLoaded', () => {
	initSignupBackButton();
	initSignupForm();
	initPasswordToggles();
});
