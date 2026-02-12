// Error-Message
function setupRequiredField(inputId, wrapperClass) {
    let input = document.getElementById(inputId);
    let wrapper = document.querySelector(wrapperClass);

    if (!input || !wrapper) {
        console.warn("setupRequiredField: not found", { inputId, wrapperClass, input, wrapper });
        return;
    }

    let wasFocused = false;

    input.addEventListener("focus", () => {
        wasFocused = true;
    });

    input.addEventListener("blur", () => {
        if (wasFocused && input.value.trim() === "") {
            wrapper.classList.add("error");
        } else {
            wrapper.classList.remove("error");
        }
    });
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
    const dropdown = document.getElementById("assignedDropdown");
    const searchInput = document.getElementById("assignedSearch");

    if (!dropdown || !searchInput) return;

    firebase.database().ref("users").once("value", snapshot => {
        dropdown.innerHTML = "";

        snapshot.forEach(child => {
            const user = child.val();

            const initials = user.name
                .split(" ")
                .map(n => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();


            const label = document.createElement("label");
            label.className = "dropdown_item";
            label.dataset.username = user.name.toLowerCase();


            label.innerHTML = `
                <div class="dropdown_avatar">${initials}</div>
                <span>${user.name}</span>
                <input type="checkbox"
                     data-userid="${child.key}"
                     data-username="${user.name}">
            `;

            dropdown.appendChild(label);
        });
    });

    // Dropdown Toggle
    searchInput.addEventListener("focus", () => {
        dropdown.classList.add("open");
    });

    dropdown.addEventListener("change", (e) => {
        const item = e.target.closest(".dropdown_item");
        if (!item) return;

        item.classList.toggle("selected", e.target.checked);
        updateAssignedDisplay();
    });

    dropdown.addEventListener("change", updateAssignedDisplay);
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

function updateAssignedAvatars() {
    const container = document.getElementById("assignedAvatars");
    const checked = document.querySelectorAll(
        "#assignedDropdown input[type='checkbox']:checked"
    );

    container.innerHTML = "";

    checked.forEach(cb => {
        const name = cb.dataset.username;
        const initials = name
            .split(" ")
            .map(n => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

        const avatar = document.createElement("div");
        avatar.className = "dropdown_avatar";
        avatar.textContent = initials;

        container.appendChild(avatar);
    });
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
    let input = document.getElementById("subtaskInput");
    let list = document.getElementById("subtaskList");
    let wrapper = input.closest(".subtask_input");

    if (!input || !list) return;

    function addSubtask() {
        let value = input.value.trim();
        if (!value) return;

        let li = document.createElement("li");
        li.innerHTML = `
            <span>${value}</span>
            <button type="button">✕</button>
        `;

        li.querySelector("button").addEventListener("click", () => {
            li.remove();
        });

        list.appendChild(li);
        input.value = "";

        wrapper.classList.remove("has-text");
    }

    document.querySelector(".subtask_add_btn")
        .addEventListener("click", addSubtask);

    input.addEventListener("input", () => {
        if (input.value.trim().length > 0) {
            wrapper.classList.add("has-text");
        } else {
            wrapper.classList.remove("has-text");
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addSubtask();
        }
    });
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
    let wrapper = document.getElementById("assignedSelect");
    let searchInput = document.getElementById("assignedSearch");
    let dropdown = document.getElementById("assignedDropdown");

    if (!searchInput || !dropdown) return;

    searchInput.addEventListener("focus", () => {
        dropdown.classList.add("open");
    });

    document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove("open");
        }
    });

    searchInput.addEventListener("input", () => {
        const value = searchInput.value.trim().toLowerCase();

        dropdown.querySelectorAll(".dropdown_item").forEach(item => {
            const name = item.dataset.username;

            if (value === "") {
                item.style.display = "flex";
            } else {
                item.style.display = name.includes(value) ? "flex" : "none";
            }
        });
    });

    dropdown.addEventListener("change", () => {
        updateAssignedDisplay();
        updateAssignedAvatars();
    });
}

function setupCategoryDropdown() {
    let wrapper = document.getElementById("categorySelectWrapper");
    let input = document.getElementById("categoryInput");
    let dropdown = document.getElementById("categoryDropdown");

    input.addEventListener("focus", () => {
        dropdown.classList.add("open");
    });

    dropdown.querySelectorAll(".dropdown_item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            input.dataset.value = item.dataset.value;
            dropdown.classList.remove("open");
        });
    });

    document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove("open");
        }
    });
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
    let btn = document.querySelector(".create_btn");

    btn.addEventListener("click", (e) => {
        e.preventDefault();

        let title = document.getElementById("titleInput").value.trim();
        let date = document.getElementById("dateInput").value.trim();

        if (!title || !date) {
            alert("Please fill required fields");
            return;
        }

        let task = {
            title: title,
            description: document.querySelector("textarea").value.trim(),
            dueDate: date,
            priority: getActivePriority(),
            category: document.getElementById("categoryInput")?.dataset.value || "",
            assignedTo: getAssignedUsers(),
            subtasks: getSubtasks(),
            status: "todo",
            createdAt: Date.now()
        };

        saveTaskToFirebase(task)
            .then(() => {
                resetTaskForm();
                closeAddTaskModal();
                alert("Task created successfully");
            })
            .catch(err => {
                console.error("Firebase error:", err);
            });
    });
}

// RESET
function resetTaskForm() {
    document.getElementById("titleInput").value = "";
    document.getElementById("dateInput").value = "";
    document.querySelector("textarea").value = "";

    document.querySelectorAll("select").forEach(sel => {
        sel.selectedIndex = 0;
    });

    document.querySelectorAll(".prio").forEach(b => b.classList.remove("active"));
    document.querySelector('.prio[data-prio="medium"]')?.classList.add("active");

    document.getElementById("subtaskList").innerHTML = "";

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
