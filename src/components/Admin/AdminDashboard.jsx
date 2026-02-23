// src/components/Admin/AdminDashboard.jsx
import { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getCountFromServer,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import AdminLayout from "./AdminLayout";

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRegistrations: 0,
    newUsersThisMonth: 0,
    totalLogins: 0,
    totalDropsVerdiend: 0,
    totalDropsBeschikbaar: 0,
  });

  const [adminData, setAdminData] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  // "verdiend" | "beschikbaar" | null
  const [dropsFilter, setDropsFilter] = useState(null);

  useEffect(() => {
    if (!user) return;
    loadAdminData();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Laad admin informatie (Jouw profiel)
  async function loadAdminData() {
    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setAdminData(snap.data());
      }
    } catch (err) {
      console.error("Fout bij laden admin data:", err);
    }
  }

  // Laad alle statistieken (Live tellingen)
  async function loadStats() {
    try {
      const usersColl = collection(db, "users");
      const usersSnap = await getCountFromServer(usersColl);

      const regsColl = collection(db, "registrations");
      const regsSnap = await getCountFromServer(regsColl);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const newUsersQuery = query(usersColl, where("createdAt", ">=", startOfMonth));
      const newUsersSnap = await getCountFromServer(newUsersQuery);

      const statsRef = doc(db, "stats", "dashboard");
      const statsSnap = await getDoc(statsRef);
      const loginCount = statsSnap.exists() ? statsSnap.data().total_logins : 0;

      // Punten totalen + bewaar gebruikersdata voor drill-down
      const allUsersSnap = await getDocs(usersColl);
      let totalDropsVerdiend = 0;
      let totalDropsBeschikbaar = 0;
      const usersArr = [];
      allUsersSnap.forEach((d) => {
        const data = d.data();
        totalDropsVerdiend += data.points_total || 0;
        totalDropsBeschikbaar += data.saldo || 0;
        usersArr.push({
          uid: d.id,
          name: data.installer_full_name || data.name || data.email || d.id,
          company: data.installer_company || data.company_name || "",
          email: data.email || "",
          points_total: data.points_total || 0,
          saldo: data.saldo || 0,
        });
      });

      setAllUsers(usersArr);
      setStats({
        totalUsers: usersSnap.data().count,
        totalRegistrations: regsSnap.data().count,
        newUsersThisMonth: newUsersSnap.data().count,
        totalLogins: loginCount,
        totalDropsVerdiend,
        totalDropsBeschikbaar,
      });
    } catch (err) {
      console.error("Fout bij laden statistieken:", err);
    }
  }

  // Gefilterde & gesorteerde gebruikerslijst op basis van dropsFilter
  const filteredUsers = useMemo(() => {
    if (!dropsFilter) return [];
    const field = dropsFilter === "verdiend" ? "points_total" : "saldo";
    return [...allUsers]
      .filter((u) => u[field] > 0)
      .sort((a, b) => b[field] - a[field]);
  }, [dropsFilter, allUsers]);

  function toggleFilter(type) {
    setDropsFilter((prev) => (prev === type ? null : type));
  }

  return (
    <AdminLayout user={user}>
      <h1>Dashboard</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Welkom terug in het beheerpaneel. Hier is het actuele overzicht.
      </p>

      {/* Statistieken in tegels */}
      <section className="dashboard-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Gebruikers totaal</h2>
          <p style={styles.cardValue}>{stats.totalUsers}</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Nieuwe gebruikers (Deze maand)</h2>
          <p style={styles.cardValue}>{stats.newUsersThisMonth}</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Registraties totaal</h2>
          <p style={styles.cardValue}>{stats.totalRegistrations}</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Totaal aantal logins</h2>
          <p style={styles.cardValue}>{stats.totalLogins}</p>
        </div>

        {/* Clickable Drops verdiend card */}
        <div
          style={{
            ...styles.card,
            borderLeft: "4px solid #16a34a",
            cursor: "pointer",
            outline: dropsFilter === "verdiend" ? "2px solid #16a34a" : "none",
          }}
          onClick={() => toggleFilter("verdiend")}
          title="Klik om gebruikers te zien"
        >
          <h2 style={styles.cardTitle}>Totaal Drops verdiend</h2>
          <p style={styles.cardValue}>{stats.totalDropsVerdiend.toLocaleString("nl-NL")}</p>
          <p style={styles.cardHint}>
            {dropsFilter === "verdiend" ? "Klik om te sluiten" : "Klik voor detail"}
          </p>
        </div>

        {/* Clickable Drops beschikbaar card */}
        <div
          style={{
            ...styles.card,
            borderLeft: "4px solid #0066ff",
            cursor: "pointer",
            outline: dropsFilter === "beschikbaar" ? "2px solid #0066ff" : "none",
          }}
          onClick={() => toggleFilter("beschikbaar")}
          title="Klik om gebruikers te zien"
        >
          <h2 style={styles.cardTitle}>Totaal Drops beschikbaar</h2>
          <p style={{ ...styles.cardValue, color: "#0066ff" }}>{stats.totalDropsBeschikbaar.toLocaleString("nl-NL")}</p>
          <p style={styles.cardHint}>
            {dropsFilter === "beschikbaar" ? "Klik om te sluiten" : "Klik voor detail"}
          </p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Ingelogde admin</h2>
          {adminData ? (
            <div style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#444" }}>
              <p><strong>Naam:</strong> {adminData.installer_full_name || adminData.name || "Onbekend"}</p>
              <p><strong>Email:</strong> {adminData.email}</p>
              <p><strong>Rol:</strong> {adminData.role || "user"}</p>
            </div>
          ) : (
            <p style={{ fontSize: "0.9rem" }}>Laden...</p>
          )}
        </div>
      </section>

      {/* Drill-down tabel voor Drops */}
      {dropsFilter && (
        <section style={styles.drillDown}>
          <h2 style={styles.drillDownTitle}>
            {dropsFilter === "verdiend"
              ? `Gebruikers met verdiende Drops (${filteredUsers.length})`
              : `Gebruikers met beschikbare Drops (${filteredUsers.length})`}
          </h2>

          {filteredUsers.length === 0 ? (
            <p style={{ color: "#888" }}>Geen gebruikers met Drops gevonden.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Naam</th>
                    <th style={styles.th}>Bedrijf</th>
                    <th style={styles.th}>E-mail</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>
                      {dropsFilter === "verdiend" ? "Verdiend" : "Beschikbaar"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, idx) => (
                    <tr key={u.uid} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}>{u.name}</td>
                      <td style={styles.td}>{u.company || "—"}</td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>
                        {(dropsFilter === "verdiend" ? u.points_total : u.saldo).toLocaleString("nl-NL")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </AdminLayout>
  );
}

AdminDashboard.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

const styles = {
  card: {
    background: "white",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    border: "1px solid #f0f0f0",
  },
  cardTitle: {
    fontSize: "1rem",
    color: "#6b7280",
    marginBottom: "0.5rem",
    fontWeight: 600,
  },
  cardValue: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#111",
  },
  cardHint: {
    fontSize: "0.75rem",
    color: "#9ca3af",
    marginTop: "0.5rem",
  },
  drillDown: {
    marginTop: "2rem",
    background: "white",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    border: "1px solid #f0f0f0",
  },
  drillDownTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    marginBottom: "1rem",
    color: "#111",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },
  th: {
    textAlign: "left",
    padding: "0.6rem 0.75rem",
    borderBottom: "2px solid #e5e7eb",
    color: "#6b7280",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "0.5rem 0.75rem",
    borderBottom: "1px solid #f0f0f0",
    color: "#333",
  },
  rowEven: {
    background: "#fafafa",
  },
  rowOdd: {
    background: "white",
  },
};