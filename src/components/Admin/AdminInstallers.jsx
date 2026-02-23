// src/components/Admin/AdminInstallers.jsx
import { useEffect, useState, Fragment } from "react";
import PropTypes from "prop-types";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase";
import AdminLayout from "./AdminLayout";
import { formatDate } from "../../utils/dateUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAddress(u) {
  if (u.installer_address) return u.installer_address;
  const parts = [
    u.street,
    u.houseNumber && `${u.houseNumber}${u.houseAddition || ""}`,
    u.postalCode && u.city && `${u.postalCode} ${u.city}`,
  ].filter(Boolean);
  return parts.join(", ") || null;
}

function getCompanyName(u) {
  return u.installer_company || u.company_name || "-";
}

function getFullName(u) {
  return u.installer_full_name || [u.firstName, u.lastName].filter(Boolean).join(" ") || "-";
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SyncStatusBadge({ u, processing }) {
  if (processing) {
    return <span style={bs.syncing}>⏳ Bezig...</span>;
  }
  if (u.compenda_id) {
    return (
      <div>
        <span style={bs.linked}>✅ Gekoppeld</span>
        <div style={{ marginTop: 4, fontSize: "0.8rem", color: "#1a7a3c", fontWeight: 700 }}>
          ID: {u.compenda_id}
        </div>
        {u.compenda_sync_date && (
          <div style={{ fontSize: "0.75rem", color: "#718096", marginTop: 2 }}>
            Gesynchroniseerd: {formatDate(u.compenda_sync_date)}
          </div>
        )}
      </div>
    );
  }
  return <span style={bs.unlinked}>⚪ Niet in Compenda</span>;
}

SyncStatusBadge.propTypes = {
  u: PropTypes.object.isRequired,
  processing: PropTypes.bool.isRequired,
};

function RegCountBadge({ counts }) {
  const total = counts.total || 0;
  if (total === 0) return <span style={{ color: "#a0aec0", fontSize: "0.85rem" }}>Geen</span>;
  return (
    <div style={{ fontSize: "0.85rem", lineHeight: "1.6" }}>
      <div><span style={bs.regTotal}>{total} totaal</span></div>
      {counts.pending > 0 && <div style={{ color: "#b45309" }}>● {counts.pending} open</div>}
      {counts.approved > 0 && <div style={{ color: "#15803d" }}>● {counts.approved} goedgekeurd</div>}
      {counts.rejected > 0 && <div style={{ color: "#b91c1c" }}>● {counts.rejected} afgekeurd</div>}
    </div>
  );
}

RegCountBadge.propTypes = {
  counts: PropTypes.shape({
    total: PropTypes.number,
    pending: PropTypes.number,
    approved: PropTypes.number,
    rejected: PropTypes.number,
  }).isRequired,
};

function InstallerDetailRow({ u, regCounts }) {
  const address = getAddress(u);
  return (
    <tr style={{ backgroundColor: "#f9fcff" }}>
      <td colSpan="7" style={{ padding: 0 }}>
        <div style={ds.wrapper}>
          <div style={ds.grid}>

            <div style={ds.section}>
              <div style={ds.sectionTitle}>Contactgegevens</div>
              <Field label="Naam" value={getFullName(u)} />
              <Field label="Bedrijf" value={getCompanyName(u)} />
              <Field label="E-mail" value={u.email} />
              <Field label="Telefoon" value={u.installer_phone || "-"} />
              <Field label="KVK-nummer" value={u.installer_kvk || "-"} />
            </div>

            <div style={ds.section}>
              <div style={ds.sectionTitle}>Adres</div>
              {address
                ? <div style={ds.value}>{address}</div>
                : <div style={{ color: "#a0aec0", fontStyle: "italic", fontSize: "0.9rem" }}>Geen adres ingevuld</div>
              }
              <div style={{ marginTop: "1rem" }}>
                <div style={ds.sectionTitle}>Account</div>
                <Field label="UID" value={u.id} mono />
                <Field label="Aangemaakt" value={formatDate(u.createdAt)} />
                <Field label="Profiel compleet" value={u.profile_completed ? "Ja" : "Nee"} />
                <Field label="Rol" value={u.role || "user"} />
              </div>
            </div>

            <div style={ds.section}>
              <div style={ds.sectionTitle}>Compenda Koppeling</div>
              {u.compenda_id ? (
                <>
                  <Field label="Compenda ID" value={u.compenda_id} highlight />
                  {u.compenda_company_id && u.compenda_company_id !== u.compenda_id && (
                    <Field label="Company ID" value={u.compenda_company_id} />
                  )}
                  {u.compenda_sync_date && (
                    <Field label="Laatste sync" value={formatDate(u.compenda_sync_date)} />
                  )}
                </>
              ) : (
                <div style={{ color: "#a0aec0", fontStyle: "italic", fontSize: "0.9rem" }}>
                  Nog niet gesynchroniseerd met Compenda.<br />
                  Gebruik de Sync-knop om deze installateur aan te maken.
                </div>
              )}
              <div style={{ marginTop: "1rem" }}>
                <div style={ds.sectionTitle}>Punten & Saldo</div>
                <Field label="Punten totaal" value={u.points_total ?? 0} />
                <Field label="Saldo" value={u.saldo ?? 0} />
                <Field label="Punten pending" value={u.points_pending ?? 0} />
              </div>
            </div>

            <div style={ds.section}>
              <div style={ds.sectionTitle}>Registraties</div>
              <Field label="Totaal" value={regCounts.total} />
              <Field label="Open (pending)" value={regCounts.pending} warn={regCounts.pending > 0} />
              <Field label="Goedgekeurd" value={regCounts.approved} />
              <Field label="Afgekeurd" value={regCounts.rejected} />
            </div>

          </div>
        </div>
      </td>
    </tr>
  );
}

InstallerDetailRow.propTypes = {
  u: PropTypes.object.isRequired,
  regCounts: PropTypes.object.isRequired,
};

function Field({ label, value, mono, highlight, warn }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#718096", fontWeight: 600, letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{
        fontSize: mono ? "0.78rem" : "0.9rem",
        fontFamily: mono ? "monospace" : "inherit",
        color: highlight ? "#1a56db" : warn ? "#b45309" : "#1a202c",
        fontWeight: highlight || warn ? 700 : 400,
        wordBreak: "break-all",
      }}>
        {value ?? "-"}
      </div>
    </div>
  );
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  mono: PropTypes.bool,
  highlight: PropTypes.bool,
  warn: PropTypes.bool,
};

