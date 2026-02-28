/**
 * @category Board
 */

/**
 * Rendert alle Tasks auf dem Board.
 */

/* ==========================================================================
   1. GLOBAL VARIABLES & CACHE
   ========================================================================== */

/** @type {string[]}*/
/**  All valid board status columns in display order.  */
const BOARD_STATUSES = ['todo', 'in-progress', 'await-feedback', 'done'];

/** @type {Object|null} */
/** Cache for all loaded user objects from Firebase. */
let boardUsersCache = null;

/** @type {Object|null}  */
/** Cache for legacy task-user connections from Firebase. */
let boardLegacyConnectionsCache = null;

/** @type {Object} */
/** Cache for all normalized task objects of the current board. */
let boardTaskCache = {};

/** @type {Array}  */
/** Temporary buffer for subtasks in edit mode. */
let currentEditSubtasks = [];

/** @type {Array} */
/** Temporary buffer for assigned contacts in edit mode. */
let currentEditContacts = [];

/** @type {string}*/
/** Status of the column from which the Add Task modal was opened. */
let currentSelectedStatus = 'todo';

/* ==========================================================================
   2. UTILS & HELPER FUNCTIONS
   ========================================================================== */

// getInitials is defined in taskeditor.js — do not redeclare here

/**
 * Converts a Firebase user object into a badge object for UI rendering.
 *
 * @param {string} userId - The Firebase ID of the user.
 * @param {Object} user - The user object from Firebase.
 * @param {string} user.name - The full name of the user.
 * @param {string} [user.color] - The avatar color of the user.
 * @returns {Object} Badge object containing id, name, color, and initials.
 */
function mapUserToBadge(userId, user) {
    const name = user?.name || '';
    const fallbackColor = name ? getAvatarColorFromName(name) : '#2A3647';
    return {
        id: userId,
        name: name,
        color: user?.color || fallbackColor,
        initials: name ? getInitials(name) : '?'
    };
}

/**
 * Normalizes a string-based assigned user entry using the user map.
 *
 * @param {string} entry - The Firebase ID of the user.
 * @param {Object} allUsers - Map of all known user objects.
 * @returns {Object|null} Badge object or null if user not found.
 */
function normalizeAssignedUserString(entry, allUsers) {
    const user = allUsers[entry];
    return user ? mapUserToBadge(entry, user) : null;
}

/**
 * Normalizes an object-based assigned user entry using the user map.
 *
 * @param {Object} entry - Raw user object from the task.
 * @param {Object} allUsers - Map of all known user objects.
 * @returns {Object|null} Normalized badge object or null if name is missing.
 */
function normalizeAssignedUserObject(entry, allUsers) {
    const id = entry.id || '';
    const fullUser = id ? allUsers[id] : null;
    const name = entry.name || fullUser?.name || '';
    if (!name) return null;
    return {
        id,
        name,
        color: entry.color || fullUser?.color || getAvatarColorFromName(name),
        initials: entry.initials || getInitials(name)
    };
}

/**
 * Normalizes a single entry from a task's assignedTo list into a unified badge object.
 *
 * @param {string|Object|null} entry - Raw entry (ID string or object).
 * @param {Object} allUsers - Map of all known user objects.
 * @returns {Object|null} Badge object or null.
 */
function normalizeAssignedUser(entry, allUsers) {
    if (!entry) return null;
    if (typeof entry === 'string') return normalizeAssignedUserString(entry, allUsers);
    if (typeof entry === 'object') return normalizeAssignedUserObject(entry, allUsers);
    return null;
}

/**
 * Normalizes a single subtask entry into a unified object.
 *
 * @param {string|Object} st - Raw subtask entry.
 * @returns {Object} Normalized subtask object with title and completed status.
 */
function normalizeSubtask(st) {
    if (typeof st === 'string') return { title: st, completed: false };
    return { title: st.title || '', completed: st.completed || false };
}

/**
 * Normalizes the full subtasks list of a task into a unified array.
 *
 * @param {Array|Object|null} subtasks - Raw subtask data from Firebase.
 * @returns {Array} Normalized subtask array.
 */
function normalizeSubtasks(subtasks) {
    const raw = subtasks || [];
    const arr = Array.isArray(raw) ? raw : Object.values(raw);
    return arr.map(normalizeSubtask);
}

