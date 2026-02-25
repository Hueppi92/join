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
	overlay.classList.remove('is-instant');
	overlay.classList.add('is-open');
	overlay.setAttribute('aria-hidden', 'false');
	document.body.classList.add('contact-overlay-open');
}

/**
 * Closes the add contact overlay.
 * @category Contacts
 * @subcategory UI & Init
 */
function closeContactOverlay(immediate = false) {
	const overlay = document.getElementById('contact-overlay');
	if (!overlay) return;
	if (immediate) {
		overlay.classList.add('is-instant');
	}
	overlay.classList.remove('is-open');
	overlay.setAttribute('aria-hidden', 'true');
	document.body.classList.remove('contact-overlay-open');
}

/**
 * Shows a temporary success toast after creating a contact.
 * @category Contacts
 * @subcategory UI & Init
 */
function showSuccessToast() {
	const toast = document.getElementById('contact-success-toast');
	if (!toast) return;
	toast.setAttribute('aria-hidden', 'false');
	toast.classList.add('show');
	setTimeout(() => {
		toast.classList.remove('show');
		toast.setAttribute('aria-hidden', 'true');
	}, 2000);
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
	return getAvatarColorFromName(name);
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
 * Refreshes the contact list using external renderer if available.
 * @returns {Promise<void>} Resolves after refresh completes.
 * @category Contacts
 * @subcategory UI & Init
 */
async function refreshContactsList() {
	if (typeof window.loadContacts === 'function') {
		await window.loadContacts({ preferCache: false });
	}
}


function prepareAddContactForm(fields) {
	if (!fields) return;
	fields.form.dataset.mode = 'add';
	fields.form.dataset.contactId = '';
	fields.form.reset();
	clearContactErrors(fields);
	updateContactAvatar(getContactOverlayElements(), '', false);
	setContactFormMessage('');
}


function getContactFormPayload(fields) {
	const name = fields.nameInput.value.trim();
	const email = fields.emailInput.value.trim();
	const phone = fields.phoneInput.value.trim();
	const color = getContactAvatarColor(name);
	return { name, email, phone, color };
}


async function persistContactForm(mode, contactId, payload) {
	if (mode !== 'edit') {
		await saveContact({ ...payload, createdAt: Date.now() });
		return true;
	}
	if (!contactId) return false;
	await updateContact(contactId, payload);
	return true;
}


async function handleDeleteContactFromOverlay(fields) {
	const contactId = fields.form.dataset.contactId;
	if (!contactId) return;
	await deleteContact(contactId);
	await refreshContactsList();
	fields.form.reset();
	closeContactOverlay(true);
}


async function submitContactForm(fields) {
	const mode = fields.form.dataset.mode || 'add';
	const payload = getContactFormPayload(fields);
	const contactId = fields.form.dataset.contactId;
	const isPersisted = await persistContactForm(mode, contactId, payload);
	if (!isPersisted) return false;
	await refreshContactsList();
	fields.form.reset();
	closeContactOverlay(true);
	if (mode !== 'edit') showSuccessToast();
	return true;
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
		prepareAddContactForm(getContactFields());
		openContactOverlay();
	});

	closeTargets.forEach((node) => node.addEventListener('click', () => closeContactOverlay()));
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
		elements.deleteButton.addEventListener('click', () => handleDeleteContactFromOverlay(fields));
	}

	fields.form.addEventListener('submit', async (event) => {
		event.preventDefault();
		clearContactErrors(fields);
		setContactFormMessage('');
		if (!validateContactFields(fields)) return;

		fields.submitButton.disabled = true;
		try {
			const isSubmitted = await submitContactForm(fields);
			if (!isSubmitted) {
				setContactFormMessage('Contact cannot be saved without an id.');
				return;
			}
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

window.contactsOverlay = {
	openEditContactOverlay,
};

document.addEventListener('DOMContentLoaded', () => {
	initContactOverlay();
	initContactForm();
	initMobileContactDetailsControls();
	window.addEventListener('resize', scheduleContactDetailsSectionScrollabilitySync);
	window.addEventListener('load', scheduleContactDetailsSectionScrollabilitySync);
	if (typeof window.loadContacts === 'function') {
		window.loadContacts();
	}
});
