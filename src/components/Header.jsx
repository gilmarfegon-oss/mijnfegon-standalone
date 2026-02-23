import { useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function Header({ user, isAdmin }) {
  const navigate = useNavigate();
  const [adminOpen, setAdminOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <nav className="nav-header">
      <div className="container header-flex">
        
        {/* LOGO SECTIE: Afbeeldingen uit /public map */}
        <Link to="/" className="logo-group">
          <img src="/logo-fegon.png" alt="Fegon" className="logo-img" />
          <span className="logo-divider">|</span>
          <img src="/logo-mijnfegon.png" alt="MijnFegon" className="logo-img" />
        </Link>

        {/* ACTIES: ADMIN & LOGOUT */}
        <div className="header-actions">
          {user && isAdmin && (
            <div className="admin-wrapper">
              <button 
                className="btn btn-secondary admin-btn" 
                onClick={() => setAdminOpen(!adminOpen)}
              >
                ⚙️ <span className="desktop-only">Beheer</span> {adminOpen ? "▲" : "▼"}
              </button>
              
              {adminOpen && (
                <div className="admin-dropdown" onClick={() => setAdminOpen(false)}>
                  <div className="dropdown-title">ADMIN MENU</div>
                  <Link to="/admin">📊 Dashboard</Link>
                  <Link to="/admin/users">👥 Gebruikers</Link>
                  <Link to="/admin/installers">🛠️ Installateurs (Sync)</Link>
                  <Link to="/admin/registraties">📋 Registraties</Link>
                  <Link to="/admin/producten">🛍️ Shop Producten</Link>
                  <Link to="/admin/bestellingen">📦 Bestellingen</Link>
                  <Link to="/admin/punten">🪙 Puntenbeheer</Link>
                  <Link to="/admin/koppelen">🔗 Apparaten Koppelen</Link>
                  <Link to="/admin/import-export">💾 Import/Export</Link>
                  <Link to="/admin/logboek">📜 Logboek</Link>
                  <Link to="/admin/instellingen">⚙️ Instellingen</Link>
                </div>
              )}
            </div>
          )}

          {user && !isAdmin && (
            <Link to="/instellingen" className="btn btn-secondary">
              <span className="desktop-only">Instellingen</span>
              <span className="mobile-only">⚙️</span>
            </Link>
          )}

          {user && (
            <button onClick={handleLogout} className="btn btn-danger">
              <span className="desktop-only">Uitloggen</span>
              <span className="mobile-only">🚪</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

Header.propTypes = {
  user: PropTypes.shape({
    uid: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
  }),
  isAdmin: PropTypes.bool,
};