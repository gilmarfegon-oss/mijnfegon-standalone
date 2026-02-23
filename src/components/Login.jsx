// src/components/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db, functions } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

// Zorg dat layout.css geladen wordt
import '../styles/layout.css'; 

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [melding, setMelding] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const provider = new GoogleAuthProvider();

  // --- LOGICA ---

  async function upsertUserDoc(user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      await updateDoc(userRef, { last_login: serverTimestamp() });
    } else {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        installer_full_name: user.displayName || "",
        role: "user",
        createdAt: serverTimestamp(),
        last_login: serverTimestamp(),
        points_total: 0,
        points_pending: 0,
        company: "",
        profile_completed: false,
      });
    }

    const statsRef = doc(db, "stats", "dashboard");
    await setDoc(statsRef, { total_logins: increment(1) }, { merge: true });
  }

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      await upsertUserDoc(result.user);
      navigate("/");
    } catch (err) {
      console.error(err);
      setMelding("Inloggen met Google mislukt.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMelding("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, pw);
      await upsertUserDoc(result.user);
      navigate("/");
    } catch (err) {
      console.error(err);
      setMelding("E-mail of wachtwoord onjuist.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ VERBETERDE WACHTWOORD RESET FUNCTIE
  async function handleForgotPw() {
    if (!email) {
      setMelding("Vul eerst je e-mailadres in het veld in.");
      return;
    }

    setLoading(true);
    try {
      await httpsCallable(functions, "sendPasswordResetLink")({ email });
      setMelding("✅ Instructies verzonden! Check ook je spam-folder.");
    } catch (err) {
      console.error("Wachtwoord reset fout:", err);
      setMelding("Kon reset-mail niet versturen. Probeer het later opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-wrapper">
      
      {/* Header met logo's */}
      <nav className="nav-header">
        <div className="logo-group">
          <img src="/logo-fegon.png" alt="Fegon" className="logo-img" />
          <span className="logo-divider">|</span>
          <img src="/logo-mijnfegon.png" alt="MijnFegon" className="logo-img" />
        </div>
      </nav>

      {/* Container met achtergrondafbeelding */}
      <div className="login-content">
        
        {/* Witte Login Kaart */}
        <div className="card-login">
          <h2 style={{ textAlign: "center", marginBottom: "1.5rem", color: "#333" }}>Welkom bij MijnFegon</h2>

          {melding && (
            <div className={`alert ${melding.includes("✅") ? "alert--success" : "alert--error"}`} 
                 style={{ 
                   background: melding.includes("✅") ? "#dcfce7" : "#fee2e2",
                   color: melding.includes("✅") ? "#166534" : "#991b1b",
                   padding: "10px",
                   borderRadius: "8px",
                   marginBottom: "1rem",
                   fontSize: "0.9rem"
                 }}>
              {melding}
            </div>
          )}

          <button onClick={handleGoogleLogin} className="btn-google" disabled={loading}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{width: 18, height: 18}}/>
            Inloggen met Google
          </button>

          <div className="login-separator">— of —</div>

          <form onSubmit={handleEmailLogin} className="form">
            <input
              className="input"
              placeholder="E-mailadres"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="input"
              placeholder="Wachtwoord"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />

            <button className="btn btn--primary" style={{ width: "100%", marginTop: '10px' }} disabled={loading}>
              {loading ? "Laden..." : "Inloggen"}
            </button>
          </form>

          <p style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" }}>
            <span 
              onClick={handleForgotPw} 
              style={{ color: "#0066ff", cursor: "pointer", textDecoration: "underline" }}
            >
              Wachtwoord vergeten?
            </span>
          </p>

          <p style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem", color: "#666" }}>
            Nog geen account? <Link to="/register" style={{color: "#0066ff", fontWeight: "bold", textDecoration: "none"}}>Registreer hier</Link>
          </p>
        </div>
      </div>
    </div>
  );
}