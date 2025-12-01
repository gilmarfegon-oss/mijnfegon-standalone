import React, { useState } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
    password2: ""
  });

  const [melding, setMelding] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function validate() {
    if (!form.name) return "Vul een naam in.";
    if (!form.company) return "Vul een bedrijfsnaam in.";
    if (!form.email) return "Vul een e-mailadres in.";
    if (!form.password || !form.password2) return "Vul een wachtwoord in.";
    if (form.password !== form.password2) return "Wachtwoorden komen niet overeen.";
    if (form.password.length < 6) return "Wachtwoord moet minimaal 6 tekens zijn.";
    return null;
  }

  async function handleRegister(e) {
    e.preventDefault();
    setMelding("");

    const error = validate();
    if (error) return setMelding("❌ " + error);

    try {
      setLoading(true);

      // Maak gebruiker aan
      const res = await createUserWithEmailAndPassword(auth, form.email, form.password);

      // Firestore user-doc
      await setDoc(doc(db, "users", res.user.uid), {
        uid: res.user.uid,
        email: form.email,
        name: form.name,
        company: form.company,
        role: "user",
        points_total: 0,
        points_pending: 0,
        profile_completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMelding("✔ Account aangemaakt! Je wordt doorgestuurd...");
      setTimeout(() => {
        window.location.href = "/"; // App.jsx redirect naar ProfielAanvullen
      }, 1200);

    } catch (e) {
      console.error(e);
      setMelding("❌ Er ging iets mis: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleRegister} style={styles.card}>
        <h1 style={styles.title}>Account Registreren</h1>

        {melding && <p style={styles.alert}>{melding}</p>}

        <input
          style={styles.input}
          placeholder="Volledige naam"
          name="name"
          value={form.name}
          onChange={handleChange}
        />

        <input
          style={styles.input}
          placeholder="Bedrijfsnaam"
          name="company"
          value={form.company}
          onChange={handleChange}
        />

        <input
          style={styles.input}
          placeholder="E-mail"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          style={styles.input}
          placeholder="Wachtwoord"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
        />

        <input
          style={styles.input}
          placeholder="Herhaal wachtwoord"
          type="password"
          name="password2"
          value={form.password2}
          onChange={handleChange}
        />

        <button disabled={loading} style={styles.btnPrimary}>
          {loading ? "Bezig..." : "Account aanmaken"}
        </button>

        <p style={{ marginTop: "1rem" }}>
          Al een account? <a href="/login">Inloggen</a>
        </p>
      </form>
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
    padding: "1rem",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "white",
    padding: "2rem",
    borderRadius: 14,
    boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
  },
  title: {
    marginBottom: "1.4rem",
    textAlign: "center",
    fontSize: "1.6rem",
  },
  input: {
    width: "100%",
    padding: "0.8rem",
    marginBottom: "1rem",
    borderRadius: 8,
    border: "1px solid #ccc",
  },
  btnPrimary: {
    width: "100%",
    padding: "0.9rem",
    borderRadius: 8,
    background: "#004aad",
    color: "white",
    border: "none",
    fontSize: "1rem",
    cursor: "pointer",
  },
  alert: {
    background: "#ffeded",
    padding: "0.8rem",
    borderRadius: 8,
    border: "1px solid #ffb0b0",
    color: "#b00000",
    marginBottom: "1rem",
  },
};
