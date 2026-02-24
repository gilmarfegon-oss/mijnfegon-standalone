// src/components/Admin/ImportExport/IEUsers.jsx
import { useState, useRef } from "react";
import PropTypes from "prop-types";
import Papa from "papaparse";
import { collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { logAdminAction } from "../../../adminTools/logAdminAction";

// ─── Column mapping (flexibel voor diverse CSV varianten) ────────────────────

function mapRow(row) {
  const rawCompany =
    row["Bedrijfsnaam"] || row["bedrijfsnaam"] || row["Bedrijf"] ||
    row["Company"] || row["company_name"] || row["company"] || "";

  const firstName = row["Voornaam"] || row["Firstname"] || row["firstName"] || row["first_name"] || "";
  const lastName = row["Achternaam"] || row["Lastname"] || row["lastName"] || row["last_name"] || "";
  const email = (row["Email"] || row["E-mail"] || row["email"] || row["e-mail"] || "").trim().toLowerCase();

  let company = rawCompany.trim();
  if (!company && (firstName || lastName)) company = `${firstName} ${lastName}`.trim();
  if (!company) company = "Onbekend Bedrijf";

  return {
    uid: row["uid"] || email,
    email,
    company_name: company,
    firstName,
    lastName,
    street: row["Straat"] || row["Adres"] || row["Street"] || row["street"] || "",
    houseNumber: String(row["Huisnummer"] || row["Nr"] || row["Nummer"] || row["houseNumber"] || ""),
    houseNumberSuffix: row["Toevoeging"] || row["houseNumberSuffix"] || "",
    postalCode: row["Postcode"] || row["PC"] || row["Zip"] || row["postalCode"] || "",
    city: row["Plaats"] || row["Stad"] || row["City"] || row["city"] || "",
    country: "NL",
    phoneNumber: row["Telefoon"] || row["Tel"] || row["Phone"] || row["phoneNumber"] || "",
    role: "user",
  };
}

// ─── CSV download helper ─────────────────────────────────────────────────────

function downloadCsv(filename, headers, rows) {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(";"), ...rows.map((r) => r.map(escape).join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function IEUsers({ user }) {
  const fileRef = useRef(null);

  // Import state
  const [preview, setPreview] = useState(null);   // { headers, rows (first 5), totalRows }
  const [parsedData, setParsedData] = useState(null); // full parsed rows
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null); // { success, failed, errors }

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportFilter, setExportFilter] = useState("all");

  // Shared
  const [melding, setMelding] = useState(null);

  function showMelding(text, type = "success") {
    setMelding({ text, type });
    setTimeout(() => setMelding(null), 5000);
  }

  // ─── Import: Parse file ───────────────────────────────────────────────

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImportResult(null);
    setImportProgress(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        if (rows.length === 0) {
          showMelding("CSV is leeg of ongeldig.", "error");
          return;
        }

        const mapped = rows.map(mapRow).filter((r) => r.email);
        if (mapped.length === 0) {
          showMelding("Geen rijen met een geldig e-mailadres gevonden.", "error");
          return;
        }

        setParsedData(mapped);
        setPreview({
          headers: ["Email", "Bedrijf", "Voornaam", "Achternaam", "Plaats"],
          rows: mapped.slice(0, 5).map((r) => [r.email, r.company_name, r.firstName, r.lastName, r.city]),
          totalRows: mapped.length,
        });
      },
      error: (err) => {
        showMelding("CSV parse fout: " + err.message, "error");
      },
    });
  }

  // ─── Import: Execute ──────────────────────────────────────────────────

  async function handleImport() {
    if (!parsedData || parsedData.length === 0) return;
    setImporting(true);
    setImportResult(null);
    setImportProgress(0);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < parsedData.length; i++) {
      const userData = parsedData[i];
      try {
        await setDoc(doc(db, "users", userData.uid || userData.email), {
          ...userData,
          source: "import",
          imported_at: serverTimestamp(),
          createdAt: serverTimestamp(),
        }, { merge: true });
        success++;
      } catch (err) {
        failed++;
        errors.push(`${userData.email}: ${err.message}`);
      }
      setImportProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    // Log admin action
    if (user) {
      await logAdminAction({
        type: "import_users",
        description: `${success} gebruikers geïmporteerd (${failed} mislukt)`,
        collectionName: "users",
        adminUid: user.uid,
        adminEmail: user.email,
      });
    }

    setImporting(false);
    setImportResult({ success, failed, errors });
    setParsedData(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function cancelImport() {
    setParsedData(null);
    setPreview(null);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ─── Export ───────────────────────────────────────────────────────────

  async function handleExport() {
    setExporting(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (exportFilter === "organic") list = list.filter((u) => !u.source);
      else if (exportFilter === "import") list = list.filter((u) => u.source === "import");

      if (list.length === 0) {
        showMelding("Geen gebruikers gevonden voor dit filter.", "error");
        setExporting(false);
        return;
      }

      const headers = ["email", "company_name", "firstName", "lastName", "street", "houseNumber", "postalCode", "city", "phoneNumber", "role", "source", "createdAt"];
      const rows = list.map((u) => [
        u.email || "",
        u.company_name || u.company || "",
        u.firstName || "",
        u.lastName || "",
        u.street || "",
        u.houseNumber || "",
        u.postalCode || "",
        u.city || "",
        u.phoneNumber || "",
        u.role || "",
        u.source || "organisch",
        u.createdAt?.toDate ? u.createdAt.toDate().toISOString() : "",
      ]);

      const today = new Date().toISOString().split("T")[0];
      downloadCsv(`gebruikers_export_${today}.csv`, headers, rows);
      showMelding(`${list.length} gebruikers geëxporteerd.`);
    } catch (err) {
      showMelding("Export mislukt: " + err.message, "error");
    }
    setExporting(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div>
      {/* Melding */}
      {melding && (
        <div style={{ ...s.melding, ...(melding.type === "error" ? s.meldingError : s.meldingSuccess) }}>
          {melding.text}
        </div>
      )}

      {/* ─── IMPORT SECTION ──────────────────────────────────────────── */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Gebruikers Importeren</h2>
        <p style={s.hint}>
          Upload een CSV met kolommen als: <em>Email, Bedrijfsnaam, Voornaam, Achternaam, Straat, Huisnummer, Postcode, Plaats, Telefoon</em>.
          Geïmporteerde records krijgen automatisch <code style={s.code}>source: &quot;import&quot;</code>.
        </p>

        <div style={s.uploadRow}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileSelect}
            style={s.fileInput}
          />
        </div>

        {/* Preview */}
        {preview && (
          <div style={s.previewBox}>
            <div style={s.previewHeader}>
              <strong>Preview</strong> — {preview.totalRows} rijen gevonden
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={s.previewTable}>
                <thead>
                  <tr>
                    {preview.headers.map((h) => (
                      <th key={h} style={s.previewTh}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} style={s.previewTd}>{cell || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.totalRows > 5 && (
              <div style={s.previewMore}>...en nog {preview.totalRows - 5} rij(en)</div>
            )}
            <div style={s.previewActions}>
              <button onClick={handleImport} disabled={importing} style={s.importBtn}>
                {importing ? "Bezig..." : `Importeer ${preview.totalRows} gebruikers`}
              </button>
              <button onClick={cancelImport} style={s.cancelBtn}>Annuleer</button>
            </div>
          </div>
        )}

        {/* Progress */}
        {importing && (
          <div style={s.progressOuter}>
            <div style={{ ...s.progressInner, width: `${importProgress}%` }} />
            <span style={s.progressText}>{importProgress}%</span>
          </div>
        )}

        {/* Result */}
        {importResult && (
          <div style={{ ...s.resultBox, ...(importResult.failed > 0 ? s.resultWarning : s.resultSuccess) }}>
            <strong>Import afgerond:</strong> {importResult.success} geslaagd, {importResult.failed} mislukt.
            {importResult.errors.length > 0 && (
              <div style={s.errorList}>
                {importResult.errors.map((e, i) => (
                  <div key={i} style={s.errorItem}>{e}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── EXPORT SECTION ──────────────────────────────────────────── */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Gebruikers Exporteren</h2>
        <p style={s.hint}>Download alle gebruikers als CSV (;-gescheiden, Excel-compatibel).</p>

        <div style={s.exportRow}>
          <label style={s.filterLabel}>Filter:</label>
          <select value={exportFilter} onChange={(e) => setExportFilter(e.target.value)} style={s.select}>
            <option value="all">Alle gebruikers</option>
            <option value="organic">Alleen organisch</option>
            <option value="import">Alleen geïmporteerd</option>
          </select>
          <button onClick={handleExport} disabled={exporting} style={s.exportBtn}>
            {exporting ? "Bezig..." : "Exporteer CSV"}
          </button>
        </div>
      </div>
    </div>
  );
}

IEUsers.propTypes = {
  user: PropTypes.shape({ uid: PropTypes.string, email: PropTypes.string }),
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  // Melding
  melding: { padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 500 },
  meldingSuccess: { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" },
  meldingError: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },

  // Sections
  section: { background: "#fff", padding: "1.5rem", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", marginBottom: "1.5rem" },
  sectionTitle: { margin: "0 0 0.5rem", fontSize: "1.1rem", color: "#111827" },
  hint: { fontSize: "0.85rem", color: "#6b7280", marginBottom: "1rem", lineHeight: 1.5 },
  code: { background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: "0.82rem", fontFamily: "monospace" },

  // Upload
  uploadRow: { display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" },
  fileInput: { padding: "8px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.9rem", flex: 1, maxWidth: 400 },

  // Preview
  previewBox: { border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden", marginBottom: "1rem" },
  previewHeader: { background: "#f9fafb", padding: "0.75rem 1rem", fontSize: "0.9rem", borderBottom: "1px solid #e5e7eb" },
  previewTable: { width: "100%", borderCollapse: "collapse" },
  previewTh: { padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", background: "#fafafa" },
  previewTd: { padding: "0.5rem 1rem", fontSize: "0.85rem", borderBottom: "1px solid #f3f4f6" },
  previewMore: { padding: "0.5rem 1rem", fontSize: "0.82rem", color: "#9ca3af", fontStyle: "italic" },
  previewActions: { display: "flex", gap: "0.75rem", padding: "0.75rem 1rem", borderTop: "1px solid #e5e7eb" },
  importBtn: { padding: "8px 20px", borderRadius: 8, border: "none", background: "#004aad", color: "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" },
  cancelBtn: { padding: "8px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer" },

  // Progress
  progressOuter: { position: "relative", height: 28, background: "#e5e7eb", borderRadius: 8, overflow: "hidden", marginBottom: "1rem" },
  progressInner: { height: "100%", background: "#004aad", borderRadius: 8, transition: "width 0.3s" },
  progressText: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.82rem", fontWeight: 600, color: "#fff" },

  // Result
  resultBox: { padding: "1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem" },
  resultSuccess: { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" },
  resultWarning: { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" },
  errorList: { marginTop: "0.5rem", maxHeight: 120, overflowY: "auto" },
  errorItem: { fontSize: "0.82rem", color: "#991b1b", marginBottom: 2 },

  // Export
  exportRow: { display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" },
  filterLabel: { fontSize: "0.9rem", fontWeight: 500, color: "#374151" },
  select: { padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff" },
  exportBtn: { padding: "8px 20px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" },
};
