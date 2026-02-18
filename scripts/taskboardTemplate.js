function getCardTemplate(task, id) {
  const assignedToRaw = task.assignedTo || [];

  const assignedTo = Array.isArray(assignedToRaw)
    ? assignedToRaw
    : Object.values(assignedToRaw);

  const subtasksRaw = task.subtasks || [];

  const subtasks = Array.isArray(subtasksRaw)
    ? subtasksRaw
    : Object.values(subtasksRaw);

  const categoryText = task.category || "User Story";

  const categoryClass = categoryText.toLowerCase().replace(/\s+/g, "-");

  const doneTasks = subtasks.filter((st) => st?.completed || st?.done).length;

  const progress =
    subtasks.length > 0 ? (doneTasks / subtasks.length) * 100 : 0;

  const validUsers = assignedTo.filter((u) => u && typeof u === "object");

  const assignedHtml = validUsers

    .slice(0, 3) // Nur die ersten 3

    .map((u, index) => {
      const name = u.name || "";

      const initials =
        u.initials ||
        (name.includes(" ")
          ? name
              .split(" ")
              .map((n) => n[0])
              .join("")
          : name.slice(0, 2));

      return `

                <div class="user-badge" 

                     style="background-color: ${u.color || "#2A3647"}; 

                            z-index: ${10 - index}; 

                            margin-left: ${index === 0 ? "0" : "-8px"};">

                    ${initials.toUpperCase()}

                </div>`;
    })
    .join("");

  const prio = (task.priority || "low").toLowerCase();

  return `

        <div class="card" draggable="true" onclick="event.stopPropagation(); openTaskDetail('${id}')" ondragstart="event.dataTransfer.setData('text/plain', '${id}')">

            <div class="badge ${categoryClass}">${categoryText}</div>

            <div class="card-content">

                <h2 class="card-title">${task.title || "No Title"}</h2>

                <p class="card-description">${task.description || ""}</p>

            </div>

            ${
              subtasks.length > 0
                ? `

                <div class="progress-container">

                    <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>

                    <span class="subtask-text">${doneTasks}/${subtasks.length} Subtasks</span>

                </div>`
                : ""
            }

            <div class="card-footer">

                <div class="assigned-to-container">${assignedHtml}</div>

                <div class="prio-icon">

                    <img src="../assets/icons/prio-${prio}.svg" alt="${prio}" onerror="this.style.display='none'">

                </div>

            </div>

        </div>`;
}

