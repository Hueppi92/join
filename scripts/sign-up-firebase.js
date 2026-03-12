/**
 * Builds user data for persistence after successful sign-up.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @param {string} userId - Firebase user id.
 * @returns {{displayName: string, userId: string, email: string, color: string, createdAt: number}} Persistable user payload.
 * @category Sign-Up
 * @subcategory Firebase Logic
 */
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


/**
 * Persists a newly created user profile in Firebase auth and database.
 * @param {{user: {uid: string, updateProfile: (profile: {displayName: string}) => Promise<void>}}} credential - Firebase auth credential.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @returns {Promise<void>} Resolves after profile persistence completes.
 * @category Sign-Up
 * @subcategory Firebase Logic
 */
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
 * Performs Firebase account creation and post-signup redirects.
 * @param {SignupFields} fields - Collected sign-up form fields.
 * @returns {Promise<void>} Resolves after signup side effects complete.
 * @category Sign-Up
 * @subcategory Firebase Logic
 */
async function performSignup(fields) {
	const credential = await firebase.auth().createUserWithEmailAndPassword(
		fields.emailInput.value.trim(),
		fields.passwordInput.value.trim()
	);
	await persistSignupUser(credential, fields);
	sessionStorage.removeItem('guestLogin');
	localStorage.removeItem('guestLogin');
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


/**
 * Starts the success message animation in the overlay.
 * @param {HTMLElement} overlay - Success overlay element.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function animateSignupSuccessMessage(overlay) {
	const message = overlay.querySelector('.success-message');
	if (message) message.classList.add('slide-in-bottom');
}


/**
 * Redirects back to login while keeping splash animation disabled once.
 * @category Sign-Up
 * @subcategory UI & Init
 */
function redirectToLoginWithSplashSkip() {
	sessionStorage.setItem('skipSplash', '1');
	window.location.href = '../index.html';
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


/**
 * Returns the auth error code to message map for sign-up.
 * @returns {Record<string, string>} Sign-up auth error messages.
 * @category Sign-Up
 * @subcategory Firebase Logic
 */
function getSignupAuthErrorMessages() {
	return {
		'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase yet.',
		'auth/network-request-failed': 'Network error. Please check your connection.',
		'auth/email-already-in-use': 'This email address is already registered.',
		'auth/invalid-email': 'Please enter a valid email address.',
		'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
	};
}
