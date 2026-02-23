import { useEffect, useState, Fragment } from "react";
import PropTypes from "prop-types";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { formatDate } from "../utils/dateUtils";
import { getRegistrationStatusLabel, getRegistrationStatusStyle } from "../utils/statusUtils";

export default function MyRegistrations({ user }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRowId, setExpandedRowId] = useState(null);

  useEffect(() => {
    // Als er geen user is ingelogd, doen we niks
    if (!user?.uid) return;

    // Query: Haal alleen registraties op van DEZE installateur
    // Gesorteerd op datum (nieuwste eerst)
    const q = query(
      collection(db, "registrations"),
      where("installer_uid", "==", user.uid),
      orderBy("created_at", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRegistrations(list);
      setLoading(false);
    }, (err) => {
      console.error("Fout bij ophalen MyRegistrations:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleRow = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };


  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Mijn Registraties</h2>
        <p style={{ margin: "5px 0 0 0", color: "#666", fontSize: "0.9em" }}>
          Overzicht van uw ingediende machines en status.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>Laden...</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.trHead}>
                <th style={styles.th}>Datum</th>
                <th style={styles.th}>Machine</th>
                <th style={styles.th}>Klant</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Punten</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                    U heeft nog geen registraties ingediend.
                  </td>
                </tr>
              ) : (
                registrations.map((reg) => (
                  <Fragment key={reg.id}>
                    {/* --- HOOFDRIJ (Klikbaar) --- */}
                    <tr 
                      style={{
                        ...styles.tr, 
                        backgroundColor: expandedRowId === reg.id ? "#f9fcff" : "white",
                        cursor: "pointer"
                      }}
                      onClick={() => toggleRow(reg.id)}
                    >
                      {/* Datum */}
                      <td style={styles.td}>
                        {formatDate(reg.product_installation_date)}
                      </td>

                      {/* Machine info */}
                      <td style={styles.td}>
                        <strong>{reg.product_brand} {reg.product_model}</strong>
                        <div style={{ fontSize: "0.85em", color: "#666" }}>
                          SN: {reg.product_serial_number}
                        </div>
                      </td>

                      {/* Klant info */}
                      <td style={styles.td}>
                        {reg.customer_first_name} {reg.customer_last_name}
                        <div style={{ fontSize: "0.85em", color: "#888" }}>
                          {reg.customer_city}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, ...getRegistrationStatusStyle(reg.status) }}>
                          {getRegistrationStatusLabel(reg.status)}
                        </span>
                      </td>

                      {/* Punten (+50 alleen als goedgekeurd) */}
                      <td style={{...styles.td, fontWeight: "bold", color: reg.status === 'approved' ? "#28a745" : "#ccc"}}>
                        {reg.status === 'approved' ? `+${reg.points_awarded ?? 50}` : "0"}
                      </td>
                    </tr>

                    {/* --- DETAIL RIJ (Uitklapbaar) --- */}
                    {expandedRowId === reg.id && (
                      <tr style={styles.detailRow}>
                        <td colSpan="5" style={{ padding: 0 }}>
                           <div style={styles.detailWrapper}>
                              <h4 style={{marginTop: 0, marginBottom: '15px', color: '#007bff'}}>Details</h4>
                              <div style={styles.detailGrid}>
                                
                                {/* Kolom 1: Klantgegevens */}
                                <div>
                                  <div style={styles.label}>Contactgegevens</div>
                                  <div style={styles.value}>
                                    {reg.customer_first_name} {reg.customer_last_name}<br/>
                                    {reg.customer_email}<br/>
                                    {reg.customer_mobile_phone}
                                  </div>
                                </div>

                                {/* Kolom 2: Adres */}
                                <div>
                                  <div style={styles.label}>Installatie Adres</div>
                                  <div style={styles.value}>
                                    {reg.customer_street} {reg.customer_house_number} {reg.customer_house_addition}<br/>
                                    {reg.customer_postcode} {reg.customer_city}
                                  </div>
                                </div>

                                {/* Kolom 3: Technische Info */}
                                <div>
                                  <div style={styles.label}>Machine Specificaties</div>
                                  <div style={styles.value}>
                                    Merk: {reg.product_brand}<br/>
                                    Model: {reg.product_model}<br/>
                                    Serienummer: {reg.product_serial_number}<br/>
                                    Installatiedatum: {formatDate(reg.product_installation_date)}
                                  </div>
                                </div>

                              </div>
                           </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

MyRegistrations.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

// --- CSS IN JS STYLES ---
const styles = {
  container: {
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    padding: "20px",
    marginTop: "20px"
  },
  header: {
    marginBottom: "20px",
    borderBottom: "1px solid #eee",
    paddingBottom: "15px"
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.95rem",
    minWidth: "600px"
  },
  trHead: {
    textAlign: "left",
    borderBottom: "2px solid #eee",
    color: "#555",
  },
  th: {
    padding: "12px",
    fontWeight: "600",
  },
  tr: {
    borderBottom: "1px solid #eee",
    transition: "background-color 0.2s",
  },
  td: {
    padding: "12px",
    verticalAlign: "middle",
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "0.80rem",
    fontWeight: "600",
    display: "inline-block",
    whiteSpace: "nowrap"
  },
  detailRow: {
    backgroundColor: "#f8f9fa",
  },
  detailWrapper: {
    padding: "20px",
    borderLeft: "3px solid #007bff",
    margin: "0 0 10px 0"
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px"
  },
  label: {
    fontSize: "0.75rem",
    textTransform: "uppercase",
    color: "#888",
    fontWeight: "bold",
    marginBottom: "4px"
  },
  value: {
    fontSize: "0.95rem",
    color: "#333",
    lineHeight: "1.5"
  }
};