/* ==========================================================================
   1. GLOBAL VARIABLES & CACHE
   ========================================================================== */

/** @type {string[]} All valid board status columns in display order. */
const BOARD_STATUSES = ['todo', 'in-progress', 'await-feedback', 'done'];

/** @type {Object|null} Cache for all loaded user objects from Firebase. */
let boardUsersCache = null;

/** @type {Object|null} Cache for legacy task-user connections from Firebase. */
let boardLegacyConnectionsCache = null;

/** @type {Object} Cache for all normalized task objects of the current board. */
let boardTaskCache = {};

/** @type {Array<{title: string, completed: boolean}>} Temporary buffer for subtasks in edit mode. */
let currentEditSubtasks = [];

/** @type {Array<{id: string, name: string, color: string, initials: string}>} Temporary buffer for assigned contacts in edit mode. */
let currentEditContacts = [];

/** @type {string} Status of the column from which the Add Task modal was opened. */
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
 * @returns {{id: string, name: string, color: string, initials: string}} Badge object for the UI.
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
 * @returns {{id: string, name: string, color: string, initials: string}|null} Badge object or null.
 */
function normalizeAssignedUserString(entry, allUsers) {
    const user = allUsers[entry];
    return user ? mapUserToBadge(entry, user) : null;
}

/**
 * Normalizes an object-based assigned user entry using the user map.
 *
 * @param {{id?: string, name?: string, color?: string, initials?: string}} entry - Raw user object from the task.
 * @param {Object} allUsers - Map of all known user objects.
 * @returns {{id: string, name: string, color: string, initials: string}|null} Normalized badge object or null.
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
 * Normalizes a single entry from a task's assignedTo list into a unified badge object,
 * regardless of whether it is stored as a string ID or an object.
 *
 * @param {string|Object|null} entry - Raw entry from assignedTo (ID string or object).
 * @param {Object} allUsers - Map of all known user objects.
 * @returns {{id: string, name: string, color: string, initials: string}|null} Badge object or null.
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
 * @param {string|{title?: string, completed?: boolean}} st - Raw subtask entry.
 * @returns {{title: string, completed: boolean}} Normalized subtask object.
 */
function normalizeSubtask(st) {
    if (typeof st === 'string') return { title: st, completed: false };
    return { title: st.title || '', completed: st.completed || false };
}

/**
 * Normalizes the full subtasks list of a task into a unified array.
 * Supports both array and object format as stored in Firebase.
 *
 * @param {Array|Object|null} subtasks - Raw subtask data from Firebase.
 * @returns {{title: string, completed: boolean}[]} Normalized subtask array.
 */
function normalizeSubtasks(subtasks) {
    const raw = subtasks || [];
    const arr = Array.isArray(raw) ? raw : Object.values(raw);
    return arr.map(normalizeSubtask);
}

/**
 * Resolves assigned users via the legacy task-user connection table (taskUsers).
 * Used when a task does not have an assignedTo array.
 *
 * @param {string} taskId - The Firebase ID of the task.
 * @param {Object} allUsers - Map of all known user objects.
 * @param {Object} legacyConnections - Loaded taskUsers connections from Firebase.
 * @returns {{id: string, name: string, color: string, initials: string}[]} Array of badge objects.
 */
function buildAssignedFromLegacy(taskId, allUsers, legacyConnections) {
    const legacyIds = legacyConnections[taskId] ? Object.keys(legacyConnections[taskId]) : [];
    return legacyIds
        .map((userId) => mapUserToBadge(userId, allUsers[userId]))
        .filter((user) => user.name);
}

/**
 * Resolves all assigned users of a task and returns them as a badge array.
 * Prioritizes the assignedTo array; falls back to legacy connections if necessary.
 *
 * @param {string} taskId - The Firebase ID of the task.
 * @param {Object} task - The raw task object from Firebase.
 * @param {Object} allUsers - Map of all known user objects.
 * @param {Object} legacyConnections - Loaded taskUsers connections from Firebase.
 * @returns {{id: string, name: string, color: string, initials: string}[]} Array of badge objects.
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
 * Returns the user map from Firebase.
 * Uses an in-memory cache to avoid repeated database requests.
 *
 * @returns {Promise<Object>} Map of all user objects, indexed by user ID.
 */
async function getUsersMap() {
    if (boardUsersCache) return boardUsersCache;
    const snapshot = await firebase.database().ref('users').get();
    boardUsersCache = snapshot.val() || {};
    return boardUsersCache;
}

