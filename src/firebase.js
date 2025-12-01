// ✅ src/firebase.js
// Complete Firebase setup: Auth + Firestore + Storage

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAjxmYzmbSbfUneXaxEKmewWoSfwF8Ld30",
  authDomain: "mijnfegon.firebaseapp.com",
  projectId: "mijnfegon",
  storageBucket: "mijnfegon.firebasestorage.app",   // ✅ JUISTE BUCKET
  messagingSenderId: "415529097955",
  appId: "1:415529097955:web:da03af79ae2888a58a83d6"
};

// ✅ Initialize Firebase app
const app = initializeApp(firebaseConfig);

// ✅ Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const storage = getStorage(app);

// ✅ Optional: force Google account prompt
provider.setCustomParameters({
  prompt: "select_account",
});

export default app;
