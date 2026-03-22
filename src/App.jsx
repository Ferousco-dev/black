import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { signOut } from "./lib/api";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import { SignIn, SignUp } from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import Editor from "./pages/Editor";
import Dashboard from "./pages/Dashboard";
import PostView from "./pages/PostView";
import Profile from "./pages/Profile";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import FollowList from "./pages/FollowList";
import { Feed, Bookmarks } from "./pages/FeedAndBookmarks";
import Analytics from "./pages/Analytics";
import Monetization from "./pages/Monetization";
import Discovery from "./pages/Discovery";
import Community from "./pages/Community";
import Topics from "./pages/Topics";
import TopicHub from "./pages/TopicHub";
import ForYou from "./pages/ForYou";
import Admin from "./pages/Admin";
import ResumeReading from "./pages/ResumeReading";
import "./styles/global.css";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="loading-page">
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  return user ? children : <Navigate to="/signin" replace />;
}

function AppLayout() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleSuspendSignOut = async () => {
    await signOut();
    navigate("/signin");
  };

  if (profile?.is_suspended) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div className="card" style={{ padding: "2rem", maxWidth: 520, textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-serif)", marginBottom: "0.75rem" }}>Account suspended</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Your account is currently suspended. If you believe this is a mistake, contact support.
          </p>
          <button className="btn btn-secondary" onClick={handleSuspendSignOut}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      <Navbar />
      <div style={{ flex: 1, paddingTop: "60px" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/search" element={<Search />} />
          <Route path="/discover" element={<Discovery />} />
          <Route path="/for-you" element={<ForYou />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/topics/:slug" element={<TopicHub />} />
          <Route path="/p/:slug" element={<PostView />} />
          <Route path="/community/:username" element={<Community />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/new"
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/edit/:id"
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/monetization"
            element={
              <ProtectedRoute>
                <Monetization />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume-reading"
            element={
              <ProtectedRoute>
                <ResumeReading />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookmarks"
            element={
              <ProtectedRoute>
                <Bookmarks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="/:atUsername" element={<Profile />} />
          <Route path="/:atUsername/:type" element={<FollowList />} />
          <Route
            path="*"
            element={
              <div
                style={{
                  minHeight: "60vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <h1
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "5rem",
                    color: "var(--navy)",
                    lineHeight: 1,
                  }}
                >
                  404
                </h1>
                <p style={{ color: "var(--text-muted)" }}>
                  This page doesn't exist.
                </p>
                <a href="/" className="btn btn-secondary">
                  Go home
                </a>
              </div>
            }
          />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
            },
            success: {
              iconTheme: {
                primary: "var(--success)",
                secondary: "var(--text-on-accent)",
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
