import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import AdminMenu from "./AdminMenu";

export default function AdminLogboek() {
  const [logs, setLogs] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [filterType, setFilterType] = useState("all");

  const PAGE_SIZE = 25;

  useEffect(() => {
    loadLogs(true);
  }, [filterType]);

  async function loadLogs(reset = false) {
    let q = query(
      collection(db, "logs"),
      orderBy("timestamp", "desc"),
      limit(PAGE_SIZE)
    );

    if (filterType !== "all") {
      q = query(
        collection(db, "logs"),
        orderBy("timestamp", "desc"),
        limit(PAGE_SIZE)
      );
    }

    const snap = await getDocs(q);

    if (reset) {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } else {
      setLogs((prev) => [
        ...prev,
        ...snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ]);
    }

    setLastDoc(snap.docs[snap.docs.length - 1] || null);
  }

  async function loadMore() {
    if (!lastDoc) return;

    const q = query(
      collection(db, "logs"),
      orderBy("timestamp", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );

    const snap = await getDocs(q);

    setLogs((prev) => [
      ...prev,
      ...snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    ]);

    setLastDoc(snap.docs[snap.docs.length - 1] || null);
  }

  return (
    <div className="admin-layout">
      <AdminMenu />

      <div className="admin-content">
        <h1 className="admin-title">📘 Logboek</h1>

        <div className="admin-filters">
          <select
            className="admin-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Alle gebeurtenissen</option>
            <option value="login">Logins</option>
            <option value="admin_action">Admin acties</option>
            <option value="registration_update">Registratie wijzigingen</option>
            <option value="points_change">Puntentransacties</option>
          </select>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Tijd</th>
              <th>Type</th>
              <th>Actie</th>
              <th>Gebruiker</th>
              <th>Details</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>
                  {log.timestamp?.toDate
                    ? log.timestamp.toDate().toLocaleString()
                    : "-"}
                </td>
                <td>{log.type}</td>
                <td>{log.action}</td>
                <td>
                  {log.email ? (
                    <>
                      <strong>{log.email}</strong>
                      <br />
                      <small>{log.uid}</small>
                    </>
                  ) : (
                    "System"
                  )}
                </td>
                <td>
                  {log.details && Object.keys(log.details).length > 0 ? (
                    <pre style={{ fontSize: "0.75rem" }}>
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td colSpan="5" className="admin-empty">
                  Geen logitems gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {lastDoc && (
          <div className="pagination">
            <button onClick={loadMore}>Meer laden ↓</button>
          </div>
        )}
      </div>
    </div>
  );
}
