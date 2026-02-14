// Error-Message
function setupRequiredField(inputId, wrapperClass) {
    const { input, wrapper } = getRequiredFieldElements(inputId, wrapperClass);
    if (!input || !wrapper) return;

    let wasFocused = false;

    input.addEventListener("focus", () => {
        wasFocused = true;
    });

    input.addEventListener("blur", () => {
        toggleRequiredError(input, wrapper, wasFocused);
    });
}

function getRequiredFieldElements(inputId, wrapperClass) {
    let input = document.getElementById(inputId);
    let wrapper = document.querySelector(wrapperClass);

    if (!input || !wrapper) {
        console.warn("setupRequiredField: not found", { inputId, wrapperClass });
    }

    return { input, wrapper };
}

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
function loadContacts() {
    const { dropdown, searchInput } = getContactElements();
    if (!dropdown || !searchInput) return;

    fetchUsers().then(snapshot => {
        renderContacts(snapshot, dropdown);
    });

    setupContactDropdownListeners(dropdown, searchInput);
}

function getContactElements() {
    return {
        dropdown: document.getElementById("assignedDropdown"),
        searchInput: document.getElementById("assignedSearch")
    };
}

function fetchUsers() {
    return firebase.database().ref("users").once("value");
}

function renderContacts(snapshot, dropdown) {
    dropdown.innerHTML = "";
    snapshot.forEach(child => {
        const label = createContactLabel(child);
        dropdown.appendChild(label);
    });
}

function createContactLabel(child) {
    const user = child.val();
    const initials = getInitials(user.name);
    const color = user.color || getAvatarColorFromName(user.name);

    const label = document.createElement("label");
    label.className = "dropdown_item";
    label.dataset.username = user.name.toLowerCase();
    label.innerHTML = buildContactTemplate(child.key, user.name, color, initials);

    return label;
}

function getInitials(name) {
    return name.split(" ")
        .map(n => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
}

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

function setupContactDropdownListeners(dropdown, searchInput) {
    searchInput.addEventListener("focus", () => dropdown.classList.add("open"));

    dropdown.addEventListener("change", e => {
        const item = e.target.closest(".dropdown_item");
        if (!item) return;
        item.classList.toggle("selected", e.target.checked);
        updateAssignedDisplay();
    });
}

function updateAssignedDisplay() {
    const searchInput = document.getElementById("assignedSearch");
    const checked = document.querySelectorAll(
        "#assignedDropdown input[type='checkbox']:checked"
    );

    if (checked.length === 0) {
        searchInput.value = "";
        searchInput.placeholder = "Select contacts to assign";
        return;
    }

    const names = Array.from(checked).map(cb => cb.dataset.username);
    searchInput.value = names.join(", ");
}

// ASSIGNED AVATARS
function updateAssignedAvatars() {
    const container = document.getElementById("assignedAvatars");
    const checked = getCheckedAssignedUsers();

    container.innerHTML = "";
    checked.forEach(cb => container.appendChild(createAvatar(cb)));
}

function getCheckedAssignedUsers() {
    return document.querySelectorAll(
        "#assignedDropdown input[type='checkbox']:checked"
    );
}

function createAvatar(cb) {
    const name = cb.dataset.username;
    const initials = getInitials(name);
    const color = cb.dataset.color || getAvatarColorFromName(name);

    const avatar = document.createElement("div");
    avatar.className = "dropdown_avatar";
    avatar.textContent = initials;
    avatar.style.backgroundColor = color;

    return avatar;
}

// CATEGORIES
function loadCategories() {
    const select = document.getElementById("categorySelect");
    if (!select) return;

    const categories = [
        { id: "user-story", label: "User Story" },
        { id: "technical-task", label: "Technical Task" },
    ];

    categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.label;
        select.appendChild(option);
    });
}

