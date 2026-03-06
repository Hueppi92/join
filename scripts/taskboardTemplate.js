/**
 * @category Board
 */

/**
 * Erzeugt das HTML-Template für eine Task-Karte.
 * @param {Object} task - Das Task-Objekt.
 * @returns {string} HTML-String.
 */
/**
 * Ensures that a value is returned as an array.
 * Automatically converts Firebase objects (key-value) into an array.
 *
 * @param {Array|Object|null} data - The value to normalize.
 * @returns {Array} Array containing the values from data.
 */
function ensureArray(data) {
  return Array.isArray(data) ? data : Object.values(data || {});
}

/**
 * Calculates the completion progress of a task's subtasks.
 *
 * @param {Array|Object|null} subtasksRaw - Raw subtask data.
 * @returns {{done: number, total: number, percent: number}} Progress data.
 */
function getProgressData(subtasksRaw) {
  const st = ensureArray(subtasksRaw);
  const done = st.filter((s) => s?.completed || s?.done).length;
  const percent = st.length > 0 ? (done / st.length) * 100 : 0;
  return { done, total: st.length, percent };
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into European format (DD.MM.YYYY).
 * Returns a placeholder if no date is provided.
 *
 * @param {string} [dueDate=""] - The date string to format in ISO format.
 * @returns {string} Date in DD.MM.YYYY format or "--.--.----".
 */
function formatDate(dueDate = "") {
  if (!dueDate) return "--.--.----";
  return dueDate.includes("-") ? dueDate.split("-").reverse().join(".") : dueDate;
}

/**
 * Generates a CSS-compatible class name from a category text string.
 *
 * @param {string} [category=""] - The category text of the task.
 * @returns {string} Lowercase CSS class name with hyphens.
 */
function buildCategoryClass(category = "") {
  return (category || "User Story").toLowerCase().replace(/\s+/g, "-");
}

/** --- USER BADGE HELPERS --- **/

/**
 * Resolves the initials to display for a user.
 * Prefers existing initials; otherwise calculates them from the name.
 *
 * @param {Object} u - User badge object with optional name and initials properties.
 * @returns {string} Initials of the user.
 */
function resolveUserInitials(u) {
  const name = u.name || "";
  return u.initials || getInitials(name);
}

/**
 * Generates the HTML string for a single user badge on a task card.
 * Badges are displayed overlapping side by side.
 *
 * @param {Object} u - User badge object with name, initials, and color properties.
 * @param {number} index - Position of the badge in the list (determines z-index and offset).
 * @returns {string} HTML string for the badge.
 */
function renderCardBadge(u, index) {
  const ml = index === 0 ? "0" : "-12px";
  return `<div class="user-badge" style="background-color:${u.color || "#2A3647"};z-index:${10 - index};margin-left:${ml};">
    ${resolveUserInitials(u)}
  </div>`;
}

/**
 * Generates the HTML string for a user badge in the task detail view,
 * including the full name of the user.
 *
 * @param {Object} u - User badge object with name, initials, and color properties.
 * @returns {string} HTML string for the detail badge with name.
 */
function renderDetailBadge(u) {
  const name = u.name || "Unknown";
  const displayName = String(u.id || "").startsWith("self_") ? `${name} (You)` : name;
  const initials = resolveUserInitials(u);
  return `<div class="assigned-user-badge-container">
    <div class="user-badge" style="background-color:${u.color || "#2A3647"};">${initials}</div>
    <span>${displayName}</span>
  </div>`;
}

/**
 * Renders a list of user badges for a task card or the detail view.
 *
 * @param {Array|Object} users - List of assigned user objects.
 * @param {number} [limit=3] - Maximum number of badges to display (card view only).
 * @param {boolean} [isDetail=false] - True for detail view (with name), false for card view.
 * @returns {string} HTML string with all badge elements.
 */
function renderContactBadges(users, limit = 3, isDetail = false) {
  const list = ensureArray(users).filter((u) => u && typeof u === "object");
  if (isDetail) return list.map(renderDetailBadge).join("");
  return list.slice(0, limit).map(renderCardBadge).join("");
}

/** --- SUBTASK HELPERS --- **/

/**
 * Resolves the display title of a subtask, regardless of its storage format.
 *
 * @param {string|Object|null} s - Raw subtask entry (string or object with title property).
 * @param {number} i - Index of the subtask (used for fallback label).
 * @returns {string} Display title of the subtask.
 */
function resolveSubtaskTitle(s, i) {
  return typeof s === "object" ? s.title || `Subtask ${i + 1}` : s;
}

/**
 * Renders the subtask list for the task detail view as an HTML string.
 * Each subtask is clickable and toggles its completed status.
 *
 * @param {Array|Object|null} subtasksRaw - Raw subtask data.
 * @param {string} taskId - The Firebase ID of the task.
 * @returns {string} HTML string of the subtask list or "No subtasks".
 */
function renderSubtaskItems(subtasksRaw, taskId) {
  const st = ensureArray(subtasksRaw);
  if (st.length === 0) return "No subtasks";
  return st.map((s, i) => {
    const done = s?.completed || s?.done;
    const title = resolveSubtaskTitle(s, i);
    const icon = done ? "checked" : "empty";
    return `<div class="subtask-row" onclick="updateSubtaskStatus('${taskId}', ${i}, ${!done})">
      <img src="../assets/icons/checkbox_${icon}.svg"><span>${title}</span>
    </div>`;
  }).join("");
}

/** --- PROGRESS BAR HTML --- **/

/**
 * Generates the HTML string for the progress indicator on a task card.
 * Returns an empty string if no subtasks are present.
 *
 * @param {Array|Object|null} subtasksRaw - Raw subtask data.
 * @returns {string} HTML string of the progress bar or empty string.
 */
function renderProgressBar(subtasksRaw) {
  const { done, total, percent } = getProgressData(subtasksRaw);
  if (total === 0) return "";
  return `<div class="progress-container">
    <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
    <span class="subtask-text">${done}/${total} Subtasks</span>
  </div>`;
}

/** --- PRIORITY BUTTONS HTML --- **/

/**
 * Generates the HTML string for the three priority buttons in the edit form.
 * The currently active button receives the corresponding CSS class.
 *
 * @param {string} currentPrio - The currently set priority ('urgent', 'medium', or 'low').
 * @returns {string} HTML string with all three priority buttons.
 */
function renderPrioButtons(currentPrio) {
  return ["urgent", "medium", "low"].map((p) => {
    const active = currentPrio === p ? `active-${p}` : "";
    const label = p.charAt(0).toUpperCase() + p.slice(1);
    return `<button class="prio-btn-edit ${active}" onclick="setEditPriority('${p}')" id="prio-${p}">
      ${label}<img src="../assets/icons/prio-${p}.svg">
    </button>`;
  }).join("");
}

/** --- MAIN TEMPLATES --- **/

/**
 * Generates the HTML for a task card on the board.
 * The card is drag-and-drop enabled and opens the detail view on click.
 *
 * @param {Object} task - The normalized task object from Firebase.
 * @param {string} id - The Firebase ID of the task.
 * @returns {string} HTML string of the task card.
 */
function getCardTemplate(task, id) {
  const prio = (task.priority || "low").toLowerCase();
  const catClass = buildCategoryClass(task.category);
  const catText = task.category || "User Story";
  return `<div class="card" draggable="true" onclick="event.stopPropagation();openTaskDetail('${id}')" ondragstart="event.dataTransfer.setData('text/plain','${id}')">
    <div class="badge ${catClass}">${catText}</div>
    <div class="card-content">
      <h2 class="card-title">${task.title || "No Title"}</h2>
      <p class="card-description">${task.description || ""}</p>
    </div>
    ${renderProgressBar(task.subtasks)}
    <div class="card-footer">
      <div class="assigned-to-container">${renderContactBadges(task.assignedTo)}</div>
      <div class="prio-icon"><img src="../assets/icons/prio-${prio}.svg" alt="${prio}" onerror="this.style.display='none'"></div>
    </div>
  </div>`;
}

/**
 * Generates the HTML for the task detail view in the overlay.
 * Contains all task information as well as action buttons for delete and edit.
 *
 * @param {Object} task - The normalized task object from Firebase.
 * @param {string} id - The Firebase ID of the task.
 * @returns {string} HTML string of the detail view.
 */
function getTaskDetailTemplate(task, id) {
  const prio = (task.priority || "low").toLowerCase();
  const prioLabel = prio.charAt(0).toUpperCase() + prio.slice(1);
  const catClass = buildCategoryClass(task.category);
  const catText = task.category || "User Story";
  return `<div class="task-detail-card">
    <div class="detail-header">
      <div class="badge ${catClass}">${catText}</div>
      <button class="close-btn-overlay" onclick="closeTaskDetail()"><img src="../assets/icons/close.svg" alt="Close"></button>
    </div>
    <h1 class="detail-title">${task.title || "No Title"}</h1>
    <p class="detail-description">${task.description || ""}</p>
    <div class="detail-info-row"><span class="info-label">Due date:</span><span class="info-value">${formatDate(task.dueDate)}</span></div>
    <div class="detail-prio-row"><span class="info-label">Priority:</span>
      <div class="info-value-prio"><span>${prioLabel}</span><img src="../assets/icons/prio-${prio}.svg" alt="${prioLabel}"></div>
    </div>
    <div class="detail-section"><h3 class="section-title">Assigned To:</h3>
      <div class="assigned-list">${renderContactBadges(task.assignedTo, 100, true)}</div>
    </div>
    <div class="detail-section"><h3 class="section-title">Subtasks</h3>
      <div class="subtask-list">${renderSubtaskItems(task.subtasks, id)}</div>
    </div>
    <div class="detail-actions">
      <button class="action-btn" onclick="deleteTask('${id}')"><img src="../assets/icons/delete_text.svg" alt="Delete"></button>
      <div class="action-divider"></div>
      <button class="action-btn" onclick="editTask('${id}')"><img src="../assets/icons/edit_text.svg" alt="Edit"></button>
    </div>
  </div>`;
}

/**
 * Generates the HTML for the task edit form in the overlay.
 * Contains input fields for all editable task properties.
 *
 * @param {Object} task - The normalized task object from Firebase.
 * @param {string} id - The Firebase ID of the task.
 * @returns {string} HTML string of the edit form.
 */
function getEditTaskTemplate(task, id) {
  const curr = (task.priority || "low").toLowerCase();
  return `<div class="card-inner">
    <button class="close-btn-overlay" onclick="closeTaskDetail()"><img src="../assets/icons/close.svg" alt="Close"></button>
    <div class="task-edit-container"><div class="edit-scroll-area">
      <label class="edit-label">Title</label>
      <input type="text" id="edit-title" class="edit-input" value="${task.title || ""}">
      <label class="edit-label">Description</label>
      <textarea id="edit-description" class="edit-textarea">${task.description || ""}</textarea>
      <label class="edit-label">Due date</label>
      <input type="date" id="edit-date" class="edit-input" value="${task.dueDate || ""}">
      <label class="edit-label edit-label-priority">Priority</label>
      <div class="priority-row-edit">${renderPrioButtons(curr)}</div>
      <label class="edit-label">Assigned to</label>
      <div class="custom-select-container">
        <div class="edit-input custom-select-header" onclick="toggleEditContactList()">
          <span>Select contacts to assign</span>
          <img src="../assets/icons/arrow_drop_down.png" id="dropdown-arrow">
        </div>
        <div id="edit-contact-list" class="custom-contact-list hidden"></div>
      </div>
      <div id="edit-assigned-badges" class="edit-assigned-row"></div>
      <label class="edit-label">Subtasks</label>
      <div class="subtask-input-container">
        <input type="text" id="edit-subtask-input" class="edit-input" placeholder="Add new subtask">
        <img src="../assets/icons/plus-button.svg" onclick="addSubtaskInEdit()">
      </div>
      <ul id="edit-subtask-list" class="edit-subtask-list"></ul>
    </div></div>
    <button class="save-btn" onclick="saveTaskEdit('${id}')">Ok <img src="../assets/icons/check.svg"></button>
  </div>`;
}