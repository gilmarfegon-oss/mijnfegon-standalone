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

export default function AdminLogboek({ user }) {
  const [logs, setLogs] = useState([]);
  const [filterType, setFilterType] = useState("all"); // all | user | points | product | registration | linking | other
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [melding, setMelding] = useState("");

  useEffect(() => {
    try {
      const ref = collection(db, "logs_admin");
      const q = query(ref, orderBy("createdAt", "desc"), limit(300));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setLogs(list);
          setLoading(false);
        },
        (err) => {
          console.error("AdminLogboek onSnapshot error:", err);
          setMelding("❌ Kon logboek niet laden (rechten of netwerkprobleem).");
          setLoading(false);
        },
      );

      return () => unsub();
    } catch (err) {
      console.error("AdminLogboek init error:", err);
      setMelding("❌ Fout bij initialiseren logboek.");
      setLoading(false);
    }
  }, []);

  function mapTypeToFilterGroup(type) {
    if (!type) return "other";
    if (type.startsWith("user_")) return "user";
    if (type.startsWith("points_")) return "points";
    if (type.startsWith("product_")) return "product";
    if (type.startsWith("registration_")) return "registration";
    if (type.startsWith("linking_")) return "linking";
    return "other";
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const group = mapTypeToFilterGroup(log.type);
      if (filterType !== "all" && group !== filterType) return false;

      if (searchEmail) {
        const term = searchEmail.toLowerCase();
        const email = (log.adminEmail || "").toLowerCase();
        if (!email.includes(term)) return false;
      }

      return true;
    });
  }, [logs, filterType, searchEmail]);

  return (
    <AdminLayout user={user}>
      <h1>📜 Logboek</h1>
      <p style={{ color: "#6b7280", marginTop: "0.3rem" }}>
        Overzicht van admin-wijzigingen die naar Firestore zijn geschreven,
        inclusief account en tijdstip.
      </p>

      {melding && (
        <p className="alert alert--info" style={{ marginTop: "0.8rem" }}>
          {melding}
        </p>
      )}

      {/* Filters */}
      <div
        className="actions-row"
        style={{ marginTop: "1rem", marginBottom: "0.8rem", flexWrap: "wrap" }}
      >
        <div className="actions-row" style={{ gap: "0.5rem" }}>
          <span style={{ fontSize: "0.9rem" }}>Type filter:</span>
          <select
            className="select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Alle</option>
            <option value="user">Gebruikers / rollen</option>
            <option value="points">Punten</option>
            <option value="product">Producten</option>
            <option value="registration">Registraties</option>
            <option value="linking">Koppelingen</option>
            <option value="other">Overig</option>
          </select>
        </div>

        <div className="actions-row" style={{ gap: "0.5rem" }}>
          <span style={{ fontSize: "0.9rem" }}>Filter op admin e-mail:</span>
          <input
            className="input"
            style={{ maxWidth: 220 }}
            placeholder="admin@bedrijf.nl"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p>⏳ Logboek wordt geladen...</p>
      ) : filteredLogs.length === 0 ? (
        <p style={{ marginTop: "0.8rem" }}>Geen logregels voor deze filter.</p>
      ) : (
        <div className="table-wrapper" style={{ marginTop: "0.5rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Tijd</th>
                <th>Admin</th>
                <th>Type</th>
                <th>Omschrijving</th>
                <th>Collectie / document</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const createdAtStr =
                  log.createdAt && log.createdAt.toDate
                    ? log.createdAt.toDate().toLocaleString()
                    : "—";

                const collectionInfo = [
                  log.collection || null,
                  log.docId || null,
                ]
                  .filter(Boolean)
                  .join(" / ");

                return (
                  <tr key={log.id}>
                    <td>{createdAtStr}</td>
                    <td>
                      {log.adminEmail || "Onbekend"}
                      {log.adminUid && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          UID: {log.adminUid}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge--pending">
                        {log.type || "—"}
                      </span>
                    </td>
                    <td style={{ maxWidth: 420 }}>
                      {log.description || "—"}
                    </td>
                    <td>{collectionInfo || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
