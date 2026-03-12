/**
 * Resolves the login page path used by the auth guard redirect.
 * @returns {string} Relative path to the login page.
 * @category Auth Guard
 * @subcategory Navigation
 */
function getAuthGuardLoginPath() {
	return '../index.html';
}


/**
 * Checks whether Firebase auth is available in the current runtime.
 * @returns {boolean} True when the Firebase auth API is ready to use.
 * @category Auth Guard
 * @subcategory Validation
 */
function isFirebaseAuthAvailable() {
	return typeof firebase !== 'undefined' && typeof firebase.auth === 'function';
}


/**
 * Determines whether a guest session is currently active.
 * @returns {boolean} True when guest login is enabled in session or local storage.
 * @category Auth Guard
 * @subcategory Session
 */
function isGuestSessionActive() {
	return sessionStorage.getItem('guestLogin') === '1' || localStorage.getItem('guestLogin') === '1';
}


/**
 * Redirects the current page to the login route.
 * @returns {void}
 * @category Auth Guard
 * @subcategory Navigation
 */
function redirectToAuthGuardLogin() {
	window.location.href = getAuthGuardLoginPath();
}


/**
 * Reveals the page after auth guard checks complete.
 * @returns {void}
 * @category Auth Guard
 * @subcategory UI
 */
function releaseAuthGuardVisibility() {
	document.documentElement.classList.remove('auth-check-pending');
}


/**
 * Enforces access control for protected pages.
 * Allows guest sessions, validates Firebase availability,
 * and redirects unauthenticated users to login.
 * @returns {void}
 * @category Auth Guard
 * @subcategory Lifecycle
 */
function enforceAuthGuard() {
	if (isGuestSessionActive()) {
		releaseAuthGuardVisibility();
		return;
	}
	if (!isFirebaseAuthAvailable()) {
		redirectToAuthGuardLogin();
		return;
	}
	firebase.auth().onAuthStateChanged((user) => {
		if (user || isGuestSessionActive()) {
			releaseAuthGuardVisibility();
			return;
		}
		redirectToAuthGuardLogin();
	});
}


enforceAuthGuard();
