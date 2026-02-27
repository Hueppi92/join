let contactsState = [];
let selectedContactId = "";
const SELF_CONTACT_ID_PREFIX = "self_";


function isOwnAccountContact(contact) {
  return contact?.id?.startsWith(SELF_CONTACT_ID_PREFIX);
}


function createYouBadgeNode() {
  const badge = document.createElement("span");
  badge.className = "contact-you-badge";
  badge.textContent = "(You)";
  badge.setAttribute("aria-label", "This is your account");
  return badge;
}


function createContactNameNode(contact) {
  const name = document.createElement("span");
  name.className = "contact-name";
  name.textContent = contact.name || "Unknown Contact";
  if (isOwnAccountContact(contact)) name.appendChild(createYouBadgeNode());
  return name;
}

/**
 * Returns initials for a contact name.
 * @param {string} name - Contact name.
 * @returns {string} Initials.
 * @category Contacts
 * @subcategory UI & Init
 */
function getContactInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "U";
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
  const normalizedName = String(name || "").trim();
  if (!normalizedName) return "#";
  const firstCharacter = normalizedName.charAt(0).toLocaleUpperCase("de-DE");
  return /[A-ZÄÖÜ]/.test(firstCharacter) ? firstCharacter : "#";
}

/**
 * Restarts the contact details slide-in animation.
 * @param {HTMLElement} detailsRef - Details container element.
 * @category Contacts
 * @subcategory UI & Init
 */
function animateContactDetails(detailsRef) {
  if (!detailsRef) return;
  detailsRef.classList.remove("is-entering");
  void detailsRef.offsetWidth;
  detailsRef.classList.add("is-entering");
}

function createContactDetailsPlaceholder() {
  const placeholder = document.createElement("p");
  placeholder.className = "contact-details-placeholder";
  placeholder.textContent = "Select a contact to view details.";
  return placeholder;
}

function createContactDetailsAction(label, iconPath, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "contact-details-action";
  button.innerHTML = `<img src="${iconPath}" alt="" aria-hidden="true"><span>${label}</span>`;
  button.addEventListener("click", onClick);
  return button;
}

function createContactDetailsActions(contact) {
  const actions = document.createElement("div");
  actions.className = "contact-details-actions";
  actions.appendChild(
    createContactDetailsAction("Edit", "../assets/icons/edit.svg", () =>
      openEditContactOverlay(contact.id, contact),
    ),
  );
  actions.appendChild(
    createContactDetailsAction(
      "Delete",
      "../assets/icons/delete.svg",
      async () => {
        await deleteContact(contact.id);
        await refreshContactsList();
      },
    ),
  );
  return actions;
}

function createContactDetailsProfile(contact) {
  const profile = document.createElement("div");
  profile.className = "contact-details-profile";
  const avatar = document.createElement("div");
  avatar.className = "contact-details-avatar";
  avatar.style.background = getContactAvatarColor(contact.name);
  avatar.textContent = getContactInitials(contact.name);
  profile.appendChild(avatar);
  profile.appendChild(createContactDetailsProfileInfo(contact));
  return profile;
}

function createContactDetailsProfileInfo(contact) {
  const profileInfo = document.createElement("div");
  profileInfo.className = "contact-details-profile-info";
  const name = document.createElement("h2");
  name.className = "contact-details-name";
  name.textContent = contact.name || "Unknown Contact";
  if (isOwnAccountContact(contact)) name.appendChild(createYouBadgeNode());
  profileInfo.appendChild(name);
  profileInfo.appendChild(createContactDetailsActions(contact));
  return profileInfo;
}

function createContactDetailsEmailNode(emailValue) {
  const emailNode = document.createElement(emailValue ? "a" : "p");
  emailNode.className = "contact-details-email";
  emailNode.textContent = emailValue || "-";
  if (emailValue) emailNode.href = `mailto:${emailValue}`;
  return emailNode;
}

function createContactDetailsLabel(text, className = "contact-details-label") {
  const label = document.createElement("p");
  label.className = className;
  label.textContent = text;
  return label;
}

function createContactDetailsInfo(contact) {
  const info = document.createElement("div");
  info.className = "contact-details-info";
  appendContactDetailsInfoContent(info, contact);
  return info;
}

function appendContactDetailsInfoContent(info, contact) {
  const emailValue = String(contact.email || "").trim();
  const phone = createContactDetailsLabel(
    contact.phone || "-",
    "contact-details-phone",
  );
  info.appendChild(
    createContactDetailsLabel(
      "Contact Information",
      "contact-details-info-title",
    ),
  );
  info.appendChild(createContactDetailsLabel("Email"));
  info.appendChild(createContactDetailsEmailNode(emailValue));
  info.appendChild(createContactDetailsLabel("Phone"));
  info.appendChild(phone);
}

function renderContactDetailsPlaceholder(detailsRef) {
  detailsRef.appendChild(createContactDetailsPlaceholder());
  scheduleContactDetailsSectionScrollabilitySync();
}

function renderContactDetailsContent(detailsRef, contact) {
  detailsRef.appendChild(createContactDetailsProfile(contact));
  detailsRef.appendChild(createContactDetailsInfo(contact));
}

/**
 * Renders selected contact details on the right side.
 * @param {{id: string, name: string, email: string, phone: string} | null} contact - Contact to render.
 * @param {{animate?: boolean}} [options] - Render options.
 * @category Contacts
 * @subcategory UI & Init
 */
function renderContactDetails(contact, options = {}) {
  const detailsRef = document.getElementById("contact-details");
  if (!detailsRef) return;
  detailsRef.replaceChildren();
  detailsRef.classList.remove("is-entering");
  if (!contact) {
    renderContactDetailsPlaceholder(detailsRef);
    return;
  }
  renderContactDetailsContent(detailsRef, contact);
  if (options.animate) {
    animateContactDetails(detailsRef);
  }
  scheduleContactDetailsSectionScrollabilitySync();
}

function createEmptyContactsListItem() {
  const empty = document.createElement("p");
  empty.className = "contact-item";
  empty.textContent = "No contacts yet.";
  return empty;
}

function groupContactsByLetter(contacts) {
  return contacts.reduce((groups, contact) => {
    const groupLetter = getContactGroupLetter(contact.name);
    if (!groups.has(groupLetter)) groups.set(groupLetter, []);
    groups.get(groupLetter).push(contact);
    return groups;
  }, new Map());
}

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

function bindContactSelection(box, contactId) {
  box.addEventListener("click", () => selectContact(contactId));
  box.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectContact(contactId);
  });
}

function createContactAvatarNode(contact) {
  const avatar = document.createElement("div");
  avatar.className = "contact-logo";
  avatar.style.background = getContactAvatarColor(contact.name);
  avatar.textContent = getContactInitials(contact.name);
  return avatar;
}

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

function createContactListItem(contact) {
  const item = document.createElement("div");
  item.className = "contact-item";
  item.appendChild(createContactBox(contact));
  return item;
}

function getSortedContactsInput(contacts) {
  return sortContactsByName(Array.isArray(contacts) ? contacts : []);
}

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
    selectedContactId = contactsState[0]?.id || "";
  }
  renderContacts(contactsState);
  const selectedContact =
    contactsState.find((item) => item.id === selectedContactId) || null;
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
  if (
    !cachedContacts.length ||
    !areContactListsEqual(cachedContacts, freshContacts)
  ) {
    applyContactsState(freshContacts);
  }
}

window.loadContacts = loadContacts;
