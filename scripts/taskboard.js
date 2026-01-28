// ===============================
// OVERLAY CONTROL
// ===============================
async function openTaskDetail(taskId) {
  const snapshot = await firebase.database().ref('tasks/' + taskId).get();
  const task = snapshot.val(); // aktuell noch ungenutzt (statisch)

  const overlay = document.getElementById('task-overlay');
  overlay.querySelector('.overlay-card').innerHTML =
    getTaskDetailTemplate(task, taskId);

  overlay.classList.remove('hidden');
}

function closeTaskDetail() {
  document.getElementById('task-overlay').classList.add('hidden');
}

function handleOverlayClick(event) {
  if (event.target.id === 'task-overlay') {
    closeTaskDetail();
  }
}


// ===============================
// DRAG & DROP
// ===============================
function onDrop(taskId, newStatus) {
  if (!taskId) return;

  firebase.database().ref('tasks/' + taskId).update({ status: newStatus });
  renderBoard();
}


// ===============================
// RENDER BOARD
// ===============================
async function renderBoard() {
  const snapshot = await firebase.database().ref('tasks').get();
  const data = snapshot.val();

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

  Object.keys(columns).forEach(status => {
    if (!columns[status]) {
      columns[status] =
        `<div class="empty-msg">No tasks ${status.replace('-', ' ')}</div>`;
    }
  });

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


// ===============================
// INIT
// ===============================
renderBoard();
