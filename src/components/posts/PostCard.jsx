import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './PostCard.css';

export default function PostCard({ post, showAuthor = true }) {
  const date = post.published_at || post.created_at;
  const timeAgo = date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '';
  const initials = post.author_full_name
    ? post.author_full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : post.author_username?.[0]?.toUpperCase() || '?';

  return (
    <article className="post-card">
      {showAuthor && (
        <div className="post-card-author">
          <Link to={`/@${post.author_username}`} className="author-link">
            {post.author_avatar_url
              ? <img src={post.author_avatar_url} alt={post.author_username} className="avatar" style={{ width: 28, height: 28 }} />
              : <div className="avatar-placeholder" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>{initials}</div>
            }
            <span className="author-name">{post.author_full_name || post.author_username}</span>
          </Link>
          <span className="post-date">{timeAgo}</span>
        </div>
      )}

      <div className="post-card-body">
        <div className="post-card-content">
          <Link to={`/p/${post.slug}`} className="post-card-title-link">
            <h2 className="post-card-title">{post.title}</h2>
          </Link>
          {post.subtitle && <p className="post-card-subtitle">{post.subtitle}</p>}
          {!post.cover_image_url && post.content && (
            <p className="post-card-excerpt">
              {post.content.replace(/<[^>]+>/g, '').slice(0, 180)}{post.content.length > 180 ? '…' : ''}
            </p>
          )}
        </div>
        {post.cover_image_url && (
          <Link to={`/p/${post.slug}`} className="post-card-image-link">
            <img src={post.cover_image_url} alt={post.title} className="post-card-image" />
          </Link>
        )}
      </div>

      <div className="post-card-footer">
        <div className="post-card-meta">
          {post.pdf_url && (
            <span className="meta-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
              PDF
            </span>
          )}
          {post.tags?.slice(0, 2).map(tag => (
            <span key={tag} className="meta-tag">{tag}</span>
          ))}
        </div>
        <div className="post-card-stats">
          <span className="stat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {post.like_count || 0}
          </span>
          <span className="stat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {post.comment_count || 0}
          </span>
        </div>
      </div>
    </article>
  );
}
