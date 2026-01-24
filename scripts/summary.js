const userId = "u1"; // eingeloggter User

// Async-Funktion für die Summary
async function loadSummary() {
    try {
        // 1️⃣ Username holen
        const userRef = db.ref("users/" + userId);
        const userSnapshot = await userRef.get(); // <- einmalige Abfrage
        const userData = userSnapshot.val();
        const name = userData && userData.name ? userData.name : "Guest";
        document.getElementById("user-name").innerText = name;

        // 2️⃣ Tasks holen
        const tasksRef = db.ref("tasks");
        const tasksSnapshot = await tasksRef.get(); // <- einmalige Abfrage
        const tasks = tasksSnapshot.val() || {};

        // Gesamtanzahl
        const totalTasks = Object.keys(tasks).length;

        // Anzahl nach Status
        const todoCount = Object.values(tasks).filter(t => t.status === "todo").length;
        const inProgressCount = Object.values(tasks).filter(t => t.status === "in-progress").length;
        const doneCount = Object.values(tasks).filter(t => t.status === "done").length;

        // Anzahl nach Priorität
        const urgentCount = Object.values(tasks).filter(t => t.priority === "urgent").length;

        // Zahlen ins Dashboard schreiben
        document.getElementById("total-tasks").innerText = totalTasks;
        document.getElementById("todo-tasks").innerText = todoCount;
        document.getElementById("inprogress-tasks").innerText = inProgressCount;
        document.getElementById("done-tasks").innerText = doneCount;
        document.getElementById("urgent-tasks").innerText = urgentCount;

        console.log("Summary geladen:", { totalTasks, todoCount, inProgressCount, doneCount });

    } catch (error) {
        console.error("Fehler beim Laden der Summary:", error);
    }
}

// Funktion aufrufen
loadSummary();
