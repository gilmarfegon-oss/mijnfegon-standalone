// src/components/Admin/AdminMenu.jsx
import { Link } from "react-router-dom";

export default function AdminMenu() {
  return (
    <div className="admin-menu">
      <h2 style={{ marginBottom: "1rem" }}>⚙️ Admin</h2>

      <nav className="admin-nav">
        <Link to="/admin">📊 Dashboard</Link>
        <Link to="/admin/users">👥 Gebruikers</Link>
        <Link to="/admin/registraties">📄 Registraties</Link>
        <Link to="/admin/producten">🛒 Producten</Link>
        <Link to="/admin/punten">⭐ Punten</Link>
        <Link to="/admin/koppelingen">🔗 Koppelingen</Link>
        <Link to="/admin/importexport">📤 Import / Export</Link>
        <Link to="/admin/logboek">📚 Logboek</Link>
        <Link to="/admin/instellingen">⚙️ Instellingen</Link>
      </nav>
    </div>
  );
}
