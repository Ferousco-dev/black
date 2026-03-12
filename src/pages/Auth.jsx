import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn, signUp, resetPassword } from "../lib/api";
import toast from "react-hot-toast";
import "./Auth.css";

export function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Welcome back!");
      navigate("/");
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) toast.error(error.message);
    else toast.success("Reset link sent to your email");
    setLoading(false);
    setShowReset(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-box card">
        <div className="auth-logo">
          <span className="logo-mark">●</span>
          <span className="logo-text">Chronicles</span>
        </div>
        <h1 className="auth-title">
          {showReset ? "Reset password" : "Welcome back"}
        </h1>
        <p className="auth-subtitle">
          {showReset
            ? "Enter your email to receive a reset link"
            : "Sign in to your account"}
        </p>

        <form onSubmit={showReset ? handleReset : handleSignIn}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          {!showReset && (
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 16, height: 16 }} />
            ) : showReset ? (
              "Send reset link"
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <div className="auth-footer">
          {showReset ? (
            <button className="auth-link" onClick={() => setShowReset(false)}>
              Back to sign in
            </button>
          ) : (
            <>
              <button className="auth-link" onClick={() => setShowReset(true)}>
                Forgot password?
              </button>
              <span className="auth-sep">·</span>
              <Link to="/signup" className="auth-link">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    fullName: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!/^[a-z0-9_-]+$/i.test(form.username)) {
      toast.error("Username can only contain letters, numbers, _ and -");
      return;
    }
    setLoading(true);
    const { error } = await signUp(form);
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else setDone(true);
  };

  if (done)
    return (
      <div className="auth-page">
        <div className="auth-box card">
          <div className="auth-logo">
            <span className="logo-mark">●</span>
            <span className="logo-text">Chronicles</span>
          </div>
          <div className="auth-success">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--success)"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <h2 className="auth-title">Check your email</h2>
            <p className="auth-subtitle">
              We sent a verification link to <strong>{form.email}</strong>.
              Click it to activate your account.
            </p>
            <Link
              to="/signin"
              className="btn btn-primary"
              style={{ marginTop: "1.5rem" }}
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );

  return (
    <div className="auth-page">
      <div className="auth-box card">
        <div className="auth-logo">
          <span className="logo-mark">●</span>
          <span className="logo-text">Chronicles</span>
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start publishing to the world</p>
        <form onSubmit={handleSignUp}>
          <div className="auth-row">
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                type="text"
                className="form-input"
                value={form.fullName}
                onChange={set("fullName")}
                placeholder="Jane Smith"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                value={form.username}
                onChange={set("username")}
                placeholder="janesmith"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={form.password}
              onChange={set("password")}
              placeholder="Min. 8 characters"
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
              "Create account"
            )}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account?{" "}
          <Link to="/signin" className="auth-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
