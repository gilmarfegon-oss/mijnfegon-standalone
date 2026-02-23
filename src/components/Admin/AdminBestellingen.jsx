// src/components/Admin/AdminBestellingen.jsx
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { db } from "../../firebase";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import AdminLayout from "./AdminLayout";

export default function AdminBestellingen({ user }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      alert(`Status bijgewerkt naar ${newStatus}`);
    } catch (err) {
      alert("Fout: " + err.message);
    }
  };

  return (
    <AdminLayout user={user}>
      <div style={{ padding: "1rem" }}>
        <h1>📦 Bestellingen Beheren</h1>
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                <th>Datum</th>
                <th>Gebruiker</th>
                <th>Product</th>
                <th>Drops</th>
                <th>Status</th>
                <th>Actie</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={styles.tableRow}>
                  <td>{o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('nl-NL') : '—'}</td>
                  <td>{o.userName}</td>
                  <td><strong>{o.productName}</strong></td>
                  <td>{o.price} Drops</td>
                  <td>
                    <span style={{...styles.badge, ...getStatusStyle(o.status)}}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <select 
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      value={o.status}
                      style={styles.select}
                    >
                      <option value="Nieuw">Nieuw</option>
                      <option value="In behandeling">In behandeling</option>
                      <option value="Verzonden">Verzonden</option>
                      <option value="Geannuleerd">Geannuleerd</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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

const getStatusStyle = (status) => {
  switch(status) {
    case 'Verzonden': return { background: '#e6fffa', color: '#2c7a7b' };
    case 'Nieuw': return { background: '#fff5f5', color: '#c53030' };
    default: return { background: '#ebf8ff', color: '#2b6cb0' };
  }
};

const styles = {
  card: { background: "#fff", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" },
  table: { width: "100%", borderCollapse: "collapse" },
  tableHead: { textAlign: 'left', borderBottom: '2px solid #eee', color: '#666' },
  tableRow: { borderBottom: '1px solid #f8f9fa' },
  badge: { padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' },
  select: { padding: '5px', borderRadius: '8px', border: '1px solid #ddd' }
};