// Task Template mit Firebase Key
function getCardTemplate(task, id) {
  task.assignedTo = task.assignedTo || [];
  task.subtasks = task.subtasks || [];

  return `
    <div class="card" draggable="true" 
         data-id="${id}" 
         ondragstart="event.dataTransfer.setData('text/plain', this.dataset.id)">
      <div class="badge user-story">User Story</div>
      <h2>${task.title}</h2>
      <p>${task.description}</p>
      <p><strong>Due date:</strong> ${task.dueDate}</p>
      <p><strong>Priority:</strong> ${task.priority}</p>

      <div class="assigned-to">
        ${task.assignedTo.map(u => `<div class="user" style="background:${u.color}">${u.initials}</div>`).join('')}
      </div>

      <ul class="subtasks">
        ${task.subtasks.map(st => `<li class="${st.completed ? 'completed' : ''}">${st.title}</li>`).join('')}
      </ul>
    </div>
  `;
}

// Drop-Funktion für inline HTML
function onDrop(taskId, newStatus) {
  if(!taskId) return;

  // Firebase Update
  firebase.database().ref('tasks/' + taskId).update({ status: newStatus });

  // Board neu rendern
  renderBoard();
}

// Render Board komplett über innerHTML
async function renderBoard() {
  const snapshot = await firebase.database().ref('tasks').get();
  const data = snapshot.val();
  const columns = {
    'todo': '',
    'in-progress': '',
    'await-feedback': '',
    'done': ''
  };

  if(data) {
    Object.entries(data).forEach(([key, task]) => {
      if(columns[task.status] !== undefined) {
        columns[task.status] += getCardTemplate(task, key);
      }
    });
  }

  // Leere Spalten-Message
  Object.keys(columns).forEach(status => {
    if(!columns[status]) {
      columns[status] = `<div class="empty-msg">No tasks ${status.replace('-', ' ')}</div>`;
    }
  });

  // Spalten direkt innerHTML setzen + Drag & Drop inline
  ['todo','in-progress','await-feedback','done'].forEach(status => {
    const col = document.querySelector(`#${status} .task-list`);
    col.innerHTML = columns[status];
    col.setAttribute('ondragover', 'event.preventDefault()');
    col.setAttribute('ondrop', `onDrop(event.dataTransfer.getData('text/plain'),'${status}')`);
  });
}

// Sofort ausführen
renderBoard();
