function getCardTemplate(task, id) {
  const assignedTo = task.assignedTo || [];
  const subtasks = task.subtasks || [];

  // AssignedTo HTML zusammenbauen
  let assignedHtml = '';
  for (let i = 0; i < assignedTo.length; i++) {
    const u = assignedTo[i];
    assignedHtml += `
      <div class="user" style="background:${u.color}">
        ${u.initials}
      </div>
    `;
  }

  // Subtasks HTML zusammenbauen
  let subtasksHtml = '';
  for (let i = 0; i < subtasks.length; i++) {
    const st = subtasks[i];
    subtasksHtml += `
      <li class="${st.completed ? 'completed' : ''}">
        ${st.title}
      </li>
    `;
  }

  return `
    <div class="card" draggable="true"
         data-id="${id}"
         onclick="openTaskDetail('${id}')"
         ondragstart="event.dataTransfer.setData('text/plain', '${id}')">

      <div class="badge user-story">User Story</div>

      <h2 class="card-title">${task.title}</h2>

      <p class="card-description">
        ${task.description || ''}
      </p>

      <p class="card-meta">
        <strong>Due date:</strong> ${task.dueDate || '—'}
      </p>

      <p class="card-meta">
        <strong>Priority:</strong> ${task.priority || '—'}
      </p>

      <div class="assigned-to">
        <p>Assigned to:</p>
        ${assignedHtml}
      </div>

      <ul class="subtasks">
        <p>Subtasks:</p>
        ${subtasksHtml}
      </ul>
    </div>
  `;
}



// ===============================
// DETAIL OVERLAY TEMPLATE (STATIC)
// ===============================
function getTaskDetailTemplate() {
  return `
    <button class="close-btn" onclick="closeTaskDetail()">×</button>

    <span class="badge user-story">User Story</span>

    <h1>Kochwelt Page & Recipe Recommender</h1>

    <p class="card-description">
      Build start page with recipe recommendation.
    </p>

    <p><strong>Due date:</strong> 10/05/2023</p>
    <p>
      <strong>Priority:</strong> Medium
      <span class="priority-indicator"></span>
    </p>

    <h3>Assigned To:</h3>

    <div class="assigned-row">
      <div class="user" style="background:#1abc9c">EM</div>
      <span>Emmanuel Mauer</span>
    </div>

    <div class="assigned-row">
      <div class="user" style="background:#9b59b6">MB</div>
      <span>Marcel Bauer</span>
    </div>

    <div class="assigned-row">
      <div class="user" style="background:#3498db">AM</div>
      <span>Anton Mayer</span>
    </div>

    <h3>Subtasks</h3>

    <label class="subtask-row">
      <input type="checkbox" checked>
      Implement Recipe Recommendation
    </label>

    <label class="subtask-row">
      <input type="checkbox">
      Start Page Layout
    </label>

    <div class="detail-actions">
      <button class="delete-btn">🗑 Delete</button>
      <button class="edit-btn">✏️ Edit</button>
    </div>
  `;
}
