import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Link } from "react-router-dom";

export default function Shop({ user }) {
  const [products, setProducts] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [melding, setMelding] = useState("");

  // 🔹 Haal producten op uit Firestore
  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, "shop"), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // 🔹 Haal gebruikerspunten op
    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserPoints(snap.data().points_total || 0);
    });

    return () => {
      unsubProducts();
      unsubUser();
    };
  }, [user]);

  // 🛒 Product kopen
  async function handlePurchase(product) {
    if (userPoints < product.points) {
      setMelding("❌ Je hebt niet genoeg punten voor dit product.");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const newPoints = userPoints - product.points;

      await updateDoc(userRef, { points_total: newPoints });

      setMelding(`✅ Je hebt "${product.name}" gekocht voor ${product.points} punten!`);
      setTimeout(() => setMelding(""), 4000);
    } catch (err) {
      console.error(err);
      setMelding("❌ Er is een fout opgetreden bij het voltooien van de aankoop.");
    }
  }

  if (loading) return <div style={styles.loading}>⏳ Laden...</div>;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1>🛍️ Shop</h1>
        <div style={styles.pointsBox}>
          <strong>💰 Mijn punten:</strong> {userPoints}
        </div>
        <div style={{ display: "flex", gap: "0.8rem" }}>
          <Link to="/dashboard" style={styles.backBtn}>← Terug</Link>
          <button onClick={() => signOut(auth)} style={styles.logoutBtn}>Uitloggen</button>
        </div>
      </header>

      {melding && <p style={styles.melding}>{melding}</p>}

      <div style={styles.grid}>
        {products.length === 0 ? (
          <p style={{ textAlign: "center", color: "#888", width: "100%" }}>
            Er zijn momenteel geen producten beschikbaar.
          </p>
        ) : (
          products.map((p) => (
            <div key={p.id} style={styles.card}>
              {p.image && (
                <img
                  src={p.image}
                  alt={p.name}
                  style={styles.image}
                />
              )}
              <h3 style={styles.name}>{p.name}</h3>
              <p style={styles.description}>{p.description || "Geen beschrijving beschikbaar."}</p>
              <p style={styles.points}>💸 {p.points} punten</p>
              <button
                onClick={() => handlePurchase(p)}
                style={{
                  ...styles.buyBtn,
                  background: userPoints >= p.points ? "#004aad" : "#ccc",
                  cursor: userPoints >= p.points ? "pointer" : "not-allowed",
                }}
                disabled={userPoints < p.points}
              >
                {userPoints >= p.points ? "Kopen" : "Niet genoeg punten"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 🎨 Fegon UI stijl
const styles = {
  page: {
    fontFamily: "Inter, system-ui, sans-serif",
    background: "#f4f6fb",
    minHeight: "100vh",
    padding: "2rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "2rem",
    background: "#fff",
    padding: "1rem 1.5rem",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  backBtn: {
    background: "transparent",
    color: "#004aad",
    border: "2px solid #004aad",
    borderRadius: 8,
    padding: "0.5rem 1rem",
    textDecoration: "none",
    fontWeight: "bold",
  },
  logoutBtn: {
    background: "#ff4d4f",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0.5rem 1rem",
    cursor: "pointer",
  },
  pointsBox: {
    fontSize: "1.1rem",
    color: "#002f6c",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "1.5rem",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  image: {
    width: "100%",
    height: 160,
    objectFit: "cover",
    borderRadius: 8,
    marginBottom: "1rem",
  },
  name: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    color: "#002f6c",
  },
  description: {
    color: "#555",
    fontSize: "0.9rem",
    margin: "0.5rem 0 1rem",
  },
  points: {
    fontWeight: "bold",
    color: "#004aad",
    marginBottom: "1rem",
  },
  buyBtn: {
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0.8rem",
    fontWeight: "bold",
    transition: "all 0.2s ease",
  },
  melding: {
    textAlign: "center",
    color: "#004aad",
    marginBottom: "1.5rem",
    fontWeight: "600",
  },
  loading: {
    textAlign: "center",
    marginTop: "4rem",
    color: "#004aad",
    fontSize: "1.2rem",
  },
};
