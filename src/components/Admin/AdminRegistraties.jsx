// src/components/Admin/AdminRegistraties.jsx
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function AdminRegistraties({ user }) {
  const [registraties, setRegistraties] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all"); // all | pending | approved | rejected
  const [melding, setMelding] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔹 Realtime registraties ophalen
  useEffect(() => {
    const ref = collection(db, "registrations");

    const q = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRegistraties(list);
        setLoading(false);
      },
      (error) => {
        console.error("AdminRegistraties onSnapshot error:", error.code, error.message);
        setMelding(
          "❌ Kan registraties niet laden (onvoldoende rechten of netwerkprobleem)."
        );
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const showMelding = (text) => {
    setMelding(text);
    if (text) {
      setTimeout(() => setMelding(""), 4000);
    }
  };

  // 🔹 Registratie goedkeuren
  async function approveRegistration(reg) {
    try {
      const ref = doc(db, "registrations", reg.id);
      await updateDoc(ref, {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: user ? user.uid : null,
      });
      showMelding("✅ Registratie goedgekeurd.");
    } catch (err) {
      console.error("approveRegistration error:", err);
      showMelding("❌ Fout bij goedkeuren: " + err.message);
    }
  }

  // 🔹 Registratie afwijzen
  async function rejectRegistration(reg) {
    const reason = window.prompt(
      "Optioneel: reden van afwijzing (wordt opgeslagen bij de registratie):"
    );

    try {
      const ref = doc(db, "registrations", reg.id);
      await updateDoc(ref, {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: user ? user.uid : null,
        rejectedReason: reason || null,
      });
      showMelding("⚠️ Registratie afgewezen.");
    } catch (err) {
      console.error("rejectRegistration error:", err);
      showMelding("❌ Fout bij afwijzen: " + err.message);
    }
  }

  // 🔹 Gefilterde lijst
  const gefilterd = useMemo(() => {
    if (filterStatus === "all") return registraties;
    return registraties.filter((r) => (r.status || "pending") === filterStatus);
  }, [registraties, filterStatus]);

  return (
    <div style={styles.page}>
      <h1>🗂️ Admin – Registraties</h1>
      <p style={{ color: "#555" }}>
        Overzicht van alle ingediende registraties (installateurs / klanten / aanvragen).
      </p>

      {/* Filters */}
      <div style={styles.filterRow}>
        <span>Status filter:</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.select}
        >
          <option value="all">Alle</option>
          <option value="pending">Openstaand</option>
          <option value="approved">Goedgekeurd</option>
          <option value="rejected">Afgewezen</option>
        </select>
      </div>

      {melding && <p style={styles.message}>{melding}</p>}

      {loading ? (
        <p>⏳ Registraties worden geladen...</p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Naam</th>
                <th>Email</th>
                <th>Installateur</th>
                <th>Status</th>
                <th>Acties</th>
              </tr>
            </thead>
            <tbody>
              {gefilterd.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.createdAt && r.createdAt.toDate
                      ? r.createdAt.toDate().toLocaleString()
                      : "—"}
                  </td>
                  <td>{r.customerName || r.name || "—"}</td>
                  <td>{r.customerEmail || r.email || "—"}</td>
                  <td>{r.installer_name || r.installer_email || r.installer_uid || "—"}</td>
                  <td>
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: 999,
                        fontSize: 12,
                        background:
                          (r.status || "pending") === "approved"
                            ? "#e5ffe7"
                            : (r.status || "pending") === "rejected"
                            ? "#ffe5e5"
                            : "#fff8e1",
                        color:
                          (r.status || "pending") === "approved"
                            ? "#0a7a26"
                            : (r.status || "pending") === "rejected"
                            ? "#a00"
                            : "#9c6b00",
                      }}
                    >
                      {r.status || "pending"}
                    </span>
                    {r.rejectedReason && (
                      <div style={{ fontSize: 11, color: "#a00", marginTop: 4 }}>
                        Reden: {r.rejectedReason}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {(r.status || "pending") === "pending" && (
                        <>
                          <button
                            style={styles.approveBtn}
                            onClick={() => approveRegistration(r)}
                          >
                            ✅ Goedkeuren
                          </button>
                          <button
                            style={styles.rejectBtn}
                            onClick={() => rejectRegistration(r)}
                          >
                            ❌ Afwijzen
                          </button>
                        </>
                      )}
                      {(r.status || "pending") !== "pending" && (
                        <span style={{ fontSize: 12, color: "#555" }}>
                          Actie voltooid
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {gefilterd.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: "1rem", textAlign: "center" }}>
                    Geen registraties gevonden voor deze filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Inter, system-ui, sans-serif",
    padding: "2rem",
    background: "#f4f6fb",
    minHeight: "100vh",
  },
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "1rem",
  },
  select: {
    padding: "0.4rem 0.6rem",
    borderRadius: 8,
    border: "1px solid #ccc",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  },
  approveBtn: {
    background: "#0a7a26",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "0.3rem 0.6rem",
    cursor: "pointer",
    fontSize: 12,
  },
  rejectBtn: {
    background: "#e53935",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "0.3rem 0.6rem",
    cursor: "pointer",
    fontSize: 12,
  },
  message: {
    marginTop: "1rem",
    textAlign: "left",
    color: "#004aad",
    fontWeight: "bold",
  },
};
