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
const SELF_CONTACT_PREFIX = 'self_';


function createSelfContactId(userId) {
	return `${SELF_CONTACT_PREFIX}${userId}`;
}


function isSelfContactId(contactId) {
	return typeof contactId === 'string' && contactId.startsWith(SELF_CONTACT_PREFIX);
}


function extractSelfUserId(contactId) {
	if (!isSelfContactId(contactId)) return '';
	return contactId.slice(SELF_CONTACT_PREFIX.length);
}


async function resolveCurrentUserIdForContacts() {
	if (window?.userContext?.resolveUserId) {
		try {
			return await window.userContext.resolveUserId();
		} catch (error) {
			// Fall back to session storage.
		}
	}
	return sessionStorage.getItem('userId');
}


function toOwnAccountContact(userId, userProfile) {
	return {
		id: createSelfContactId(userId),
		name: userProfile?.name || '',
		email: userProfile?.email || '',
		phone: userProfile?.phone || '',
		createdAt: userProfile?.createdAt || 0,
	};
}


async function fetchOwnAccountContact() {
	if (!hasDb()) return null;
	const userId = await resolveCurrentUserIdForContacts();
	if (!userId) return null;
	try {
		const snapshot = await db.ref(`users/${userId}`).get();
		const userProfile = snapshot.val();
		if (!userProfile) return null;
		return toOwnAccountContact(userId, userProfile);
	} catch (error) {
		return null;
	}
}


function mergeOwnAccountContact(contacts, ownAccountContact) {
	if (!ownAccountContact) return contacts;
	if (contacts.some((contact) => contact.id === ownAccountContact.id)) return contacts;
	return [...contacts, ownAccountContact];
}


async function updateOwnAccountContact(contactId, contact) {
	const userId = extractSelfUserId(contactId);
	if (!userId || !hasDb()) return;
	const payload = {
		name: contact?.name || '',
		email: contact?.email || '',
		phone: contact?.phone || '',
	};
	await db.ref(`users/${userId}`).update(payload);
}


async function fetchOwnAccountContactById(contactId) {
	const userId = extractSelfUserId(contactId);
	if (!userId || !hasDb()) return null;
	try {
		const snapshot = await db.ref(`users/${userId}`).get();
		const userProfile = snapshot.val();
		if (!userProfile) return null;
		return {
			name: userProfile.name || '',
			email: userProfile.email || '',
			phone: userProfile.phone || '',
		};
	} catch (error) {
		return null;
	}
}

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


function normalizeCachedContact(item) {
	return {
		id: item.id,
		name: item.name || '',
		email: item.email || '',
		phone: item.phone || '',
		createdAt: item.createdAt || 0,
	};
}


function isValidCachedContact(item) {
	return item && typeof item === 'object' && typeof item.id === 'string';
}


