import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container-wide footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <span className="logo-mark">●</span>
            <span className="logo-text">Chronicles</span>
          </Link>
          <p className="footer-tagline">A platform for serious writing.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <div className="footer-col-title">Platform</div>
            <Link to="/" className="footer-link">
              Discover
            </Link>
            <Link to="/search" className="footer-link">
              Search
            </Link>
            <Link to="/signup" className="footer-link">
              Start writing
            </Link>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Account</div>
            <Link to="/signin" className="footer-link">
              Sign in
            </Link>
            <Link to="/signup" className="footer-link">
              Create account
            </Link>
            <Link to="/settings" className="footer-link">
              Settings
            </Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container-wide">
          <span>
            © {new Date().getFullYear()} Chronicles. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
