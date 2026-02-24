// src/components/Admin/ImportExport/IEPoints.jsx
import { useState, useRef } from "react";
import PropTypes from "prop-types";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { logAdminAction } from "../../../adminTools/logAdminAction";

// ─── CSV download helper ─────────────────────────────────────────────────────

function downloadCsv(filename, headers, rows) {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(";"), ...rows.map((r) => r.map(escape).join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
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

export default function IEPoints({ user }) {
  const fileRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [melding, setMelding] = useState(null);

  function showMelding(text, type = "success") {
    setMelding({ text, type });
    setTimeout(() => setMelding(null), 5000);
  }

  // ─── Export ───────────────────────────────────────────────────────────

  async function handleExport() {
    setExporting(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const headers = ["id", "email", "company_name", "points_total", "saldo"];
      const rows = list.map((u) => [
        u.id,
        u.email || "",
        u.company_name || u.company || "",
        u.points_total || 0,
        u.saldo || 0,
      ]);

      const today = new Date().toISOString().split("T")[0];
      downloadCsv(`punten_export_${today}.csv`, headers, rows);
      showMelding(`${list.length} gebruikers geëxporteerd.`);
    } catch (err) {
      showMelding("Export mislukt: " + err.message, "error");
    }
    setExporting(false);
  }

  // ─── Import ───────────────────────────────────────────────────────────

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      // Skip header
      const dataLines = lines.slice(1);

      if (dataLines.length === 0) {
        showMelding("CSV bevat geen data.", "error");
        setImporting(false);
        return;
      }

      let success = 0;
      let failed = 0;

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        // Support both , and ; as delimiter
        const parts = line.includes(";") ? line.split(";") : line.split(",");
        const id = (parts[0] || "").replace(/"/g, "").trim();
        const pointsTotal = Number((parts[3] || parts[2] || "0").replace(/"/g, "").trim());
        const saldo = Number((parts[4] || parts[3] || "0").replace(/"/g, "").trim());

        if (!id) {
          failed++;
          continue;
        }

        try {
          await updateDoc(doc(db, "users", id), {
            points_total: pointsTotal,
            saldo: isNaN(saldo) ? pointsTotal : saldo,
          });
          success++;
        } catch (err) {
          console.error(`Fout bij user ${id}:`, err);
          failed++;
        }
        setImportProgress(Math.round(((i + 1) / dataLines.length) * 100));
      }

      if (user) {
        await logAdminAction({
          type: "import_points",
          description: `Punten geüpdatet voor ${success} gebruikers (${failed} mislukt)`,
          collectionName: "users",
          adminUid: user.uid,
          adminEmail: user.email,
        });
      }

      showMelding(`${success} gebruikers bijgewerkt, ${failed} mislukt.`);
    } catch (err) {
      showMelding("Import mislukt: " + err.message, "error");
    }

    setImporting(false);
    setImportProgress(0);
    if (fileRef.current) fileRef.current.value = "";
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

      {/* Export */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Punten Exporteren</h2>
        <p style={s.hint}>Download een CSV met alle gebruikers en hun puntensaldo.</p>
        <button onClick={handleExport} disabled={exporting} style={s.exportBtn}>
          {exporting ? "Bezig..." : "Exporteer Punten CSV"}
        </button>
      </div>

      {/* Import */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Punten Importeren</h2>
        <p style={s.hint}>
          Upload een CSV met kolommen: <em>id, email, company_name, points_total, saldo</em>.
          De <code style={s.code}>id</code> kolom moet overeenkomen met het Firestore user document ID.
        </p>

        <div style={s.uploadRow}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleImport}
            disabled={importing}
            style={s.fileInput}
          />
        </div>

        {importing && (
          <div style={s.progressOuter}>
            <div style={{ ...s.progressInner, width: `${importProgress}%` }} />
            <span style={s.progressText}>{importProgress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

IEPoints.propTypes = {
  user: PropTypes.shape({ uid: PropTypes.string, email: PropTypes.string }),
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  melding: { padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 500 },
  meldingSuccess: { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" },
  meldingError: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },

  section: { background: "#fff", padding: "1.5rem", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", marginBottom: "1.5rem" },
  sectionTitle: { margin: "0 0 0.5rem", fontSize: "1.1rem", color: "#111827" },
  hint: { fontSize: "0.85rem", color: "#6b7280", marginBottom: "1rem", lineHeight: 1.5 },
  code: { background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: "0.82rem", fontFamily: "monospace" },

  uploadRow: { display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" },
  fileInput: { padding: "8px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.9rem", flex: 1, maxWidth: 400 },

  exportBtn: { padding: "8px 20px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" },

  progressOuter: { position: "relative", height: 28, background: "#e5e7eb", borderRadius: 8, overflow: "hidden", marginBottom: "1rem" },
  progressInner: { height: "100%", background: "#004aad", borderRadius: 8, transition: "width 0.3s" },
  progressText: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.82rem", fontWeight: 600, color: "#fff" },
};
