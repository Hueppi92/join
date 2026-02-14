// ERROR-MESSAGES

/**
 * Initializes validation behavior for a required input field.
 * Tracks whether the field has been focused and, on blur, toggles
 * an error state if the field is empty.
 *
 * @param {string} inputId - The ID of the input element to validate
 * @param {string} wrapperClass - The CSS selector of the wrapper element
 * used to display the error state
 * @returns {void}
 */
function setupRequiredField(inputId, wrapperClass) {
    let { input, wrapper } = getRequiredFieldElements(inputId, wrapperClass);
    if (!input || !wrapper) return;

    let wasFocused = false;

    input.addEventListener("focus", () => {
        wasFocused = true;
    });

    input.addEventListener("blur", () => {
        toggleRequiredError(input, wrapper, wasFocused);
    });
}

/**
 * Retrieves the DOM elements for a required input field (input + wrapper).
 * Returns both elements as an object so that other functions can safely
 * access and validate them.
 *
 * @param {string} inputId - The ID of the input element
 * @param {string} wrapperClass - The CSS selector of the wrapper element
 * @returns {{ input: HTMLElement|null, wrapper: HTMLElement|null }}
 * An object containing the input element and wrapper element
 */
function getRequiredFieldElements(inputId, wrapperClass) {
    let input = document.getElementById(inputId);
    let wrapper = document.querySelector(wrapperClass);

    if (!input || !wrapper) {
        console.warn("setupRequiredField: not found", { inputId, wrapperClass });
    }

    return { input, wrapper };
}

/**
 * Toggles the visual and accessibility error state for a required input field.
 * If the field was previously focused and is empty, an error class and
 * ARIA attributes are applied; otherwise, they are removed.
 *
 * @param {HTMLInputElement} input - The input element to validate
 * @param {HTMLElement} wrapper - The wrapper element that receives the error class
 * @param {boolean} wasFocused - Indicates whether the input has been focused before
 * @returns {void}
 */
function toggleRequiredError(input, wrapper, wasFocused) {
    if (wasFocused && input.value.trim() === "") {
        wrapper.classList.add("error");
        input.setAttribute("aria-invalid", "true");
        wrapper.setAttribute("aria-expanded", "true");
    } else {
        wrapper.classList.remove("error");
        input.removeAttribute("aria-invalid");
        wrapper.setAttribute("aria-expanded", "false");
    }
}

// PRIORITY-BUTTONS

/**
 * Initializes the priority button group behavior.
 * Ensures that only one priority button can be active at a time
 * by removing the "active" class from all buttons and applying it
 * to the clicked button.
 *
 * @returns {void}
 */
function prioBtnActiveToggle() {
    let prioButtons = document.querySelectorAll(".prio");
    prioButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            prioButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });
}

// CONTACTS

/**
 * Loads contacts from the database and initializes
 * the dropdown rendering and interaction listeners.
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
 * @returns {{ dropdown: HTMLElement|null, searchInput: HTMLInputElement|null }}
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
 * @returns {Promise<firebase.database.DataSnapshot>}
 */
function fetchUsers() {
    return firebase.database().ref("users").once("value");
}

/**
 * Renders the contact list inside the dropdown element.
 *
 * @param {firebase.database.DataSnapshot} snapshot - Firebase snapshot containing user records
 * @param {HTMLElement} dropdown - Dropdown container element
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
 * Creates a dropdown label element for a single contact entry.
 *
 * @param {firebase.database.DataSnapshot} child - Firebase child snapshot representing a user
 * @returns {HTMLLabelElement}
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
 * @param {string} name - Full user name
 * @returns {string} Uppercase initials (max 2 characters)
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
 * @param {string} id - User ID
 * @param {string} name - User name
 * @param {string} color - Avatar background color
 * @param {string} initials - Generated initials
 * @returns {string} HTML template string
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
 * Sets up interaction listeners for the contact dropdown
 * including focus handling and checkbox change behavior.
 *
 * @param {HTMLElement} dropdown - Dropdown container element
 * @param {HTMLInputElement} searchInput - Search input element
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
 * Updates the assigned contacts display inside the search input
 * based on currently selected checkbox entries.
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
 * Updates the assigned avatars display by rendering
 * avatar elements for all currently selected assigned users.
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
 * Retrieves all checked assigned user checkboxes
 * from the assigned contacts dropdown.
 *
 * @returns {NodeListOf<HTMLInputElement>} List of checked checkbox elements
 */
