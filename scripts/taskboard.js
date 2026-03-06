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
const BOARD_CACHE_KEY = 'join_board_cache_v1';

/** @type {Object|null} */
/** Cache for all loaded contact objects from Firebase. */
let boardContactsCache = null;

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

/**
 * Normalizes a cached board task badge object.
 *
 * @param {Object} badge - Cached badge object.
 * @returns {{id: string, name: string, color: string, initials: string}|null} Normalized badge or null.
 */
function normalizeCachedBadge(badge) {
    if (!badge || typeof badge !== 'object') return null;
    const name = String(badge.name || '').trim();
    if (!name) return null;
    return {
        id: typeof badge.id === 'string' ? badge.id : '',
        name,
        color: typeof badge.color === 'string' && badge.color ? badge.color : getAvatarColorFromName(name),
        initials: typeof badge.initials === 'string' && badge.initials ? badge.initials : getInitials(name)
    };
}

/**
 * Normalizes a cached board task object.
 *
 * @param {Object} task - Raw cached task object.
 * @returns {Object|null} Normalized task object or null.
 */
function normalizeCachedBoardTask(task) {
    if (!task || typeof task !== 'object') return null;
    const status = BOARD_STATUSES.includes(task.status) ? task.status : 'todo';
    const assignedTo = Array.isArray(task.assignedTo)
        ? task.assignedTo.map(normalizeCachedBadge).filter(Boolean)
        : [];
    return {
        title: task.title || '',
        description: task.description || '',
        dueDate: task.dueDate || '',
        priority: task.priority || 'low',
        category: task.category || '',
        status,
        assignedTo,
        subtasks: normalizeSubtasks(task.subtasks),
        createdAt: task.createdAt || 0
    };
}

/**
 * Reads the cached normalized board task map from localStorage.
 *
 * @returns {Object} Cached board task map.
 */
