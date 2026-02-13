async function renderBoard() {
  try {
    const [tasksSnapshot, usersSnapshot, taskUsersSnapshot] = await Promise.all([
      firebase.database().ref('tasks').get(),
      firebase.database().ref('users').get(),
      firebase.database().ref('taskUsers').get()
    ]);

    const tasks = tasksSnapshot.val() || {};
    const allUsers = usersSnapshot.val() || {};
    const connections = taskUsersSnapshot.val() || {};
    const columns = { 'todo': '', 'in-progress': '', 'await-feedback': '', 'done': '' };

    Object.entries(tasks).forEach(([taskId, task]) => {
      // Suche User-IDs in connections ODER direkt im Task-Objekt
      let userIdsFromConnections = connections[taskId] ? Object.keys(connections[taskId]) : [];
      let userIdsFromTask = Array.isArray(task.assignedTo) ? task.assignedTo : [];
      
      // Kombiniere beide Quellen (einige Apps speichern IDs direkt im Task)
      let combinedIds = [...new Set([...userIdsFromConnections, ...userIdsFromTask])];

      const assignedUsers = combinedIds.map(uid => {
        // Falls uid ein Objekt ist (z.B. {id: '...'}), nimm die ID
        const id = typeof uid === 'object' ? uid.id : uid;
        const user = allUsers[id];
        if (!user) return null;
        const name = user.name || '';
        const fallbackColor = name ? getAvatarColorFromName(name) : '#2A3647';
        return {
          name,
          color: user.color || fallbackColor,
          initials: name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'
        };
      }).filter(u => u !== null);

      const subtasks = task.subtasks || [];
      const subtasksArray = Array.isArray(subtasks) ? subtasks : Object.values(subtasks);
      
      const taskWithUsers = { 
        ...task, 
        assignedTo: assignedUsers, 
        subtasks: subtasksArray 
      };
      
      if (columns[task.status] !== undefined) {
        columns[task.status] += getCardTemplate(taskWithUsers, taskId);
      }
    });

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
    ['todo', 'in-progress', 'await-feedback', 'done'].forEach(status => {
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
  const [taskSnap, usersSnap] = await Promise.all([
    firebase.database().ref('tasks/' + taskId).get(),
    firebase.database().ref('users').get()
  ]);

  const task = taskSnap.val();
  if (!task) return;

  const allUsers = usersSnap.val() || {};

  const assignedUsers = Array.isArray(task.assignedTo)
    ? task.assignedTo.map(u => {
        const fullUser = allUsers[u.id];

        const name = u.name || fullUser?.name || 'Unknown';
        const fallbackColor = getAvatarColorFromName(name);

        return {
          name,
          color: fullUser?.color || fallbackColor,
          initials: name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
        };
      })
    : [];

  const taskWithUsers = {
    ...task,
    assignedTo: assignedUsers,
    priority: task.priority || 'low'
  };

  const overlay = document.getElementById('task-overlay');
  if (!overlay) return;

  overlay.querySelector('.overlay-card').innerHTML =
    getTaskDetailTemplate(taskWithUsers, taskId);

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

    renderBoard();
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
