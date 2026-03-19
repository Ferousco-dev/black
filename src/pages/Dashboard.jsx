import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserPublishedPosts, getUserDraftPosts, deletePost, unpublishPost } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import LoadingPage from '../components/ui/LoadingPage';
import './Dashboard.css';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('published');
  const [published, setPublished] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadPosts();
  }, [user]);

  const loadPosts = async () => {
    const [pub, drf] = await Promise.all([
      getUserPublishedPosts(user.id),
      getUserDraftPosts(user.id),
    ]);
    setPublished(pub.data || []);
    setDrafts(drf.data || []);
    setLoading(false);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Permanently delete this post?')) return;
    const { error } = await deletePost(postId);
    if (error) toast.error('Failed to delete');
    else { toast.success('Post deleted'); loadPosts(); }
  };

  const handleUnpublish = async (postId) => {
    const { error } = await unpublishPost(postId);
    if (error) toast.error('Failed');
    else { toast.success('Moved to drafts'); loadPosts(); }
  };

  const posts = tab === 'published' ? published : drafts;

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">Welcome back, {profile?.full_name || profile?.username}</p>
          </div>
          <Link to="/dashboard/new" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New post
          </Link>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card card">
            <div className="stat-number">{published.length}</div>
            <div className="stat-label">Published</div>
          </div>
          <div className="stat-card card">
            <div className="stat-number">{drafts.length}</div>
            <div className="stat-label">Drafts</div>
          </div>
          <div className="stat-card card">
            <div className="stat-number">{published.reduce((sum, p) => sum + (p.view_count || 0), 0)}</div>
            <div className="stat-label">Total views</div>
          </div>
          <div className="stat-card card">
            <div className="stat-number">{published.reduce((sum, p) => sum + (p.like_count || 0), 0)}</div>
            <div className="stat-label">Total likes</div>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button className={`tab ${tab === 'published' ? 'active' : ''}`} onClick={() => setTab('published')}>
            Published ({published.length})
          </button>
          <button className={`tab ${tab === 'drafts' ? 'active' : ''}`} onClick={() => setTab('drafts')}>
            Drafts ({drafts.length})
          </button>
        </div>

        {loading ? (
          <LoadingPage variant="table" />
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <h3>{tab === 'published' ? 'No published posts' : 'No drafts'}</h3>
            <p><Link to="/dashboard/new" style={{ color: 'var(--navy)' }}>Start writing</Link> your first post.</p>
          </div>
        ) : (
          <div className="posts-table">
            {posts.map(post => (
              <div key={post.id} className="post-row">
                <div className="post-row-main">
                  {post.cover_image_url && (
                    <img src={post.cover_image_url} alt={post.title} className="post-row-thumb" />
                  )}
                  <div className="post-row-info">
                    <div className="post-row-title">{post.title}</div>
                    {post.subtitle && <div className="post-row-subtitle">{post.subtitle}</div>}
                    <div className="post-row-meta">
                      {tab === 'published' && post.published_at && (
                        <span>{formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}</span>
                      )}
                      {tab === 'drafts' && (
                        <span>Last edited {formatDistanceToNow(new Date(post.updated_at), { addSuffix: true })}</span>
                      )}
                      {tab === 'published' && (
                        <>
                          <span>·</span>
                          <span>{post.view_count || 0} views</span>
                          <span>·</span>
                          <span>{post.like_count || 0} likes</span>
                          <span>·</span>
                          <span>{post.comment_count || 0} comments</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="post-row-actions">
                  {tab === 'published' && (
                    <Link to={`/p/${post.slug}`} className="btn btn-ghost btn-sm">View</Link>
                  )}
                  <Link to={`/dashboard/edit/${post.id}`} className="btn btn-secondary btn-sm">Edit</Link>
                  {tab === 'published' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleUnpublish(post.id)}>Unpublish</button>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(post.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
