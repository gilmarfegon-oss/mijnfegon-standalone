// src/components/ProfielAanvullen.jsx
import React, { useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import "../styles/theme.css";

export default function ProfielAanvullen({ user }) {
  const [form, setForm] = useState({
    installer_full_name: "",
    installer_company: "",
    installer_phone: "",
    installer_kvk: "",
    installer_address: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // 📋 Wijzigingen in formulier bijhouden
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // 💾 Formulier opslaan
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      // ✅ Als gebruiker al bestaat → werk alleen profielvelden bij
      if (snap.exists()) {
        await updateDoc(ref, {
          installer_full_name: form.installer_full_name,
          installer_company: form.installer_company,
          installer_phone: form.installer_phone,
          installer_kvk: form.installer_kvk,
          installer_address: form.installer_address,
          profile_completed: true,
          updatedAt: serverTimestamp(),
        });
      } else {
        // 🆕 Nieuwe gebruiker → standaard role = user
        await setDoc(ref, {
          uid: user.uid,
          email: user.email,
          role: "user",
          points_total: 0,
          points_pending: 0,
          createdAt: serverTimestamp(),
          installer_full_name: form.installer_full_name,
          installer_company: form.installer_company,
          installer_phone: form.installer_phone,
          installer_kvk: form.installer_kvk,
          installer_address: form.installer_address,
          profile_completed: true,
        });
      }

      setSuccess(true);
    } catch (err) {
      console.error("❌ Profiel opslaan mislukt:", err);
      setError("Er is iets misgegaan bij het opslaan van je gegevens. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={styles.page}>
      <div className="card" style={styles.card}>
        <h1>Welkom bij MijnFegon 👋</h1>
        <p className="text-muted" style={{ marginBottom: "1rem" }}>
          Vul onderstaande bedrijfsgegevens aan om toegang te krijgen tot het portaal.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label>Volledige naam*</label>
          <input
            type="text"
            name="installer_full_name"
            placeholder="Bijv. Jan Jansen"
            value={form.installer_full_name}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <label>Bedrijfsnaam*</label>
          <input
            type="text"
            name="installer_company"
            placeholder="Bijv. Installatiebedrijf Jansen BV"
            value={form.installer_company}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <label>Telefoonnummer</label>
          <input
            type="text"
            name="installer_phone"
            placeholder="Bijv. 0612345678"
            value={form.installer_phone}
            onChange={handleChange}
            style={styles.input}
          />

          <label>KvK-nummer (optioneel)</label>
          <input
            type="text"
            name="installer_kvk"
            placeholder="Bijv. 12345678"
            value={form.installer_kvk}
            onChange={handleChange}
            style={styles.input}
          />

          <label>Adres (optioneel)</label>
          <input
            type="text"
            name="installer_address"
            placeholder="Bijv. Dorpsstraat 12, 1234 AB Amsterdam"
            value={form.installer_address}
            onChange={handleChange}
            style={styles.input}
          />

          <button type="submit" className="btn btn-primary" style={styles.button} disabled={loading}>
            {loading ? "Opslaan..." : "Opslaan en doorgaan"}
          </button>
        </form>

        {success && (
          <p style={{ color: "green", marginTop: "1rem", textAlign: "center" }}>
            ✅ Gegevens opgeslagen! Je kunt nu verder naar het dashboard.
          </p>
        )}
        {error && (
          <p style={{ color: "red", marginTop: "1rem", textAlign: "center" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// 💅 Stijlen
const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f7f9fc 0%, #eef3fb 100%)",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  card: {
    maxWidth: 500,
    width: "100%",
    background: "#fff",
    borderRadius: 12,
    padding: "2rem",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
  },
  input: {
    padding: "0.8rem",
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: "1rem",
  },
  button: {
    marginTop: "1rem",
    background: "#004aad",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0.8rem 1.2rem",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
