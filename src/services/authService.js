// src/services/authService.js
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

const auth = getAuth();
const provider = new GoogleAuthProvider();

// ✅ ONLOGIN → automatisch loggen
async function logLoginEvent(user) {
  try {
    await addDoc(collection(db, "logs_login"), {
      uid: user.uid,
      email: user.email,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
      success: true,
    });
  } catch (err) {
    console.error("Login log mislukt:", err);
  }
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || "",
        role: "user",
        profile_completed: false,
        createdAt: new Date(),
      });
    }

    // ✅ Automatisch login registreren
    await logLoginEvent(user);

    return user;
  } catch (err) {
    console.error("Login fout:", err);
    return null;
  }
}

// ✅ Logout
export function logout() {
  return auth.signOut();
}
