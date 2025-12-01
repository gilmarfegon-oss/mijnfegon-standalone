// ✅ src/components/Admin/AdminProducten.jsx
import React, { useState, useEffect } from "react";
import { db, storage } from "../../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import AdminMenu from "./AdminMenu";

export default function AdminProducten() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    points: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [melding, setMelding] = useState("");

  // ✅ Realtime producten laden
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "products"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(list);
    });
    return () => unsub();
  }, []);

  function handleFile(e) {
    setImageFile(e.target.files[0]);
  }

  // ✅ Product toevoegen
  async function handleSubmit(e) {
    e.preventDefault();
    setMelding("");

    if (!form.name || !form.points) {
      setMelding("❌ Vul alle verplichte velden in.");
      return;
    }

    if (!imageFile) {
      setMelding("❌ Je moet een productafbeelding toevoegen.");
      return;
    }

    try {
      const path = `productImages/${Date.now()}_${imageFile.name}`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, imageFile);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "products"), {
        name: form.name,
        description: form.description || "",
        points: Number(form.points),
        imageUrl: url,
        imagePath: path,
        createdAt: serverTimestamp(),
      });

      setMelding("✅ Product toegevoegd!");
      setForm({ name: "", description: "", points: "" });
      setImageFile(null);
    } catch (err) {
      console.error(err);
      setMelding("❌ Fout bij opslaan van product.");
    }
  }

  // ✅ Product verwijderen (incl. afbeelding)
  async function removeProduct(product) {
    try {
      await deleteDoc(doc(db, "products", product.id));

      if (product.imagePath) {
        await deleteObject(ref(storage, product.imagePath));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Kon product niet verwijderen.");
    }
  }

  // ✅ Zoeken
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-layout">
      <AdminMenu />

      <div className="admin-content">
        <h1>🛒 Productbeheer</h1>

        {/* ✅ Zoekveld */}
        <input
          className="admin-search"
          placeholder="Zoek productnaam..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* ✅ Producttoevoeg form */}
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>➕ Nieuw product</h2>

          <input
            type="text"
            placeholder="Productnaam"
            value={form.name}
            required
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <textarea
            placeholder="Omschrijving (optioneel)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <input
            type="number"
            placeholder="Aantal punten"
            value={form.points}
            required
            onChange={(e) => setForm({ ...form, points: e.target.value })}
          />

          <input type="file" accept="image/*" onChange={handleFile} />

          <button type="submit" className="admin-btn">
            ✅ Opslaan
          </button>

          {melding && <p style={{ marginTop: 10 }}>{melding}</p>}
        </form>

        {/* ✅ Productlijst */}
        <h2 style={{ marginTop: "2rem" }}>📦 Alle producten</h2>

        <div className="admin-grid">
          {filteredProducts.map((p) => (
            <div key={p.id} className="admin-card">
              <img src={p.imageUrl} className="admin-card-img" alt={p.name} />

              <h3>{p.name}</h3>
              <p style={{ color: "#004aad", fontWeight: "bold" }}>
                {p.points} punten
              </p>

              <button
                className="admin-btn-danger"
                onClick={() => removeProduct(p)}
              >
                ❌ Verwijderen
              </button>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <p className="admin-empty">Geen producten gevonden.</p>
          )}
        </div>
      </div>
    </div>
  );
}
