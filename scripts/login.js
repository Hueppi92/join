/**
 * @typedef {Object} LoginFields
 * @property {HTMLFormElement} form - The login form element.
 * @property {HTMLInputElement} emailInput - The email input field.
 * @property {HTMLInputElement} passwordInput - The password input field.
 * @property {HTMLButtonElement} submitButton - The submit button.
 * @property {HTMLElement} message - The login error message element.
 */

/**
 * Runs the splash animation using dynamic measurements.
 * The logo starts centered and moves to the header position.
 * @category Login
 * @subcategory UI & Init
 */
function runSplashAnimation() {
	const elements = getSplashElements();
	if (!elements) return;
	setSplashTheme(elements);

	if (shouldSkipSplash()) {
		clearSkipSplash();
		showFinalSplashState(elements);
		return;
	}

	const endRect = elements.headerLogo.getBoundingClientRect();
	const startScale = getResponsiveSplashStartScale(getSplashStartScale(endRect.height));
	prepareSplashLogo(elements.splashLogo, startScale);
	prepareSplashLogo(elements.splashLogoEnd, startScale);
	setHeaderLogoVisibility(elements.headerLogo, false);

	const delta = getCenterDelta(elements.splashLogo, endRect);
	const endScale = getSplashEndScale(elements.splashLogo, endRect);
	const logoAnimation = animateSplashLogo(elements.splashLogo, startScale, endScale, delta, 1, 0.2);
	const endLogoAnimation = animateSplashLogo(elements.splashLogoEnd, startScale, endScale, delta, 0, 1);
	const overlayAnimation = fadeOutOverlay(elements.splashBg, 500, 1000);
	syncAnimationEnd([logoAnimation, endLogoAnimation], overlayAnimation, elements);
}

/**
 * Applies device-specific splash logo variant.
 * @param {{splashLogo: HTMLElement, splashLogoEnd: HTMLElement}} elements - Splash logo elements.
 * @category Login
 * @subcategory UI & Init
 */
function setSplashTheme({ splashLogo, splashLogoEnd }) {
	if (!splashLogo || !splashLogoEnd || !('src' in splashLogo) || !('src' in splashLogoEnd)) return;
	const isMobile = window.matchMedia('(max-width: 768px)').matches;
	splashLogo.src = isMobile ? './assets/img/join_logo.svg' : './assets/img/join_logo_dark.svg';
	splashLogoEnd.src = './assets/img/join_logo_dark.svg';
}

/**
 * Gets the required splash elements.
 * @returns {{splashLogo: HTMLElement, splashLogoEnd: HTMLElement, headerLogo: HTMLElement, splashBg: HTMLElement} | null} Required splash elements or null if missing.
 * @category Login
 * @subcategory UI & Init
 */
function getSplashElements() {
	const splashLogo = document.querySelector('.login-splash-logo');
	const splashLogoEnd = document.querySelector('.login-splash-logo-end');
	const headerLogo = document.querySelector('.login-logo');
	const splashBg = document.querySelector('.login-splash');
	if (!splashLogo || !splashLogoEnd || !headerLogo || !splashBg) return null;

	return { splashLogo, splashLogoEnd, headerLogo, splashBg };
}

/**
 * Prepares the splash logo position and scale.
 * @param {HTMLElement} splashLogo - The splash logo element.
 * @param {number} startScale - The initial scale for the splash logo.
 * @category Login
 * @subcategory UI & Init
 */
function prepareSplashLogo(splashLogo, startScale) {
	splashLogo.style.left = '50%';
	splashLogo.style.top = '50%';
	splashLogo.style.transform = `translate(-50%, -50%) scale(${startScale})`;
}

/**
 * Computes the delta from splash center to header center.
 * @param {HTMLElement} splashLogo - The splash logo element.
 * @param {DOMRect} endRect - The target header logo bounds.
 * @returns {{x: number, y: number}} Delta offsets to reach the header logo.
 * @category Login
 * @subcategory UI & Init
 */
function getCenterDelta(splashLogo, endRect) {
	const startRect = splashLogo.getBoundingClientRect();
	const startCenterX = startRect.left + startRect.width / 2;
	const startCenterY = startRect.top + startRect.height / 2;
	const endCenterX = endRect.left + endRect.width / 2;
	const endCenterY = endRect.top + endRect.height / 2;

	return { x: endCenterX - startCenterX, y: endCenterY - startCenterY };
}

