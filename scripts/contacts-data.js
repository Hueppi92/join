/**
 * Returns whether the database API is available.
 * @returns {boolean} True if the database API is available.
 * @category Contacts
 * @subcategory Firebase Logic
 */
function hasDb() {
	return typeof db !== 'undefined' && db && typeof db.ref === 'function';
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
 * Sorts contacts by name for stable list rendering.
 * @param {Array<{id: string, name: string, email: string, phone: string, createdAt?: number}>} contacts - Contact list.
 * @returns {Array<{id: string, name: string, email: string, phone: string, createdAt?: number}>} Sorted contacts.
 * @category Contacts
 * @subcategory UI & Init
 */
function sortContactsByName(contacts) {
	return [...contacts].sort((a, b) =>
		String(a?.name || '').localeCompare(String(b?.name || ''), 'de', { sensitivity: 'base' })
	);
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
		}));
	const sortedContacts = sortContactsByName(normalizedContacts);
	writeContactsCache(sortedContacts);
	return sortedContacts;
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
