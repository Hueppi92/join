const BOARD_STATUSES = ['todo', 'in-progress', 'await-feedback', 'done'];
let boardUsersCache = null;
let boardLegacyConnectionsCache = null;
let boardTaskCache = {};

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function mapUserToBadge(userId, user) {
  const name = user?.name || '';
  const fallbackColor = name ? getAvatarColorFromName(name) : '#2A3647';
  return {
    id: userId,
    name,
    color: user?.color || fallbackColor,
    initials: name ? getInitials(name) : '?'
  };
}

function normalizeAssignedUser(entry, allUsers) {
  if (!entry) return null;

  if (typeof entry === 'string') {
    const user = allUsers[entry];
    return user ? mapUserToBadge(entry, user) : null;
  }

  if (typeof entry === 'object') {
    const id = entry.id || '';
    const fullUser = id ? allUsers[id] : null;
    const name = entry.name || fullUser?.name || '';
    if (!name) return null;

    const fallbackColor = getAvatarColorFromName(name);
    return {
      id,
      name,
      color: entry.color || fullUser?.color || fallbackColor,
      initials: entry.initials || getInitials(name)
    };
  }

  return null;
}

function normalizeSubtasks(subtasks) {
  const subtasksRaw = subtasks || [];
  return Array.isArray(subtasksRaw) ? subtasksRaw : Object.values(subtasksRaw);
}

function buildAssignedUsers(taskId, task, allUsers, legacyConnections) {
  const assignedRaw = Array.isArray(task.assignedTo) ? task.assignedTo : [];
  const assignedFromTask = assignedRaw
    .map((entry) => normalizeAssignedUser(entry, allUsers))
    .filter((user) => user !== null);

  if (assignedFromTask.length > 0 || Array.isArray(task.assignedTo)) {
    return assignedFromTask;
  }

  const legacyIds = legacyConnections[taskId] ? Object.keys(legacyConnections[taskId]) : [];
  return legacyIds
    .map((userId) => mapUserToBadge(userId, allUsers[userId]))
    .filter((user) => user.name);
}

async function getUsersMap() {
  if (boardUsersCache) return boardUsersCache;
  const snapshot = await firebase.database().ref('users').get();
  boardUsersCache = snapshot.val() || {};
  return boardUsersCache;
}

async function getLegacyTaskConnections(tasks) {
  if (boardLegacyConnectionsCache) return boardLegacyConnectionsCache;

  const needsLegacyConnections = Object.values(tasks).some(
    (task) => !Array.isArray(task.assignedTo)
  );
  if (!needsLegacyConnections) return {};

  const snapshot = await firebase.database().ref('taskUsers').get();
  boardLegacyConnectionsCache = snapshot.val() || {};
  return boardLegacyConnectionsCache;
}

async function renderBoard() {
  try {
    const tasksPromise = firebase.database().ref('tasks').get();
    const usersPromise = getUsersMap();

    const tasksSnapshot = await tasksPromise;
    const tasks = tasksSnapshot.val() || {};

    const [allUsers, legacyConnections] = await Promise.all([
      usersPromise,
      getLegacyTaskConnections(tasks)
    ]);

    const columns = { 'todo': '', 'in-progress': '', 'await-feedback': '', 'done': '' };
    const nextTaskCache = {};

    Object.entries(tasks).forEach(([taskId, task]) => {
      const taskWithUsers = {
        ...task,
        assignedTo: buildAssignedUsers(taskId, task, allUsers, legacyConnections),
        subtasks: normalizeSubtasks(task.subtasks),
        priority: task.priority || 'low'
      };

      nextTaskCache[taskId] = taskWithUsers;

      if (columns[task.status] !== undefined) {
        columns[task.status] += getCardTemplate(taskWithUsers, taskId);
      }
    });

    boardTaskCache = nextTaskCache;
    renderColumnHTML(columns);
  } catch (error) {
    console.error("Fehler beim Rendern des Boards:", error);
  }
}

/**
 * Schreibt das generierte HTML in die entsprechenden DOM-Elemente der Spalten.
 * @function renderColumnHTML
 * @param {Object} columns - Objekt mit HTML-Strings pro Status.
 */
function renderColumnHTML(columns) {
    BOARD_STATUSES.forEach(status => {
        const col = document.querySelector(`#${status} .task-list`);
        if (col) {
          col.innerHTML = columns[status] || `<div class="empty-msg">No tasks ${status.replace('-', ' ')}</div>`;
          col.setAttribute('ondragover', 'event.preventDefault()');
          col.setAttribute('ondrop', `onDrop(event.dataTransfer.getData('text/plain'),'${status}')`);
        }
    });
}

/**
 * Öffnet das Add-Task Modal und setzt den Status der Zielspalte.
 * @function openAddTaskModalBoard
 * @param {string} [status='todo'] - Der Status der Spalte.
 */
