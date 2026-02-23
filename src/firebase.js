// src/firebase.js
// Complete Firebase setup: Auth + Firestore + Storage + Functions (regio vast)

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAjxmYzmbSbfUneXaxEKmewWoSfwF8Ld30",
  authDomain: "mijnfegon.firebaseapp.com",
  projectId: "mijnfegon",
  storageBucket: "mijnfegon.firebasestorage.app",
  messagingSenderId: "415529097955",
  appId: "1:415529097955:web:da03af79ae2888a58a83d6",
};

// 🔥 Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🔥 Core services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// 🔐 Auth provider
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account",
});

// 🔒 Cloud Functions – EU regio (Belgium, europe-west1)
export const functions = getFunctions(app, "europe-west1");

// (optioneel, maar prima)
export default app;