/**
 * Resolves assigned users via the legacy task-user connection table.
 *
 * @param {string} taskId - The Firebase ID of the task.
 * @param {Object} allUsers - Map of all known user objects.
 * @param {Object} legacyConnections - Loaded taskUsers connections.
 * @returns {Array} Array of badge objects.
 */
function buildAssignedFromLegacy(taskId, allUsers, legacyConnections) {
    const legacyIds = legacyConnections[taskId] ? Object.keys(legacyConnections[taskId]) : [];
    return legacyIds
        .map((userId) => mapUserToBadge(userId, allUsers[userId]))
        .filter((user) => user.name);
}

/**
 * Resolves all assigned users of a task and returns them as a badge array.
 *
 * @param {string} taskId - The Firebase ID of the task.
 * @param {Object} task - The raw task object from Firebase.
 * @param {Object} allUsers - Map of all known user objects.
 * @param {Object} legacyConnections - Loaded taskUsers connections.
 * @returns {Array} Array of badge objects.
 */
function buildAssignedUsers(taskId, task, allUsers, legacyConnections) {
    const assignedRaw = Array.isArray(task.assignedTo) ? task.assignedTo : [];
    const assignedFromTask = assignedRaw
        .map((entry) => normalizeAssignedUser(entry, allUsers))
        .filter((user) => user !== null);
    if (assignedFromTask.length > 0 || Array.isArray(task.assignedTo)) return assignedFromTask;
    return buildAssignedFromLegacy(taskId, allUsers, legacyConnections);
}

/* ==========================================================================
   3. DATA FETCHING (FIREBASE)
   ========================================================================== */

/**
 * Returns the user map from Firebase. Uses in-memory cache.
 *
 * @async
 * @returns {Promise<Object>} Map of all user objects.
 */
async function getUsersMap() {
    if (boardUsersCache) return boardUsersCache;
    const snapshot = await firebase.database().ref('users').get();
    boardUsersCache = snapshot.val() || {};
    return boardUsersCache;
}

/**
 * Loads legacy connections from the taskUsers table in Firebase if needed.
 *
 * @async
 * @param {Object} tasks - All tasks from Firebase.
 * @returns {Promise<Object>} taskUsers connections or empty object.
 */
async function getLegacyTaskConnections(tasks) {
    if (boardLegacyConnectionsCache) return boardLegacyConnectionsCache;
    const needsLegacy = Object.values(tasks).some((t) => !Array.isArray(t.assignedTo));
    if (!needsLegacy) return {};
    const snapshot = await firebase.database().ref('taskUsers').get();
    boardLegacyConnectionsCache = snapshot.val() || {};
    return boardLegacyConnectionsCache;
}

/* ==========================================================================
   4. BOARD RENDERING
   ========================================================================== */

/**
 * Normalizes a single task object with resolved users and subtasks.
 *
 * @param {string} taskId - The Firebase ID of the task.
 * @param {Object} task - The raw task object.
 * @param {Object} allUsers - Map of all known users.
 * @param {Object} legacyConnections - Legacy task-user connections.
 * @returns {Object} Normalized task object.
 */
function normalizeTask(taskId, task, allUsers, legacyConnections) {
    return {
        ...task,
        assignedTo: buildAssignedUsers(taskId, task, allUsers, legacyConnections),
        subtasks: normalizeSubtasks(task.subtasks),
        priority: task.priority || 'low'
    };
}

/**
 * Processes all tasks and generates HTML strings per column.
 *
 * @param {Object} tasks - All tasks from Firebase.
 * @param {Object} allUsers - Map of all known users.
 * @param {Object} legacyConnections - Legacy connections.
 * @returns {Object} Object containing columns HTML and nextCache.
 */
function buildColumnsFromTasks(tasks, allUsers, legacyConnections) {
    const columns = { 'todo': '', 'in-progress': '', 'await-feedback': '', 'done': '' };
    const nextCache = {};
    Object.entries(tasks).forEach(([taskId, task]) => {
        const normalized = normalizeTask(taskId, task, allUsers, legacyConnections);
        nextCache[taskId] = normalized;
        if (columns[task.status] !== undefined) columns[task.status] += getCardTemplate(normalized, taskId);
    });
    return { columns, nextCache };
}

/**
 * Fetches all required board data from Firebase in parallel.
 *
 * @async
 * @returns {Promise<Object>} Object containing tasks, users, and legacy connections.
 */
