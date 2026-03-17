import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import './Notifications.css';

const icons = {
  new_post: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  ),
  new_comment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  ),
  new_follower: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  post_like: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
  ),
  comment_reply: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
  ),
  admin_broadcast: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11v2a1 1 0 0 0 1 1h2l5 4V6L7 10H5a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6"/></svg>
  ),
  admin_warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  ),
  admin_update: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
  ),
};

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => loadNotifications())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const loadNotifications = async () => {
    const { data } = await getNotifications(user.id);
    setNotifications(data || []);
    setLoading(false);
  };

  const handleRead = async (n) => {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notifications-page">
      <div className="container" style={{ maxWidth: 680 }}>
        <div className="notifications-header">
          <h1 className="notifications-title">Notifications</h1>
          {unread > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleMarkAll}>
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-page"><span className="spinner" style={{ width: 28, height: 28 }} /></div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <h3>No notifications yet</h3>
            <p>You'll be notified of new followers, likes, and comments.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map(n => {
              const Wrapper = n.link ? Link : 'div';
              const wrapperProps = n.link ? { to: n.link, onClick: () => handleRead(n) } : { onClick: () => handleRead(n) };
              return (
                <Wrapper key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} {...wrapperProps}>
                  <div className="notification-icon-wrap">
                    {n.actor?.avatar_url
                      ? <img src={n.actor.avatar_url} alt={n.actor.username} className="avatar" style={{ width: 36, height: 36 }} />
                      : <div className="notification-icon">{icons[n.type]}</div>
                    }
                  </div>
                  <div className="notification-body">
                    <div className="notification-title">{n.title}</div>
                    {n.body && <div className="notification-text">{n.body}</div>}
                    <div className="notification-time">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  {!n.is_read && <div className="unread-dot" />}
                </Wrapper>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
