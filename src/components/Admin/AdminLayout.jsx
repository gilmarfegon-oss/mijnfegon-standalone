import { useState } from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";

export default function AdminLayout({ children }) {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(null);

  // De menulijst (Nu inclusief Installateurs!)
  const menuItems = [
    { path: "/admin", label: "Dashboard", icon: "📊" },
    { path: "/admin/users", label: "Gebruikers", icon: "👥" },
    { path: "/admin/installers", label: "Installateurs (Sync)", icon: "🛠️" }, // <--- NIEUW TOEGEVOEGD
    { path: "/admin/registraties", label: "Registraties", icon: "📋" },
    { path: "/admin/producten", label: "Shop Producten", icon: "🛍️" },
    { path: "/admin/bestellingen", label: "Bestellingen", icon: "📦" },
    { path: "/admin/punten", label: "Puntenbeheer", icon: "🪙" },
    { path: "/admin/koppelen", label: "Apparaten Koppelen", icon: "🔗" },
    { path: "/admin/import-export", label: "Import/Export", icon: "💾" },
    { path: "/admin/logboek", label: "Logboek", icon: "📜" },
    { path: "/admin/instellingen", label: "Instellingen", icon: "⚙️" },
  ];

  return (
    <div style={styles.adminWrapper}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.logoText}>Fegon Admin</h2>
        </div>
        
        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onMouseEnter={() => setIsHovered(item.path)}
              onMouseLeave={() => setIsHovered(null)}
              style={{
                ...styles.navLink,
                backgroundColor: 
                  location.pathname === item.path || isHovered === item.path 
                    ? "rgba(255,255,255,0.1)" 
                    : "transparent",
                borderLeft: location.pathname === item.path 
                  ? "4px solid #3b82f6" 
                  : "4px solid transparent"
              }}
            >
              <span style={styles.icon}>{item.icon}</span>
              <span style={styles.labelText}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <Link to="/" style={styles.exitLink}>
            ← Terug naar Portaal
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        <div style={styles.contentContainer}>
          {children}
        </div>
      </main>
    </div>
  );
}

AdminLayout.propTypes = {
  children: PropTypes.node,
};

const styles = {
  adminWrapper: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f4f7fa",
  },
  sidebar: {
    width: "260px",
    backgroundColor: "#1a202c",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    height: "100vh",
    left: 0,
    top: 0,
    zIndex: 100,
    boxShadow: "4px 0 10px rgba(0,0,0,0.1)",
  },
  sidebarHeader: {
    padding: "2rem 1.5rem",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  logoText: {
    fontSize: "1.2rem",
    margin: 0,
    fontWeight: "800",
    color: "#fff",
  },
  nav: {
    flex: 1,
    padding: "1rem 0",
    overflowY: "auto", 
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    padding: "0.8rem 1.5rem",
    color: "#cbd5e0",
    textDecoration: "none",
    fontSize: "0.95rem",
    transition: "all 0.2s ease",
  },
  icon: {
    marginRight: "15px",
    fontSize: "1.2rem",
    width: "25px",
    textAlign: "center",
  },
  labelText: {
    fontWeight: "500",
  },
  sidebarFooter: {
    padding: "1.5rem",
    borderTop: "1px solid rgba(255,255,255,0.1)",
  },
  exitLink: {
    color: "#a0aec0",
    textDecoration: "none",
    fontSize: "0.85rem",
    display: "block",
  },
  mainContent: {
    flex: 1,
    marginLeft: "260px", // Gelijk aan sidebar breedte
    minHeight: "100vh",
  },
  contentContainer: {
    padding: "40px",
    maxWidth: "1400px",
    margin: "0 auto",
  },
};