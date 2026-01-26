const userId = "u1"; // eingeloggter User

async function loadSummary() {
    try {
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

async function getTasks() {
    const tasksRef = db.ref("tasks");
    const snapshot = await tasksRef.get();
    return snapshot.val() || {};
}

async function getUserName(userId) {
    const userRef = db.ref("users/" + userId);
    const snapshot = await userRef.get();
    return snapshot.val()?.name || "Guest";
}

function renderUserName(name) {
    document.getElementById("user-name").innerText = name;
}

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
