import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import {
  getTheme,
  toggleTheme,
  listenToSystemTheme,
  applyTheme,
} from "../../theme";
import { signOut } from "../../lib/api";
import NotificationBell from "./NotificationBell";
import toast from "react-hot-toast";
import "./Navbar.css";

export default function Navbar() {
  const { user, profile } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState(getTheme());
  const [bottomHidden, setBottomHidden] = useState(false);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target))
        setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("chronicles-theme");
    if (stored) return undefined;
    return listenToSystemTheme((next) => {
      applyTheme(next);
      setTheme(next);
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const scrollingDown = currentY > lastY;
      lastScrollYRef.current = currentY;

      if (currentY < 80) {
        setBottomHidden(false);
        return;
      }
      if (scrollingDown) setBottomHidden(true);
      else setBottomHidden(false);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
    setMenuOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate("/search?q=" + encodeURIComponent(searchQuery.trim()));
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile?.username?.[0]?.toUpperCase() || "?";

  const handleThemeToggle = () => {
    setTheme(toggleTheme());
  };

  const profilePath = user ? `/@${profile?.username}` : "/signin";
  const bottomNavHidden = bottomHidden || mobileOpen;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner container-wide">
        <Link to="/" className="navbar-logo">
          <span className="logo-mark">●</span>
          <span className="logo-text">Chronicles</span>
        </Link>

        <div className="navbar-center">
          <Link
            to="/"
            className={
              "nav-link" + (location.pathname === "/" ? " active" : "")
            }
          >
            Discover
          </Link>
          {user && (
            <Link
              to="/for-you"
              className={
                "nav-link" + (location.pathname === "/for-you" ? " active" : "")
              }
            >
              For You
            </Link>
          )}
          <Link
            to="/topics"
            className={
              "nav-link" + (location.pathname.startsWith("/topics") ? " active" : "")
            }
          >
            Topics
          </Link>
          {user && (
            <Link
              to="/feed"
              className={
                "nav-link" + (location.pathname === "/feed" ? " active" : "")
              }
            >
              Following
            </Link>
          )}
        </div>

        <div className="navbar-right">
          <div className="search-wrapper" ref={searchRef}>
            <button
              className="icon-btn"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            {searchOpen && (
              <form className="search-dropdown" onSubmit={handleSearch}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Search posts or writers…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="search-submit">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
            )}
          </div>

          <button
            className="icon-btn theme-toggle"
            onClick={handleThemeToggle}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8z" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            )}
          </button>

          {user ? (
            <>
              {profile?.is_admin && (
                <Link to="/admin" className="btn btn-secondary btn-sm">
                  Admin
                </Link>
              )}
              <NotificationBell />
              <Link
                to="/dashboard/new"
                className="btn btn-primary btn-sm write-btn"
              >
                Write
              </Link>
              <div className="user-menu-wrapper" ref={menuRef}>
                <button
                  className="avatar-btn"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="avatar"
                      style={{ width: 34, height: 34 }}
                    />
                  ) : (
                    <div
                      className="avatar-placeholder"
                      style={{ width: 34, height: 34, fontSize: "0.8rem" }}
                    >
                      {initials}
                    </div>
                  )}
                </button>
                {menuOpen && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-name">
                        {profile?.full_name || profile?.username}
                      </div>
                      <div className="dropdown-username">
                        @{profile?.username}
                      </div>
                    </div>
                    <div className="dropdown-divider" />
                    <Link
                      to="/dashboard"
                      className="dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/dashboard/new"
                      className="dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      New Post
                    </Link>
                    <Link
                      to={"/@" + profile?.username}
                      className="dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Public Profile
                    </Link>
                    <Link
                      to="/feed"
                      className="dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Following Feed
                    </Link>
                    <Link
                      to="/bookmarks"
                      className="dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Bookmarks
                    </Link>
                    <Link
                      to="/notifications"
                      className="dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Notifications
                    </Link>
                    {profile?.is_admin && (
                      <Link
                        to="/admin"
                        className="dropdown-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        Admin Panel
                      </Link>
                    )}
                    <div className="dropdown-divider" />
                    <Link
                      to="/settings"
                      className="dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      className="dropdown-item dropdown-item-danger"
                      onClick={handleSignOut}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/signin" className="btn btn-secondary btn-sm">
                Sign in
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}

          <button
            className={`mobile-menu-btn ${mobileOpen ? "open" : ""}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <div className={`mobile-menu ${mobileOpen ? "open" : ""}`}>
        <div className="mobile-menu-header">
          <Link to="/" className="navbar-logo">
            <span className="logo-mark">●</span>
            <span className="logo-text">Chronicles</span>
          </Link>
          <button
            className="mobile-menu-close"
            onClick={() => setMobileOpen(false)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mobile-menu-body">
          {/* Explore Section */}
          <div className="mobile-menu-section">
            <div className="mobile-section-title">Explore</div>
            {user && (
              <Link to="/for-you" className="mobile-link-item">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 3l3 6 6 .9-4.5 4.4 1.1 6.4L12 17l-5.6 3.7 1.1-6.4L3 9.9 9 9z" />
                </svg>
                <span>For You</span>
              </Link>
            )}
            <Link to="/topics" className="mobile-link-item">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v18M3 12h18" />
              </svg>
              <span>Topics</span>
            </Link>
          </div>

          {user && (
            <>
              <div className="mobile-divider" />
              {/* Account Section */}
              <div className="mobile-menu-section">
                <div className="mobile-user-card">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="avatar-sm"
                    />
                  ) : (
                    <div className="avatar-placeholder-sm">{initials}</div>
                  )}
                  <div className="mobile-user-details">
                    <div className="mobile-display-name">
                      {profile?.full_name || profile?.username}
                    </div>
                    <div className="mobile-username">@{profile?.username}</div>
                  </div>
                </div>
              </div>

              <div className="mobile-divider" />
              {/* Content Section */}
              <div className="mobile-menu-section">
                <div className="mobile-section-title">Content</div>
                <Link to="/resume-reading" className="mobile-link-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 4h11l3 3v13H5z" />
                    <path d="M16 4v3h3" />
                    <path d="M8 12h8M8 16h8" />
                  </svg>
                  <span>Resume Reading</span>
                </Link>
                <Link to="/feed" className="mobile-link-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 5h16v14H4z" />
                    <path d="M8 9h8M8 13h8" />
                  </svg>
                  <span>Feed</span>
                </Link>
                <Link to="/dashboard" className="mobile-link-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span>Dashboard</span>
                </Link>
                <Link to="/bookmarks" className="mobile-link-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Bookmarks</span>
                </Link>
                {profile?.is_admin && (
                  <Link to="/admin" className="mobile-link-item">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 3l7 4v5c0 5-3.5 9.5-7 9.5S5 17 5 12V7l7-4z" />
                    </svg>
                    <span>Admin Panel</span>
                  </Link>
                )}
              </div>

              <div className="mobile-divider" />
              {/* Activity Section */}
              <div className="mobile-menu-section">
                <div className="mobile-section-title">Activity</div>
                <Link to="/notifications" className="mobile-link-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span>Notifications</span>
                </Link>
              </div>

              <div className="mobile-divider" />
              {/* Settings Section */}
              <div className="mobile-menu-section">
                <div className="mobile-section-title">Settings</div>
                <Link to="/settings" className="mobile-link-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m2.12 2.12l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m2.12-2.12l4.24-4.24M19.78 19.78l-4.24-4.24m-2.12-2.12l-4.24-4.24" />
                  </svg>
                  <span>Settings</span>
                </Link>
                <button
                  className="mobile-link-item mobile-link-danger"
                  onClick={handleSignOut}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}

          {!user && (
            <>
              <div className="mobile-divider" />
              <div className="mobile-menu-section">
                <Link to="/signin" className="mobile-link-item">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <span>Sign in</span>
                </Link>
                <Link
                  to="/signup"
                  className="mobile-link-item mobile-link-highlight"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  <span>Get Started</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      </nav>
      <div className={`mobile-bottom-nav${bottomNavHidden ? " hidden" : ""}`}>
        <Link
          to="/"
          className={`mobile-bottom-link${location.pathname === "/" ? " active" : ""}`}
          aria-label="Discover"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 10.5l9-7 9 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5 10v9h14v-9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 19v-6h6v6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Home</span>
        </Link>
        <Link
          to="/search"
          className={`mobile-bottom-link${location.pathname.startsWith("/search") ? " active" : ""}`}
          aria-label="Search"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m21 21-4.35-4.35" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>Search</span>
        </Link>
        <Link
          to={user ? "/dashboard/new" : "/signin"}
          className={`mobile-bottom-link new-action${location.pathname === "/dashboard/new" ? " active" : ""}`}
          aria-label="New post"
        >
          <span className="mobile-bottom-action">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 6v12M6 12h12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>New</span>
        </Link>
        <Link
          to={user ? "/notifications" : "/signin"}
          className={`mobile-bottom-link${location.pathname === "/notifications" ? " active" : ""}`}
          aria-label="Notifications"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M13.73 21a2 2 0 0 1-3.46 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          {unreadCount > 0 && <span className="nav-badge" aria-hidden="true" />}
          <span>Notifications</span>
        </Link>
        <Link
          to={profilePath}
          className={`mobile-bottom-link${location.pathname.startsWith("/@") ? " active" : ""}`}
          aria-label="Profile"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <path
              d="M4 20a8 8 0 0 1 16 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          <span>Profile</span>
        </Link>
      </div>
    </>
  );
}
