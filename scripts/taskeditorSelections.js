// CONTACTS

/**
 * Loads contacts from the database and initializes the contact dropdown.
 * Fetches user records and renders them inside the dropdown while also
 * setting up the required interaction listeners.
 *
 * @returns {void}
 */
function loadContacts() {
    let { dropdown, searchInput } = getContactElements();
    if (!dropdown || !searchInput) return;

    fetchUsers().then(snapshot => {
        renderContacts(snapshot, dropdown);
    });

    setupContactDropdownListeners(dropdown, searchInput);
}

/**
 * Retrieves the DOM elements used by the assigned contacts dropdown.
 *
 * @returns {{dropdown: HTMLElement|null, searchInput: HTMLInputElement|null}} Object containing the dropdown and search input elements.
 */
function getContactElements() {
    return {
        dropdown: document.getElementById("assignedDropdown"),
        searchInput: document.getElementById("assignedSearch")
    };
}

/**
 * Fetches the list of users from Firebase Realtime Database.
 *
 * @returns {Promise<firebase.database.DataSnapshot>} Promise resolving with the users snapshot.
 */
function fetchUsers() {
    return firebase.database().ref("users").once("value");
}

/**
 * Renders the contact list inside the dropdown container.
 * Iterates over all user entries from the snapshot and
 * generates a dropdown item for each contact.
 *
 * @param {firebase.database.DataSnapshot} snapshot - Firebase snapshot containing user records.
 * @param {HTMLElement} dropdown - Dropdown container element where contacts will be rendered.
 * @returns {void}
 */
function renderContacts(snapshot, dropdown) {
    dropdown.innerHTML = "";
    snapshot.forEach(child => {
        let label = createContactLabel(child);
        dropdown.appendChild(label);
    });
}

/**
 * Creates a dropdown label element representing a single contact.
 *
 * @param {firebase.database.DataSnapshot} child - Firebase child snapshot representing a user.
 * @returns {HTMLLabelElement} Generated label element for the dropdown entry.
 */
function createContactLabel(child) {
    let user = child.val();
    let initials = getInitials(user.name);
    let color = user.color || getAvatarColorFromName(user.name);

    let label = document.createElement("label");
    label.className = "dropdown_item";
    label.dataset.username = user.name.toLowerCase();
    label.innerHTML = buildContactTemplate(child.key, user.name, color, initials);

    return label;
}

/**
 * Generates initials from a full name string.
 *
 * @param {string} name - Full name of the user.
 * @returns {string} Uppercase initials with a maximum length of two characters.
 */
