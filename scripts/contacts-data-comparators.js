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