async function fetchBoardData() {
    const tasksPromise = firebase.database().ref('tasks').get();
    const usersPromise = getUsersMap();
    const tasksSnapshot = await tasksPromise;
    const tasks = tasksSnapshot.val() || {};
    const [allUsers, legacyConnections] = await Promise.all([usersPromise, getLegacyTaskConnections(tasks)]);
    return { tasks, allUsers, legacyConnections };
}

/**
 * Loads data, normalizes it, and re-renders the entire board UI.
 *
 * @async
 * @returns {Promise<void>}
 */
async function renderBoard() {
    try {
        const { tasks, allUsers, legacyConnections } = await fetchBoardData();
        const { columns, nextCache } = buildColumnsFromTasks(tasks, allUsers, legacyConnections);
        boardTaskCache = nextCache;
        renderColumnHTML(columns);
    } catch (error) {
        console.error("Error rendering board:", error);
    }
}

/**
 * Injects generated HTML into the board columns and sets drag-and-drop attributes.
 *
 * @param {Object} columns - Status keys and HTML string values.
 * @returns {void}
 */
function renderColumnHTML(columns) {
    BOARD_STATUSES.forEach(status => {
        const col = document.querySelector(`#${status} .task-list`);
        if (!col) return;
        col.innerHTML = columns[status] || `<div class="empty-msg">No tasks ${status.replace('-', ' ')}</div>`;
        col.setAttribute('ondragover', 'event.preventDefault()');
        col.setAttribute('ondrop', `onDrop(event.dataTransfer.getData('text/plain'),'${status}')`);
    });
}

/* ==========================================================================
   5. MODAL MANAGEMENT (ADD & DETAIL)
   ========================================================================== */

/**
 * Opens the Add Task modal and sets the target column status.
 *
 * @param {string} [status='todo'] - Target status for the new task.
 * @returns {void}
 */
function openAddTaskModalBoard(status = 'todo') {
    currentSelectedStatus = status;
    window.currentSelectedStatus = status;
    const modal = document.getElementById('addTaskModal');
    if (!modal) return;
    clearModalCloseTimeout(modal);
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('is-open'));
    modal.setAttribute('aria-hidden', 'false');
    scrollModalToTop(modal);
    if (typeof initTaskEditor === 'function') initTaskEditor();
}

/**
 * Resets any active modal close timeout.
 *
 * @param {HTMLElement} modal - The modal element.
 * @returns {void}
 */
function clearModalCloseTimeout(modal) {
    if (modal._closeTimeout) {
        clearTimeout(modal._closeTimeout);
        modal._closeTimeout = null;
    }
}

/**
 * Resets scroll positions for the modal and its content wrappers.
 *
 * @param {HTMLElement} modal - The modal element.
 * @returns {void}
 */
function scrollModalToTop(modal) {
    modal.scrollTop = 0;
    modal.querySelector('.modal-content')?.scrollTo(0, 0);
    modal.querySelector('.editor_wrapper')?.scrollTo(0, 0);
}

/**
 * Hides the modal after the transition duration.
 *
 * @param {HTMLElement} modal - The modal element.
 * @returns {void}
 */
function scheduleModalHide(modal) {
    if (modal._closeTimeout) clearTimeout(modal._closeTimeout);
    modal._closeTimeout = setTimeout(() => {
        modal.classList.add('hidden');
        modal._closeTimeout = null;
    }, 600);
}

/**
 * Closes the Add Task modal and refreshes the board.
 *
 * @returns {void}
 */
function closeAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    if (modal) {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        scheduleModalHide(modal);
        document.querySelector('.new_task')?.reset();
    }
    renderBoard();
}

/**
 * Loads a single task and enriches it with user data.
 *
 * @async
 * @param {string} taskId - Firebase task ID.
 * @returns {Promise<Object|null>} Normalized task or null.
 */
async function fetchTaskWithUsers(taskId) {
    const [taskSnap, allUsers] = await Promise.all([
        firebase.database().ref('tasks/' + taskId).get(),
        getUsersMap()
    ]);
    const task = taskSnap.val();
    if (!task) return null;
    return normalizeTask(taskId, task, allUsers, boardLegacyConnectionsCache || {});
}

/**
 * Opens the detail view for a specific task.
 *
 * @async
 * @param {string} taskId - Firebase task ID.
 * @returns {Promise<void>}
 */