/**
 * Animates the splash logo toward the header logo.
 * @param {HTMLElement} splashLogo - The splash logo element.
 * @param {number} startScale - The initial scale for the splash logo.
 * @param {{x: number, y: number}} delta - Delta offsets to reach the header logo.
 * @param {number} endScale - Target scale at animation end.
 * @param {number} fromOpacity - Start opacity.
 * @param {number} toOpacity - End opacity.
 * @returns {Animation} The animation instance for the logo.
 * @category Login
 * @subcategory UI & Init
 */
function animateSplashLogo(splashLogo, startScale, endScale, delta, fromOpacity = 1, toOpacity = 1) {
	return splashLogo.animate(
		[
			{
				transform: `translate(-50%, -50%) translate(0px, 0px) scale(${startScale})`,
				opacity: fromOpacity,
			},
			{
				transform: `translate(-50%, -50%) translate(${delta.x}px, ${delta.y}px) scale(${endScale})`,
				opacity: toOpacity,
			},
		],
		{
			duration: 500,
			easing: 'ease-in-out',
			delay: 500,
			fill: 'forwards',
		}
	);
}

/**
 * Calculates the exact end scale so splash logo matches header logo size.
 * @param {HTMLElement} splashLogo - The splash logo element.
 * @param {DOMRect} endRect - The target header logo bounds.
 * @returns {number} Target end scale.
 * @category Login
 * @subcategory UI & Init
 */
function getSplashEndScale(splashLogo, endRect) {
	if (!splashLogo || !endRect || endRect.height <= 0) return 1;
	const baseHeight = splashLogo.offsetHeight;
	if (!baseHeight) return 1;

	return endRect.height / baseHeight;
}

/**
 * Calculates the start scale based on the login title and buttons height.
 * @param {number} logoHeight - Height of the splash logo.
 * @returns {number} Calculated start scale.
 * @category Login
 * @subcategory UI & Init
 */
function getSplashStartScale(logoHeight) {
	const title = document.querySelector('#login-title');
	const actions = document.querySelector('.login-actions');
	if (!title || !actions || !logoHeight) return 1;

	const titleRect = title.getBoundingClientRect();
	const actionsRect = actions.getBoundingClientRect();
	const targetHeight = actionsRect.bottom - titleRect.top;
	if (targetHeight <= 0) return 1;

	return Math.max(1, targetHeight / logoHeight);
}

/**
 * Applies responsive tuning to the splash start scale.
 * Keeps desktop behavior unchanged and reduces mobile start size slightly.
 * @param {number} baseScale - The dynamic base start scale.
 * @returns {number} Responsive start scale.
 * @category Login
 * @subcategory UI & Init
 */
function getResponsiveSplashStartScale(baseScale) {
	if (!baseScale) return 1;
	const isMobile = window.matchMedia('(max-width: 768px)').matches;
	if (!isMobile) return baseScale;

	const mobileFactor = 0.75;
	return Math.max(1, baseScale * mobileFactor);
}

/**
 * Returns whether the splash should be skipped (e.g. coming from sign-up).
 * @returns {boolean} True if the splash should be skipped.
 * @category Login
 * @subcategory UI & Init
 */
function shouldSkipSplash() {
	return sessionStorage.getItem('skipSplash') === '1';
}

/**
 * Clears the skip flag to allow next page loads to animate normally.
 * @category Login
 * @subcategory UI & Init
 */
function clearSkipSplash() {
	sessionStorage.removeItem('skipSplash');
}

/**
 * Shows the final state immediately without animations.
 * @param {HTMLElement} splashLogo - The splash logo element.
 * @param {HTMLElement} splashLogoEnd - The end-color splash logo element.
 * @param {HTMLElement} headerLogo - The header logo element.
 * @param {HTMLElement} splashBg - The splash background element.
 * @category Login
 * @subcategory UI & Init
 */
function showFinalSplashState({ splashLogo, splashLogoEnd, headerLogo, splashBg }) {
	hideElement(splashLogo);
	hideElement(splashLogoEnd);
	hideElement(splashBg);
	setHeaderLogoVisibility(headerLogo, true);
}

/**
 * Finalizes the animation by swapping the logos after animations finish.
 * @param {HTMLElement} splashLogo - The splash logo element.
 * @param {HTMLElement} splashLogoEnd - The end-color splash logo element.
 * @param {HTMLElement} headerLogo - The header logo element.
 * @param {HTMLElement} splashBg - The splash background element.
 * @category Login
 * @subcategory UI & Init
 */
