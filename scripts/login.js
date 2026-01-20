/**
 * Runs the intro splash animation using dynamic layout measurements.
 * Keeps the final logo position accurate on all screen sizes.
 */
function runSplashAnimation() {
	const splashLogo = document.querySelector('.login-splash-logo');
	const headerLogo = document.querySelector('.login-logo');
	const splashBg = document.querySelector('.login-splash');

	if (shouldSkipSplash()) {
		clearSkipSplash();
		showFinalSplashState(splashLogo, headerLogo, splashBg);
		return;
	}

	if (!splashLogo || !headerLogo || !splashBg) return;

	const startRect = splashLogo.getBoundingClientRect();
	const endRect = headerLogo.getBoundingClientRect();

	const deltaX = endRect.left - startRect.left;
	const deltaY = endRect.top - startRect.top;
	const scale = endRect.width / startRect.width;

	const animation = splashLogo.animate(
		[
			{ transform: 'translate(-50%, -50%) scale(1)' },
			{
				transform: `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(${scale})`,
			},
		],
		{
			duration: 500,
			easing: 'ease-in-out',
			delay: 500,
			fill: 'forwards',
		}
	);

	animation.onfinish = () => finishSplashAnimation(splashLogo, headerLogo, splashBg);
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
function showFinalSplashState(splashLogo, headerLogo, splashBg) {
	if (splashLogo) splashLogo.style.display = 'none';
	if (splashBg) splashBg.style.display = 'none';
	if (headerLogo) headerLogo.style.opacity = '1';
}

/**
 * Replaces the splash logo with the header logo and fades out the overlay.
 * @param {HTMLElement} splashLogo
 * @param {HTMLElement} headerLogo
 * @param {HTMLElement} splashBg
 */
function finishSplashAnimation(splashLogo, headerLogo, splashBg) {
	splashLogo.style.display = 'none';
	headerLogo.style.opacity = '1';

	splashBg
		.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: 300,
			fill: 'forwards',
		})
		.onfinish = () => {
			splashBg.style.display = 'none';
		};
}

document.addEventListener('DOMContentLoaded', runSplashAnimation);