import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { getPost, likePost, unlikePost, checkPostLiked, bookmarkPost, unbookmarkPost, checkBookmarked, checkSubscribed, subscribeToUser, unsubscribeFromUser } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import Comments from '../components/posts/Comments';
import toast from 'react-hot-toast';
import './PostView.css';

export default function PostView() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    loadPost();
  }, [slug]);

  useEffect(() => {
    if (post && user) {
      checkPostLiked(post.id, user.id).then(({ liked }) => setLiked(liked));
      checkBookmarked(user.id, post.id).then(({ bookmarked }) => setBookmarked(bookmarked));
      checkSubscribed(user.id, post.author_id).then(({ subscribed }) => setSubscribed(subscribed));
    }
  }, [post, user]);

  const loadPost = async () => {
    const { data, error } = await getPost(slug);
    if (error || !data) { toast.error('Post not found'); navigate('/'); return; }
    setPost(data);
    setLikeCount(data.like_count || 0);
    setLoading(false);
  };

  const handleLike = async () => {
    if (!user) { toast.error('Sign in to like'); return; }
    if (liked) {
      setLiked(false); setLikeCount(c => c - 1);
      await unlikePost(post.id, user.id);
    } else {
      setLiked(true); setLikeCount(c => c + 1);
      await likePost(post.id, user.id);
    }
  };

  const handleBookmark = async () => {
    if (!user) { toast.error('Sign in to bookmark'); return; }
    if (bookmarked) {
      setBookmarked(false);
      await unbookmarkPost(user.id, post.id);
      toast.success('Removed from bookmarks');
    } else {
      setBookmarked(true);
      await bookmarkPost(user.id, post.id);
      toast.success('Bookmarked');
    }
  };

  const handleSubscribe = async () => {
    if (!user) { toast.error('Sign in to subscribe'); return; }
    if (subscribed) {
      setSubscribed(false);
      await unsubscribeFromUser(user.id, post.author_id);
      toast.success('Unsubscribed');
    } else {
      setSubscribed(true);
      await subscribeToUser(user.id, post.author_id);
      toast.success(`Subscribed to ${post.author_full_name || post.author_username}`);
    }
  };

  if (loading) return <div className="loading-page"><span className="spinner" style={{ width: 32, height: 32 }} /></div>;

  const initials = post.author_full_name
    ? post.author_full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : post.author_username?.[0]?.toUpperCase() || '?';

  const timeAgo = post.published_at ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true }) : '';

  return (
    <div className="post-view-page">
      <div className="container-narrow">
        {/* Author header */}
        <div className="post-view-author">
          <Link to={`/@${post.author_username}`} className="post-view-author-link">
            {post.author_avatar_url
              ? <img src={post.author_avatar_url} alt={post.author_username} className="avatar" style={{ width: 44, height: 44 }} />
              : <div className="avatar-placeholder" style={{ width: 44, height: 44, fontSize: '1rem' }}>{initials}</div>
            }
            <div>
              <div className="author-fullname">{post.author_full_name || post.author_username}</div>
              <div className="author-meta">@{post.author_username} · {timeAgo}</div>
            </div>
          </Link>
          {user && user.id !== post.author_id && (
            <button
              className={`btn btn-sm ${subscribed ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleSubscribe}
            >
              {subscribed ? 'Subscribed ✓' : 'Subscribe'}
            </button>
          )}
        </div>

        {/* Post header */}
        <header className="post-view-header">
          <h1 className="post-view-title">{post.title}</h1>
          {post.subtitle && <p className="post-view-subtitle">{post.subtitle}</p>}
        </header>

        {/* Cover image */}
        {post.cover_image_url && (
          <div className="post-view-cover">
            <img src={post.cover_image_url} alt={post.title} />
          </div>
        )}

        {/* Content */}
        <div className="prose post-view-content" dangerouslySetInnerHTML={{ __html: post.content_html || post.content }} />

        {/* PDF attachment */}
        {post.pdf_url && (
          <div className="post-view-pdf">
            <div className="pdf-card">
              <div className="pdf-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div className="pdf-info">
                <div className="pdf-name">{post.pdf_filename || 'Attached PDF'}</div>
                <div className="pdf-label">PDF Document</div>
              </div>
              <a href={post.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Download
              </a>
            </div>
          </div>
        )}

        {/* Post actions */}
        <div className="post-view-actions">
          <button className={`action-btn ${liked ? 'active' : ''}`} onClick={handleLike}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span>{likeCount}</span>
          </button>
          <button className={`action-btn ${bookmarked ? 'active' : ''}`} onClick={handleBookmark}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
            <span>{bookmarked ? 'Saved' : 'Save'}</span>
          </button>
          <button className="action-btn" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span>Share</span>
          </button>
          {user?.id === post.author_id && (
            <Link to={`/dashboard/edit/${post.id}`} className="action-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Edit</span>
            </Link>
          )}
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="post-view-tags">
            {post.tags.map(tag => <span key={tag} className="meta-tag">{tag}</span>)}
          </div>
        )}

        {/* Author card */}
        <div className="author-card card">
          <Link to={`/@${post.author_username}`} className="author-card-link">
            {post.author_avatar_url
              ? <img src={post.author_avatar_url} alt={post.author_username} className="avatar" style={{ width: 56, height: 56 }} />
              : <div className="avatar-placeholder" style={{ width: 56, height: 56, fontSize: '1.2rem' }}>{initials}</div>
            }
            <div className="author-card-info">
              <div className="author-card-name">{post.author_full_name || post.author_username}</div>
              <div className="author-card-handle">@{post.author_username}</div>
            </div>
          </Link>
          {user && user.id !== post.author_id && (
            <button className={`btn btn-sm ${subscribed ? 'btn-secondary' : 'btn-primary'}`} onClick={handleSubscribe}>
              {subscribed ? 'Subscribed ✓' : 'Subscribe'}
            </button>
          )}
        </div>

        <Comments postId={post.id} />
      </div>
    </div>
  );
}
