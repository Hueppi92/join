// seed.js
// Dieses Skript füllt die Firebase Realtime Database mit einer initialen Struktur

// Referenzen zu Firebase
/* const tasksRef = db.ref("tasks");
const usersRef = db.ref("users");
const taskUsersRef = db.ref("taskUsers");
const userTasksRef = db.ref("userTasks");
const contactsRef = db.ref("contacts");
const subtasksRef = db.ref("subtasks");

async function seedDatabase() {
  try {
    // 1️⃣ Users anlegen
    const users = {
      u1: { name: "Andreas", email: "andreas@mail.de", password: "testpassword" },
      u2: { name: "Julia", email: "julia@mail.de", password: "pass1234" },
      u3: { name: "Max", email: "max@mail.de", password: "abc123" },
      u4: { name: "Sophie", email: "sophie@mail.de", password: "qwertz" },
      u5: { name: "Leon", email: "leon@mail.de", password: "123456" }
    };
    await usersRef.set(users);

    // 2️⃣ Tasks anlegen
    const tasks = {
      t1: { title: "Login bauen", description: "Firebase Auth implementieren", dueDate: "2026-02-01", priority: "high", status: "todo" },
      t2: { title: "Kanban Board UI", description: "Spalten & Karten layouten", dueDate: "2026-02-05", priority: "medium", status: "done" },
      t3: { title: "Summary Dashboard", description: "Übersicht anzeigen", dueDate: "2026-02-03", priority: "medium", status: "done" }
    };
    await tasksRef.set(tasks);

    // 3️⃣ Subtasks
    const subtasks = {
      t1: {
        s1: { title: "HTML", isDone: false }
      }
    };
    await subtasksRef.set(subtasks);

    // 4️⃣ Contacts
    const contacts = {
      u1: { u2: true } // Beispiel: Andreas kennt Julia
    };
    await contactsRef.set(contacts);

    // 5️⃣ Task-User Zuordnung (taskUsers & userTasks)
    const taskUsers = {};
    const userTasks = {};

    for (const taskId in tasks) {
      taskUsers[taskId] = {};
      for (const userId in users) {
        taskUsers[taskId][userId] = true;

        if (!userTasks[userId]) userTasks[userId] = {};
        userTasks[userId][taskId] = true;
      }
    }

    await taskUsersRef.set(taskUsers);
    await userTasksRef.set(userTasks);

    console.log("✅ Seed-Daten erfolgreich angelegt!");
  } catch (err) {
    console.error("❌ Fehler beim Seed:", err);
  }
}

// Funktion aufrufen
seedDatabase();
 */