function parseContactsCache(rawValue) {
	const parsed = JSON.parse(rawValue);
	if (!Array.isArray(parsed)) return [];
	return parsed.filter(isValidCachedContact).map(normalizeCachedContact);
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
		return parseContactsCache(raw);
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
	if (isSelfContactId(contactId)) {
		await updateOwnAccountContact(contactId, contact);
		return;
	}
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


function normalizeAssignmentIdentity(entry) {
	if (typeof entry === 'string') return { id: entry, name: '', email: '' };
	if (!entry || typeof entry !== 'object') return { id: '', name: '', email: '' };
	return {
		id: String(entry.id || entry.userId || entry.contactId || ''),
		name: String(entry.name || ''),
		email: String(entry.email || ''),
	};
}


function assignmentMatchesDeletedContact(entry, contactId, contactData) {
	void contactData;
	const normalized = normalizeAssignmentIdentity(entry);
	return normalized.id && normalized.id === contactId;
}


function normalizeAssignedEntries(assignedRaw) {
	if (Array.isArray(assignedRaw)) return assignedRaw;
	if (assignedRaw && typeof assignedRaw === 'object') return Object.values(assignedRaw);
	return [];
}


function buildTaskAssignmentCleanupUpdates(tasks, contactId, contactData) {
	const updates = {};
	Object.entries(tasks || {}).forEach(([taskId, task]) => {
		const assignedEntries = normalizeAssignedEntries(task?.assignedTo);
		if (!assignedEntries.length) return;
		const filteredEntries = assignedEntries.filter(
			(entry) => !assignmentMatchesDeletedContact(entry, contactId, contactData)
		);
		if (filteredEntries.length === assignedEntries.length) return;
		updates[`tasks/${taskId}/assignedTo`] = filteredEntries;
	});
	return updates;
}


function applyTaskUsersCleanup(taskUsersMap, contactId, updates) {
	Object.entries(taskUsersMap || {}).forEach(([taskId, userMap]) => {
		if (!userMap || typeof userMap !== 'object' || !userMap[contactId]) return;
		const nextUserMap = { ...userMap };
		delete nextUserMap[contactId];
		updates[`taskUsers/${taskId}`] = Object.keys(nextUserMap).length ? nextUserMap : null;
	});
}


async function cleanupDeletedContactAssignments(contactId, contactData) {
	if (!hasDb() || !contactId) return;
	let tasks = {};
	let taskUsersMap = {};
	try {
		const [tasksSnapshot, taskUsersSnapshot] = await Promise.all([
			db.ref('tasks').get(),
			db.ref('taskUsers').get(),
		]);
		tasks = tasksSnapshot.val() || {};
		taskUsersMap = taskUsersSnapshot.val() || {};
	} catch (error) {
		return;
	}

	const updates = buildTaskAssignmentCleanupUpdates(tasks, contactId, contactData);
	applyTaskUsersCleanup(taskUsersMap, contactId, updates);
	if (!Object.keys(updates).length) return;
	await db.ref().update(updates);
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
	if (isSelfContactId(contactId)) return;
	const contactData = await fetchContact(contactId);
	if (hasDb()) {
		try {
			await cleanupDeletedContactAssignments(contactId, contactData);
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
	if (isSelfContactId(contactId)) {
		return fetchOwnAccountContactById(contactId);
	}
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


function toNormalizedContact(id, value) {
	return {
		id,
		name: value?.name || '',
		email: value?.email || '',
		phone: value?.phone || '',
		createdAt: value?.createdAt || 0,
	};
}


function mapContactsObjectToList(contactsMap) {
	return Object.entries(contactsMap || {}).map(([id, value]) => toNormalizedContact(id, value));
}


async function readContactsSource() {
	if (!hasDb()) return readLocalContactsMap();
	try {
		const snapshot = await db.ref('contacts').get();
		return snapshot.val() || {};
	} catch (error) {
		return readLocalContactsMap();
	}
}

/**
 * Fetches all contacts from Firebase.
 * @returns {Promise<Array<{id: string, name: string, email: string, phone: string, createdAt?: number}>>} Contact list.
 * @category Contacts
 * @subcategory Firebase Logic
 */
async function fetchContacts() {
	const contacts = await readContactsSource();
	const normalizedContacts = mapContactsObjectToList(contacts);
	const ownAccountContact = await fetchOwnAccountContact();
	const mergedContacts = mergeOwnAccountContact(normalizedContacts, ownAccountContact);
	const sortedContacts = sortContactsByName(mergedContacts);
	writeContactsCache(sortedContacts);
	return sortedContacts;
}


function areContactsEqualByFields(leftContact, rightContact) {
	if (!leftContact || !rightContact) return false;
	if (leftContact.id !== rightContact.id) return false;
	if (leftContact.name !== rightContact.name) return false;
	if (leftContact.email !== rightContact.email) return false;
	if (leftContact.phone !== rightContact.phone) return false;
	return (leftContact.createdAt || 0) === (rightContact.createdAt || 0);
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
		if (!areContactsEqualByFields(left[index], right[index])) return false;
	}
	return true;
}
