// Firebase Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyCzNNFBCw9iLIMBmz4ItcS2ZslLeKfeStU",
  authDomain: "join-2483.firebaseapp.com",
  databaseURL: "https://join-2483-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "join-2483",
  storageBucket: "join-2483.firebasestorage.app",
  messagingSenderId: "1015631608333",
  appId: "1:1015631608333:web:5dcfe60e31adb078aeb344"
};

// Firebase initialisieren
firebase.initializeApp(firebaseConfig);

// Realtime Database bereitstellen
const db = firebase.database();

console.log("Firebase ready", db);
