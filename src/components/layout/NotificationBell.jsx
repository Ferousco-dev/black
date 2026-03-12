import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { getNotifications, markAllNotificationsRead } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import './NotificationBell.css';

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const channel = supabase
      .channel(`notif-bell:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => loadNotifications())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadNotifications = async () => {
    const { data } = await getNotifications(user.id);
    setNotifications((data || []).slice(0, 10));
  };

  const unread = notifications.filter(n => !n.is_read).length;

  const handleOpen = () => {
    setOpen(!open);
    if (!open && unread > 0) {
      markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  return (
    <div className="notif-bell-wrapper" ref={ref}>
      <button className="icon-btn notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span>Notifications</span>
            <Link to="/notifications" className="notif-see-all" onClick={() => setOpen(false)}>See all</Link>
          </div>
          {notifications.length === 0 ? (
            <div className="notif-empty">No notifications yet</div>
          ) : (
            notifications.map(n => (
              <Link
                key={n.id}
                to={n.link || '/notifications'}
                className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                onClick={() => setOpen(false)}
              >
                <div className="notif-item-body">
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-time">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                </div>
                {!n.is_read && <div className="notif-unread-dot" />}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
