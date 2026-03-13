/**
 * @category Board
 * @file taskboard_template.js
 * HTML-Templates für Cards, Detail-Ansicht und Edit-Formular
 */

/** --- USER BADGE HELPERS --- **/

function renderCardBadge(u, index) {
    const ml = index === 0 ? '0' : '-12px';
    return `<div class="user-badge" style="background-color:${u.color || '#2A3647'};z-index:${10 - index};margin-left:${ml};">
    ${resolveUserInitials(u)}
  </div>`;
}

function renderDetailBadge(u) {
    const name = u.name || 'Unknown';
    const displayName = String(u.id || '').startsWith('self_') ? `${name} (You)` : name;
    const initials = resolveUserInitials(u);
    return `<div class="assigned-user-badge-container">
    <div class="user-badge" style="background-color:${u.color || '#2A3647'};">${initials}</div>
    <span>${displayName}</span>
  </div>`;
}

function renderContactBadges(users, limit = 4, isDetail = false) {
    const list = ensureArray(users).filter((u) => u && typeof u === 'object');
    if (isDetail) return list.map(renderDetailBadge).join('');

    const visible = list.slice(0, limit);
    const remaining = list.length - visible.length;

    let html = visible.map(renderCardBadge).join('');

    if (remaining > 0) {
        html += `<div class="user-badge user-badge--more" style="z-index:1;margin-left:-12px;">+${remaining}</div>`;
    }

    return html;
}

/** --- SUBTASK HELPERS --- **/

function renderSubtaskItems(subtasksRaw, taskId) {
    const st = ensureArray(subtasksRaw);
    if (st.length === 0) return 'No subtasks';
    return st.map((s, i) => {
        const done = s?.completed || s?.done;
        const title = resolveSubtaskTitle(s, i);
        const icon = done ? 'checked' : 'empty';
        return `<div class="subtask-row" onclick="updateSubtaskStatus('${taskId}', ${i}, ${!done})">
      <img src="../assets/icons/checkbox_${icon}.svg"><span>${title}</span>
    </div>`;
    }).join('');
}

/** --- PROGRESS BAR HTML --- **/

function renderProgressBar(subtasksRaw) {
    const { done, total, percent } = getProgressData(subtasksRaw);
    if (total === 0) return '';
    return `<div class="progress-container">
    <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
    <span class="subtask-text">${done}/${total} Subtasks</span>
  </div>`;
}

/** --- PRIORITY BUTTONS HTML --- **/

function renderPrioButtons(currentPrio) {
    return ['urgent', 'medium', 'low'].map((p) => {
        const active = currentPrio === p ? `active-${p}` : '';
        const label = p.charAt(0).toUpperCase() + p.slice(1);
        return `<button class="prio-btn-edit ${active}" onclick="setEditPriority('${p}')" id="prio-${p}">
      ${label}<img src="../assets/icons/prio-${p}.svg">
    </button>`;
    }).join('');
}



/**
 * Renders the move-to context menu items for a card.
 * Only shows statuses different from the current task status.
 *
 * @param {string} id - Task Firebase ID.
 * @param {string} currentStatus - Current status of the task.
 * @returns {string} HTML string of the menu items.
 */
function renderMoveToItems(id, currentStatus) {
    const labels = {
        'todo':           'To-do',
        'in-progress':    'In Progress',
        'await-feedback': 'Await Feedback',
        'done':           'Done',
    };

    const currentIndex = BOARD_STATUSES.indexOf(currentStatus);

    return BOARD_STATUSES
        .filter(s => s !== currentStatus)
        .map(s => {
            const targetIndex = BOARD_STATUSES.indexOf(s);
            const arrow = targetIndex < currentIndex ? '↑' : '↓';
            const label = labels[s] || s;
            return `<div class="move-to-item" onclick="event.stopPropagation();moveTaskToStatus('${id}','${s}');closeAllMoveToMenus()">
        <span class="move-to-arrow">${arrow}</span>${label}
      </div>`;
        }).join('');
}

/**
 * Generates the HTML for a task card on the board.
 * Includes a move-to context menu button (mobile).
 *
 * @param {Object} task - The normalized task object from Firebase.
 * @param {string} id - The Firebase ID of the task.
 * @returns {string} HTML string of the task card.
 */
