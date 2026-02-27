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
	if (handleSkippedSplash(elements)) return;
	playSplashAnimation(elements);
}


function handleSkippedSplash(elements) {
	if (!shouldSkipSplash()) return false;
	clearSkipSplash();
	showFinalSplashState(elements);
	return true;
}


function playSplashAnimation(elements) {
	const context = getSplashAnimationContext(elements);
	const animations = startSplashLogoAnimations(elements, context);
	const overlayAnimation = fadeOutOverlay(elements.splashBg, 500, 1000);
	syncAnimationEnd(animations, overlayAnimation, elements);
}


function getSplashAnimationContext(elements) {
	const endRect = elements.headerLogo.getBoundingClientRect();
	const startScale = getResponsiveSplashStartScale(getSplashStartScale(endRect.height));
	prepareSplashElementsForAnimation(elements, startScale);
	const delta = getCenterDelta(elements.splashLogo, endRect);
	const endScale = getSplashEndScale(elements.splashLogo, endRect);
	return { delta, endScale, startScale };
}


function prepareSplashElementsForAnimation(elements, startScale) {
	prepareSplashLogo(elements.splashLogo, startScale);
	prepareSplashLogo(elements.splashLogoEnd, startScale);
	setHeaderLogoVisibility(elements.headerLogo, false);
}


function startSplashLogoAnimations(elements, context) {
	const logoAnimation = animateSplashLogo(elements.splashLogo, context.startScale, context.endScale, context.delta, 1, 0.2);
	const endLogoAnimation = animateSplashLogo(elements.splashLogoEnd, context.startScale, context.endScale, context.delta, 0, 1);
	return [logoAnimation, endLogoAnimation];
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
	const keyframes = buildSplashAnimationKeyframes(startScale, endScale, delta, fromOpacity, toOpacity);
	return splashLogo.animate(keyframes, getSplashAnimationOptions());
}


function buildSplashAnimationKeyframes(startScale, endScale, delta, fromOpacity, toOpacity) {
	return [
		{
			transform: `translate(-50%, -50%) translate(0px, 0px) scale(${startScale})`,
			opacity: fromOpacity,
		},
		{
			transform: `translate(-50%, -50%) translate(${delta.x}px, ${delta.y}px) scale(${endScale})`,
			opacity: toOpacity,
		},
	];
}


function getSplashAnimationOptions() {
	return {
		duration: 500,
		easing: 'ease-in-out',
		delay: 500,
		fill: 'forwards',
	};
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


document.addEventListener('DOMContentLoaded', () => {
	runSplashAnimation();
});