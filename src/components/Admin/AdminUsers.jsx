// ✅ src/components/Admin/AdminUsers.jsx
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
import { Link } from "react-router-dom";
import AdminMenu from "./AdminMenu";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [registratieCounts, setRegistratieCounts] = useState({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const USERS_PER_PAGE = 25;

  // ✅ Alle gebruikers ophalen
  useEffect(() => {
    async function loadUsers() {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);
    }
    loadUsers();
  }, []);

  // ✅ Registratie-aantallen ophalen (batch)
  useEffect(() => {
    async function loadCounts() {
      const result = {};

      for (let user of users) {
        const q = query(
          collection(db, "registrations"),
          where("installer_uid", "==", user.id)
        );
        const snap = await getDocs(q);
        result[user.id] = snap.size;
      }

      setRegistratieCounts(result);
    }

    if (users.length > 0) loadCounts();
  }, [users]);

  // ✅ Zoekfilter
  const filteredUsers = users.filter((u) =>
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // ✅ Paginatie
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const start = (page - 1) * USERS_PER_PAGE;
  const usersToShow = filteredUsers.slice(start, start + USERS_PER_PAGE);

  // ✅ Rol wijzigen
  async function setRole(userId, newRole) {
    await updateDoc(doc(db, "users", userId), { role: newRole });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  }

  return (
    <div className="admin-layout">
      <AdminMenu />

      <div className="admin-content">
        <h1>👥 Gebruikersbeheer</h1>

        {/* ✅ Zoekbox */}
        <input
          className="admin-search"
          placeholder="Zoek op e-mail"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        {/* ✅ Tabel */}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Bedrijf</th>
              <th>Rol</th>
              <th>Registraties</th>
              <th>Acties</th>
            </tr>
          </thead>

          <tbody>
            {usersToShow.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.company || "-"}</td>

                {/* ✅ Rol dropdown */}
                <td>
                  <select
                    className="admin-select"
                    value={u.role}
                    onChange={(e) => setRole(u.id, e.target.value)}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>

                {/* ✅ Registratie-aantal */}
                <td>{registratieCounts[u.id] ?? "…"}</td>

                {/* ✅ Link naar registraties */}
                <td>
                  <Link className="admin-btn" to={`/admin/registraties?user=${u.id}`}>
                    Bekijk registraties
                  </Link>
                </td>
              </tr>
            ))}

            {usersToShow.length === 0 && (
              <tr>
                <td colSpan="5" className="admin-empty">
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
