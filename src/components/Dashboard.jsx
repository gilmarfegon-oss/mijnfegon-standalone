import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { db } from "../firebase";
import { collection, onSnapshot, doc, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";

export default function Dashboard({ user }) {
  const [userData, setUserData] = useState(null);
  const [registraties, setRegistraties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // 1. Haal profiel data op
    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setUserData(snap.data());
      }
    }, (error) => console.error(error));

    // 2. Haal registraties op
    const regsRef = collection(db, "registrations");
    const q = query(regsRef, where("installer_uid", "==", user.uid));

    const unsubRegs = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sorteren op datum (nieuwste eerst)
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRegistraties(docs);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => { unsubUser(); unsubRegs(); };
  }, [user]);

  if (loading) return <div className="container" style={{textAlign: "center", padding: "5rem"}}>Dashboard laden...</div>;

  const fullName = userData?.firstName 
    ? `${userData.firstName} ${userData.lastName || ""}` 
    : "Installateur";

  return (
    // ✅ CENTRERING FIX: margin: 0 auto en max-width correct ingesteld
    <div className="container" style={{ paddingTop: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      
      {/* 1. Welkom Header */}
      <header style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1 style={{ margin: "0 0 5px 0", fontSize: "2rem", color: "#111827" }}>
          Welkom, {fullName} 👋
        </h1>
        <div style={{ fontSize: "1.1rem", color: "#6b7280", fontWeight: "500" }}>
           🏢 {userData?.company_name || "Bedrijf onbekend"}
        </div>
      </header>

      {/* 2. Saldo Kaart */}
      <div className="card" style={styles.pointsCard}>
        <div style={{fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.9, letterSpacing: '1px'}}>Huidig Saldo</div>
        <div style={{ fontSize: "3rem", fontWeight: "bold", margin: '5px 0' }}>
          {userData?.saldo ?? userData?.points_total ?? 0} <span style={{fontSize: '1.5rem', fontWeight: '400'}}>Drops</span>
        </div>
        {userData?.points_pending > 0 && (
          <div style={{fontSize: '0.9rem', background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "20px", display: "inline-block"}}>
            ⏳ {userData.points_pending} Drops in behandeling
          </div>
        )}
      </div>

      {/* 3. Hoofdknoppen */}
      <div style={styles.gridMain}>
        <Link to="/registratie-product" className="btn-secondary" style={styles.mainBtn}>
          <span style={{fontSize: '2rem', marginBottom: '10px'}}>➕</span>
          Nieuwe Registratie
        </Link>
        <Link to="/shop" className="btn-secondary" style={styles.mainBtn}>
          <span style={{fontSize: '2rem', marginBottom: '10px'}}>🛍️</span>
          Naar de Shop
        </Link>
      </div>

      {/* 4. Subknoppen */}
      <div style={styles.gridSub}>
        <Link to="/mijn-bestellingen" className="btn" style={styles.subBtn}>
          📦 Mijn Bestellingen
        </Link>
        <Link to="/mijn-registraties" className="btn" style={styles.subBtn}>
          📋 Mijn Registraties
        </Link>
        <Link to="/instellingen" className="btn" style={styles.subBtn}>
          ⚙️ Instellingen
        </Link>
      </div>

      {/* 5. Laatste activiteiten */}
      <section style={{ marginTop: "3rem" }}>
        <h3 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "12px", marginBottom: "20px", color: "#374151" }}>
          Laatste activiteiten
        </h3>

        <div style={styles.listContainer}>
          {registraties.length > 0 ? (
            registraties.slice(0, 5).map((reg) => (
              <div key={reg.id} className="card" style={styles.listItem}>
                <div style={{flex: 1}}>
                  <div style={{ fontWeight: "600", color: "#111827", fontSize: "1.05rem" }}>
                    {reg.product_brand || reg.brand || "Product"} {reg.product_model || reg.model || ""}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "4px" }}>
                    SN: {reg.product_serial_number || reg.serial || "---"}
                  </div>
                </div>
                
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontWeight: "bold",
                    fontSize: '1.2rem',
                    color: reg.status === 'approved' ? "#0066ff" : reg.status === 'rejected' ? "#9ca3af" : "#f59e0b"
                  }}>
                    {reg.status === 'approved'
                      ? `+${reg.points_awarded ?? 50}`
                      : reg.status === 'rejected'
                        ? "—"
                        : "⏳"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                    {reg.created_at?.toDate
                      ? reg.created_at.toDate().toLocaleDateString("nl-NL")
                      : reg.createdAt?.toDate
                        ? reg.createdAt.toDate().toLocaleDateString("nl-NL")
                        : "Recent"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card" style={{ padding: "3rem", textAlign: "center", color: "#6b7280", background: "#f9fafb" }}>
              Nog geen registraties gevonden.
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

Dashboard.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

const styles = {
  pointsCard: {
    background: "linear-gradient(135deg, #0066ff 0%, #004aad 100%)",
    color: "#fff",
    padding: "2.5rem",
    borderRadius: "16px",
    marginBottom: "2rem",
    textAlign: "center",
    boxShadow: "0 10px 25px rgba(0, 102, 255, 0.2)"
  },
  gridMain: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.5rem",
    marginBottom: "1.5rem"
  },
  mainBtn: {
    padding: "2rem",
    borderRadius: "16px",
    flexDirection: "column",
    height: "auto",
    border: "2px solid #e2e8f0",
    color: "#0066ff",
    fontSize: "1.1rem",
    fontWeight: "600",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    transition: "transform 0.2s, box-shadow 0.2s"
  },
  gridSub: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "1.5rem"
  },
  subBtn: {
    backgroundColor: "#fff",
    color: "#374151",
    padding: "1.2rem",
    fontSize: "1rem",
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    textDecoration: "none",
    textAlign: "center",
    borderRadius: "12px",
    display: "block",
    fontWeight: "500"
  },
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.2rem",
    marginBottom: 0,
    border: "1px solid #f3f4f6",
    boxShadow: "none"
  }
};