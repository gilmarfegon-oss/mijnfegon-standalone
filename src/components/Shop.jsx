// src/components/Shop.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Shop({ user }) {
  const [products, setProducts] = useState([]);
  const [points, setPoints] = useState(0); // points_total van de gebruiker
  const [cart, setCart] = useState({}); // { productId: quantity }
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ✅ Helper: veilige prijs in punten
  const getProductPrice = (product) => {
    const raw = product?.points ?? product?.priceDrops ?? 0;
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  };

  // -------------------------
  // Data ophalen (user + producten)
  // -------------------------
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        // 1. punten van user ophalen (points_total)
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const raw = data.points_total ?? 0;
          const num = Number(raw);
          setPoints(Number.isFinite(num) ? num : 0);
        } else {
          setPoints(0);
        }

        // 2. producten ophalen
        const productsRef = collection(db, "products");
        const productsSnap = await getDocs(productsRef);

        const list = productsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.active !== false);

        setProducts(list);
      } catch (err) {
        console.error("Fout bij laden shop:", err);
        setError("Er ging iets mis bij het laden van de shop.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // -------------------------
  // Winkelwagen functies
  // -------------------------
  const addToCart = (productId) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const updateQuantity = (productId, value) => {
    const qty = Number(value);
    if (isNaN(qty) || qty <= 0) {
      return removeFromCart(productId);
    }
    setCart((prev) => ({ ...prev, [productId]: qty }));
  };

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const product = products.find((p) => p.id === id);
        if (!product) return null;

        const price = getProductPrice(product);
        const lineTotal = price * quantity;

        return {
          ...product,
          quantity,
          price,
          lineTotal,
        };
      })
      .filter((item) => item !== null);
  }, [cart, products]);

  const cartTotal = useMemo(() => {
    const sum = cartItems.reduce((acc, item) => {
      const lt = Number(item.lineTotal);
      return acc + (Number.isFinite(lt) ? lt : 0);
    }, 0);
    return sum;
  }, [cartItems]);

  const enoughPoints = points >= cartTotal;

  // -------------------------
  // Checkout
  // -------------------------
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setError("Je winkelwagen is leeg.");
      return;
    }

    if (!enoughPoints) {
      setError("Onvoldoende Fegon Drops.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setCheckoutLoading(true);

    try {
      const userRef = doc(db, "users", user.uid);
      const ordersRef = collection(db, "orders");

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error("Gebruiker niet gevonden.");
        }

        const data = userSnap.data();
        const rawCurrent = data.points_total ?? 0;
        const current = Number(rawCurrent);

        if (!Number.isFinite(current) || current < cartTotal) {
          throw new Error(
            "Onvoldoende Fegon Drops. Je saldo is tussentijds gewijzigd."
          );
        }

        const newBalance = current - cartTotal;

        transaction.update(userRef, { points_total: newBalance });

        const orderRef = doc(ordersRef);
        transaction.set(orderRef, {
          userId: user.uid,
          items: cartItems.map((item) => ({
            productId: item.id,
            name: item.name,
            points: item.price,
            quantity: item.quantity,
          })),
          totalPoints: cartTotal,
          createdAt: serverTimestamp(),
          status: "completed",
        });

        setPoints(newBalance);
      });

      setCart({});
      setSuccessMessage("Bestelling succesvol geplaatst! 🎉");
    } catch (err) {
      console.error("Checkout fout:", err);
      setError(err.message || "Er ging iets mis bij het afrekenen.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // -------------------------
  // UI
  // -------------------------
  if (loading) {
    return <p style={{ padding: 20 }}>🛒 Shop wordt geladen...</p>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Fegon Shop</h1>
            <p style={styles.subtitle}>
              Wissel je Fegon Drops in voor producten en beloningen.
            </p>
          </div>
          <div style={styles.balanceCard}>
            <span style={styles.balanceLabel}>Saldo</span>
            <span style={styles.balanceValue}>
              {points.toLocaleString()} Drops
            </span>
          </div>
        </header>

        {error && (
          <div style={{ ...styles.alert, ...styles.alertError }}>{error}</div>
        )}

        {successMessage && (
          <div style={{ ...styles.alert, ...styles.alertSuccess }}>
            {successMessage}
          </div>
        )}

        <div style={styles.grid}>
          {/* Producten */}
          <section style={styles.leftCol}>
            <h2 style={styles.sectionTitle}>Producten</h2>
            {products.length === 0 ? (
              <p>Er zijn nog geen producten beschikbaar.</p>
            ) : (
              <div style={styles.productsGrid}>
                {products.map((product) => {
                  const price = getProductPrice(product);
                  return (
                    <div key={product.id} style={styles.productCard}>
                      <div>
                        <h3 style={styles.productTitle}>{product.name}</h3>
                        {product.description && (
                          <p style={styles.productDescription}>
                            {product.description}
                          </p>
                        )}
                      </div>
                      <div style={styles.productFooter}>
                        <div>
                          <span style={styles.priceValue}>{price}</span>
                          <span style={styles.priceLabel}>Drops</span>
                        </div>
                        <button
                          onClick={() => addToCart(product.id)}
                          style={styles.primaryButton}
                        >
                          In winkelwagen
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Winkelwagen */}
          <section style={styles.rightCol}>
            <h2 style={styles.sectionTitle}>Winkelwagen</h2>
            {cartItems.length === 0 ? (
              <p>Je winkelwagen is leeg.</p>
            ) : (
              <>
                <div style={styles.cartList}>
                  {cartItems.map((item) => (
                    <div key={item.id} style={styles.cartItem}>
                      <div>
                        <div style={styles.cartItemTitle}>{item.name}</div>
                        <div style={styles.cartItemMeta}>
                          {item.price} Drops per stuk
                        </div>
                      </div>
                      <div style={styles.cartItemControls}>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.id, e.target.value)
                          }
                          style={styles.qtyInput}
                        />
                        <div style={styles.cartItemTotal}>
                          {item.lineTotal} Drops
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          style={styles.removeButton}
                          title="Verwijderen"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={styles.cartSummary}>
                  <div>
                    <div style={styles.summaryLabel}>Totaal</div>
                    <div style={styles.summaryValue}>
                      {cartTotal.toLocaleString()} Drops
                    </div>
                    {!enoughPoints && (
                      <div style={styles.summaryWarning}>
                        Onvoldoende saldo voor deze bestelling.
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={!enoughPoints || checkoutLoading}
                    style={{
                      ...styles.primaryButton,
                      ...( !enoughPoints || checkoutLoading
                        ? styles.primaryButtonDisabled
                        : {} ),
                    }}
                  >
                    {checkoutLoading ? "Bezig met afrekenen..." : "Afrekenen"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Inter, system-ui, sans-serif",
    background: "#f4f6fb",
    minHeight: "100vh",
    padding: "2rem 1rem",
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1.5rem",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  title: {
    margin: 0,
    fontSize: "1.8rem",
  },
  subtitle: {
    margin: "0.4rem 0 0",
    color: "#555",
    fontSize: "0.95rem",
  },
  balanceCard: {
    background: "#fff",
    padding: "0.9rem 1.2rem",
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    minWidth: 180,
    textAlign: "right",
  },
  balanceLabel: {
    display: "block",
    fontSize: 12,
    color: "#777",
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#004aad",
  },
  alert: {
    padding: "0.6rem 0.8rem",
    borderRadius: 8,
    marginBottom: "1rem",
    fontSize: 14,
  },
  alertError: {
    background: "#ffe5e5",
    color: "#a00",
  },
  alertSuccess: {
    background: "#e5ffe8",
    color: "#0a7a26",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "2fr 1.3fr",
    gap: "1.5rem",
  },
  leftCol: {
    minWidth: 0,
  },
  rightCol: {
    minWidth: 0,
  },
  sectionTitle: {
    margin: "0 0 0.8rem",
    fontSize: "1.1rem",
  },
  productsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  productCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "1rem",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 150,
  },
  productTitle: {
    margin: "0 0 0.4rem",
    fontSize: "1rem",
  },
  productDescription: {
    margin: 0,
    color: "#666",
    fontSize: 13,
  },
  productFooter: {
    marginTop: "0.8rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.8rem",
  },
  priceValue: {
    display: "block",
    fontWeight: "bold",
    fontSize: 18,
  },
  priceLabel: {
    display: "block",
    fontSize: 11,
    color: "#777",
  },
  primaryButton: {
    background: "#004aad",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "0.5rem 1rem",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 14,
    whiteSpace: "nowrap",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  cartList: {
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    padding: "0.8rem",
    maxHeight: 340,
    overflowY: "auto",
  },
  cartItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.8rem",
    padding: "0.5rem 0.3rem",
    borderBottom: "1px solid #eee",
    alignItems: "center",
  },
  cartItemTitle: {
    fontSize: 14,
    fontWeight: 500,
  },
  cartItemMeta: {
    fontSize: 12,
    color: "#777",
  },
  cartItemControls: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  qtyInput: {
    width: 55,
    padding: "0.2rem 0.3rem",
    textAlign: "right",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 13,
  },
  cartItemTotal: {
    fontSize: 13,
    minWidth: 80,
    textAlign: "right",
  },
  removeButton: {
    border: "none",
    background: "transparent",
    color: "#a00",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
  },
  cartSummary: {
    marginTop: "1rem",
    background: "#fff",
    borderRadius: 12,
    padding: "0.9rem 1rem",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#777",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  summaryWarning: {
    marginTop: 4,
    fontSize: 12,
    color: "#a00",
  },
};
