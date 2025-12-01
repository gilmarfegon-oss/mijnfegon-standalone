import React from "react";
import { Link } from "react-router-dom";

export default function AdminProducten() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <h1 style={styles.title}>📦 Productbeheer</h1>

        <p style={styles.text}>
          De productbeheer-module wordt momenteel vernieuwd.
          Binnenkort kun je hier producten toevoegen, bewerken en verwijderen.
        </p>

        <p style={styles.subtext}>
          Voor nu kun je verder werken aan andere adminfuncties.
        </p>

        <div style={{ marginTop: "2rem" }}>
          <Link to="/admin" style={styles.button}>
            ← Terug naar Admin Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "2rem",
    display: "flex",
    justifyContent: "center",
    background: "linear-gradient(180deg,#f4f6fb,#e0e7ff)",
    minHeight: "100vh",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  container: {
    background: "white",
    padding: "2.5rem",
    borderRadius: 20,
    width: "100%",
    maxWidth: 800,
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "1rem",
    color: "#003366",
    fontWeight: "700",
  },
  text: {
    fontSize: "1.1rem",
    marginBottom: "0.5rem",
    color: "#444",
  },
  subtext: {
    color: "#777",
    fontSize: "0.9rem",
  },
  button: {
    background: "#004aad",
    color: "white",
    textDecoration: "none",
    padding: "0.8rem 1.2rem",
    borderRadius: 8,
    fontWeight: 600,
  },
};
