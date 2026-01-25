/**
 * Redirects unauthenticated users away from protected pages.
 */
(function enforceAuthGuard() {
	const loginPath = '../index.html';
	const hasFirebase = typeof firebase !== 'undefined' && typeof firebase.auth === 'function';

	if (!hasFirebase) {
		window.location.href = loginPath;
		return;
	}

	const isGuest = () => sessionStorage.getItem('guestLogin') === '1';

	firebase.auth().onAuthStateChanged((user) => {
		if (user || isGuest()) return;
		window.location.href = loginPath;
	});
})();
