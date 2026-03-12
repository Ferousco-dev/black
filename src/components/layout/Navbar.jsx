import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from '../../lib/api';
import NotificationBell from './NotificationBell';
import toast from 'react-hot-toast';
import './Navbar.css';

export default function Navbar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/');
    setMenuOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/search?q=' + encodeURIComponent(searchQuery.trim()));
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.username?.[0]?.toUpperCase() || '?';

  return (
    <nav className="navbar">
      <div className="navbar-inner container-wide">
        <Link to="/" className="navbar-logo">
          <span className="logo-mark">●</span>
          <span className="logo-text">Chronicles</span>
        </Link>

        <div className="navbar-center">
          <Link to="/" className={'nav-link' + (location.pathname === '/' ? ' active' : '')}>Discover</Link>
          {user && <Link to="/feed" className={'nav-link' + (location.pathname === '/feed' ? ' active' : '')}>Following</Link>}
        </div>

        <div className="navbar-right">
          <div className="search-wrapper" ref={searchRef}>
            <button className="icon-btn" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            {searchOpen && (
              <form className="search-dropdown" onSubmit={handleSearch}>
                <input autoFocus type="text" placeholder="Search posts or writers…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="search-input" />
                <button type="submit" className="search-submit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </form>
            )}
          </div>

          {user ? (
            <>
              <NotificationBell />
              <Link to="/dashboard/new" className="btn btn-primary btn-sm write-btn">Write</Link>
              <div className="user-menu-wrapper" ref={menuRef}>
                <button className="avatar-btn" onClick={() => setMenuOpen(!menuOpen)}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt={profile.username} className="avatar" style={{ width: 34, height: 34 }} />
                    : <div className="avatar-placeholder" style={{ width: 34, height: 34, fontSize: '0.8rem' }}>{initials}</div>
                  }
                </button>
                {menuOpen && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-name">{profile?.full_name || profile?.username}</div>
                      <div className="dropdown-username">@{profile?.username}</div>
                    </div>
                    <div className="dropdown-divider" />
                    <Link to="/dashboard" className="dropdown-item" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                    <Link to="/dashboard/new" className="dropdown-item" onClick={() => setMenuOpen(false)}>New Post</Link>
                    <Link to={'/@' + profile?.username} className="dropdown-item" onClick={() => setMenuOpen(false)}>Public Profile</Link>
                    <Link to="/feed" className="dropdown-item" onClick={() => setMenuOpen(false)}>Following Feed</Link>
                    <Link to="/bookmarks" className="dropdown-item" onClick={() => setMenuOpen(false)}>Bookmarks</Link>
                    <Link to="/notifications" className="dropdown-item" onClick={() => setMenuOpen(false)}>Notifications</Link>
                    <div className="dropdown-divider" />
                    <Link to="/settings" className="dropdown-item" onClick={() => setMenuOpen(false)}>Settings</Link>
                    <button className="dropdown-item dropdown-item-danger" onClick={handleSignOut}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/signin" className="btn btn-secondary btn-sm">Sign in</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Get started</Link>
            </>
          )}

          <button className={`mobile-menu-btn ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {mobileOpen && <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} />}
      
      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <Link to="/" className="navbar-logo">
            <span className="logo-mark">●</span>
            <span className="logo-text">Chronicles</span>
          </Link>
          <button className="mobile-menu-close" onClick={() => setMobileOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="mobile-menu-body">
          <Link to="/" className="mobile-link">Discover</Link>
          {user && <Link to="/feed" className="mobile-link">Following Feed</Link>}
          <Link to="/search" className="mobile-link">Search</Link>
          
          <div className="mobile-divider" />
          
          {user ? (
            <>
              <div className="mobile-user-info">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.username} className="avatar-sm" />
                  : <div className="avatar-placeholder-sm">{initials}</div>
                }
                <div className="mobile-user-details">
                  <div className="mobile-display-name">{profile?.full_name || profile?.username}</div>
                  <div className="mobile-username">@{profile?.username}</div>
                </div>
              </div>
              <Link to="/dashboard" className="mobile-link">Dashboard</Link>
              <Link to="/dashboard/new" className="mobile-link">New Post</Link>
              <Link to={'/@' + profile?.username} className="mobile-link">Public Profile</Link>
              <Link to="/bookmarks" className="mobile-link">Bookmarks</Link>
              <Link to="/notifications" className="mobile-link">Notifications</Link>
              <Link to="/settings" className="mobile-link">Settings</Link>
              <button className="mobile-link mobile-link-danger" onClick={handleSignOut}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="mobile-link">Sign in</Link>
              <Link to="/signup" className="mobile-link sign-up-mobile">Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
