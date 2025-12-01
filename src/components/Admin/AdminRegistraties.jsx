import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import AdminMenu from "./AdminMenu";
import { sendEmail } from "../../services/mailService"; // ← mail engine

export default function AdminRegistraties() {
  const [registraties, setRegistraties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // pending | approved | rejected
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = collection(db, "registrations");

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRegistraties(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  function filtered() {
    return registraties
      .filter((r) => (filter ? r.status === filter : true))
      .filter((r) =>
        (r.customer_email || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      );
  }

  async function approve(reg) {
    try {
      // Update registratie
      await updateDoc(doc(db, "registrations", reg.id), {
        status: "approved",
        reviewedAt: new Date(),
      });

      // Punten toekennen aan installateur (indien gewenst)
      if (reg.installer_uid && reg.points > 0) {
        const userRef = doc(db, "users", reg.installer_uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const prev = snap.data().points_total ?? 0;
          await updateDoc(userRef, {
            points_total: prev + reg.points,
          });
        }
      }

      // Stuur mails
      await sendEmail("customer_approved", reg.customer_email, {
        customer_name: reg.customer_name,
        product_name: reg.product_name,
      });

      if (reg.installer_email) {
        await sendEmail("installer_approved", reg.installer_email, {
          installer_name: reg.installer_name || "",
          product_name: reg.product_name,
          customer_name: reg.customer_name,
        });
      }

      alert("Registratie goedgekeurd!");

    } catch (err) {
      console.error(err);
      alert("Fout bij goedkeuren.");
    }
  }

  async function reject(reg) {
    const reason = prompt("Reden van afkeuren:");

    if (!reason) {
      alert("Je moet een reden invullen.");
      return;
    }

    try {
      await updateDoc(doc(db, "registrations", reg.id), {
        status: "rejected",
        rejected_reason: reason,
        reviewedAt: new Date(),
      });

      await sendEmail("installer_rejected", reg.installer_email, {
        installer_name: reg.installer_name || "",
        product_name: reg.product_name,
        reason,
      });

      alert("Registratie afgekeurd.");

    } catch (err) {
      console.error(err);
      alert("Fout bij afkeuren.");
    }
  }

  async function remove(reg) {
    if (!window.confirm("Weet je zeker dat je deze registratie wilt verwijderen?")) return;
    await deleteDoc(doc(db, "registrations", reg.id));
  }

  return (
    <div className="admin-layout">
      <AdminMenu />

      <div className="admin-content">
        <h1>📄 Registratiebeheer</h1>

        {/* Filters */}
        <div className="admin-filters" style={{ marginBottom: "1rem" }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="pending">⏳ Wachtend</option>
            <option value="approved">✅ Goedgekeurd</option>
            <option value="rejected">❌ Afgekeurd</option>
            <option value="">Alle</option>
          </select>

          <input
            className="admin-search"
            placeholder="Zoek op klant-email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p>Registraties laden...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Klant</th>
                <th>Installateur</th>
                <th>Product</th>
                <th>Datum</th>
                <th>Status</th>
                <th>Punten</th>
                <th>Acties</th>
              </tr>
            </thead>

            <tbody>
              {filtered().map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.customer_name}<br />
                    <small>{r.customer_email}</small>
                  </td>

                  <td>
                    {r.installer_name || "-"}<br />
                    <small>{r.installer_email || ""}</small>
                  </td>

                  <td>{r.product_name}</td>

                  <td>
                    {r.createdAt?.toDate
                      ? r.createdAt.toDate().toLocaleDateString()
                      : "-"}
                  </td>

                  <td>
                    {r.status === "pending" && <span>⏳</span>}
                    {r.status === "approved" && <span style={{ color: "green" }}>✔</span>}
                    {r.status === "rejected" && (
                      <span style={{ color: "red" }}>✖</span>
                    )}
                  </td>

                  <td>{r.points ?? 0}</td>

                  <td>
                    {r.status === "pending" && (
                      <>
                        <button
                          className="admin-btn"
                          onClick={() => approve(r)}
                        >
                          ✔ Goedkeuren
                        </button>

                        <button
                          className="admin-btn"
                          style={{ background: "#c62828" }}
                          onClick={() => reject(r)}
                        >
                          ✖ Afkeuren
                        </button>
                      </>
                    )}

                    <button
                      className="admin-btn"
                      style={{ background: "#444" }}
                      onClick={() => remove(r)}
                    >
                      🗑 Verwijderen
                    </button>
                  </td>
                </tr>
              ))}

              {filtered().length === 0 && (
                <tr>
                  <td colSpan="7" className="admin-empty">
                    Geen registraties gevonden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
