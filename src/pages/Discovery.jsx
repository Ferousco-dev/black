import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import './Discovery.css';

export default function Discovery() {
  const [topics, setTopics] = useState([]);
  const [trending, setTrending] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState('trending');

  useEffect(() => { load(); }, []);

  async function load() {
    const [topicsRes, trendingRes, featuredRes] = await Promise.all([
      supabase.from('topics').select('*').order('post_count', { ascending: false }).limit(12),
      supabase.from('posts_with_stats').select('*').eq('is_published', true).order('view_count', { ascending: false }).limit(20),
      supabase.from('featured_writers').select('*, profile:profiles(*)').order('display_order').limit(8),
    ]);
    setTopics(topicsRes.data || []);
    setTrending(trendingRes.data || []);
    setFeatured(featuredRes.data?.map(f => f.profile) || []);
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

      {searchResults ? (
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
  return (
    <Link to={`/p/${post.slug}`} className="post-row">
      {post.cover_image_url && <img src={post.cover_image_url} className="post-row-img" alt=""/>}
      <div className="post-row-body">
        <div className="post-row-meta">
          <img src={post.author_avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.author_username}`} className="post-row-avatar" alt=""/>
          <span className="post-row-author">{post.author_full_name || post.author_username}</span>
          {post.tags?.[0] && <span className="post-row-tag">{post.tags[0]}</span>}
        </div>
        <h3 className="post-row-title">{post.title}</h3>
        {post.subtitle && <p className="post-row-sub">{post.subtitle}</p>}
        <div className="post-row-stats">
          <span>👁 {(post.view_count||0).toLocaleString()}</span>
          <span>❤️ {parseInt(post.like_count)||0}</span>
          <span>💬 {parseInt(post.comment_count)||0}</span>
          {post.reading_time_mins && <span>⏱ {post.reading_time_mins} min</span>}
          {post.audience !== 'everyone' && <span className="audience-lock">🔒 {post.audience}</span>}
        </div>
      </div>
    </Link>
  );
}
