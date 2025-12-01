// src/components/Admin/AdminImportExport.jsx
import React, { useState } from "react";
import AdminMenu from "./AdminMenu";

import IEUsers from "./ImportExport/IEUsers";
import IERegistrations from "./ImportExport/IERegistrations";
import IEPoints from "./ImportExport/IEPoints";

export default function AdminImportExport() {
  const [tab, setTab] = useState("users");

  return (
    <div className="admin-layout">
      <AdminMenu />

      <div className="admin-content">
        <h1>📥 Import & Export</h1>
        <p>Kies een categorie om te importeren of exporteren.</p>

        {/* SUBMENU */}
        <div style={styles.tabs}>
          <button
            onClick={() => setTab("users")}
            style={tab === "users" ? styles.active : styles.tab}
          >
            👥 Gebruikers
          </button>

          <button
            onClick={() => setTab("registrations")}
            style={tab === "registrations" ? styles.active : styles.tab}
          >
            📄 Registraties
          </button>

          <button
            onClick={() => setTab("points")}
            style={tab === "points" ? styles.active : styles.tab}
          >
            ⭐ Punten
          </button>
        </div>

        {/* CONTENT */}
        {tab === "users" && <IEUsers />}
        {tab === "registrations" && <IERegistrations />}
        {tab === "points" && <IEPoints />}
      </div>
    </div>
  );
}

const styles = {
  tabs: {
    display: "flex",
    gap: "1rem",
    marginBottom: "2rem",
  },
  tab: {
    padding: "0.7rem 1.2rem",
    background: "#e6eaff",
    border: "1px solid #ccd5ff",
    borderRadius: 8,
    cursor: "pointer",
  },
  active: {
    padding: "0.7rem 1.2rem",
    background: "#004aad",
    border: "1px solid #00357a",
    borderRadius: 8,
    color: "white",
    cursor: "pointer",
  },
};
