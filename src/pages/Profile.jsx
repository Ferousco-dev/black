import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProfileByUsername, getUserPublishedPosts, checkFollowing, followUser, unfollowUser, checkSubscribed, subscribeToUser, unsubscribeFromUser, getFollowers, getPublishedQuestions } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import PostCard from '../components/posts/PostCard';
import toast from 'react-hot-toast';
import './Profile.css';

export default function Profile() {
  const { atUsername } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // posts | about | qa
  const [questions, setQuestions] = useState([]);
  
  const isOwnProfile = user?.id === profile?.id;

  useEffect(() => {
    if (atUsername?.startsWith('@')) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [atUsername]);

  useEffect(() => {
    if (profile && user && !isOwnProfile) {
      checkFollowing(user.id, profile.id).then(({ following }) => setFollowing(following));
      checkSubscribed(user.id, profile.id).then(({ subscribed }) => setSubscribed(subscribed));
    }
  }, [profile, user]);

  const loadProfile = async () => {
    const clean = atUsername.startsWith('@') ? atUsername.slice(1) : atUsername;
    const { data: prof, error } = await getProfileByUsername(clean);
    if (error || !prof) { setLoading(false); return; }
    setProfile(prof);
    
    // Load posts, followers, and questions in parallel
    const [postsRes, followersRes, questionsRes] = await Promise.all([
      getUserPublishedPosts(prof.id),
      getFollowers(prof.id),
      getPublishedQuestions(prof.id)
    ]);
    
    setPosts(postsRes.data || []);
    setFollowers(followersRes.data || []);
    setQuestions(questionsRes.data || []);
    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user) { toast.error('Sign in to follow'); return; }
    if (following) {
      setFollowing(false);
      setFollowers(f => f.filter(u => u.id !== user.id));
      await unfollowUser(user.id, profile.id);
    } else {
      setFollowing(true);
      await followUser(user.id, profile.id);
      await loadProfile();
    }
  };

  const handleSubscribe = async () => {
    if (!user) { toast.error('Sign in to subscribe'); return; }
    if (subscribed) {
      setSubscribed(false);
      await unsubscribeFromUser(user.id, profile.id);
      toast.success('Unsubscribed');
    } else {
      setSubscribed(true);
      await subscribeToUser(user.id, profile.id);
      toast.success(`Subscribed to ${profile.publication_name || profile.full_name || profile.username}`);
    }
  };

  if (loading) return <div className="loading-page"><span className="spinner" style={{ width: 32, height: 32 }} /></div>;
  if (!profile) return <div className="container" style={{ padding: '8rem 0', textAlign: 'center' }}>
    <h1 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1rem' }}>User not found</h1>
    <p style={{ color: 'var(--text-muted)' }}>The profile you are looking for does not exist.</p>
    <a href="/" className="btn btn-primary" style={{ marginTop: '2rem' }}>Go Home</a>
  </div>;

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.username[0].toUpperCase();

  const accentColor = profile.accent_color || 'var(--navy)';
  const socialLinks = profile.social_links || {};

  return (
    <div className="profile-page">
      {/* Cover Section */}
      <div className="profile-cover" style={{ background: profile.cover_image_url ? `url(${profile.cover_image_url}) center/cover` : `linear-gradient(135deg, ${accentColor}, #000)` }}>
        <div className="profile-cover-overlay" />
      </div>

      <div className="container profile-layout">
        {/* Sidebar / Profile Info */}
        <aside className="profile-sidebar">
          <div className="profile-sidebar-card">
            <div className="profile-avatar-wrapper">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.username} className="avatar profile-avatar-lg" />
                : <div className="avatar-placeholder profile-avatar-lg">{initials}</div>
              }
            </div>
            
            <div className="profile-main-info">
              <h1 className="profile-display-name">{profile.publication_name || profile.full_name || profile.username}</h1>
              <div className="profile-handle-row">
                <span className="profile-handle-tag">@{profile.username}</span>
                {isOwnProfile && <span className="profile-badge">Author</span>}
              </div>
              
              {profile.bio && <p className="profile-full-bio">{profile.bio}</p>}
              
              <div className="profile-stats-row">
                <div className="p-stat"><strong>{posts.length}</strong><span>Posts</span></div>
                <div className="p-stat"><strong>{followers.length}</strong><span>Followers</span></div>
              </div>

              <div className="profile-actions-v2">
                {user && !isOwnProfile ? (
                  <>
                    <button className={`btn btn-block ${following ? 'btn-secondary' : 'btn-primary'}`} onClick={handleFollow}>
                      {following ? 'Following' : 'Follow'}
                    </button>
                    <button className="btn btn-outline btn-block" onClick={handleSubscribe}>
                      {subscribed ? 'Subscribed ✓' : 'Subscribe'}
                    </button>
                  </>
                ) : isOwnProfile ? (
                  <a href="/settings" className="btn btn-secondary btn-block">Edit Profile</a>
                ) : (
                  <a href="/signup" className="btn btn-primary btn-block">Follow</a>
                )}
              </div>

              {Object.keys(socialLinks).length > 0 && (
                <div className="profile-socials">
                  {socialLinks.twitter && <a href={`https://twitter.com/${socialLinks.twitter}`} target="_blank" rel="noreferrer" aria-label="Twitter">Twitter</a>}
                  {socialLinks.instagram && <a href={`https://instagram.com/${socialLinks.instagram}`} target="_blank" rel="noreferrer" aria-label="Instagram">Instagram</a>}
                  {socialLinks.website && <a href={socialLinks.website} target="_blank" rel="noreferrer" aria-label="Website">Website</a>}
                </div>
              )}
            </div>
          </div>

          <div className="profile-cta-card">
            <h3>Subscribe to {profile.publication_name || 'Chronicles'}</h3>
            <p>Get the latest posts delivered right to your inbox.</p>
            <button className="btn btn-primary btn-block" onClick={handleSubscribe}>Subscribe</button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="profile-content">
          <nav className="profile-tabs">
            <button className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>Posts</button>
            <button className={`tab-btn ${activeTab === 'qa' ? 'active' : ''}`} onClick={() => setActiveTab('qa')}>Q&A {questions.length > 0 && <span className="count-badge">{questions.length}</span>}</button>
            <button className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>About</button>
          </nav>

          <div className="tab-content">
            {activeTab === 'posts' && (
              <div className="posts-list">
                {posts.length === 0 ? (
                  <div className="empty-state-v2">
                    <div className="empty-icon">✍️</div>
                    <h3>No posts yet</h3>
                    <p>{profile.full_name || profile.username} hasn't published anything yet.</p>
                  </div>
                ) : (
                  posts.map(post => <PostCard key={post.id} post={post} showAuthor={false} />)
                )}
              </div>
            )}

            {activeTab === 'qa' && (
              <div className="qa-list">
                {questions.length === 0 ? (
                  <div className="empty-state-v2">
                    <div className="empty-icon">❓</div>
                    <h3>No questions answered</h3>
                    <p>Ask {profile.full_name || profile.username} a question to get started.</p>
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }} onClick={() => navigate('/notifications')}>Ask a question</button>
                  </div>
                ) : (
                  questions.map(q => (
                    <div key={q.id} className="profile-qa-item card">
                      <div className="qa-question">
                        <span className="qa-q-mark">Q:</span>
                        <p>{q.question_text}</p>
                      </div>
                      <div className="qa-answer">
                        <span className="qa-a-mark">A:</span>
                        <div className="prose" dangerouslySetInnerHTML={{ __html: q.answer_text }} />
                      </div>
                      <div className="qa-footer">
                        <span>Answered {new Date(q.answered_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="about-section card">
                <h2 className="about-title">About {profile.full_name || profile.username}</h2>
                <div className="prose">
                  {profile.bio ? <p>{profile.bio}</p> : <p>No bio available.</p>}
                  <hr />
                  <p>Member since {new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
