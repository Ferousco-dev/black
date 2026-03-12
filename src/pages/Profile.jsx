import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProfileByUsername, getUserPublishedPosts, checkFollowing, followUser, unfollowUser, checkSubscribed, subscribeToUser, unsubscribeFromUser, getFollowers } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import PostCard from '../components/posts/PostCard';
import toast from 'react-hot-toast';
import './Profile.css';

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const isOwnProfile = user?.id === profile?.id;

  useEffect(() => {
    loadProfile();
  }, [username]);

  useEffect(() => {
    if (profile && user && !isOwnProfile) {
      checkFollowing(user.id, profile.id).then(({ following }) => setFollowing(following));
      checkSubscribed(user.id, profile.id).then(({ subscribed }) => setSubscribed(subscribed));
    }
  }, [profile, user]);

  const loadProfile = async () => {
    const clean = username.startsWith('@') ? username.slice(1) : username;
    const { data: prof, error } = await getProfileByUsername(clean);
    if (error || !prof) { setLoading(false); return; }
    setProfile(prof);
    const [postsRes, followersRes] = await Promise.all([
      getUserPublishedPosts(prof.id),
      getFollowers(prof.id),
    ]);
    setPosts(postsRes.data || []);
    setFollowers(followersRes.data || []);
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
      toast.success(`Subscribed to ${profile.full_name || profile.username}`);
    }
  };

  if (loading) return <div className="loading-page"><span className="spinner" style={{ width: 32, height: 32 }} /></div>;
  if (!profile) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>User not found.</div>;

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.username[0].toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="container-narrow">
          <div className="profile-header-inner">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.username} className="avatar profile-avatar" />
              : <div className="avatar-placeholder profile-avatar">{initials}</div>
            }
            <div className="profile-info">
              <h1 className="profile-name">{profile.full_name || profile.username}</h1>
              <div className="profile-handle">@{profile.username}</div>
              {profile.bio && <p className="profile-bio">{profile.bio}</p>}
              <div className="profile-stats">
                <span><strong>{posts.length}</strong> posts</span>
                <span><strong>{followers.length}</strong> followers</span>
              </div>
            </div>
            {user && !isOwnProfile && (
              <div className="profile-actions">
                <button className={`btn btn-sm ${following ? 'btn-secondary' : 'btn-primary'}`} onClick={handleFollow}>
                  {following ? 'Following' : 'Follow'}
                </button>
                <button className={`btn btn-sm ${subscribed ? 'btn-secondary' : 'btn-secondary'}`} onClick={handleSubscribe} style={{ marginTop: 8 }}>
                  {subscribed ? 'Subscribed ✓' : 'Subscribe'}
                </button>
              </div>
            )}
            {isOwnProfile && (
              <a href="/settings" className="btn btn-secondary btn-sm">Edit profile</a>
            )}
          </div>
        </div>
      </div>

      <div className="container-narrow" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {posts.length === 0 ? (
          <div className="empty-state">
            <h3>No posts yet</h3>
            {isOwnProfile && <p><a href="/dashboard/new" style={{ color: 'var(--navy)' }}>Write your first post</a></p>}
          </div>
        ) : (
          <div>
            {posts.map(post => <PostCard key={post.id} post={post} showAuthor={false} />)}
          </div>
        )}
      </div>
    </div>
  );
}
