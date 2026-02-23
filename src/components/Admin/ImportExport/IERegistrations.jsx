// src/components/Admin/ImportExport/IERegistrations.jsx
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function IERegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [melding, setMelding] = useState("");

  useEffect(() => {
    loadRegistrations();
  }, []);

  async function loadRegistrations() {
    try {
      setLoading(true);
      setMelding("");

      // Alle registraties ophalen
      const snap = await getDocs(collection(db, "registrations"));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Alleen registraties zónder koppeling (geen installer_uid / falsy)
      const unlinked = all.filter((r) => !r.installer_uid);

      setRegistrations(unlinked);
    } catch (err) {
      console.error("IERegistrations loadRegistrations error:", err);
      setMelding("❌ Kon registraties niet laden.");
    } finally {
      setLoading(false);
    }
  }

  // Optioneel: export naar CSV van deze niet-gekoppelde registraties
  function exportCsv() {
    if (!registrations.length) {
      setMelding("⚠️ Geen registraties om te exporteren.");
      return;
    }

    const headers = [
      "id",
      "serial",
      "brand",
      "model",
      "customer_first_name",
      "customer_middle_name",
      "customer_last_name",
      "customer_email",
      "installer_email",
      "status",
      "createdAt",
    ];

    const rows = registrations.map((r) => {
      const createdAtStr =
        r.createdAt && r.createdAt.toDate
          ? r.createdAt.toDate().toISOString()
          : "";

      const row = [
        r.id || "",
        r.serial || "",
        r.brand || r.device_brand || "",
        r.model || r.device_model || "",
        r.customer_first_name || "",
        r.customer_middle_name || "",
        r.customer_last_name || "",
        r.customer_email || r.email || "",
        r.installer_email || "",
        r.status || "",
        createdAtStr,
      ];

      // CSV escaping (met ; als scheiding)
      return row
        .map((value) =>
          `"${String(value).replace(/"/g, '""')}"`
        )
        .join(";");
    });

    const csv = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "registraties_zonder_koppeling.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div
        className="actions-row"
        style={{ justifyContent: "space-between", marginBottom: "0.8rem" }}
      >
        <h2 style={{ margin: 0 }}>Registraties zonder koppeling</h2>
        <div className="actions-row">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={loadRegistrations}
          >
            🔄 Herladen
          </button>
          <button
            type="button"
            className="btn btn--primary btn--small"
            onClick={exportCsv}
          >
            ⬇️ Exporteren naar CSV
          </button>
        </div>
      </div>

      <p style={{ color: "#6b7280", marginBottom: "0.8rem" }}>
        Dit overzicht toont alleen registraties die nog niet gekoppeld zijn
        aan een installateur (geen <code>installer_uid</code>).
      </p>

      {melding && (
        <p className="alert alert--info" style={{ marginBottom: "0.8rem" }}>
          {melding}
        </p>
      )}

      {loading ? (
        <p>⏳ Registraties worden geladen...</p>
      ) : registrations.length === 0 ? (
        <p style={{ color: "#16a34a" }}>
          ✅ Er zijn momenteel geen niet-gekoppelde registraties.
        </p>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Serienummer</th>
                <th>Merk / model</th>
                <th>Klant</th>
                <th>Klant e-mail</th>
                <th>Installateur e-mail</th>
                <th>Status</th>
                <th>Aangemaakt op</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => {
                const klantNaam = [
                  r.customer_first_name,
                  r.customer_middle_name,
                  r.customer_last_name,
                ]
                  .filter(Boolean)
                  .join(" ");

                const createdAtStr =
                  r.createdAt && r.createdAt.toDate
                    ? r.createdAt.toDate().toLocaleString()
                    : "—";

                const brand = r.brand || r.device_brand || "—";
                const model = r.model || r.device_model || "—";

                return (
                  <tr key={r.id}>
                    <td>{r.serial || "—"}</td>
                    <td>
                      {brand} {model !== "—" ? `– ${model}` : ""}
                    </td>
                    <td>{klantNaam || "—"}</td>
                    <td>{r.customer_email || r.email || "—"}</td>
                    <td>{r.installer_email || "—"}</td>
                    <td>{r.status || "—"}</td>
                    <td>{createdAtStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
