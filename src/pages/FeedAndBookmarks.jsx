import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFeedPosts, getUserBookmarks } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import PostCard from '../components/posts/PostCard';

export function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) getFeedPosts(user.id).then(({ data }) => { setPosts(data || []); setLoading(false); });
  }, [user]);

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        <div style={{ maxWidth: 720 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: 8 }}>Following</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Posts from writers you follow</p>
          {loading ? (
            <div className="loading-page"><span className="spinner" style={{ width: 28, height: 28 }} /></div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <h3>Your feed is empty</h3>
              <p><Link to="/" style={{ color: 'var(--navy)' }}>Discover writers to follow</Link></p>
            </div>
          ) : posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      </div>
    </div>
  );
}

export function Bookmarks() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) getUserBookmarks(user.id).then(({ data }) => { setPosts(data || []); setLoading(false); });
  }, [user]);

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        <div style={{ maxWidth: 720 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: 8 }}>Bookmarks</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Posts you've saved for later</p>
          {loading ? (
            <div className="loading-page"><span className="spinner" style={{ width: 28, height: 28 }} /></div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <h3>No bookmarks yet</h3>
              <p>Save posts to read them later.</p>
            </div>
          ) : posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      </div>
    </div>
  );
}
