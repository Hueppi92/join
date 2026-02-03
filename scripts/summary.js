/**
 * Main initialization function for the summary page.
 * * @async
 * @category Summary
 * @subcategory Lifecycle
 */
async function loadSummary() {
    try {
        const userId = await resolveActiveUserId();
        const userName = await getUserName(userId);
        const tasks = await getTasks();

        renderUserName(userName);
        setGreeting();
        renderSummary(tasks);
    } catch (error) {
        console.error("Fehler in loadSummary:", error);
    }
}

/**
 * Resolves the currently active user ID from a global context or session storage.
 * * @async
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
 * * @async
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
 * * @async
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
 * * @category Summary
 * @subcategory UI Rendering
 * @param {string} name - The name to be rendered.
 */
function renderUserName(name) {
    document.getElementById("user-name").innerText = name;
}

/**
 * Calculates and renders task statistics to the UI.
 * * @category Summary
 * @subcategory UI Rendering
 * @param {Object} tasks - The task object.
 */
function renderSummary(tasks) {
    const totalTasks = Object.keys(tasks).length;
    const todoCount = Object.values(tasks).filter(t => t.status === "todo").length;
    const inProgressCount = Object.values(tasks).filter(t => t.status === "in-progress").length;
    const doneCount = Object.values(tasks).filter(t => t.status === "done").length;
    const urgentCount = Object.values(tasks).filter(t => t.priority === "urgent").length;
    const feedbackCount = Object.values(tasks).filter(t => t.status === "awaiting-feedback").length;
 getNextDeadline();

    document.getElementById("total-tasks").innerText = totalTasks;
    document.getElementById("todo-tasks").innerText = todoCount;
    document.getElementById("inprogress-tasks").innerText = inProgressCount;
    document.getElementById("done-tasks").innerText = doneCount;
    document.getElementById("urgent-tasks").innerText = urgentCount;
    document.getElementById("awaitFeedback-tasks").innerText = feedbackCount;

   
}

/**
 * Determines the current time of day and displays a greeting.
 * * @category Summary
 * @subcategory UI Rendering
 */
function setGreeting() {
    var today = new Date();
    var curHr = today.getHours();
    let msg = (curHr < 12) ? 'Good Morning,' : (curHr < 17) ? 'Good Afternoon,' : 'Good Evening,';
    document.getElementById("greet").innerHTML = msg;
}

function getNextDeadline() {
    const tasksRef = db.ref("tasks");
    tasksRef.get().then((snapshot) => {
        if (snapshot.exists()) {
            const tasks = snapshot.val();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            let closestDeadline = null;
            let closestTask = null;
            
            Object.values(tasks).forEach(task => {
                if (task.dueDate) {
                    const taskDate = new Date(task.dueDate);
                    taskDate.setHours(0, 0, 0, 0);
                    
                    if (taskDate >= today) {
                        if (!closestDeadline || taskDate < closestDeadline) {
                            closestDeadline = taskDate;
                            closestTask = task;
                        }
                    }
                }
            });
            
            document.getElementById("next-deadline").innerText = closestTask 
                ? closestTask.dueDate 
                : "No upcoming deadlines";
        } else {
            document.getElementById("next-deadline").innerText = "No upcoming deadlines";
        }
    });
}

loadSummary();