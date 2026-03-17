import { forwardRef } from 'react';
import './ProfileStatsCard.css';

const ProfileStatsCard = forwardRef(function ProfileStatsCard(
  { name, username, avatarUrl, followers = 0, posts = 0, brand = 'Chronicles' },
  ref
) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : username?.[0]?.toUpperCase() || 'C';

  return (
    <div ref={ref} className="profile-share-card">
      <div className="profile-share-header">
        <div className="profile-share-brand">
          <span>●</span>
          <span>{brand}</span>
        </div>
        <div className="profile-share-title">Creator Stats</div>
      </div>

      <div className="profile-share-main">
        <div className="profile-share-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={username} />
          ) : (
            <div className="profile-share-initials">{initials}</div>
          )}
        </div>
        <div className="profile-share-info">
          <div className="profile-share-name">{name || username}</div>
          <div className="profile-share-handle">@{username}</div>
        </div>
      </div>

      <div className="profile-share-stats">
        <div className="profile-share-stat">
          <div className="profile-share-number">{followers}</div>
          <div className="profile-share-label">Followers</div>
        </div>
        <div className="profile-share-stat">
          <div className="profile-share-number">{posts}</div>
          <div className="profile-share-label">Posts</div>
        </div>
      </div>

      <div className="profile-share-footer">
        <span>Share your progress</span>
        <span className="profile-share-watermark">{brand}</span>
      </div>
    </div>
  );
});

export default ProfileStatsCard;