function openAddTaskModalBoard(status = 'todo') {
    currentSelectedStatus = status; 
    const modal = document.getElementById('addTaskModal');
    
    if (modal) {
        if (modal._closeTimeout) {
            clearTimeout(modal._closeTimeout);
            modal._closeTimeout = null;
        }

        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('is-open'));
        modal.setAttribute('aria-hidden', 'false');
        
        // Das ist der entscheidende Teil:
        // Wir prüfen, ob die Initialisierung vom Task-Editor geladen ist
        if (typeof initTaskEditor === 'function') {
            initTaskEditor(); 
        } else {
            console.warn("initTaskEditor nicht gefunden. Event-Listener wurden evtl. nicht gebunden.");
        }
    } else {
        console.error("Fehler: Element mit ID 'addTaskModal' wurde nicht gefunden!");
    }
}
/**
 * Schließt das Add-Task Modal und setzt das Formular zurück.
 * @function closeAddTaskModal
 */
function closeAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    if (modal) {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        if (modal._closeTimeout) {
            clearTimeout(modal._closeTimeout);
        }
        modal._closeTimeout = setTimeout(() => {
            modal.classList.add('hidden');
            modal._closeTimeout = null;
        }, 600);

        const form = document.querySelector('.new_task');
        if (form) form.reset();
    }
}

/**
 * Öffnet das Detail-Overlay für eine spezifische Task.
 * @async
 * @function openTaskDetail
 * @param {string} taskId - Die eindeutige ID der Task aus Firebase.
 */
async function openTaskDetail(taskId) {
  const cachedTask = boardTaskCache[taskId];
  if (cachedTask) {
    renderTaskDetail(cachedTask, taskId);
    return;
  }

  const [taskSnap, allUsers] = await Promise.all([
    firebase.database().ref('tasks/' + taskId).get(),
    getUsersMap()
  ]);

  const task = taskSnap.val();
  if (!task) return;

  const taskWithUsers = {
    ...task,
    assignedTo: buildAssignedUsers(
      taskId,
      task,
      allUsers,
      boardLegacyConnectionsCache || {}
    ),
    subtasks: normalizeSubtasks(task.subtasks),
    priority: task.priority || 'low'
  };

  renderTaskDetail(taskWithUsers, taskId);
}

function renderTaskDetail(task, taskId) {
  const overlay = document.getElementById('task-overlay');
  if (!overlay) return;

  overlay.querySelector('.overlay-card').innerHTML = getTaskDetailTemplate(task, taskId);
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/**
 * Schließt das Task-Detail-Overlay.
 * @function closeTaskDetail
 */
function closeTaskDetail() {
  document.getElementById('task-overlay').classList.add('hidden');
  document.body.style.overflow = 'auto';
}

/**
 * Löscht eine Task und deren Benutzerverknüpfungen aus der Datenbank.
 * @async
 * @function deleteTask
 * @param {string} taskId - Die ID der zu löschenden Task.
 */
async function deleteTask(taskId) {
    if (confirm('Task wirklich löschen?')) {
        await firebase.database().ref('tasks/' + taskId).remove();
        await firebase.database().ref('taskUsers/' + taskId).remove();
        delete boardTaskCache[taskId];
        if (boardLegacyConnectionsCache?.[taskId]) {
          delete boardLegacyConnectionsCache[taskId];
        }
        closeTaskDetail();
        renderBoard();
    }
}

/**
 * Navigiert zum Editor für eine bestehende Task.
 * @function editTask
 * @param {string} taskId - Die ID der zu bearbeitenden Task.
 */
function editTask(taskId) {
    window.location.href = `task-editor.html?id=${taskId}`;
}

/**
 * Aktualisiert den Status eines Subtasks in Firebase.
 * @async
 * @function updateSubtaskStatus
 * @param {string} taskId - ID der Task.
 * @param {number} index - Index des Subtasks.
 * @param {boolean} completed - Neuer Status des Subtasks.
 */
async function updateSubtaskStatus(taskId, index, completed) {
    const subtaskRef = firebase
        .database()
        .ref(`tasks/${taskId}/subtasks/${index}`);

    // aktuellen Subtask holen
    const snapshot = await subtaskRef.once('value');
    const oldSubtask = snapshot.val();

    let updatedSubtask;

    // 🔒 Absicherung für alte String-Subtasks
    if (typeof oldSubtask === 'string') {
        updatedSubtask = {
            title: oldSubtask,
            completed: completed
        };
    } else {
        updatedSubtask = {
            ...oldSubtask,
            completed: completed
        };
    }

    // 🔥 kompletten Subtask sauber zurückschreiben
    await subtaskRef.set(updatedSubtask);

    await renderBoard();
    openTaskDetail(taskId);
}

/**
 * Aktualisiert den Status einer Task nach einem Drag-and-Drop Event.
 * @function onDrop
 * @param {string} taskId - Die ID der verschobenen Task.
 * @param {string} newStatus - Der neue Status der Task.
 */
function onDrop(taskId, newStatus) {
  if (!taskId) return;
  firebase.database().ref('tasks/' + taskId).update({ status: newStatus })
    .then(() => renderBoard());
}

/**
 * Behandelt Klicks auf den Overlay-Hintergrund zum Schließen.
 * @function handleOverlayClick
 * @param {Event} event - Das DOM-Event.
 */
function handleOverlayClick(event) {
  if (event.target.id === 'task-overlay') closeTaskDetail();
}

// Initialisierung
renderBoard();
