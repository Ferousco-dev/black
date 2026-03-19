import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import LoadingPage from '../components/ui/LoadingPage';
import './Discovery.css';

export default function Discovery() {
  const [topics, setTopics] = useState([]);
  const [trending, setTrending] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState('trending');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [topicsRes, trendingRes, featuredRes] = await Promise.all([
      supabase.from('topics').select('*').order('post_count', { ascending: false }).limit(12),
      supabase.from('posts_with_stats').select('*').eq('is_published', true).order('view_count', { ascending: false }).limit(20),
      supabase.from('featured_writers').select('*, profile:profiles(*)').order('display_order').limit(8),
    ]);
    setTopics(topicsRes.data || []);
    setTrending(trendingRes.data || []);
    setFeatured(featuredRes.data?.map(f => f.profile) || []);
    setLoading(false);
  }

  async function handleSearch(q) {
    setSearch(q);
    if (!q.trim()) { setSearchResults(null); return; }
    setSearching(true);
    const [postsRes, authorsRes] = await Promise.all([
      supabase.from('posts_with_stats').select('*').eq('is_published', true).or(`title.ilike.%${q}%,subtitle.ilike.%${q}%`).limit(10),
      supabase.from('profiles').select('*').or(`username.ilike.%${q}%,full_name.ilike.%${q}%,publication_name.ilike.%${q}%`).limit(6),
    ]);
    setSearchResults({ posts: postsRes.data || [], authors: authorsRes.data || [] });
    setSearching(false);
  }

  const displayed = activeFilter === 'trending' ? trending
    : activeFilter === 'new' ? [...trending].sort((a,b) => new Date(b.published_at)-new Date(a.published_at))
    : trending.filter(p => (parseInt(p.comment_count)||0) > 0).sort((a,b) => b.comment_count - a.comment_count);

  return (
    <div className="discovery-page">
      <div className="discovery-hero">
        <h1 className="discovery-headline">Discover great writing</h1>
        <div className="discovery-search-wrap">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="discovery-search" placeholder="Search posts, writers, topics…" value={search} onChange={e=>handleSearch(e.target.value)}/>
        </div>
      </div>

      {loading && !searchResults ? (
        <LoadingPage variant="feed" />
      ) : searchResults ? (
        <div className="search-results">
          {searchResults.authors.length > 0 && (
            <section className="results-section">
              <h3 className="results-heading">Writers</h3>
              <div className="authors-grid">
                {searchResults.authors.map(a => (
                  <Link key={a.id} to={`/@${a.username}`} className="author-card">
                    <img src={a.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${a.username}`} className="author-card-avatar" alt=""/>
                    <div className="author-card-info">
                      <span className="author-card-name">{a.full_name || a.username}</span>
                      <span className="author-card-username">@{a.username}</span>
                      {a.bio && <span className="author-card-bio">{a.bio.slice(0,80)}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section className="results-section">
            <h3 className="results-heading">Posts ({searchResults.posts.length})</h3>
            <div className="post-list">
              {searchResults.posts.map(p => <PostRow key={p.id} post={p}/>)}
              {searchResults.posts.length === 0 && <p className="no-results">No posts found for "{search}"</p>}
            </div>
          </section>
        </div>
      ) : (
        <>
          {topics.length > 0 && (
            <section className="topics-section">
              <h2 className="section-title">Browse by Topic</h2>
              <div className="topics-grid">
                {topics.map(t => (
                  <Link key={t.id} to={`/topic/${t.slug}`} className="topic-chip" style={{ borderColor: t.color, color: t.color }}>
                    {t.icon && <span>{t.icon}</span>}
                    <span>{t.name}</span>
                    <span className="topic-count">{t.post_count}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {featured.length > 0 && (
            <section className="featured-section">
              <h2 className="section-title">Featured Writers</h2>
              <div className="featured-grid">
                {featured.map(p => (
                  <Link key={p.id} to={`/@${p.username}`} className="featured-writer-card">
                    <img src={p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.username}`} className="featured-avatar" alt=""/>
                    <div className="featured-info">
                      <span className="featured-name">{p.publication_name || p.full_name || p.username}</span>
                      <span className="featured-username">@{p.username}</span>
                      {p.bio && <p className="featured-bio">{p.bio.slice(0,100)}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="trending-section">
            <div className="trending-header">
              <h2 className="section-title" style={{marginBottom:0}}>Posts</h2>
              <div className="filter-tabs">
                {['trending','new','discussed'].map(f => (
                  <button key={f} className={`filter-tab ${activeFilter===f?'active':''}`} onClick={()=>setActiveFilter(f)}>
                    {f.charAt(0).toUpperCase()+f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="post-list">
              {displayed.map(p => <PostRow key={p.id} post={p}/>)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function PostRow({ post }) {
  const media = (post.image_urls && post.image_urls.length > 0)
    ? post.image_urls
    : post.cover_image_url ? [post.cover_image_url] : [];
  const mediaPreview = media.slice(0, 4);
  const extraCount = media.length - mediaPreview.length;
  const timeLabel = post.published_at ? formatTimeAgo(new Date(post.published_at)) : null;

  return (
    <Link to={`/p/${post.slug}`} className="post-card">
      <div className="post-card-header">
        <img src={post.author_avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.author_username}`} className="post-card-avatar" alt=""/>
        <div className="post-card-author">
          <span className="post-card-name">{post.author_full_name || post.author_username}</span>
          <span className="post-card-handle">
            @{post.author_username}
            {timeLabel && <span className="post-card-time"> · {timeLabel}</span>}
          </span>
        </div>
        {post.tags?.[0] && <span className="post-card-tag">#{post.tags[0]}</span>}
      </div>
      <div className="post-card-content">
        <h3 className="post-card-title">{post.title}</h3>
        {post.subtitle && <p className="post-card-text">{post.subtitle}</p>}
      </div>
      {mediaPreview.length > 0 && (
        <div className={`post-card-media grid-${Math.min(mediaPreview.length, 4)}`}>
          {mediaPreview.map((url, idx) => (
            <div key={`${post.id}-media-${idx}`} className="post-card-media-item">
              <img src={url} alt="" />
              {idx === 3 && extraCount > 0 && (
                <span className="post-card-media-more">+{extraCount}</span>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="post-card-actions">
        <span>💬 {parseInt(post.comment_count) || 0}</span>
        <span>🔁 {parseInt(post.view_count) || 0}</span>
        <span>❤️ {parseInt(post.like_count) || 0}</span>
        <span>📌 {parseInt(post.bookmark_count) || 0}</span>
        {post.audience !== 'everyone' && <span className="audience-lock">🔒 {post.audience}</span>}
      </div>
    </Link>
  );
}

function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}
