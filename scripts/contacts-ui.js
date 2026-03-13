let contactsState = [];
let selectedContactId = "";
/**
 * Creates the empty-state list entry shown when no contacts exist.
 * @returns {HTMLParagraphElement} Empty-state node.
 * @category Contacts
 * @subcategory UI & Init
 */
function createEmptyContactsListItem() {
  const empty = document.createElement("p");
  empty.className = "contact-item";
  empty.textContent = "No contacts yet.";
  return empty;
}


/**
 * Groups contacts by display letter for sectioned rendering.
 * @param {Array<{name?: string}>} contacts - Contact list.
 * @returns {Map<string, Array<object>>} Grouped contact map.
 * @category Contacts
 * @subcategory UI & Init
 */
function groupContactsByLetter(contacts) {
  return contacts.reduce((groups, contact) => {
    const groupLetter = getContactGroupLetter(contact.name);
    if (!groups.has(groupLetter)) groups.set(groupLetter, []);
    groups.get(groupLetter).push(contact);
    return groups;
  }, new Map());
}


/**
 * Creates the text block (name + email) for a list row.
 * @param {{id?: string, name?: string, email?: string}} contact - Contact data.
 * @returns {HTMLDivElement} Info block element.
 * @category Contacts
 * @subcategory UI & Init
 */
function createContactListInfo(contact) {
  const info = document.createElement("div");
  info.className = "contact-info";
  const name = createContactNameNode(contact);
  const email = document.createElement("span");
  email.className = "contact-email";
  email.textContent = contact.email || "";
  info.appendChild(name);
  info.appendChild(email);
  return info;
}


/**
 * Binds click and keyboard selection behavior to a contact row.
 * @param {HTMLElement} box - Clickable list item element.
 * @param {string} contactId - Contact id.
 * @category Contacts
 * @subcategory UI & Init
 */
function bindContactSelection(box, contactId) {
  box.addEventListener("click", () => selectContact(contactId));
  box.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectContact(contactId);
  });
}


/**
 * Creates the avatar node for a contact list row.
 * @param {{name?: string}} contact - Contact data.
 * @returns {HTMLDivElement} Avatar element.
 * @category Contacts
 * @subcategory UI & Init
 */
function createContactAvatarNode(contact) {
  const avatar = document.createElement("div");
  avatar.className = "contact-logo";
  avatar.style.background = getContactAvatarColor(contact.name);
  avatar.textContent = getContactInitials(contact.name);
  return avatar;
}


/**
 * Creates one interactive contact box for the list.
 * @param {{id: string, name?: string, email?: string}} contact - Contact data.
 * @returns {HTMLDivElement} Contact box element.
 * @category Contacts
 * @subcategory UI & Init
 */
function createContactBox(contact) {
  const box = document.createElement("div");
  box.className = "contact-box";
  box.setAttribute("role", "button");
  box.setAttribute("tabindex", "0");
  box.setAttribute("aria-label", `Open ${contact.name || "contact"}`);
  if (selectedContactId === contact.id) box.classList.add("is-selected");
  box.appendChild(createContactAvatarNode(contact));
  box.appendChild(createContactListInfo(contact));
  bindContactSelection(box, contact.id);
  return box;
}


/**
 * Wraps a contact box into a list item container.
 * @param {{id: string, name?: string, email?: string}} contact - Contact data.
 * @returns {HTMLDivElement} Contact list item.
 * @category Contacts
 * @subcategory UI & Init
 */
function createContactListItem(contact) {
  const item = document.createElement("div");
  item.className = "contact-item";
  item.appendChild(createContactBox(contact));
  return item;
}


/**
 * Normalizes and sorts incoming contacts for rendering.
 * @param {Array<{id: string, name: string, email: string, phone: string}>} contacts - Contact list input.
 * @returns {Array<{id: string, name: string, email: string, phone: string}>} Sorted contacts.
 * @category Contacts
 * @subcategory UI & Init
 */
function getSortedContactsInput(contacts) {
  return sortContactsByName(Array.isArray(contacts) ? contacts : []);
}


/**
 * Appends one grouped section (title + entries) to the list fragment.
 * @param {DocumentFragment} fragment - Target fragment.
 * @param {string} groupLetter - Group heading letter.
 * @param {Array<{id: string, name?: string, email?: string}>} groupContacts - Group contacts.
 * @category Contacts
 * @subcategory UI & Init
 */
function appendContactGroup(fragment, groupLetter, groupContacts) {
  const title = document.createElement("h3");
  title.className = "contact-group-title";
  title.textContent = groupLetter;
  fragment.appendChild(title);
  groupContacts.forEach((contact) =>
    fragment.appendChild(createContactListItem(contact)),
  );
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
  const listRef = document.getElementById("contact-list");
  if (!listRef) return;
  listRef.replaceChildren();
  const sortedContacts = getSortedContactsInput(contacts);
  if (!sortedContacts.length) {
    listRef.appendChild(createEmptyContactsListItem());
    return;
  }
  const fragment = document.createDocumentFragment();
  const groupedContacts = groupContactsByLetter(sortedContacts);
  groupedContacts.forEach((group, groupLetter) =>
    appendContactGroup(fragment, groupLetter, group),
  );
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
  if (
    !selectedContactId ||
    !contactsState.some((contact) => contact.id === selectedContactId)
  ) {
    selectedContactId = "";
  }
  renderContacts(contactsState);
  const selectedContact =
    contactsState.find((item) => item.id === selectedContactId) || null;
  renderContactDetails(selectedContact);
  setMobileContactActionMenuState(false);
  setMobileContactDetailsState(Boolean(selectedContact));
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
  if (
    !cachedContacts.length ||
    !areContactListsEqual(cachedContacts, freshContacts)
  ) {
    applyContactsState(freshContacts);
  }
}

