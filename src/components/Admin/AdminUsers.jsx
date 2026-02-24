// src/components/Admin/AdminUsers.jsx
import { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { collection, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase";
import AdminLayout from "./AdminLayout";
import { usePagination } from "../../hooks/usePagination";
import { formatDate } from "../../utils/dateUtils";
import {
  getRegistrationStatusLabel,
  getRegistrationStatusStyle,
} from "../../utils/statusUtils";
import { logAdminAction } from "../../adminTools/logAdminAction";

const USERS_PER_PAGE = 25;

export default function AdminUsers({ user }) {
  const [users, setUsers] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [melding, setMelding] = useState(null);
  const [sort, setSort] = useState(null);

  // ─── Data laden ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [usersSnap, regsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "registrations")),
        ]);

        setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Groepeer registraties per installer_uid
        const grouped = {};
        regsSnap.docs.forEach((d) => {
          const reg = { id: d.id, ...d.data() };
          const uid = reg.installer_uid;
          if (!grouped[uid]) grouped[uid] = [];
          grouped[uid].push(reg);
        });
        setAllRegistrations(grouped);
      } catch (err) {
        console.error("AdminUsers load error:", err);
        showMelding("Kon gegevens niet laden.", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ─── Filtering, sorting & paginatie ──────────────────────────────────────
  const filtered = useMemo(() => {
    const list = users.filter((u) => {
      const term = search.toLowerCase();
      return (
        (u.email || "").toLowerCase().includes(term) ||
        (u.installer_full_name || u.name || "").toLowerCase().includes(term) ||
        (u.installer_company || u.company_name || u.company || "").toLowerCase().includes(term)
      );
    });

    if (sort) {
      const getValue = (u) => {
        if (sort.field === "registrations") return (allRegistrations[u.id] || []).length;
        return 0;
      };
      const dir = sort.dir === "asc" ? 1 : -1;
      list.sort((a, b) => (getValue(a) - getValue(b)) * dir);
    }

    return list;
  }, [users, search, sort, allRegistrations]);

  const { page: safePage, setPage, totalPages, pageItems: usersToShow } = usePagination(filtered, USERS_PER_PAGE);

  // ─── Totalen ─────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let admins = 0;
    for (const u of users) {
      if (u.role === "admin") admins++;
    }
    const totalRegs = Object.values(allRegistrations).reduce((sum, arr) => sum + arr.length, 0);
    return { count: users.length, admins, totalRegs };
  }, [users, allRegistrations]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function showMelding(text, type = "success") {
    setMelding({ text, type });
    setTimeout(() => setMelding(null), 4000);
  }

  function toggleSort(field) {
    setSort((prev) => {
      if (!prev || prev.field !== field) return { field, dir: "desc" };
      if (prev.dir === "desc") return { field, dir: "asc" };
      return null;
    });
    setPage(1);
  }

  function sortArrow(field) {
    if (!sort || sort.field !== field) return "";
    return sort.dir === "desc" ? " \u25BC" : " \u25B2";
  }

  async function handleRoleChange(userId, newRole) {
    const existing = users.find((u) => u.id === userId);
    const oldRole = existing?.role || "user";
    if (oldRole === newRole) return;

    const action = newRole === "admin" ? "admin rechten geven" : "admin rechten intrekken";
    if (!window.confirm(`Weet je zeker dat je ${existing?.email} wilt ${action}?`)) return;

    try {
      const setRole = httpsCallable(functions, "setUserRole");
      await setRole({ uid: userId, role: newRole });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );

      showMelding("Rol bijgewerkt.", "success");
      logAdminAction({ type: "user_role_change", description: `Gebruiker ${existing?.email || userId} rol gewijzigd van ${oldRole} naar ${newRole}`, collectionName: "users", adminUid: user?.uid, adminEmail: user?.email });
    } catch (err) {
      const msg = err.message || "Kon rol niet bijwerken.";
      console.error("AdminUsers setRole error:", err);
      showMelding(msg, "error");
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <AdminLayout user={user}>
      <h1 style={s.title}>Gebruikersbeheer</h1>

      {/* ── Samenvatting ──────────────────────────────────────────────── */}
      <div style={s.statsRow}>
        <StatCard label="Gebruikers" value={totals.count} color="#004aad" />
        <StatCard label="Admins" value={totals.admins} color="#dc2626" />
        <StatCard label="Registraties totaal" value={totals.totalRegs} color="#16a34a" />
      </div>

      {/* ── Melding ───────────────────────────────────────────────────── */}
      {melding && (
        <div style={{ ...s.melding, ...(melding.type === "error" ? s.meldingError : s.meldingSuccess) }}>
          {melding.text}
        </div>
      )}

      {/* ── Zoeken ────────────────────────────────────────────────────── */}
      <div style={s.searchBar}>
        <input
          style={s.searchInput}
          placeholder="Zoek op naam, bedrijf of e-mail..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <span style={s.searchCount}>
          {filtered.length} resultaat{filtered.length === 1 ? "" : "en"}
        </span>
      </div>

      {/* ── Tabel ─────────────────────────────────────────────────────── */}
      {loading ? (
        <p style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
          Gegevens laden...
        </p>
      ) : (
        <>
          <div style={s.tableCard}>
            <table style={s.table}>
              <thead>
                <tr style={s.tableHead}>
                  <th style={s.th}>Gebruiker</th>
                  <th style={s.th}>Rol</th>
                  <th style={{ ...s.th, ...s.thSortable, textAlign: "center" }} onClick={() => toggleSort("registrations")}>
                    Registraties{sortArrow("registrations")}
                  </th>
                  <th style={s.th}>Acties</th>
                </tr>
              </thead>
              <tbody>
                {usersToShow.map((u) => (
                  <UserRow
                    key={u.id}
                    u={u}
                    registrations={allRegistrations[u.id] || []}
                    onRoleChange={handleRoleChange}
                  />
                ))}
                {usersToShow.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                      Geen gebruikers gevonden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Paginatie ──────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div style={s.pagination}>
              <button disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={s.pageBtn}>
                Vorige
              </button>
              <span style={s.pageInfo}>{safePage} / {totalPages}</span>
              <button disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={s.pageBtn}>
                Volgende
              </button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

AdminUsers.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...s.statCard, borderLeft: `4px solid ${color}` }}>
      <div style={s.statLabel}>{label}</div>
      <div style={s.statValue}>{value}</div>
    </div>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  color: PropTypes.string.isRequired,
};

function UserRow({ u, registrations, onRoleChange }) {
  const [expanded, setExpanded] = useState(false);

  const userName = u.installer_full_name || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || "";
  const company = u.installer_company || u.company_name || u.company || "";

  const pendingCount = registrations.filter((r) => r.status === "pending").length;
  const approvedCount = registrations.filter((r) => r.status === "approved").length;
  const rejectedCount = registrations.filter((r) => r.status === "rejected").length;

  return (
    <>
      <tr style={s.tableRow}>
        {/* Gebruiker */}
        <td style={s.td}>
          <div style={{ fontWeight: 600, color: "#111827" }}>{userName || u.email}</div>
          {company && <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{company}</div>}
          {userName && <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{u.email}</div>}
        </td>

        {/* Rol */}
        <td style={s.td}>
          <select
            style={{
              ...s.roleSelect,
              color: (u.role || "user") === "admin" ? "#dc2626" : "#374151",
            }}
            value={u.role || "user"}
            onChange={(e) => onRoleChange(u.id, e.target.value)}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </td>

        {/* Registraties */}
        <td style={{ ...s.td, textAlign: "center" }}>
          <div style={{ fontWeight: 600 }}>{registrations.length}</div>
          {registrations.length > 0 && (
            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 2 }}>
              {approvedCount > 0 && <span style={{ color: "#16a34a" }}>{approvedCount} ok</span>}
              {approvedCount > 0 && (pendingCount > 0 || rejectedCount > 0) && " · "}
              {pendingCount > 0 && <span style={{ color: "#e65100" }}>{pendingCount} open</span>}
              {pendingCount > 0 && rejectedCount > 0 && " · "}
              {rejectedCount > 0 && <span style={{ color: "#dc2626" }}>{rejectedCount} afg.</span>}
            </div>
          )}
        </td>

        {/* Acties */}
        <td style={s.td}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={s.toggleBtn}
            disabled={registrations.length === 0}
          >
            {registrations.length === 0
              ? "Geen registraties"
              : expanded
                ? "Sluiten"
                : "Bekijk registraties"}
          </button>
        </td>
      </tr>

      {/* ── Uitklapbare registratie-lijst ────────────────────────────── */}
      {expanded && (
        <tr>
          <td colSpan="4" style={s.expandedCell}>
            <div style={s.regTableWrap}>
              <table style={s.regTable}>
                <thead>
                  <tr>
                    <th style={s.regTh}>Datum</th>
                    <th style={s.regTh}>Klant</th>
                    <th style={s.regTh}>Adres</th>
                    <th style={s.regTh}>Product</th>
                    <th style={s.regTh}>Serienummer</th>
                    <th style={{ ...s.regTh, textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations
                    .sort((a, b) => {
                      const dateA = a.created_at?.toDate?.() || new Date(a.created_at || 0);
                      const dateB = b.created_at?.toDate?.() || new Date(b.created_at || 0);
                      return dateB - dateA;
                    })
                    .map((reg) => (
                      <tr key={reg.id} style={s.regRow}>
                        <td style={s.regTd}>{formatDate(reg.created_at)}</td>
                        <td style={s.regTd}>
                          <div style={{ fontWeight: 500 }}>
                            {[reg.customer_first_name, reg.customer_last_name].filter(Boolean).join(" ") || "—"}
                          </div>
                          {reg.customer_email && (
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{reg.customer_email}</div>
                          )}
                        </td>
                        <td style={s.regTd}>
                          {[
                            [reg.customer_street, reg.customer_house_number, reg.customer_house_addition].filter(Boolean).join(" "),
                            [reg.customer_postcode, reg.customer_city].filter(Boolean).join(" "),
                          ].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td style={s.regTd}>
                          {[reg.product_brand, reg.product_model].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td style={s.regTd}>{reg.product_serial_number || "—"}</td>
                        <td style={{ ...s.regTd, textAlign: "center" }}>
                          <span style={{ ...s.statusBadge, ...getRegistrationStatusStyle(reg.status) }}>
                            {getRegistrationStatusLabel(reg.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

UserRow.propTypes = {
  u: PropTypes.shape({
    id: PropTypes.string.isRequired,
    email: PropTypes.string,
    role: PropTypes.string,
    installer_full_name: PropTypes.string,
    installer_company: PropTypes.string,
    company_name: PropTypes.string,
    company: PropTypes.string,
    name: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
  }).isRequired,
  registrations: PropTypes.array.isRequired,
  onRoleChange: PropTypes.func.isRequired,
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  title: { margin: "0 0 1.5rem", fontSize: "1.5rem", color: "#111827" },

  // Stats
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" },
  statCard: { background: "#fff", padding: "1rem 1.2rem", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  statLabel: { fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "#6b7280", marginBottom: 4 },
  statValue: { fontSize: "1.3rem", fontWeight: 700, color: "#111827" },

  // Melding
  melding: { padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 500 },
  meldingSuccess: { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" },
  meldingError: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },

  // Search
  searchBar: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" },
  searchInput: { flex: 1, padding: "0.7rem 1rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.95rem", outline: "none" },
  searchCount: { fontSize: "0.82rem", color: "#9ca3af", whiteSpace: "nowrap" },

  // Table
  tableCard: { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" },
  table: { width: "100%", borderCollapse: "collapse" },
  tableHead: { background: "#f9fafb" },
  th: { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#6b7280", borderBottom: "1px solid #e5e7eb", userSelect: "none" },
  thSortable: { cursor: "pointer", whiteSpace: "nowrap" },
  tableRow: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "0.75rem 1rem", verticalAlign: "top" },

  // Role select
  roleSelect: { padding: "0.35rem 0.5rem", borderRadius: 6, border: "1px solid #d1d5db", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", background: "#fff" },

  // Toggle button
  toggleBtn: { padding: "0.4rem 0.9rem", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: "0.82rem", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" },

  // Expanded registrations
  expandedCell: { padding: "0", background: "#f9fafb", borderBottom: "2px solid #e5e7eb" },
  regTableWrap: { overflowX: "auto" },
  regTable: { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" },
  regTh: { padding: "0.5rem 0.75rem", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.3px" },
  regRow: { borderBottom: "1px solid #f0f0f0" },
  regTd: { padding: "0.5rem 0.75rem", color: "#374151", verticalAlign: "top" },

  // Status badge
  statusBadge: { padding: "2px 10px", borderRadius: 12, fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" },

  // Pagination
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1rem", padding: "0.75rem" },
  pageBtn: { padding: "0.45rem 1rem", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: "#374151" },
  pageInfo: { fontSize: "0.85rem", color: "#6b7280" },
};
