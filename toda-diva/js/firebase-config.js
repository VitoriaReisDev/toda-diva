import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBW077wgAfcC4_pCZk3w8g9xuQTYkL8e9Q",
  authDomain: "toda-diva-9f783.firebaseapp.com",
  databaseURL: "https://toda-diva-9f783-default-rtdb.firebaseio.com",
  projectId: "toda-diva-9f783",
  storageBucket: "toda-diva-9f783.firebasestorage.app",
  messagingSenderId: "632724718439",
  appId: "1:632724718439:web:0b029b6c2ac03dd3d6e5c2"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);