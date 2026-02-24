import { useEffect, useState, Fragment, useMemo } from "react";
import PropTypes from "prop-types";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase";
import { sendApprovalEmails } from "../../services/mailService";
import AdminLayout from "./AdminLayout";
import { formatDate } from "../../utils/dateUtils";
import { getRegistrationStatusLabel, getRegistrationStatusStyle } from "../../utils/statusUtils";
import { usePagination } from "../../hooks/usePagination";
import { logAdminAction } from "../../adminTools/logAdminAction";

// ─── Module-level constants ───────────────────────────────────────────────────

const YEAR_MAP = {
  Z: 2026, Y: 2025, X: 2024, W: 2023, V: 2022,
  U: 2021, T: 2020, S: 2019, R: 2018, Q: 2017,
  P: 2016, O: 2015, N: 2014, M: 2013, L: 2012,
  K: 2011, J: 2010, I: 2009, H: 2008, G: 2007,
  F: 2006, E: 2005, D: 2004, C: 2003, B: 2001, A: 2000,
};

const MONTH_MAP = {
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5,
  G: 6, H: 7, I: 8, J: 9, K: 10, L: 11,
};

const ITEMS_PER_PAGE = 20;

const STATUS_TABS = [
  { key: "all",      label: "Alle" },
  { key: "pending",  label: "In Behandeling" },
  { key: "approved", label: "Goedgekeurd" },
  { key: "rejected", label: "Afgekeurd" },
];

// ─── Module-level helpers ─────────────────────────────────────────────────────

function analyzeRegistration(reg) {
  const brand = (reg.product_brand || "").toLowerCase();
  const model = (reg.product_model || "").toLowerCase();
  const serial = (reg.product_serial_number || "").toUpperCase().replace(/[\s-]/g, "");

  let installDate = null;
  const installDateVal = reg.product_installation_date;
  if (installDateVal && installDateVal.toDate) installDate = installDateVal.toDate();
  else if (installDateVal) installDate = new Date(installDateVal);

  if (brand.includes("talent") || model.includes("talent") || brand.includes("delta") || model.includes("delta")) {
    if (!/^\d{9,11}$/.test(serial)) {
      return { status: "warning", message: "Let Op: Talent/Delta serienummer moet 9-11 cijfers zijn." };
    }
    return { status: "good", message: "Zo Goed Als Klaar (Correct Talent/Delta formaat)" };
  }

  const match = serial.match(/^([A-Z]{2})\d{6}$/);
  if (!match) {
    return { status: "warning", message: "Let Op: Serienummer formaat onjuist (verwacht 2 letters + 6 cijfers)." };
  }

  const prodYear = YEAR_MAP[match[1][0]];
  const prodMonth = MONTH_MAP[match[1][1]];

  if (prodYear === undefined || prodMonth === undefined) {
    return { status: "warning", message: "Let Op: Serienummer bevat onbekende jaar/maand codes." };
  }

  if (!installDate || isNaN(installDate.getTime())) {
    return { status: "warning", message: "Let Op: Geen geldige installatiedatum om te vergelijken." };
  }

  const diffMonths = Math.abs(installDate - new Date(prodYear, prodMonth, 1)) / (1000 * 60 * 60 * 24 * 30.44);
  if (diffMonths > 15) {
    return {
      status: "warning",
      message: `Let Op: Installatiedatum wijkt ${Math.round(diffMonths)} maanden af van productiedatum (${prodMonth + 1}-${prodYear}).`,
    };
  }

  return { status: "good", message: "Zo Goed Als Klaar (Datum en formaat kloppen)" };
}