// SUBTASK-LIST
function setupSubtasks() {
    const input = document.getElementById("subtaskInput");
    const list = document.getElementById("subtaskList");
    const wrapper = input?.closest(".subtask_input");
    const addBtn = document.getElementById("subtaskAdd");
    const clearBtn = document.getElementById("subtaskClear");

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

function handleAddSubtask(input, list, wrapper) {
    const value = input.value.trim();
    if (!value) return;

    const li = createSubtaskElement(value);
    list.appendChild(li);

    input.value = "";
    wrapper.classList.remove("has-text");
}

function createSubtaskElement(value) {
    const li = document.createElement("li");

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

function activateEditMode(li) {
    li.classList.add("editing");

    const span = li.querySelector(".subtask_text");
    const old = span.textContent.replace("• ", "");

    span.innerHTML = `<input class="subtask_edit_input" value="${old}">`;

    const input = span.querySelector("input");
    input.focus();

    input.addEventListener("blur", () => finishSubtaskEdit(li, input));
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            input.blur();
        }
    });
}

function finishSubtaskEdit(li, input) {
    const span = li.querySelector(".subtask_text");
    span.textContent = "• " + input.value.trim();
    li.classList.remove("editing");
}

function clearSubtaskInput(input, wrapper) {
    input.value = "";
    wrapper.classList.remove("has-text");
}

function toggleSubtaskActions(input, wrapper) {
    wrapper.classList.toggle("has-text", input.value.trim().length > 0);
}

// CLEAR
function setupClearButton() {
    let btn = document.querySelector(".clear_btn");

    btn.addEventListener("click", (e) => {
        e.preventDefault();
        resetTaskForm();
    });
}

// DATABASE
function getActivePriority() {
    let activeBtn = document.querySelector(".prio.active");
    return activeBtn ? activeBtn.dataset.prio : "medium";
}

function getAssignedUsers() {
    let checked = document.querySelectorAll(
        "#assignedDropdown input[type='checkbox']:checked"
    );

    return Array.from(checked).map(cb => ({
        id: cb.dataset.userid,
        name: cb.dataset.username
    }));
}

function setupAssignedSearch() {
    const wrapper = document.getElementById("assignedSelect");
    const searchInput = document.getElementById("assignedSearch");
    const dropdown = document.getElementById("assignedDropdown");

    if (!searchInput || !dropdown) return;

    wrapper.addEventListener("click", (e) => {e.stopPropagation();toggleAssignedDropdown(wrapper, dropdown);searchInput.focus();});
    document.addEventListener("click", e => handleAssignedOutsideClick(e, wrapper, dropdown));
    searchInput.addEventListener("input", () => filterAssignedContacts(searchInput, dropdown));
    dropdown.addEventListener("change", handleAssignedSelectionChange);
}

function openAssignedDropdown(dropdown) {
    dropdown.classList.add("open");
    dropdown.closest(".select_native")?.classList.add("open");
}

function handleAssignedOutsideClick(e, wrapper, dropdown) {
    if (!wrapper.contains(e.target)) {
        dropdown.classList.remove("open");
        wrapper.classList.remove("open");
    }
}

function toggleAssignedDropdown(wrapper, dropdown) {
    dropdown.classList.toggle("open");
    wrapper.classList.toggle("open");
}

function filterAssignedContacts(searchInput, dropdown) {
    const value = searchInput.value.trim().toLowerCase();

    dropdown.querySelectorAll(".dropdown_item").forEach(item => {
        const name = item.dataset.username;
        item.style.display = value === "" || name.includes(value) ? "flex" : "none";
    });
}

function handleAssignedSelectionChange() {
    updateAssignedDisplay();
    updateAssignedAvatars();
}

function setupCategoryDropdown() {
    const wrapper = document.getElementById("categorySelectWrapper");
    const input = document.getElementById("categoryInput");
    const dropdown = document.getElementById("categoryDropdown");

    if (!wrapper || !input || !dropdown) return;

    wrapper.addEventListener("click", (e) => {e.stopPropagation();toggleCategoryDropdown(wrapper, dropdown);input.focus();});

    dropdown.querySelectorAll(".dropdown_item")
        .forEach(item => item.addEventListener("click", () => selectCategory(item, input, dropdown)));

    document.addEventListener("click", e =>
        handleCategoryOutsideClick(e, wrapper, dropdown)
    );
}

function openCategoryDropdown(dropdown) {
    dropdown.classList.add("open");
    dropdown.closest(".select_native")?.classList.add("open");
}

