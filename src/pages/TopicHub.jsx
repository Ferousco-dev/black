import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTopicBySlug, getPostsByTopic } from '../lib/api';
import PostCard from '../components/posts/PostCard';
import LoadingPage from '../components/ui/LoadingPage';
import { buildCacheKey, getCache, setCache } from '../lib/cache';
import './TopicHub.css';

export default function TopicHub() {
  const { slug } = useParams();
  const [topic, setTopic] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [slug]);

  const load = async () => {
    setLoading(true);
    const cacheKey = buildCacheKey("topic", slug);
    const cached = getCache(cacheKey);
    if (cached) {
      setTopic(cached.topic || null);
      setPosts(cached.posts || []);
      setLoading(false);
      return;
    }
    const { data: topicData } = await getTopicBySlug(slug);
    setTopic(topicData);
    if (topicData?.id) {
      const { data } = await getPostsByTopic(topicData.id, 20);
      setPosts((data || []).map((item) => item.post).filter(Boolean));
      setCache(cacheKey, {
        topic: topicData,
        posts: (data || []).map((item) => item.post).filter(Boolean),
      });
    } else {
      setPosts([]);
    }
    setLoading(false);
  };

  const topWriters = useMemo(() => {
    const map = new Map();
    posts.forEach((post) => {
      const key = post.author_id;
      if (!key) return;
      const entry = map.get(key) || {
        id: post.author_id,
        name: post.author_full_name || post.author_username,
        username: post.author_username,
        avatar: post.author_avatar_url,
        count: 0,
      };
      entry.count += 1;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [posts]);

  const featuredPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
      .slice(0, 3);
  }, [posts]);

  if (loading) {
    return (
      <LoadingPage variant="feed" />
    );
  }

  if (!topic) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1rem' }}>Topic not found</h1>
        <p style={{ color: 'var(--text-muted)' }}>This topic doesn’t exist yet.</p>
        <Link to="/topics" className="btn btn-secondary" style={{ marginTop: '2rem' }}>Back to topics</Link>
      </div>
    );
  }

  return (
    <div className="topic-hub-page">
      <div className="container">
        <div className="topic-hero">
          <div>
            <div className="topic-hero-pill" style={{ borderColor: topic.color || 'var(--accent)' }}>{topic.name}</div>
            <h1>{topic.name}</h1>
            <p>{topic.description || 'Curated writing, voices, and ideas in this space.'}</p>
          </div>
          <div className="topic-hero-stats">
            <div>
              <strong>{topic.post_count || posts.length}</strong>
              <span>Posts</span>
            </div>
            <div>
              <strong>{topWriters.length}</strong>
              <span>Writers</span>
            </div>
          </div>
        </div>

        <div className="topic-layout">
          <main>
            <div className="topic-section-header">
              <h2>Latest in {topic.name}</h2>
            </div>
            {posts.length === 0 ? (
              <div className="empty-state">
                <h3>No posts yet</h3>
                <p>Be the first to publish in this topic.</p>
              </div>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </main>

          <aside>
            <div className="topic-card">
              <h3>Top writers</h3>
              {topWriters.length === 0 ? (
                <p className="muted">No writers yet.</p>
              ) : (
                <div className="topic-writers">
                  {topWriters.map((writer) => (
                    <Link key={writer.id} to={`/@${writer.username}`} className="topic-writer">
                      {writer.avatar ? (
                        <img src={writer.avatar} alt={writer.username} />
                      ) : (
                        <div className="topic-writer-avatar">{writer.name?.[0] || 'C'}</div>
                      )}
                      <div>
                        <div className="topic-writer-name">{writer.name}</div>
                        <div className="topic-writer-meta">@{writer.username} · {writer.count} posts</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="topic-card">
              <h3>Featured posts</h3>
              {featuredPosts.length === 0 ? (
                <p className="muted">No featured posts yet.</p>
              ) : (
                <div className="topic-featured">
                  {featuredPosts.map((post) => (
                    <Link key={post.id} to={`/p/${post.slug}`} className="topic-featured-item">
                      <div className="topic-featured-title">{post.title}</div>
                      <div className="topic-featured-meta">@{post.author_username} · {post.like_count || 0} likes</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
