/**
 * @category Summary
 */

/**
 * Initialisiert die Summary-Ansicht und lädt die Daten.
 */

const SUMMARY_CACHE_KEY = "join_summary_cache_v1";

/**
 * 
 * Main initialization function for the summary page.
 * Fetches user information and tasks to render the initial dashboard state.
 *
 * @async
 * @category Summary
 * @subcategory Lifecycle
 * @returns {Promise<void>}
 */
async function loadSummary() {
    setGreeting();

    const cachedSummary = readSummaryCache();
    if (cachedSummary) {
        renderUserName(cachedSummary.userName);
        renderSummary(cachedSummary.tasks);
    } else {
        renderUserName("Guest");
        renderSummary({});
    }

    try {
        const userIdPromise = resolveActiveUserId();
        const tasksPromise = getTasks();
        const userId = await userIdPromise;
        const [userName, tasks] = await Promise.all([getUserName(userId), tasksPromise]);

        renderUserName(userName);
        renderSummary(tasks);
        writeSummaryCache({ userName, tasks, updatedAt: Date.now() });
    } catch (error) {
        console.error("Error in loadSummary:", error);
    }
}

/**
 * Reads cached summary payload from localStorage.
 *
 * @returns {{ userName: string, tasks: Object }|null} Cached summary payload or null.
 */
function readSummaryCache() {
    try {
        const raw = localStorage.getItem(SUMMARY_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;

        return {
            userName: typeof parsed.userName === "string" ? parsed.userName : "Guest",
            tasks: parsed.tasks && typeof parsed.tasks === "object" ? parsed.tasks : {},
        };
    } catch (error) {
        return null;
    }
}

/**
 * Writes summary payload into localStorage.
 *
 * @param {{ userName: string, tasks: Object, updatedAt?: number }} payload - Summary payload.
 * @returns {void}
 */
function writeSummaryCache(payload) {
    try {
        localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(payload || {}));
    } catch (error) {
        return;
    }
}

/**
 * Resolves the currently active user ID from a global context or session storage.
 *
 * @async
 * @category Summary
 * @subcategory Data Handling
 * @returns {Promise<string|null>} The active user ID or null if not found.
 */
async function resolveActiveUserId() {
    if (window.userContext?.resolveUserId) {
        return window.userContext.resolveUserId();
    }
    return sessionStorage.getItem('userId');
}

/**
 * Fetches all task data from the Firebase "tasks" reference.
 *
 * @async
 * @category Summary
 * @subcategory Data Handling
 * @returns {Promise<Object>} An object containing all tasks from the database.
 */
async function getTasks() {
    const tasksRef = db.ref("tasks");
    const snapshot = await tasksRef.get();
    return snapshot.val() || {};
}

/**
 * Retrieves the name of a specific user from Firebase by their ID.
 *
 * @async
 * @category Summary
 * @subcategory Data Handling
 * @param {string} userId - The unique ID of the user to fetch.
 * @returns {Promise<string>} The user's name or "Guest" as a fallback.
 */
async function getUserName(userId) {
    if (!userId) return "Guest";
    const userRef = db.ref("users/" + userId);
    const snapshot = await userRef.get();
    return snapshot.val()?.name || "Guest";
}

/**
 * Displays the user's name in the designated HTML element.
 *
 * @category Summary
 * @subcategory UI Rendering
 * @param {string} name - The name to be rendered.
 * @returns {void}
 */
function renderUserName(name) {
    document.getElementById("user-name").innerText = name;
}

/**
 * Calculates task statistics by status and priority.
 *
 * @param {Object} tasks - The task object containing all tasks.
 * @returns {Object} An object with task counts by category.
 */
function calculateTaskStats(tasks) {
    const taskList = Object.values(tasks || {});
    const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

    return {
        totalTasks: taskList.length,
        todoCount: taskList.filter((t) => normalizeStatus(t.status) === "todo").length,
        inProgressCount: taskList.filter((t) => normalizeStatus(t.status) === "in-progress").length,
        doneCount: taskList.filter((t) => normalizeStatus(t.status) === "done").length,
        urgentCount: taskList.filter((t) => t.priority === "urgent").length,
        feedbackCount: taskList.filter((t) => {
            const status = normalizeStatus(t.status);
            return status === "await-feedback" || status === "awaiting-feedback";
        }).length,
    };
}

/**
 * Calculates and renders task statistics to the UI.
 * Filters tasks by status and priority to update the dashboard counters.
 *
 * @category Summary
 * @subcategory UI Rendering
 * @param {Object} tasks - The task object containing all tasks.
 * @returns {void}
 */
function renderSummary(tasks) {
    const stats = calculateTaskStats(tasks);
    
    document.getElementById("total-tasks").innerText = stats.totalTasks;
    document.getElementById("todo-tasks").innerText = stats.todoCount;
    document.getElementById("inprogress-tasks").innerText = stats.inProgressCount;
    document.getElementById("done-tasks").innerText = stats.doneCount;
    document.getElementById("urgent-tasks").innerText = stats.urgentCount;
    document.getElementById("awaitFeedback-tasks").innerText = stats.feedbackCount;

    renderNextDeadline(tasks);
}

/**
 * Determines the current time of day and displays an appropriate greeting.
 *
 * @category Summary
 * @subcategory UI Rendering
 * @returns {void}
 */
function setGreeting() {
    var today = new Date();
    var curHr = today.getHours();
    let msg = (curHr < 12) ? 'Good Morning,' : (curHr < 17) ? 'Good Afternoon,' : 'Good Evening,';
    document.getElementById("greet").innerHTML = msg;
}

/**
 * Finds the closest upcoming task deadline from all available tasks.
 *
 * @param {Object} tasks - The task object from Firebase.
 * @returns {Date|null} The closest upcoming deadline date or null if none found.
 */
function findClosestDeadline(tasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let closestDeadline = null;
    Object.values(tasks).forEach(task => {
        if (!task.dueDate) return;
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        if (taskDate >= today && (!closestDeadline || taskDate < closestDeadline)) {
            closestDeadline = taskDate;
        }
    });
    return closestDeadline;
}

/**
 * Finds the task object that matches a specific deadline date.
 *
 * @param {Object} tasks - The task object from Firebase.
 * @param {Date} deadline - The deadline date to match against.
 * @returns {Object|null} The matching task object or null if not found.
 */
function findTaskByDeadline(tasks, deadline) {
    return Object.values(tasks).find(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === deadline.getTime();
    }) || null;
}

/**
 * Renders the next upcoming deadline date into the designated HTML element.
 *
 * @param {Object} tasks - The task object from Firebase.
 * @returns {void}
 */
function renderNextDeadline(tasks) {
    const deadline = findClosestDeadline(tasks);
    const task = deadline ? findTaskByDeadline(tasks, deadline) : null;
    document.getElementById("next-deadline").innerText = task
        ? task.dueDate
        : "No upcoming deadlines";
}

// Initial call to start the page logic
loadSummary();