function getCheckedAssignedUsers() {
    return document.querySelectorAll(
        "#assignedDropdown input[type='checkbox']:checked"
    );
}

/**
 * Creates an avatar DOM element for a given assigned user checkbox.
 *
 * @param {HTMLInputElement} cb - Checkbox element containing user dataset information
 * @returns {HTMLDivElement} Generated avatar element
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

// CATEGORIES

/**
 * Loads the predefined task categories into the category select element.
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

// SUBTASK-LIST

/**
 * Initializes all subtask-related UI interactions such as adding,
 * editing, clearing, and keyboard handling for the subtask input.
 *
 * @returns {void}
 */
function setupSubtasks() {
    let input = document.getElementById("subtaskInput");
    let list = document.getElementById("subtaskList");
    let wrapper = input?.closest(".subtask_input");
    let addBtn = document.getElementById("subtaskAdd");
    let clearBtn = document.getElementById("subtaskClear");

    if (!input || !list) return;

    addBtn.addEventListener("click", () => handleAddSubtask(input, list, wrapper));
    clearBtn.addEventListener("click", () => clearSubtaskInput(input, wrapper));

    input.addEventListener("input", () => toggleSubtaskActions(input, wrapper));
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddSubtask(input, list, wrapper);
        }
    });
}

/**
 * Adds a new subtask item to the subtask list if the input contains text.
 *
 * @param {HTMLInputElement} input - The subtask text input element.
 * @param {HTMLElement} list - The subtask list container element.
 * @param {HTMLElement|null} wrapper - The wrapper element controlling UI state.
 * @returns {void}
 */
function handleAddSubtask(input, list, wrapper) {
    let value = input.value.trim();
    if (!value) return;

    let li = createSubtaskElement(value);
    list.appendChild(li);

    input.value = "";
    wrapper.classList.remove("has-text");
}

/**
 * Creates a DOM list item representing a subtask with edit and delete controls.
 *
 * @param {string} value - The subtask text.
 * @returns {HTMLLIElement} The created subtask list item element.
 */
function createSubtaskElement(value) {
    let li = document.createElement("li");

    li.innerHTML = `
        <span class="subtask_text">• ${value}</span>
        <div class="subtask_item_actions">
            <img src="../assets/icons/edit.svg" class="edit_btn">
            <div class="separator"></div>
            <img src="../assets/icons/delete.svg" class="delete_btn">
        </div>
    `;

    li.querySelector(".delete_btn").addEventListener("click", () => li.remove());
    li.querySelector(".edit_btn").addEventListener("click", () => activateEditMode(li));
    li.addEventListener("dblclick", () => activateEditMode(li));

    return li;
}

/**
 * Activates inline editing mode for a given subtask list item.
 *
 * @param {HTMLLIElement} li - The subtask list item element.
 * @returns {void}
 */
function activateEditMode(li) {
    li.classList.add("editing");

    let span = li.querySelector(".subtask_text");
    let old = span.textContent.replace("• ", "");

    span.innerHTML = `<input class="subtask_edit_input" value="${old}">`;

    let input = span.querySelector("input");
    input.focus();

    input.addEventListener("blur", () => finishSubtaskEdit(li, input));
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            input.blur();
        }
    });
}

/**
 * Finalizes editing of a subtask item and updates its displayed text.
 *
 * @param {HTMLLIElement} li - The subtask list item element.
 * @param {HTMLInputElement} input - The editing input element.
 * @returns {void}
 */
function finishSubtaskEdit(li, input) {
    let span = li.querySelector(".subtask_text");
    span.textContent = "• " + input.value.trim();
    li.classList.remove("editing");
}

