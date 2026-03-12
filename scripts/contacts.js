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


/**
 * Resets the add-contact form to its default state.
 * @param {ReturnType<typeof getContactFields>} fields - Contact form fields.
 * @category Contacts
 * @subcategory UI & Init
 */
function prepareAddContactForm(fields) {
	if (!fields) return;
	fields.form.dataset.mode = 'add';
	fields.form.dataset.contactId = '';
	fields.form.reset();
	clearContactErrors(fields);
	updateContactAvatar(getContactOverlayElements(), '', false);
	setContactFormMessage('');
}


/**
 * Builds a normalized payload from current form values.
 * @param {ReturnType<typeof getContactFields>} fields - Contact form fields.
 * @returns {{name: string, email: string, phone: string, color: string}} Normalized contact payload.
 * @category Contacts
 * @subcategory Data Handling
 */
function getContactFormPayload(fields) {
	const name = fields.nameInput.value.trim();
	const email = fields.emailInput.value.trim();
	const phone = fields.phoneInput.value.trim();
	const color = getContactAvatarColor(name);
	return { name, email, phone, color };
}


/**
 * Persists contact form data for add/edit modes.
 * @param {'add' | 'edit'} mode - Active form mode.
 * @param {string} contactId - Contact id for edit mode.
 * @param {{name: string, email: string, phone: string, color: string}} payload - Form payload.
 * @returns {Promise<boolean>} True when persistence succeeded.
 * @category Contacts
 * @subcategory Firebase Logic
 */
async function persistContactForm(mode, contactId, payload) {
	if (mode !== 'edit') {
		await saveContact({ ...payload, createdAt: Date.now() });
		return true;
	}
	if (!contactId) return false;
	await updateContact(contactId, payload);
	return true;
}


/**
 * Deletes the current contact from the edit overlay context.
 * @param {ReturnType<typeof getContactFields>} fields - Contact form fields.
 * @returns {Promise<void>} Resolves after delete flow completes.
 * @category Contacts
 * @subcategory Firebase Logic
 */
async function handleDeleteContactFromOverlay(fields) {
	const contactId = fields.form.dataset.contactId;
	if (!contactId) return;
	await deleteContact(contactId);
	await refreshContactsList();
	fields.form.reset();
	closeContactOverlay(true);
}


/**
 * Submits contact form data and handles follow-up UI state.
 * @param {ReturnType<typeof getContactFields>} fields - Contact form fields.
 * @returns {Promise<boolean>} True when submit completed successfully.
 * @category Contacts
 * @subcategory Firebase Logic
 */
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
	initializeContactFormSubmit(fields);
}


/**
 * Binds the contact form submit handler.
 * @param {ReturnType<typeof getContactFields>} fields - Contact form fields.
 * @category Contacts
 * @subcategory UI & Init
 */
function initializeContactFormSubmit(fields) {
	if (!fields) return;
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