/**
 * Loads legacy connections from the taskUsers table in Firebase,
 * only if at least one task does not have an array-based assignedTo field.
 * Uses an in-memory cache.
 *
 * @param {Object} tasks - All tasks from Firebase, indexed by task ID.
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
 * Normalizes a single task object by enriching it with resolved users,
 * normalized subtasks, and a fallback priority value.
 *
 * @param {string} taskId - The Firebase ID of the task.
 * @param {Object} task - The raw task object from Firebase.
 * @param {Object} allUsers - Map of all known user objects.
 * @param {Object} legacyConnections - Loaded taskUsers connections from Firebase.
 * @returns {Object} Normalized task object ready for UI rendering and caching.
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
 * Processes all tasks and generates HTML strings per status column
 * as well as an updated task cache.
 *
 * @param {Object} tasks - All tasks from Firebase, indexed by task ID.
 * @param {Object} allUsers - Map of all known user objects.
 * @param {Object} legacyConnections - Loaded taskUsers connections from Firebase.
 * @returns {{columns: Object, nextCache: Object}} Column HTML strings and new task cache.
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
 * Fetches all data required for the board in parallel from Firebase.
 *
 * @returns {Promise<{tasks: Object, allUsers: Object, legacyConnections: Object}>}
 * All tasks, user map, and legacy connections.
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
 * Loads all tasks and users from Firebase, normalizes the data,
 * and re-renders the entire board.
 *
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
 * Writes the generated HTML content into the respective column containers of the board
 * and sets drag-and-drop event attributes.
 *
 * @param {Object} columns - Object with status keys and HTML string values.
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
 * Opens the Add Task modal and sets the target status for the new task.
 * Initializes the task editor on first open.
 *
 * @param {string} [status='todo'] - The column status to which the new task will be assigned.
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
 * Cancels a running close timeout on the modal and resets it.
 *
 * @param {HTMLElement} modal - The modal element with an optional _closeTimeout property.
 * @returns {void}
 */
function clearModalCloseTimeout(modal) {
    if (modal._closeTimeout) {
        clearTimeout(modal._closeTimeout);
        modal._closeTimeout = null;
    }
}

/**
 * Scrolls all scrollable areas of the modal back to the top.
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
 * Schedules hiding the modal after the CSS close animation completes (600ms).
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
 * Closes the Add Task modal with animation, resets the form,
 * and re-renders the board.
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
 * Loads a single task from Firebase and enriches it with user data.
 *
 * @param {string} taskId - The Firebase ID of the task.
 * @returns {Promise<Object|null>} Normalized task object or null if not found.
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
 * Opens the detail view of a task.
 * Uses the cache if available, otherwise loads the task from Firebase.
 *
 * @param {string} taskId - The Firebase ID of the task.
 * @returns {Promise<void>}
 */
async function openTaskDetail(taskId) {
    const cachedTask = boardTaskCache[taskId];
    if (cachedTask) { renderTaskDetail(cachedTask, taskId); return; }
    const taskWithUsers = await fetchTaskWithUsers(taskId);
    if (taskWithUsers) renderTaskDetail(taskWithUsers, taskId);
}

/**
 * Renders the task detail overlay with the given task object.
 *
 * @param {Object} task - The normalized task object.
 * @param {string} taskId - The Firebase ID of the task.
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
 * Closes the task detail overlay and restores page scrolling.
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
 * Opens edit mode for a task: loads current data into the buffers,
 * renders the edit template, and populates the dropdown and subtask list.
 *
 * @param {string} taskId - The Firebase ID of the task to edit.
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
 * Adds the currently selected contact from the select element to the edit list.
 * Prevents duplicate entries.
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
 * Adds the selected contact from the select element to the edit contact list.
 * Prevents duplicate entries. Alias for editTaskAssigned with its own select context.
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
 * Toggles the visibility of the contact dropdown list in edit mode
 * and rotates the dropdown arrow accordingly.
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
 * Generates the HTML string for a single contact entry in the edit dropdown.
 *
 * @param {string} userId - The Firebase ID of the user.
 * @param {{name: string, color: string, initials: string}} badge - Badge data of the user.
 * @param {boolean} isAssigned - Whether the user is already assigned.
 * @returns {string} HTML string for the contact entry.
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
 * Populates the contact dropdown in edit mode with all available users.
 * Already assigned contacts are marked as selected.
 *
 * @param {Object} allUsers - Map of all known user objects.
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

document.getElementById('task-search')?.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm.length >= 3 || searchTerm.length === 0) filterTasks(searchTerm);
});

/**
 * Checks whether a task object matches the given search term.
 * Searches title, description, and due date (in European date format).
 *
 * @param {Object} task - The normalized task object to check.
 * @param {string} term - The search term in lowercase.
 * @returns {boolean} True if the task matches the search term.
 */
