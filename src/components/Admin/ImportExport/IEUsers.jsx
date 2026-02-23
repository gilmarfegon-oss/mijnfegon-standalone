// src/components/Admin/ImportExport/IEUsers.jsx
import { useState } from "react";
import Papa from "papaparse"; // Zorg dat je deze hebt: npm install papaparse
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase"; // Pas pad aan indien nodig

export default function IEUsers() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // ==============================================================
  // HET GOUDEN DATAMODEL (Mapping Logica)
  // ==============================================================
  const mapImportRowToFirebaseUser = (row) => {
    // 1. Probeer diverse kolomnamen voor Bedrijfsnaam
    // Dit vangt variaties op in je Excel/CSV bestand
    const rawCompany = 
        row["Bedrijfsnaam"] || row["bedrijfsnaam"] || 
        row["Bedrijf"] || row["Company"] || 
        row["company_name"] || "";

    // 2. Naamgegevens
    const firstName = row["Voornaam"] || row["Firstname"] || row["firstName"] || "";
    const lastName = row["Achternaam"] || row["Lastname"] || row["lastName"] || "";
    const email = row["Email"] || row["E-mail"] || row["email"] || "";

    // 3. De cruciale check: Hebben we een bedrijfsnaam?
    // Zo niet -> Maak hem van de persoonsnaam.
    // Dit voorkomt "Naamloze Installateur" in Compenda.
    let finalCompanyName = rawCompany.trim();
    if (!finalCompanyName && (firstName || lastName)) {
        finalCompanyName = `${firstName} ${lastName}`.trim();
    }
    if (!finalCompanyName) {
        finalCompanyName = "Onbekend Bedrijf"; 
    }

    // 4. Adresgegevens schoonmaken
    const street = row["Straat"] || row["Adres"] || row["Street"] || "";
    const houseNumber = row["Huisnummer"] || row["Nr"] || row["Nummer"] || "";
    const postalCode = row["Postcode"] || row["PC"] || row["Zip"] || "";
    const city = row["Plaats"] || row["Stad"] || row["City"] || "";

    // 5. Het Object voor Firebase
    return {
        // ID (We gebruiken email als fallback ID als er geen UID in de csv zit)
        uid: row["uid"] || email, 
        email: email,

        // Onze gestandaardiseerde velden
        company_name: finalCompanyName, 
        firstName: firstName,
        lastName: lastName,
        
        street: street,
        houseNumber: houseNumber.toString(),
        houseNumberSuffix: row["Toevoeging"] || "",
        postalCode: postalCode,
        city: city,
        country: "NL", // Default naar NL voor import

        // Extra's
        phoneNumber: row["Telefoon"] || row["Tel"] || "",
        role: "user", // Standaard role voor alle gebruikers
        createdAt: serverTimestamp(),
        
        // Zorg dat compenda velden leeg beginnen zodat de sync ze oppikt
        compenda_id: null 
    };
  };

  // ==============================================================
  // IMPORT PROCES
  // ==============================================================
  const handleImport = () => {
    if (!file) return alert("Kies eerst een CSV bestand");
    setLoading(true);
    setLogs([]);

    Papa.parse(file, {
      header: true, // Gebruikt de eerste rij als kolomnamen
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const newLogs = [];
        let successCount = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const userData = mapImportRowToFirebaseUser(row);

          // Validatie: Email is verplicht als ID
          if (!userData.email) {
            newLogs.push(`❌ Rij ${i + 1}: Geen email gevonden, overgeslagen.`);
            continue;
          }

          try {
            // We gebruiken setDoc met {merge: true} zodat we bestaande users updaten
            // We gebruiken de email als doc ID als er geen UID is, of 'users/email'
            // LET OP: Firebase Auth users aanmaken kan niet via Client SDK import. 
            // Dit maakt alleen het database document aan.
            
            await setDoc(doc(db, "users", userData.uid || userData.email), userData, { merge: true });
            successCount++;
          } catch (error) {
            console.error(error);
            newLogs.push(`❌ Fout bij ${userData.email}: ${error.message}`);
          }
        }

        newLogs.push(`✅ Klaar! ${successCount} gebruikers geïmporteerd/geüpdatet.`);
        setLogs(newLogs);
        setLoading(false);
      },
      error: (err) => {
        setLogs([`❌ CSV Fout: ${err.message}`]);
        setLoading(false);
      }
    });
  };

  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
      <h3>👥 Gebruikers Importeren</h3>
      <p style={{ fontSize: "0.9em", color: "#666", marginBottom: "15px" }}>
        Upload een CSV bestand. Zorg voor kolommen als: <em>Bedrijfsnaam, Voornaam, Achternaam, Email, Straat, Huisnummer, Postcode, Plaats.</em>
        <br/>
        <strong>Let op:</strong> Dit werkt database documenten bij. Als het account nog niet bestaat in Auth, kunnen ze nog niet inloggen (tenzij ze zich registreren met dit emailadres).
      </p>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input 
          type="file" 
          accept=".csv" 
          onChange={(e) => setFile(e.target.files[0])}
          style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
        />
        <button 
          onClick={handleImport} 
          disabled={loading}
          style={{ 
            background: loading ? "#ccc" : "#007bff", 
            color: "white", 
            border: "none", 
            padding: "10px 20px", 
            borderRadius: "4px",
            cursor: loading ? "wait" : "pointer"
          }}
        >
          {loading ? "Bezig..." : "Start Import"}
        </button>
      </div>

      {/* LOGBOEK */}
      {logs.length > 0 && (
        <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "4px", maxHeight: "200px", overflowY: "auto", border: "1px solid #eee" }}>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: "5px", fontSize: "0.9em", color: log.includes("❌") ? "red" : "green" }}>
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}