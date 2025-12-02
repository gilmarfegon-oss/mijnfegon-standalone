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
          setPoints(data.points_total || 0);
        } else {
          setPoints(0);
        }

        // 2. producten ophalen
        const productsRef = collection(db, "products");
        const productsSnap = await getDocs(productsRef);

        const list = productsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.active !== false); // alleen actieve producten

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
        return {
          ...product,
          quantity,
          // prijs in drops = product.points
          lineTotal: (product.points || 0) * quantity,
        };
      })
      .filter(Boolean);
  }, [cart, products]);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [cartItems]
  );

  const enoughPoints = points >= cartTotal;

  // -------------------------
  // Checkout (points_total aanpassen + order opslaan)
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
        const current = data.points_total || 0;

        if (current < cartTotal) {
          throw new Error(
            "Onvoldoende Fegon Drops. Je saldo is tussentijds gewijzigd."
          );
        }

        const newBalance = current - cartTotal;

        // saldo updaten in Firestore
        transaction.update(userRef, { points_total: newBalance });

        // order opslaan
        const orderRef = doc(ordersRef);
        transaction.set(orderRef, {
          userId: user.uid,
          items: cartItems.map((item) => ({
            productId: item.id,
            name: item.name,
            points: item.points || 0, // prijs per stuk in punten
            quantity: item.quantity,
          })),
          totalPoints: cartTotal,
          createdAt: serverTimestamp(),
          status: "completed",
        });

        // UI-saldo bijwerken
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
    <div style={{ padding: "20px", maxWidth: 900, margin: "0 auto" }}>
      <header style={{ marginBottom: 20 }}>
        <h1>Fegon Shop</h1>
        <p>
          Saldo:{" "}
          <strong>{points.toLocaleString()} Fegon Drops</strong>
        </p>
      </header>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 4,
            backgroundColor: "#ffe5e5",
            color: "#a00",
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 4,
            backgroundColor: "#e5ffe8",
            color: "#0a7a26",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Producten */}
      <section style={{ marginBottom: 40 }}>
        <h2>Producten</h2>
        {products.length === 0 && <p>Er zijn nog geen producten beschikbaar.</p>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 180,
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 8px" }}>{product.name}</h3>
                {product.description && (
                  <p style={{ margin: "0 0 8px", fontSize: 14 }}>
                    {product.description}
                  </p>
                )}
                <p style={{ margin: 0 }}>
                  <strong>{product.points}</strong> Fegon Drops
                </p>
              </div>
              <button
                onClick={() => addToCart(product.id)}
                style={{
                  marginTop: 10,
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                In winkelwagen
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Winkelwagen */}
      <section>
        <h2>Winkelwagen</h2>
        {cartItems.length === 0 ? (
          <p>Je winkelwagen is leeg.</p>
        ) : (
          <>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: 16,
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>Product</th>
                  <th style={{ textAlign: "right", padding: 8 }}>Prijs</th>
                  <th style={{ textAlign: "right", padding: 8 }}>Aantal</th>
                  <th style={{ textAlign: "right", padding: 8 }}>Totaal</th>
                  <th style={{ padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: 8 }}>{item.name}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>
                      {item.points} Drops
                    </td>
                    <td style={{ padding: 8, textAlign: "right" }}>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.id, e.target.value)
                        }
                        style={{ width: 60, textAlign: "right" }}
                      />
                    </td>
                    <td style={{ padding: 8, textAlign: "right" }}>
                      {item.lineTotal} Drops
                    </td>
                    <td style={{ padding: 8, textAlign: "center" }}>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "#a00",
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <p style={{ margin: 0 }}>
                Totaal:{" "}
                <strong>{cartTotal.toLocaleString()} Fegon Drops</strong>
                {!enoughPoints && (
                  <span style={{ color: "#a00", marginLeft: 8 }}>
                    (Onvoldoende saldo)
                  </span>
                )}
              </p>

              <button
                onClick={handleCheckout}
                disabled={!enoughPoints || checkoutLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "none",
                  fontWeight: "bold",
                  cursor:
                    enoughPoints && !checkoutLoading ? "pointer" : "not-allowed",
                  opacity: enoughPoints && !checkoutLoading ? 1 : 0.6,
                }}
              >
                {checkoutLoading ? "Bezig met afrekenen..." : "Afrekenen"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
