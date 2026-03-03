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


function enforceAuthGuard() {
	if (!isFirebaseAuthAvailable()) {
		redirectToAuthGuardLogin();
		return;
	}
	firebase.auth().onAuthStateChanged((user) => {
		if (user || isGuestSessionActive()) return;
		redirectToAuthGuardLogin();
	});
}


enforceAuthGuard();
