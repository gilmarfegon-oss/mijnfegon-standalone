// src/components/Instellingen.jsx
import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Instellingen({ user }) {
  const [form, setForm] = useState({
    full_name: "",
    company: "",
    phone: "",
    kvk: "",
    address: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ Gegevens van gebruiker ophalen
  useEffect(() => {
    async function load() {
      if (!user) return;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setForm({
          full_name: data.full_name || "",
          company: data.company || "",
          phone: data.phone || "",
          kvk: data.kvk || "",
          address: data.address || "",
        });
      }

      setLoading(false);
    }

    load();
  }, [user]);

  // ✅ Formulier wijzigen
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  // ✅ Opslaan
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        ...form,
        updatedAt: new Date(),
      });

      setMessage("✅ Gegevens succesvol opgeslagen!");
    } catch (err) {
      console.error(err);
      setMessage("❌ Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ textAlign: "center" }}>⏳ Laden...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>⚙️ Instellingen</h1>
        <p style={styles.subtitle}>Beheer hier je persoonlijke en bedrijfsgegevens.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Volledige naam *</label>
          <input
            name="full_name"
            type="text"
            value={form.full_name}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <label style={styles.label}>Bedrijfsnaam *</label>
          <input
            name="company"
            type="text"
            value={form.company}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <label style={styles.label}>Telefoonnummer</label>
          <input
            name="phone"
            type="text"
            value={form.phone}
            onChange={handleChange}
            style={styles.input}
          />

          <label style={styles.label}>KvK-nummer</label>
          <input
            name="kvk"
            type="text"
            value={form.kvk}
            onChange={handleChange}
            style={styles.input}
          />

          <label style={styles.label}>Adres</label>
          <input
            name="address"
            type="text"
            value={form.address}
            onChange={handleChange}
            style={styles.input}
          />

          <button type="submit" style={styles.button} disabled={saving}>
            {saving ? "Opslaan..." : "Opslaan"}
          </button>
        </form>

        {message && <p style={styles.message}>{message}</p>}
      </div>
    </div>
  );
}

// ✅ Styles: consistent met Dashboard + Admin
const styles = {
  page: {
    fontFamily: "Inter, system-ui, sans-serif",
    background: "linear-gradient(180deg, #f7f9fc 0%, #eef3fb 100%)",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "3rem 1rem",
  },
  container: {
    width: "100%",
    maxWidth: "650px",
    background: "#fff",
    padding: "2rem",
    borderRadius: 16,
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  },
  title: {
    margin: 0,
    fontSize: "1.7rem",
    color: "#003366",
    fontWeight: 700,
  },
  subtitle: {
    margin: "0.5rem 0 1.5rem",
    color: "#666",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  label: {
    fontWeight: 600,
    color: "#003366",
  },
  input: {
    padding: "0.8rem",
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: "1rem",
  },
  button: {
    background: "#004aad",
    color: "#fff",
    border: "none",
    padding: "0.9rem",
    borderRadius: 8,
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "1rem",
  },
  message: {
    marginTop: "1.2rem",
    textAlign: "center",
    fontWeight: "bold",
    color: "#004aad",
  },
};