function getInitials(name) {
    return name.split(" ")
        .map(n => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
}

/**
 * Builds the HTML template string for a contact dropdown entry.
 *
 * @param {string} id - Unique user ID.
 * @param {string} name - Name of the user.
 * @param {string} color - Avatar background color.
 * @param {string} initials - Generated initials displayed in the avatar.
 * @returns {string} HTML template string representing the dropdown item.
 */
function buildContactTemplate(id, name, color, initials) {
    return `
        <div class="dropdown_avatar" style="background-color:${color};">${initials}</div>
        <span>${name}</span>
        <input type="checkbox"
            data-userid="${id}"
            data-username="${name}"
            data-color="${color}">
    `;
}

/**
 * Sets up interaction listeners for the contact dropdown.
 * Handles focus behavior for opening the dropdown and updates
 * the selected state when a checkbox changes.
 *
 * @param {HTMLElement} dropdown - Dropdown container element.
 * @param {HTMLInputElement} searchInput - Search input element used for displaying selected contacts.
 * @returns {void}
 */
function setupContactDropdownListeners(dropdown, searchInput) {
    searchInput.addEventListener("focus", () => dropdown.classList.add("open"));

    dropdown.addEventListener("change", e => {
        let item = e.target.closest(".dropdown_item");
        if (!item) return;
        item.classList.toggle("selected", e.target.checked);
        updateAssignedDisplay();
    });
}

/**
 * Updates the assigned contacts display inside the search input.
 * Collects all selected checkbox entries and displays their names
 * as a comma-separated list.
 *
 * @returns {void}
 */
function updateAssignedDisplay() {
    let searchInput = document.getElementById("assignedSearch");
    let checked = document.querySelectorAll(
        "#assignedDropdown input[type='checkbox']:checked"
    );

    if (checked.length === 0) {
        searchInput.value = "";
        searchInput.placeholder = "Select contacts to assign";
        return;
    }

    let names = Array.from(checked).map(cb => cb.dataset.username);
    searchInput.value = names.join(", ");
}

// ASSIGNED AVATARS

/**
 * Updates the assigned avatars display.
 * Creates and renders avatar elements for all currently selected users.
 *
 * @returns {void}
 */
function updateAssignedAvatars() {
    let container = document.getElementById("assignedAvatars");
    let checked = getCheckedAssignedUsers();

    container.innerHTML = "";
    checked.forEach(cb => container.appendChild(createAvatar(cb)));
}

/**
 * Retrieves all selected assigned user checkboxes from the dropdown.
 *
 * @returns {NodeListOf<HTMLInputElement>} List of checked checkbox elements.
 */
function getCheckedAssignedUsers() {
    return document.querySelectorAll(
        "#assignedDropdown input[type='checkbox']:checked"
    );
}

/**
 * Creates an avatar element representing an assigned user.
 *
 * @param {HTMLInputElement} cb - Checkbox element containing user dataset information.
 * @returns {HTMLDivElement} Generated avatar element.
 */
function createAvatar(cb) {
    let name = cb.dataset.username;
    let initials = getInitials(name);
    let color = cb.dataset.color || getAvatarColorFromName(name);

    let avatar = document.createElement("div");
    avatar.className = "dropdown_avatar";
    avatar.textContent = initials;
    avatar.style.backgroundColor = color;

    return avatar;
}

/**
 * Filters the contacts inside the assigned dropdown based on the search input value.
 *
 * @param {HTMLInputElement} searchInput - Input element used to filter contacts.
 * @param {HTMLElement} dropdown - Dropdown container containing the contact entries.
 * @returns {void}
 */
function filterAssignedContacts(searchInput, dropdown) {
    let value = searchInput.value.trim().toLowerCase();

    dropdown.querySelectorAll(".dropdown_item").forEach(item => {
        let name = item.dataset.username;
        item.style.display = value === "" || name.includes(value) ? "flex" : "none";
    });
}

/**
 * Handles checkbox changes inside the assigned dropdown.
 * Updates both the assigned contact display and the avatar list.
 *
 * @returns {void}
 */
function handleAssignedSelectionChange() {
    updateAssignedDisplay();
    updateAssignedAvatars();
}

/**
 * Initializes the assigned-user search dropdown behavior.
 * Handles dropdown toggling, outside-click closing, contact filtering,
 * and updates when user selections change.
 *
 * @returns {void}
 */
function setupAssignedSearch() {
    let wrapper = document.getElementById("assignedSelect");
    let searchInput = document.getElementById("assignedSearch");
    let dropdown = document.getElementById("assignedDropdown");

    if (!searchInput || !dropdown) return;

    wrapper.addEventListener("click", (e) => {e.stopPropagation();toggleAssignedDropdown(wrapper, dropdown);searchInput.focus();});
    document.addEventListener("click", e => handleAssignedOutsideClick(e, wrapper, dropdown));
    searchInput.addEventListener("input", () => filterAssignedContacts(searchInput, dropdown));
    dropdown.addEventListener("change", handleAssignedSelectionChange);
}

/**
 * Opens the assigned-user dropdown.
 *
 * @param {HTMLElement} dropdown - Dropdown element that should be opened.
 * @returns {void}
 */
function openAssignedDropdown(dropdown) {
    dropdown.classList.add("open");
    dropdown.closest(".select_native")?.classList.add("open");
}

/**
 * Closes the assigned-user dropdown when a click occurs outside the wrapper.
 *
 * @param {MouseEvent} e - Click event triggered on the document.
 * @param {HTMLElement} wrapper - Wrapper element containing the dropdown.
 * @param {HTMLElement} dropdown - Dropdown element to close.
 * @returns {void}
 */
function handleAssignedOutsideClick(e, wrapper, dropdown) {
    if (!wrapper.contains(e.target)) {
        dropdown.classList.remove("open");
        wrapper.classList.remove("open");
    }
}

/**
 * Toggles the visibility state of the assigned-user dropdown.
 *
 * @param {HTMLElement} wrapper - Wrapper element controlling the dropdown state.
 * @param {HTMLElement} dropdown - Dropdown element whose visibility is toggled.
 * @returns {void}
 */
function toggleAssignedDropdown(wrapper, dropdown) {
    dropdown.classList.toggle("open");
    wrapper.classList.toggle("open");
}

// Category

/**
 * Loads predefined task categories into the category select element.
 * If the select element is not present, the function exits silently.
 *
 * @returns {void}
 */
function loadCategories() {
    let select = document.getElementById("categorySelect");
    if (!select) return;

    let categories = [
        { id: "user-story", label: "User Story" },
        { id: "technical-task", label: "Technical Task" },
    ];

    categories.forEach(cat => {
        let option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.label;
        select.appendChild(option);
    });
}

/**
 * Initializes the category dropdown behavior.
 * Sets up toggling, category selection, and closing the dropdown on outside clicks.
 *
 * @returns {void}
 */
function setupCategoryDropdown() {
    let wrapper = document.getElementById("categorySelectWrapper");
    let input = document.getElementById("categoryInput");
    let dropdown = document.getElementById("categoryDropdown");

    if (!wrapper || !input || !dropdown) return;

    wrapper.addEventListener("click", (e) => {e.stopPropagation();toggleCategoryDropdown(wrapper, dropdown);input.focus();});

    dropdown.querySelectorAll(".dropdown_item")
        .forEach(item => item.addEventListener("click", () => selectCategory(item, input, dropdown)));

    document.addEventListener("click", e =>
        handleCategoryOutsideClick(e, wrapper, dropdown)
    );
}

/**
 * Opens the category dropdown.
 *
 * @param {HTMLElement} dropdown - Dropdown element that should be opened.
 * @returns {void}
 */
function openCategoryDropdown(dropdown) {
    dropdown.classList.add("open");
    dropdown.closest(".select_native")?.classList.add("open");
}

/**
 * Selects a category from the dropdown and updates the input field.
 * After selection, the dropdown is closed.
 *
 * @param {HTMLElement} item - Dropdown item representing the selected category.
 * @param {HTMLInputElement} input - Input element displaying the selected category.
 * @param {HTMLElement} dropdown - Dropdown element that will be closed.
 * @returns {void}
 */
function selectCategory(item, input, dropdown) {
    input.value = item.textContent;
    input.dataset.value = item.dataset.value;
    dropdown.classList.remove("open");
    dropdown.closest(".select_native")?.classList.remove("open");
}

/**
 * Handles closing the category dropdown when a click occurs outside the wrapper.
 *
 * @param {MouseEvent} e - Click event triggered on the document.
 * @param {HTMLElement} wrapper - Wrapper element containing the dropdown.
 * @param {HTMLElement} dropdown - Dropdown element that should be closed.
 * @returns {void}
 */
function handleCategoryOutsideClick(e, wrapper, dropdown) {
    if (!wrapper.contains(e.target)) {
        dropdown.classList.remove("open");
        wrapper.classList.remove("open");
    }
}

/**
 * Toggles the visibility state of the category dropdown.
 *
 * @param {HTMLElement} wrapper - Wrapper element controlling the dropdown state.
 * @param {HTMLElement} dropdown - Dropdown element whose visibility is toggled.
 * @returns {void}
 */
function toggleCategoryDropdown(wrapper, dropdown) {
    dropdown.classList.toggle("open");
    wrapper.classList.toggle("open");
}