/**
 * Clears the subtask input field and resets the UI wrapper state.
 *
 * @param {HTMLInputElement} input - The subtask input element.
 * @param {HTMLElement|null} wrapper - The wrapper controlling the UI state.
 * @returns {void}
 */
function clearSubtaskInput(input, wrapper) {
    input.value = "";
    wrapper.classList.remove("has-text");
}

/**
 * Toggles the visibility of subtask action controls depending on whether
 * the input field contains text.
 *
 * @param {HTMLInputElement} input - The subtask input element.
 * @param {HTMLElement|null} wrapper - The wrapper controlling the UI state.
 * @returns {void}
 */
function toggleSubtaskActions(input, wrapper) {
    wrapper.classList.toggle("has-text", input.value.trim().length > 0);
}

// CLEAR

/**
 * Initializes the "Clear" button behavior for the task editor.
 * When the button is clicked, the default form submission is prevented
 * and the entire task form is reset to its initial state.
 *
 * @returns {void}
 */
function setupClearButton() {
    let btn = document.querySelector(".clear_btn");

    btn.addEventListener("click", (e) => {
        e.preventDefault();
        resetTaskForm();
    });
}

// DATABASE

/**
 * Returns the currently selected priority value.
 * If no priority button is active, "medium" is returned as default.
 *
 * @returns {string} The active priority value ("urgent" | "medium" | "low")
 */
function getActivePriority() {
    let activeBtn = document.querySelector(".prio.active");
    return activeBtn ? activeBtn.dataset.prio : "medium";
}

/**
 * Retrieves all selected assigned users from the dropdown.
 *
 * @returns {{id: string, name: string}[]} Array of assigned user objects
 */
function getAssignedUsers() {
    let checked = document.querySelectorAll(
        "#assignedDropdown input[type='checkbox']:checked"
    );

    return Array.from(checked).map(cb => ({
        id: cb.dataset.userid,
        name: cb.dataset.username
    }));
}

/**
 * Initializes the assigned-user search dropdown behavior,
 * including open/close logic, filtering, and selection updates.
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
 * @param {HTMLElement} dropdown
 * @returns {void}
 */
function openAssignedDropdown(dropdown) {
    dropdown.classList.add("open");
    dropdown.closest(".select_native")?.classList.add("open");
}

/**
 * Closes the dropdown if the user clicks outside the wrapper.
 *
 * @param {MouseEvent} e
 * @param {HTMLElement} wrapper
 * @param {HTMLElement} dropdown
 * @returns {void}
 */
function handleAssignedOutsideClick(e, wrapper, dropdown) {
    if (!wrapper.contains(e.target)) {
        dropdown.classList.remove("open");
        wrapper.classList.remove("open");
    }
}

/**
 * Toggles assigned-user dropdown visibility.
 *
 * @param {HTMLElement} wrapper
 * @param {HTMLElement} dropdown
 * @returns {void}
 */
function toggleAssignedDropdown(wrapper, dropdown) {
    dropdown.classList.toggle("open");
    wrapper.classList.toggle("open");
}

/**
 * Filters dropdown contacts based on search input.
 *
 * @param {HTMLInputElement} searchInput
 * @param {HTMLElement} dropdown
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
 * Handles checkbox changes inside the assigned dropdown
 * and updates UI representations.
 *
 * @returns {void}
 */
function handleAssignedSelectionChange() {
    updateAssignedDisplay();
    updateAssignedAvatars();
}

/**
 * Initializes category dropdown behavior including toggling,
 * selection handling, and outside-click closing.
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
 * @param {HTMLElement} dropdown
 * @returns {void}
 */
function openCategoryDropdown(dropdown) {
    dropdown.classList.add("open");
    dropdown.closest(".select_native")?.classList.add("open");
}

/**
 * Selects a category and closes the dropdown.
 *
 * @param {HTMLElement} item
 * @param {HTMLInputElement} input
 * @param {HTMLElement} dropdown
 * @returns {void}
 */
function selectCategory(item, input, dropdown) {
    input.value = item.textContent;
    input.dataset.value = item.dataset.value;
    dropdown.classList.remove("open");
    dropdown.closest(".select_native")?.classList.remove("open");
}

