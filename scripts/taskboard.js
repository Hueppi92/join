/**
 * Öffnet das Task-Detail-Overlay und lädt die Task-Daten aus Firebase.
 * 
 * @async
 * @param {string} taskId - Die eindeutige ID der Task, die angezeigt werden soll.
 * @returns {Promise<void>}
 */
async function openTaskDetail(taskId) {
  const snapshot = await firebase.database().ref('tasks/' + taskId).get();
  const task = snapshot.val(); 

  const overlay = document.getElementById('task-overlay');
  overlay.querySelector('.overlay-card').innerHTML =
    getTaskDetailTemplate(task, taskId);

  overlay.classList.remove('hidden');
}

/**
 * Schließt das Task-Detail-Overlay.
 * 
 * @returns {void}
 */
function closeTaskDetail() {
  document.getElementById('task-overlay').classList.add('hidden');
}

/**
 * Handler für Klicks auf das Overlay. Schließt das Overlay,
 * wenn außerhalb der Card geklickt wird.
 * 
 * @param {MouseEvent} event - Das Klick-Ereignis.
 * @returns {void}
 */
function handleOverlayClick(event) {
  if (event.target.id === 'task-overlay') {
    closeTaskDetail();
  }
}

/**
 * Aktualisiert den Status einer Task in Firebase, wenn diese in eine andere Spalte gezogen wird.
 * 
 * @param {string} taskId - Die ID der Task, die verschoben wurde.
 * @param {string} newStatus - Der neue Status der Task ("todo", "in-progress", "await-feedback", "done").
 * @returns {void}
 */
function onDrop(taskId, newStatus) {
  if (!taskId) return;

  firebase.database().ref('tasks/' + taskId).update({ status: newStatus });
  renderBoard();
}

/**
 * Rendert das gesamte Board. Lädt alle Tasks aus Firebase, sortiert sie nach Status
 * und fügt sie in die entsprechenden Spalten ein.
 * 
 * @async
 * @returns {Promise<void>}
 */
async function renderBoard() {
  const snapshot = await firebase.database().ref('tasks').get();
  const data = snapshot.val();

  // Initial leere Spalten
  const columns = {
    'todo': '',
    'in-progress': '',
    'await-feedback': '',
    'done': ''
  };

  if (data) {
    Object.entries(data).forEach(([key, task]) => {
      if (columns[task.status] !== undefined) {
        columns[task.status] += getCardTemplate(task, key);
      }
    });
  }

  // Platzhalter, wenn keine Tasks vorhanden sind
  Object.keys(columns).forEach(status => {
    if (!columns[status]) {
      columns[status] =
        `<div class="empty-msg">No tasks ${status.replace('-', ' ')}</div>`;
    }
  });

  // Spalten ins DOM rendern
  ['todo', 'in-progress', 'await-feedback', 'done'].forEach(status => {
    const col = document.querySelector(`#${status} .task-list`);
    col.innerHTML = columns[status];
    col.setAttribute('ondragover', 'event.preventDefault()');
    col.setAttribute(
      'ondrop',
      `onDrop(event.dataTransfer.getData('text/plain'),'${status}')`
    );
  });
}

// Initiales Board-Rendering
renderBoard();
