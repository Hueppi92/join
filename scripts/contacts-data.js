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

/**
 * Builds the synthetic contact id used for own-account contacts.
 * @param {string} userId - Firebase user id.
 * @returns {string} Own-account contact id.
 * @category Contacts
 * @subcategory Data Handling
 */
function createSelfContactId(userId) {
	return `${SELF_CONTACT_PREFIX}${userId}`;
}

/**
 * Checks whether a contact id belongs to an own-account contact.
 * @param {string} contactId - Contact id.
 * @returns {boolean} True when id uses the own-account prefix.
 * @category Contacts
 * @subcategory Validation
 */
function isSelfContactId(contactId) {
	return typeof contactId === 'string' && contactId.startsWith(SELF_CONTACT_PREFIX);
}

/**
 * Extracts the Firebase user id from an own-account contact id.
 * @param {string} contactId - Contact id.
 * @returns {string} User id or an empty string.
 * @category Contacts
 * @subcategory Data Handling
 */
function extractSelfUserId(contactId) {
	if (!isSelfContactId(contactId)) return '';
	return contactId.slice(SELF_CONTACT_PREFIX.length);
}

/**
 * Resolves the current user id for contacts data operations.
 * @returns {Promise<string | null>} Current user id when available.
 * @category Contacts
 * @subcategory Firebase Logic
 */
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

/**
 * Maps a user profile into a synthetic own-account contact object.
 * @param {string} userId - Firebase user id.
 * @param {{name?: string, email?: string, phone?: string, createdAt?: number} | null} userProfile - User profile data.
 * @returns {{id: string, name: string, email: string, phone: string, createdAt: number}} Own-account contact.
 * @category Contacts
 * @subcategory Data Handling
 */
function toOwnAccountContact(userId, userProfile) {
	return {
		id: createSelfContactId(userId),
		name: userProfile?.name || '',
		email: userProfile?.email || '',
		phone: userProfile?.phone || '',
		createdAt: userProfile?.createdAt || 0,
	};
}

/**
 * Fetches the current user's profile as a contact-like entry.
 * @returns {Promise<{id: string, name: string, email: string, phone: string, createdAt: number} | null>} Own-account contact.
 * @category Contacts
 * @subcategory Firebase Logic
 */
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

/**
 * Appends own-account contact when not already present.
 * @param {Array<{id: string}>} contacts - Contact list.
 * @param {{id: string} | null} ownAccountContact - Own-account contact.
 * @returns {Array<{id: string}>} Merged contact list.
 * @category Contacts
 * @subcategory Data Handling
 */
function mergeOwnAccountContact(contacts, ownAccountContact) {
	if (!ownAccountContact) return contacts;
	if (contacts.some((contact) => contact.id === ownAccountContact.id)) return contacts;
	return [...contacts, ownAccountContact];
}

/**
 * Updates the user profile behind an own-account contact.
 * @param {string} contactId - Own-account contact id.
 * @param {{name?: string, email?: string, phone?: string}} contact - Updated contact values.
 * @returns {Promise<void>} Resolves after update.
 * @category Contacts
 * @subcategory Firebase Logic
 */
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

/**
 * Fetches own-account contact fields by synthetic contact id.
 * @param {string} contactId - Own-account contact id.
 * @returns {Promise<{name: string, email: string, phone: string} | null>} Contact data.
 * @category Contacts
 * @subcategory Firebase Logic
 */
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

/**
 * Normalizes one cached contact item.
 * @param {{id: string, name?: string, email?: string, phone?: string, createdAt?: number}} item - Cached contact item.
 * @returns {{id: string, name: string, email: string, phone: string, createdAt: number}} Normalized cached contact.
 * @category Contacts
 * @subcategory Data Handling
 */
function normalizeCachedContact(item) {
	return {
		id: item.id,
		name: item.name || '',
		email: item.email || '',
		phone: item.phone || '',
		createdAt: item.createdAt || 0,
	};
}

/**
 * Validates whether an unknown item can be treated as cached contact data.
 * @param {unknown} item - Candidate cache item.
 * @returns {boolean} True when item contains a string id.
 * @category Contacts
 * @subcategory Validation
 */
function isValidCachedContact(item) {
	return item && typeof item === 'object' && typeof item.id === 'string';
}

/**
 * Parses serialized contact cache into normalized list data.
 * @param {string} rawValue - Serialized cache string.
 * @returns {Array<{id: string, name: string, email: string, phone: string, createdAt: number}>} Parsed contacts.
 * @category Contacts
 * @subcategory Data Handling
 */
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

/**
 * Normalizes assignment entries from task assignment structures.
 * @param {unknown} entry - Raw assignment entry.
 * @returns {{id: string, name: string, email: string}} Normalized identity.
 * @category Contacts
 * @subcategory Data Handling
 */
