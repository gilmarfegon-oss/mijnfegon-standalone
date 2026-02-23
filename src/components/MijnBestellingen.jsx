import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { getStatusStyle } from "../utils/statusUtils";

export default function MijnBestellingen({ user }) {
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // Let op: als dit een fout geeft in de console, klik dan op de Firebase link om de index aan te maken
    const q = query(
      collection(db, "orders"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMyOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Orders fout:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  if (loading) return <div className="container" style={{padding: '2rem'}}>Bestellingen laden...</div>;

  return (
    <div className="container" style={{ padding: "2rem 1rem" }}>
      <header style={{marginBottom: '2rem'}}>
        <h1>🎁 Mijn Bestellingen</h1>
        <p style={{color: '#666'}}>Overzicht van jouw ingewisselde Fegon Drops.</p>
      </header>

      <div style={styles.list}>
        {myOrders.length > 0 ? (
          myOrders.map(o => (
            <div key={o.id} style={styles.orderCard}>
              <div style={styles.orderHeader}>
                <span style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{o.productName}</span>
                <span style={{...styles.badge, ...getStatusStyle(o.status)}}>
                  {o.status || 'Nieuw'}
                </span>
              </div>
              <div style={styles.orderBody}>
                <div style={{fontSize: '0.9rem', color: '#718096'}}>
                  Besteld op: {o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('nl-NL') : 'Recent'}
                </div>
                <div style={{fontWeight: 'bold', color: '#004aad', marginTop: '5px'}}>
                  {o.price} Drops
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card" style={{textAlign: 'center', padding: '3rem'}}>
             <p style={{fontSize: '1.2rem', color: '#a0aec0'}}>Je hebt nog geen bestellingen geplaatst.</p>
             <a href="/shop" style={{color: '#004aad', fontWeight: 'bold'}}>Ga naar de shop →</a>
          </div>
        )}
      </div>
    </div>
  );
}

MijnBestellingen.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

const styles = {
  list: { display: 'flex', flexDirection: 'column', gap: '15px' },
  orderCard: { background: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' },
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  badge: { padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }
};