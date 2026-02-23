// src/components/Register.jsx
import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { sendWelcomeEmail } from "../services/mailService";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
    password2: "",
    acceptTerms: false,
  });

  const [melding, setMelding] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  function validate() {
    if (!form.name) return "Vul een naam in.";
    if (!form.company) return "Vul een bedrijfsnaam in.";
    if (!form.email) return "Vul een e-mailadres in.";
    if (!form.password || !form.password2) return "Vul een wachtwoord in.";
    if (form.password !== form.password2) return "Wachtwoorden komen niet overeen.";
    if (form.password.length < 6) return "Wachtwoord moet minimaal 6 tekens zijn.";
    if (!form.acceptTerms) return "Akkoord met de voorwaarden is vereist.";
    return null;
  }

  async function handleRegister(e) {
    e.preventDefault();
    setMelding("");

    const error = validate();
    if (error) return setMelding("❌ " + error);

    try {
      setLoading(true);

      // Maak gebruiker aan in Auth
      const res = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password,
      );

      // Firestore user-doc met velden die ProfielAanvullen gebruikt
      await setDoc(doc(db, "users", res.user.uid), {
        uid: res.user.uid,
        email: form.email,
        // Deze twee matchen nu met ProfielAanvullen.jsx
        installer_full_name: form.name,
        installer_company: form.company,
        // Overige standaardvelden
        role: "user",
        points_total: 0,
        points_pending: 0,
        profile_completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      sendWelcomeEmail(form.email, form.name);
      setMelding("✔ Account aangemaakt! Je wordt doorgestuurd...");

      // Direct naar profiel-aanvullen flow
      setTimeout(() => {
        navigate("/profiel-aanvullen");
      }, 800);
    } catch (err) {
      console.error(err);
      setMelding("❌ Er ging iets mis: " + err.message);
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

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            name="acceptTerms"
            checked={form.acceptTerms}
            onChange={handleChange}
          />
          <span>
            Ik ga akkoord met de{" "}
            <Link to="/voorwaarden" target="_blank" rel="noopener noreferrer">algemene voorwaarden</Link>
            {" "}en het{" "}
            <Link to="/privacy" target="_blank" rel="noopener noreferrer">privacybeleid</Link>.
          </span>
        </label>

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
  checkboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.6rem",
    fontSize: "0.9rem",
    color: "#374151",
    cursor: "pointer",
    marginBottom: "0.5rem",
  },
};