async function openTaskDetail(taskId) {
    const cachedTask = boardTaskCache[taskId];
    if (cachedTask) { renderTaskDetail(cachedTask, taskId); return; }
    const taskWithUsers = await fetchTaskWithUsers(taskId);
    if (taskWithUsers) renderTaskDetail(taskWithUsers, taskId);
}

/**
 * Renders the task detail overlay content.
 *
 * @param {Object} task - Normalized task object.
 * @param {string} taskId - Firebase task ID.
 * @returns {void}
 */
function renderTaskDetail(task, taskId) {
    const overlay = document.getElementById('task-overlay');
    if (!overlay) return;
    overlay.querySelector('.overlay-card').innerHTML = getTaskDetailTemplate(task, taskId);
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Closes the task detail overlay and enables page scrolling.
 *
 * @returns {void}
 */
function closeTaskDetail() {
    document.getElementById('task-overlay').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

/* ==========================================================================
   6. EDIT MODE LOGIC (CONTACTS & SUBTASKS)
   ========================================================================== */

/**
 * Initializes the task edit mode by populating forms with current data.
 *
 * @async
 * @param {string} taskId - Firebase task ID.
 * @returns {Promise<void>}
 */
async function editTask(taskId) {
    const task = boardTaskCache[taskId];
    if (!task) return;
    currentEditSubtasks = task.subtasks ? [...task.subtasks] : [];
    currentEditContacts = task.assignedTo ? [...task.assignedTo] : [];
    const allUsers = await getUsersMap();
    const overlayCard = document.querySelector('#task-overlay .overlay-card');
    overlayCard.innerHTML = getEditTaskTemplate(task, taskId);
    fillContactDropdown(allUsers);
    refreshEditSubtaskUI();
    renderEditContactBadges();
}

/**
 * Adds the currently selected contact in the dropdown to the edit list.
 *
 * @returns {void}
 */
function editTaskAssigned() {
    const select = document.getElementById('edit-assigned');
    if (!select?.value) return;
    const user = boardUsersCache[select.value];
    if (user && !currentEditContacts.some(c => c.id === select.value)) {
        currentEditContacts.push(mapUserToBadge(select.value, user));
        renderEditContactBadges();
    }
    select.value = "";
}

/**
 * Alias for editTaskAssigned to handle contact addition.
 *
 * @returns {void}
 */
function addContactToEdit() {
    const select = document.getElementById('edit-assigned');
    if (!select?.value) return;
    const user = boardUsersCache[select.value];
    if (user && !currentEditContacts.some(c => c.id === select.value)) {
        currentEditContacts.push(mapUserToBadge(select.value, user));
        renderEditContactBadges();
    }
    select.value = "";
}

/**
 * Toggles the visibility of the contact list dropdown in edit mode.
 *
 * @returns {void}
 */
function toggleEditContactList() {
    const list = document.getElementById('edit-contact-list');
    const arrow = document.getElementById('dropdown-arrow');
    list.classList.toggle('hidden');
    arrow.style.transform = list.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

/**
 * Generates HTML for a single contact item in the dropdown list.
 *
 * @param {string} userId - Firebase user ID.
 * @param {Object} badge - User badge data.
 * @param {boolean} isAssigned - Whether the user is currently assigned.
 * @returns {string} HTML string.
 */
function buildContactItemHTML(userId, badge, isAssigned) {
    return `<div class="contact-item ${isAssigned ? 'selected' : ''}" onclick="toggleUserSelection('${userId}')">
        <div class="contact-item-left">
            <div class="user-badge" style="background-color: ${badge.color}">${badge.initials}</div>
            <span>${badge.name}</span>
        </div>
        <img src="../assets/icons/checkbox_${isAssigned ? 'white' : 'empty'}.svg">
    </div>`;
}

/**
 * Populates the dropdown menu with all available users for assignment.
 *
 * @param {Object} allUsers - Map of all users.
 * @returns {void}
 */
function fillContactDropdown(allUsers) {
    const listContainer = document.getElementById('edit-contact-list');
    if (!listContainer) return;
    let html = '';
    Object.entries(allUsers).forEach(([userId, user]) => {
        const isAssigned = currentEditContacts.some(c => c.id === userId);
        html += buildContactItemHTML(userId, mapUserToBadge(userId, user), isAssigned);
    });
    listContainer.innerHTML = html;
}

// Event listener for board search functionality
document.getElementById('task-search')?.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm.length >= 3 || searchTerm.length === 0) filterTasks(searchTerm);
});

