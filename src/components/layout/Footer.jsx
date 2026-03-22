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
          <p className="footer-tagline">Ideas worth following, writing worth keeping.</p>
          <div className="footer-cta">
            <Link to="/topics" className="footer-pill">
              Explore Topics
            </Link>
            <Link to="/signup" className="footer-pill footer-pill-primary">
              Start Writing
            </Link>
          </div>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <div className="footer-col-title">Discover</div>
            <Link to="/" className="footer-link">
              Home
            </Link>
            <Link to="/search" className="footer-link">
              Search
            </Link>
            <Link to="/topics" className="footer-link">
              Topics
            </Link>
            <Link to="/for-you" className="footer-link">
              For You
            </Link>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Community</div>
            <Link to="/community" className="footer-link">
              Discussions
            </Link>
            <Link to="/feed" className="footer-link">
              Following Feed
            </Link>
            <Link to="/bookmarks" className="footer-link">
              Bookmarks
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
        <div className="container-wide footer-bottom-inner">
          <span>© {new Date().getFullYear()} Chronicles</span>
          <span className="footer-bottom-note">
            Powered by{" "}
            <a
              className="footer-dev-link"
              href="https://www.linkedin.com/in/oluwaferanmi-oresajo"
              target="_blank"
              rel="noreferrer"
            >
              FERANMI
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
