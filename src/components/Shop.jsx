import { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { db, functions } from "../firebase";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

export default function Shop({ user }) {
  const [products, setProducts] = useState([]);
  const [userData, setUserData] = useState(null);
  const [categories, setCategories] = useState(["Alles"]); 
  const [activeCategory, setActiveCategory] = useState("Alles");
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  const MIN_BALANCE_REQUIRED = 250;

  useEffect(() => {
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });

    const unsubProd = onSnapshot(collection(db, "products"), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.active !== false));
      setLoading(false);
    });

    const unsubCats = onSnapshot(doc(db, "settings", "shop_config"), (snap) => {
      if (snap.exists() && snap.data().categories) {
        setCategories(["Alles", ...snap.data().categories]);
      }
    });

    return () => { unsubUser(); unsubProd(); unsubCats(); };
  }, [user]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "Alles") return products;
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  const buyProduct = async (product) => {
    const currentSaldo = userData?.saldo || 0;

    if (currentSaldo < MIN_BALANCE_REQUIRED) {
      alert(`Je saldo is te laag.\n\nMinimaal ${MIN_BALANCE_REQUIRED} Drops nodig.`);
      return;
    }

    if (currentSaldo < (product.price || product.points)) {
      alert("Onvoldoende Drops.");
      return;
    }

    if (!window.confirm(`Wil je ${product.name} kopen?`)) return;

    setOrdering(true);
    try {
      const purchase = httpsCallable(functions, "purchaseProduct");
      await purchase({ productId: product.id });
      alert("Bestelling geplaatst!");
    } catch (err) {
      const msg = err.message || "Er ging iets mis.";
      alert("Fout: " + msg);
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <div className="container" style={{padding: '2rem'}}>Shop laden...</div>;

  const currentPoints = userData?.saldo || 0;
  const isLocked = currentPoints < MIN_BALANCE_REQUIRED;

  return (
    <div className="container" style={{ padding: "2rem 1rem", maxWidth: '1000px' }}>
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>Fegon Shop</h1>
          <p style={{ color: '#666' }}>Wissel je Drops in voor mooie extra&apos;s</p>
        </div>
        <div style={{...styles.pointsBadge, background: isLocked ? '#e53e3e' : '#004aad'}}>
          <span style={{ fontSize: '0.8rem', display: 'block', opacity: 0.9 }}>Jouw saldo:</span>
          <strong>{currentPoints} Drops</strong>
        </div>
      </header>

      {isLocked && (
        <div style={styles.lockedBanner}>
          🔒 <strong>Shop vergrendeld:</strong> Je hebt minimaal {MIN_BALANCE_REQUIRED} Drops nodig om te kunnen bestellen.
        </div>
      )}

      <div style={styles.filterBar}>
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)} 
            style={{
              ...styles.filterBtn,
              background: activeCategory === cat ? '#004aad' : '#fff',
              color: activeCategory === cat ? '#fff' : '#004aad'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={styles.grid}>
        {filteredProducts.map(p => (
          <div key={p.id} style={{...styles.card, opacity: isLocked ? 0.7 : 1}}>
            <div style={styles.imageWrapper}>
              <img 
                src={p.image || p.imageUrl || "https://via.placeholder.com/300x200?text=Geen+foto"} 
                style={styles.image} 
                alt={p.name} 
              />
            </div>
            <div style={styles.cardContent}>
              <h3 style={styles.title}>{p.name}</h3>
              <p style={styles.desc}>{p.description}</p>
              <div style={styles.footer}>
                <span style={styles.price}>{p.price || p.points} Drops</span>
                <button 
                  onClick={() => buyProduct(p)} 
                  style={{
                    ...styles.buyBtn, 
                    background: isLocked ? '#ccc' : '#004aad',
                    cursor: isLocked ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isLocked || ordering}
                >
                  {isLocked ? "🔒" : ordering ? "..." : "Koop"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Shop.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  pointsBadge: { color: '#fff', padding: '10px 20px', borderRadius: '12px', textAlign: 'right', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  lockedBanner: { background: '#fff5f5', color: '#c53030', border: '1px solid #feb2b2', padding: '1rem', borderRadius: '10px', marginBottom: '2rem', textAlign: 'center' },
  filterBar: { display: 'flex', gap: '10px', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '10px' },
  filterBtn: { padding: '8px 20px', borderRadius: '25px', border: '1px solid #004aad', cursor: 'pointer', fontWeight: '500', whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' },
  card: { background: '#fff', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 6px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
  imageWrapper: { width: '100%', height: '180px', background: '#f0f0f0' }, // Teruggebracht naar de originele hoogte
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  cardContent: { padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 },
  title: { margin: '0 0 8px', fontSize: '1.2rem' },
  desc: { fontSize: '0.9rem', color: '#666', minHeight: '40px', marginBottom: '15px' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  price: { fontWeight: 'bold', color: '#004aad', fontSize: '1.1rem' },
  buyBtn: { color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold' }
};