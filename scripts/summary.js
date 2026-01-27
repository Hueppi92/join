
/**
 * Main initialization function for the summary page.
 * Fetches user data and tasks to trigger the rendering of the dashboard.
 * @async
 */
async function loadSummary() {
    try {
        const userId = await resolveActiveUserId();
        const userName = await getUserName(userId);
        const tasks = await getTasks();

        renderUserName(userName);
        setGreeting();
        renderSummary(tasks);

        console.log("Init (loadSummary) erfolgreich");
    } catch (error) {
        console.error("Fehler in loadSummary:", error);
    }
}

/**
 * Resolves the currently active user ID from a global context or session storage.
 * @async
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
 * @async
 * @returns {Promise<Object>} An object containing all tasks from the database.
 */
async function getTasks() {
    const tasksRef = db.ref("tasks");
    const snapshot = await tasksRef.get();
    return snapshot.val() || {};
}

/**
 * Retrieves the name of a specific user from Firebase by their ID.
 * @async
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
 * @param {string} name - The name to be rendered.
 */
function renderUserName(name) {
    document.getElementById("user-name").innerText = name;
}

/**
 * Calculates and renders task statistics (total, status, and urgency) to the UI.
 * @param {Object} tasks - The task object where keys are IDs and values are task details.
 */
function renderSummary(tasks) {
    const totalTasks = Object.keys(tasks).length;
    const todoCount = Object.values(tasks).filter(t => t.status === "todo").length;
    const inProgressCount = Object.values(tasks).filter(t => t.status === "in-progress").length;
    const doneCount = Object.values(tasks).filter(t => t.status === "done").length;
    const urgentCount = Object.values(tasks).filter(t => t.priority === "urgent").length;

    document.getElementById("total-tasks").innerText = totalTasks;
    document.getElementById("todo-tasks").innerText = todoCount;
    document.getElementById("inprogress-tasks").innerText = inProgressCount;
    document.getElementById("done-tasks").innerText = doneCount;
    document.getElementById("urgent-tasks").innerText = urgentCount;
}

/**
 * Determines the current time of day and displays an appropriate greeting message.
 */
function setGreeting() {
     var today = new Date()
    var curHr = today.getHours()

    if (curHr >= 0 && curHr < 6) {
        document.getElementById("greet").innerHTML = 'What are you doing that early?';
    } else if (curHr >= 6 && curHr <= 12) {
        document.getElementById("greet").innerHTML = 'Good Morning,';
    } else if (curHr >= 12 && curHr < 17) {
        document.getElementById("greet").innerHTML = 'Good Afternoon,';
    } else {
        document.getElementById("greet").innerHTML = 'Good Evening,';
    }
}

loadSummary();
