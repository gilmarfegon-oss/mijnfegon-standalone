// src/components/ProductenBeheer.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

export default function ProductenBeheer() {
  const [producten, setProducten] = useState([]);
  const [nieuwProduct, setNieuwProduct] = useState({
    name: "",
    description: "",
    points: "",
    image: "",
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
        console.error("ProductenBeheer onSnapshot error:", error.code, error.message);
        setMelding("❌ Kan producten niet laden (rechten of netwerkprobleem).");
      }
    );

    return () => unsub();
  }, []);

  // 🔹 Nieuw product toevoegen
  async function voegProductToe() {
    if (!nieuwProduct.name || !nieuwProduct.points) {
      setMelding("⚠️ Vul ten minste een naam en aantal punten in.");
      return;
    }
    try {
      await addDoc(collection(db, "products"), {
        name: nieuwProduct.name,
        description: nieuwProduct.description,
        points: Number(nieuwProduct.points),
        image: nieuwProduct.image,
        active: true,
        createdAt: serverTimestamp(),
      });
      setNieuwProduct({ name: "", description: "", points: "", image: "" });
      setMelding("✅ Product succesvol toegevoegd!");
    } catch (err) {
      console.error("voegProductToe error:", err);
      setMelding("❌ Fout bij toevoegen: " + err.message);
    }
  }

  // 🔹 Product bewerken
  async function updateProduct() {
    if (!bewerktProduct) return;
    try {
      const ref = doc(db, "products", bewerktProduct.id);
      await updateDoc(ref, {
        name: bewerktProduct.name,
        description: bewerktProduct.description,
        points: Number(bewerktProduct.points),
        image: bewerktProduct.image,
      });
      setBewerktProduct(null);
      setMelding("✅ Product succesvol bijgewerkt!");
    } catch (err) {
      console.error("updateProduct error:", err);
      setMelding("❌ Fout bij bewerken: " + err.message);
    }
  }

  // 🔹 Product verwijderen
  async function verwijderProduct(id) {
    if (!window.confirm("Weet je zeker dat je dit product wilt verwijderen?")) return;

    try {
      await deleteDoc(doc(db, "products", id));
      setMelding("🗑️ Product verwijderd.");
    } catch (err) {
      console.error("verwijderProduct error:", err);
      setMelding("❌ Fout bij verwijderen: " + err.message);
    }
  }

  return (
    <div style={styles.page}>
      <h1>🛠️ Productbeheer</h1>
      <p style={{ color: "#555" }}>
        Beheer alle producten die zichtbaar zijn in de shop.
      </p>

      {/* ✅ Toevoegen */}
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
            setNieuwProduct({ ...nieuwProduct, description: e.target.value })
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
        <button onClick={voegProductToe} style={styles.saveBtn}>
          ➕ Toevoegen
        </button>
      </div>

      {/* 📋 Overzicht producten */}
      <h2 style={{ marginTop: "2rem" }}>Bestaande producten</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Naam</th>
            <th>Beschrijving</th>
            <th>Punten</th>
            <th>Afbeelding</th>
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
        </tbody>
      </table>

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
  message: {
    marginTop: "1rem",
    textAlign: "center",
    color: "#004aad",
    fontWeight: "bold",
  },
};
