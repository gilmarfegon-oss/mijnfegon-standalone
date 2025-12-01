import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import AdminMenu from "./AdminMenu"; // ✅ BELANGRIJK

export default function AdminKoppelingen() {
  const [registrations, setRegistrations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [melding, setMelding] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // ✅ 1. Users ophalen
      const snapUsers = await getDocs(collection(db, "users"));
      const allUsers = snapUsers.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(allUsers);

      // ✅ 2. Registraties zonder koppeling
      const qRegs = query(
        collection(db, "registrations"),
        where("installer_uid", "==", null)
      );
      const snapRegs = await getDocs(qRegs);
      const list = snapRegs.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ✅ 3. Auto-match email -> user.email
      const enriched = list.map((reg) => {
        const match = allUsers.find(
          (u) =>
            reg.installer_email &&
            u.email?.toLowerCase() === reg.installer_email.toLowerCase()
        );

        return { ...reg, autoMatch: match ? match.id : "" };
      });

      setRegistrations(enriched);
      setLoading(false);
    }

    loadData();
  }, []);

  async function saveLink(regId, installerUid) {
    try {
      const ref = doc(db, "registrations", regId);
      await updateDoc(ref, {
        installer_uid: installerUid,
        status: "pending",
      });

      setMelding("✅ Koppeling opgeslagen!");

      setRegistrations((prev) => prev.filter((r) => r.id !== regId));
    } catch (err) {
      console.error(err);
      setMelding("❌ Fout bij opslaan koppeling.");
    }
  }

  if (loading) return <p style={{ padding: 20 }}>⏳ Laden...</p>;

  return (
    <div className="admin-layout">
      <AdminMenu /> {/* ✅ MENU IS NU ALTIJD ZICHTBAAR */}

      <div className="admin-content">
        <h1>🔗 Registraties koppelen</h1>

        {melding && <p>{melding}</p>}

        {registrations.length === 0 && (
          <p>✅ Geen openstaande registraties om te koppelen.</p>
        )}

        {registrations.map((r) => (
          <div key={r.id} className="stat-card" style={{ marginBottom: 20 }}>
            <h3>Registratie: {r.serial || "(geen serienummer)"}</h3>

            <p>
              <strong>Email installateur:</strong>{" "}
              {r.installer_email || "Onbekend"}
            </p>

            <label style={{ fontWeight: "bold" }}>
              Koppel aan installateur:
            </label>

            <select
              className="admin-select"
              defaultValue={r.autoMatch || ""}
              onChange={(e) => saveLink(r.id, e.target.value)}
            >
              <option value="">-- Kies installateur --</option>

              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email} ({u.company || "Geen bedrijf"})
                </option>
              ))}
            </select>

            {r.autoMatch && (
              <p style={{ color: "green", marginTop: 6 }}>
                ✅ Automatische match gevonden!
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