function getTaskDetailTemplate(task, id) {
  const assignedToRaw = task.assignedTo || [];
  const rawDate = task.dueDate || "";
  const formattedDate = rawDate.includes("-")
    ? rawDate.split("-").reverse().join(".")
    : rawDate;
  const assignedTo = Array.isArray(assignedToRaw)
    ? assignedToRaw
    : Object.values(assignedToRaw);

  const subtasksRaw = task.subtasks || [];

  const subtasks = Array.isArray(subtasksRaw)
    ? subtasksRaw
    : Object.values(subtasksRaw);

  const categoryText = task.category || "User Story";

  const categoryClass = categoryText.toLowerCase().replace(/\s+/g, "-");

  const prio = (task.priority || "low").toLowerCase();

  const prioLabel = prio.charAt(0).toUpperCase() + prio.slice(1);

  const validUsers = assignedTo.filter((u) => u && typeof u === "object");

  const assignedHtml = validUsers

    .slice(0, 3) // Nur die ersten 3 auflisten

    .map((u) => {
      const name = u.name || "Unknown";

      const initials =
        u.initials ||
        name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2);

      return `

                <div class="assigned-user-badge-container">

                    <div class="user-badge" style="background-color: ${u.color || "#2A3647"};">

                        ${initials.toUpperCase()} 

                    </div>

                    <span>${name}</span>

                </div>`;
    })
    .join("");

  const subtasksHtml =
    subtasks.length > 0
      ? subtasks
          .map((st, index) => {
            const isObject = typeof st === "object" && st !== null;

            const title = isObject ? st.title || `Subtask ${index + 1}` : st;

            const completed = isObject && (st.completed || st.done);

            return `

            <div class="subtask-row" onclick="updateSubtaskStatus('${id}', ${index}, ${!completed})">

                <img src="../assets/icons/checkbox_${completed ? "checked" : "empty"}.svg">

                <span>${title}</span>

            </div>`;
          })
          .join("")
      : "No subtasks";

  return `

        <div class="task-detail-card">

            <div class="detail-header">

                <div class="badge ${categoryClass}">${categoryText}</div>

                <button class="close-btn-overlay" onclick="closeTaskDetail()">

                    <img src="../assets/icons/close.svg" alt="Close">

                </button>

            </div>

            <h1 class="detail-title">${task.title || "No Title"}</h1>

            <p class="detail-description">${task.description || ""}</p>

            <div class="detail-info-row">

                <span class="info-label">Due date:</span>

                <span class="info-value">${formattedDate || "--.--.----"}</span>

            </div>

            <div class="detail-prio-row">

                <span class="info-label">Priority:</span>

                <div class="info-value-prio">

                    <span>${prioLabel}</span>

                    <img src="../assets/icons/prio-${prio}.svg" alt="${prioLabel}">

                </div>

            </div>

            <div class="detail-section">

                <h3 class="section-title">Assigned To:</h3>

                <div class="assigned-list">${assignedHtml}</div>

            </div>

            <div class="detail-section">

                <h3 class="section-title">Subtasks</h3>

                <div class="subtask-list">${subtasksHtml}</div>

            </div>

            <div class="detail-actions">

                <button class="action-btn" onclick="deleteTask('${id}')"><img src="../assets/icons/delete_detail.png"></button>

                <div class="action-divider"></div>

                <button class="action-btn" onclick="editTask('${id}')"><img src="../assets/icons/edit_detail.png"></button>

            </div>

        </div>`;
}

function getEditTaskTemplate(task, id) {
  const prios = ["urgent", "medium", "low"];
  const currentPrio = (task.priority || "low").toLowerCase();

  return ` <div class="card-inner"><button class="close-btn-overlay" onclick="closeTaskDetail()">
                <img src="../assets/icons/close.svg" alt="Close">
            </button>
        <div class="task-edit-container">
           
            
            <div class="edit-scroll-area">
                <label class="edit-label">Title</label>
                <input type="text" id="edit-title" class="edit-input" value="${task.title || ""}">

                <label class="edit-label">Description</label>
                <textarea id="edit-description" class="edit-textarea">${task.description || ""}</textarea>

                <label class="edit-label">Due date</label>
                <input type="date" id="edit-date" class="edit-input" value="${task.dueDate || ""}">

                <label class="edit-label">Priority</label>
                <div class="priority-row-edit">
                    ${prios
                      .map(
                        (p) => `
                        <button class="prio-btn-edit ${currentPrio === p ? "active-" + p : ""}" 
                                onclick="setEditPriority('${p}')" id="prio-${p}">
                            ${p.charAt(0).toUpperCase() + p.slice(1)}
                            <img src="../assets/icons/prio-${p}.svg">
                        </button>
                    `,
                      )
                      .join("")}
                </div>

    <label class="edit-label">Assigned to</label>
<div class="custom-select-container">
    <div class="edit-input custom-select-header" onclick="toggleEditContactList()">
        <span>Select contacts to assign</span>
        <img src="../assets/icons/arrow_drop_down.png" id="dropdown-arrow">
    </div>
    <div id="edit-contact-list" class="custom-contact-list hidden">
        </div>
</div>
<div id="edit-assigned-badges" class="edit-assigned-row"></div>

                <label class="edit-label">Subtasks</label>
                <div class="subtask-input-container">
                    <input type="text" id="edit-subtask-input" class="edit-input" placeholder="Add new subtask">
                    <img src="../assets/icons/plus-button.svg" onclick="addSubtaskInEdit()">
                </div>
                <ul id="edit-subtask-list" class="edit-subtask-list">
                    </ul>
            </div>

           
            </div>
             
                <button class="save-btn" onclick="saveTaskEdit('${id}')">
                    Ok <img src="../assets/icons/check.svg">
                </button>
        
        </div>
    `;
}
