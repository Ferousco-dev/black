import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFeedPosts, getUserBookmarks } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import PostCard from '../components/posts/PostCard';
import LoadingPage from '../components/ui/LoadingPage';
import { buildCacheKey, getCache, setCache } from '../lib/cache';

export function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const cached = getCache(buildCacheKey("feed", user.id));
    if (cached) {
      setPosts(cached);
      setLoading(false);
      return;
    }
    getFeedPosts(user.id).then(({ data }) => {
      setPosts(data || []);
      setCache(buildCacheKey("feed", user.id), data || []);
      setLoading(false);
    });
  }, [user]);

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        <div style={{ maxWidth: 720 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: 8 }}>Following</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Posts from writers you follow</p>
          {loading ? (
            <LoadingPage variant="feed" />
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
    if (!user) return;
    const cached = getCache(buildCacheKey("bookmarks", user.id));
    if (cached) {
      setPosts(cached);
      setLoading(false);
      return;
    }
    getUserBookmarks(user.id).then(({ data }) => {
      setPosts(data || []);
      setCache(buildCacheKey("bookmarks", user.id), data || []);
      setLoading(false);
    });
  }, [user]);

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        <div style={{ maxWidth: 720 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: 8 }}>Bookmarks</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Posts you've saved for later</p>
          {loading ? (
            <LoadingPage variant="feed" />
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
