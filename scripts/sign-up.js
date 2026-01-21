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

document.addEventListener('DOMContentLoaded', initSignupBackButton);
