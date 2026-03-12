import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { updateProfile, uploadAvatar } from '../lib/api';
import toast from 'react-hot-toast';
import './Settings.css';

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ full_name: '', username: '', bio: '', website: '', twitter_handle: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        website: profile.website || '',
        twitter_handle: profile.twitter_handle || '',
      });
    }
  }, [profile]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateProfile(user.id, form);
    if (error) toast.error(error.message);
    else { toast.success('Profile updated'); await refreshProfile(); }
    setSaving(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { data, error } = await uploadAvatar(user.id, file);
    if (error) toast.error('Upload failed');
    else {
      await updateProfile(user.id, { avatar_url: data });
      await refreshProfile();
      toast.success('Avatar updated');
    }
    setUploading(false);
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.username?.[0]?.toUpperCase() || '?';

  return (
    <div className="settings-page">
      <div className="container" style={{ maxWidth: 680 }}>
        <h1 className="settings-title">Settings</h1>

        <section className="settings-section card">
          <h2 className="settings-section-title">Profile</h2>

          {/* Avatar */}
          <div className="avatar-edit">
            <div className="avatar-current">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={profile.username} className="avatar" style={{ width: 72, height: 72 }} />
                : <div className="avatar-placeholder" style={{ width: 72, height: 72, fontSize: '1.5rem' }}>{initials}</div>
              }
            </div>
            <div>
              <label className="btn btn-secondary btn-sm">
                {uploading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Change photo'}
                <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
              </label>
              <div className="form-hint" style={{ marginTop: 4 }}>JPG, PNG, GIF up to 5MB</div>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div className="settings-row">
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input type="text" className="form-input" value={form.full_name} onChange={set('full_name')} placeholder="Jane Smith" />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input type="text" className="form-input" value={form.username} onChange={set('username')} placeholder="janesmith" required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="form-input form-textarea" value={form.bio} onChange={set('bio')} placeholder="Tell readers about yourself…" rows={3} />
            </div>
            <div className="settings-row">
              <div className="form-group">
                <label className="form-label">Website</label>
                <input type="url" className="form-input" value={form.website} onChange={set('website')} placeholder="https://yoursite.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Twitter handle</label>
                <input type="text" className="form-input" value={form.twitter_handle} onChange={set('twitter_handle')} placeholder="@handle" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Save changes'}
            </button>
          </form>
        </section>

        <section className="settings-section card">
          <h2 className="settings-section-title">Account</h2>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={user?.email || ''} disabled style={{ background: 'var(--off-white)', cursor: 'not-allowed' }} />
            <div className="form-hint">Contact support to change your email address.</div>
          </div>
        </section>
      </div>
    </div>
  );
}
