// src/components/Admin/AdminProducten.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

export default function AdminProducten({ user }) {
  const [producten, setProducten] = useState([]);
  const [nieuwProduct, setNieuwProduct] = useState({
    name: "",
    description: "",
    points: "",
    image: "",
    active: true,
  });
  const [bewerktProduct, setBewerktProduct] = useState(null);
  const [melding, setMelding] = useState("");

  // 🔹 Realtime producten ophalen
  useEffect(() => {
    const ref = collection(db, "products");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducten(data);
      },
      (error) => {
        console.error("AdminProducten onSnapshot error:", error.code, error.message);
        setMelding(
          "❌ Kan producten niet laden (onvoldoende rechten of netwerkprobleem)."
        );
      }
    );

    return () => unsub();
  }, []);

  // 🔹 Helper: melding tonen
  const showMelding = (text) => {
    setMelding(text);
    if (text) {
      setTimeout(() => setMelding(""), 4000);
    }
  };

  // 🔹 Nieuw product toevoegen
  async function voegProductToe() {
    if (!nieuwProduct.name || !nieuwProduct.points) {
      showMelding("⚠️ Vul ten minste een naam en aantal punten in.");
      return;
    }

    try {
      await addDoc(collection(db, "products"), {
        name: nieuwProduct.name.trim(),
        description: nieuwProduct.description.trim(),
        points: Number(nieuwProduct.points),
        image: nieuwProduct.image.trim(),
        active: nieuwProduct.active,
        createdAt: serverTimestamp(),
        createdBy: user ? user.uid : null,
      });

      setNieuwProduct({
        name: "",
        description: "",
        points: "",
        image: "",
        active: true,
      });

      showMelding("✅ Product succesvol toegevoegd!");
    } catch (err) {
      console.error("voegProductToe error:", err);
      showMelding("❌ Fout bij toevoegen: " + err.message);
    }
  }

  // 🔹 Bestaand product opslaan
  async function updateProduct() {
    if (!bewerktProduct) return;

    try {
      const ref = doc(db, "products", bewerktProduct.id);
      await updateDoc(ref, {
        name: bewerktProduct.name.trim(),
        description: bewerktProduct.description.trim(),
        points: Number(bewerktProduct.points),
        image: bewerktProduct.image.trim(),
        active: !!bewerktProduct.active,
        updatedAt: serverTimestamp(),
        updatedBy: user ? user.uid : null,
      });

      setBewerktProduct(null);
      showMelding("✅ Product succesvol bijgewerkt!");
    } catch (err) {
      console.error("updateProduct error:", err);
      showMelding("❌ Fout bij bewerken: " + err.message);
    }
  }

  // 🔹 Product verwijderen
  async function verwijderProduct(id) {
    if (!window.confirm("Weet je zeker dat je dit product wilt verwijderen?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "products", id));
      showMelding("🗑️ Product verwijderd.");
    } catch (err) {
      console.error("verwijderProduct error:", err);
      showMelding("❌ Fout bij verwijderen: " + err.message);
    }
  }

  // 🔹 Toggle actief / inactief
  async function toggleActive(product) {
    try {
      const ref = doc(db, "products", product.id);
      await updateDoc(ref, {
        active: !product.active,
        updatedAt: serverTimestamp(),
        updatedBy: user ? user.uid : null,
      });
    } catch (err) {
      console.error("toggleActive error:", err);
      showMelding("❌ Fout bij wijzigen van status: " + err.message);
    }
  }

  return (
    <div style={styles.page}>
      <h1>🛠️ Admin – Producten</h1>
      <p style={{ color: "#555" }}>
        Beheer alle producten die zichtbaar zijn in de Fegon Shop.
      </p>

      {/* ✅ Nieuw product toevoegen */}
      <div style={styles.addBox}>
        <h2>Nieuw product toevoegen</h2>
        <input
          style={styles.input}
          placeholder="Naam van het product"
          value={nieuwProduct.name}
          onChange={(e) =>
            setNieuwProduct({ ...nieuwProduct, name: e.target.value })
          }
        />
        <textarea
          style={styles.textarea}
          placeholder="Beschrijving"
          value={nieuwProduct.description}
          onChange={(e) =>
            setNieuwProduct({
              ...nieuwProduct,
              description: e.target.value,
            })
          }
        />
        <input
          style={styles.input}
          placeholder="Aantal punten (Fegon Drops)"
          type="number"
          value={nieuwProduct.points}
          onChange={(e) =>
            setNieuwProduct({ ...nieuwProduct, points: e.target.value })
          }
        />
        <input
          style={styles.input}
          placeholder="Afbeelding URL (optioneel)"
          value={nieuwProduct.image}
          onChange={(e) =>
            setNieuwProduct({ ...nieuwProduct, image: e.target.value })
          }
        />
        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={nieuwProduct.active}
            onChange={(e) =>
              setNieuwProduct({ ...nieuwProduct, active: e.target.checked })
            }
          />
          <span>Actief (zichtbaar in shop)</span>
        </label>
        <button onClick={voegProductToe} style={styles.saveBtn}>
          ➕ Toevoegen
        </button>
      </div>

      {/* 📋 Overzicht producten */}
      <h2 style={{ marginTop: "2rem" }}>Bestaande producten</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Naam</th>
              <th>Beschrijving</th>
              <th>Punten</th>
              <th>Afbeelding</th>
              <th>Status</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            {producten.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.description}</td>
                <td>{p.points}</td>
                <td>
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      style={{
                        width: 50,
                        height: 50,
                        objectFit: "cover",
                        borderRadius: 6,
                      }}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <span
                    style={{
                      padding: "0.2rem 0.6rem",
                      borderRadius: 999,
                      fontSize: 12,
                      background: p.active ? "#e5ffe7" : "#ffe5e5",
                      color: p.active ? "#0a7a26" : "#a00",
                    }}
                  >
                    {p.active ? "Actief" : "Inactief"}
                  </span>
                </td>
                <td>
                  <button
                    style={styles.smallBtn}
                    onClick={() => toggleActive(p)}
                  >
                    {p.active ? "Deactiveren" : "Activeren"}
                  </button>
                  <button
                    style={styles.editBtn}
                    onClick={() => setBewerktProduct(p)}
                  >
                    ✏️ Bewerken
                  </button>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => verwijderProduct(p.id)}
                  >
                    🗑️ Verwijderen
                  </button>
                </td>
              </tr>
            ))}
            {producten.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: "1rem", textAlign: "center" }}>
                  Geen producten gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✏️ Bewerken sectie */}
      {bewerktProduct && (
        <div style={styles.editBox}>
          <h2>Product bewerken</h2>
          <input
            style={styles.input}
            value={bewerktProduct.name}
            onChange={(e) =>
              setBewerktProduct({ ...bewerktProduct, name: e.target.value })
            }
          />
          <textarea
            style={styles.textarea}
            value={bewerktProduct.description}
            onChange={(e) =>
              setBewerktProduct({
                ...bewerktProduct,
                description: e.target.value,
              })
            }
          />
          <input
            style={styles.input}
            type="number"
            value={bewerktProduct.points}
            onChange={(e) =>
              setBewerktProduct({
                ...bewerktProduct,
                points: e.target.value,
              })
            }
          />
          <input
            style={styles.input}
            value={bewerktProduct.image}
            onChange={(e) =>
              setBewerktProduct({ ...bewerktProduct, image: e.target.value })
            }
          />
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={!!bewerktProduct.active}
              onChange={(e) =>
                setBewerktProduct({
                  ...bewerktProduct,
                  active: e.target.checked,
                })
              }
            />
            <span>Actief (zichtbaar in shop)</span>
          </label>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button onClick={updateProduct} style={styles.saveBtn}>
              💾 Opslaan
            </button>
            <button
              onClick={() => setBewerktProduct(null)}
              style={styles.cancelBtn}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {melding && <p style={styles.message}>{melding}</p>}
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "Inter, system-ui, sans-serif",
    padding: "2rem",
    background: "#f4f6fb",
    minHeight: "100vh",
  },
  addBox: {
    background: "#fff",
    padding: "1.5rem",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    marginBottom: "2rem",
  },
  editBox: {
    background: "#fff8e1",
    padding: "1.5rem",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    marginTop: "2rem",
  },
  input: {
    width: "100%",
    padding: "0.6rem",
    borderRadius: 8,
    border: "1px solid #ccc",
    marginBottom: "0.8rem",
  },
  textarea: {
    width: "100%",
    height: "80px",
    padding: "0.6rem",
    borderRadius: 8,
    border: "1px solid #ccc",
    marginBottom: "0.8rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  },
  saveBtn: {
    background: "#004aad",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0.6rem 1.2rem",
    cursor: "pointer",
    fontWeight: "bold",
  },
  cancelBtn: {
    background: "#ccc",
    color: "#000",
    border: "none",
    borderRadius: 8,
    padding: "0.6rem 1.2rem",
    cursor: "pointer",
  },
  smallBtn: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "0.3rem 0.6rem",
    cursor: "pointer",
    marginRight: "0.4rem",
    fontSize: 12,
  },
  editBtn: {
    background: "#ff9800",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "0.4rem 0.8rem",
    cursor: "pointer",
    marginRight: "0.4rem",
  },
  deleteBtn: {
    background: "#e53935",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "0.4rem 0.8rem",
    cursor: "pointer",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    marginBottom: "0.8rem",
    fontSize: 14,
  },
  message: {
    marginTop: "1rem",
    textAlign: "center",
    color: "#004aad",
    fontWeight: "bold",
  },
};
