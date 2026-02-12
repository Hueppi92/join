function getCardTemplate(task, id) {

    const assignedToRaw = task.assignedTo || [];

    const assignedTo = Array.isArray(assignedToRaw) ? assignedToRaw : Object.values(assignedToRaw);

    const subtasksRaw = task.subtasks || [];

    const subtasks = Array.isArray(subtasksRaw) ? subtasksRaw : Object.values(subtasksRaw);



    const categoryText = task.category || "User Story";

    const categoryClass = categoryText.toLowerCase().replace(/\s+/g, "-");

    const doneTasks = subtasks.filter((st) => st?.completed || st?.done).length;

    const progress = subtasks.length > 0 ? (doneTasks / subtasks.length) * 100 : 0;



    const validUsers = assignedTo.filter((u) => u && typeof u === "object");

    const assignedHtml = validUsers

        .slice(0, 3) // Nur die ersten 3

        .map((u, index) => {

            const name = u.name || "";

            const initials = u.initials || (name.includes(" ") ? name.split(" ").map((n) => n[0]).join("") : name.slice(0, 2));

            return `

                <div class="user-badge" 

                     style="background-color: ${u.color || "#2A3647"}; 

                            z-index: ${10 - index}; 

                            margin-left: ${index === 0 ? "0" : "-8px"};">

                    ${initials.toUpperCase()}

                </div>`;

        }).join("");



    const prio = (task.priority || "low").toLowerCase();



    return `

        <div class="card" draggable="true" onclick="event.stopPropagation(); openTaskDetail('${id}')" ondragstart="event.dataTransfer.setData('text/plain', '${id}')">

            <div class="badge ${categoryClass}">${categoryText}</div>

            <div class="card-content">

                <h2 class="card-title">${task.title || "No Title"}</h2>

                <p class="card-description">${task.description || ""}</p>

            </div>

            ${subtasks.length > 0 ? `

                <div class="progress-container">

                    <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>

                    <span class="subtask-text">${doneTasks}/${subtasks.length} Subtasks</span>

                </div>` : ""

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

    const assignedTo = Array.isArray(assignedToRaw) ? assignedToRaw : Object.values(assignedToRaw);

    const subtasksRaw = task.subtasks || [];

    const subtasks = Array.isArray(subtasksRaw) ? subtasksRaw : Object.values(subtasksRaw);



    const categoryText = task.category || "User Story";

    const categoryClass = categoryText.toLowerCase().replace(/\s+/g, "-");

    const prio = (task.priority || "low").toLowerCase();

    const prioLabel = prio.charAt(0).toUpperCase() + prio.slice(1);



    const validUsers = assignedTo.filter((u) => u && typeof u === "object");

    const assignedHtml = validUsers

        .slice(0, 3) // Nur die ersten 3 auflisten

        .map((u) => {

            const name = u.name || "Unknown";

            const initials = u.initials || name.split(" ").map((n) => n[0]).join("").slice(0, 2);

            return `

                <div class="assigned-user-badge-container">

                    <div class="user-badge" style="background-color: ${u.color || "#2A3647"};">

                        ${initials.toUpperCase()} 

                    </div>

                    <span>${name}</span>

                </div>`;

        }).join("");



    const subtasksHtml = subtasks.length > 0 ? subtasks.map((st, index) => {

        const isObject = typeof st === "object" && st !== null;

        const title = isObject ? st.title || `Subtask ${index + 1}` : st;

        const completed = isObject && (st.completed || st.done);

        return `

            <div class="subtask-row" onclick="updateSubtaskStatus('${id}', ${index}, ${!completed})">

                <img src="../assets/icons/checkbox_${completed ? "checked" : "empty"}.svg">

                <span>${title}</span>

            </div>`;

    }).join("") : "No subtasks";



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

                <span class="info-value">${task.dueDate || "--/--/----"}</span>

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