// src/components/Admin/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getCountFromServer,
  doc,
  getDoc,
} from "firebase/firestore";
import AdminMenu from "./AdminMenu";
import { indexAllUsers } from "../../adminTools/indexUsers";

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRegistrations: 0,
    newUsersThisMonth: 0,
    totalLogins: 0,
  });

  const [adminData, setAdminData] = useState(null);

  useEffect(() => {
    loadStats();
    loadAdminData();
  }, []);

  // ✅ Laad admin informatie
  async function loadAdminData() {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setAdminData(snap.data());
    }
  }

  // ✅ Laad alle statistieken
  async function loadStats() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const qUsers = collection(db, "users");
    const countUsers = await getCountFromServer(qUsers);

    const qNewUsers = query(
      collection(db, "users"),
      where("createdAt", ">=", firstDay)
    );
    const countNewUsers = await getCountFromServer(qNewUsers);

    const qRegs = collection(db, "registrations");
    const countRegs = await getCountFromServer(qRegs);

    const qLogins = collection(db, "logs_login");
    const countLogins = await getCountFromServer(qLogins);

    setStats({
      totalUsers: countUsers.data().count,
      newUsersThisMonth: countNewUsers.data().count,
      totalRegistrations: countRegs.data().count,
      totalLogins: countLogins.data().count,
    });
  }

  return (
    <div className="admin-layout">
      <AdminMenu />

      <div className="admin-content">
        <h1 className="admin-title">👑 Admin Dashboard</h1>

        {/* ✅ De knop staat nu netjes op de juiste plek */}
        <button
          onClick={indexAllUsers}
          style={{
            padding: "0.7rem 1.2rem",
            background: "#0055ff",
            color: "white",
            cursor: "pointer",
            borderRadius: 6,
            border: "none",
            marginBottom: "1.5rem",
            fontWeight: "bold",
          }}
        >
          🔄 Gebruikers opnieuw indexeren
        </button>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>👥 Gebruikers totaal</h3>
            <p>{stats.totalUsers}</p>
          </div>

          <div className="stat-card">
            <h3>🆕 Nieuwe aanmeldingen (deze maand)</h3>
            <p>{stats.newUsersThisMonth}</p>
          </div>

          <div className="stat-card">
            <h3>📄 Registraties totaal</h3>
            <p>{stats.totalRegistrations}</p>
          </div>

          <div className="stat-card">
            <h3>🔑 Totaal aantal logins</h3>
            <p>{stats.totalLogins}</p>
          </div>

          <div className="stat-card">
            <h3>👤 Ingelogde admin</h3>
            {adminData ? (
              <div>
                <p><strong>Naam:</strong> {adminData.name || "Onbekend"}</p>
                <p><strong>Email:</strong> {adminData.email}</p>
                <p><strong>Rol:</strong> {adminData.role}</p>
              </div>
            ) : (
              <p>Data laden...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
