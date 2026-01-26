// Gibt für eine einzelne Task ein HTML-Template zurück
function getCardTemplate(task) {
  return `
    <div class="card">
      <div class="badge user-story">User Story</div>
      <h2>${task.title}</h2>
      <p>${task.description}</p>
      <p><strong>Due date:</strong> ${task.dueDate}</p>
      <p><strong>Priority:</strong> ${task.priority}</p>

      <div class="assigned-to">
        ${task.assignedTo?.map(user => `<div class="user" style="background:${user.color}">${user.initials}</div>`).join('') || ''}
      </div>

      <ul class="subtasks">
        ${task.subtasks?.map(st => `<li class="${st.completed ? 'completed' : ''}">${st.title}</li>`).join('') || ''}
      </ul>
    </div>
  `;
}
