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
 * Ensures guest sessions also have a Firebase auth session.
 * @returns {Promise<void>} Resolves when anonymous auth is ready.
 * @category Auth Guard
 * @subcategory Firebase Logic
 */
async function ensureGuestFirebaseSession() {
	const currentUser = firebase.auth().currentUser;
	if (currentUser?.isAnonymous) return;
	await firebase.auth().signInAnonymously();
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
	if (!isFirebaseAuthAvailable()) {
		redirectToAuthGuardLogin();
		return;
	}
	firebase.auth().onAuthStateChanged(async (user) => {
		if (isGuestSessionActive()) {
			try {
				if (!user?.isAnonymous) {
					await ensureGuestFirebaseSession();
				}
				releaseAuthGuardVisibility();
				return;
			} catch (error) {
				console.warn('Guest auth bootstrap failed. Continuing guest session without Firebase auth.', error);
				releaseAuthGuardVisibility();
				return;
			}
		}
		if (user) {
			releaseAuthGuardVisibility();
			return;
		}
		redirectToAuthGuardLogin();
	});
}


enforceAuthGuard();
