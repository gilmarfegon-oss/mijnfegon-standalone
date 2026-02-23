// src/components/LiveSaldoKnop.jsx
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase"; // Let op: ../firebase (één mapje omhoog)

export default function LiveSaldoKnop({ user }) {
  const [points, setPoints] = useState("...");

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setPoints(docSnap.data().saldo || 0);
      } else {
        setPoints(0);
      }
    });

    return () => unsub();
  }, [user]);

  // Simpele functie om naar de shop te gaan
  const goToShop = () => window.location.href = '/shop';

  return (
    <button
      onClick={goToShop}
      style={{
        backgroundColor: "#007bff",
        color: "white",
        border: "none",
        padding: "10px 20px",
        borderRadius: "4px", // Gewoon strakke hoekjes, zoals waarschijnlijk in je oude design
        fontSize: "1rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px"
      }}
    >
      <span>Mijn Saldo: <strong>{points}</strong></span>
    </button>
  );
}

LiveSaldoKnop.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};