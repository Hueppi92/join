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
 * Returns overlay elements used for add/edit states.
 * @returns {{overlay: HTMLElement, title: HTMLElement | null, subtitle: HTMLElement | null, submitLabel: HTMLElement | null, deleteButton: HTMLButtonElement | null} | null}
 * @category Contacts
 * @subcategory UI & Init
 */
function getContactOverlayElements() {
	const overlay = document.getElementById('contact-overlay');
	if (!overlay) return null;
	return {
		overlay,
		title: overlay.querySelector('[data-role="contact-title"]'),
		subtitle: overlay.querySelector('[data-role="contact-subtitle"]'),
		submitLabel: overlay.querySelector('[data-role="contact-submit-label"]'),
		deleteButton: overlay.querySelector('[data-role="contact-delete"]'),
		cancelButton: overlay.querySelector('[data-role="contact-cancel"]'),
		formMessage: overlay.querySelector('[data-role="contact-form-message"]'),
		avatar: overlay.querySelector('.contact-overlay__avatar'),
		avatarIcon: overlay.querySelector('[data-role="contact-avatar-icon"]'),
		avatarText: overlay.querySelector('[data-role="contact-avatar-text"]'),
	};
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
 * Clears validation errors for contact fields.
 * @param {ReturnType<typeof getContactFields>} fields - Contact form fields.
 * @category Contacts
 * @subcategory UI & Init
 */
function clearContactErrors(fields) {
	if (!fields) return;
	clearFieldError(fields.nameInput, fields.messages.name);
	clearFieldError(fields.emailInput, fields.messages.email);
	clearFieldError(fields.phoneInput, fields.messages.phone);
}

/**
 * Sets the overlay form message.
 * @param {string} text - Message text.
 * @category Contacts
 * @subcategory UI & Init
 */
function setContactFormMessage(text) {
	const elements = getContactOverlayElements();
	if (!elements?.formMessage) return;
	elements.formMessage.textContent = text;
	elements.formMessage.classList.toggle('is-hidden', !text);
}

/**
 * Computes a stable avatar color for a contact name.
 * @param {string} name - Contact name.
 * @returns {string} Hex color string.
 * @category Contacts
 * @subcategory UI & Init
 */
function getContactAvatarColor(name) {
	const palette = [
		'#6e52ff',
		'#1fd7c1',
		'#fc71ff',
		'#c3ff2b',
		'#ffbb2b',
		'#ff5eb3',
		'#00bee8',
		'#ffa35e',
		'#0038ff',
		'#ff4646',
		'#ff7a00',
		'#9327ff',
		'#ff745e',
		'#ffc701',
		'#ffe62b',
	];
	const value = String(name || '').trim().toLowerCase();
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash + value.charCodeAt(i) * (i + 1)) % 1000;
	}
	return palette[hash % palette.length];
}

/**
 * Updates the avatar for add/edit modes.
 * @param {{avatar: HTMLElement | null, avatarText: HTMLElement | null} | null} elements - Overlay elements.
 * @param {string} name - Contact name.
 * @param {boolean} useInitials - Whether to show initials.
 * @category Contacts
 * @subcategory UI & Init
 */
function updateContactAvatar(elements, name, useInitials) {
	if (!elements?.avatar || !elements.avatarText) return;
	if (!useInitials) {
		elements.avatar.classList.remove('has-initials');
		elements.avatarText.textContent = '';
		elements.avatar.style.backgroundColor = '#d1d1d1';
		return;
	}
	const parts = name.trim().split(/\s+/).filter(Boolean);
	let initials = '';
	if (parts.length === 1) initials = parts[0].slice(0, 2);
	if (parts.length > 1) initials = `${parts[0][0]}${parts[parts.length - 1][0]}`;
	initials = initials.toUpperCase();
	elements.avatarText.textContent = initials || 'U';
	elements.avatar.classList.add('has-initials');
	elements.avatar.style.backgroundColor = getContactAvatarColor(name);
}

/**
 * Updates overlay copy and actions for add/edit modes.
 * @param {'add' | 'edit'} mode - Overlay mode.
 * @category Contacts
 * @subcategory UI & Init
 */
function setContactOverlayMode(mode) {
	const elements = getContactOverlayElements();
	if (!elements) return;
	const isEdit = mode === 'edit';
	if (elements.title) elements.title.textContent = isEdit ? 'Edit contact' : 'Add contact';
	if (elements.subtitle) {
		elements.subtitle.textContent = 'Tasks are better with a team!';
		elements.subtitle.classList.toggle('is-hidden', isEdit);
	}
	if (elements.submitLabel) elements.submitLabel.textContent = isEdit ? 'Save' : 'Create contact';
	if (elements.deleteButton) {
		elements.deleteButton.classList.toggle('is-hidden', !isEdit);
	}
	if (elements.cancelButton) {
		elements.cancelButton.classList.toggle('is-hidden', isEdit);
	}
}