function taskMatchesTerm(task, term) {
    const title = (task.title || "").toLowerCase();
    const description = (task.description || "").toLowerCase();
    const euDate = (task.dueDate || "").split("-").reverse().join(".");
    return title.includes(term) || description.includes(term) || euDate.includes(term);
}

/**
 * Filters all cached tasks by the search term and renders
 * the filtered results in the board columns.
 *
 * @param {string} term - The search term in lowercase.
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
 * Toggles the assignment status of a user in edit mode:
 * already assigned users are removed, unassigned users are added.
 *
 * @param {string} userId - The Firebase ID of the user.
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
 * Removes a contact from the edit contact list by index.
 *
 * @param {number} index - The index of the contact to remove in currentEditContacts.
 * @returns {void}
 */
function removeContactFromEdit(index) {
    currentEditContacts.splice(index, 1);
    renderEditContactBadges();
}

/**
 * Updates the badge display of assigned contacts in the edit form.
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
 * Reads the value from the subtask input field and adds a new subtask
 * to the edit buffer. Updates the UI afterwards.
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
 * Removes a subtask from the edit buffer by index and updates the UI.
 *
 * @param {number} index - The index of the subtask to delete in currentEditSubtasks.
 * @returns {void}
 */
function deleteSubtaskFromEdit(index) {
    currentEditSubtasks.splice(index, 1);
    refreshEditSubtaskUI();
}

/**
 * Renders the current subtask list from the edit buffer into the UI.
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
 * Sets the active priority in the edit form and updates
 * the visual states of the priority buttons.
 *
 * @param {string} prio - The new priority value ('urgent' | 'medium' | 'low').
 * @returns {void}
 */
function setEditPriority(prio) {
    document.querySelectorAll('.prio-btn-edit')
        .forEach(btn => btn.classList.remove('active-urgent', 'active-medium', 'active-low'));
    document.getElementById('prio-' + prio)?.classList.add('active-' + prio);
}

/**
 * Reads all current values from the edit form and returns them as a task data object.
 *
 * @returns {{title: string, description: string, dueDate: string, priority: string, subtasks: Array, assignedTo: Array}}
 * Object containing the updated task fields.
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
 * Saves the edited task data to Firebase, updates the local cache,
 * and opens the task detail view.
 *
 * @param {string} taskId - The Firebase ID of the task to save.
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
 * Removes a task from the local task cache and the legacy connections cache.
 *
 * @param {string} taskId - The Firebase ID of the task to remove.
 * @returns {void}
 */
function clearTaskFromCache(taskId) {
    delete boardTaskCache[taskId];
    if (boardLegacyConnectionsCache?.[taskId]) delete boardLegacyConnectionsCache[taskId];
}

/**
 * Deletes a task after confirmation from Firebase and the local cache,
 * closes the detail overlay, and re-renders the board.
 *
 * @param {string} taskId - The Firebase ID of the task to delete.
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
 * Updates the completed status of a single subtask in Firebase,
 * re-renders the board, and opens the task detail view.
 *
 * @param {string} taskId - The Firebase ID of the task.
 * @param {number} index - The index of the subtask in the subtasks array.
 * @param {boolean} completed - The new completed status of the subtask.
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
 * Handles dropping a task card via drag-and-drop:
 * updates the task status in Firebase and re-renders the board.
 *
 * @param {string} taskId - The Firebase ID of the dragged task.
 * @param {string} newStatus - The new target status of the column.
 * @returns {void}
 */
function onDrop(taskId, newStatus) {
    if (!taskId) return;
    firebase.database().ref('tasks/' + taskId).update({ status: newStatus })
        .then(() => renderBoard());
}

/**
 * Closes the task detail overlay if the click was directly on the overlay background
 * (not on the content area).
 *
 * @param {MouseEvent} event - The click event on the overlay container.
 * @returns {void}
 */
function handleOverlayClick(event) {
    if (event.target.id === 'task-overlay') closeTaskDetail();
}

/* ==========================================================================
   8. OVERRIDES for taskeditor.js functions
   ========================================================================== */

/**
 * Overrides buildTaskObject() from taskeditor.js.
 * Uses currentSelectedStatus instead of the hardcoded "todo" value
 * so that new tasks are created in the correct column.
 *
 * @returns {{title: string, description: string, dueDate: string, priority: string, category: string, assignedTo: Array, subtasks: Array, status: string, createdAt: number}}
 * The complete task object for Firebase.
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
 * Overrides handleTaskCreatedSuccess() from taskeditor.js.
 * Prevents the redirect to the board page — instead closes the modal
 * and re-renders the board directly.
 *
 * @returns {void}
 */
function handleTaskCreatedSuccess() {
    closeAddTaskModal();
    resetTaskForm();
    renderBoard();
}

// Initial render on page load
renderBoard();