function normalizeAssignmentIdentity(entry) {
	if (typeof entry === 'string') return { id: entry, name: '', email: '' };
	if (!entry || typeof entry !== 'object') return { id: '', name: '', email: '' };
	return {
		id: String(entry.id || entry.userId || entry.contactId || ''),
		name: String(entry.name || ''),
		email: String(entry.email || ''),
	};
}

/**
 * Checks whether an assignment entry references a deleted contact.
 * @param {unknown} entry - Assignment entry.
 * @param {string} contactId - Deleted contact id.
 * @param {{name?: string, email?: string, phone?: string} | null} contactData - Deleted contact data.
 * @returns {boolean} True when entry matches deleted contact id.
 * @category Contacts
 * @subcategory Validation
 */
function assignmentMatchesDeletedContact(entry, contactId, contactData) {
	void contactData;
	const normalized = normalizeAssignmentIdentity(entry);
	return normalized.id && normalized.id === contactId;
}

/**
 * Normalizes assigned entries from array/object task structures.
 * @param {unknown} assignedRaw - Raw task assignment data.
 * @returns {unknown[]} Normalized assignment list.
 * @category Contacts
 * @subcategory Data Handling
 */
function normalizeAssignedEntries(assignedRaw) {
	if (Array.isArray(assignedRaw)) return assignedRaw;
	if (assignedRaw && typeof assignedRaw === 'object') return Object.values(assignedRaw);
	return [];
}

/**
 * Builds Firebase update paths to remove a deleted contact from task assignments.
 * @param {Record<string, {assignedTo?: unknown}>} tasks - Tasks map.
 * @param {string} contactId - Deleted contact id.
 * @param {{name?: string, email?: string, phone?: string} | null} contactData - Deleted contact data.
 * @returns {Record<string, unknown>} Firebase update map.
 * @category Contacts
 * @subcategory Data Handling
 */
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

/**
 * Removes a deleted contact from taskUsers map updates.
 * @param {Record<string, Record<string, unknown>>} taskUsersMap - taskUsers map.
 * @param {string} contactId - Deleted contact id.
 * @param {Record<string, unknown>} updates - Mutable Firebase updates object.
 * @category Contacts
 * @subcategory Data Handling
 */
function applyTaskUsersCleanup(taskUsersMap, contactId, updates) {
	Object.entries(taskUsersMap || {}).forEach(([taskId, userMap]) => {
		if (!userMap || typeof userMap !== 'object' || !userMap[contactId]) return;
		const nextUserMap = { ...userMap };
		delete nextUserMap[contactId];
		updates[`taskUsers/${taskId}`] = Object.keys(nextUserMap).length ? nextUserMap : null;
	});
}

/**
 * Removes deleted contact references from tasks and taskUsers.
 * @param {string} contactId - Deleted contact id.
 * @param {{name?: string, email?: string, phone?: string} | null} contactData - Deleted contact data.
 * @returns {Promise<void>} Resolves after cleanup updates are written.
 * @category Contacts
 * @subcategory Firebase Logic
 */
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

/**
 * Normalizes one contact map entry to render-safe fields.
 * @param {string} id - Contact id.
 * @param {{name?: string, email?: string, phone?: string, createdAt?: number}} value - Raw contact value.
 * @returns {{id: string, name: string, email: string, phone: string, createdAt: number}} Normalized contact.
 * @category Contacts
 * @subcategory Data Handling
 */
function toNormalizedContact(id, value) {
	return {
		id,
		name: value?.name || '',
		email: value?.email || '',
		phone: value?.phone || '',
		createdAt: value?.createdAt || 0,
	};
}

/**
 * Converts a contact map object into list form.
 * @param {Record<string, {name?: string, email?: string, phone?: string, createdAt?: number}>} contactsMap - Contacts map.
 * @returns {Array<{id: string, name: string, email: string, phone: string, createdAt: number}>} Contact list.
 * @category Contacts
 * @subcategory Data Handling
 */
function mapContactsObjectToList(contactsMap) {
	return Object.entries(contactsMap || {}).map(([id, value]) => toNormalizedContact(id, value));
}

/**
 * Reads contacts from Firebase or falls back to local storage.
 * @returns {Promise<Record<string, {name?: string, email?: string, phone?: string, createdAt?: number}>>} Contacts map.
 * @category Contacts
 * @subcategory Firebase Logic
 */
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

/**
 * Compares two contacts by rendered fields.
 * @param {{id: string, name: string, email: string, phone: string, createdAt?: number}} leftContact - First contact.
 * @param {{id: string, name: string, email: string, phone: string, createdAt?: number}} rightContact - Second contact.
 * @returns {boolean} True when contacts are equal by relevant fields.
 * @category Contacts
 * @subcategory Validation
 */
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
