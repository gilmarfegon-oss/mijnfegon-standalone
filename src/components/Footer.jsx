import { Link } from "react-router-dom"; // Of gebruik <a> als het externe links zijn

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-flex">
        {/* Linker kant: De links */}
        <div className="footer-links">
          <Link to="/voorwaarden" className="footer-link">Algemene voorwaarden</Link>
          <Link to="/privacy" className="footer-link">Cookies & Privacy policy</Link>
        </div>

        {/* Rechter kant: Copyright */}
        <div className="footer-copy">
          © 2026 Fegon Waterbehandeling
        </div>
      </div>
    </footer>
  );
}