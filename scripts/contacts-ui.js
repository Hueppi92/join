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
 * Returns the visual group letter for a contact name.
 * @param {string} name - Contact name.
 * @returns {string} Group letter or '#'.
 * @category Contacts
 * @subcategory UI & Init
 */
function getContactGroupLetter(name) {
	const normalizedName = String(name || '').trim();
	if (!normalizedName) return '#';
	const firstCharacter = normalizedName.charAt(0).toLocaleUpperCase('de-DE');
	return /[A-ZÄÖÜ]/.test(firstCharacter) ? firstCharacter : '#';
}

/**
 * Restarts the contact details slide-in animation.
 * @param {HTMLElement} detailsRef - Details container element.
 * @category Contacts
 * @subcategory UI & Init
 */
function animateContactDetails(detailsRef) {
	if (!detailsRef) return;
	detailsRef.classList.remove('is-entering');
	void detailsRef.offsetWidth;
	detailsRef.classList.add('is-entering');
}

/**
 * Renders selected contact details on the right side.
 * @param {{id: string, name: string, email: string, phone: string} | null} contact - Contact to render.
 * @param {{animate?: boolean}} [options] - Render options.
 * @category Contacts
 * @subcategory UI & Init
 */
function renderContactDetails(contact, options = {}) {
	const detailsRef = document.getElementById('contact-details');
	if (!detailsRef) return;
	detailsRef.replaceChildren();
	detailsRef.classList.remove('is-entering');

	if (!contact) {
		const placeholder = document.createElement('p');
		placeholder.className = 'contact-details-placeholder';
		placeholder.textContent = 'Select a contact to view details.';
		detailsRef.appendChild(placeholder);
		scheduleContactDetailsSectionScrollabilitySync();
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
	editButton.innerHTML = '<img src="../assets/icons/edit.svg" alt="" aria-hidden="true"><span>Edit</span>';
	editButton.addEventListener('click', () => openEditContactOverlay(contact.id, contact));

	const deleteButton = document.createElement('button');
	deleteButton.type = 'button';
	deleteButton.className = 'contact-details-action';
	deleteButton.innerHTML = '<img src="../assets/icons/delete.svg" alt="" aria-hidden="true"><span>Delete</span>';
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

	if (options.animate) {
		animateContactDetails(detailsRef);
	}
	scheduleContactDetailsSectionScrollabilitySync();
}

/**
 * Selects a contact and updates list + details.
 * @param {string} contactId - Contact id.
 * @category Contacts
 * @subcategory UI & Init
 */
function selectContact(contactId) {
	selectedContactId = contactId;
	setMobileContactActionMenuState(false);
	renderContacts(contactsState);
	const contact = contactsState.find((item) => item.id === contactId) || null;
	renderContactDetails(contact, { animate: !isMobileContactsLayout() });
	if (contact && isMobileContactsLayout()) {
		setMobileContactDetailsState(true);
	}
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

	const sortedContacts = sortContactsByName(Array.isArray(contacts) ? contacts : []);

	if (!sortedContacts.length) {
		const empty = document.createElement('p');
		empty.className = 'contact-item';
		empty.textContent = 'No contacts yet.';
		listRef.appendChild(empty);
		return;
	}

	const fragment = document.createDocumentFragment();
	const groupedContacts = sortedContacts.reduce((groups, contact) => {
		const groupLetter = getContactGroupLetter(contact.name);
		if (!groups.has(groupLetter)) {
			groups.set(groupLetter, []);
		}
		groups.get(groupLetter).push(contact);
		return groups;
	}, new Map());

	groupedContacts.forEach((group, groupLetter) => {
		const title = document.createElement('h3');
		title.className = 'contact-group-title';
		title.textContent = groupLetter;
		fragment.appendChild(title);

		group.forEach((contact) => {
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
			info.className = 'contact-info';
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
	contactsState = sortContactsByName(Array.isArray(contacts) ? contacts : []);
	if (!selectedContactId || !contactsState.some((contact) => contact.id === selectedContactId)) {
		selectedContactId = contactsState[0]?.id || '';
	}
	renderContacts(contactsState);
	const selectedContact = contactsState.find((item) => item.id === selectedContactId) || null;
	renderContactDetails(selectedContact);
	setMobileContactActionMenuState(false);
	if (!contactsState.length) {
		setMobileContactDetailsState(false);
	}
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

window.loadContacts = loadContacts;
