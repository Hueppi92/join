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
