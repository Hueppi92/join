/**
 * Resets the entire task form.
 * Calls all helper functions responsible for clearing
 * individual parts of the form.
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
 * Resets the selected category input field and removes
 * the stored dataset value.
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
 * Clears all assigned users and resets the assigned-user UI.
 * Unchecks all checkboxes and removes displayed avatar elements.
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
 * Resets the priority selection to the default value ("medium").
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
    let categoryWrapper = document.getElementById("categorySelectWrapper");
    categoryWrapper.classList.remove("error");
}

/**
 * Initializes the clear button for the task editor.
 * Prevents the default form submission and resets the task form.
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