function toDate(val) {
  if (!val) return new Date(0);
  if (val.toDate) return val.toDate();
  const d = new Date(val);
  return isNaN(d) ? new Date(0) : d;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminRegistraties({ user }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [sort, setSort] = useState({ field: "created_at", dir: "desc" });
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

  // Realtime registrations listener
  useEffect(() => {
    const q = query(collection(db, "registrations"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistrations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Fout bij ophalen registraties:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ─── Dashboard metrics ────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const total = registrations.length;
    const pending = registrations.filter((r) => r.status === "pending").length;
    const approved = registrations.filter((r) => r.status === "approved").length;
    const rejected = registrations.filter((r) => r.status === "rejected").length;
    const warnings = registrations.filter((r) => analyzeRegistration(r).status === "warning").length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const approvedThisMonth = registrations.filter((r) => {
      if (r.status !== "approved") return false;
      return toDate(r.created_at) >= startOfMonth;
    }).length;

    let newSinceLogin = 0;
    if (adminLastLogin) {
      const loginDate = toDate(adminLastLogin);
      newSinceLogin = registrations.filter((r) => toDate(r.created_at) > loginDate).length;
    }

    return { total, pending, approved, rejected, warnings, approvedThisMonth, newSinceLogin };
  }, [registrations, adminLastLogin]);

  // ─── Filter + Sort pipeline ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = registrations;

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }

    // Search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((r) =>
        (r.installer_name || "").toLowerCase().includes(term) ||
        (r.installer_email || "").toLowerCase().includes(term) ||
        (r.installer_company || "").toLowerCase().includes(term) ||
        (r.product_brand || "").toLowerCase().includes(term) ||
        (r.product_serial_number || "").toLowerCase().includes(term) ||
        (r.customer_last_name || "").toLowerCase().includes(term)
      );
    }

    // Sort
    if (sort) {
      list = [...list].sort((a, b) => {
        const dir = sort.dir === "asc" ? 1 : -1;
        switch (sort.field) {
          case "created_at":
            return (toDate(a.created_at).getTime() - toDate(b.created_at).getTime()) * dir;
          case "installer_name":
            return (a.installer_name || "").localeCompare(b.installer_name || "") * dir;
          case "product":
            return ((a.product_brand || "") + (a.product_model || "")).localeCompare((b.product_brand || "") + (b.product_model || "")) * dir;
          case "status":
            return (a.status || "").localeCompare(b.status || "") * dir;
          case "check": {
            const va = analyzeRegistration(a).status === "warning" ? 0 : 1;
            const vb = analyzeRegistration(b).status === "warning" ? 0 : 1;
            return (va - vb) * dir;
          }
          default:
            return 0;
        }
      });
    }

    return list;
  }, [registrations, statusFilter, search, sort]);

  // ─── Pagination ───────────────────────────────────────────────────────────

  const { page: safePage, setPage, totalPages, pageItems } = usePagination(filtered, ITEMS_PER_PAGE);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const toggleRow = (id) => setExpandedRowId(expandedRowId === id ? null : id);

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
    setExpandedRowId(null);
  }

  function showMelding(text, type = "success") {
    setMelding({ text, type });
    setTimeout(() => setMelding(null), 4000);
  }

  // ─── Action handlers ──────────────────────────────────────────────────────

  const handleApprove = async (reg) => {
    if (!window.confirm("Weet je zeker dat je deze registratie wilt goedkeuren en doorzetten naar Compenda?")) return;
    setProcessingId(reg.id);
    try {
      const result = await httpsCallable(functions, "approveRegistrationToCompenda")({ registrationId: reg.id });
      if (result.data.success) {
        showMelding("Registratie verwerkt in Compenda en punten toegekend.");
        sendApprovalEmails(reg, result.data.compendaId, result.data.points, result.data.isFirstRegistration);
        logAdminAction({ type: "registration_approve", description: `Registratie ${reg.id} goedgekeurd (${reg.installer_email || "onbekend"})`, collectionName: "registrations", adminUid: user?.uid, adminEmail: user?.email });
      }
    } catch (err) {
      console.error("Compenda Error:", err);
      showMelding(`Fout bij verwerken: ${err.message}`, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectOrUpdate = async (reg, newStatus) => {
    if (!window.confirm(`Status wijzigen naar: ${newStatus}?`)) return;
    try {
      await updateDoc(doc(db, "registrations", reg.id), { status: newStatus });
      showMelding("Status bijgewerkt.");
      logAdminAction({ type: "registration_status", description: `Registratie ${reg.id} status gewijzigd naar ${newStatus}`, collectionName: "registrations", adminUid: user?.uid, adminEmail: user?.email });
    } catch (err) {
      console.error("Update fout:", err);
      showMelding("Er ging iets mis bij het updaten: " + err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Definitief verwijderen?")) return;
    try {
      await deleteDoc(doc(db, "registrations", id));
      showMelding("Registratie verwijderd.");
      logAdminAction({ type: "registration_delete", description: `Registratie ${id} verwijderd`, collectionName: "registrations", adminUid: user?.uid, adminEmail: user?.email });
    } catch (err) {
      console.error("Delete fout:", err);
      showMelding("Verwijderen mislukt: " + err.message, "error");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AdminLayout user={user}>
      <h1 style={s.title}>Beheer Registraties</h1>

      {/* Mini Dashboard */}
      <div style={s.statsRow}>
        <StatCard label="Totaal"              value={metrics.total}            color="#004aad" />
        <StatCard label="In Behandeling"      value={metrics.pending}          color="#e65100" />
        <StatCard label="Nieuw sinds login"   value={metrics.newSinceLogin}    color="#7c3aed" />
        <StatCard label="Goedgekeurd (maand)" value={metrics.approvedThisMonth} color="#16a34a" />
        <StatCard label="Afgekeurd"           value={metrics.rejected}         color="#dc2626" />
        <StatCard label="Waarschuwingen"      value={metrics.warnings}         color="#f59e0b" />
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
            : tab.key === "pending" ? metrics.pending
            : tab.key === "approved" ? metrics.approved
            : metrics.rejected;
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
          placeholder="Zoek op installateur, bedrijf, merk, serienummer of klant..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <span style={s.searchCount}>
          {filtered.length} resultaat{filtered.length === 1 ? "" : "en"}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Gegevens laden...</p>
      ) : (
        <>
          <div style={s.tableCard}>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr style={s.tableHead}>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("check")}>
                      Check{sortArrow("check")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("created_at")}>
                      Datum{sortArrow("created_at")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("installer_name")}>
                      Installateur{sortArrow("installer_name")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("product")}>
                      Product{sortArrow("product")}
                    </th>
                    <th style={{ ...s.th, ...s.thSortable }} onClick={() => toggleSort("status")}>
                      Status{sortArrow("status")}
                    </th>
                    <th style={s.th}>Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                        Geen registraties gevonden.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((reg) => {
                      const analysis = analyzeRegistration(reg);
                      return (
                        <Fragment key={reg.id}>
                          <RegistrationRow
                            reg={reg}
                            analysis={analysis}
                            expanded={expandedRowId === reg.id}
                            processing={processingId === reg.id}
                            onToggle={toggleRow}
                            onApprove={handleApprove}
                            onReject={handleRejectOrUpdate}
                            onDelete={handleDelete}
                          />
                          {expandedRowId === reg.id && (
                            <RegistrationDetailRow reg={reg} analysis={analysis} />
                          )}
                        </Fragment>
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

AdminRegistraties.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

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

function RegistrationRow({ reg, analysis, expanded, processing, onToggle, onApprove, onReject, onDelete }) {
  return (
    <tr
      style={{ ...s.tableRow, backgroundColor: expanded ? "#f0f8ff" : "transparent", cursor: "pointer" }}
      onClick={() => onToggle(reg.id)}
    >
      <td style={s.td}>
        <span title={analysis.message} style={{ fontSize: "1.2rem", cursor: "help" }}>
          {analysis.status === "warning" ? "\u26A0\uFE0F" : "\u2705"}
        </span>
      </td>
      <td style={{ ...s.td, whiteSpace: "nowrap" }}>{formatDate(reg.created_at)}</td>
      <td style={s.td}>
        <div style={{ fontWeight: 600, color: "#111827" }}>{reg.installer_name || "Onbekend"}</div>
        {reg.installer_company && (
          <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{reg.installer_company}</div>
        )}
        <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{reg.installer_email}</div>
      </td>
      <td style={s.td}>
        <div style={{ fontWeight: 500 }}>
          {[reg.product_brand, reg.product_model].filter(Boolean).join(" ") || "-"}
        </div>
        <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{reg.product_serial_number || ""}</div>
      </td>
      <td style={s.td}>
        <span style={{ ...s.statusBadge, ...getRegistrationStatusStyle(reg.status) }}>
          {getRegistrationStatusLabel(reg.status)}
        </span>
      </td>
      <td style={s.td}>
        <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
          {reg.status !== "approved" && (
            <button
              onClick={() => onApprove(reg)}
              disabled={processing}
              style={{ ...s.btnMini, background: processing ? "#ccc" : "#4caf50", color: "white", width: processing ? "auto" : "32px", padding: processing ? "0 8px" : "0" }}
              title="Goedkeuren & naar Compenda"
            >
              {processing ? "\u23F3" : "\u2713"}
            </button>
          )}
          {reg.status !== "rejected" && (
            <button
              onClick={() => onReject(reg, "rejected")}
              disabled={processing}
              style={{ ...s.btnMini, background: "#f44336", color: "white" }}
              title="Afwijzen"
            >{"\u2715"}</button>
          )}
          <button
            onClick={() => onDelete(reg.id)}
            disabled={processing}
            style={{ ...s.btnMini, background: "#eee", color: "#333" }}
            title="Verwijderen"
          >{"\uD83D\uDDD1\uFE0F"}</button>
        </div>
      </td>
    </tr>
  );
}

RegistrationRow.propTypes = {
  reg: PropTypes.object.isRequired,
  analysis: PropTypes.shape({ status: PropTypes.string, message: PropTypes.string }).isRequired,
  expanded: PropTypes.bool.isRequired,
  processing: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onApprove: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

function RegistrationDetailRow({ reg, analysis }) {
  const isWarning = analysis.status === "warning";
  return (
    <tr style={s.detailRow}>
      <td colSpan="6" style={{ padding: 0 }}>
        <div style={s.detailWrapper}>
          <div style={{
            marginBottom: "20px",
            padding: "10px",
            borderRadius: "6px",
            backgroundColor: isWarning ? "#fff3cd" : "#d4edda",
            border: isWarning ? "1px solid #ffeeba" : "1px solid #c3e6cb",
            color: isWarning ? "#856404" : "#155724",
          }}>
            <strong>Systeem Analyse:</strong> {analysis.message}
          </div>
          <div style={s.detailGrid}>
            <div style={s.detailItem}>
              <strong>Machine:</strong>
              <div>{reg.product_brand || ""} {reg.product_model || "-"}</div>
            </div>
            <div style={s.detailItem}>
              <strong>Installatie Datum:</strong>
              <div>{formatDate(reg.product_installation_date)}</div>
            </div>
            <div style={s.detailItem}>
              <strong>Serienummer:</strong>
              <div>{reg.product_serial_number || "-"}</div>
            </div>
            <div style={s.detailItem}>
              <strong>Klant:</strong>
              <div>{[reg.customer_first_name, reg.customer_middle_name, reg.customer_last_name].filter(Boolean).join(" ") || "-"}</div>
            </div>
            <div style={s.detailItem}>
              <strong>Contact:</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span>{reg.customer_email || "-"}</span>
                <span>{reg.customer_mobile_phone || "-"}</span>
              </div>
            </div>
            <div style={s.detailItem}>
              <strong>Adres:</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "0.9em", color: "#666" }}>
                <span>{reg.customer_street} {reg.customer_house_number}{reg.customer_house_addition ? ` ${reg.customer_house_addition}` : ""}</span>
                <span>{reg.customer_postcode} {reg.customer_city}</span>
              </div>
            </div>
            <div style={s.detailItem}>
              <strong>Punten bij goedkeuring:</strong>
              <div style={{ color: "#28a745", fontWeight: "bold" }}>+50</div>
            </div>
            {reg.synced_to_compenda && (
              <div style={s.detailItem}>
                <strong>Compenda Status:</strong>
                <div style={{ color: "#007bff" }}>Gesynchroniseerd</div>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

RegistrationDetailRow.propTypes = {
  reg: PropTypes.object.isRequired,
  analysis: PropTypes.shape({ status: PropTypes.string, message: PropTypes.string }).isRequired,
};

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  table: { width: "100%", borderCollapse: "collapse", minWidth: "800px" },
  tableHead: { background: "#f9fafb" },
  th: { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#6b7280", borderBottom: "1px solid #e5e7eb", userSelect: "none" },
  thSortable: { cursor: "pointer", whiteSpace: "nowrap" },
  tableRow: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "0.75rem 1rem", verticalAlign: "middle" },

  // Detail row
  detailRow: { backgroundColor: "#f9fcff" },
  detailWrapper: { padding: "20px", borderBottom: "1px solid #eee", borderLeft: "4px solid #007bff" },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" },
  detailItem: { display: "flex", flexDirection: "column", gap: "5px", fontSize: "0.95rem", color: "#333" },

  // Badge & buttons
  statusBadge: { padding: "4px 8px", borderRadius: 12, fontSize: "0.85rem", fontWeight: 600, display: "inline-block" },
  btnMini: { border: "none", borderRadius: 4, width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1rem", transition: "opacity 0.2s" },

  // Pagination
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1rem", padding: "0.75rem" },
  pageBtn: { padding: "0.45rem 1rem", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: "#374151" },
  pageInfo: { fontSize: "0.85rem", color: "#6b7280" },
};
