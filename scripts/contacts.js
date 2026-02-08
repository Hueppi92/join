/**
 * Returns whether the database API is available.
 * @returns {boolean} True if the database API is available.
 * @category Contacts
 * @subcategory Firebase Logic
 */
function hasDb() {
	return typeof db !== 'undefined' && db && typeof db.ref === 'function';
}

/**
 * Opens the add contact overlay.
 * @category Contacts
 * @subcategory UI & Init
 */
function openContactOverlay() {
	const overlay = document.getElementById('contact-overlay');
	if (!overlay) return;
	overlay.classList.add('is-open');
	overlay.setAttribute('aria-hidden', 'false');
}

/**
 * Closes the add contact overlay.
 * @category Contacts
 * @subcategory UI & Init
 */
function closeContactOverlay() {
	const overlay = document.getElementById('contact-overlay');
	if (!overlay) return;
	overlay.classList.remove('is-open');
	overlay.setAttribute('aria-hidden', 'true');
}


/**
 * Collects contact form fields.
 * @returns {{form: HTMLFormElement, nameInput: HTMLInputElement, emailInput: HTMLInputElement, phoneInput: HTMLInputElement, submitButton: HTMLButtonElement, messages: Record<string, HTMLElement> } | null}
 * @category Contacts
 * @subcategory UI & Init
 */
function getContactFields() {
	const form = document.querySelector('.contact-overlay__form');
	if (!form) return null;
	const nameInput = form.querySelector('input[name="name"]');
	const emailInput = form.querySelector('input[name="email"]');
	const phoneInput = form.querySelector('input[name="phone"]');
	const submitButton = form.querySelector('button[type="submit"]');
	const messages = {};
	form.querySelectorAll('.contact-overlay__message').forEach((node) => {
		const key = node.getAttribute('data-field');
		if (key) messages[key] = node;
	});
	if (!nameInput || !emailInput || !phoneInput || !submitButton) return null;
	return { form, nameInput, emailInput, phoneInput, submitButton, messages };
}

/**
 * Validates contact form fields and shows errors.
 * @param {ReturnType<typeof getContactFields>} fields - Contact form fields.
 * @returns {boolean} True if valid.
 * @category Contacts
 * @subcategory Validation
 */
function validateContactFields(fields) {
	if (!fields) return false;
	let isValid = true;
	if (!fields.nameInput.value.trim()) {
		setFieldError(fields.nameInput, fields.messages.name, 'Please enter a name.');
		isValid = false;
	}
	if (!isEmailValid(fields.emailInput.value.trim())) {
		setFieldError(fields.emailInput, fields.messages.email, 'Please enter a valid email.');
		isValid = false;
	}
	if (!fields.phoneInput.value.trim()) {
		setFieldError(fields.phoneInput, fields.messages.phone, 'Please enter a phone number.');
		isValid = false;
	}
	return isValid;
}

/**
 * Binds field events to clear validation messages.
 * @param {ReturnType<typeof getContactFields>} fields - Contact form fields.
 * @category Contacts
 * @subcategory UI & Init
 */
function bindContactFieldEvents(fields) {
	if (!fields) return;
	fields.nameInput.addEventListener('input', () => {
		clearFieldError(fields.nameInput, fields.messages.name);
	});
	fields.emailInput.addEventListener('input', () => {
		clearFieldError(fields.emailInput, fields.messages.email);
	});
	fields.phoneInput.addEventListener('input', () => {
		clearFieldError(fields.phoneInput, fields.messages.phone);
	});
}

/**
 * Saves a new contact to the database.
 * @param {{name: string, email: string, phone: string}} contact - Contact data.
 * @returns {Promise<void>} Resolves after saving completes.
 * @category Contacts
 * @subcategory Firebase Logic
 */
async function saveContact(contact) {
	if (!hasDb()) return;
	await db.ref('contacts').push(contact);
}

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

	trigger.addEventListener('click', openContactOverlay);
	trigger.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openContactOverlay();
		}
	});

	closeTargets.forEach((node) => node.addEventListener('click', closeContactOverlay));
	window.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') closeContactOverlay();
	});
}

/**
 * Initializes the add contact form submission.
 * @category Contacts
 * @subcategory UI & Init
 */
function initContactForm() {
	const fields = getContactFields();
	if (!fields) return;
	bindContactFieldEvents(fields);

	fields.form.addEventListener('submit', async (event) => {
		event.preventDefault();
		clearFieldError(fields.nameInput, fields.messages.name);
		clearFieldError(fields.emailInput, fields.messages.email);
		clearFieldError(fields.phoneInput, fields.messages.phone);
		if (!validateContactFields(fields)) return;

		fields.submitButton.disabled = true;
		try {
			const name = fields.nameInput.value.trim();
			const email = fields.emailInput.value.trim();
			const phone = fields.phoneInput.value.trim();
			await saveContact({ name, email, phone, createdAt: Date.now() });
			fields.form.reset();
			closeContactOverlay();
		} finally {
			fields.submitButton.disabled = false;
		}
	});
}

document.addEventListener('DOMContentLoaded', () => {
	initContactOverlay();
	initContactForm();
});
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