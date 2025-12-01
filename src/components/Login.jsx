import React, { useState } from "react";
import { auth, db } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [melding, setMelding] = useState("");
  const [loading, setLoading] = useState(false);

  const provider = new GoogleAuthProvider();

  async function upsertUserDoc(user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      await setDoc(
        ref,
        {
          uid: user.uid,
          email: user.email,
          name: user.displayName || snap.data().name || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || "",
        role: "user",
        company: "",
        points_total: 0,
        points_pending: 0,
        profile_completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setMelding("");

    try {
      const res = await signInWithPopup(auth, provider);
      await upsertUserDoc(res.user);
    } catch (e) {
      console.error(e);
      setMelding("❌ " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin() {
    setLoading(true);
    setMelding("");

    try {
      const res = await signInWithEmailAndPassword(auth, email, pw);
      await upsertUserDoc(res.user);
    } catch (e) {
      let msg = "❌ Inloggen mislukt.";

      if (e.code === "auth/user-not-found") msg = "❌ Geen gebruiker gevonden.";
      if (e.code === "auth/wrong-password") msg = "❌ Incorrect wachtwoord.";
      if (e.code === "auth/invalid-email") msg = "❌ Ongeldig e-mailadres.";

      setMelding(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!email) {
      setMelding("❌ Vul eerst je e-mail in.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMelding("📨 Reset e-mail verzonden!");
    } catch (e) {
      setMelding("❌ " + e.message);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Inloggen</h1>

        {melding && <div style={styles.alert}>{melding}</div>}

        <input
          style={styles.input}
          placeholder="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Wachtwoord"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />

        <button
          style={styles.btnPrimary}
          onClick={handleEmailLogin}
          disabled={loading}
        >
          {loading ? "Bezig..." : "Inloggen"}
        </button>

        <button
          style={styles.btnLink}
          onClick={handlePasswordReset}
        >
          Wachtwoord vergeten?
        </button>

        <hr style={styles.hr} />

        <button
          style={styles.btnGoogle}
          onClick={handleGoogle}
          disabled={loading}
        >
          🔐 Log in met Google
        </button>

        <p style={{ marginTop: "1rem", textAlign: "center" }}>
          Nog geen account?{" "}
          <a href="/register" style={styles.link}>
            Registreren
          </a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(180deg,#eef2ff,#dbe4ff)",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    background: "white",
    padding: "2rem",
    borderRadius: 14,
    boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
  },
  title: {
    textAlign: "center",
    marginBottom: "1.4rem",
  },
  input: {
    width: "100%",
    padding: "0.8rem",
    borderRadius: 8,
    border: "1px solid #ccc",
    marginBottom: "1rem",
  },
  btnPrimary: {
    width: "100%",
    padding: "0.8rem",
    background: "#004aad",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontWeight: "bold",
    cursor: "pointer",
  },
  btnGoogle: {
    width: "100%",
    padding: "0.8rem",
    background: "#ffffff",
    border: "1px solid #ccc",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnLink: {
    marginTop: "0.6rem",
    background: "transparent",
    border: "none",
    color: "#004aad",
    cursor: "pointer",
    textDecoration: "underline",
  },
  hr: {
    margin: "1.4rem 0",
  },
  alert: {
    background: "#ffe6e6",
    padding: "0.8rem",
    borderRadius: 8,
    border: "1px solid #ffbcbc",
    marginBottom: "1rem",
    color: "#aa0000",
  },
  link: {
    color: "#004aad",
    fontWeight: "bold",
  },
};