/**
 * Handles closing category dropdown when clicking outside.
 *
 * @param {MouseEvent} e
 * @param {HTMLElement} wrapper
 * @param {HTMLElement} dropdown
 * @returns {void}
 */
function handleCategoryOutsideClick(e, wrapper, dropdown) {
    if (!wrapper.contains(e.target)) {
        dropdown.classList.remove("open");
        wrapper.classList.remove("open");
    }
}

/**
 * Toggles category dropdown visibility.
 *
 * @param {HTMLElement} wrapper
 * @param {HTMLElement} dropdown
 * @returns {void}
 */
function toggleCategoryDropdown(wrapper, dropdown) {
    dropdown.classList.toggle("open");
    wrapper.classList.toggle("open");
}

/**
 * Collects all subtasks currently listed in the editor.
 *
 * @returns {{id: string, title: string, completed: boolean}[]}
 */
function getSubtasks() {
    let items = document.querySelectorAll("#subtaskList li span");

    return Array.from(items).map(span => ({
        id: crypto.randomUUID(),
        title: span.textContent.trim(),
        completed: false
    }));
}

/**
 * Saves a task object to Firebase Realtime Database.
 *
 * @param {Object} task
 * @returns {Promise<void>}
 */
function saveTaskToFirebase(task) {
    let taskRef = firebase.database().ref("tasks").push();
    return taskRef.set(task);
}

/**
 * Initializes the "Create Task" button click behavior.
 *
 * @returns {void}
 */
function setupCreateTaskButton() {
    let btn = document.querySelector(".create_btn");
    let form = document.getElementById("taskForm");

    btn.addEventListener("click", e => handleCreateTaskClick(e, form));
}

/**
 * Handles task creation button click,
 * validates the form, and triggers saving.
 *
 * @param {Event} e
 * @param {HTMLFormElement} form
 * @returns {void}
 */
function handleCreateTaskClick(e, form) {
    e.preventDefault();

    if (!form.reportValidity()) return;

    let task = buildTaskObject();

    saveTaskToFirebase(task)
        .then(handleTaskCreatedSuccess)
        .catch(handleFirebaseError);
}

/**
 * Builds the task object from current form values.
 *
 * @returns {Object} Task data object
 */
function buildTaskObject() {
    return {
        title: document.getElementById("titleInput").value.trim(),
        description: document.querySelector("textarea").value.trim(),
        dueDate: document.getElementById("dateInput").value.trim(),
        priority: getActivePriority(),
        category: document.getElementById("categoryInput")?.dataset.value || "",
        assignedTo: getAssignedUsers(),
        subtasks: getSubtasks(),
        status: "todo",
        createdAt: Date.now()
    };
}

/**
 * Handles successful task creation workflow.
 *
 * @returns {void}
 */
function handleTaskCreatedSuccess() {
    closeAddTaskModal();
    showTaskSuccessToast();
    redirectToBoardAfterDelay();
}

/**
 * Displays the task creation success toast notification.
 *
 * @returns {void}
 */
function showTaskSuccessToast() {
    let toast = document.getElementById("taskSuccessToast");
    toast.classList.add("show");
    document.body.style.pointerEvents = "none";
}

/**
 * Redirects the user to the task board after a short delay.
 *
 * @returns {void}
 */
function redirectToBoardAfterDelay() {
    setTimeout(() => {
        window.location.href = "./taskboard.html";
    }, 2200);
}

/**
 * Handles Firebase save errors by logging them.
 *
 * @param {Error} err
 * @returns {void}
 */
function handleFirebaseError(err) {
    console.error("Firebase error:", err);
}

// RESET

/**
 * Resets the entire task form by calling all individual reset helpers.
 *
 * @returns {void}
 */
function resetTaskForm() {
    resetBasicInputs();
    resetCategory();
    resetAssignedUsers();
    resetSubtasks();
    resetPriority();
    resetErrorStates();
}


/**
 * Clears basic text inputs such as title, date, and description.
 *
 * @returns {void}
 */
