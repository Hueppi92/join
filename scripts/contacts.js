/**
 * Initializes the add contact overlay interactions.
 * @category Contacts
 * @subcategory UI & Init
 */
function initContactOverlay() {
	const trigger = document.getElementById('add-contact-btn');
	const overlay = document.getElementById('contact-overlay');
	if (!trigger || !overlay) return;

	const closeTargets = overlay.querySelectorAll('[data-contact-overlay-close]');
	const openOverlay = () => {
		overlay.classList.add('is-open');
		overlay.setAttribute('aria-hidden', 'false');
	};
	const closeOverlay = () => {
		overlay.classList.remove('is-open');
		overlay.setAttribute('aria-hidden', 'true');
	};

	trigger.addEventListener('click', openOverlay);
	trigger.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openOverlay();
		}
	});

	closeTargets.forEach((node) => node.addEventListener('click', closeOverlay));
	window.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') closeOverlay();
	});
}

document.addEventListener('DOMContentLoaded', initContactOverlay);
