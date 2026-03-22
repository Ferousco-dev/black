import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFeedPosts, getUserBookmarks } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import PostCard from '../components/posts/PostCard';
import LoadingPage from '../components/ui/LoadingPage';
import { buildCacheKey, getCache, setCache } from '../lib/cache';
import './FeedAndBookmarks.css';

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
    <div className="feed-page">
      <div className="container">
        <div className="feed-page-inner">
          <h1 className="feed-title">Following</h1>
          <p className="feed-subtitle">Posts from writers you follow</p>
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
    <div className="feed-page">
      <div className="container">
        <div className="feed-page-inner">
          <h1 className="feed-title">Bookmarks</h1>
          <p className="feed-subtitle">Posts you've saved for later</p>
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
