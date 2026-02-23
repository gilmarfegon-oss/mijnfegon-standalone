import { useState } from "react";
import PropTypes from "prop-types";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { signOut } from "firebase/auth";
import { db, functions, auth } from "../firebase";
import { useInstallerProfile } from "../hooks/useInstallerProfile";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Instellingen({ user }) {
  const { loading, form, saving, melding, handleChange, handleSubmit } = useInstallerProfile(user);

  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [kvkSearching, setKvkSearching] = useState(false);
  const [kvkError, setKvkError] = useState("");

  async function handleKvkLookup() {
    const cleanKvk = (form.installer_kvk || "").replace(/\s+/g, "");
    if (cleanKvk.length !== 8) {
      setKvkError("KVK moet 8 cijfers zijn.");
      return;
    }

    setKvkSearching(true);
    setKvkError("");

    try {
      const functionUrl = `https://europe-west1-mijnfegon.cloudfunctions.net/kvkCheckHttp?kvk=${cleanKvk}`;
      const res = await fetch(functionUrl);
      const result = await res.json();

      if (res.ok && result.ok && result.data.resultaten?.[0]) {
        const bedrijf = result.data.resultaten[0];
        const adr = bedrijf.adres?.binnenlandsAdres || bedrijf.adres?.buitenlandsAdres || {};

        // Auto-fill bedrijfsnaam en adres vanuit KVK
        const fakeEvent = (name, value) => ({ target: { name, value } });
        if (bedrijf.naam || bedrijf.handelsnaam) {
          handleChange(fakeEvent("installer_company", bedrijf.naam || bedrijf.handelsnaam));
        }
        const parts = [
          adr.straatnaam || adr.straat || "",
          adr.huisnummer?.toString() || "",
          adr.postcode || "",
          adr.plaats || "",
        ].filter(Boolean);
        if (parts.length > 0) {
          handleChange(fakeEvent("installer_address", parts.join(", ")));
        }
      } else {
        setKvkError("Bedrijf niet gevonden. Controleer het KVK-nummer.");
      }
    } catch {
      setKvkError("KVK service niet bereikbaar. Probeer het later opnieuw.");
    } finally {
      setKvkSearching(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      const regSnap = await getDocs(
        query(collection(db, "registrations"), where("installer_uid", "==", user.uid))
      );
      const registrations = regSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const blob = new Blob(
        [JSON.stringify({ export_date: new Date().toISOString(), profile, registrations }, null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mijnfegon-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export mislukt:", err);
      alert("Export mislukt. Probeer het opnieuw.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "VERWIJDEREN") {
      setDeleteError("Typ 'VERWIJDEREN' om te bevestigen.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await httpsCallable(functions, "deleteUserAccount")();
      await signOut(auth);
    } catch (err) {
      console.error("Account verwijderen mislukt:", err);
      setDeleteError(
        "Er is een fout opgetreden bij het verwijderen. Probeer het opnieuw of neem contact op met support."
      );
      setDeleting(false);
    }
  }

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p>Je moet ingelogd zijn om je instellingen te bekijken.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}><p>Gegevens laden...</p></div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Mijn gegevens</h1>
        {melding && <p style={styles.alert}>{melding}</p>}

        <ProfileFormSection
          form={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          saving={saving}
          kvkSearching={kvkSearching}
          kvkError={kvkError}
          onKvkLookup={handleKvkLookup}
        />

        <DataExportSection exporting={exporting} onExport={handleExport} />

        <AccountDeletionSection
          showDeleteSection={showDeleteSection}
          setShowDeleteSection={setShowDeleteSection}
          deleteConfirm={deleteConfirm}
          setDeleteConfirm={setDeleteConfirm}
          deleting={deleting}
          deleteError={deleteError}
          onDelete={handleDeleteAccount}
        />
      </div>
    </div>
  );
}

Instellingen.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ProfileFormSection({ form, onChange, onSubmit, saving, kvkSearching, kvkError, onKvkLookup }) {
  return (
    <form onSubmit={onSubmit} style={styles.form}>
      <label>Volledige naam*</label>
      <input type="text" name="installer_full_name" value={form.installer_full_name} onChange={onChange} style={styles.input} required />

      <label>KvK-nummer*</label>
      <div style={styles.kvkRow}>
        <input
          type="text"
          name="installer_kvk"
          value={form.installer_kvk}
          onChange={onChange}
          style={{ ...styles.input, marginBottom: 0, flex: 1 }}
          maxLength={8}
          placeholder="12345678"
          required
        />
        <button type="button" onClick={onKvkLookup} disabled={kvkSearching} style={styles.kvkButton}>
          {kvkSearching ? "..." : "Check"}
        </button>
      </div>
      {kvkError && <p style={styles.kvkError}>{kvkError}</p>}

      <label>Bedrijfsnaam*</label>
      <input type="text" name="installer_company" value={form.installer_company} onChange={onChange} style={styles.input} required />

      <label>Telefoonnummer*</label>
      <input type="text" name="installer_phone" value={form.installer_phone} onChange={onChange} style={styles.input} placeholder="06..." required />

      <label>Adres*</label>
      <input type="text" name="installer_address" value={form.installer_address} onChange={onChange} style={styles.input} placeholder="Straat 1, 1234 AB Plaats" required />

      <label>Geboortedatum (voor verjaardagspunten)</label>
      <input type="date" name="date_of_birth" value={form.date_of_birth || ""} onChange={onChange} style={styles.input} />

      <button type="submit" style={styles.button} disabled={saving}>
        {saving ? "Opslaan..." : "Gegevens opslaan"}
      </button>
    </form>
  );
}

ProfileFormSection.propTypes = {
  form: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  kvkSearching: PropTypes.bool.isRequired,
  kvkError: PropTypes.string.isRequired,
  onKvkLookup: PropTypes.func.isRequired,
};

function DataExportSection({ exporting, onExport }) {
  return (
    <div style={styles.gdprSection}>
      <h2 style={styles.gdprTitle}>Mijn gegevens downloaden</h2>
      <p style={styles.gdprText}>
        Download een overzicht van alle persoonsgegevens die wij van u bewaren
        (AVG artikel 20 — recht op dataportabiliteit).
      </p>
      <button onClick={onExport} disabled={exporting} style={styles.exportButton}>
        {exporting ? "Exporteren..." : "Download mijn gegevens (JSON)"}
      </button>
    </div>
  );
}

DataExportSection.propTypes = {
  exporting: PropTypes.bool.isRequired,
  onExport: PropTypes.func.isRequired,
};

function AccountDeletionSection({
  showDeleteSection,
  setShowDeleteSection,
  deleteConfirm,
  setDeleteConfirm,
  deleting,
  deleteError,
  onDelete,
}) {
  return (
    <div style={styles.dangerSection}>
      <h2 style={styles.dangerTitle}>Account verwijderen</h2>
      <p style={styles.gdprText}>
        U heeft het recht om uw account en alle bijbehorende persoonsgegevens te laten
        verwijderen (AVG artikel 17 — recht op vergetelheid). Productregistraties worden
        geanonimiseerd bewaard voor garantiedoeleinden.
      </p>

      {!showDeleteSection ? (
        <button onClick={() => setShowDeleteSection(true)} style={styles.dangerButton}>
          Verwijder mijn account
        </button>
      ) : (
        <div style={styles.deleteConfirmBox}>
          <p style={styles.deleteWarning}>
            ⚠️ <strong>Dit is onomkeerbaar.</strong> Uw account, profiel en
            persoonsgegevens worden permanent verwijderd. U wordt uitgelogd.
          </p>
          <label style={{ fontSize: "0.9rem" }}>
            Typ <strong>VERWIJDEREN</strong> om te bevestigen:
          </label>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            style={{ ...styles.input, marginTop: "0.5rem" }}
            placeholder="VERWIJDEREN"
          />
          {deleteError && (
            <p style={{ color: "#b00000", fontSize: "0.88rem", margin: "0.4rem 0 0" }}>
              {deleteError}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button onClick={onDelete} disabled={deleting} style={styles.dangerButtonConfirm}>
              {deleting ? "Verwijderen..." : "Definitief verwijderen"}
            </button>
            <button
              onClick={() => {
                setShowDeleteSection(false);
                setDeleteConfirm("");
              }}
              style={styles.cancelButton}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

AccountDeletionSection.propTypes = {
  showDeleteSection: PropTypes.bool.isRequired,
  setShowDeleteSection: PropTypes.func.isRequired,
  deleteConfirm: PropTypes.string.isRequired,
  setDeleteConfirm: PropTypes.func.isRequired,
  deleting: PropTypes.bool.isRequired,
  deleteError: PropTypes.string.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    background: "linear-gradient(180deg,#eef2ff,#dbe4ff)",
    padding: "2rem 1rem",
  },
  card: {
    width: "100%",
    maxWidth: 500,
    background: "white",
    padding: "2rem",
    borderRadius: 14,
    boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
  },
  form: { display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "1rem" },
  kvkRow: { display: "flex", gap: "0.5rem", alignItems: "center" },
  kvkButton: {
    padding: "0.8rem 1.2rem",
    borderRadius: 8,
    background: "#004aad",
    color: "#fff",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.9rem",
    whiteSpace: "nowrap",
  },
  kvkError: { color: "#c0392b", fontSize: "0.85rem", margin: "0.2rem 0 0" },
  input: {
    width: "100%",
    padding: "0.8rem",
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: "1rem",
    boxSizing: "border-box",
  },
  button: {
    marginTop: "1rem",
    padding: "0.9rem",
    borderRadius: 8,
    background: "#004aad",
    color: "#fff",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
  },
  alert: {
    background: "#ffeded",
    padding: "0.8rem",
    borderRadius: 8,
    border: "1px solid #ffb0b0",
    color: "#b00000",
    marginBottom: "1rem",
  },
  gdprSection: { marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid #eee" },
  gdprTitle: { fontSize: "1rem", color: "#004aad", marginBottom: "0.4rem" },
  gdprText: { fontSize: "0.88rem", color: "#555", lineHeight: 1.6, marginBottom: "0.8rem" },
  exportButton: {
    padding: "0.7rem 1.2rem",
    borderRadius: 8,
    background: "#004aad",
    color: "#fff",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  dangerSection: { marginTop: "2rem", paddingTop: "1.5rem", borderTop: "2px solid #ffe0e0" },
  dangerTitle: { fontSize: "1rem", color: "#c0392b", marginBottom: "0.4rem" },
  dangerButton: {
    padding: "0.7rem 1.2rem",
    borderRadius: 8,
    background: "#fff",
    color: "#c0392b",
    border: "2px solid #c0392b",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  dangerButtonConfirm: {
    padding: "0.7rem 1.2rem",
    borderRadius: 8,
    background: "#c0392b",
    color: "#fff",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  cancelButton: {
    padding: "0.7rem 1.2rem",
    borderRadius: 8,
    background: "#eee",
    color: "#333",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  deleteConfirmBox: {
    background: "#fff5f5",
    border: "1px solid #ffcccc",
    borderRadius: 8,
    padding: "1rem",
    marginTop: "0.75rem",
  },
  deleteWarning: { color: "#c0392b", fontSize: "0.9rem", marginBottom: "0.75rem", lineHeight: 1.5 },
};