function finishSplashAnimation({ splashLogo, splashLogoEnd, headerLogo, splashBg }) {
	hideElement(splashBg);
	hideElement(splashLogo);
	hideElement(splashLogoEnd);
	setHeaderLogoVisibility(headerLogo, true);
}

/**
 * Fades out the overlay background.
 * @param {HTMLElement} splashBg - The splash background element.
 * @param {number} delay - Delay before fading starts.
 * @param {number} duration - Fade duration in milliseconds.
 * @returns {Animation | null} The animation instance or null if missing.
 * @category Login
 * @subcategory UI & Init
 */
function fadeOutOverlay(splashBg, delay = 0, duration = 1000) {
	if (!splashBg) return null;

	return splashBg.animate([{ opacity: 1 }, { opacity: 0 }], {
		duration,
		delay,
		fill: 'forwards',
	});
}

/**
 * Waits for both animations to finish before finalizing the splash.
 * @param {Animation[]} logoAnimations - Splash logo animations.
 * @param {Animation | null} overlayAnimation - The overlay fade animation.
 * @param {{splashLogo: HTMLElement, splashLogoEnd: HTMLElement, headerLogo: HTMLElement, splashBg: HTMLElement}} elements - Required splash elements.
 * @category Login
 * @subcategory UI & Init
 */
function syncAnimationEnd(logoAnimations, overlayAnimation, elements) {
	const overlayFinished = overlayAnimation ? overlayAnimation.finished : Promise.resolve();
	const logoFinished = (logoAnimations || []).filter(Boolean).map((animation) => animation.finished);
	Promise.all([...logoFinished, overlayFinished]).then(() => finishSplashAnimation(elements));
}

/**
 * Hides an element if it exists.
 * @param {HTMLElement} element - The element to hide.
 * @category Login
 * @subcategory UI & Init
 */
function hideElement(element) {
	if (!element) return;
	element.style.display = 'none';
}

/**
 * Sets header logo visibility.
 * @param {HTMLElement} headerLogo - The header logo element.
 * @param {boolean} isVisible - Whether the header logo should be visible.
 * @category Login
 * @subcategory UI & Init
 */
function setHeaderLogoVisibility(headerLogo, isVisible) {
	if (!headerLogo) return;
	headerLogo.style.opacity = isVisible ? '1' : '0';
}


/**
 * Initializes Firebase login handling for the login form.
 * @category Login
 * @subcategory UI & Init
 */
function initLoginForm() {
	const form = document.querySelector('.login-form');
	if (!form) return;

	const fields = getLoginFields(form);
	if (!fields) return;

	bindLoginFieldEvents(fields);
	form.addEventListener('submit', (event) => handleLoginSubmit(event, fields));
}

/**
 * Collects login form fields.
 * @param {HTMLFormElement} form - The login form element.
 * @returns {LoginFields | null} Collected form fields or null if missing.
 * @category Login
 * @subcategory UI & Init
 */
function getLoginFields(form) {
	const emailInput = form.querySelector('input[name="email"]');
	const passwordInput = form.querySelector('input[name="password"]');
	const submitButton = form.querySelector('button[type="submit"]');
	const message = document.getElementById('login-error-message');
	if (!emailInput || !passwordInput || !submitButton || !message) return null;

	return { form, emailInput, passwordInput, submitButton, message };
}

/**
 * Binds events to update login form button state.
 * @param {LoginFields} fields - Collected login form fields.
 * @category Login
 * @subcategory UI & Init
 */
function bindLoginFieldEvents(fields) {
	const updateState = () => updateLoginButtonState(fields);
	fields.emailInput.addEventListener('input', () => {
		setLoginFieldErrorState(fields, false);
		setFormMessage(fields.message, '');
		updateState();
	});
	fields.passwordInput.addEventListener('input', () => {
		setLoginFieldErrorState(fields, false);
		setFormMessage(fields.message, '');
		updateState();
	});
	updateLoginButtonState(fields);
}

/**
 * Enables/disables the login button based on form validity.
 * @param {LoginFields} fields - Collected login form fields.
 * @category Login
 * @subcategory UI & Init
 */