/**
 * Checks if a task matches the search criteria.
 *
 * @param {Object} task - Task object.
 * @param {string} term - Search term.
 * @returns {boolean} True if match found.
 */
function taskMatchesTerm(task, term) {
    const title = (task.title || "").toLowerCase();
    const description = (task.description || "").toLowerCase();
    const euDate = (task.dueDate || "").split("-").reverse().join(".");
    return title.includes(term) || description.includes(term) || euDate.includes(term);
}

/**
 * Filters the board based on a search term.
 *
 * @async
 * @param {string} term - Search term.
 * @returns {Promise<void>}
 */
async function filterTasks(term) {
    const filteredColumns = { 'todo': '', 'in-progress': '', 'await-feedback': '', 'done': '' };
    Object.entries(boardTaskCache).forEach(([taskId, task]) => {
        if (taskMatchesTerm(task, term) && filteredColumns[task.status] !== undefined) {
            filteredColumns[task.status] += getCardTemplate(task, taskId);
        }
    });
    renderColumnHTML(filteredColumns);
}

/**
 * Toggles a user's selection status in the edit buffer.
 *
 * @param {string} userId - Firebase user ID.
 * @returns {void}
 */
function toggleUserSelection(userId) {
    const userIndex = currentEditContacts.findIndex(c => c.id === userId);
    if (userIndex > -1) currentEditContacts.splice(userIndex, 1);
    else currentEditContacts.push(mapUserToBadge(userId, boardUsersCache[userId]));
    fillContactDropdown(boardUsersCache);
    renderEditContactBadges();
}

/**
 * Removes a contact from the edit list by its index.
 *
 * @param {number} index - Index in currentEditContacts.
 * @returns {void}
 */
function removeContactFromEdit(index) {
    currentEditContacts.splice(index, 1);
    renderEditContactBadges();
}

/**
 * Updates the UI display of assigned contact badges in edit mode.
 *
 * @returns {void}
 */
function renderEditContactBadges() {
    const container = document.getElementById('edit-assigned-badges');
    if (!container) return;
    container.innerHTML = currentEditContacts.map((u, index) => `
        <div class="user-badge" style="background-color: ${u.color}" 
             title="Click to remove ${u.name}" onclick="removeContactFromEdit(${index})">
            ${u.initials}
        </div>
    `).join('');
}

/**
 * Adds a new subtask to the edit buffer and refreshes UI.
 *
 * @returns {void}
 */
function addSubtaskInEdit() {
    const input = document.getElementById('edit-subtask-input');
    const title = input.value.trim();
    if (!title) return;
    currentEditSubtasks.push({ title, completed: false });
    input.value = '';
    refreshEditSubtaskUI();
}

/**
 * Deletes a subtask from the edit buffer and refreshes UI.
 *
 * @param {number} index - Index in currentEditSubtasks.
 * @returns {void}
 */
function deleteSubtaskFromEdit(index) {
    currentEditSubtasks.splice(index, 1);
    refreshEditSubtaskUI();
}

/**
 * Refreshes the subtask list displayed in the edit form.
 *
 * @returns {void}
 */
function refreshEditSubtaskUI() {
    const list = document.getElementById('edit-subtask-list');
    if (!list) return;
    list.innerHTML = currentEditSubtasks.map((st, index) => `
        <li class="edit-subtask-item">
            <span>• ${st.title}</span>
            <img src="../assets/icons/delete.svg" onclick="deleteSubtaskFromEdit(${index})" alt="Delete">
        </li>
    `).join('');
}

/**
 * Sets the priority selection in edit mode and updates button classes.
 *
 * @param {string} prio - Priority level ('urgent', 'medium', 'low').
 * @returns {void}
 */
function setEditPriority(prio) {
    document.querySelectorAll('.prio-btn-edit')
        .forEach(btn => btn.classList.remove('active-urgent', 'active-medium', 'active-low'));
    document.getElementById('prio-' + prio)?.classList.add('active-' + prio);
}

/**
 * Collects all form data to build an updated task object.
 *
 * @returns {Object} Updated task data.
 */
