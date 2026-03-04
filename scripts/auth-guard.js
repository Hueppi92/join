function getAuthGuardLoginPath() {
	return '../index.html';
}


function isFirebaseAuthAvailable() {
	return typeof firebase !== 'undefined' && typeof firebase.auth === 'function';
}


function isGuestSessionActive() {
	return sessionStorage.getItem('guestLogin') === '1' || localStorage.getItem('guestLogin') === '1';
}


function redirectToAuthGuardLogin() {
	window.location.href = getAuthGuardLoginPath();
}


function releaseAuthGuardVisibility() {
	document.documentElement.classList.remove('auth-check-pending');
}


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
