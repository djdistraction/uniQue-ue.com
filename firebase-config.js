// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- IMPORTANT ---
// Fill in your own Firebase configuration details here!
// You can get this from your Firebase project settings.
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

// --- Define Worker URL ---
// This was correct in your file.
export const WORKER_URL = "https://unique-ue-api.unique-ue-ai-proxy.workers.dev";

// --- Initialize Firebase and Services ---
const app = initializeApp(firebaseConfig);

// Initialize and get references to the services you need
const auth = getAuth(app);
const db = getFirestore(app);

// --- Export the initialized services ---
// Now 'app', 'auth', 'db', and 'WORKER_URL' are all correctly defined and exported.
export { app, auth, db, WORKER_URL };
export { app, auth, db, WORKER_URL };
