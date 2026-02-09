/**
 * Erzeugt das HTML für eine Task-Card auf dem Board.
 * @param {Object} task - Das Task-Objekt aus Firebase.
 * @param {string} id - Die Firebase-ID der Task.
 * @returns {string} HTML-Template
 */
function getCardTemplate(task, id) {
    // 1. Daten-Normalisierung (Firebase Fix)
    const assignedToRaw = task.assignedTo || [];
    const assignedTo = Array.isArray(assignedToRaw)
        ? assignedToRaw
        : Object.values(assignedToRaw);

    const subtasksRaw = task.subtasks || [];
    const subtasks = Array.isArray(subtasksRaw)
        ? subtasksRaw
        : Object.values(subtasksRaw);

    // 2. Subtask Progress
    const doneTasks = subtasks.filter(st => st?.completed || st?.done).length;
    const progress = subtasks.length > 0 ? (doneTasks / subtasks.length) * 100 : 0;

    // 3. Assigned User Badges – ALLE anzeigen
   const assignedHtml = assignedTo
    .filter(u => u) // Filtert leere Einträge
    .slice(0, 4)    // Optional: Zeige nur die ersten 4, falls es zu viele sind
    .map((u, index) => {
        const initials = u.initials || 
            (u.name ? u.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?');

        return `
            <div class="user-badge" 
                 style="background-color: ${u.color || '#2A3647'}; 
                        z-index: ${10 - index};">
                ${initials.toUpperCase()}
            </div>
        `;
    })
    .join('');

    // 4. Priorität
    const prio = (task.priority || 'low').toLowerCase();

    return `
        <div class="card" draggable="true"
             onclick="openTaskDetail('${id}')"
             ondragstart="event.dataTransfer.setData('text/plain', '${id}')">

            <div class="badge user-story">${task.category || 'User Story'}</div>

            <div class="card-content">
                <h2 class="card-title">${task.title || 'No Title'}</h2>
                <p class="card-description">${task.description || ''}</p>
            </div>

            ${subtasks.length > 0 ? `
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span>${doneTasks}/${subtasks.length} Subtasks</span>
                </div>
            ` : ''}

            <div class="card-footer">
                <div class="assigned-to-container">
                    ${assignedHtml}
                </div>
                <div class="prio-icon">
                    <img src="../assets/icons/prio-${prio}.svg"
                         alt="${prio}"
                         onerror="this.style.display='none'">
                </div>
            </div>
        </div>
    `;
}


/**
 * Erzeugt das HTML für das Detail-Overlay einer Task.
 * @param {Object} task - Das Task-Objekt.
 * @param {string} id - Die ID der Task.
 */
function getTaskDetailTemplate(task, id) {
    // Assigned Users normalisieren
    const assignedToRaw = task.assignedTo || [];
    const assignedTo = Array.isArray(assignedToRaw)
        ? assignedToRaw
        : Object.values(assignedToRaw);

    // Subtasks normalisieren (Array ODER Objekt)
    const subtasksRaw = task.subtasks || [];
    const subtasks = Array.isArray(subtasksRaw)
        ? subtasksRaw
        : Object.values(subtasksRaw);

    const prio = (task.priority || 'low').toLowerCase();
    const prioLabel = prio.charAt(0).toUpperCase() + prio.slice(1);

    // Assigned-To Render
    const assignedHtml = assignedTo
    .filter(u => u)
    .slice(0, 3) // Zeige nur die ersten 3
    .map((u, index) => {
        const initials = u.initials || (u.name ? u.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?');
        return `<div class="user-badge" style="background-color: ${u.color || '#2A3647'}; z-index: ${10 - index};">${initials.toUpperCase()}</div>`;
    })
    .join('');

// Falls mehr als 3 User da sind, füge ein "+X" Badge hinzu
const extraUsers = assignedTo.length > 3 ? `<div class="user-badge" style="background-color: #2A3647; z-index: 0;">+${assignedTo.length - 3}</div>` : '';

    // 🔥 Subtasks Render (HIER ist der wichtige Fix)
    const subtasksHtml = subtasks.length > 0
        ? subtasks.map((st, index) => {
            const isObject = typeof st === 'object' && st !== null;

            const title = isObject
                ? st.title || `Subtask ${index + 1}`
                : st; // falls String

            const completed = isObject && (st.completed || st.done);

            return `
                <div class="subtask-row"
                     onclick="updateSubtaskStatus('${id}', ${index}, ${!completed})">
                    <img src="../assets/icons/checkbox_${completed ? 'checked' : 'empty'}.svg">
                    <span>${title}</span>
                </div>
            `;
        }).join('')
        : 'No subtasks';

    return `
        <div class="task-detail-card">
            <div class="detail-header">
                <div class="badge user-story">${task.category || 'User Story'}</div>
                <button class="close-btn-overlay" onclick="closeTaskDetail()">
                    <img src="../assets/icons/close.svg" alt="Close">
                </button>
            </div>

            <h1 class="detail-title">${task.title || 'No Title'}</h1>
            <p class="detail-description">${task.description || ''}</p>

            <div class="detail-info-row">
                <span class="info-label">Due date:</span>
                <span class="info-value">${task.dueDate || '--/--/----'}</span>
            </div>

            <div class="detail-info-row">
                <span class="info-label">Priority:</span>
                <div class="info-value-prio">
                    <span>${prioLabel}</span>
                    <img src="../assets/icons/prio-${prio}.svg" alt="${prioLabel}">
                </div>
            </div>

            <div class="detail-section">
                <h3 class="section-title">Assigned To:</h3>
                <div class="assigned-list">
                    ${assignedHtml}
                </div>
            </div>

            <div class="detail-section">
                <h3 class="section-title">Subtasks</h3>
                <div class="subtask-list">
                    ${subtasksHtml}
                </div>
            </div>

            <div class="detail-actions">
                <button class="action-btn" onclick="deleteTask('${id}')">
                    <img src="../assets/icons/delete.svg"> Delete
                </button>
                <div class="action-divider"></div>
                <button class="action-btn" onclick="editTask('${id}')">
                    <img src="../assets/icons/edit.svg"> Edit
                </button>
            </div>
        </div>
    `;
}
