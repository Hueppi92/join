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
	overlay.classList.remove('is-instant');
	overlay.classList.add('is-open');
	overlay.setAttribute('aria-hidden', 'false');
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

const LOCAL_CONTACTS_KEY = 'join_contacts_local';
const CONTACTS_CACHE_KEY = 'join_contacts_cache_v1';

/**
 * Reads local contacts map from localStorage.
 * @returns {Record<string, {name?: string, email?: string, phone?: string, createdAt?: number}>} Local contacts map.
 * @category Contacts
 * @subcategory Data Handling
 */
function readLocalContactsMap() {
	try {
		const raw = localStorage.getItem(LOCAL_CONTACTS_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch (error) {
		return {};
	}
}

/**
 * Writes local contacts map into localStorage.
 * @param {Record<string, {name?: string, email?: string, phone?: string, createdAt?: number}>} contactsMap - Contacts map to persist.
 * @category Contacts
 * @subcategory Data Handling
 */
function writeLocalContactsMap(contactsMap) {
	try {
		localStorage.setItem(LOCAL_CONTACTS_KEY, JSON.stringify(contactsMap || {}));
	} catch (error) {
		return;
	}
}

/**
 * Reads cached contact list from localStorage.
 * @returns {Array<{id: string, name: string, email: string, phone: string, createdAt?: number}>} Cached contacts.
 * @category Contacts
 * @subcategory Data Handling
 */
function readContactsCache() {
	try {
		const raw = localStorage.getItem(CONTACTS_CACHE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((item) => item && typeof item === 'object' && typeof item.id === 'string')
			.map((item) => ({
				id: item.id,
				name: item.name || '',
				email: item.email || '',
				phone: item.phone || '',
				createdAt: item.createdAt || 0,
			}));
	} catch (error) {
		return [];
	}
}

/**
 * Writes contact list cache to localStorage.
 * @param {Array<{id: string, name: string, email: string, phone: string, createdAt?: number}>} contacts - Contact list to cache.
 * @category Contacts
 * @subcategory Data Handling
 */
function writeContactsCache(contacts) {
	try {
		localStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(Array.isArray(contacts) ? contacts : []));
	} catch (error) {
		return;
	}
}

/**
 * Generates a local contact id.
 * @returns {string} Local contact id.
 * @category Contacts
 * @subcategory Data Handling
 */
function createLocalContactId() {
	return `local_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

/**
 * Saves a new contact to the database.
 * @param {{name: string, email: string, phone: string}} contact - Contact data.
 * @returns {Promise<void>} Resolves after saving completes.
 * @category Contacts
 * @subcategory Firebase Logic
 */
async function saveContact(contact) {
	if (hasDb()) {
		try {
			await db.ref('contacts').push(contact);
			return;
		} catch (error) {
			// Fall through to local fallback.
		}
	}
	const contactsMap = readLocalContactsMap();
	contactsMap[createLocalContactId()] = contact;
	writeLocalContactsMap(contactsMap);
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
	if (!contactId) return;
	if (hasDb()) {
		try {
			await db.ref(`contacts/${contactId}`).update(contact);
			return;
		} catch (error) {
			// Fall through to local fallback.
		}
	}
	const contactsMap = readLocalContactsMap();
	if (!contactsMap[contactId]) return;
	contactsMap[contactId] = { ...contactsMap[contactId], ...contact };
	writeLocalContactsMap(contactsMap);
}

/**
 * Deletes a contact from the database.
 * @param {string} contactId - Contact id.
 * @returns {Promise<void>} Resolves after delete completes.
 * @category Contacts
 * @subcategory Firebase Logic
 */
async function deleteContact(contactId) {
	if (!contactId) return;
	if (hasDb()) {
		try {
			await db.ref(`contacts/${contactId}`).remove();
			return;
		} catch (error) {
			// Fall through to local fallback.
		}
	}
	const contactsMap = readLocalContactsMap();
	delete contactsMap[contactId];
	writeLocalContactsMap(contactsMap);
}

/**
 * Fetches a contact by id.
 * @param {string} contactId - Contact id.
 * @returns {Promise<{name?: string, email?: string, phone?: string} | null>} Contact data.
 * @category Contacts
 * @subcategory Firebase Logic
 */
async function fetchContact(contactId) {
	if (!contactId) return null;
	if (hasDb()) {
		try {
			const snapshot = await db.ref(`contacts/${contactId}`).get();
			return snapshot.val();
		} catch (error) {
			// Fall through to local fallback.
		}
	}
	const contactsMap = readLocalContactsMap();
	return contactsMap[contactId] || null;
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
		elements.deleteButton.addEventListener('click', async () => {
			const contactId = fields.form.dataset.contactId;
			if (!contactId) return;
			await deleteContact(contactId);
			await refreshContactsList();
			fields.form.reset();
			closeContactOverlay(true);
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
			const color = getContactAvatarColor(name);
			const mode = fields.form.dataset.mode || 'add';
			if (mode === 'edit') {
				const contactId = fields.form.dataset.contactId;
				if (!contactId) {
					setContactFormMessage('Contact cannot be saved without an id.');
					return;
				}
				await updateContact(contactId, { name, email, phone, color });
			} else {
				await saveContact({ name, email, phone, color, createdAt: Date.now() });
			}
			await refreshContactsList();
			fields.form.reset();
			closeContactOverlay(true);
			if (mode !== 'edit') {
				showSuccessToast();
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

let contactsState = [];
let selectedContactId = '';

/**
 * Returns initials for a contact name.
 * @param {string} name - Contact name.
 * @returns {string} Initials.
 * @category Contacts
 * @subcategory UI & Init
 */
function getContactInitials(name) {
	const parts = String(name || '')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (!parts.length) return 'U';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Fetches all contacts from Firebase.
 * @returns {Promise<Array<{id: string, name: string, email: string, phone: string, createdAt?: number}>>} Contact list.
 * @category Contacts
 * @subcategory Firebase Logic
 */
async function fetchContacts() {
	let contacts = {};
	if (hasDb()) {
		try {
			const snapshot = await db.ref('contacts').get();
			contacts = snapshot.val() || {};
		} catch (error) {
			contacts = readLocalContactsMap();
		}
	} else {
		contacts = readLocalContactsMap();
	}
	const normalizedContacts = Object.entries(contacts)
		.map(([id, value]) => ({
			id,
			name: value?.name || '',
			email: value?.email || '',
			phone: value?.phone || '',
			createdAt: value?.createdAt || 0,
		}))
		.sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
	writeContactsCache(normalizedContacts);
	return normalizedContacts;
}

/**
 * Renders selected contact details on the right side.
 * @param {{id: string, name: string, email: string, phone: string} | null} contact - Contact to render.
 * @category Contacts
 * @subcategory UI & Init
 */
function renderContactDetails(contact) {
	const detailsRef = document.getElementById('contact-details');
	if (!detailsRef) return;
	detailsRef.replaceChildren();

	if (!contact) {
		const placeholder = document.createElement('p');
		placeholder.className = 'contact-details-placeholder';
		placeholder.textContent = 'Select a contact to view details.';
		detailsRef.appendChild(placeholder);
		return;
	}

	const initials = getContactInitials(contact.name);
	const color = getContactAvatarColor(contact.name);
	const profile = document.createElement('div');
	profile.className = 'contact-details-profile';

	const avatar = document.createElement('div');
	avatar.className = 'contact-details-avatar';
	avatar.style.background = color;
	avatar.textContent = initials;

	const profileInfo = document.createElement('div');
	profileInfo.className = 'contact-details-profile-info';

	const name = document.createElement('h2');
	name.className = 'contact-details-name';
	name.textContent = contact.name || 'Unknown Contact';

	const actions = document.createElement('div');
	actions.className = 'contact-details-actions';

	const editButton = document.createElement('button');
	editButton.type = 'button';
	editButton.className = 'contact-details-action';
	editButton.innerHTML = '<img src="../assets/icons/edit_detail.png" alt="" aria-hidden="true"><span>Edit</span>';
	editButton.addEventListener('click', () => openEditContactOverlay(contact.id, contact));

	const deleteButton = document.createElement('button');
	deleteButton.type = 'button';
	deleteButton.className = 'contact-details-action';
	deleteButton.innerHTML = '<img src="../assets/icons/delete_detail.png" alt="" aria-hidden="true"><span>Delete</span>';
	deleteButton.addEventListener('click', async () => {
		await deleteContact(contact.id);
		await refreshContactsList();
	});

	actions.appendChild(editButton);
	actions.appendChild(deleteButton);
	profileInfo.appendChild(name);
	profileInfo.appendChild(actions);
	profile.appendChild(avatar);
	profile.appendChild(profileInfo);

	const info = document.createElement('div');
	info.className = 'contact-details-info';

	const infoTitle = document.createElement('h3');
	infoTitle.className = 'contact-details-info-title';
	infoTitle.textContent = 'Contact Information';

	const emailLabel = document.createElement('p');
	emailLabel.className = 'contact-details-label';
	emailLabel.textContent = 'Email';

	const emailValue = String(contact.email || '').trim();
	const email = document.createElement(emailValue ? 'a' : 'p');
	email.className = 'contact-details-email';
	email.textContent = emailValue || '-';
	if (emailValue) {
		email.href = `mailto:${emailValue}`;
	}

	const phoneLabel = document.createElement('p');
	phoneLabel.className = 'contact-details-label';
	phoneLabel.textContent = 'Phone';

	const phone = document.createElement('p');
	phone.className = 'contact-details-phone';
	phone.textContent = contact.phone || '-';

	info.appendChild(infoTitle);
	info.appendChild(emailLabel);
	info.appendChild(email);
	info.appendChild(phoneLabel);
	info.appendChild(phone);

	detailsRef.appendChild(profile);
	detailsRef.appendChild(info);
}

/**
 * Selects a contact and updates list + details.
 * @param {string} contactId - Contact id.
 * @category Contacts
 * @subcategory UI & Init
 */
function selectContact(contactId) {
	selectedContactId = contactId;
	renderContacts(contactsState);
	const contact = contactsState.find((item) => item.id === contactId) || null;
	renderContactDetails(contact);
}

/**
 * Renders contacts into the contacts list.
 * @param {Array<{id: string, name: string, email: string, phone: string}>} contacts - Contacts to render.
 * @category Contacts
 * @subcategory UI & Init
 */
function renderContacts(contacts) {
	const listRef = document.getElementById('contact-list');
	if (!listRef) return;
	listRef.replaceChildren();

	if (!contacts.length) {
		const empty = document.createElement('p');
		empty.className = 'contact-item';
		empty.textContent = 'No contacts yet.';
		listRef.appendChild(empty);
		return;
	}

	const fragment = document.createDocumentFragment();

	contacts.forEach((contact) => {
		const initials = getContactInitials(contact.name);
		const color = getContactAvatarColor(contact.name);
		const isSelected = selectedContactId === contact.id;
		const item = document.createElement('div');
		item.className = 'contact-item';

		const box = document.createElement('div');
		box.className = 'contact-box';
		box.setAttribute('role', 'button');
		box.setAttribute('tabindex', '0');
		box.setAttribute('aria-label', `Open ${contact.name || 'contact'}`);
		if (isSelected) {
			box.classList.add('is-selected');
		}

		const avatar = document.createElement('div');
		avatar.className = 'contact-logo';
		avatar.style.background = color;
		avatar.textContent = initials;

		const info = document.createElement('div');
		const name = document.createElement('span');
		name.className = 'contact-name';
		name.textContent = contact.name || 'Unknown Contact';
		const email = document.createElement('span');
		email.className = 'contact-email';
		email.textContent = contact.email || '';

		info.appendChild(name);
		info.appendChild(email);
		box.appendChild(avatar);
		box.appendChild(info);
		box.addEventListener('click', () => selectContact(contact.id));
		box.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			selectContact(contact.id);
		});

		item.appendChild(box);
		fragment.appendChild(item);
	});

	listRef.appendChild(fragment);
}

/**
 * Applies contacts to the page state and renders list + details.
 * @param {Array<{id: string, name: string, email: string, phone: string, createdAt?: number}>} contacts - Contacts to apply.
 * @category Contacts
 * @subcategory UI & Init
 */
function applyContactsState(contacts) {
	contactsState = Array.isArray(contacts) ? contacts : [];
	if (!selectedContactId || !contactsState.some((contact) => contact.id === selectedContactId)) {
		selectedContactId = contactsState[0]?.id || '';
	}
	renderContacts(contactsState);
	const selectedContact = contactsState.find((item) => item.id === selectedContactId) || null;
	renderContactDetails(selectedContact);
}

/**
 * Compares two contact lists by relevant rendered fields.
 * @param {Array<{id: string, name: string, email: string, phone: string, createdAt?: number}>} left - First list.
 * @param {Array<{id: string, name: string, email: string, phone: string, createdAt?: number}>} right - Second list.
 * @returns {boolean} True when both lists are equivalent for rendering.
 * @category Contacts
 * @subcategory Validation
 */
function areContactListsEqual(left, right) {
	if (left.length !== right.length) return false;
	for (let index = 0; index < left.length; index += 1) {
		const a = left[index];
		const b = right[index];
		if (!a || !b) return false;
		if (a.id !== b.id) return false;
		if (a.name !== b.name) return false;
		if (a.email !== b.email) return false;
		if (a.phone !== b.phone) return false;
		if ((a.createdAt || 0) !== (b.createdAt || 0)) return false;
	}
	return true;
}

/**
 * Loads contacts from Firebase and renders them into the contacts page.
 * @returns {Promise<void>} Resolves after rendering.
 * @category Contacts
 * @subcategory UI & Init
 */
async function loadContacts(options = {}) {
	const preferCache = options?.preferCache !== false;
	const cachedContacts = preferCache ? readContactsCache() : [];
	if (cachedContacts.length) {
		applyContactsState(cachedContacts);
	}

	const freshContacts = await fetchContacts();
	if (!cachedContacts.length || !areContactListsEqual(cachedContacts, freshContacts)) {
		applyContactsState(freshContacts);
	}
}

window.contactsOverlay = {
	openEditContactOverlay,
};
window.loadContacts = loadContacts;

document.addEventListener('DOMContentLoaded', () => {
	initContactOverlay();
	initContactForm();
	loadContacts();
});
