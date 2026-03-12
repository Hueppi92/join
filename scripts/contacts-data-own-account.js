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
