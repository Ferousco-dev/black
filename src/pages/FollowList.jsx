import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getProfileByUsername, getFollowers, getFollowing } from '../lib/api';
import LoadingPage from '../components/ui/LoadingPage';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import { buildCacheKey, getCache, setCache } from '../lib/cache';
import './FollowList.css';

export default function FollowList() {
  const { atUsername, type } = useParams(); // type = 'followers' or 'following'
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (atUsername?.startsWith('@')) {
      load();
    } else {
      navigate('/');
    }
  }, [atUsername, type]);

  const load = async () => {
    const clean = atUsername.startsWith('@') ? atUsername.slice(1) : atUsername;
    const cacheKey = buildCacheKey("followlist", clean, type);
    const cached = getCache(cacheKey);
    if (cached) {
      setProfile(cached.profile || null);
      setUsers(cached.users || []);
      setLoading(false);
      return;
    }
    const { data: prof } = await getProfileByUsername(clean);
    if (!prof) { navigate('/'); return; }
    setProfile(prof);
    const fn = type === 'followers' ? getFollowers : getFollowing;
    const { data } = await fn(prof.id);
    setUsers(data || []);
    setCache(cacheKey, { profile: prof, users: data || [] });
    setLoading(false);
  };

  return (
    <div className="followlist-page">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="followlist-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="followlist-title">
            {type === 'followers' ? 'Followers' : 'Following'}
            {profile && <span className="followlist-name"> of @{profile.username}</span>}
          </h1>
        </div>

        {loading ? (
          <LoadingPage variant="list" />
        ) : users.length === 0 ? (
          <div className="empty-state">
            <h3>No {type} yet</h3>
          </div>
        ) : (
          <div className="followlist-users">
            {users.map(u => {
              if (!u) return null;
              const initials = u.full_name
                ? u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : u.username?.[0]?.toUpperCase() || '?';
              return (
                <Link key={u.id} to={`/@${u.username}`} className="followlist-user card">
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt={u.username} className="avatar" style={{ width: 44, height: 44 }} />
                    : <div className="avatar-placeholder" style={{ width: 44, height: 44, fontSize: '0.95rem' }}>{initials}</div>
                  }
                  <div className="followlist-user-info">
                    <div className="followlist-user-name-row">
                      <span className="followlist-user-name">{u.full_name || u.username}</span>
                      {u.is_verified && <VerifiedBadge size="sm" />}
                    </div>
                    <div className="followlist-user-handle">@{u.username}</div>
                    {u.bio && <div className="followlist-user-bio">{u.bio.slice(0, 80)}{u.bio.length > 80 ? '…' : ''}</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
