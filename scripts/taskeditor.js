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

            const label = document.createElement("label");
            label.className = "assigned-item";
            label.dataset.username = user.name.toLowerCase();
            

            label.innerHTML = `
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
        dropdown.classList.remove("hidden");
    });

    // Anzeige aktualisieren
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
    const searchInput = document.getElementById("assignedSearch");
    const dropdown = document.getElementById("assignedDropdown");

    if (!searchInput || !dropdown) return;

    searchInput.addEventListener("input", () => {
        const value = searchInput.value.trim().toLowerCase();

        dropdown.querySelectorAll(".assigned-item").forEach(item => {
            const name = item.dataset.username;

            if (value === "") {
                item.style.display = "flex";
            } else {
                item.style.display = name.includes(value) ? "flex" : "none";
            }
        });
    });

    searchInput.addEventListener("focus", () => {
        dropdown.classList.remove("hidden");
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
            category: document.querySelector("select:nth-of-type(2)")?.value || "",
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
    document.getElementById("addTaskModal").classList.remove("hidden");
}

function closeAddTaskModal() {
    document.getElementById("addTaskModal").classList.add("hidden");
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