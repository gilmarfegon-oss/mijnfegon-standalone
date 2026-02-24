// src/components/Admin/AdminInstellingen.jsx
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { db } from "../../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import AdminLayout from "./AdminLayout";
import { logAdminAction } from "../../adminTools/logAdminAction";

export default function AdminInstellingen({ user }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [melding, setMelding] = useState(null);

  function showMelding(text, type = "success") {
    setMelding({ text, type });
    setTimeout(() => setMelding(null), 4000);
  }

  async function loadTemplates() {
    try {
      const snap = await getDocs(collection(db, "mailTemplates"));
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      showMelding("Templates laden mislukt: " + err.message, "error");
    }
    setLoading(false);
  }

  async function save(id, subject, body) {
    try {
      await updateDoc(doc(db, "mailTemplates", id), { subject, body, updatedAt: new Date() });
      showMelding(`Template "${id}" opgeslagen.`);
      logAdminAction({ type: "settings_template", description: `Mail template "${id}" bijgewerkt`, collectionName: "mailTemplates", adminUid: user?.uid, adminEmail: user?.email });
    } catch (err) {
      showMelding("Opslaan mislukt: " + err.message, "error");
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  return (
    <AdminLayout user={user}>
      <h1 style={s.title}>Mail Templates</h1>
      <p style={s.subtitle}>Beheer de e-mailtemplates die worden gebruikt voor notificaties.</p>

      {melding && (
        <div style={{ ...s.melding, ...(melding.type === "error" ? s.meldingError : s.meldingSuccess) }}>
          {melding.text}
        </div>
      )}

      {loading ? (
        <p style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Templates laden...</p>
      ) : templates.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>Geen mail templates gevonden.</p>
      ) : (
        templates.map((t) => (
          <div key={t.id} style={s.card}>
            <h2 style={s.cardTitle}>{t.id}</h2>

            <label style={s.label}>Onderwerp</label>
            <input
              defaultValue={t.subject}
              id={`subject_${t.id}`}
              style={s.input}
            />

            <label style={s.label}>Body (HTML toegestaan)</label>
            <textarea
              rows="6"
              defaultValue={t.body}
              id={`body_${t.id}`}
              style={s.textarea}
            />

            <button
              onClick={() => {
                const subject = document.getElementById(`subject_${t.id}`).value;
                const body = document.getElementById(`body_${t.id}`).value;
                save(t.id, subject, body);
              }}
              style={s.saveBtn}
            >
              Opslaan
            </button>
          </div>
        ))
      )}
    </AdminLayout>
  );
}

AdminInstellingen.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

const s = {
  title: { margin: "0 0 0.3rem", fontSize: "1.5rem", color: "#111827" },
  subtitle: { color: "#6b7280", fontSize: "0.9rem", marginBottom: "1.5rem" },

  melding: { padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 500 },
  meldingSuccess: { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" },
  meldingError: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },

  card: { background: "#fff", padding: "1.5rem", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", marginBottom: "1.5rem" },
  cardTitle: { margin: "0 0 1rem", fontSize: "1.1rem", color: "#111827" },
  label: { display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem", marginTop: "0.75rem" },
  input: { width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.9rem", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.9rem", fontFamily: "monospace", boxSizing: "border-box", resize: "vertical" },
  saveBtn: { marginTop: "1rem", padding: "8px 20px", borderRadius: 8, border: "none", background: "#004aad", color: "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" },
};
