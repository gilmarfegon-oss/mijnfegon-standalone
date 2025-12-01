import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import AdminMenu from "./AdminMenu";

export default function AdminInstellingen() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadTemplates() {
    const snap = await getDocs(collection(db, "mailTemplates"));
    setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function save(id, subject, body) {
    const ref = doc(db, "mailTemplates", id);
    await updateDoc(ref, { subject, body, updatedAt: new Date() });
    alert("Template opgeslagen!");
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  if (loading) return <p>Templates laden...</p>;

  return (
    <div className="admin-layout">
      <AdminMenu />
      <div className="admin-content">
        <h1>✉️ Mail Templates</h1>

        {templates.map(t => (
          <div key={t.id} className="template-card">
            <h2>{t.id}</h2>

            <label>Onderwerp</label>
            <input
              defaultValue={t.subject}
              id={`subject_${t.id}`}
            />

            <label>Body (HTML toegestaan)</label>
            <textarea
              rows="6"
              defaultValue={t.body}
              id={`body_${t.id}`}
            />

            <button
              onClick={() => {
                const subject = document.getElementById(`subject_${t.id}`).value;
                const body = document.getElementById(`body_${t.id}`).value;
                save(t.id, subject, body);
              }}
            >
              Opslaan
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
