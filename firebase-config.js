import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, enablePersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- PASTE YOUR FIREBASE CONFIG OBJECT HERE ---
// This config was copied from your canvas.
const firebaseConfig = {
    apiKey: "AIzaSyC2A5a83w_XAv1XT4_ES5S2jNRkPci9w5U",
    authDomain: "unique-ue-website.firebaseapp.com",
    projectId: "unique-ue-website",
    storageBucket: "unique-ue-website.firebasestorage.app",
    messagingSenderId: "26306347057",
    appId: "1:26306347057:web:a2f5c0e893cb99f5585510",
    measurementId: "G-5K4TBEBTB3"
  };

// ---------------------------------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence (for Ghost-Writer)
// This will cache data locally so users don't lose work if they go offline
(async () => {
  try {
    await enablePersistence(db);
    console.log("Firebase Offline Persistence enabled.");
  } catch (error) {
    if (error.code == 'failed-precondition') {
      console.warn("Firebase Persistence failed (multiple tabs open?).");
    } else if (error.code == 'unimplemented') {
      console.log("Firebase Persistence is not available in this browser.");
    }
  }
})();

// Export the initialized services
export { app, auth, db };