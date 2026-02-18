/* ==========================================================================
   1. GLOBALE VARIABLEN & CACHE
   ========================================================================== */
const BOARD_STATUSES = ['todo', 'in-progress', 'await-feedback', 'done'];
let boardUsersCache = null;
let boardLegacyConnectionsCache = null;
let boardTaskCache = {};

// Temporäre Speicher für den Edit-Modus (Buffer)
let currentEditSubtasks = [];
let currentEditContacts = [];

/* ==========================================================================
   2. UTILS & HELPER-FUNKTIONEN
   ========================================================================== */

function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();
}

function mapUserToBadge(userId, user) {
    const name = user?.name || '';
    const fallbackColor = name ? getAvatarColorFromName(name) : '#2A3647';
    return {
        id: userId,
        name: name,
        color: user?.color || fallbackColor,
        initials: name ? getInitials(name) : '?'
    };
}

function normalizeAssignedUser(entry, allUsers) {
    if (!entry) return null;

    if (typeof entry === 'string') {
        const user = allUsers[entry];
        return user ? mapUserToBadge(entry, user) : null;
    }

    if (typeof entry === 'object') {
        const id = entry.id || '';
        const fullUser = id ? allUsers[id] : null;
        const name = entry.name || fullUser?.name || '';
        if (!name) return null;

        const fallbackColor = getAvatarColorFromName(name);
        return {
            id: id,
            name: name,
            color: entry.color || fullUser?.color || fallbackColor,
            initials: entry.initials || getInitials(name)
        };
    }
    return null;
}

function normalizeSubtasks(subtasks) {
    const subtasksRaw = subtasks || [];
    const subtasksArray = Array.isArray(subtasksRaw) ? subtasksRaw : Object.values(subtasksRaw);
    
    // Sicherstellen, dass jeder Subtask ein Objekt mit title und completed ist
    return subtasksArray.map(st => {
        if (typeof st === 'string') return { title: st, completed: false };
        return {
            title: st.title || '',
            completed: st.completed || false
        };
    });
}

function buildAssignedUsers(taskId, task, allUsers, legacyConnections) {
    const assignedRaw = Array.isArray(task.assignedTo) ? task.assignedTo : [];
    const assignedFromTask = assignedRaw
        .map((entry) => normalizeAssignedUser(entry, allUsers))
        .filter((user) => user !== null);

    if (assignedFromTask.length > 0 || Array.isArray(task.assignedTo)) {
        return assignedFromTask;
    }

    const legacyIds = legacyConnections[taskId] ? Object.keys(legacyConnections[taskId]) : [];
    return legacyIds
        .map((userId) => mapUserToBadge(userId, allUsers[userId]))
        .filter((user) => user.name);
}

/* ==========================================================================
   3. DATEN-ABFRAGE (FIREBASE)
   ========================================================================== */

async function getUsersMap() {
    if (boardUsersCache) return boardUsersCache;
    const snapshot = await firebase.database().ref('users').get();
    boardUsersCache = snapshot.val() || {};
    return boardUsersCache;
}

async function getLegacyTaskConnections(tasks) {
    if (boardLegacyConnectionsCache) return boardLegacyConnectionsCache;

    const needsLegacyConnections = Object.values(tasks).some(
        (task) => !Array.isArray(task.assignedTo)
    );
    if (!needsLegacyConnections) return {};

    const snapshot = await firebase.database().ref('taskUsers').get();
    boardLegacyConnectionsCache = snapshot.val() || {};
    return boardLegacyConnectionsCache;
}

/* ==========================================================================
   4. BOARD RENDERING
   ========================================================================== */

async function renderBoard() {
    try {
        const tasksPromise = firebase.database().ref('tasks').get();
        const usersPromise = getUsersMap();

        const tasksSnapshot = await tasksPromise;
        const tasks = tasksSnapshot.val() || {};

        const [allUsers, legacyConnections] = await Promise.all([
            usersPromise,
            getLegacyTaskConnections(tasks)
        ]);

        const columns = { 'todo': '', 'in-progress': '', 'await-feedback': '', 'done': '' };
        const nextTaskCache = {};

        Object.entries(tasks).forEach(([taskId, task]) => {
            const taskWithUsers = {
                ...task,
                assignedTo: buildAssignedUsers(taskId, task, allUsers, legacyConnections),
                subtasks: normalizeSubtasks(task.subtasks),
                priority: task.priority || 'low'
            };

            nextTaskCache[taskId] = taskWithUsers;

            if (columns[task.status] !== undefined) {
                columns[task.status] += getCardTemplate(taskWithUsers, taskId);
            }
        });

        boardTaskCache = nextTaskCache;
        renderColumnHTML(columns);
    } catch (error) {
        console.error("Fehler beim Rendern des Boards:", error);
    }
}

