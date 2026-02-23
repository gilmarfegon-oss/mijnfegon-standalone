import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { db, functions } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
// Zorg dat je layout CSS geladen wordt
import "../styles/layout.css"; 

export default function ProfielAanvullen({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "", // ✅ NIEUW: Opgeslagen in Firebase, (nog) niet in Compenda API
    company_name: "",
    kvk: "",
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    phoneNumber: "",
  });

  // --- 1. LOGICA: Data Laden ---
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          // Splits volledige naam uit Register.jsx naar voornaam/achternaam
          if (!data.firstName && data.installer_full_name) {
            const parts = data.installer_full_name.trim().split(/\s+/);
            data.firstName = parts[0] || "";
            data.lastName = parts.slice(1).join(" ") || "";
          }
          // Mapt bedrijfsnaam uit Register.jsx naar company_name
          if (!data.company_name && data.installer_company) {
            data.company_name = data.installer_company;
          }
          setForm(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error("Fout bij laden user data:", err);
      }
    };
    loadData();
  }, [user]);

  // --- 1b. LOGICA: Postcode opzoeken via PDOK ---
  const handleAddressBlur = async () => {
    // Alleen opzoeken als straat + huisnummer bekend zijn maar postcode nog leeg is
    if (!form.street || !form.houseNumber || form.postalCode) return;
    try {
      const q = encodeURIComponent(
        `${form.street} ${form.houseNumber}${form.city ? " " + form.city : ""}`
      );
      const res = await fetch(
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${q}&fq=type:adres&rows=1`
      );
      const data = await res.json();
      const hit = data?.response?.docs?.[0];
      if (hit?.postcode) {
        setForm(prev => ({ ...prev, postalCode: hit.postcode }));
      }
    } catch {
      // Stil falen — gebruiker kan postcode handmatig invullen
    }
  };

  // --- 2. LOGICA: KVK Check ---
  const handleKvkLookup = async () => {
    const cleanKvk = form.kvk.replace(/\s+/g, "");
    if (cleanKvk.length !== 8) return setError("KVK moet 8 cijfers zijn.");

    setSearching(true);
    setError("");
    
    try {
      const functionUrl = `https://europe-west1-mijnfegon.cloudfunctions.net/kvkCheckHttp?kvk=${cleanKvk}`;
      const res = await fetch(functionUrl);
      const result = await res.json();

      if (res.ok && result.ok && result.data.resultaten?.[0]) {
        const bedrijf = result.data.resultaten[0];
        const adr = bedrijf.adres?.binnenlandsAdres || bedrijf.adres?.buitenlandsAdres || {};
        
        setForm(prev => ({
          ...prev,
          company_name: bedrijf.naam || bedrijf.handelsnaam || prev.company_name,
          street: adr.straatnaam || adr.straat || prev.street,
          postalCode: adr.postcode || prev.postalCode,
          houseNumber: adr.huisnummer?.toString() || adr.postbusnummer?.toString() || prev.houseNumber,
          city: adr.plaats || prev.city,
        }));
      } else {
        setError("Bedrijf niet gevonden. Vul uw gegevens handmatig aan.");
      }
    } catch {
      setError("KVK service niet bereikbaar. Vul gegevens handmatig in.");
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // --- 3. LOGICA: Opslaan ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basisvalidatie
    if (form.kvk.length !== 8 || !form.company_name || form.postalCode.length < 6 || !form.houseNumber) {
      setError("Vul alle verplichte velden volledig in.");
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const alreadyCompleted = userSnap.exists() && userSnap.data().profile_completed === true;

      // Save only safe profile fields — never spread the whole form state
      // (form may contain protected Firestore fields loaded during loadData)
      await setDoc(userRef, {
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: form.birthDate,
        company_name: form.company_name,
        kvk: form.kvk,
        street: form.street,
        houseNumber: form.houseNumber,
        postalCode: form.postalCode,
        city: form.city,
        phoneNumber: form.phoneNumber,
        email: user.email,
        profile_completed: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Award 100 welcome points via Cloud Function (idempotent: only runs once)
      if (!alreadyCompleted) {
        const awardWelcomePoints = httpsCallable(functions, "awardWelcomePoints");
        await awardWelcomePoints();
      }

      navigate("/");
    } catch (err) {
      setError("Opslaan mislukt: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. VISUALS ---
  return (
    <div className="page-wrapper">
      <div className="login-content">
        
        <div className="card-profile">
          <h1 style={{ marginBottom: "0.5rem", color: "#111827", textAlign: "center" }}>Profiel Voltooien</h1>
          <p style={{ marginBottom: "2rem", color: "#6b7280", textAlign: "center" }}>
            Vul je gegevens aan en ontvang direct <strong>100 Drops</strong> starttegoed!
          </p>

          <form onSubmit={handleSubmit} className="form">
            
            {/* Rij 1: Voornaam & Achternaam */}
            <div className="form-row">
              <div className="form-col">
                <label className="form-label">Voornaam*</label>
                <input className="input" name="firstName" value={form.firstName} onChange={handleChange} required />
              </div>
              <div className="form-col">
                <label className="form-label">Achternaam*</label>
                <input className="input" name="lastName" value={form.lastName} onChange={handleChange} required />
              </div>
            </div>

            {/* Rij 2: KVK Check */}
            <div style={{ marginBottom: "1rem" }}>
              <label className="form-label">KVK-nummer*</label>
              <div className="kvk-wrapper">
                <input className="input" name="kvk" value={form.kvk} onChange={handleChange} maxLength={8} required placeholder="12345678" />
                <button type="button" onClick={handleKvkLookup} disabled={searching} className="btn btn-secondary" style={{ minWidth: "80px" }}>
                  {searching ? "..." : "Check"}
                </button>
              </div>
            </div>

            <hr style={{ margin: "1.5rem 0", border: 0, borderTop: "1px solid #eee" }} />

            {/* Rij 3: Bedrijfsnaam */}
            <div style={{ marginBottom: "1rem" }}>
              <label className="form-label">Bedrijfsnaam*</label>
              <input className="input" name="company_name" value={form.company_name} onChange={handleChange} required />
            </div>

            {/* Rij 4: Straat & Huisnummer */}
            <div className="form-row">
              <div style={{ flex: 3 }}>
                <label className="form-label">Straat</label>
                <input className="input" name="street" value={form.street} onChange={handleChange} onBlur={handleAddressBlur} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Nr*</label>
                <input className="input" name="houseNumber" value={form.houseNumber} onChange={handleChange} onBlur={handleAddressBlur} required />
              </div>
            </div>

            {/* Rij 5: Postcode & Stad */}
            <div className="form-row">
              <div className="form-col">
                <label className="form-label">Postcode*</label>
                <input className="input" name="postalCode" value={form.postalCode} onChange={handleChange} required placeholder="1234 AB" />
              </div>
              <div className="form-col">
                <label className="form-label">Stad</label>
                <input className="input" name="city" value={form.city} onChange={handleChange} />
              </div>
            </div>

            {/* Rij 6: Telefoon & Geboortedatum (NIEUW) */}
            <div className="form-row">
              <div className="form-col">
                <label className="form-label">Telefoonnummer*</label>
                <input 
                  className="input" 
                  name="phoneNumber" 
                  value={form.phoneNumber} 
                  onChange={handleChange} 
                  required 
                  placeholder="06..." 
                />
              </div>
              <div className="form-col">
                <label className="form-label">Geboortedatum</label>
                <input 
                  type="date"
                  className="input" 
                  name="birthDate" 
                  value={form.birthDate} 
                  onChange={handleChange} 
                  /* Niet required gemaakt omdat het niet in Compenda zit */
                />
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="btn btn--primary" style={{ marginTop: "1rem", width: "100%", padding: "1rem" }}>
              {loading ? "Verwerken..." : "Profiel Opslaan & 100 Drops Claimen"}
            </button>

            {error && <div style={{ color: "#e53935", marginTop: "10px", textAlign: "center", fontSize: "0.9rem" }}>{error}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}

ProfielAanvullen.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};