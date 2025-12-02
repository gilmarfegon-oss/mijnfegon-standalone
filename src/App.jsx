// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
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

// =======================
// Admin route wrapper
// =======================
function AdminRoute({ role, children }) {
  return role === "admin" ? children : <Navigate to="/" replace />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hoe lang een gebruiker ingelogd mag blijven zonder activiteit (ms)
  const INACTIVITY_TIMEOUT = 7.5 * 30 * 500; // 7,5 minuten

  // =======================
  // Auth observer
  // =======================
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
        } else {
          setRole("user");
          setProfileCompleted(false);
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

  // =======================
  // Auto-logout bij inactiviteit
  // =======================
  useEffect(() => {
    // Alleen als iemand is ingelogd
    if (!user) return;

    let timerId;

    const resetTimer = () => {
      if (timerId) clearTimeout(timerId);

      timerId = setTimeout(() => {
        console.log("Geen activiteit, gebruiker wordt automatisch uitgelogd.");
        signOut(auth); // Dit triggert onAuthStateChanged → user wordt null → redirect naar /login
      }, INACTIVITY_TIMEOUT);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Start de eerste timer
    resetTimer();

    // Cleanup
    return () => {
      if (timerId) clearTimeout(timerId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, INACTIVITY_TIMEOUT]);

  // =======================
  // Rendering
  // =======================
  if (loading) return <p style={{ padding: 20 }}>⏳ Laden...</p>;

  // Niet ingelogd → toon login / register en redirect alles naar /login
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* alles anders naar /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Profiel nog niet compleet → eerst profiel aanvullen
  if (!profileCompleted) {
    return <ProfielAanvullen user={user} />;
  }

  // Ingelogd en profiel compleet
  return (
    <Routes>
      {/* Gebruikersroutes */}
      <Route path="/" element={<Dashboard user={user} role={role} />} />
      <Route path="/shop" element={<Shop user={user} />} />
      <Route path="/instellingen" element={<Settings user={user} />} />
      <Route
        path="/registratie"
        element={<RegistratieFormulier user={user} />}
      />

      {/* Admin-routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute role={role}>
            <AdminDashboard user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <AdminRoute role={role}>
            <AdminUsers user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/registraties"
        element={
          <AdminRoute role={role}>
            <AdminRegistraties user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/producten"
        element={
          <AdminRoute role={role}>
            <AdminProducten user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/punten"
        element={
          <AdminRoute role={role}>
            <AdminPunten user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/koppelingen"
        element={
          <AdminRoute role={role}>
            <AdminKoppelen user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/importexport"
        element={
          <AdminRoute role={role}>
            <AdminImportExport user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/logboek"
        element={
          <AdminRoute role={role}>
            <AdminLogboek user={user} />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/instellingen"
        element={
          <AdminRoute role={role}>
            <AdminInstellingen user={user} />
          </AdminRoute>
        }
      />

      {/* Onbekende route → naar dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
