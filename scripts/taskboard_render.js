/**
 * @category Board
 * @file taskboard-render.js
 * Board-Rendering, Modal-Management, Suche, Task-Detail
 */

/* ==========================================================================
   1. BOARD RENDERING
   ========================================================================== */

/**
 * Normalizes a single task object with resolved contacts and subtasks.
 * @param {string} taskId
 * @param {Object} task
 * @param {Object} allContacts
 * @param {Object} legacyConnections
 * @returns {Object}
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
 * @param {Object} tasks
 * @param {Object} allContacts
 * @param {Object} legacyConnections
 * @returns {{ columns: Object, nextCache: Object }}
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
 * @async
 * @returns {Promise<{ tasks: Object, allContacts: Object, legacyConnections: Object }>}
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
 * @async
 * @param {Object} [options]
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
 * @param {Object} columns
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
   2. SEARCH
   ========================================================================== */

document.getElementById('task-search')?.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm.length >= 3 || searchTerm.length === 0) filterTasks(searchTerm);
});

/**
 * Checks if a task matches the search criteria.
 * @param {Object} task
 * @param {string} term
 * @returns {boolean}
 */
function taskMatchesTerm(task, term) {
    const title = (task.title || "").toLowerCase();
    const description = (task.description || "").toLowerCase();
    const euDate = (task.dueDate || "").split("-").reverse().join(".");
    return title.includes(term) || description.includes(term) || euDate.includes(term);
}

/**
 * Filters the board based on a search term.
 * @async
 * @param {string} term
 * @returns {Promise<void>}
 */
async function filterTasks(term) {
    const noResultsEl = document.getElementById('board-no-results');
    const searchTermEl = document.getElementById('board-search-term');
    const filteredColumns = { 'todo': '', 'in-progress': '', 'await-feedback': '', 'done': '' };
    Object.entries(boardTaskCache).forEach(([taskId, task]) => {
        if (taskMatchesTerm(task, term) && filteredColumns[task.status] !== undefined) {
            filteredColumns[task.status] += getCardTemplate(task, taskId);
        }
    });
    const noResults = term.length > 0 && Object.values(filteredColumns).every(html => html === '');
    if (noResultsEl) noResultsEl.classList.toggle('hidden', !noResults);
    if (searchTermEl) searchTermEl.textContent = term;
    renderColumnHTML(filteredColumns);
}

/* ==========================================================================
   3. MODAL MANAGEMENT (ADD TASK)
   ========================================================================== */

/**
 * Opens the Add Task modal and sets the target column status.
 * @param {string} [status='todo']
 * @returns {void}
 */
function openAddTaskModalBoard(status = 'todo') {
    currentSelectedStatus = status;
    window.currentSelectedStatus = status;
    const modal = document.getElementById('addTaskModal');
    if (!modal) return;
    modal._returnFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (modal._closeTimeout) { clearTimeout(modal._closeTimeout); modal._closeTimeout = null; }
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('is-open'));
    modal.setAttribute('aria-hidden', 'false');
    modal.scrollTop = 0;
    modal.querySelector('.modal-content')?.scrollTo(0, 0);
    modal.querySelector('.editor_wrapper')?.scrollTo(0, 0);
    if (typeof initTaskEditor === 'function') initTaskEditor();
}

/**
 * Closes the Add Task modal and refreshes the board.
 * @returns {void}
 */
function closeAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    if (modal) {
        releaseAddTaskModalFocus(modal);
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        if (modal._closeTimeout) clearTimeout(modal._closeTimeout);
        modal._closeTimeout = setTimeout(() => { modal.classList.add('hidden'); modal._closeTimeout = null; }, 600);
        document.querySelector('.new_task')?.reset();
    }
    renderBoard();
}

/**
 * Moves focus out of the Add Task modal before hiding it.
 * @param {HTMLElement} modal
 * @returns {void}
 */
function releaseAddTaskModalFocus(modal) {
    const activeElement = document.activeElement;
    if (!activeElement || !modal.contains(activeElement)) return;
    if (typeof activeElement.blur === 'function') activeElement.blur();
    if (!modal.contains(document.activeElement)) return;
    const fallbackTarget =
        (modal._returnFocusTarget instanceof HTMLElement && document.contains(modal._returnFocusTarget)
            ? modal._returnFocusTarget : null) ||
        document.querySelector('.add-task') ||
        document.querySelector('.add-column-btn');
    if (fallbackTarget instanceof HTMLElement) fallbackTarget.focus();
}

/* ==========================================================================
   4. TASK DETAIL
   ========================================================================== */

/**
 * Loads a single task and enriches it with contact data.
 * @async
 * @param {string} taskId
 * @returns {Promise<Object|null>}
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
 * @async
 * @param {string} taskId
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
 * @param {Object} task
 * @param {string} taskId
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
 * Closes the task detail overlay.
 * @returns {void}
 */
function closeTaskDetail() {
    document.getElementById('task-overlay').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

/**
 * Closes task detail if the user clicks the overlay background.
 * @param {MouseEvent} event
 * @returns {void}
 */
function handleOverlayClick(event) {
    if (event.target.id === 'task-overlay') closeTaskDetail();
}

/* ==========================================================================
   5. OVERRIDES for taskeditor.js
   ========================================================================== */

/**
 * Overrides core task building to include correct board column status.
 * @returns {Object}
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
 * @returns {void}
 */
function handleTaskCreatedSuccess() {
    closeAddTaskModal();
    resetTaskForm();
    renderBoard();
}

// Initial board rendering on page load
renderBoard();