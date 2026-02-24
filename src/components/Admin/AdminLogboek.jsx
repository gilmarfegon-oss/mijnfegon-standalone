// src/components/Admin/AdminLogboek.jsx
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase";
import AdminLayout from "./AdminLayout";
import { usePagination } from "../../hooks/usePagination";

// ─── Constants ───────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 30;

const TYPE_FILTERS = [
  { key: "all",          label: "Alle" },
  { key: "registration", label: "Registraties" },
  { key: "order",        label: "Bestellingen" },
  { key: "user",         label: "Gebruikers" },
  { key: "points",       label: "Punten" },
  { key: "product",      label: "Producten" },
  { key: "linking",      label: "Koppelingen" },
  { key: "import",       label: "Import/Export" },
  { key: "other",        label: "Overig" },
];

function mapTypeToGroup(type) {
  if (!type) return "other";
  if (type.startsWith("registration_")) return "registration";
  if (type.startsWith("order_")) return "order";
  if (type.startsWith("user_")) return "user";
  if (type.startsWith("points_")) return "points";
  if (type.startsWith("product_") || type.startsWith("category_")) return "product";
  if (type.startsWith("linking_")) return "linking";
  if (type.startsWith("import_") || type.startsWith("export_")) return "import";
  return "other";
}

function getGroupColor(group) {
  switch (group) {
    case "registration": return { bg: "#ebf8ff", color: "#2b6cb0" };
    case "order":        return { bg: "#fffbeb", color: "#b45309" };
    case "user":         return { bg: "#f3e8ff", color: "#7c3aed" };
    case "points":       return { bg: "#ecfdf5", color: "#065f46" };
    case "product":      return { bg: "#fef2f2", color: "#991b1b" };
    case "linking":      return { bg: "#e0f2fe", color: "#0369a1" };
    case "import":       return { bg: "#f0fdf4", color: "#15803d" };
    default:             return { bg: "#f3f4f6", color: "#6b7280" };
  }
}

function toDate(val) {
  if (!val) return new Date(0);
  if (val.toDate) return val.toDate();
  const d = new Date(val);
  return isNaN(d) ? new Date(0) : d;
}

