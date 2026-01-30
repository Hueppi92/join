/**
 * Erzeugt das HTML für eine Task-Card auf dem Board.
 * @param {Object} task - Das Task-Objekt aus Firebase.
 * @param {string} id - Die Firebase-ID der Task.
 * @returns {string} HTML-Template
 */
function getCardTemplate(task, id) {
    // 1. Daten-Normalisierung (Firebase Fix)
    const assignedToRaw = task.assignedTo || [];
    const assignedTo = Array.isArray(assignedToRaw) ? assignedToRaw : Object.values(assignedToRaw);
    
    const subtasksRaw = task.subtasks || [];
    const subtasks = Array.isArray(subtasksRaw) ? subtasksRaw : Object.values(subtasksRaw);

    // 2. Subtask Progress berechnen
    const doneTasks = subtasks.filter(st => st.completed || st.done).length; // Checkt beide Varianten
    const progress = subtasks.length > 0 ? (doneTasks / subtasks.length) * 100 : 0;

    // 3. User-Badges generieren (Max 4 anzeigen, Rest als +X)
    let assignedHtml = '';
    const maxVisible = 4;
    
    assignedTo.forEach((u, index) => {
        if (index < maxVisible && u && u.initials) {
            assignedHtml += `
                <div class="user-badge" 
                     style="background: ${u.color || '#2A3647'}; 
                            margin-left: ${index === 0 ? '0' : '-8px'}; 
                            z-index: ${10 - index}">
                    ${u.initials}
                </div>`;
        }
    });

    if (assignedTo.length > maxVisible) {
        assignedHtml += `
            <div class="user-badge" style="background: #2A3647; margin-left: -8px; z-index: 1">
                +${assignedTo.length - maxVisible}
            </div>`;
    }

    // 4. Priorität Icon Pfad
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
            </div>` : ''}

            <div class="card-footer">
                <div class="assigned-to-container">
                    ${assignedHtml}
                </div>
                <div class="prio-icon">
                    <img src="../assets/icons/prio-${prio}.svg" alt="${prio}" onerror="this.style.display='none'">
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
    const assignedToRaw = task.assignedTo || [];
    const assignedTo = Array.isArray(assignedToRaw) ? assignedToRaw : Object.values(assignedToRaw);
    
    const subtasksRaw = task.subtasks || [];
    const subtasks = Array.isArray(subtasksRaw) ? subtasksRaw : Object.values(subtasksRaw);

    return `
        <button class="close-btn" onclick="closeTaskDetail()">×</button>
        
        <div class="badge user-story">${task.category || 'User Story'}</div>
        
        <h1 class="detail-title">${task.title || 'No Title'}</h1>
        <p class="detail-description">${task.description || ''}</p>
        
        <div class="detail-info">
            <p><strong>Due date:</strong> ${task.dueDate || 'No date'}</p>
            <p><strong>Priority:</strong> ${task.priority || 'Medium'}</p>
        </div>

        <div class="detail-section">
            <h3>Assigned To:</h3>
            <div class="assigned-list">
                ${assignedTo.map(u => u ? `
                    <div class="assigned-row">
                        <div class="user-badge" style="background:${u.color || '#2A3647'}">${u.initials || '?'}</div>
                        <span>${u.name || u.initials || 'Unknown'}</span>
                    </div>
                ` : '').join('')}
            </div>
        </div>

        <div class="detail-section">
            <h3>Subtasks</h3>
            <div class="subtask-list">
                ${subtasks.map((st, index) => `
                    <label class="subtask-row">
                        <input type="checkbox" ${st.completed ? 'checked' : ''} 
                               onchange="updateSubtaskStatus('${id}', ${index}, this.checked)">
                        <span>${st.title}</span>
                    </label>
                `).join('')}
            </div>
        </div>

        <div class="detail-actions">
            <button class="action-btn" onclick="deleteTask('${id}')">🗑 Delete</button>
            <div class="divider"></div>
            <button class="action-btn" onclick="editTask('${id}')">✏️ Edit</button>
        </div>
    `;
}