// ─── Main Component ───────────────────────────────────────────────────────────

const BATCH_SIZE = 3;

export default function AdminInstallers({ user }) {
  const [users, setUsers] = useState([]);
  const [regCounts, setRegCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  // Set of UIDs currently being synced — supports concurrent syncs
  const [processingIds, setProcessingIds] = useState(new Set());
  const [syncErrors, setSyncErrors] = useState({});
  const [bulkProgress, setBulkProgress] = useState(null); // { done, total } or null

  const addProcessing = (uid) =>
    setProcessingIds((prev) => new Set(prev).add(uid));
  const removeProcessing = (uid) =>
    setProcessingIds((prev) => { const next = new Set(prev); next.delete(uid); return next; });

  const fetchRegCounts = async () => {
    try {
      const snap = await getDocs(collection(db, "registrations"));
      const counts = {};
      snap.docs.forEach((d) => {
        const { installer_uid, status } = d.data();
        if (!installer_uid) return;
        if (!counts[installer_uid]) {
          counts[installer_uid] = { total: 0, pending: 0, approved: 0, rejected: 0 };
        }
        counts[installer_uid].total++;
        if (status === "pending") counts[installer_uid].pending++;
        else if (status === "approved") counts[installer_uid].approved++;
        else if (status === "rejected") counts[installer_uid].rejected++;
      });
      setRegCounts(counts);
    } catch (err) {
      console.error("AdminInstallers fetchRegCounts error:", err);
    }
  };

  // Real-time listener for users — picks up Compenda ID written by backend automatically
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.role !== "admin")
          .sort((a) => (a.compenda_id ? 1 : -1));
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        console.error("AdminInstallers onSnapshot error:", err);
        setLoading(false);
      }
    );
    fetchRegCounts();
    return () => unsub();
  }, []);

  // Fire-and-forget: returns immediately, onSnapshot picks up the result
  const fireSync = (targetUser) => {
    addProcessing(targetUser.id);
    setSyncErrors((prev) => { const next = { ...prev }; delete next[targetUser.id]; return next; });

    httpsCallable(functions, "syncInstallerToCompenda")({ installerUid: targetUser.id })
      .catch((err) => {
        console.error("AdminInstallers sync error:", err);
        setSyncErrors((prev) => ({ ...prev, [targetUser.id]: err.message }));
      })
      .finally(() => removeProcessing(targetUser.id));
  };

  const handleBulkSync = async () => {
    const unsynced = users.filter((u) => !u.compenda_id);
    if (unsynced.length === 0) {
      alert("Alle installateurs zijn al gekoppeld aan Compenda!");
      return;
    }
    if (!window.confirm(
      `⚠️ BULK SYNC\n\n${unsynced.length} installateurs worden in batches van ${BATCH_SIZE} tegelijk gesynchroniseerd.\n\nJe kunt de pagina gewoon gebruiken terwijl dit loopt.`
    )) return;

    setBulkProgress({ done: 0, total: unsynced.length });

    // Process in concurrent batches of BATCH_SIZE
    for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
      const batch = unsynced.slice(i, i + BATCH_SIZE);
      // Fire all in this batch at once, wait for all to settle
      await Promise.allSettled(
        batch.map((u) =>
          httpsCallable(functions, "syncInstallerToCompenda")({ installerUid: u.id })
            .then(() => removeProcessing(u.id))
            .catch((err) => {
              console.error("Bulk sync error for", u.id, err);
              setSyncErrors((prev) => ({ ...prev, [u.id]: err.message }));
              removeProcessing(u.id);
            })
        )
      );
      setBulkProgress((p) => ({ ...p, done: Math.min(i + BATCH_SIZE, unsynced.length) }));
    }

    setBulkProgress(null);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      getFullName(u).toLowerCase().includes(q) ||
      getCompanyName(u).toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.installer_phone || "").includes(q) ||
      (u.installer_kvk || "").includes(q)
    );
  });

  const syncedCount = users.filter((u) => !!u.compenda_id).length;
  const unsyncedCount = users.length - syncedCount;

  return (
    <AdminLayout user={user}>
      {/* Header */}
      <div style={s.headerCard}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem" }}>Beheer Installateurs (Compenda Sync)</h1>
          <p style={{ color: "#718096", marginTop: 4, marginBottom: 0 }}>
            Koppel installateurs aan Compenda. Klik een rij voor alle details.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <button
            onClick={handleBulkSync}
            disabled={bulkProgress !== null || loading || unsyncedCount === 0}
            style={{
              ...s.bulkBtn,
              backgroundColor: bulkProgress !== null || unsyncedCount === 0 ? "#9ca3af" : "#059669",
              cursor: bulkProgress !== null || unsyncedCount === 0 ? "default" : "pointer",
            }}
          >
            {bulkProgress !== null
              ? `⏳ Bezig ${bulkProgress.done}/${bulkProgress.total}...`
              : `🚀 Sync ongekoppeld (${unsyncedCount})`}
          </button>
          <button onClick={fetchRegCounts} disabled={loading} style={s.refreshBtn}>
            🔄 Registraties vernieuwen
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={s.statsRow}>
        <StatCard label="Totaal installateurs" value={users.length} color="#3b82f6" />
        <StatCard label="Gekoppeld aan Compenda" value={syncedCount} color="#059669" />
        <StatCard label="Nog niet in Compenda" value={unsyncedCount} color={unsyncedCount > 0 ? "#dc2626" : "#9ca3af"} />
        <StatCard label="Totaal registraties" value={Object.values(regCounts).reduce((s, c) => s + c.total, 0)} color="#7c3aed" />
      </div>

      {/* Search */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          className="input"
          placeholder="Zoek op naam, bedrijf, e-mail, telefoon of KVK..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 500 }}
        />
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#718096" }}>
          ⏳ Installateurs en registraties laden...
        </div>
      ) : (
        <div style={s.tableCard}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Bedrijf / Naam</th>
                <th style={s.th}>E-mail & Telefoon</th>
                <th style={s.th}>KVK</th>
                <th style={s.th}>Punten</th>
                <th style={s.th}>Registraties</th>
                <th style={s.th}>Compenda</th>
                <th style={s.th}>Actie</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: "2rem", textAlign: "center", color: "#a0aec0" }}>
                    Geen installateurs gevonden.
                  </td>
                </tr>
              )}
              {filtered.map((u) => {
                const counts = regCounts[u.id] || { total: 0, pending: 0, approved: 0, rejected: 0 };
                const isExpanded = expandedId === u.id;
                const isProcessing = processingIds.has(u.id);

                return (
                  <Fragment key={u.id}>
                    <tr
                      style={{
                        ...s.tr,
                        backgroundColor: isProcessing
                          ? "#fffbeb"
                          : isExpanded
                          ? "#eff6ff"
                          : "white",
                        borderLeft: isProcessing
                          ? "4px solid #f59e0b"
                          : isExpanded
                          ? "4px solid #3b82f6"
                          : "4px solid transparent",
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : u.id)}
                    >
                      <td style={s.td}>
                        <div style={{ fontWeight: 700, color: "#1a202c" }}>{getCompanyName(u)}</div>
                        <div style={{ fontSize: "0.85rem", color: "#718096" }}>{getFullName(u)}</div>
                      </td>

                      <td style={s.td}>
                        <div style={{ fontSize: "0.9rem" }}>{u.email || "-"}</div>
                        <div style={{ fontSize: "0.82rem", color: "#4a5568", marginTop: 2 }}>
                          {u.installer_phone || <span style={{ color: "#cbd5e0" }}>geen telefoon</span>}
                        </div>
                      </td>

                      <td style={s.td}>
                        <div style={{ fontSize: "0.85rem", fontFamily: "monospace", color: "#4a5568" }}>
                          {u.installer_kvk || <span style={{ color: "#cbd5e0" }}>-</span>}
                        </div>
                      </td>

                      <td style={s.td}>
                        <div style={{ fontWeight: 600, color: "#1a202c" }}>{u.points_total ?? 0}</div>
                        {(u.points_pending ?? 0) > 0 && (
                          <div style={{ fontSize: "0.78rem", color: "#b45309" }}>
                            +{u.points_pending} pending
                          </div>
                        )}
                      </td>

                      <td style={s.td}>
                        <RegCountBadge counts={counts} />
                      </td>

                      <td style={s.td}>
                        <SyncStatusBadge u={u} processing={isProcessing} />
                      </td>

                      <td style={s.td} onClick={(e) => e.stopPropagation()}>
                        {syncErrors[u.id] && (
                          <div style={{ fontSize: "0.75rem", color: "#dc2626", marginBottom: 4 }}>
                            ❌ {syncErrors[u.id]}
                          </div>
                        )}
                        <button
                          onClick={() => fireSync(u)}
                          disabled={isProcessing || bulkProgress !== null}
                          style={{
                            ...s.syncBtn,
                            backgroundColor: u.compenda_id ? "#4a5568" : "#3b82f6",
                            opacity: isProcessing || bulkProgress !== null ? 0.5 : 1,
                          }}
                        >
                          {isProcessing ? "⏳" : u.compenda_id ? "Update" : "Sync →"}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <InstallerDetailRow u={u} regCounts={counts} />
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

AdminInstallers.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...s.statCard, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: "1.6rem", fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: "0.78rem", color: "#718096", marginTop: 2 }}>{label}</div>
    </div>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  headerCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    background: "white",
    padding: "20px 24px",
    borderRadius: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    marginBottom: 16,
  },
  bulkBtn: {
    color: "white",
    border: "none",
    padding: "10px 18px",
    borderRadius: 6,
    fontWeight: 700,
    fontSize: "0.9rem",
    transition: "all 0.2s",
  },
  refreshBtn: {
    background: "transparent",
    border: "1px solid #e2e8f0",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: "0.82rem",
    cursor: "pointer",
    color: "#4a5568",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    background: "white",
    padding: "14px 16px",
    borderRadius: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  tableCard: {
    background: "white",
    borderRadius: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.92rem",
  },
  thead: {
    backgroundColor: "#f8fafc",
    borderBottom: "2px solid #e2e8f0",
    textAlign: "left",
  },
  th: {
    padding: "12px 14px",
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#64748b",
    fontWeight: 700,
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background-color 0.15s",
  },
  td: {
    padding: "13px 14px",
    verticalAlign: "middle",
  },
  syncBtn: {
    color: "white",
    border: "none",
    padding: "6px 14px",
    borderRadius: 5,
    fontSize: "0.85rem",
    cursor: "pointer",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
};

// Badge styles
const bs = {
  linked: {
    display: "inline-block",
    backgroundColor: "#d1fae5",
    color: "#065f46",
    padding: "3px 10px",
    borderRadius: 9999,
    fontSize: "0.78rem",
    fontWeight: 700,
  },
  unlinked: {
    display: "inline-block",
    color: "#a0aec0",
    fontSize: "0.82rem",
    fontStyle: "italic",
  },
  syncing: {
    display: "inline-block",
    color: "#b45309",
    fontSize: "0.82rem",
  },
  regTotal: {
    fontWeight: 700,
    color: "#374151",
  },
};

// Detail panel styles
const ds = {
  wrapper: {
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    borderLeft: "4px solid #3b82f6",
    backgroundColor: "#f8faff",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 24,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  sectionTitle: {
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#3b82f6",
    fontWeight: 800,
    marginBottom: 8,
    borderBottom: "1px solid #dbeafe",
    paddingBottom: 4,
  },
  value: {
    fontSize: "0.9rem",
    color: "#1a202c",
    whiteSpace: "pre-wrap",
  },
};