function updateLoginButtonState(fields) {
	const isValid = isLoginInputValid(fields);
	const isLoading = fields.submitButton.dataset.loading === '1';
	fields.submitButton.disabled = isLoading || !isValid;
}

/**
 * Validates login inputs.
 * @param {LoginFields} fields - Collected login form fields.
 * @returns {boolean} True if the login inputs are valid.
 * @category Login
 * @subcategory Validation
 */
function isLoginInputValid(fields) {
	return isEmailValid(fields.emailInput.value) && fields.passwordInput.value.trim().length > 0;
}


/**
 * Handles Firebase login submission.
 * @param {SubmitEvent} event - The form submit event.
 * @param {LoginFields} fields - Collected login form fields.
 * @category Login
 * @subcategory Firebase Logic
 */
async function handleLoginSubmit(event, fields) {
	event.preventDefault();
	setFormMessage(fields.message, '');

	if (!isLoginInputValid(fields)) {
		setFormMessage(fields.message, 'Please enter valid credentials.');
		setLoginFieldErrorState(fields, true);
		return;
	}

	setLoadingState(fields, true);
	try {
		const credential = await firebase.auth().signInWithEmailAndPassword(
			fields.emailInput.value.trim(),
			fields.passwordInput.value
		);
		sessionStorage.setItem('userId', credential.user.uid);
		sessionStorage.removeItem('guestLogin');
		sessionStorage.setItem('skipSplash', '1');
		window.location.href = './sites/summary.html';
	} catch (error) {
		setFormMessage(fields.message, getAuthErrorMessage(error));
		setLoginFieldErrorState(fields, true);
	} finally {
		setLoadingState(fields, false);
	}
}

/**
 * Sets error state on login inputs.
 * @param {LoginFields} fields - Collected login form fields.
 * @param {boolean} hasError - Whether inputs should be marked as invalid.
 * @category Login
 * @subcategory UI & Init
 */
function setLoginFieldErrorState(fields, hasError) {
	fields.emailInput.classList.toggle('input-error', hasError);
	fields.passwordInput.classList.toggle('input-error', hasError);
}

/**
 * Sets the loading state for the login form.
 * @param {LoginFields} fields - Collected login form fields.
 * @param {boolean} isLoading - Whether the submit action is in progress.
 * @category Login
 * @subcategory UI & Init
 */
function setLoadingState(fields, isLoading) {
	fields.submitButton.dataset.loading = isLoading ? '1' : '0';
	updateLoginButtonState(fields);
}

/**
 * Updates the form message.
 * @param {HTMLElement} message - Message element to update.
 * @param {string} text - Message content to display.
 * @category Login
 * @subcategory UI & Init
 */
function setFormMessage(message, text) {
	message.textContent = text;
	message.classList.toggle('is-hidden', !text);
}

/**
 * Maps Firebase auth errors to readable messages.
 * @param {unknown} error - Firebase auth error.
 * @returns {string} User-facing error message.
 * @category Login
 * @subcategory Firebase Logic
 */
function getAuthErrorMessage(error) {
	const fallback = 'Login failed. Please try again.';
	if (!error || typeof error !== 'object' || !('code' in error)) return fallback;

	switch (error.code) {
		case 'auth/invalid-credential':
		case 'auth/invalid-login-credentials':
			return 'Check your email and password. Please try again.';
		case 'auth/invalid-email':
			return 'Please enter a valid email address.';
		case 'auth/user-not-found':
		case 'auth/wrong-password':
			return 'Check your email and password. Please try again.';
		case 'auth/user-disabled':
			return 'This user is disabled.';
		case 'auth/too-many-requests':
			return 'Too many attempts. Please try again later.';
		default:
			return fallback;
	}
}

/**
 * Wires the guest login button to open the summary page.
 * @category Login
 * @subcategory UI & Init
 */
function initGuestLogin() {
	const guestButton = document.querySelector('.guest-login');
	if (!guestButton) return;

	guestButton.addEventListener('click', handleGuestLogin);
}

/**
 * Navigates to the summary page for guest access.
 * @category Login
 * @subcategory UI & Init
 */
function handleGuestLogin() {
	sessionStorage.setItem('guestLogin', '1');
	sessionStorage.removeItem('userId');
	window.location.href = './sites/summary.html';
}

document.addEventListener('DOMContentLoaded', () => {
	runSplashAnimation();
	initGuestLogin();
	initLoginForm();
	initPasswordToggles();
});