/**
 * Applies contact data to the form fields.
 * @param {ReturnType<typeof getContactFields>} fields - Contact form fields.
 * @param {{name?: string, email?: string, phone?: string} | null} contact - Contact data.
 * @category Contacts
 * @subcategory UI & Init
 */
function applyContactToForm(fields, contact) {
	if (!fields) return;
	fields.nameInput.value = contact?.name || '';
	fields.emailInput.value = contact?.email || '';
	fields.phoneInput.value = contact?.phone || '';
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
 * Updates an existing contact in the database.
 * @param {string} contactId - Contact id.
 * @param {{name: string, email: string, phone: string}} contact - Contact data.
 * @returns {Promise<void>} Resolves after update completes.
 * @category Contacts
 * @subcategory Firebase Logic
 */
async function updateContact(contactId, contact) {
	if (!hasDb() || !contactId) return;
	await db.ref(`contacts/${contactId}`).update(contact);
}

/**
 * Deletes a contact from the database.
 * @param {string} contactId - Contact id.
 * @returns {Promise<void>} Resolves after delete completes.
 * @category Contacts
 * @subcategory Firebase Logic
 */
async function deleteContact(contactId) {
	if (!hasDb() || !contactId) return;
	await db.ref(`contacts/${contactId}`).remove();
}

/**
 * Fetches a contact by id.
 * @param {string} contactId - Contact id.
 * @returns {Promise<{name?: string, email?: string, phone?: string} | null>} Contact data.
 * @category Contacts
 * @subcategory Firebase Logic
 */
async function fetchContact(contactId) {
	if (!hasDb() || !contactId) return null;
	const snapshot = await db.ref(`contacts/${contactId}`).get();
	return snapshot.val();
}

/**
 * Refreshes the contact list using external renderer if available.
 * @returns {Promise<void>} Resolves after refresh completes.
 * @category Contacts
 * @subcategory UI & Init
 */
async function refreshContactsList() {
	if (typeof window.loadContacts === 'function') {
		await window.loadContacts();
	}
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

	trigger.addEventListener('click', () => {
		setContactOverlayMode('add');
		const fields = getContactFields();
		if (fields) {
			fields.form.dataset.mode = 'add';
			fields.form.dataset.contactId = '';
			fields.form.reset();
			clearContactErrors(fields);
			updateContactAvatar(getContactOverlayElements(), '', false);
			setContactFormMessage('');
		}
		openContactOverlay();
	});
	trigger.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			setContactOverlayMode('add');
			const fields = getContactFields();
			if (fields) {
				fields.form.dataset.mode = 'add';
				fields.form.dataset.contactId = '';
				fields.form.reset();
				clearContactErrors(fields);
				updateContactAvatar(getContactOverlayElements(), '', false);
				setContactFormMessage('');
			}
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
	const elements = getContactOverlayElements();
	if (elements?.deleteButton) {
		elements.deleteButton.addEventListener('click', async () => {
			const contactId = fields.form.dataset.contactId;
			if (!contactId) return;
			await deleteContact(contactId);
			await refreshContactsList();
			fields.form.reset();
			closeContactOverlay();
		});
	}

	fields.form.addEventListener('submit', async (event) => {
		event.preventDefault();
		clearContactErrors(fields);
		setContactFormMessage('');
		if (!validateContactFields(fields)) return;

		fields.submitButton.disabled = true;
		try {
			const name = fields.nameInput.value.trim();
			const email = fields.emailInput.value.trim();
			const phone = fields.phoneInput.value.trim();
			const mode = fields.form.dataset.mode || 'add';
			if (mode === 'edit') {
				const contactId = fields.form.dataset.contactId;
				if (!contactId) {
					setContactFormMessage('Contact cannot be saved without an id.');
					return;
				}
				await updateContact(contactId, { name, email, phone });
			} else {
				await saveContact({ name, email, phone, createdAt: Date.now() });
			}
			await refreshContactsList();
			fields.form.reset();
			closeContactOverlay();
		} finally {
			fields.submitButton.disabled = false;
		}
	});
}

/**
 * Opens the overlay in edit mode with contact data.
 * @param {string} contactId - Contact id.
 * @param {{name?: string, email?: string, phone?: string} | null} contact - Contact data.
 * @returns {Promise<void>} Resolves after opening.
 * @category Contacts
 * @subcategory UI & Init
 */
async function openEditContactOverlay(contactId, contact) {
	setContactOverlayMode('edit');
	const fields = getContactFields();
	if (fields) {
		fields.form.dataset.mode = 'edit';
		fields.form.dataset.contactId = contactId || '';
		clearContactErrors(fields);
		setContactFormMessage('');
		const data = contact || (await fetchContact(contactId));
		applyContactToForm(fields, data);
		updateContactAvatar(getContactOverlayElements(), data?.name || '', true);
	}
	openContactOverlay();
}

document.addEventListener('DOMContentLoaded', () => {
	initContactOverlay();
	initContactForm();
});

window.contactsOverlay = {
	openEditContactOverlay,
};
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