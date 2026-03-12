import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { updatePassword } from "../lib/api";
import toast from "react-hot-toast";
import "./Auth.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase sets the session from the URL hash on this page
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      else {
        toast.error("Invalid or expired reset link");
        navigate("/signin");
      }
    });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Password updated! Please sign in.");
      navigate("/signin");
    }
  };

  if (!ready)
    return (
      <div className="loading-page">
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );

  return (
    <div className="auth-page">
      <div className="auth-box card">
        <div className="auth-logo">
          <span className="logo-mark">●</span>
          <span className="logo-text">Chronicles</span>
        </div>
        <h1 className="auth-title">Set new password</h1>
        <p className="auth-subtitle">
          Choose a strong password for your account
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm password</label>
            <input
              type="password"
              className="form-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              "Update password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
