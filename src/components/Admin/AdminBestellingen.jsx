// src/components/Admin/AdminBestellingen.jsx
import { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { db } from "../../firebase";
import { collection, onSnapshot, doc, updateDoc, getDoc, query, orderBy } from "firebase/firestore";
import AdminLayout from "./AdminLayout";
import { usePagination } from "../../hooks/usePagination";
import { logAdminAction } from "../../adminTools/logAdminAction";

// ─── Constants ───────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20;

const STATUS_OPTIONS = ["Nieuw", "In behandeling", "Verzonden", "Geannuleerd"];

const STATUS_TABS = [
  { key: "all",             label: "Alle" },
  { key: "Nieuw",           label: "Nieuw" },
  { key: "In behandeling",  label: "In Behandeling" },
  { key: "Verzonden",       label: "Verzonden" },
  { key: "Geannuleerd",     label: "Geannuleerd" },
];

function toDate(val) {
  if (!val) return new Date(0);
  if (val.toDate) return val.toDate();
  const d = new Date(val);
  return isNaN(d) ? new Date(0) : d;
}

function formatDateNL(val) {
  const d = toDate(val);
  if (d.getTime() === 0) return "—";
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getStatusStyle(status) {
  switch (status) {
    case "Nieuw":           return { background: "#fff5f5", color: "#c53030" };
    case "In behandeling":  return { background: "#fffbeb", color: "#b45309" };
    case "Verzonden":       return { background: "#ecfdf5", color: "#065f46" };
    case "Geannuleerd":     return { background: "#f3f4f6", color: "#6b7280" };
    default:                return { background: "#ebf8ff", color: "#2b6cb0" };
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminBestellingen({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Nieuw");
  const [sort, setSort] = useState({ field: "createdAt", dir: "desc" });
  const [adminLastLogin, setAdminLastLogin] = useState(null);
  const [melding, setMelding] = useState(null);

  // Fetch admin's last_login
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setAdminLastLogin(snap.data().last_login || null);
      } catch (err) {
        console.error("Fout bij laden admin data:", err);
      }
    })();
  }, [user]);

  // Realtime orders listener
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Fout bij ophalen bestellingen:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Dashboard metrics ──────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const total = orders.length;
    const nieuw = orders.filter((o) => o.status === "Nieuw").length;
    const inBehandeling = orders.filter((o) => o.status === "In behandeling").length;
    const verzonden = orders.filter((o) => o.status === "Verzonden").length;
    const geannuleerd = orders.filter((o) => o.status === "Geannuleerd").length;

    let newSinceLogin = 0;
    if (adminLastLogin) {
      const loginDate = toDate(adminLastLogin);
      newSinceLogin = orders.filter((o) => toDate(o.createdAt) > loginDate).length;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = orders.filter((o) => toDate(o.createdAt) >= startOfMonth).length;

    return { total, nieuw, inBehandeling, verzonden, geannuleerd, newSinceLogin, thisMonth };
  }, [orders, adminLastLogin]);

  // ─── Filter + Sort pipeline ─────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = orders;

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }

    // Search
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((o) =>
        (o.userName || "").toLowerCase().includes(term) ||
        (o.userEmail || "").toLowerCase().includes(term) ||
        (o.productName || "").toLowerCase().includes(term)
      );
    }

    // Sort
    if (sort) {
      list = [...list].sort((a, b) => {
        const dir = sort.dir === "asc" ? 1 : -1;
        switch (sort.field) {
          case "createdAt":
            return (toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()) * dir;
          case "userName":
            return (a.userName || "").localeCompare(b.userName || "") * dir;
          case "productName":
            return (a.productName || "").localeCompare(b.productName || "") * dir;
          case "price":
            return ((a.price || 0) - (b.price || 0)) * dir;
          case "status":
            return (a.status || "").localeCompare(b.status || "") * dir;
          default:
            return 0;
        }
      });
    }

    return list;
  }, [orders, statusFilter, search, sort]);

  // ─── Pagination ─────────────────────────────────────────────────────────

  const { page: safePage, setPage, totalPages, pageItems } = usePagination(filtered, ITEMS_PER_PAGE);

  // ─── Helpers ────────────────────────────────────────────────────────────

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

  function handleTabChange(key) {
    setStatusFilter(key);
    setPage(1);
  }

  function showMelding(text, type = "success") {
    setMelding({ text, type });
    setTimeout(() => setMelding(null), 4000);
  }

  // ─── Action handlers ───────────────────────────────────────────────────

  const updateStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      showMelding(`Status bijgewerkt naar "${newStatus}"`);
      logAdminAction({ type: "order_status", description: `Bestelling ${orderId} status gewijzigd naar "${newStatus}"`, collectionName: "orders", adminUid: user?.uid, adminEmail: user?.email });
    } catch (err) {
      showMelding("Fout: " + err.message, "error");
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <AdminLayout user={user}>
      <h1 style={s.title}>Bestellingen Beheren</h1>

      {/* Mini Dashboard */}
      <div style={s.statsRow}>
        <StatCard label="Totaal"            value={metrics.total}          color="#004aad" />
        <StatCard label="Nieuw"             value={metrics.nieuw}          color="#c53030" />
        <StatCard label="Nieuw sinds login" value={metrics.newSinceLogin}  color="#7c3aed" />
        <StatCard label="In Behandeling"    value={metrics.inBehandeling}  color="#b45309" />
        <StatCard label="Verzonden"         value={metrics.verzonden}      color="#16a34a" />
        <StatCard label="Geannuleerd"       value={metrics.geannuleerd}    color="#6b7280" />
      </div>

      {/* Melding banner */}
      {melding && (
        <div style={{ ...s.melding, ...(melding.type === "error" ? s.meldingError : s.meldingSuccess) }}>
          {melding.text}
        </div>
      )}

      {/* Status tabs */}
      <div style={s.tabBar}>
        {STATUS_TABS.map((tab) => {
          const count = tab.key === "all" ? metrics.total
            : tab.key === "Nieuw" ? metrics.nieuw
            : tab.key === "In behandeling" ? metrics.inBehandeling
            : tab.key === "Verzonden" ? metrics.verzonden
            : metrics.geannuleerd;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{ ...s.tabBtn, ...(statusFilter === tab.key ? s.tabBtnActive : {}) }}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div style={s.searchBar}>
        <input
          style={s.searchInput}
          placeholder="Zoek op gebruiker, e-mail of product..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <span style={s.searchCount}>
          {filtered.length} resultaat{filtered.length === 1 ? "" : "en"}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Bestellingen laden...</p>
      ) : (
        <>
          <div style={s.tableCard}>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr style={s.tableHead}>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("createdAt")}>
                      Datum{sortArrow("createdAt")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("userName")}>
                      Gebruiker{sortArrow("userName")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("productName")}>
                      Product{sortArrow("productName")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("price")}>
                      Drops{sortArrow("price")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("status")}>
                      Status{sortArrow("status")}
                    </th>
                    <th style={s.th}>Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                        Geen bestellingen gevonden.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((o) => (
                      <tr key={o.id} style={s.tableRow}>
                        <td style={{ ...s.td, whiteSpace: "nowrap" }}>{formatDateNL(o.createdAt)}</td>
                        <td style={s.td}>
                          <div style={{ fontWeight: 600, color: "#111827" }}>{o.userName || "Onbekend"}</div>
                          {o.userEmail && (
                            <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{o.userEmail}</div>
                          )}
                        </td>
                        <td style={s.td}>
                          <strong>{o.productName || "-"}</strong>
                        </td>
                        <td style={s.td}>{o.price || 0} Drops</td>
                        <td style={s.td}>
                          <span style={{ ...s.statusBadge, ...getStatusStyle(o.status) }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={s.td}>
                          <select
                            onChange={(e) => updateStatus(o.id, e.target.value)}
                            value={o.status}
                            style={s.select}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
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

AdminBestellingen.propTypes = {
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
  value: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  // Header
  title: { margin: "0 0 1.5rem", fontSize: "1.5rem", color: "#111827" },

  // Stats
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" },
  statCard: { background: "#fff", padding: "1rem 1.2rem", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  statLabel: { fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "#6b7280", marginBottom: 4 },
  statValue: { fontSize: "1.3rem", fontWeight: 700, color: "#111827" },

  // Melding
  melding: { padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 500 },
  meldingSuccess: { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" },
  meldingError: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },

  // Tabs
  tabBar: { display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" },
  tabBtn: { padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", transition: "all 0.15s" },
  tabBtnActive: { background: "#004aad", color: "#fff", border: "1px solid #004aad" },

  // Search
  searchBar: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" },
  searchInput: { flex: 1, padding: "0.7rem 1rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.95rem", outline: "none" },
  searchCount: { fontSize: "0.82rem", color: "#9ca3af", whiteSpace: "nowrap" },

  // Table
  tableCard: { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "700px" },
  tableHead: { background: "#f9fafb" },
  th: { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#6b7280", borderBottom: "1px solid #e5e7eb", userSelect: "none" },
  thSortable: { cursor: "pointer", whiteSpace: "nowrap" },
  tableRow: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "0.75rem 1rem", verticalAlign: "middle" },

  // Badge & select
  statusBadge: { padding: "4px 8px", borderRadius: 12, fontSize: "0.85rem", fontWeight: 600, display: "inline-block" },
  select: { padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.85rem", cursor: "pointer", background: "#fff" },

  // Pagination
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1rem", padding: "0.75rem" },
  pageBtn: { padding: "0.45rem 1rem", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: "#374151" },
  pageInfo: { fontSize: "0.85rem", color: "#6b7280" },
};