function formatDateTime(val) {
  const d = toDate(val);
  if (d.getTime() === 0) return "—";
  return d.toLocaleString("nl-NL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminLogboek({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "createdAt", dir: "desc" });
  const [melding, setMelding] = useState(null);

  useEffect(() => {
    try {
      const ref = collection(db, "logs_admin");
      const q = query(ref, orderBy("createdAt", "desc"), limit(500));

      const unsub = onSnapshot(q, (snap) => {
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, (err) => {
        console.error("AdminLogboek onSnapshot error:", err);
        setMelding({ text: "Kon logboek niet laden (rechten of netwerkprobleem).", type: "error" });
        setLoading(false);
      });

      return () => unsub();
    } catch (err) {
      console.error("AdminLogboek init error:", err);
      setMelding({ text: "Fout bij initialiseren logboek.", type: "error" });
      setLoading(false);
    }
  }, []);

  // ─── Metrics ────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const total = logs.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = logs.filter((l) => {
      const d = toDate(l.createdAt || l.timestamp);
      return d >= today;
    }).length;
    return { total, todayCount };
  }, [logs]);

  // ─── Filter + Sort ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = logs;

    // Type filter
    if (filterType !== "all") {
      list = list.filter((l) => mapTypeToGroup(l.type) === filterType);
    }

    // Search — on description, adminEmail, type
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((l) =>
        (l.description || "").toLowerCase().includes(term) ||
        (l.adminEmail || "").toLowerCase().includes(term) ||
        (l.type || "").toLowerCase().includes(term) ||
        (l.collectionName || "").toLowerCase().includes(term)
      );
    }

    // Sort
    if (sort) {
      list = [...list].sort((a, b) => {
        const dir = sort.dir === "asc" ? 1 : -1;
        switch (sort.field) {
          case "createdAt":
            return (toDate(a.createdAt || a.timestamp).getTime() - toDate(b.createdAt || b.timestamp).getTime()) * dir;
          case "adminEmail":
            return (a.adminEmail || "").localeCompare(b.adminEmail || "") * dir;
          case "type":
            return (a.type || "").localeCompare(b.type || "") * dir;
          case "description":
            return (a.description || "").localeCompare(b.description || "") * dir;
          default:
            return 0;
        }
      });
    }

    return list;
  }, [logs, filterType, search, sort]);

  // ─── Pagination ─────────────────────────────────────────────────────

  const { page: safePage, setPage, totalPages, pageItems } = usePagination(filtered, ITEMS_PER_PAGE);

  // ─── Helpers ────────────────────────────────────────────────────────

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

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <AdminLayout user={user}>
      <h1 style={s.title}>Logboek</h1>

      {/* Mini Dashboard */}
      <div style={s.statsRow}>
        <StatCard label="Totaal logs"  value={metrics.total}      color="#004aad" />
        <StatCard label="Vandaag"      value={metrics.todayCount}  color="#16a34a" />
      </div>

      {/* Melding */}
      {melding && (
        <div style={{ ...s.melding, ...(melding.type === "error" ? s.meldingError : s.meldingSuccess) }}>
          {melding.text}
        </div>
      )}

      {/* Type tabs */}
      <div style={s.tabBar}>
        {TYPE_FILTERS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setFilterType(t.key); setPage(1); }}
            style={{ ...s.tabBtn, ...(filterType === t.key ? s.tabBtnActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={s.searchBar}>
        <input
          style={s.searchInput}
          placeholder="Zoek op omschrijving, admin, type of collectie..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <span style={s.searchCount}>
          {filtered.length} resultaat{filtered.length === 1 ? "" : "en"}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Logboek laden...</p>
      ) : (
        <>
          <div style={s.tableCard}>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr style={s.tableHead}>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("createdAt")}>
                      Tijd{sortArrow("createdAt")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("adminEmail")}>
                      Admin{sortArrow("adminEmail")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("type")}>
                      Type{sortArrow("type")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("description")}>
                      Omschrijving{sortArrow("description")}
                    </th>
                    <th style={s.th}>Collectie</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                        Geen logregels gevonden.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((log) => {
                      const group = mapTypeToGroup(log.type);
                      const groupColor = getGroupColor(group);
                      return (
                        <tr key={log.id} style={s.tableRow}>
                          <td style={{ ...s.td, whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                            {formatDateTime(log.createdAt || log.timestamp)}
                          </td>
                          <td style={s.td}>
                            <div style={{ fontWeight: 500 }}>{log.adminEmail || "Onbekend"}</div>
                          </td>
                          <td style={s.td}>
                            <span style={{ ...s.typeBadge, background: groupColor.bg, color: groupColor.color }}>
                              {log.type || "—"}
                            </span>
                          </td>
                          <td style={{ ...s.td, maxWidth: 400, fontSize: "0.9rem" }}>
                            {log.description || "—"}
                          </td>
                          <td style={{ ...s.td, fontSize: "0.85rem", color: "#6b7280" }}>
                            {log.collectionName || log.collection || "—"}
                          </td>
                        </tr>
                      );
                    })
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

AdminLogboek.propTypes = {
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
  title: { margin: "0 0 1.5rem", fontSize: "1.5rem", color: "#111827" },

  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" },
  statCard: { background: "#fff", padding: "1rem 1.2rem", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  statLabel: { fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "#6b7280", marginBottom: 4 },
  statValue: { fontSize: "1.3rem", fontWeight: 700, color: "#111827" },

  melding: { padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 500 },
  meldingSuccess: { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" },
  meldingError: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },

  tabBar: { display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" },
  tabBtn: { padding: "0.4rem 0.75rem", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", transition: "all 0.15s" },
  tabBtnActive: { background: "#004aad", color: "#fff", border: "1px solid #004aad" },

  searchBar: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" },
  searchInput: { flex: 1, padding: "0.7rem 1rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.95rem", outline: "none" },
  searchCount: { fontSize: "0.82rem", color: "#9ca3af", whiteSpace: "nowrap" },

  tableCard: { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "800px" },
  tableHead: { background: "#f9fafb" },
  th: { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#6b7280", borderBottom: "1px solid #e5e7eb", userSelect: "none" },
  thSortable: { cursor: "pointer", whiteSpace: "nowrap" },
  tableRow: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "0.75rem 1rem", verticalAlign: "middle" },

  typeBadge: { padding: "3px 8px", borderRadius: 12, fontSize: "0.78rem", fontWeight: 600, display: "inline-block", whiteSpace: "nowrap" },

  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1rem", padding: "0.75rem" },
  pageBtn: { padding: "0.45rem 1rem", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: "#374151" },
  pageInfo: { fontSize: "0.85rem", color: "#6b7280" },
};
