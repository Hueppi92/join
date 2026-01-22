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

// Priority-Buttons
function prioBtnActiveToggle() {
    let prioButtons = document.querySelectorAll(".prio");
    prioButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            prioButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });
}

// Subtask-List
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

// Initialization
function loadTaskEditorPage() {
    setupRequiredField("titleInput", ".title_field");
    setupRequiredField("dateInput", ".date_field");
    prioBtnActiveToggle();
    setupSubtasks();
}

loadTaskEditorPage();