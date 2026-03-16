<<<<<<< HEAD
const defaultFirebaseConfig = {
=======
const firebaseConfig = {
>>>>>>> b53e3a6494a412b686d294c9fc4755ccb708ae47
  apiKey: "AIzaSyAPXuwNBWi8_c6MR99XE7eYniqLESEa9EQ",
  authDomain: "join-d26ee.firebaseapp.com",
  databaseURL: "https://join-d26ee-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "join-d26ee",
  storageBucket: "join-d26ee.firebasestorage.app",
  messagingSenderId: "311374228338",
  appId: "1:311374228338:web:cb0bbe0d0d91d7a9e7cbeb",
  measurementId: "G-FSMHHFLF0Q"
};

if (!firebase.apps.length) {
  firebase.initializeApp(defaultFirebaseConfig);
}

const db = firebase.database();



