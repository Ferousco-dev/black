import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true });
      else navigate('/signin', { replace: true });
    });
  }, [navigate]);

  return (
    <div className="loading-page">
      <div style={{ textAlign: 'center' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Verifying your account…</p>
      </div>
    </div>
  );
}
