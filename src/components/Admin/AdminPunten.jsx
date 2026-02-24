// src/components/Admin/AdminPunten.jsx
import { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Link } from "react-router-dom";
import { db, functions } from "../../firebase";
import AdminLayout from "./AdminLayout";
import { usePagination } from "../../hooks/usePagination";
import { logAdminAction } from "../../adminTools/logAdminAction";

const USERS_PER_PAGE = 25;

export default function AdminPunten({ user }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [pendingRegs, setPendingRegs] = useState({});
  const [loading, setLoading] = useState(true);
  const [melding, setMelding] = useState(null); // { text, type: "success" | "error" }
  // Sorting: { field: "points_total"|"saldo"|"pending", dir: "desc"|"asc" } | null
  const [sort, setSort] = useState(null);

  // ─── Data laden ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadUsers() {
      try {
        const snap = await getDocs(collection(db, "users"));
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("AdminPunten loadUsers:", err);
        showMelding("Kon gebruikers niet laden.", "error");
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  useEffect(() => {
    async function loadPending() {
      const result = {};
      await Promise.all(
        users.map(async (u) => {
          try {
            const q = query(
              collection(db, "registrations"),
              where("installer_uid", "==", u.id),
              where("status", "==", "pending"),
            );
            const snap = await getDocs(q);
            result[u.id] = snap.size;
          } catch (err) {
            console.warn("Pending laden mislukt voor", u.id, err);
          }
        }),
      );
      setPendingRegs(result);
    }
    if (users.length > 0) loadPending();
  }, [users]);

  // ─── Filtering, sorting & paginatie ────────────────────────────────────────
  const filtered = useMemo(() => {
    const list = users.filter((u) => {
      const term = search.toLowerCase();
      return (
        (u.email || "").toLowerCase().includes(term) ||
        (u.installer_full_name || "").toLowerCase().includes(term) ||
        (u.installer_company || u.company_name || "").toLowerCase().includes(term)
      );
    });

    if (sort) {
      const getValue = (u) => {
        if (sort.field === "pending") return pendingRegs[u.id] || 0;
        if (sort.field === "uitgegeven") return (u.points_total || 0) - (u.saldo || 0);
        return u[sort.field] || 0;
      };
      const dir = sort.dir === "asc" ? 1 : -1;
      list.sort((a, b) => (getValue(a) - getValue(b)) * dir);
    }

    return list;
  }, [users, search, sort, pendingRegs]);

  const { page: safePage, setPage, totalPages, pageItems: usersToShow } = usePagination(filtered, USERS_PER_PAGE);

  // ─── Totalen ───────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let totalVerdiend = 0;
    let totalSaldo = 0;
    for (const u of users) {
      totalVerdiend += u.points_total || 0;
      totalSaldo += u.saldo || 0;
    }
    const totalUitgegeven = totalVerdiend - totalSaldo;
    return { totalVerdiend, totalSaldo, totalUitgegeven, count: users.length };
  }, [users]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function showMelding(text, type = "success") {
    setMelding({ text, type });
    setTimeout(() => setMelding(null), 4000);
  }

  function toggleSort(field) {
    setSort((prev) => {
      if (!prev || prev.field !== field) return { field, dir: "desc" };
      if (prev.dir === "desc") return { field, dir: "asc" };
      return null; // third click resets
    });
    setPage(1);
  }

  function sortArrow(field) {
    if (!sort || sort.field !== field) return "";
    return sort.dir === "desc" ? " \u25BC" : " \u25B2";
  }

  async function handleAdjust(uid, amount, reason) {
    try {
      const adjust = httpsCallable(functions, "adjustUserPoints");
      const result = await adjust({ uid, amount: Number(amount), reason });
      const { points_total: newTotal, saldo: newSaldo } = result.data;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === uid ? { ...u, points_total: newTotal, saldo: newSaldo } : u,
        ),
      );
      const target = users.find((u) => u.id === uid);
      showMelding(
        `${Number(amount) >= 0 ? "+" : ""}${amount} punten toegepast.`,
        "success",
      );
      logAdminAction({ type: "points_adjust", description: `${Number(amount) >= 0 ? "+" : ""}${amount} punten voor ${target?.email || uid}${reason ? ` (${reason})` : ""}`, collectionName: "users", adminUid: user?.uid, adminEmail: user?.email });
    } catch (err) {
      const msg = err.message || "Kon punten niet aanpassen.";
      showMelding(msg, "error");
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout user={user}>
      <h1 style={s.title}>Puntenbeheer</h1>

      {/* ── Samenvatting ────────────────────────────────────────────────── */}
      <div style={s.statsRow}>
        <StatCard label="Gebruikers" value={totals.count} color="#004aad" />
        <StatCard label="Totaal verdiend" value={`${totals.totalVerdiend} Drops`} color="#16a34a" />
        <StatCard label="Totaal beschikbaar" value={`${totals.totalSaldo} Drops`} color="#0066ff" />
        <StatCard label="Totaal uitgegeven" value={`${totals.totalUitgegeven} Drops`} color="#f59e0b" />
      </div>

      {/* ── Melding ─────────────────────────────────────────────────────── */}
      {melding && (
        <div style={{ ...s.melding, ...(melding.type === "error" ? s.meldingError : s.meldingSuccess) }}>
          {melding.text}
        </div>
      )}

      {/* ── Zoeken ──────────────────────────────────────────────────────── */}
      <div style={s.searchBar}>
        <input
          style={s.searchInput}
          placeholder="Zoek op naam, bedrijf of e-mail..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <span style={s.searchCount}>
          {filtered.length} resultaat{filtered.length === 1 ? "" : "en"}
        </span>
      </div>

      {/* ── Tabel ───────────────────────────────────────────────────────── */}
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
                  <th style={{ ...s.th, ...s.thSortable, textAlign: "right" }} onClick={() => toggleSort("points_total")}>
                    Totaal verdiend{sortArrow("points_total")}
                  </th>
                  <th style={{ ...s.th, ...s.thSortable, textAlign: "right" }} onClick={() => toggleSort("saldo")}>
                    Beschikbaar{sortArrow("saldo")}
                  </th>
                  <th style={{ ...s.th, ...s.thSortable, textAlign: "right" }} onClick={() => toggleSort("uitgegeven")}>
                    Uitgegeven{sortArrow("uitgegeven")}
                  </th>
                  <th style={{ ...s.th, ...s.thSortable, textAlign: "center" }} onClick={() => toggleSort("pending")}>
                    Openstaand{sortArrow("pending")}
                  </th>
                  <th style={s.th}>Punten aanpassen</th>
                </tr>
              </thead>
              <tbody>
                {usersToShow.map((u) => (
                  <UserPointsRow
                    key={u.id}
                    u={u}
                    pendingCount={pendingRegs[u.id] || 0}
                    onAdjust={handleAdjust}
                  />
                ))}
                {usersToShow.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                      Geen gebruikers gevonden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Paginatie ─────────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div style={s.pagination}>
              <button
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={s.pageBtn}
              >
                Vorige
              </button>
              <span style={s.pageInfo}>
                {safePage} / {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={s.pageBtn}
              >
                Volgende
              </button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

AdminPunten.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
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

function UserPointsRow({ u, pendingCount, onAdjust }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const userName = u.installer_full_name || [u.firstName, u.lastName].filter(Boolean).join(" ") || "";
  const company = u.installer_company || u.company_name || "";

  async function handleSubmit(e) {
    e.preventDefault();
    const num = Number(amount);
    if (!num || Number.isNaN(num)) return;
    if (!reason.trim()) return;

    const action = num >= 0 ? "bijschrijven" : "afschrijven";
    if (!window.confirm(
      `Weet je zeker dat je ${Math.abs(num)} punten wilt ${action} bij ${u.email}?\n\nReden: ${reason}`
    )) return;

    setBusy(true);
    try {
      await onAdjust(u.id, num, reason);
      setAmount("");
      setReason("");
      setExpanded(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr style={s.tableRow}>
        {/* Gebruiker */}
        <td style={s.td}>
          <div style={{ fontWeight: 600, color: "#111827" }}>{userName || u.email}</div>
          {company && <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{company}</div>}
          {userName && <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{u.email}</div>}
        </td>

        {/* Totaal verdiend */}
        <td style={{ ...s.td, textAlign: "right", fontWeight: 600 }}>
          {u.points_total || 0}
        </td>

        {/* Beschikbaar saldo */}
        <td style={{ ...s.td, textAlign: "right" }}>
          <span style={{
            fontWeight: 700,
            color: (u.saldo || 0) > 0 ? "#0066ff" : "#9ca3af",
          }}>
            {u.saldo || 0}
          </span>
        </td>

        {/* Uitgegeven */}
        <td style={{ ...s.td, textAlign: "right", color: "#f59e0b", fontWeight: 600 }}>
          {(u.points_total || 0) - (u.saldo || 0)}
        </td>

        {/* Openstaand */}
        <td style={{ ...s.td, textAlign: "center" }}>
          {pendingCount > 0 ? (
            <Link to={`/admin/registraties?user=${u.id}`} style={s.pendingBadge}>
              {pendingCount} open
            </Link>
          ) : (
            <span style={{ color: "#16a34a", fontSize: "0.85rem" }}>—</span>
          )}
        </td>

        {/* Actie */}
        <td style={s.td}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={s.adjustToggle}
          >
            {expanded ? "Annuleren" : "Aanpassen"}
          </button>
        </td>
      </tr>

      {/* ── Uitklapbare aanpassingsrij ──────────────────────────────── */}
      {expanded && (
        <tr>
          <td colSpan="6" style={s.expandedCell}>
            <form onSubmit={handleSubmit} style={s.adjustForm}>
              <div style={s.adjustField}>
                <label style={s.adjustLabel}>Aantal punten</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="+50 of -25"
                  style={s.adjustInput}
                  required
                />
              </div>
              <div style={{ ...s.adjustField, flex: 2 }}>
                <label style={s.adjustLabel}>Reden (verplicht)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Bijv. correctie, bonus, annulering..."
                  style={s.adjustInput}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                <button type="submit" disabled={busy || !amount || !reason.trim()} style={s.submitBtn}>
                  {busy ? "..." : "Toepassen"}
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

UserPointsRow.propTypes = {
  u: PropTypes.shape({
    id: PropTypes.string.isRequired,
    email: PropTypes.string,
    points_total: PropTypes.number,
    saldo: PropTypes.number,
    installer_full_name: PropTypes.string,
    installer_company: PropTypes.string,
    company_name: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
  }).isRequired,
  pendingCount: PropTypes.number.isRequired,
  onAdjust: PropTypes.func.isRequired,
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

  // Pending badge
  pendingBadge: { background: "#fef2f2", color: "#dc2626", padding: "2px 10px", borderRadius: 12, fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" },

  // Adjust toggle
  adjustToggle: { padding: "0.4rem 0.9rem", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: "0.82rem", cursor: "pointer", fontWeight: 500 },

  // Expanded adjustment form
  expandedCell: { padding: "0.75rem 1rem", background: "#f9fafb", borderBottom: "2px solid #e5e7eb" },
  adjustForm: { display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" },
  adjustField: { display: "flex", flexDirection: "column", flex: 1, minWidth: 120 },
  adjustLabel: { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" },
  adjustInput: { padding: "0.55rem 0.75rem", borderRadius: 6, border: "1px solid #d1d5db", fontSize: "0.9rem", outline: "none" },
  submitBtn: { padding: "0.55rem 1.2rem", borderRadius: 6, background: "#004aad", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", whiteSpace: "nowrap" },

  // Pagination
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1rem", padding: "0.75rem" },
  pageBtn: { padding: "0.45rem 1rem", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: "#374151" },
  pageInfo: { fontSize: "0.85rem", color: "#6b7280" },
};
