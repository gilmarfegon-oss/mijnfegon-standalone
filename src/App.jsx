import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

// Gebruikerscomponenten
import Dashboard from "./components/Dashboard";
import Shop from "./components/Shop";
import Settings from "./components/Instellingen";
import ProfielAanvullen from "./components/ProfielAanvullen";
import RegistratieFormulier from "./components/RegistratieFormulier";

// Login + Register
import Login from "./components/Login";
import Register from "./components/Register";

// Admin componenten
import AdminDashboard from "./components/Admin/AdminDashboard";
import AdminUsers from "./components/Admin/AdminUsers";
import AdminRegistraties from "./components/Admin/AdminRegistraties";
import AdminProducten from "./components/Admin/AdminProducten";
import AdminPunten from "./components/Admin/AdminPunten";
import AdminKoppelen from "./components/Admin/AdminKoppelen";
import AdminImportExport from "./components/Admin/AdminImportExport";
import AdminLogboek from "./components/Admin/AdminLogboek";
import AdminInstellingen from "./components/Admin/AdminInstellingen";

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth observer
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        const ref = doc(db, "users", currentUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setRole(data.role || "user");
          setProfileCompleted(data.profile_completed || false);
        }
      } else {
        setUser(null);
        setRole("");
        setProfileCompleted(false);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return <p style={{ padding: 20 }}>⏳ Laden...</p>;

  // Niet ingelogd → toon login
  if (!user)
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );

  // Profiel incomplete
  if (!profileCompleted) return <ProfielAanvullen user={user} />;

  // Admin beveiliging
  const AdminRoute = ({ children }) =>
    role === "admin" ? children : <Navigate to="/" replace />;

  return (
    <Routes>
      {/* Gebruikersroutes */}
      <Route path="/" element={<Dashboard user={user} role={role} />} />
      <Route path="/shop" element={<Shop user={user} />} />
      <Route path="/instellingen" element={<Settings user={user} />} />
      <Route path="/registratie" element={<RegistratieFormulier user={user} />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsers user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/registraties"
        element={
          <AdminRoute>
            <AdminRegistraties user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/producten"
        element={
          <AdminRoute>
            <AdminProducten user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/punten"
        element={
          <AdminRoute>
            <AdminPunten user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/koppelingen"
        element={
          <AdminRoute>
            <AdminKoppelen user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/importexport"
        element={
          <AdminRoute>
            <AdminImportExport user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/logboek"
        element={
          <AdminRoute>
            <AdminLogboek user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/instellingen"
        element={
          <AdminRoute>
            <AdminInstellingen user={user} />
          </AdminRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