function resetBasicInputs() {
    document.getElementById("titleInput").value = "";
    document.getElementById("dateInput").value = "";
    document.querySelector("textarea").value = "";
}

/**
 * Resets the selected category field and its stored dataset value.
 *
 * @returns {void}
 */
function resetCategory() {
    let categoryInput = document.getElementById("categoryInput");
    if (!categoryInput) return;

    categoryInput.value = "";
    categoryInput.dataset.value = "";
}

/**
 * Clears all assigned users, unchecks all checkboxes,
 * and removes displayed avatar indicators.
 *
 * @returns {void}
 */
function resetAssignedUsers() {
    document.getElementById("assignedSearch").value = "";

    document.querySelectorAll("#assignedDropdown input[type='checkbox']")
        .forEach(cb => cb.checked = false);

    document.getElementById("assignedAvatars").innerHTML = "";
}

/**
 * Removes all subtasks and clears the subtask input field.
 *
 * @returns {void}
 */
function resetSubtasks() {
    document.getElementById("subtaskList").innerHTML = "";

    let subtaskInput = document.getElementById("subtaskInput");
    if (!subtaskInput) return;

    subtaskInput.value = "";
    subtaskInput.closest(".subtask_input")?.classList.remove("has-text");
}

/**
 * Resets priority selection to default ("medium").
 *
 * @returns {void}
 */
function resetPriority() {
    document.querySelectorAll(".prio").forEach(b => b.classList.remove("active"));
    document.querySelector('.prio[data-prio="medium"]')?.classList.add("active");
}

/**
 * Removes validation error states from all form rows.
 *
 * @returns {void}
 */
function resetErrorStates() {
    document.querySelectorAll(".left_row").forEach(r => r.classList.remove("error"));
}

// MODAL

/**
 * Opens the "Add Task" modal and starts the opening animation.
 * Clears any pending close timeout to prevent accidental hiding.
 * Also updates the aria-hidden attribute for accessibility.
 *
 * @returns {void}
 */
function openAddTaskModal() {
    let modal = document.getElementById("addTaskModal");
    if (!modal) return;

    if (modal._closeTimeout) {
        clearTimeout(modal._closeTimeout);
        modal._closeTimeout = null;
    }

    modal.classList.remove("hidden");
    requestAnimationFrame(() => modal.classList.add("is-open"));
    modal.setAttribute("aria-hidden", "false");
}

/**
 * Closes the "Add Task" modal with animation and hides it after the
 * transition completes. Also updates the aria-hidden attribute.
 *
 * @returns {void}
 */
function closeAddTaskModal() {
    let modal = document.getElementById("addTaskModal");
    if (!modal) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (modal._closeTimeout) {
        clearTimeout(modal._closeTimeout);
    }

    modal._closeTimeout = setTimeout(() => {
        modal.classList.add("hidden");
        modal._closeTimeout = null;
    }, 600);
}

/**
 * Initializes modal control listeners for closing the modal.
 * Binds click handlers to the close button and the backdrop.
 *
 * @returns {void}
 */
function setupModalControls() {
    document.querySelector(".modal_close")?.addEventListener("click", closeAddTaskModal);
    document.querySelector(".modal_backdrop")?.addEventListener("click", closeAddTaskModal);
}

// INIT

/**
 * Initializes the entire Task Editor page by setting up all required
 * UI components, event listeners, dropdowns, and data sources.
 * This function prepares the form for user interaction.
 *
 * @returns {void}
 */
function loadTaskEditorPage() {
    setupRequiredField("titleInput", ".title_field");
    setupRequiredField("dateInput", ".date_field");
    prioBtnActiveToggle();
    setupAssignedSearch();
    setupCategoryDropdown();
    setupSubtasks();
    setupCreateTaskButton();
    setupClearButton();
    setupModalControls();

    loadContacts();
    loadCategories();
}

/**
 * Runs the Task Editor initialization after the DOM has fully loaded.
 */
document.addEventListener("DOMContentLoaded", () => {
    loadTaskEditorPage();
});