function selectCategory(item, input, dropdown) {
    input.value = item.textContent;
    input.dataset.value = item.dataset.value;
    dropdown.classList.remove("open");
    dropdown.closest(".select_native")?.classList.remove("open");
}

function handleCategoryOutsideClick(e, wrapper, dropdown) {
    if (!wrapper.contains(e.target)) {
        dropdown.classList.remove("open");
        wrapper.classList.remove("open");
    }
}

function toggleCategoryDropdown(wrapper, dropdown) {
    dropdown.classList.toggle("open");
    wrapper.classList.toggle("open");
}

function getSubtasks() {
    let items = document.querySelectorAll("#subtaskList li span");

    return Array.from(items).map(span => ({
        id: crypto.randomUUID(),
        title: span.textContent.trim(),
        completed: false
    }));
}

function saveTaskToFirebase(task) {
    let taskRef = firebase.database().ref("tasks").push();
    return taskRef.set(task);
}

function setupCreateTaskButton() {
    const btn = document.querySelector(".create_btn");
    const form = document.getElementById("taskForm");

    btn.addEventListener("click", e => handleCreateTaskClick(e, form));
}

function handleCreateTaskClick(e, form) {
    e.preventDefault();

    if (!form.reportValidity()) return;

    const task = buildTaskObject();

    saveTaskToFirebase(task)
        .then(handleTaskCreatedSuccess)
        .catch(handleFirebaseError);
}

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

function handleTaskCreatedSuccess() {
    closeAddTaskModal();
    showTaskSuccessToast();
    redirectToBoardAfterDelay();
}

function showTaskSuccessToast() {
    const toast = document.getElementById("taskSuccessToast");
    toast.classList.add("show");
    document.body.style.pointerEvents = "none";
}

function redirectToBoardAfterDelay() {
    setTimeout(() => {
        window.location.href = "./taskboard.html";
    }, 2200);
}

function handleFirebaseError(err) {
    console.error("Firebase error:", err);
}

// RESET
function resetTaskForm() {
    resetBasicInputs();
    resetCategory();
    resetAssignedUsers();
    resetSubtasks();
    resetPriority();
    resetErrorStates();
}

function resetBasicInputs() {
    document.getElementById("titleInput").value = "";
    document.getElementById("dateInput").value = "";
    document.querySelector("textarea").value = "";
}

function resetCategory() {
    const categoryInput = document.getElementById("categoryInput");
    if (!categoryInput) return;

    categoryInput.value = "";
    categoryInput.dataset.value = "";
}

function resetAssignedUsers() {
    document.getElementById("assignedSearch").value = "";

    document.querySelectorAll("#assignedDropdown input[type='checkbox']")
        .forEach(cb => cb.checked = false);

    document.getElementById("assignedAvatars").innerHTML = "";
}

function resetSubtasks() {
    document.getElementById("subtaskList").innerHTML = "";

    const subtaskInput = document.getElementById("subtaskInput");
    if (!subtaskInput) return;

    subtaskInput.value = "";
    subtaskInput.closest(".subtask_input")?.classList.remove("has-text");
}

function resetPriority() {
    document.querySelectorAll(".prio").forEach(b => b.classList.remove("active"));
    document.querySelector('.prio[data-prio="medium"]')?.classList.add("active");
}

function resetErrorStates() {
    document.querySelectorAll(".left_row").forEach(r => r.classList.remove("error"));
}

// MODAL
function openAddTaskModal() {
    const modal = document.getElementById("addTaskModal");
    if (!modal) return;

    if (modal._closeTimeout) {
        clearTimeout(modal._closeTimeout);
        modal._closeTimeout = null;
    }

    modal.classList.remove("hidden");
    requestAnimationFrame(() => modal.classList.add("is-open"));
    modal.setAttribute("aria-hidden", "false");
}

function closeAddTaskModal() {
    const modal = document.getElementById("addTaskModal");
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

function setupModalControls() {
    document.querySelector(".modal_close")?.addEventListener("click", closeAddTaskModal);
    document.querySelector(".modal_backdrop")?.addEventListener("click", closeAddTaskModal);
}

// INIT
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

document.addEventListener("DOMContentLoaded", () => {
    loadTaskEditorPage();
});
