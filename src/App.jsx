import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";

// Reguliere Componenten
import Header from "./components/Header";
import Footer from "./components/Footer";
import CookieBanner from "./components/CookieBanner";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Voorwaarden from "./pages/Voorwaarden";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import ProfielAanvullen from "./components/ProfielAanvullen";
import RegistratieFormulier from "./components/RegistratieFormulier";
import MyRegistrations from "./components/MyRegistrations";
import Shop from "./components/Shop";
import MijnBestellingen from "./components/MijnBestellingen";
import Instellingen from "./components/Instellingen";

// Admin Componenten
import AdminDashboard from "./components/Admin/AdminDashboard";
import AdminUsers from "./components/Admin/AdminUsers";
import AdminInstallers from "./components/Admin/AdminInstallers";
import AdminRegistraties from "./components/Admin/AdminRegistraties";
import AdminProducten from "./components/Admin/AdminProducten";
import AdminBestellingen from "./components/Admin/AdminBestellingen";
import AdminPunten from "./components/Admin/AdminPunten";
import AdminKoppelen from "./components/Admin/AdminKoppelen";
import AdminImportExport from "./components/Admin/AdminImportExport";
import AdminLogboek from "./components/Admin/AdminLogboek";
import AdminInstellingen from "./components/Admin/AdminInstellingen";

// Beveiligings-wrapper: vereist ingelogd + compleet profiel
function ProtectedRoute({ user, incomplete, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (incomplete) return <Navigate to="/profiel-aanvullen" replace />;
  return children;
}

ProtectedRoute.propTypes = {
  user: PropTypes.object,
  incomplete: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

// Beveiligings-wrapper voor Admin routes
function AdminRoute({ user, role, loading, children }) {
  if (loading) return <div className="p-4">Laden...</div>;
  if (!user || role !== "admin") return <Navigate to="/" replace />;
  return children;
}

AdminRoute.propTypes = {
  user: PropTypes.object,
  role: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let unsubDoc = null;

    const unsub = onAuthStateChanged(auth, (currentUser) => {
      // Unsubscribe previous Firestore listener before changing user
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      setUser(currentUser);

      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        // Realtime sync met Firestore
        unsubDoc = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setUserData(snap.data());
          } else {
            console.warn("Gebruiker heeft nog geen document in Firestore.");
            setUserData({ role: "user", profile_completed: false });
          }
          setLoading(false);
        }, (err) => {
          console.error("Firestore Snapshot Error:", err);
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsub();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="text-center">
          <p>MijnFegon laden...</p>
        </div>
      </div>
    );
  }

  const role = userData?.role || "user";

  // Controleer of profiel compleet is
  const isProfileComplete = userData?.profile_completed === true || userData?.profileCompleted === true;
  const isProfileIncomplete = user && role !== "admin" && !isProfileComplete;

  return (
    <div className="page-wrapper">
      {user && !["/login", "/register"].includes(location.pathname) && (
        <Header user={user} role={role} isAdmin={role === "admin"} />
      )}

      <div style={{ flex: 1, width: "100%" }}>
        <Routes>
          {/* --- PUBLIEK (geen auth vereist) --- */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/voorwaarden" element={<Voorwaarden />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

          {/* --- ONBOARDING --- */}
          <Route
            path="/profiel-aanvullen"
            element={user ? <ProfielAanvullen user={user} /> : <Navigate to="/login" />}
          />

          {/* --- PORTAAL --- */}
          <Route
            path="/"
            element={
              !user ? <Navigate to="/login" /> :
              isProfileIncomplete ? <Navigate to="/profiel-aanvullen" /> :
              <Dashboard user={user} />
            }
          />

          {/* Beveiligde user routes */}
          <Route
            path="/registratie-product"
            element={
              <ProtectedRoute user={user} incomplete={isProfileIncomplete}>
                <RegistratieFormulier user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mijn-registraties"
            element={
              <ProtectedRoute user={user} incomplete={isProfileIncomplete}>
                <MyRegistrations user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mijn-bestellingen"
            element={
              <ProtectedRoute user={user} incomplete={isProfileIncomplete}>
                <MijnBestellingen user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shop"
            element={
              <ProtectedRoute user={user} incomplete={isProfileIncomplete}>
                <Shop user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instellingen"
            element={
              <ProtectedRoute user={user} incomplete={isProfileIncomplete}>
                <Instellingen user={user} />
              </ProtectedRoute>
            }
          />

          {/* --- ADMIN --- */}
          <Route path="/admin/*" element={
            <AdminRoute user={user} role={role} loading={loading}>
              <Routes>
                <Route path="/" element={<AdminDashboard user={user} />} />
                <Route path="users" element={<AdminUsers user={user} />} />
                <Route path="installers" element={<AdminInstallers user={user} />} />
                <Route path="registraties" element={<AdminRegistraties user={user} />} />
                <Route path="producten" element={<AdminProducten user={user} />} />
                <Route path="bestellingen" element={<AdminBestellingen user={user} />} />
                <Route path="punten" element={<AdminPunten user={user} />} />
                <Route path="koppelen" element={<AdminKoppelen user={user} />} />
                <Route path="import-export" element={<AdminImportExport user={user} />} />
                <Route path="logboek" element={<AdminLogboek user={user} />} />
                <Route path="instellingen" element={<AdminInstellingen user={user} />} />
              </Routes>
            </AdminRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>

      <Footer />
      <CookieBanner />
    </div>
  );
}
