import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { getComments, createComment, deleteComment } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import './Comments.css';

export default function Comments({ postId }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    loadComments();
    // Real-time subscription
    const channel = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => loadComments())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => loadComments())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [postId]);

  const loadComments = async () => {
    const { data } = await getComments(postId);
    setComments(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    setSubmitting(true);
    const { error } = await createComment({ postId, authorId: user.id, content: text.trim(), parentId: replyTo });
    if (error) { toast.error('Failed to post comment'); }
    else { setText(''); setReplyTo(null); }
    setSubmitting(false);
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    const { error } = await deleteComment(commentId);
    if (error) toast.error('Failed to delete');
    else toast.success('Comment deleted');
  };

  const topLevel = comments.filter(c => !c.parent_id);
  const replies = comments.filter(c => c.parent_id);

  const initials = (p) => p?.full_name
    ? p.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : p?.username?.[0]?.toUpperCase() || '?';

  return (
    <section className="comments-section">
      <h3 className="comments-title">{comments.length} Comment{comments.length !== 1 ? 's' : ''}</h3>

      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <div className="comment-form-avatar">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.username} className="avatar" style={{ width: 36, height: 36 }} />
              : <div className="avatar-placeholder" style={{ width: 36, height: 36, fontSize: '0.85rem' }}>{initials(profile)}</div>
            }
          </div>
          <div className="comment-form-input">
            {replyTo && (
              <div className="replying-to">
                Replying to comment
                <button type="button" className="cancel-reply" onClick={() => setReplyTo(null)}>✕ Cancel</button>
              </div>
            )}
            <textarea
              className="form-input form-textarea"
              placeholder="Share your thoughts…"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              style={{ minHeight: 80 }}
            />
            <div className="comment-form-actions">
              <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim() || submitting}>
                {submitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Post comment'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="comments-signin">
          <Link to="/signin" className="btn btn-secondary btn-sm">Sign in to comment</Link>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
      ) : topLevel.length === 0 ? (
        <div className="no-comments">Be the first to comment.</div>
      ) : (
        <div className="comments-list">
          {topLevel.map(comment => (
            <div key={comment.id} className="comment">
              <div className="comment-avatar">
                {comment.author?.avatar_url
                  ? <img src={comment.author.avatar_url} alt={comment.author.username} className="avatar" style={{ width: 36, height: 36 }} />
                  : <div className="avatar-placeholder" style={{ width: 36, height: 36, fontSize: '0.85rem' }}>{initials(comment.author)}</div>
                }
              </div>
              <div className="comment-body">
                <div className="comment-header">
                  <Link to={`/@${comment.author?.username}`} className="comment-author">
                    {comment.author?.full_name || comment.author?.username}
                  </Link>
                  <span className="comment-time">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                  {comment.is_edited && <span className="comment-edited">edited</span>}
                </div>
                <p className="comment-content">{comment.content}</p>
                <div className="comment-actions">
                  {user && (
                    <button className="comment-action" onClick={() => setReplyTo(comment.id)}>Reply</button>
                  )}
                  {user?.id === comment.author_id && (
                    <button className="comment-action comment-action-danger" onClick={() => handleDelete(comment.id)}>Delete</button>
                  )}
                </div>
                {/* Replies */}
                {replies.filter(r => r.parent_id === comment.id).map(reply => (
                  <div key={reply.id} className="comment comment-reply">
                    <div className="comment-avatar">
                      {reply.author?.avatar_url
                        ? <img src={reply.author.avatar_url} alt={reply.author.username} className="avatar" style={{ width: 28, height: 28 }} />
                        : <div className="avatar-placeholder" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>{initials(reply.author)}</div>
                      }
                    </div>
                    <div className="comment-body">
                      <div className="comment-header">
                        <Link to={`/@${reply.author?.username}`} className="comment-author">
                          {reply.author?.full_name || reply.author?.username}
                        </Link>
                        <span className="comment-time">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className="comment-content">{reply.content}</p>
                      {user?.id === reply.author_id && (
                        <div className="comment-actions">
                          <button className="comment-action comment-action-danger" onClick={() => handleDelete(reply.id)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
