/**
 * @file taskboard.js
 * @description Steuert die Logik des Kanban-Boards, inklusive Laden der Daten aus Firebase, 
 * Drag-and-Drop Funktionalität und Steuerung der Modals.
 */

/** @type {string} Speichert den Status der Spalte, in der eine neue Task erstellt werden soll. */
let currentSelectedStatus = 'todo'; 

/**
 * Lädt Tasks, Benutzer und deren Verknüpfungen aus der Firebase Realtime Database
 * und rendert die Task-Karten in die entsprechenden Spalten.
 * @async
 * @function renderBoard
 * @returns {Promise<void>}
 */
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
      const userIdsForTask = connections[taskId] ? Object.keys(connections[taskId]) : [];
      const assignedUsers = userIdsForTask.map(uid => {
        const user = allUsers[uid];
        if (!user) return null;
        return {
          name: user.name,
          color: user.color || '#2A3647',
          initials: user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'
        };
      }).filter(u => u !== null);

      const taskWithUsers = { ...task, assignedTo: assignedUsers };
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
 * @function openAddTaskModal
 * @param {string} [status='todo'] - Der Status der Spalte.
 */
function openAddTaskModal(status = 'todo') {
    console.log("Versuche Modal zu öffnen für Status:", status);
    
    // 1. Status global speichern
    currentSelectedStatus = status; 
    
    // 2. Element suchen
    const modal = document.getElementById('addTaskModal');
    
    if (modal) {
        modal.classList.remove('hidden');
        console.log("Modal gefunden und 'hidden' entfernt.");
    } else {
        console.error("Fehler: Element mit ID 'addTaskModal' wurde im HTML nicht gefunden!");
    }
}

/**
 * Schließt das Add-Task Modal und setzt das Formular zurück.
 * @function closeAddTaskModal
 */
function closeAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    if (modal) {
        modal.classList.add('hidden');
        const form = document.querySelector('.new_task');
        if (form) form.reset();
    }
}

/**
 * Liest die Formulardaten aus und erstellt eine neue Task in Firebase.
 * @async
 * @function createTask
 */
async function createTask() {
    const titleInput = document.getElementById('titleInput');
    const dateInput = document.getElementById('dateInput');
    
    if (!titleInput.value || !dateInput.value) {
        alert("Bitte Titel und Datum angeben.");
        return;
    }

    const newTask = {
        title: titleInput.value,
        description: document.querySelector('.description_box textarea').value || '',
        dueDate: dateInput.value,
        priority: document.querySelector('.prio.active')?.dataset.prio || 'medium',
        category: document.getElementById('categorySelect').value || 'User Story',
        status: currentSelectedStatus,
        createdAt: new Date().getTime()
    };

    try {
        await firebase.database().ref('tasks').push(newTask);
        closeAddTaskModal();
        renderBoard();
    } catch (error) {
        console.error("Fehler beim Erstellen der Task:", error);
    }
}

/**
 * Öffnet das Detail-Overlay für eine spezifische Task.
 * @async
 * @function openTaskDetail
 * @param {string} taskId - Die eindeutige ID der Task aus Firebase.
 */
async function openTaskDetail(taskId) {
  const [taskSnap, usersSnap, taskUsersSnap] = await Promise.all([
    firebase.database().ref('tasks/' + taskId).get(),
    firebase.database().ref('users').get(),
    firebase.database().ref('taskUsers/' + taskId).get()
  ]);

  const task = taskSnap.val();
  if (!task) return;

  const allUsers = usersSnap.val() || {};
  const userIds = taskUsersSnap.val() ? Object.keys(taskUsersSnap.val()) : [];
  const assignedUsers = userIds.map(uid => {
    const u = allUsers[uid];
    return u ? { 
      name: u.name, 
      color: u.color || '#2A3647',
      initials: u.name ? u.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'
    } : null;
  }).filter(u => u !== null);

  const taskWithUsers = { ...task, assignedTo: assignedUsers };
  const overlay = document.getElementById('task-overlay');
  overlay.querySelector('.overlay-card').innerHTML = getTaskDetailTemplate(taskWithUsers, taskId);
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
    await firebase.database().ref(`tasks/${taskId}/subtasks/${index}`).update({ completed });
    renderBoard();
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