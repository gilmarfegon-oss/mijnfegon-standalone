// src/components/Admin/AdminKoppelen.jsx
import { useEffect, useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { db, auth } from "../../firebase";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import AdminLayout from "./AdminLayout";
import { usePagination } from "../../hooks/usePagination";
import { logAdminAction } from "../../adminTools/logAdminAction";

// ─── Constants ───────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20;

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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminKoppelen({ user }) {
  const [registrations, setRegistrations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "created_at", dir: "desc" });
  const [melding, setMelding] = useState(null);
  const [selectedLinks, setSelectedLinks] = useState({});
  const [linkingIds, setLinkingIds] = useState(new Set());
  const [bulkLinking, setBulkLinking] = useState(false);

  // Load all users once
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Fout bij laden users:", err);
      }
    })();
  }, []);

  // Realtime registrations listener — filter unlinked client-side
  useEffect(() => {
    const q = query(collection(db, "registrations"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRegistrations(all.filter((r) => !r.installer_uid));
      setLoading(false);
    }, (err) => {
      console.error("Fout bij ophalen registraties:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Build user lookup by email ─────────────────────────────────────────

  const usersByEmail = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      if (u.email) map[u.email.toLowerCase()] = u;
    });
    return map;
  }, [users]);

  // ─── Enrich registrations with auto-match ───────────────────────────────

  const enriched = useMemo(() => {
    return registrations.map((reg) => {
      const email = (reg.installer_email || "").toLowerCase();
      const match = email ? usersByEmail[email] || null : null;
      return { ...reg, autoMatch: match };
    });
  }, [registrations, usersByEmail]);

  // ─── Metrics ────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const total = enriched.length;
    const autoMatched = enriched.filter((r) => r.autoMatch).length;
    const manual = total - autoMatched;
    return { total, autoMatched, manual };
  }, [enriched]);

  // ─── Filter + Sort ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = enriched;

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((r) =>
        (r.installer_email || "").toLowerCase().includes(term) ||
        (r.installer_name || "").toLowerCase().includes(term) ||
        (r.product_serial_number || r.serial || "").toLowerCase().includes(term) ||
        (r.product_brand || r.brand || "").toLowerCase().includes(term) ||
        (r.customer_last_name || "").toLowerCase().includes(term) ||
        (r.customer_email || "").toLowerCase().includes(term)
      );
    }

    if (sort) {
      list = [...list].sort((a, b) => {
        const dir = sort.dir === "asc" ? 1 : -1;
        switch (sort.field) {
          case "created_at":
            return (toDate(a.created_at || a.createdAt).getTime() - toDate(b.created_at || b.createdAt).getTime()) * dir;
          case "installer_email":
            return (a.installer_email || "").localeCompare(b.installer_email || "") * dir;
          case "product":
            return ((a.product_brand || a.brand || "") + (a.product_serial_number || a.serial || ""))
              .localeCompare((b.product_brand || b.brand || "") + (b.product_serial_number || b.serial || "")) * dir;
          case "match":
            return ((a.autoMatch ? 0 : 1) - (b.autoMatch ? 0 : 1)) * dir;
          default:
            return 0;
        }
      });
    }

    return list;
  }, [enriched, search, sort]);

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

  function showMelding(text, type = "success") {
    setMelding({ text, type });
    setTimeout(() => setMelding(null), 5000);
  }

  // ─── Link actions ──────────────────────────────────────────────────────

  const linkSingle = useCallback(async (regId, installerUid) => {
    if (!installerUid) return;
    setLinkingIds((prev) => new Set(prev).add(regId));

    try {
      await updateDoc(doc(db, "registrations", regId), {
        installer_uid: installerUid,
        status: "pending",
      });

      const admin = auth.currentUser;
      await logAdminAction({
        type: "linking_registration_installer",
        description: `Registratie ${regId} gekoppeld aan installateur ${installerUid}`,
        collectionName: "registrations",
        adminUid: admin?.uid,
        adminEmail: admin?.email,
      });

      // Remove from local selected map
      setSelectedLinks((prev) => {
        const next = { ...prev };
        delete next[regId];
        return next;
      });

      showMelding("Koppeling opgeslagen!");
    } catch (err) {
      console.error(err);
      showMelding("Fout bij opslaan koppeling: " + err.message, "error");
    } finally {
      setLinkingIds((prev) => {
        const next = new Set(prev);
        next.delete(regId);
        return next;
      });
    }
  }, []);

  const linkAllAutoMatched = useCallback(async () => {
    const toLink = enriched.filter((r) => r.autoMatch);
    if (toLink.length === 0) {
      showMelding("Geen automatische matches om te koppelen.", "error");
      return;
    }
    if (!window.confirm(`${toLink.length} registratie(s) automatisch koppelen op basis van e-mailadres?`)) return;

    setBulkLinking(true);
    let success = 0;
    let failed = 0;

    for (const reg of toLink) {
      try {
        await updateDoc(doc(db, "registrations", reg.id), {
          installer_uid: reg.autoMatch.id,
          status: "pending",
        });

        const admin = auth.currentUser;
        await logAdminAction({
          type: "linking_registration_installer",
          description: `Auto-koppeling: registratie ${reg.id} aan ${reg.autoMatch.email}`,
          collectionName: "registrations",
          adminUid: admin?.uid,
          adminEmail: admin?.email,
        });
        success++;
      } catch (err) {
        console.error(`Fout bij koppelen ${reg.id}:`, err);
        failed++;
      }
    }

    setBulkLinking(false);
    if (failed === 0) {
      showMelding(`${success} registratie(s) succesvol gekoppeld!`);
    } else {
      showMelding(`${success} gekoppeld, ${failed} mislukt.`, "error");
    }
  }, [enriched]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <AdminLayout user={user}>
      <h1 style={s.title}>Registraties Koppelen</h1>

      {/* Mini Dashboard */}
      <div style={s.statsRow}>
        <StatCard label="Ongekoppeld"     value={metrics.total}       color="#004aad" />
        <StatCard label="Auto-match"      value={metrics.autoMatched} color="#16a34a" />
        <StatCard label="Handmatig"       value={metrics.manual}      color="#b45309" />
      </div>

      {/* Melding banner */}
      {melding && (
        <div style={{ ...s.melding, ...(melding.type === "error" ? s.meldingError : s.meldingSuccess) }}>
          {melding.text}
        </div>
      )}

      {/* Action bar */}
      <div style={s.actionBar}>
        <button
          onClick={linkAllAutoMatched}
          disabled={bulkLinking || metrics.autoMatched === 0}
          style={{
            ...s.bulkBtn,
            opacity: (bulkLinking || metrics.autoMatched === 0) ? 0.5 : 1,
            cursor: (bulkLinking || metrics.autoMatched === 0) ? "not-allowed" : "pointer",
          }}
        >
          {bulkLinking ? "Bezig met koppelen..." : `Auto-koppel alles (${metrics.autoMatched})`}
        </button>
      </div>

      {/* Search bar */}
      <div style={s.searchBar}>
        <input
          style={s.searchInput}
          placeholder="Zoek op e-mail, naam, serienummer, merk of klant..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <span style={s.searchCount}>
          {filtered.length} resultaat{filtered.length === 1 ? "" : "en"}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Registraties laden...</p>
      ) : metrics.total === 0 ? (
        <div style={s.emptyState}>
          Alle registraties zijn gekoppeld aan een installateur.
        </div>
      ) : (
        <>
          <div style={s.tableCard}>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr style={s.tableHead}>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("created_at")}>
                      Datum{sortArrow("created_at")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("installer_email")}>
                      Installateur E-mail{sortArrow("installer_email")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("product")}>
                      Product / Serienummer{sortArrow("product")}
                    </th>
                    <th style={s.th}>Klant</th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("match")}>
                      Match{sortArrow("match")}
                    </th>
                    <th style={s.th}>Koppel aan</th>
                    <th style={s.th}>Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                        Geen resultaten gevonden.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((reg) => {
                      const linking = linkingIds.has(reg.id);
                      const serial = reg.product_serial_number || reg.serial || "—";
                      const brand = reg.product_brand || reg.brand || "";
                      const model = reg.product_model || reg.model || "";
                      const klant = [reg.customer_first_name, reg.customer_middle_name, reg.customer_last_name].filter(Boolean).join(" ") || "—";

                      // Determine selected user: manual selection > auto-match
                      const manualSelection = selectedLinks[reg.id];
                      const effectiveUserId = manualSelection !== undefined ? manualSelection : (reg.autoMatch ? reg.autoMatch.id : "");

                      return (
                        <tr key={reg.id} style={s.tableRow}>
                          <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                            {formatDateNL(reg.created_at || reg.createdAt)}
                          </td>
                          <td style={s.td}>
                            <div style={{ fontWeight: 500 }}>{reg.installer_email || "—"}</div>
                            {reg.installer_name && (
                              <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{reg.installer_name}</div>
                            )}
                          </td>
                          <td style={s.td}>
                            <div style={{ fontWeight: 500 }}>
                              {[brand, model].filter(Boolean).join(" ") || "—"}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{serial}</div>
                          </td>
                          <td style={s.td}>
                            <div>{klant}</div>
                            {reg.customer_email && (
                              <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{reg.customer_email}</div>
                            )}
                          </td>
                          <td style={s.td}>
                            {reg.autoMatch ? (
                              <span style={s.matchBadge}>
                                Auto-match
                              </span>
                            ) : (
                              <span style={s.noMatchBadge}>
                                Handmatig
                              </span>
                            )}
                          </td>
                          <td style={s.td}>
                            <select
                              value={effectiveUserId}
                              onChange={(e) => setSelectedLinks((prev) => ({ ...prev, [reg.id]: e.target.value }))}
                              style={s.select}
                            >
                              <option value="">-- Kies installateur --</option>
                              {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.email} ({u.company || u.displayName || "—"})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={s.td}>
                            <button
                              onClick={() => linkSingle(reg.id, effectiveUserId)}
                              disabled={linking || !effectiveUserId}
                              style={{
                                ...s.linkBtn,
                                opacity: (linking || !effectiveUserId) ? 0.4 : 1,
                                cursor: (linking || !effectiveUserId) ? "not-allowed" : "pointer",
                              }}
                            >
                              {linking ? "..." : "Koppel"}
                            </button>
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

AdminKoppelen.propTypes = {
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

  // Action bar
  actionBar: { display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" },
  bulkBtn: { padding: "0.6rem 1.2rem", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontSize: "0.9rem", fontWeight: 600, transition: "opacity 0.15s" },

  // Search
  searchBar: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" },
  searchInput: { flex: 1, padding: "0.7rem 1rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.95rem", outline: "none" },
  searchCount: { fontSize: "0.82rem", color: "#9ca3af", whiteSpace: "nowrap" },

  // Table
  tableCard: { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "900px" },
  tableHead: { background: "#f9fafb" },
  th: { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#6b7280", borderBottom: "1px solid #e5e7eb", userSelect: "none" },
  thSortable: { cursor: "pointer", whiteSpace: "nowrap" },
  tableRow: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "0.75rem 1rem", verticalAlign: "middle" },

  // Badges
  matchBadge: { padding: "3px 8px", borderRadius: 12, fontSize: "0.78rem", fontWeight: 600, background: "#ecfdf5", color: "#065f46" },
  noMatchBadge: { padding: "3px 8px", borderRadius: 12, fontSize: "0.78rem", fontWeight: 600, background: "#fffbeb", color: "#b45309" },

  // Select & button
  select: { padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.82rem", cursor: "pointer", background: "#fff", maxWidth: "220px" },
  linkBtn: { padding: "6px 14px", borderRadius: 6, border: "none", background: "#004aad", color: "#fff", fontSize: "0.85rem", fontWeight: 600, transition: "opacity 0.15s" },

  // Empty state
  emptyState: { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", padding: "1.5rem", borderRadius: 12, textAlign: "center", fontSize: "1rem", fontWeight: 500 },

  // Pagination
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1rem", padding: "0.75rem" },
  pageBtn: { padding: "0.45rem 1rem", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: "#374151" },
  pageInfo: { fontSize: "0.85rem", color: "#6b7280" },
};
