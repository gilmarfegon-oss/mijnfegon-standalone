import React, { useState } from "react";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function RegistratieFormulier({ user }) {
  const [form, setForm] = useState({
    brand: "",
    model: "",
    serial: "",
    customer_name: "",
    customer_address: "",
    customer_postal: "",
    customer_city: "",
    customer_email: "",
  });
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const brands = {
    Aquastar: ["S-500", "800 SHE Plus", "1000 Duo", "1400 SHE Plus", "2000 SHE Plus", "3010 HE", "6010 HE"],
    Digisofter: ["DS-500", "DS-900 HE", "DS-1200 HE Plus", "DS-2000 HE Plus", "DS-2820 HE", "DS-5220 HE"],
    Lavigo: ["GS-1100 HE Plus", "GS-1900 HE Plus"],
    Kalkfri: ["Kalkfri 750", "Kalkfri 1100", "Kalkfri 1600"],
    Descale: ["Descale 10", "Descale 15"],
    Softy: ["Wave"],
    Talent: ["Talent 100BS", "Talent 100B", "Talent 100M", "Talent 200B", "Talent 200BL"],
    Anders: ["Anders (handmatig)"],
  };

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setOk(""); setErr("");

    try {
      await addDoc(collection(db, "registrations"), {
        installer_uid: user.uid,
        installer_email: user.email,
        ...form,
        status: "pending",
        points: 50,
        createdAt: serverTimestamp(),
      });

      setOk("✅ Registratie opgeslagen. Wacht op beoordeling door admin.");
      setForm({
        brand: "", model: "", serial: "",
        customer_name: "", customer_address: "",
        customer_postal: "", customer_city: "",
        customer_email: "",
      });
    } catch (e) {
      setErr("❌ Opslaan mislukt: " + e.message);
    }
  }

  return (
    <div style={styles.wrap}>
      <h1>🧾 Nieuw apparaat registreren</h1>
      <form onSubmit={onSubmit} style={styles.form}>
        <label>Merk</label>
        <select name="brand" value={form.brand} onChange={(e)=>{ setForm((p)=>({ ...p, brand: e.target.value, model: "" })); }} required>
          <option value="">Kies merk</option>
          {Object.keys(brands).map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        {form.brand && (
          <>
            <label>Type</label>
            <select name="model" value={form.model} onChange={onChange} required>
              <option value="">Kies type</option>
              {brands[form.brand].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </>
        )}

        <label>Serienummer</label>
        <input name="serial" value={form.serial} onChange={onChange} required placeholder="Bijv. AS123456" />

        <h3>Eindklant</h3>
        <input name="customer_name" value={form.customer_name} onChange={onChange} placeholder="Naam" required />
        <input name="customer_address" value={form.customer_address} onChange={onChange} placeholder="Adres" required />
        <input name="customer_postal" value={form.customer_postal} onChange={onChange} placeholder="Postcode" required />
        <input name="customer_city" value={form.customer_city} onChange={onChange} placeholder="Plaats" required />
        <input name="customer_email" type="email" value={form.customer_email} onChange={onChange} placeholder="E-mail (optioneel)" />

        <button style={styles.btn}>➕ Registreren</button>
      </form>

      {ok && <p style={{ color: "#0a7", marginTop: 12 }}>{ok}</p>}
      {err && <p style={{ color: "#d33", marginTop: 12 }}>{err}</p>}
    </div>
  );
}

const styles = {
  wrap: {
    maxWidth: 640,
    margin: "2rem auto",
    background: "#fff",
    padding: "1.5rem",
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,.07)",
    fontFamily: "system-ui, sans-serif",
  },
  form: { display: "grid", gap: "0.6rem" },
  btn: {
    marginTop: "0.6rem",
    background: "#004aad",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0.8rem 1.2rem",
    cursor: "pointer",
    fontWeight: 600,
  },
};