function readBoardCache() {
    try {
        const raw = localStorage.getItem(BOARD_CACHE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        const normalized = {};
        Object.entries(parsed).forEach(([taskId, task]) => {
            if (typeof taskId !== 'string') return;
            const normalizedTask = normalizeCachedBoardTask(task);
            if (normalizedTask) normalized[taskId] = normalizedTask;
        });
        return normalized;
    } catch (error) {
        return {};
    }
}

/**
 * Writes the normalized board task map to localStorage.
 *
 * @param {Object} taskMap - Normalized task map.
 * @returns {void}
 */
function writeBoardCache(taskMap) {
    try {
        localStorage.setItem(BOARD_CACHE_KEY, JSON.stringify(taskMap || {}));
    } catch (error) {
        return;
    }
}

/**
 * Builds board columns from a normalized cached task map.
 *
 * @param {Object} cachedTasks - Normalized cached task map.
 * @returns {Object} Columns object with HTML per status.
 */
function buildColumnsFromCachedTasks(cachedTasks) {
    const columns = { 'todo': '', 'in-progress': '', 'await-feedback': '', 'done': '' };
    Object.entries(cachedTasks).forEach(([taskId, task]) => {
        if (columns[task.status] !== undefined) {
            columns[task.status] += getCardTemplate(task, taskId);
        }
    });
    return columns;
}

/* ==========================================================================
   2. UTILS & HELPER FUNCTIONS
   ========================================================================== */

// getInitials is defined in taskeditor.js — do not redeclare here

/**
 * Converts a Firebase contact object into a badge object for UI rendering.
 *
 * @param {string} contactId - The Firebase ID of the contact.
 * @param {Object} contact - The contact object from Firebase.
 * @param {string} contact.name - The full name of the contact.
 * @param {string} [contact.color] - The avatar color of the contact.
 * @returns {Object} Badge object containing id, name, color, and initials.
 */
function mapContactToBadge(contactId, contact) {
    const name = contact?.name || '';
    const fallbackColor = name ? getAvatarColorFromName(name) : '#2A3647';
    return {
        id: contactId,
        name: name,
        color: contact?.color || fallbackColor,
        initials: name ? getInitials(name) : '?'
    };
}

/**
 * Normalizes a string-based assigned contact entry using the contact map.
 *
 * @param {string} entry - The Firebase ID of the contact.
 * @param {Object} allContacts - Map of all known contact objects.
 * @returns {Object|null} Badge object or null if contact not found.
 */
function normalizeAssignedContactString(entry, allContacts) {
    const contact = allContacts[entry];
    return contact ? mapContactToBadge(entry, contact) : null;
}

/**
 * Normalizes an object-based assigned contact entry using the contact map.
 *
 * @param {Object} entry - Raw contact object from the task.
 * @param {Object} allContacts - Map of all known contact objects.
 * @returns {Object|null} Normalized badge object or null if name is missing.
 */
function normalizeAssignedContactObject(entry, allContacts) {
    const id = entry.id || '';
    const fullContact = id ? allContacts[id] : null;
    const name = entry.name || fullContact?.name || '';
    if (!name) return null;
    return {
        id,
        name,
        color: entry.color || fullContact?.color || getAvatarColorFromName(name),
        initials: entry.initials || getInitials(name)
    };
}

/**
 * Normalizes a single entry from a task's assignedTo list into a unified badge object.
 *
 * @param {string|Object|null} entry - Raw entry (ID string or object).
 * @param {Object} allContacts - Map of all known contact objects.
 * @returns {Object|null} Badge object or null.
 */
function normalizeAssignedContact(entry, allContacts) {
    if (!entry) return null;
    if (typeof entry === 'string') return normalizeAssignedContactString(entry, allContacts);
    if (typeof entry === 'object') return normalizeAssignedContactObject(entry, allContacts);
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
 * @param {Object} allContacts - Map of all known contact objects.
 * @param {Object} legacyConnections - Loaded taskUsers connections.
 * @returns {Array} Array of badge objects.
 */
function buildAssignedFromLegacy(taskId, allContacts, legacyConnections) {
    const legacyIds = legacyConnections[taskId] ? Object.keys(legacyConnections[taskId]) : [];
    return legacyIds
        .map((contactId) => mapContactToBadge(contactId, allContacts[contactId]))
        .filter((contact) => contact.name);
}

/**
 * Resolves all assigned contacts of a task and returns them as a badge array.
 *
 * @param {string} taskId - The Firebase ID of the task.
 * @param {Object} task - The raw task object from Firebase.
 * @param {Object} allContacts - Map of all known contact objects.
 * @param {Object} legacyConnections - Loaded taskUsers connections.
 * @returns {Array} Array of badge objects.
 */
function buildAssignedContacts(taskId, task, allContacts, legacyConnections) {
    const assignedRaw = Array.isArray(task.assignedTo) ? task.assignedTo : [];
    const assignedFromTask = assignedRaw
        .map((entry) => normalizeAssignedContact(entry, allContacts))
        .filter((contact) => contact !== null);
    if (assignedFromTask.length > 0 || Array.isArray(task.assignedTo)) return assignedFromTask;
    return buildAssignedFromLegacy(taskId, allContacts, legacyConnections);
}

/**
 * Returns the contacts map from Firebase. Uses in-memory cache.
 *
 * @async
 * @returns {Promise<Object>} Map of all contact objects.
 */
async function getContactsMap() {
    if (boardContactsCache) return boardContactsCache;
    const snapshot = await firebase.database().ref('contacts').get();
    boardContactsCache = snapshot.val() || {};
    const ownAccountContact = await fetchOwnAccountContactForBoard();
    if (ownAccountContact && !boardContactsCache[ownAccountContact.id]) {
        boardContactsCache[ownAccountContact.id] = ownAccountContact;
    }
    return boardContactsCache;
}

/**
 * Returns the signed-in account as a board-selectable contact.
 *
 * @async
 * @returns {Promise<{id: string, name: string, email: string, color: string}|null>} Own-account contact or null.
 */
async function fetchOwnAccountContactForBoard() {
    if (!window?.userContext?.getActiveUserProfile) return null;
    const profile = await window.userContext.getActiveUserProfile();
    if (!profile?.id) return null;

    const contactName = String(profile.name || profile.email?.split('@')[0] || 'User').trim();
    if (!contactName) return null;

    return {
        id: `self_${profile.id}`,
        name: contactName,
        email: String(profile.email || ''),
        color: profile.color || getAvatarColorFromName(contactName)
    };
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
 * Normalizes a single task object with resolved contacts and subtasks.
 *
 * @param {string} taskId - The Firebase ID of the task.
 * @param {Object} task - The raw task object.
 * @param {Object} allContacts - Map of all known contacts.
 * @param {Object} legacyConnections - Legacy task-user connections.
 * @returns {Object} Normalized task object.
 */
function normalizeTask(taskId, task, allContacts, legacyConnections) {
    return {
        ...task,
        assignedTo: buildAssignedContacts(taskId, task, allContacts, legacyConnections),
        subtasks: normalizeSubtasks(task.subtasks),
        priority: task.priority || 'low'
    };
}

/**
 * Processes all tasks and generates HTML strings per column.
 *
 * @param {Object} tasks - All tasks from Firebase.
 * @param {Object} allContacts - Map of all known contacts.
 * @param {Object} legacyConnections - Legacy connections.
 * @returns {Object} Object containing columns HTML and nextCache.
 */
function buildColumnsFromTasks(tasks, allContacts, legacyConnections) {
    const columns = { 'todo': '', 'in-progress': '', 'await-feedback': '', 'done': '' };
    const nextCache = {};
    Object.entries(tasks).forEach(([taskId, task]) => {
        const normalized = normalizeTask(taskId, task, allContacts, legacyConnections);
        nextCache[taskId] = normalized;
        if (columns[task.status] !== undefined) columns[task.status] += getCardTemplate(normalized, taskId);
    });
    return { columns, nextCache };
}

/**
 * Fetches all required board data from Firebase in parallel.
 *
 * @async
 * @returns {Promise<Object>} Object containing tasks, contacts, and legacy connections.
 */
async function fetchBoardData() {
    const tasksPromise = firebase.database().ref('tasks').get();
    const contactsPromise = getContactsMap();
    const tasksSnapshot = await tasksPromise;
    const tasks = tasksSnapshot.val() || {};
    const [allContacts, legacyConnections] = await Promise.all([contactsPromise, getLegacyTaskConnections(tasks)]);
    return { tasks, allContacts, legacyConnections };
}

/**
 * Loads data, normalizes it, and re-renders the entire board UI.
 *
 * @async
 * @returns {Promise<void>}
 */
async function renderBoard(options = {}) {
    const preferCache = options?.preferCache !== false;
    const cachedTasks = preferCache ? readBoardCache() : {};
    if (Object.keys(cachedTasks).length) {
        boardTaskCache = cachedTasks;
        renderColumnHTML(buildColumnsFromCachedTasks(cachedTasks));
    }

    try {
        const { tasks, allContacts, legacyConnections } = await fetchBoardData();
        const { columns, nextCache } = buildColumnsFromTasks(tasks, allContacts, legacyConnections);
        boardTaskCache = nextCache;
        renderColumnHTML(columns);
        writeBoardCache(nextCache);
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
 * Loads a single task and enriches it with contact data.
 *
 * @async
 * @param {string} taskId - Firebase task ID.
 * @returns {Promise<Object|null>} Normalized task or null.
 */
async function fetchTaskWithContacts(taskId) {
    const [taskSnap, allContacts] = await Promise.all([
        firebase.database().ref('tasks/' + taskId).get(),
        getContactsMap()
    ]);
    const task = taskSnap.val();
    if (!task) return null;
    return normalizeTask(taskId, task, allContacts, boardLegacyConnectionsCache || {});
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
    const taskWithContacts = await fetchTaskWithContacts(taskId);
    if (taskWithContacts) renderTaskDetail(taskWithContacts, taskId);
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
    const allContacts = await getContactsMap();
    const overlayCard = document.querySelector('#task-overlay .overlay-card');
    overlayCard.innerHTML = getEditTaskTemplate(task, taskId);
    fillContactDropdown(allContacts);
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
    const contact = boardContactsCache?.[select.value];
    if (contact && !currentEditContacts.some(c => c.id === select.value)) {
        currentEditContacts.push(mapContactToBadge(select.value, contact));
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
    const contact = boardContactsCache?.[select.value];
    if (contact && !currentEditContacts.some(c => c.id === select.value)) {
        currentEditContacts.push(mapContactToBadge(select.value, contact));
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
 * @param {string} contactId - Firebase contact ID.
 * @param {Object} badge - Contact badge data.
 * @param {boolean} isAssigned - Whether the contact is currently assigned.
 * @returns {string} HTML string.
 */
function buildContactItemHTML(contactId, badge, isAssigned) {
    const displayName = formatContactDisplayName(contactId, badge?.name || '');
    return `<div class="contact-item ${isAssigned ? 'selected' : ''}" onclick="toggleContactSelection('${contactId}')">
        <div class="contact-item-left">
            <div class="user-badge" style="background-color: ${badge.color}">${badge.initials}</div>
            <span>${displayName}</span>
        </div>
        <img src="../assets/icons/checkbox_${isAssigned ? 'white' : 'empty'}.svg">
    </div>`;
}

/**
 * Formats contact names for UI display and marks own account.
 *
 * @param {string} contactId - Contact id.
 * @param {string} contactName - Contact name.
 * @returns {string} Display name.
 */
function formatContactDisplayName(contactId, contactName) {
    if (String(contactId || '').startsWith('self_')) return `${contactName} (You)`;
    return contactName;
}

/**
 * Sorts contact entries for the edit dropdown.
 * Own account stays on top; all other contacts are sorted alphabetically.
 *
 * @param {Object} allContacts - Map of all contacts.
 * @returns {Array<[string, Object]>} Sorted entries.
 */
function getSortedEditContactEntries(allContacts) {
    const entries = Object.entries(allContacts || {});
    return entries.sort(([leftId, leftContact], [rightId, rightContact]) => {
        const leftIsOwn = String(leftId || '').startsWith('self_');
        const rightIsOwn = String(rightId || '').startsWith('self_');
        if (leftIsOwn !== rightIsOwn) return leftIsOwn ? -1 : 1;

        const leftName = String(leftContact?.name || leftContact?.email || '').trim();
        const rightName = String(rightContact?.name || rightContact?.email || '').trim();
        return leftName.localeCompare(rightName, 'de', { sensitivity: 'base' });
    });
}

/**
 * Populates the dropdown menu with all available contacts for assignment.
 *
 * @param {Object} allContacts - Map of all contacts.
 * @returns {void}
 */
function fillContactDropdown(allContacts) {
    const listContainer = document.getElementById('edit-contact-list');
    if (!listContainer) return;
    let html = '';
    const sortedEntries = getSortedEditContactEntries(allContacts);
    sortedEntries.forEach(([contactId, contact]) => {
        const isAssigned = currentEditContacts.some(c => c.id === contactId);
        html += buildContactItemHTML(contactId, mapContactToBadge(contactId, contact), isAssigned);
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
 * Toggles a contact's selection status in the edit buffer.
 *
 * @param {string} contactId - Firebase contact ID.
 * @returns {void}
 */
function toggleContactSelection(contactId) {
    const contactIndex = currentEditContacts.findIndex(c => c.id === contactId);
    if (contactIndex > -1) currentEditContacts.splice(contactIndex, 1);
    else currentEditContacts.push(mapContactToBadge(contactId, boardContactsCache?.[contactId]));
    fillContactDropdown(boardContactsCache);
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
    writeBoardCache(boardTaskCache);
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
        assignedTo: getAssignedContacts(),
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