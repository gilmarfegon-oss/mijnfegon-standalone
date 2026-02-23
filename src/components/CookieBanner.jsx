import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.banner}>
        <p style={styles.text}>
          <strong>Cookies & Privacy</strong><br />
          MijnFegon gebruikt functionele sessiecookies voor inloggen via Firebase Authentication.
          Er worden <strong>geen</strong> tracking- of advertentiecookies gebruikt.
          Lees meer in ons{" "}
          <Link to="/privacy" style={styles.link}>privacybeleid</Link>.
        </p>
        <div style={styles.buttons}>
          <button onClick={reject} style={styles.rejectButton}>
            Weigeren
          </button>
          <button onClick={accept} style={styles.button}>
            Accepteren
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    padding: "0 1rem 1rem",
    pointerEvents: "none",
  },
  banner: {
    background: "#1a1a2e",
    color: "#fff",
    borderRadius: 10,
    padding: "1rem 1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap",
    boxShadow: "0 -2px 20px rgba(0,0,0,0.3)",
    pointerEvents: "auto",
    maxWidth: 900,
    margin: "0 auto",
  },
  text: {
    margin: 0,
    fontSize: "0.9rem",
    lineHeight: 1.5,
    flex: 1,
  },
  link: {
    color: "#7eb3ff",
    textDecoration: "underline",
  },
  buttons: {
    display: "flex",
    gap: "0.75rem",
    flexShrink: 0,
    flexWrap: "wrap",
  },
  button: {
    background: "#004aad",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0.6rem 1.4rem",
    fontWeight: "bold",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontSize: "0.95rem",
  },
  rejectButton: {
    background: "transparent",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.5)",
    borderRadius: 8,
    padding: "0.6rem 1.4rem",
    fontWeight: "bold",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontSize: "0.95rem",
  },
};
