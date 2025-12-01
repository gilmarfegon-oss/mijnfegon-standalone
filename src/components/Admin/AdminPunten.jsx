// ✅ src/components/Admin/AdminPunten.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import AdminMenu from "./AdminMenu";
import { Link } from "react-router-dom";

export default function AdminPunten() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [puntenInput, setPuntenInput] = useState({});
  const [pendingRegs, setPendingRegs] = useState({});

  const USERS_PER_PAGE = 25;

  // ✅ Gebruikers ophalen
  useEffect(() => {
    async function loadUsers() {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);
    }
    loadUsers();
  }, []);

  // ✅ Pending registraties voor elke gebruiker
  useEffect(() => {
    async function loadPending() {
      const result = {};

      for (let u of users) {
        const q = query(
          collection(db, "registrations"),
          where("installer_uid", "==", u.id),
          where("status", "==", "pending")
        );
        const snap = await getDocs(q);
        result[u.id] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      setPendingRegs(result);
    }

    if (users.length > 0) loadPending();
  }, [users]);

  // ✅ Zoeken
  const filtered = users.filter((u) =>
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // ✅ Paginatie
  const totalPages = Math.ceil(filtered.length / USERS_PER_PAGE);
  const start = (page - 1) * USERS_PER_PAGE;
  const usersToShow = filtered.slice(start, start + USERS_PER_PAGE);

  // ✅ Punten toevoegen/verwijderen
  async function updatePoints(uid, amount) {
    const userRef = doc(db, "users", uid);
    const snap = await getDocs(query(collection(db, "users"), where("__name__", "==", uid)));
    const currentPoints = snap.docs[0].data().points_total || 0;

    await updateDoc(userRef, {
      points_total: currentPoints + amount,
    });

    setUsers((prev) =>
      prev.map((u) =>
        u.id === uid ? { ...u, points_total: currentPoints + amount } : u
      )
    );

    setPuntenInput({ ...puntenInput, [uid]: "" });
  }

  // ✅ Registratie goedkeuren
  async function approveRegistration(reg) {
    const ref = doc(db, "registrations", reg.id);
    await updateDoc(ref, { status: "approved" });

    // Verwijder uit lijst
    setPendingRegs((prev) => ({
      ...prev,
      [reg.installer_uid]: prev[reg.installer_uid].filter((r) => r.id !== reg.id),
    }));
  }

  // ✅ Registratie afkeuren
  async function rejectRegistration(reg) {
    const ref = doc(db, "registrations", reg.id);
    await updateDoc(ref, { status: "rejected" });

    setPendingRegs((prev) => ({
      ...prev,
      [reg.installer_uid]: prev[reg.installer_uid].filter((r) => r.id !== reg.id),
    }));
  }

  return (
    <div className="admin-layout">
      <AdminMenu />

      <div className="admin-content">
        <h1>💰 Puntenbeheer</h1>

        <input
          className="admin-search"
          placeholder="Zoek op e-mail..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Huidige punten</th>
              <th>Pas punten aan</th>
              <th>Openstaande registraties</th>
              <th>Acties</th>
            </tr>
          </thead>

          <tbody>
            {usersToShow.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.points_total || 0}</td>

                {/* ✅ Punten aanpassen */}
                <td>
                  <input
                    type="number"
                    style={{
                      width: "80px",
                      padding: "6px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                    }}
                    value={puntenInput[u.id] || ""}
                    onChange={(e) =>
                      setPuntenInput({ ...puntenInput, [u.id]: e.target.value })
                    }
                  />
                  <button
                    className="admin-btn"
                    style={{ marginLeft: "6px" }}
                    onClick={() =>
                      updatePoints(u.id, Number(puntenInput[u.id] || 0))
                    }
                  >
                    ✅ Opslaan
                  </button>
                </td>

                {/* ✅ Pending registraties */}
                <td>
                  {(pendingRegs[u.id]?.length || 0) > 0 ? (
                    <span style={{ color: "#d33", fontWeight: "bold" }}>
                      {pendingRegs[u.id].length} open
                    </span>
                  ) : (
                    <span style={{ color: "green" }}>Geen</span>
                  )}
                </td>

                <td>
                  <Link className="admin-btn" to={`/admin/registraties?user=${u.id}`}>
                    Bekijk registraties
                  </Link>
                </td>
              </tr>
            ))}

            {usersToShow.length === 0 && (
              <tr>
                <td className="admin-empty" colSpan="5">
                  Geen gebruikers gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ✅ Paginatie */}
        <div className="admin-pagination">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="admin-page-btn"
          >
            ← Vorige
          </button>

          <span>
            Pagina {page} van {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="admin-page-btn"
          >
            Volgende →
          </button>
        </div>
      </div>
    </div>
  );
}
