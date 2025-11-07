import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// ... existing code ...
    appId: "1:26306347057:web:a2f5c0e893cb99f5585510",
    measurementId: "G-5K4TBEBTB3"
  };

// ---------------------------------------------

// --- NEW: Define Worker URL (Task 3) ---
export const WORKER_URL = "https://unique-ue-api.unique-ue-ai-proxy.workers.dev";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// ... existing code ...
    }
  }
})();

// Export the initialized services
// MODIFIED: Added WORKER_URL
export { app, auth, db, WORKER_URL };