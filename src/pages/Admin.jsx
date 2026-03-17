import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminStats,
  getAdminUsers,
  getAdminPosts,
  getAdminComments,
  setUserSuspended,
} from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import AdminGrowthCard from "../components/share/AdminGrowthCard";
import toast from "react-hot-toast";
import "./Admin.css";

export default function Admin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState({ state: "idle", message: "" });
  const shareExportRef = useRef(null);

  useEffect(() => {
    if (!profile?.is_admin) return;
    loadAll();
  }, [profile]);

  const loadAll = async () => {
    setLoading(true);
    const [statsRes, usersRes, postsRes, commentsRes] = await Promise.all([
      getAdminStats(),
      getAdminUsers(60),
      getAdminPosts(60),
      getAdminComments(60),
    ]);
    setStats(statsRes.data);
    setUsers(usersRes.data || []);
    setPosts(postsRes.data || []);
    setComments(commentsRes.data || []);
    setLoading(false);
  };

  const handleSuspend = async (user) => {
    const reason = window.prompt("Reason for suspension (optional):") || "";
    const { error } = await setUserSuspended({
      userId: user.id,
      isSuspended: true,
      reason,
    });
    if (error) toast.error("Could not suspend user");
    else {
      toast.success("User suspended");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_suspended: true } : u))
      );
    }
  };

  const handleUnsuspend = async (user) => {
    const { error } = await setUserSuspended({
      userId: user.id,
      isSuspended: false,
    });
    if (error) toast.error("Could not unsuspend user");
    else {
      toast.success("User unsuspended");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_suspended: false } : u))
      );
    }
  };

  const renderGrowthImage = async () => {
    if (!shareExportRef.current) return null;
    setShareStatus({ state: "loading", message: "Generating growth card…" });
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(shareExportRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      return canvas;
    } catch (err) {
      setShareStatus({ state: "error", message: "Failed to generate image." });
      return null;
    }
  };

  const handleDownloadGrowth = async () => {
    const canvas = await renderGrowthImage();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "growth-snapshot.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    setShareStatus({ state: "success", message: "PNG downloaded." });
  };

  const handleCopyGrowth = async () => {
    if (!navigator.clipboard || !window.ClipboardItem) {
      toast.error("Clipboard image not supported");
      return;
    }
    const canvas = await renderGrowthImage();
    if (!canvas) return;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
    setShareStatus({ state: "success", message: "Image copied to clipboard." });
  };

  if (!profile?.is_admin) {
    return (
      <div className="admin-page">
        <div className="container admin-unauthorized">
          <h1>Admin access required</h1>
          <p>You do not have permission to view this page.</p>
          <Link to="/" className="btn btn-secondary">Go home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="container admin-container">
        <div className="admin-header">
          <div>
            <h1>Admin Control Panel</h1>
            <p>Manage users, posts, comments, and growth insights.</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setShareOpen(true)}>
            Generate growth card
          </button>
        </div>

        <div className="admin-tabs">
          {["overview", "users", "posts", "comments"].map((tab) => (
            <button
              key={tab}
              className={`admin-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-page">
            <span className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : (
          <>
            {activeTab === "overview" && stats && (
              <div className="admin-overview">
                <div className="admin-stat-card">
                  <div className="admin-stat-number">{stats.totalUsers}</div>
                  <div className="admin-stat-label">Total users</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-number">{stats.activeUsers}</div>
                  <div className="admin-stat-label">Active users (7d)</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-number">{stats.totalPosts}</div>
                  <div className="admin-stat-label">Total posts</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-number">{stats.totalComments}</div>
                  <div className="admin-stat-label">Total comments</div>
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div className="admin-table">
                <div className="admin-table-head">
                  <span>User</span>
                  <span>Joined</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {users.map((user) => (
                  <div key={user.id} className="admin-table-row">
                    <div className="admin-user">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} />
                      ) : (
                        <div className="admin-user-avatar">{user.username?.[0]?.toUpperCase() || "U"}</div>
                      )}
                      <div>
                        <div className="admin-user-name">{user.full_name || user.username}</div>
                        <div className="admin-user-handle">@{user.username}</div>
                      </div>
                    </div>
                    <span>{new Date(user.created_at).toLocaleDateString()}</span>
                    <span className={`admin-status ${user.is_suspended ? "suspended" : "active"}`}>
                      {user.is_suspended ? "Suspended" : "Active"}
                    </span>
                    <div className="admin-actions">
                      {user.is_suspended ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleUnsuspend(user)}>Unsuspend</button>
                      ) : (
                        <button className="btn btn-danger btn-sm" onClick={() => handleSuspend(user)}>Suspend</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "posts" && (
              <div className="admin-table">
                <div className="admin-table-head">
                  <span>Post</span>
                  <span>Author</span>
                  <span>Published</span>
                  <span>Likes</span>
                </div>
                {posts.map((post) => (
                  <div key={post.id} className="admin-table-row">
                    <Link to={`/p/${post.slug}`} className="admin-link">{post.title}</Link>
                    <span>@{post.author_username}</span>
                    <span>{post.is_published ? "Yes" : "Draft"}</span>
                    <span>{post.like_count || 0}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="admin-table">
                <div className="admin-table-head">
                  <span>Comment</span>
                  <span>Author</span>
                  <span>Post</span>
                  <span>Date</span>
                </div>
                {comments.map((comment) => (
                  <div key={comment.id} className="admin-table-row">
                    <span className="admin-comment">{comment.content}</span>
                    <span>@{comment.author?.username}</span>
                    <Link to={`/p/${comment.post?.slug}`} className="admin-link">{comment.post?.title}</Link>
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {shareOpen && stats && (
        <div className="admin-share-modal" role="dialog" aria-modal="true">
          <div className="admin-share-backdrop" onClick={() => setShareOpen(false)} />
          <div className="admin-share-panel">
            <div className="admin-share-header">
              <div>
                <h3>Growth analysis card</h3>
                <p>Share a snapshot of platform growth.</p>
              </div>
              <button className="icon-btn share-close" onClick={() => setShareOpen(false)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="admin-share-body">
              <div className="admin-share-frame">
                <AdminGrowthCard
                  totalUsers={stats.totalUsers}
                  totalPosts={stats.totalPosts}
                  totalComments={stats.totalComments}
                  activeUsers={stats.activeUsers}
                />
              </div>
              <div className="admin-share-actions">
                <button className="btn btn-primary btn-sm" onClick={handleDownloadGrowth} disabled={shareStatus.state === "loading"}>
                  Download PNG
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleCopyGrowth} disabled={shareStatus.state === "loading"}>
                  Copy image
                </button>
                {shareStatus.state !== "idle" && (
                  <div className={`admin-share-status ${shareStatus.state}`}>{shareStatus.message}</div>
                )}
              </div>
            </div>
          </div>

          <div className="admin-share-export" aria-hidden="true">
            <AdminGrowthCard
              ref={shareExportRef}
              totalUsers={stats.totalUsers}
              totalPosts={stats.totalPosts}
              totalComments={stats.totalComments}
              activeUsers={stats.activeUsers}
            />
          </div>
        </div>
      )}
    </div>
  );
}
