// src/components/Admin/AdminProducten.jsx
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { db, storage } from "../../firebase"; 
import { 
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp, setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import AdminLayout from "./AdminLayout";
import { logAdminAction } from "../../adminTools/logAdminAction";

export default function AdminProducten({ user }) {
  const [producten, setProducten] = useState([]);
  const [categories, setCategories] = useState(["Cadeaubonnen", "Gereedschap", "Geluid", "Waterontharders", "Overig"]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const initialForm = {
    name: "",
    description: "",
    points: "",
    image: "",
    category: "Overig",
    active: true,
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    // 1. Luister naar Producten
    const unsubProds = onSnapshot(collection(db, "products"), (snap) => {
      setProducten(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // 2. Luister naar Categorieën (opgeslagen in settings/shop_config)
    const unsubCats = onSnapshot(doc(db, "settings", "shop_config"), (snap) => {
      if (snap.exists() && snap.data().categories) {
        setCategories(snap.data().categories);
      }
    });

    return () => { unsubProds(); unsubCats(); };
  }, []);

  // ➕ Nieuwe Categorie Toevoegen
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) return alert("Categorie bestaat al");

    const updatedCats = [...categories, newCategoryName.trim()];
    try {
      await setDoc(doc(db, "settings", "shop_config"), { categories: updatedCats }, { merge: true });
      setNewCategoryName("");
      alert("✅ Categorie toegevoegd");
      logAdminAction({ type: "category_add", description: `Categorie "${newCategoryName.trim()}" toegevoegd`, collectionName: "settings", adminUid: user?.uid, adminEmail: user?.email });
    } catch (err) {
      alert("Fout bij toevoegen categorie: " + err.message);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData({ ...formData, image: url });
    } catch (err) {
      alert("Upload fout: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.points) return alert("Vul naam en punten in!");

    try {
      if (editingId) {
        await updateDoc(doc(db, "products", editingId), {
          ...formData,
          points: Number(formData.points),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "products"), {
          ...formData,
          points: Number(formData.points),
          createdAt: serverTimestamp(),
        });
      }
      setFormData(initialForm);
      const action = editingId ? "bijgewerkt" : "aangemaakt";
      setEditingId(null);
      alert("✅ Opgeslagen!");
      logAdminAction({ type: `product_${editingId ? "update" : "create"}`, description: `Product "${formData.name}" ${action}`, collectionName: "products", adminUid: user?.uid, adminEmail: user?.email });
    } catch (err) { alert(err.message); }
  };

  return (
    <AdminLayout user={user}>
      <div style={{ padding: "1rem" }}>
        <h1>🛠️ Product- & Categoriebeheer</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          
          {/* PRODUCT FORMULIER */}
          <div style={styles.card}>
            <h3>{editingId ? "Product Bewerken" : "Nieuw Product"}</h3>
            <form onSubmit={handleSubmit} style={styles.gridForm}>
              <input style={styles.input} placeholder="Naam" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              
              <select style={styles.input} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <input style={styles.input} type="number" placeholder="Drops" value={formData.points} onChange={e => setFormData({...formData, points: e.target.value})} />
              
              <div style={styles.uploadBox}>
                <input type="file" onChange={handleImageUpload} />
                {formData.image && <img src={formData.image} width="40" height="40" alt="thumb" />}
              </div>

              <textarea style={{...styles.input, gridColumn: 'span 2'}} placeholder="Beschrijving" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              
              <button type="submit" disabled={uploading} style={styles.btnPrimary}>Opslaan</button>
            </form>
          </div>

          {/* CATEGORIE BEHEER */}
          <div style={styles.card}>
            <h3>Categorieën</h3>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              <input 
                style={{...styles.input, marginBottom: 0}} 
                placeholder="Nieuwe cat..." 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
              />
              <button onClick={handleAddCategory} style={{...styles.btnPrimary, marginTop: 0, width: 'auto'}}>Add</button>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {categories.map(cat => (
                <div key={cat} style={{ padding: '5px', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                  • {cat}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* TABEL */}
        <div style={{...styles.card, marginTop: '20px'}}>
          <table style={styles.table}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>Foto</th>
                <th>Naam</th>
                <th>Categorie</th>
                <th>Drops</th>
                <th>Actie</th>
              </tr>
            </thead>
            <tbody>
              {producten.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #eee' }}>
                  <td><img src={p.image} width="40" alt="p" /></td>
                  <td>{p.name}</td>
                  <td><small>{p.category}</small></td>
                  <td>{p.points}</td>
                  <td>
                    <button onClick={() => { setEditingId(p.id); setFormData(p); }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✏️</button>
                    <button onClick={async () => { await deleteDoc(doc(db, "products", p.id)); logAdminAction({ type: "product_delete", description: `Product "${p.name}" verwijderd`, collectionName: "products", adminUid: user?.uid, adminEmail: user?.email }); }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>🗑️</button>
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

AdminProducten.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
};

const styles = {
  card: { background: "#fff", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  gridForm: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "10px" },
  btnPrimary: { background: "#004aad", color: "#fff", border: "none", padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "10px" },
  uploadBox: { background: '#f9f9f9', padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }
};