import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { sendSubmissionConfirmation } from "../services/mailService";

// ─── Module-level constants & helpers ────────────────────────────────────────

const brands = {
  "AquaStar": ["S-500", "800 SHE Plus", "1000 Duo", "1400 SHE Plus", "2000 SHE Plus", "3010 HE", "6010 HE"],
  "DigiSoft": ["DS-500", "DS-900 HE", "DS-1200 HE Plus", "DS-2000 HE Plus", "DS-2820 HE", "DS-5220 HE"],
  "Lavigo": ["GS-1100 HE Plus", "GS-1900 HE Plus"],
  "Kalkfri": ["Kalkfri 750", "Kalkfri 1100", "Kalkfri 1600"],
  "Descale": ["Descale 10", "Descale 15"],
  "Softy": ["Wave"],
  "Talent": ["Talent 100BS", "Talent 100B", "Talent 100M", "Talent 200B", "Talent 200BL", "Magnus (Ontario 2)", "Magnus (Ontario 4)", "Magnus (Ontario 6)"],
  "Anders": ["Anders (handmatig)"],
};

function checkSafety(serial, dateString) {
  const installDate = new Date(dateString);
  const today = new Date();
  if (installDate > today) return { hardError: "Datum mag niet in de toekomst liggen." };

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const warnings = [];
  if (installDate < oneYearAgo) warnings.push("Ouder dan 1 jaar");
  if (serial.length < 5) warnings.push("Serienummer te kort");
  if (!/^[a-zA-Z0-9-]+$/.test(serial)) warnings.push("Vreemde tekens in serienummer");

  return { hardError: null, isSafe: warnings.length === 0, reasons: warnings };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RegistratieFormulier({ user }) {
  const navigate = useNavigate();

  const [installerInfo, setInstallerInfo] = useState({ name: "", company: "" });
  const [form, setForm] = useState({
    // We gebruiken nu direct de Engelse termen voor de API
    gender: "male",
    firstName: "", middleName: "", lastName: "",
    postcode: "", houseNumber: "", houseAddition: "", street: "", city: "",
    mobilePhone: "", landlinePhone: "", email: "",
    brand: "AquaStar", model: "", customModel: "",
    installDate: new Date().toISOString().substring(0, 10),
    serialNumber: "",
    consent: false,
    customerConsent: false,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // 1. Installateur Info
  useEffect(() => {
    if (!user) return;
    async function loadInstaller() {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setInstallerInfo({
            name: data.installer_full_name || data.name || user.displayName || "",
            company: data.installer_company || data.company || "",
          });
        }
      } catch (err) { console.warn(err); }
    }
    loadInstaller();
  }, [user]);

  // 2. PDOK Adres Check
  useEffect(() => {
    const pc = form.postcode.replace(/\s/g, "").toUpperCase();
    if (pc.length === 6 && form.houseNumber) fetchAddress(pc, form.houseNumber);
  }, [form.postcode, form.houseNumber]);

  async function fetchAddress(postcode, number) {
    setAddressLoading(true);
    try {
      const res = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?fq=postcode:${postcode}&fq=huisnummer:${number}`);
      const data = await res.json();
      if (data.response?.docs?.[0]) {
        setForm(prev => ({ ...prev, street: data.response.docs[0].straatnaam, city: data.response.docs[0].woonplaatsnaam }));
      }
    } catch (err) { console.error(err); }
    finally { setAddressLoading(false); }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "brand" ? { model: "", customModel: "" } : {}),
    }));
  }

  function handleQuickDateSelect(e) {
    if (e.target.value) setForm(prev => ({ ...prev, installDate: e.target.value }));
  }

  function validate() {
    if (!form.firstName || !form.lastName) return "Vul naam in.";
    if (!form.postcode || !form.houseNumber) return "Vul adres in.";
    if (!form.email) return "Vul e-mail in.";
    if (!form.serialNumber) return "Vul serienummer in.";
    if (!form.customerConsent) return "Bevestig dat de klant toestemming heeft gegeven.";
    if (!form.consent) return "Akkoord met gegevensverwerking vereist.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const valErr = validate();
    if (valErr) { setError(valErr); setSaving(false); return; }

    const safetyCheck = checkSafety(form.serialNumber, form.installDate);
    if (safetyCheck.hardError) { setError(safetyCheck.hardError); setSaving(false); return; }

    try {
      await addDoc(collection(db, "registrations"), {
        installer_uid: user.uid,
        installer_email: user.email,
        installer_name: installerInfo.name || user.displayName || "Onbekend",
        installer_company: installerInfo.company || "",

        // Klant (Gebruik form direct, want nu sturen we 'male'/'female')
        customer_gender: form.gender, 
        customer_first_name: form.firstName,
        customer_middle_name: form.middleName || null,
        customer_last_name: form.lastName,
        customer_postcode: form.postcode,
        customer_house_number: form.houseNumber, // Formulier stuurt string, backend maakt int
        customer_house_addition: form.houseAddition || null,
        customer_street: form.street,
        customer_city: form.city,
        customer_mobile_phone: form.mobilePhone,
        customer_landline_phone: form.landlinePhone || null,
        customer_email: form.email,

        // Product (Gebruik form direct, keys zijn nu correct 'AquaStar' etc)
        product_brand: form.brand,
        product_model: form.brand === "Anders" ? form.customModel : form.model,
        product_installation_date: form.installDate,
        product_serial_number: form.serialNumber,

        status: "pending",
        // points_awarded and points_claimed are set server-side only (Cloud Function)
        is_safe_to_automate: safetyCheck.isSafe,
        warning_reasons: safetyCheck.reasons,
        // AVG Art. 7 — consent must be specific, informed, recorded with timestamp
        consent_personal_data: form.consent,
        consent_accepted_at: serverTimestamp(),
        consent_privacy_policy_version: "2026-02",
        installer_confirmed_customer_consent: form.customerConsent,
        created_at: serverTimestamp(),
      });

      sendSubmissionConfirmation({
        installer_email: user.email,
        installer_name: installerInfo.name || user.displayName || "",
        product_brand: form.brand,
        product_model: form.brand === "Anders" ? form.customModel : form.model,
        product_serial_number: form.serialNumber,
        product_installation_date: form.installDate,
        customer_first_name: form.firstName,
        customer_middle_name: form.middleName,
        customer_last_name: form.lastName,
      });

      setSuccess(true);
      setTimeout(() => navigate("/"), 3000);

    } catch (err) {
      console.error(err);
      setError("Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <div style={styles.page}>Log in a.u.b.</div>;

  if (success) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: "center", background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0369a1" }}>
          <h1>📨</h1>
          <h2>Ontvangen!</h2>
          <p>We gaan er mee aan de slag.</p>
        </div>
      </div>
    );
  }

  const availableModels = form.brand ? brands[form.brand] || [] : [];
  const quickDates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().substring(0, 10);
  });

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Registratie</h1>
        {installerInfo.name && <p style={{color:"#666", marginBottom:"1rem"}}>Installateur: <strong>{installerInfo.name}</strong></p>}
        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* AANHEF - Nu met 'male'/'female' values voor API */}
          <div style={styles.row}>
            <label style={styles.label}>Aanhef*</label>
            <div>
              <label style={styles.inlineLabel}><input type="radio" name="gender" value="male" checked={form.gender === "male"} onChange={handleChange} /> Man</label>
              <label style={styles.inlineLabel}><input type="radio" name="gender" value="female" checked={form.gender === "female"} onChange={handleChange} /> Vrouw</label>
            </div>
          </div>

          <div style={styles.rowGroup}>
             <div style={styles.row}><label style={styles.label}>Voornaam*</label><input className="input" name="firstName" value={form.firstName} onChange={handleChange} style={styles.input} /></div>
             <div style={styles.row}><label style={styles.label}>Tussenvoegsel</label><input className="input" name="middleName" value={form.middleName} onChange={handleChange} style={styles.input} /></div>
             <div style={styles.row}><label style={styles.label}>Achternaam*</label><input className="input" name="lastName" value={form.lastName} onChange={handleChange} style={styles.input} /></div>
          </div>

          <div style={styles.rowGroup}>
            <div style={styles.row}><label style={styles.label}>Postcode*</label><input className="input" name="postcode" value={form.postcode} onChange={handleChange} style={styles.input} maxLength={7} /></div>
            <div style={styles.row}><label style={styles.label}>Nr*</label><input className="input" name="houseNumber" value={form.houseNumber} onChange={handleChange} style={styles.input} /></div>
            <div style={styles.row}><label style={styles.label}>Toev.</label><input className="input" name="houseAddition" value={form.houseAddition} onChange={handleChange} style={styles.input} /></div>
          </div>
          <div style={styles.row}><label style={styles.label}>Straat* {addressLoading && "..."}</label><input className="input" name="street" value={form.street} onChange={handleChange} style={{...styles.input, background: "#f9f9f9"}} /></div>
          <div style={styles.row}><label style={styles.label}>Woonplaats*</label><input className="input" name="city" value={form.city} onChange={handleChange} style={{...styles.input, background: "#f9f9f9"}} /></div>

          <div style={styles.row}><label style={styles.label}>Mobiel*</label><input type="tel" name="mobilePhone" value={form.mobilePhone} onChange={handleChange} style={styles.input} /></div>
          <div style={styles.row}><label style={styles.label}>E-mail*</label><input type="email" name="email" value={form.email} onChange={handleChange} style={styles.input} /></div>

          <hr style={{margin:"1rem 0", borderTop:"1px solid #eee"}}/>

          <BrandModelSection form={form} onChange={handleChange} availableModels={availableModels} />

          <div style={styles.row}>
            <label style={styles.label}>Datum*</label>
            <input type="date" name="installDate" value={form.installDate} onChange={handleChange} style={styles.input} />
            <select onChange={handleQuickDateSelect} style={{...styles.input, marginTop:5, fontSize:"0.85rem"}} value=""><option value="">Snelkeuze...</option>{quickDates.map(d=><option key={d} value={d}>{d}</option>)}</select>
          </div>

          <div style={styles.row}><label style={styles.label}>Serienummer*</label><input className="input" name="serialNumber" value={form.serialNumber} onChange={handleChange} style={styles.input} /></div>

          <ConsentCheckboxesSection form={form} onChange={handleChange} />

          <button type="submit" style={styles.button} disabled={saving}>{saving ? "Bezig..." : "Versturen"}</button>
        </form>
      </div>
    </div>
  );
}

RegistratieFormulier.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

const styles = {
  page: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f3f4f6", padding: "1rem", fontFamily: "sans-serif" },
  card: { width: "100%", maxWidth: 600, background: "#fff", padding: "2rem", borderRadius: 12, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" },
  form: { display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" },
  row: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  rowGroup: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" },
  label: { fontSize: "0.85rem", fontWeight: 600, color: "#374151" },
  input: { padding: "0.6rem", borderRadius: 6, border: "1px solid #d1d5db", width: "100%", boxSizing: "border-box" },
  button: { padding: "0.75rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" },
  error: { background: "#fee2e2", color: "#991b1b", padding: "0.75rem", borderRadius: 6 },
  inlineLabel: { marginRight: "1rem", fontSize: "0.9rem" },
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

function BrandModelSection({ form, onChange, availableModels }) {
  return (
    <>
      <div style={styles.row}>
        <label style={styles.label}>Merk*</label>
        <select name="brand" value={form.brand} onChange={onChange} style={styles.input}>
          {Object.keys(brands).map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      {form.brand !== "Anders" ? (
        <div style={styles.row}>
          <label style={styles.label}>Model*</label>
          <select name="model" value={form.model} onChange={onChange} style={styles.input}>
            <option value="">Kies...</option>
            {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      ) : (
        <div style={styles.row}>
          <label style={styles.label}>Model (vrij)*</label>
          <input className="input" name="customModel" value={form.customModel} onChange={onChange} style={styles.input} />
        </div>
      )}
    </>
  );
}

BrandModelSection.propTypes = {
  form: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  availableModels: PropTypes.arrayOf(PropTypes.string).isRequired,
};

function ConsentCheckboxesSection({ form, onChange }) {
  return (
    <>
      <div style={{ ...styles.row, marginTop: 10, padding: "0.75rem", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6 }}>
        <label style={{ fontSize: "0.9rem", cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input type="checkbox" name="customerConsent" checked={form.customerConsent} onChange={onChange} style={{ marginTop: 3, flexShrink: 0 }} />
          <span>
            <strong>Toestemming klant:</strong> Ik bevestig dat de klant toestemming heeft gegeven voor verwerking van zijn/haar persoonsgegevens voor productregistratie, garantieverwerking en doorsturen naar het registratiesysteem van Fegon. Ik zal het{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">privacybeleid</a>{" "}
            op verzoek aan de klant ter beschikking stellen.
          </span>
        </label>
      </div>
      <div style={styles.row}>
        <label style={{ fontSize: "0.9rem", cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} style={{ marginTop: 3, flexShrink: 0 }} />
          <span>
            Ik ga akkoord met de{" "}
            <a href="/voorwaarden" target="_blank" rel="noopener noreferrer">algemene voorwaarden</a>{" "}
            en verklaar dat de ingevoerde gegevens correct en volledig zijn.
          </span>
        </label>
      </div>
    </>
  );
}

ConsentCheckboxesSection.propTypes = {
  form: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};