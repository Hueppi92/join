/**
 * Runs the splash animation using dynamic measurements.
 * The logo starts centered and moves to the header position.
 */
function runSplashAnimation() {
	const elements = getSplashElements();
	if (!elements) return;

	if (shouldSkipSplash()) {
		clearSkipSplash();
		showFinalSplashState(elements);
		return;
	}

	const endRect = elements.headerLogo.getBoundingClientRect();
	const startScale = getSplashStartScale(endRect.height);
	prepareSplashLogo(elements.splashLogo, startScale);
	setHeaderLogoVisibility(elements.headerLogo, false);

	const delta = getCenterDelta(elements.splashLogo, endRect);
	const logoAnimation = animateSplashLogo(elements.splashLogo, startScale, delta);
	const overlayAnimation = fadeOutOverlay(elements.splashBg, 500, 1000);
	syncAnimationEnd(logoAnimation, overlayAnimation, elements);
}

/**
 * Gets the required splash elements.
 * @returns {{splashLogo: HTMLElement, headerLogo: HTMLElement, splashBg: HTMLElement} | null}
 */
function getSplashElements() {
	const splashLogo = document.querySelector('.login-splash-logo');
	const headerLogo = document.querySelector('.login-logo');
	const splashBg = document.querySelector('.login-splash');
	if (!splashLogo || !headerLogo || !splashBg) return null;

	return { splashLogo, headerLogo, splashBg };
}

/**
 * Prepares the splash logo position and scale.
 * @param {HTMLElement} splashLogo
 * @param {number} startScale
 */
function prepareSplashLogo(splashLogo, startScale) {
	splashLogo.style.left = '50%';
	splashLogo.style.top = '50%';
	splashLogo.style.transform = `translate(-50%, -50%) scale(${startScale})`;
}

/**
 * Computes the delta from splash center to header center.
 * @param {HTMLElement} splashLogo
 * @param {DOMRect} endRect
 * @returns {{x: number, y: number}}
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
 * @param {HTMLElement} splashLogo
 * @param {number} startScale
 * @param {{x: number, y: number}} delta
 * @returns {Animation}
 */
function animateSplashLogo(splashLogo, startScale, delta) {
	return splashLogo.animate(
		[
			{ transform: `translate(-50%, -50%) translate(0px, 0px) scale(${startScale})` },
			{
				transform: `translate(-50%, -50%) translate(${delta.x}px, ${delta.y}px) scale(1)`,
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
 * Calculates the start scale based on the login title and buttons height.
 * @param {number} logoHeight
 * @returns {number}
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
 * Returns whether the splash should be skipped (e.g. coming from sign-up).
 * @returns {boolean}
 */
function shouldSkipSplash() {
	return sessionStorage.getItem('skipSplash') === '1';
}

/**
 * Clears the skip flag to allow next page loads to animate normally.
 */
function clearSkipSplash() {
	sessionStorage.removeItem('skipSplash');
}

/**
 * Shows the final state immediately without animations.
 * @param {HTMLElement} splashLogo
 * @param {HTMLElement} headerLogo
 * @param {HTMLElement} splashBg
 */
function showFinalSplashState({ splashLogo, headerLogo, splashBg }) {
	hideElement(splashLogo);
	hideElement(splashBg);
	setHeaderLogoVisibility(headerLogo, true);
}

/**
 * Finalizes the animation by swapping the logos after animations finish.
 * @param {HTMLElement} splashLogo
 * @param {HTMLElement} headerLogo
 * @param {HTMLElement} splashBg
 */
function finishSplashAnimation({ splashLogo, headerLogo, splashBg }) {
	hideElement(splashBg);
	hideElement(splashLogo);
	setHeaderLogoVisibility(headerLogo, true);
}

/**
 * Fades out the overlay background.
 * @param {HTMLElement} splashBg
 * @param {number} delay
 * @param {number} duration
 * @returns {Animation | null}
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
 * @param {Animation} logoAnimation
 * @param {Animation | null} overlayAnimation
 * @param {{splashLogo: HTMLElement, headerLogo: HTMLElement, splashBg: HTMLElement}} elements
 */
function syncAnimationEnd(logoAnimation, overlayAnimation, elements) {
	const overlayFinished = overlayAnimation ? overlayAnimation.finished : Promise.resolve();
	Promise.all([logoAnimation.finished, overlayFinished]).then(() => finishSplashAnimation(elements));
}

/**
 * Hides an element if it exists.
 * @param {HTMLElement} element
 */
function hideElement(element) {
	if (!element) return;
	element.style.display = 'none';
}

/**
 * Sets header logo visibility.
 * @param {HTMLElement} headerLogo
 * @param {boolean} isVisible
 */
function setHeaderLogoVisibility(headerLogo, isVisible) {
	if (!headerLogo) return;
	headerLogo.style.opacity = isVisible ? '1' : '0';
}

/**
 * Wires the guest login button to open the summary page.
 */
function initGuestLogin() {
	const guestButton = document.querySelector('.guest-login');
	if (!guestButton) return;

	guestButton.addEventListener('click', handleGuestLogin);
}

/**
 * Navigates to the summary page for guest access.
 */
function handleGuestLogin() {
	window.location.href = './sites/summary.html';
}

document.addEventListener('DOMContentLoaded', () => {
	runSplashAnimation();
	initGuestLogin();
});