function renderColumnHTML(columns) {
    BOARD_STATUSES.forEach(status => {
        const col = document.querySelector(`#${status} .task-list`);
        if (col) {
            col.innerHTML = columns[status] || `<div class="empty-msg">No tasks ${status.replace('-', ' ')}</div>`;
            col.setAttribute('ondragover', 'event.preventDefault()');
            col.setAttribute('ondrop', `onDrop(event.dataTransfer.getData('text/plain'),'${status}')`);
        }
    });
}

/* ==========================================================================
   5. MODAL MANAGEMENT (ADD & DETAIL)
   ========================================================================== */

function openAddTaskModalBoard(status = 'todo') {
    currentSelectedStatus = status; 
    const modal = document.getElementById('addTaskModal');
    
    if (modal) {
        if (modal._closeTimeout) {
            clearTimeout(modal._closeTimeout);
            modal._closeTimeout = null;
        }
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('is-open'));
        modal.setAttribute('aria-hidden', 'false');
        
        if (typeof initTaskEditor === 'function') {
            initTaskEditor(); 
        }
    }
}

function closeAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    if (modal) {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        if (modal._closeTimeout) clearTimeout(modal._closeTimeout);
        modal._closeTimeout = setTimeout(() => {
            modal.classList.add('hidden');
            modal._closeTimeout = null;
        }, 600);

        const form = document.querySelector('.new_task');
        if (form) form.reset();
    }
}

async function openTaskDetail(taskId) {
    const cachedTask = boardTaskCache[taskId];
    if (cachedTask) {
        renderTaskDetail(cachedTask, taskId);
        return;
    }

    const [taskSnap, allUsers] = await Promise.all([
        firebase.database().ref('tasks/' + taskId).get(),
        getUsersMap()
    ]);

    const task = taskSnap.val();
    if (!task) return;

    const taskWithUsers = {
        ...task,
        assignedTo: buildAssignedUsers(taskId, task, allUsers, boardLegacyConnectionsCache || {}),
        subtasks: normalizeSubtasks(task.subtasks),
        priority: task.priority || 'low'
    };

    renderTaskDetail(taskWithUsers, taskId);
}

