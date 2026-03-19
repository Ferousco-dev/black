import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchPosts, searchAuthors } from '../lib/api';
import PostCard from '../components/posts/PostCard';
import LoadingPage from '../components/ui/LoadingPage';
import { buildCacheKey, getCache, setCache } from '../lib/cache';
import './Search.css';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [input, setInput] = useState(query);
  const [posts, setPosts] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('posts');

  useEffect(() => {
    if (query) doSearch(query);
  }, [query]);

  const doSearch = async (q) => {
    const cacheKey = buildCacheKey("search", q.toLowerCase());
    const cached = getCache(cacheKey);
    if (cached) {
      setPosts(cached.posts || []);
      setAuthors(cached.authors || []);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [postsRes, authorsRes] = await Promise.all([
      searchPosts(q),
      searchAuthors(q),
    ]);
    setPosts(postsRes.data || []);
    setAuthors(authorsRes.data || []);
    setCache(cacheKey, { posts: postsRes.data || [], authors: authorsRes.data || [] });
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) setSearchParams({ q: input.trim() });
  };

  return (
    <div className="search-page">
      <div className="container">
        <div className="search-hero">
          <h1 className="search-title">Search</h1>
          <form className="search-bar" onSubmit={handleSubmit}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              className="search-bar-input"
              placeholder="Search posts or writers…"
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
        </div>

        {query && (
          <>
            <div className="search-tabs">
              <button className={`tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>
                Posts ({posts.length})
              </button>
              <button className={`tab ${tab === 'authors' ? 'active' : ''}`} onClick={() => setTab('authors')}>
                Writers ({authors.length})
              </button>
            </div>

            {loading ? (
              <LoadingPage variant={tab === 'authors' ? 'list' : 'feed'} />
            ) : tab === 'posts' ? (
              posts.length === 0 ? (
                <div className="empty-state"><h3>No posts found</h3><p>Try different keywords.</p></div>
              ) : (
                <div>{posts.map(post => <PostCard key={post.id} post={post} />)}</div>
              )
            ) : (
              authors.length === 0 ? (
                <div className="empty-state"><h3>No writers found</h3></div>
              ) : (
                <div className="authors-grid">
                  {authors.map(author => {
                    const initials = author.full_name
                      ? author.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : author.username[0].toUpperCase();
                    return (
                      <Link key={author.id} to={`/@${author.username}`} className="author-result card">
                        {author.avatar_url
                          ? <img src={author.avatar_url} alt={author.username} className="avatar" style={{ width: 48, height: 48 }} />
                          : <div className="avatar-placeholder" style={{ width: 48, height: 48 }}>{initials}</div>
                        }
                        <div>
                          <div className="author-result-name">{author.full_name || author.username}</div>
                          <div className="author-result-handle">@{author.username}</div>
                          {author.bio && <div className="author-result-bio">{author.bio.slice(0, 80)}{author.bio.length > 80 ? '…' : ''}</div>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