function getCardTemplate(task, id) {
    const prio = (task.priority || 'low').toLowerCase();
    const catClass = buildCategoryClass(task.category);
    const catText = task.category || 'User Story';
    const currentStatus = task.status || 'todo';

    return `<div class="card" draggable="true" onclick="event.stopPropagation();openTaskDetail('${id}')" ondragstart="event.dataTransfer.setData('text/plain','${id}')" style="position:relative;">
    <div class="badge ${catClass}">${catText}</div>
    <div class="card-content">
      <h2 class="card-title">${task.title || 'No Title'}</h2>
      <p class="card-description">${task.description || ''}</p>
    </div>
    ${renderProgressBar(task.subtasks)}
    <div class="card-footer">
      <div class="assigned-to-container">${renderContactBadges(task.assignedTo, 4)}</div>
      <div class="card-footer-right">
        <div class="prio-icon"><img src="../assets/icons/prio-${prio}.svg" alt="${prio}" onerror="this.style.display='none'"></div>
      </div>
    </div>
    <div class="card-move-to">
      <button class="move-to-btn" onclick="toggleMoveToMenu(event,'${id}')" aria-label="Move task">
        <img src="../assets/icons/move-to-icon.png" alt="Move to">
      </button>
      <div class="move-to-menu" id="move-to-menu-${id}">
        <div class="move-to-title">Move to</div>
        ${renderMoveToItems(id, currentStatus)}
      </div>
    </div>
  </div>`;
}

/**
 * Generates the HTML for the task detail view in the overlay.
 */
function getTaskDetailTemplate(task, id) {
    const prio = (task.priority || 'low').toLowerCase();
    const prioLabel = prio.charAt(0).toUpperCase() + prio.slice(1);
    const catClass = buildCategoryClass(task.category);
    const catText = task.category || 'User Story';
    return `<div class="task-detail-card">
    <div class="detail-header">
      <div class="badge ${catClass}">${catText}</div>
      <button class="close-btn-overlay" onclick="closeTaskDetail()"><img src="../assets/icons/close.svg" alt="Close"></button>
    </div>
    <h1 class="detail-title">${task.title || 'No Title'}</h1>
    <p class="detail-description">${task.description || ''}</p>
    <div class="detail-info-row"><span class="info-label">Due date:</span><span class="info-value">${formatDate(task.dueDate)}</span></div>
    <div class="detail-prio-row"><span class="info-label">Priority:</span>
      <div class="info-value-prio"><span>${prioLabel}</span><img src="../assets/icons/prio-${prio}.svg" alt="${prioLabel}"></div>
    </div>
    <div class="detail-section"><h3 class="section-title">Assigned To:</h3>
      <div class="assigned-list">${renderContactBadges(task.assignedTo, 100, true)}</div>
    </div>
    <div class="detail-section"><h3 class="section-title">Subtasks</h3>
      <div class="subtask-list">${renderSubtaskItems(task.subtasks, id)}</div>
    </div>
    <div class="detail-actions">
      <button class="action-btn" onclick="deleteTask('${id}')"><img src="../assets/icons/delete_text.svg" alt="Delete"></button>
      <div class="action-divider"></div>
      <button class="action-btn" onclick="editTask('${id}')"><img src="../assets/icons/edit_text.svg" alt="Edit"></button>
    </div>
  </div>`;
}

/**
 * Generates the HTML for the task edit form in the overlay.
 */
function getEditTaskTemplate(task, id) {
    const curr = (task.priority || 'low').toLowerCase();
    return `<div class="card-inner">
    <button class="close-btn-overlay" onclick="closeTaskDetail()"><img src="../assets/icons/close.svg" alt="Close"></button>
    <div class="task-edit-container"><div class="edit-scroll-area">
      <label class="edit-label">Title</label>
      <input type="text" id="edit-title" class="edit-input" value="${task.title || ''}">
      <label class="edit-label">Description</label>
      <textarea id="edit-description" class="edit-textarea">${task.description || ''}</textarea>
      <label class="edit-label">Due date</label>
      <input type="date" id="edit-date" class="edit-input" value="${task.dueDate || ''}">
      <label class="edit-label edit-label-priority">Priority</label>
      <div class="priority-row-edit">${renderPrioButtons(curr)}</div>
      <label class="edit-label">Assigned to</label>
      <div class="custom-select-container">
        <div class="edit-input custom-select-header" onclick="toggleEditContactList()">
          <span>Select contacts to assign</span>
          <img src="../assets/icons/arrow_drop_down.png" id="dropdown-arrow">
        </div>
        <div id="edit-contact-list" class="custom-contact-list hidden"></div>
      </div>
      <div id="edit-assigned-badges" class="edit-assigned-row"></div>
      <label class="edit-label">Subtasks</label>
      <div class="subtask-input-container">
        <input type="text" id="edit-subtask-input" class="edit-input" placeholder="Add new subtask">
        <img src="../assets/icons/plus-button.svg" onclick="addSubtaskInEdit()">
      </div>
      <ul id="edit-subtask-list" class="edit-subtask-list"></ul>
    </div></div>
    <button class="save-btn" onclick="saveTaskEdit('${id}')">Ok <img src="../assets/icons/check.svg"></button>
  </div>`;
}