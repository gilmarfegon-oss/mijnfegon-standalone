// src/components/Admin/AdminImportExport.jsx
import { useState } from "react";
import PropTypes from "prop-types";
import AdminLayout from "./AdminLayout";

// Zorg dat deze bestanden bestaan in de map ImportExport
import IEUsers from "./ImportExport/IEUsers";
import IERegistrations from "./ImportExport/IERegistrations";
import IEPoints from "./ImportExport/IEPoints";

export default function AdminImportExport({ user }) {
  const [tab, setTab] = useState("users");

  return (
    <AdminLayout user={user}>
      <h1>📥 Import & Export</h1>
      <p style={{ color: "#6b7280", marginTop: "0.3rem" }}>
        Importeer of exporteer gegevens per categorie. Gebruik dit met zorg:
        wijzigingen hebben direct effect op gebruikers, registraties en punten.
      </p>

      {/* SUBMENU / TABS */}
      <div
        className="actions-row"
        style={{ marginTop: "1.2rem", marginBottom: "1.6rem", display: "flex", gap: "10px" }}
      >
        <button
          type="button"
          style={tab === "users" ? styles.activeBtn : styles.ghostBtn}
          onClick={() => setTab("users")}
        >
          👥 Gebruikers
        </button>

        <button
          type="button"
          style={tab === "registrations" ? styles.activeBtn : styles.ghostBtn}
          onClick={() => setTab("registrations")}
        >
          📄 Registraties
        </button>

        <button
          type="button"
          style={tab === "points" ? styles.activeBtn : styles.ghostBtn}
          onClick={() => setTab("points")}
        >
          ⭐ Punten
        </button>
      </div>

      {/* CONTENT: Hier wordt de vernieuwde IEUsers geladen */}
      <div style={{ marginTop: "20px" }}>
        {tab === "users" && <IEUsers />}
        {tab === "registrations" && <IERegistrations />}
        {tab === "points" && <IEPoints />}
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

// Simpele inline styles om het netjes te houden
const styles = {
  activeBtn: {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500"
  },
  ghostBtn: {
    backgroundColor: "transparent",
    color: "#6b7280",
    border: "1px solid #d1d5db",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500"
  }
};