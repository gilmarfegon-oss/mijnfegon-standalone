// src/components/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function Dashboard({ user, role }) {
  const [punten, setPunten] = useState(0);
  const [registratiesAantal, setRegistratiesAantal] = useState(0);
  const [inAfwachting, setInAfwachting] = useState(0);
  const [bedrijf, setBedrijf] = useState("");
  const [melding, setMelding] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // ✅ Haal punten + bedrijf uit gebruiker
    const userRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPunten(data.points_total || 0);
          setBedrijf(data.company || "Onbekend bedrijf");
        }
      },
      (error) => {
    console.error("Dashboard user onSnapshot error:", error.code, error.message);
  }
);

    // ✅ Tellen totaal aantal registraties
    async function telRegistraties() {
      try {
        const q = query(
          collection(db, "registrations"),
          where("installer_uid", "==", user.uid)
        );
        const snapshot = await getCountFromServer(q);
        setRegistratiesAantal(snapshot.data().count);
      } catch (err) {
        console.warn("Registraties tellen mislukt:", err);
      }
    }

    // ✅ Tellen in afwachting
    async function telInAfwachting() {
      try {
        const q = query(
          collection(db, "registrations"),
          where("installer_uid", "==", user.uid),
          where("status", "==", "pending")
        );
        const snapshot = await getCountFromServer(q);
        setInAfwachting(snapshot.data().count);
      } catch (err) {
        console.warn("In afwachting tellen mislukt:", err);
      }
    }

    telRegistraties();
    telInAfwachting();

    return () => {
      unsubUser();
    };
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.titel}>
              Welkom terug, {user.displayName || user.email} 👋
            </h1>
            <p style={styles.subtitel}>
              Laatste inlog: {new Date().toLocaleString()}
            </p>
          </div>

          <button onClick={handleLogout} style={styles.logoutBtn}>
            Uitloggen
          </button>
        </header>

        <section style={styles.cards}>
          <div style={styles.card}>
            <h2>💰 Beschikbare punten</h2>
            <p style={styles.bigText}>{punten}</p>
          </div>

          <div style={styles.card}>
            <h2>🔧 Registraties totaal</h2>
            <p style={styles.bigText}>{registratiesAantal}</p>
          </div>

          <div style={styles.card}>
            <h2>⏳ In afwachting</h2>
            <p style={styles.bigText}>{inAfwachting}</p>
          </div>

          <div style={styles.card}>
            <h2>🏢 Bedrijf</h2>
            <p>{bedrijf}</p>
          </div>
        </section>

        <section style={styles.actions}>
          <Link to="/registratie" style={styles.button}>
            ➕ Nieuw apparaat registreren
          </Link>
          <Link to="/shop" style={styles.buttonOutline}>
            🛍️ Naar shop
          </Link>
          <Link to="/instellingen" style={styles.buttonOutline}>
            ⚙️ Instellingen
          </Link>
          {role === "admin" && (
            <Link to="/admin" style={styles.adminBtn}>
              👑 Adminpaneel
            </Link>
          )}
        </section>

        {melding && <p style={styles.melding}>{melding}</p>}
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Inter, system-ui, sans-serif",
    background: "linear-gradient(180deg, #f7f9fc 0%, #eef3fb 100%)",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: "2rem",
  },
  container: {
    width: "100%",
    maxWidth: "1100px",
    background: "white",
    borderRadius: "20px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    padding: "2.5rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fdfdfd",
    padding: "1.5rem 2rem",
    borderRadius: "14px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    marginBottom: "2rem",
  },
  titel: {
    margin: 0,
    fontSize: "1.8rem",
    color: "#003366",
    fontWeight: 700,
  },
  subtitel: {
    margin: 0,
    color: "#666",
    fontSize: "0.9rem",
  },
  logoutBtn: {
    background: "#e53935",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0.7rem 1.4rem",
    cursor: "pointer",
    fontWeight: "bold",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: "1.6rem",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  bigText: {
    fontSize: "2.2rem",
    fontWeight: 700,
    color: "#004aad",
    marginTop: "0.6rem",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "1rem",
  },
  button: {
    background: "#004aad",
    color: "#fff",
    borderRadius: 8,
    padding: "0.9rem 1.6rem",
    textDecoration: "none",
    fontWeight: 600,
  },
  buttonOutline: {
    border: "2px solid #004aad",
    color: "#004aad",
    borderRadius: 8,
    padding: "0.9rem 1.6rem",
    textDecoration: "none",
    fontWeight: 600,
    background: "transparent",
  },
  adminBtn: {
    background: "#ff9800",
    color: "#fff",
    borderRadius: 8,
    padding: "0.9rem 1.6rem",
    textDecoration: "none",
    fontWeight: 600,
  },
  melding: {
    marginTop: "1.5rem",
    textAlign: "center",
    color: "#004aad",
  },
};