function renderTaskDetail(task, taskId) {
    const overlay = document.getElementById('task-overlay');
    if (!overlay) return;

    overlay.querySelector('.overlay-card').innerHTML = getTaskDetailTemplate(task, taskId);
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeTaskDetail() {
    document.getElementById('task-overlay').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

/* ==========================================================================
   6. EDIT-MODUS LOGIK (KONTAKTE & SUBTASKS)
   ========================================================================== */

async function editTask(taskId) {
    const task = boardTaskCache[taskId];
    if (!task) return;

    // Buffer initialisieren
    currentEditSubtasks = task.subtasks ? [...task.subtasks] : [];
    currentEditContacts = task.assignedTo ? [...task.assignedTo] : [];

    const allUsers = await getUsersMap();
    const overlayCard = document.querySelector('#task-overlay .overlay-card');
    
    // Template laden
    overlayCard.innerHTML = getEditTaskTemplate(task, taskId);

    // Dropdown mit allen Usern füllen
    fillContactDropdown(allUsers);
    
    // Lokale Listen rendern
    refreshEditSubtaskUI();
    renderEditContactBadges();
}
function editTaskAssigned() {
    const select = document.getElementById('edit-assigned');
    if (!select) return;
    
    const userId = select.value;
    if (!userId) return; // Nichts ausgewählt

    const user = boardUsersCache[userId];
    
    // Prüfen, ob User existiert und noch nicht im lokalen Buffer (currentEditContacts) ist
    if (user && !currentEditContacts.some(c => c.id === userId)) {
        currentEditContacts.push(mapUserToBadge(userId, user));
        renderEditContactBadges();
    }
    
    select.value = ""; // Dropdown wieder auf "Select contacts" zurücksetzen
}

function fillContactDropdown(allUsers) {
    const select = document.getElementById('edit-assigned');
    if (!select) return;
    
    // Wir bauen die Optionen als einen langen String zusammen
    let optionsHtml = '<option value="" disabled selected>Select contacts to assign</option>';
    
    Object.entries(allUsers).forEach(([userId, user]) => {
        optionsHtml += `<option value="${userId}">${user.name}</option>`;
    });
    
    select.innerHTML = optionsHtml;
}

function addContactToEdit() {
    const select = document.getElementById('edit-assigned');
    if (!select) return;
    
    const userId = select.value;
    if (!userId) return;

    // Den User aus dem globalen Cache holen
    const user = boardUsersCache[userId];
    
    // Prüfen, ob der User bereits zugewiesen ist (Duplikate verhindern)
    const alreadyAssigned = currentEditContacts.some(c => c.id === userId);
    
    if (user && !alreadyAssigned) {
        // Wir nutzen die bestehende Helper-Funktion für das Format
        currentEditContacts.push(mapUserToBadge(userId, user));
        renderEditContactBadges();
    }
    
    // WICHTIG: Dropdown zurücksetzen, damit man denselben User 
    // theoretisch nach Löschen wieder wählen kann
    select.value = ""; 
}
function toggleEditContactList() {
    const list = document.getElementById('edit-contact-list');
    const arrow = document.getElementById('dropdown-arrow');
    list.classList.toggle('hidden');
    // Optional: Pfeil drehen, falls CSS vorhanden
    arrow.style.transform = list.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

function fillContactDropdown(allUsers) {
    const listContainer = document.getElementById('edit-contact-list');
    if (!listContainer) return;

    let html = '';
    Object.entries(allUsers).forEach(([userId, user]) => {
        // Prüfen, ob User bereits im Buffer ist
        const isAssigned = currentEditContacts.some(c => c.id === userId);
        const badge = mapUserToBadge(userId, user);

        html += `
            <div class="contact-item ${isAssigned ? 'selected' : ''}" onclick="toggleUserSelection('${userId}')">
                <div class="contact-item-left">
                    <div class="user-badge" style="background-color: ${badge.color}">${badge.initials}</div>
                    <span>${badge.name}</span>
                </div>
                <img src="../assets/icons/checkbox_${isAssigned ? 'white' : 'empty'}.svg">
            </div>
        `;
    });
    listContainer.innerHTML = html;
}
// Event Listener für die Suche
document.getElementById('task-search')?.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    
    // Filtern erst ab 3 Buchstaben (oder wenn das Feld geleert wird)
    if (searchTerm.length >= 3 || searchTerm.length === 0) {
        filterTasks(searchTerm);
    }
});

/**
 * Filtert die Tasks basierend auf Titel, Beschreibung oder Datum
 */
async function filterTasks(term) {
    const allTasks = boardTaskCache;
    const filteredColumns = { 'todo': '', 'in-progress': '', 'await-feedback': '', 'done': '' };

    Object.entries(allTasks).forEach(([taskId, task]) => {
        const title = (task.title || "").toLowerCase();
        const description = (task.description || "").toLowerCase();
        
        // Datum für die Suche vorbereiten (sowohl ISO als auch EU Format)
        const rawDate = task.dueDate || "";
        const euDate = rawDate.split("-").reverse().join("."); // Macht aus 2026-02-18 -> 18.02.2026
        
        if (title.includes(term) || description.includes(term) || euDate.includes(term)) {
            if (filteredColumns[task.status] !== undefined) {
                filteredColumns[task.status] += getCardTemplate(task, taskId);
            }
        }
    });

    renderColumnHTML(filteredColumns);
}

function toggleUserSelection(userId) {
    const userIndex = currentEditContacts.findIndex(c => c.id === userId);
    
    if (userIndex > -1) {
        // Entfernen, wenn schon da
        currentEditContacts.splice(userIndex, 1);
    } else {
        // Hinzufügen, wenn neu
        const user = boardUsersCache[userId];
        currentEditContacts.push(mapUserToBadge(userId, user));
    }

    // UI-Refresh ohne createElement
    fillContactDropdown(boardUsersCache);
    renderEditContactBadges();
}
function removeContactFromEdit(index) {
    // Entfernt den User aus dem temporären Buffer
    currentEditContacts.splice(index, 1);
    // UI neu zeichnen
    renderEditContactBadges();
}

function renderEditContactBadges() {
    const container = document.getElementById('edit-assigned-badges');
    if (!container) return;

    // Wir bauen den HTML-String komplett neu
    container.innerHTML = currentEditContacts.map((u, index) => `
        <div class="user-badge" 
             style="background-color: ${u.color}" 
             title="Click to remove ${u.name}"
             onclick="removeContactFromEdit(${index})">
            ${u.initials}
        </div>
    `).join('');
}

function addSubtaskInEdit() {
    const input = document.getElementById('edit-subtask-input');
    const title = input.value.trim();
    if (title) {
        currentEditSubtasks.push({ title: title, completed: false });
        input.value = '';
        refreshEditSubtaskUI();
    }
}

function deleteSubtaskFromEdit(index) {
    currentEditSubtasks.splice(index, 1);
    refreshEditSubtaskUI();
}

function refreshEditSubtaskUI() {
    const list = document.getElementById('edit-subtask-list');
    if (!list) return;
    list.innerHTML = currentEditSubtasks.map((st, index) => `
        <li class="edit-subtask-item">
            <span>• ${st.title}</span>
            <img src="../assets/icons/delete.svg" onclick="deleteSubtaskFromEdit(${index})" alt="Delete">
        </li>
    `).join('');
}

function setEditPriority(prio) {
    const buttons = document.querySelectorAll('.prio-btn-edit');
    buttons.forEach(btn => btn.classList.remove('active-urgent', 'active-medium', 'active-low'));
    const target = document.getElementById('prio-' + prio);
    if (target) target.classList.add('active-' + prio);
}

async function saveTaskEdit(taskId) {
    const activePrioBtn = document.querySelector('.prio-btn-edit[class*="active-"]');
    const priority = activePrioBtn ? activePrioBtn.id.replace('prio-', '') : 'low';

    const updatedData = {
        title: document.getElementById('edit-title').value,
        description: document.getElementById('edit-description').value,
        dueDate: document.getElementById('edit-date').value,
        priority: priority,
        subtasks: currentEditSubtasks,
        assignedTo: currentEditContacts
    };

    try {
        await firebase.database().ref('tasks/' + taskId).update(updatedData);
        
        // Cache lokal aktualisieren
        boardTaskCache[taskId] = { ...boardTaskCache[taskId], ...updatedData };
        
        // Zurück zur Detailansicht
        openTaskDetail(taskId);
        
        // Board im Hintergrund neu zeichnen
        renderBoard();
    } catch (e) {
        console.error("Fehler beim Speichern:", e);
    }
}

/* ==========================================================================
   7. ACTIONS (DELETE, STATUS UPDATE, DROP)
   ========================================================================== */

async function deleteTask(taskId) {
    if (confirm('Task wirklich löschen?')) {
        await firebase.database().ref('tasks/' + taskId).remove();
        await firebase.database().ref('taskUsers/' + taskId).remove();
        delete boardTaskCache[taskId];
        if (boardLegacyConnectionsCache?.[taskId]) {
            delete boardLegacyConnectionsCache[taskId];
        }
        closeTaskDetail();
        renderBoard();
    }
}

async function updateSubtaskStatus(taskId, index, completed) {
    const subtaskRef = firebase.database().ref(`tasks/${taskId}/subtasks/${index}`);
    const snapshot = await subtaskRef.once('value');
    const oldSubtask = snapshot.val();

    let updatedSubtask = (typeof oldSubtask === 'string') 
        ? { title: oldSubtask, completed: completed }
        : { ...oldSubtask, completed: completed };

    await subtaskRef.set(updatedSubtask);
    
    // Nach Status-Update Board und Detail-View auffrischen
    await renderBoard();
    openTaskDetail(taskId);
}

function onDrop(taskId, newStatus) {
    if (!taskId) return;
    firebase.database().ref('tasks/' + taskId).update({ status: newStatus })
        .then(() => renderBoard());
}

function handleOverlayClick(event) {
    if (event.target.id === 'task-overlay') closeTaskDetail();
}

// Initialer Start beim Laden der Seite
renderBoard();