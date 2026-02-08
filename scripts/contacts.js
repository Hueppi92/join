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

// Hier wird die Render-Funktion für die Kontaktliste aufgerufen, um die Kontakte anzuzeigen, wenn die Seite geladen wird.

function renderContactList() {
	let contactListContainer = document.getElementById('contact-list');
	contactListContainer.innerHTML = `<div class="contact-box">
		<div>
			<img class="contact-logo" src="../assets/icons/Profile badge@2x.png" alt="Anton Mayer" />
		</div>
		<div class="contact-item">
			<span class="contact-name">${contact.name}</span>
			<span class="contact-email">${contact.email}</span>
			<span class="contact-phone">${contact.phone}</span>
		</div>
	`;
}
document.addEventListener('DOMContentLoaded', renderContactList);

function showContactDetails(contact) {
	let contactDetailsContainer = document.getElementById('contact-details');
	contactDetailsContainer.innerHTML = `<div class="contact-details-box">
		<div>
			<img class="contact-logo" src="../assets/icons/Profile badge@2x.png" alt="${contact.name}" />
			<span class="contact-name">${contact.name}</span>
			<p>Edit</p><p>Delete</p>
		</div>
		<div class="contact-details-item">
			<span class="contact-name">Contact Information</span>
			<span class="contact-email">${contact.email}</span>
			<span class="contact-phone">${contact.phone}</span>
		</div>
	</div>`;
}