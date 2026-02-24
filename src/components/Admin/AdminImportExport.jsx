// src/components/Admin/AdminImportExport.jsx
import { useState } from "react";
import PropTypes from "prop-types";
import AdminLayout from "./AdminLayout";
import IEUsers from "./ImportExport/IEUsers";
import IERegistrations from "./ImportExport/IERegistrations";
import IEPoints from "./ImportExport/IEPoints";

const TABS = [
  { key: "users",         label: "Gebruikers" },
  { key: "registrations", label: "Registraties" },
  { key: "points",        label: "Punten" },
];

export default function AdminImportExport({ user }) {
  const [tab, setTab] = useState("users");

  return (
    <AdminLayout user={user}>
      <h1 style={s.title}>Import & Export</h1>
      <p style={s.subtitle}>
        Importeer of exporteer gegevens per categorie. Geïmporteerde records worden automatisch gemarkeerd zodat je ze kunt onderscheiden van organische aanmeldingen.
      </p>

      <div style={s.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ ...s.tabBtn, ...(tab === t.key ? s.tabBtnActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        {tab === "users" && <IEUsers user={user} />}
        {tab === "registrations" && <IERegistrations user={user} />}
        {tab === "points" && <IEPoints user={user} />}
      </div>
    </AdminLayout>
  );
}

AdminImportExport.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

const s = {
  title: { margin: "0 0 0.3rem", fontSize: "1.5rem", color: "#111827" },
  subtitle: { color: "#6b7280", fontSize: "0.9rem", marginBottom: "1.2rem" },
  tabBar: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  tabBtn: { padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", transition: "all 0.15s" },
  tabBtnActive: { background: "#004aad", color: "#fff", border: "1px solid #004aad" },
};