function buildUpdatedTaskData() {
    const activePrioBtn = document.querySelector('.prio-btn-edit[class*="active-"]');
    return {
        title: document.getElementById('edit-title').value,
        description: document.getElementById('edit-description').value,
        dueDate: document.getElementById('edit-date').value,
        priority: activePrioBtn ? activePrioBtn.id.replace('prio-', '') : 'low',
        subtasks: currentEditSubtasks,
        assignedTo: currentEditContacts
    };
}

/**
 * Saves edited task changes to Firebase and updates the UI.
 *
 * @async
 * @param {string} taskId - Firebase task ID.
 * @returns {Promise<void>}
 */
async function saveTaskEdit(taskId) {
    const updatedData = buildUpdatedTaskData();
    try {
        await firebase.database().ref('tasks/' + taskId).update(updatedData);
        boardTaskCache[taskId] = { ...boardTaskCache[taskId], ...updatedData };
        openTaskDetail(taskId);
        renderBoard();
    } catch (e) {
        console.error("Error saving task:", e);
    }
}

/* ==========================================================================
   7. ACTIONS (DELETE, STATUS UPDATE, DROP)
   ========================================================================== */

/**
 * Clears a specific task from local board caches.
 *
 * @param {string} taskId - Firebase task ID.
 * @returns {void}
 */
function clearTaskFromCache(taskId) {
    delete boardTaskCache[taskId];
    if (boardLegacyConnectionsCache?.[taskId]) delete boardLegacyConnectionsCache[taskId];
}

/**
 * Deletes a task from the database and updates the board.
 *
 * @async
 * @param {string} taskId - Firebase task ID.
 * @returns {Promise<void>}
 */
async function deleteTask(taskId) {
    if (!confirm('Really delete this task?')) return;
    await firebase.database().ref('tasks/' + taskId).remove();
    await firebase.database().ref('taskUsers/' + taskId).remove();
    clearTaskFromCache(taskId);
    closeTaskDetail();
    renderBoard();
}

/**
 * Updates the completion status of a subtask in Firebase.
 *
 * @async
 * @param {string} taskId - Firebase task ID.
 * @param {number} index - Index of subtask.
 * @param {boolean} completed - New status.
 * @returns {Promise<void>}
 */
async function updateSubtaskStatus(taskId, index, completed) {
    const subtaskRef = firebase.database().ref(`tasks/${taskId}/subtasks/${index}`);
    const snapshot = await subtaskRef.once('value');
    const oldSubtask = snapshot.val();
    const updatedSubtask = typeof oldSubtask === 'string'
        ? { title: oldSubtask, completed }
        : { ...oldSubtask, completed };
    await subtaskRef.set(updatedSubtask);
    await renderBoard();
    openTaskDetail(taskId);
}

/**
 * Finalizes task movement via drag-and-drop.
 *
 * @param {string} taskId - Firebase task ID.
 * @param {string} newStatus - New status column.
 * @returns {void}
 */
function onDrop(taskId, newStatus) {
    if (!taskId) return;
    firebase.database().ref('tasks/' + taskId).update({ status: newStatus })
        .then(() => renderBoard());
}

/**
 * Closes task detail if the user clicks the overlay background.
 *
 * @param {MouseEvent} event - Click event.
 * @returns {void}
 */
function handleOverlayClick(event) {
    if (event.target.id === 'task-overlay') closeTaskDetail();
}

/* ==========================================================================
   8. OVERRIDES for taskeditor.js functions
   ========================================================================== */

/**
 * Overrides core task building to include correct board column status.
 *
 * @returns {Object} Task object for Firebase.
 */
function buildTaskObject() {
    const status = (typeof currentSelectedStatus !== 'undefined' && currentSelectedStatus)
        ? currentSelectedStatus : 'todo';
    return {
        title: document.getElementById("titleInput").value.trim(),
        description: document.querySelector("textarea").value.trim(),
        dueDate: document.getElementById("dateInput").value.trim(),
        priority: getActivePriority(),
        category: document.getElementById("categoryInput")?.dataset.value || "",
        assignedTo: getAssignedUsers(),
        subtasks: getSubtasks(),
        status,
        createdAt: Date.now()
    };
}

/**
 * Callback for successful task creation on the board page.
 *
 * @returns {void}
 */
function handleTaskCreatedSuccess() {
    closeAddTaskModal();
    resetTaskForm();
    renderBoard();
}

// Initial board rendering on page load
renderBoard();