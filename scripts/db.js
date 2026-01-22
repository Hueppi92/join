// db.js
firebase.initializeApp(firebaseConfig); // firebaseConfig kommt aus firebaseConfig.js

// Realtime Database bereitstellen
const db = firebase.database();

console.log("Firebase ready", db);
