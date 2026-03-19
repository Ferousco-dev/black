import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminStats,
  getAdminMetrics,
  getAdminUsers,
  getAdminUsersExport,
  getAdminPosts,
  getAdminPostsExport,
  getAdminComments,
  getAdminCommentsExport,
  setUserSuspended,
  setUserRole,
  forceUserLogout,
  getAdminUserHistory,
  getAdminBroadcasts,
  createAdminBroadcast,
  getSecurityEvents,
  createSecurityEvent,
  getBannedIps,
  createBannedIp,
  updateBannedIp,
  getRateLimitRules,
  createRateLimitRule,
  updateRateLimitRule,
  resetPassword,
} from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import AdminGrowthCard from "../components/share/AdminGrowthCard";
import toast from "react-hot-toast";
import LoadingPage from "../components/ui/LoadingPage";
import { buildCacheKey, getCache, setCache } from "../lib/cache";
import "./Admin.css";

export default function Admin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [bannedIps, setBannedIps] = useState([]);
  const [rateLimits, setRateLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);

  const [userQuery, setUserQuery] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userHistory, setUserHistory] = useState(null);
  const [userHistoryLoading, setUserHistoryLoading] = useState(false);

  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    body: "",
    type: "announcement",
    link: "",
  });
  const [broadcastStatus, setBroadcastStatus] = useState({ state: "idle", message: "" });
  const [exportStatus, setExportStatus] = useState({ state: "idle", message: "" });

  const [eventForm, setEventForm] = useState({
    event_type: "suspicious_login",
    severity: "medium",
    user_id: "",
    ip_address: "",
    user_agent: "",
    notes: "",
  });
  const [banForm, setBanForm] = useState({ ip_range: "", reason: "" });
  const [rateLimitForm, setRateLimitForm] = useState({
    scope: "",
    max_requests: 120,
    window_seconds: 60,
  });

  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState({ state: "idle", message: "" });
  const shareExportRef = useRef(null);

  useEffect(() => {
    if (!profile?.is_admin) return;
    loadOverview();
  }, [profile]);

  useEffect(() => {
    if (!profile?.is_admin) return;
    if (activeTab === "users") loadUsers();
    if (activeTab === "posts") loadPosts();
    if (activeTab === "comments") loadComments();
    if (activeTab === "metrics") loadMetrics();
    if (activeTab === "broadcasts") loadBroadcasts();
    if (activeTab === "security") loadSecurity();
  }, [activeTab, profile]);

  useEffect(() => {
    if (!profile?.is_admin) return;
    if (activeTab !== "users") return;
    const timeout = setTimeout(() => {
      loadUsers();
    }, 250);
    return () => clearTimeout(timeout);
  }, [userQuery, userStatusFilter, userRoleFilter, activeTab, profile]);

  const loadOverview = async () => {
    setLoading(true);
    const cacheKey = buildCacheKey("admin", "overview");
    const cached = getCache(cacheKey);
    if (cached) {
      setStats(cached);
      setLoading(false);
      return;
    }
    const statsRes = await getAdminStats();
    setStats(statsRes.data);
    setCache(cacheKey, statsRes.data || null);
    setLoading(false);
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    const cacheKey = buildCacheKey(
      "admin",
      "users",
      userQuery.trim() || "all",
      userStatusFilter,
      userRoleFilter
    );
    const cached = getCache(cacheKey);
    if (cached) {
      setUsers(cached);
      setUsersLoading(false);
      return;
    }
    const usersRes = await getAdminUsers({
      limit: 80,
      query: userQuery.trim(),
      status: userStatusFilter,
      role: userRoleFilter,
    });
    setUsers(usersRes.data || []);
    setCache(cacheKey, usersRes.data || []);
    setUsersLoading(false);
  };

  const loadPosts = async () => {
    setPostsLoading(true);
    const cacheKey = buildCacheKey("admin", "posts");
    const cached = getCache(cacheKey);
    if (cached) {
      setPosts(cached);
      setPostsLoading(false);
      return;
    }
    const postsRes = await getAdminPosts(60);
    setPosts(postsRes.data || []);
    setCache(cacheKey, postsRes.data || []);
    setPostsLoading(false);
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    const cacheKey = buildCacheKey("admin", "comments");
    const cached = getCache(cacheKey);
    if (cached) {
      setComments(cached);
      setCommentsLoading(false);
      return;
    }
    const commentsRes = await getAdminComments(60);
    setComments(commentsRes.data || []);
    setCache(cacheKey, commentsRes.data || []);
    setCommentsLoading(false);
  };

  const loadMetrics = async () => {
    setMetricsLoading(true);
    const cacheKey = buildCacheKey("admin", "metrics");
    const cached = getCache(cacheKey);
    if (cached) {
      setMetrics(cached);
      setMetricsLoading(false);
      return;
    }
    const metricsRes = await getAdminMetrics();
    setMetrics(metricsRes.data);
    setCache(cacheKey, metricsRes.data || null);
    setMetricsLoading(false);
  };

  const loadBroadcasts = async () => {
    setBroadcastLoading(true);
    const cacheKey = buildCacheKey("admin", "broadcasts");
    const cached = getCache(cacheKey);
    if (cached) {
      setBroadcasts(cached);
      setBroadcastLoading(false);
      return;
    }
    const broadcastsRes = await getAdminBroadcasts(20);
    setBroadcasts(broadcastsRes.data || []);
    setCache(cacheKey, broadcastsRes.data || []);
    setBroadcastLoading(false);
  };

  const loadSecurity = async () => {
    setSecurityLoading(true);
    const cacheKey = buildCacheKey("admin", "security");
    const cached = getCache(cacheKey);
    if (cached) {
      setSecurityEvents(cached.events || []);
      setBannedIps(cached.bannedIps || []);
      setRateLimits(cached.rateLimits || []);
      setSecurityLoading(false);
      return;
    }
    const [eventsRes, bannedRes, rateRes] = await Promise.all([
      getSecurityEvents(40),
      getBannedIps(40),
      getRateLimitRules(40),
    ]);
    setSecurityEvents(eventsRes.data || []);
    setBannedIps(bannedRes.data || []);
    setRateLimits(rateRes.data || []);
    setCache(cacheKey, {
      events: eventsRes.data || [],
      bannedIps: bannedRes.data || [],
      rateLimits: rateRes.data || [],
    });
    setSecurityLoading(false);
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

  const handleRoleToggle = async (user) => {
    const { error } = await setUserRole({ userId: user.id, isAdmin: !user.is_admin });
    if (error) toast.error("Could not update role");
    else {
      toast.success(user.is_admin ? "Admin removed" : "Admin granted");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_admin: !user.is_admin } : u))
      );
    }
  };

  const handleForceLogout = async (user) => {
    const { error } = await forceUserLogout({ userId: user.id });
    if (error) toast.error("Could not force logout");
    else {
      toast.success("Logout forced");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, force_logout_at: new Date().toISOString() } : u
        )
      );
    }
  };

  const handleResetPassword = async () => {
    const email = window.prompt("Enter user email to send reset link:");
    if (!email) return;
    const { error } = await resetPassword(email);
    if (error) toast.error("Could not send reset link");
    else toast.success("Reset link sent");
  };

  const handleOpenUser = async (user) => {
    setSelectedUser(user);
    setUserHistoryLoading(true);
    const { data, error } = await getAdminUserHistory(user.id);
    if (error) toast.error("Could not load user history");
    setUserHistory(data);
    setUserHistoryLoading(false);
  };

  const handleBroadcastSubmit = async (event) => {
    event.preventDefault();
    if (!broadcastForm.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBroadcastStatus({ state: "loading", message: "Sending broadcast…" });
    const { error } = await createAdminBroadcast({
      title: broadcastForm.title.trim(),
      body: broadcastForm.body.trim(),
      type: broadcastForm.type,
      link: broadcastForm.link.trim() || null,
    });
    if (error) {
      setBroadcastStatus({ state: "error", message: "Broadcast failed." });
      return;
    }
    setBroadcastStatus({ state: "success", message: "Broadcast sent." });
    setBroadcastForm({ title: "", body: "", type: "announcement", link: "" });
    loadBroadcasts();
  };

  const handleSecurityEventSubmit = async (event) => {
    event.preventDefault();
    if (!eventForm.notes.trim()) {
      toast.error("Add a short note");
      return;
    }
    const payload = {
      event_type: eventForm.event_type,
      severity: eventForm.severity,
      notes: eventForm.notes.trim(),
      user_id: eventForm.user_id.trim() || null,
      ip_address: eventForm.ip_address.trim() || null,
      user_agent: eventForm.user_agent.trim() || null,
    };
    const { error } = await createSecurityEvent(payload);
    if (error) toast.error("Could not log event");
    else {
      toast.success("Security event logged");
      setEventForm({
        event_type: "suspicious_login",
        severity: "medium",
        user_id: "",
        ip_address: "",
        user_agent: "",
        notes: "",
      });
      loadSecurity();
    }
  };

  const handleBanSubmit = async (event) => {
    event.preventDefault();
    if (!banForm.ip_range.trim()) {
      toast.error("IP range required");
      return;
    }
    const { error } = await createBannedIp({
      ipRange: banForm.ip_range.trim(),
      reason: banForm.reason.trim() || null,
    });
    if (error) toast.error("Could not ban IP range");
    else {
      toast.success("IP range added");
      setBanForm({ ip_range: "", reason: "" });
      loadSecurity();
    }
  };

  const handleRateLimitSubmit = async (event) => {
    event.preventDefault();
    if (!rateLimitForm.scope.trim()) {
      toast.error("Scope required");
      return;
    }
    const maxRequests = Number(rateLimitForm.max_requests);
    const windowSeconds = Number(rateLimitForm.window_seconds);
    if (!Number.isFinite(maxRequests) || maxRequests <= 0 || !Number.isFinite(windowSeconds) || windowSeconds <= 0) {
      toast.error("Enter valid rate limits");
      return;
    }
    const { error } = await createRateLimitRule({
      scope: rateLimitForm.scope.trim(),
      maxRequests,
      windowSeconds,
    });
    if (error) toast.error("Could not save rule");
    else {
      toast.success("Rate limit saved");
      setRateLimitForm({ scope: "", max_requests: 120, window_seconds: 60 });
      loadSecurity();
    }
  };

  const handleToggleBan = async (ban) => {
    const { error } = await updateBannedIp({ id: ban.id, active: !ban.active });
    if (error) toast.error("Could not update ban");
    else loadSecurity();
  };

  const handleToggleRateLimit = async (rule) => {
    const { error } = await updateRateLimitRule({ id: rule.id, active: !rule.active });
    if (error) toast.error("Could not update rule");
    else loadSecurity();
  };

  const formatShortDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const downloadCsv = (rows, filename) => {
    if (!rows.length) {
      toast.error("No data to export");
      return;
    }
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(","),
      ...rows.map((row) => headers.map((key) => escapeCsvValue(row[key])).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportUsers = async () => {
    setExportStatus({ state: "loading", message: "Exporting users…" });
    const { data, error } = await getAdminUsersExport();
    if (error) {
      setExportStatus({ state: "error", message: "Failed to export users." });
      return;
    }
    const rows = (data || []).map((user) => ({
      id: user.id,
      username: user.username,
      full_name: user.full_name || "",
      created_at: user.created_at,
      is_admin: user.is_admin ? "yes" : "no",
      is_suspended: user.is_suspended ? "yes" : "no",
      suspended_at: user.suspended_at || "",
      suspended_reason: user.suspended_reason || "",
    }));
    downloadCsv(rows, "users-report.csv");
    setExportStatus({ state: "success", message: "Users export ready." });
  };

  const handleExportPosts = async () => {
    setExportStatus({ state: "loading", message: "Exporting posts…" });
    const { data, error } = await getAdminPostsExport();
    if (error) {
      setExportStatus({ state: "error", message: "Failed to export posts." });
      return;
    }
    const rows = (data || []).map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      author: post.author_username,
      is_published: post.is_published ? "yes" : "no",
      created_at: post.created_at,
      published_at: post.published_at || "",
      like_count: post.like_count || 0,
      comment_count: post.comment_count || 0,
    }));
    downloadCsv(rows, "posts-report.csv");
    setExportStatus({ state: "success", message: "Posts export ready." });
  };

  const handleExportComments = async () => {
    setExportStatus({ state: "loading", message: "Exporting comments…" });
    const { data, error } = await getAdminCommentsExport();
    if (error) {
      setExportStatus({ state: "error", message: "Failed to export comments." });
      return;
    }
    const rows = (data || []).map((comment) => ({
      id: comment.id,
      content: comment.content,
      author: comment.author?.username || "",
      post_title: comment.post?.title || "",
      post_slug: comment.post?.slug || "",
      created_at: comment.created_at,
    }));
    downloadCsv(rows, "comments-report.csv");
    setExportStatus({ state: "success", message: "Comments export ready." });
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

  const postSeriesMax = Math.max(1, ...(metrics?.postSeries || []).map((item) => item.count));
  const commentSeriesMax = Math.max(1, ...(metrics?.commentSeries || []).map((item) => item.count));

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
            <p>Manage users, content, and growth insights across the platform.</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setShareOpen(true)}>
            Generate growth card
          </button>
        </div>

        <div className="admin-tabs">
          {["overview", "metrics", "users", "posts", "comments", "broadcasts", "security"].map((tab) => (
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
          <LoadingPage variant="table" count={6} />
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

            {activeTab === "metrics" && (
              <div className="admin-metrics">
                {metricsLoading ? (
                  <LoadingPage variant="table" count={6} />
                ) : (
                  <>
                    <div className="admin-metric-grid">
                      <div className="admin-stat-card">
                        <div className="admin-stat-number">{metrics?.dau || 0}</div>
                        <div className="admin-stat-label">DAU</div>
                      </div>
                      <div className="admin-stat-card">
                        <div className="admin-stat-number">{metrics?.mau || 0}</div>
                        <div className="admin-stat-label">MAU</div>
                      </div>
                      <div className="admin-stat-card">
                        <div className="admin-stat-number">{metrics?.retentionRate || 0}%</div>
                        <div className="admin-stat-label">7-day retention</div>
                      </div>
                    </div>

                    <div className="admin-metric-panels">
                      <div className="admin-panel">
                        <div className="admin-panel-header">
                          <h3>Posts per day</h3>
                          <span>Last 14 days</span>
                        </div>
                        <div className="admin-series">
                          {(metrics?.postSeries || []).map((item) => (
                            <div key={item.day} className="admin-series-item">
                              <div
                                className="admin-series-bar"
                                style={{
                                  height: `${Math.max(8, (item.count / postSeriesMax) * 100)}%`,
                                }}
                              />
                              <span>{item.day.slice(5)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="admin-panel">
                        <div className="admin-panel-header">
                          <h3>Comments per day</h3>
                          <span>Last 14 days</span>
                        </div>
                        <div className="admin-series">
                          {(metrics?.commentSeries || []).map((item) => (
                            <div key={item.day} className="admin-series-item">
                              <div
                                className="admin-series-bar alt"
                                style={{
                                  height: `${Math.max(8, (item.count / commentSeriesMax) * 100)}%`,
                                }}
                              />
                              <span>{item.day.slice(5)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="admin-panel">
                        <div className="admin-panel-header">
                          <h3>Top topics</h3>
                          <span>Most tagged</span>
                        </div>
                        <div className="admin-topic-list">
                          {(metrics?.topTopics || []).map((topic) => (
                            <div key={topic.slug} className="admin-topic-item">
                              <span className="admin-topic-dot" style={{ background: topic.color || "var(--accent)" }} />
                              <div>
                                <div className="admin-topic-name">{topic.name}</div>
                                <div className="admin-topic-count">{topic.count} posts</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "users" && (
              <div className="admin-users">
                <div className="admin-filter-bar">
                  <input
                    className="form-input"
                    placeholder="Search by username or name"
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                  />
                  <select
                    className="form-input"
                    value={userStatusFilter}
                    onChange={(event) => setUserStatusFilter(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <select
                    className="form-input"
                    value={userRoleFilter}
                    onChange={(event) => setUserRoleFilter(event.target.value)}
                  >
                    <option value="all">All roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={handleResetPassword}>
                    Send reset link
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleExportUsers}>
                    Export CSV
                  </button>
                </div>
                {exportStatus.state !== "idle" && (
                  <div className={`admin-inline-status ${exportStatus.state}`}>{exportStatus.message}</div>
                )}

                {usersLoading ? (
                  <LoadingPage variant="table" count={6} />
                ) : (
                  <div className="admin-table">
                    <div className="admin-table-head admin-user-grid">
                      <span>User</span>
                      <span>Joined</span>
                      <span>Status</span>
                      <span>Role</span>
                      <span>Actions</span>
                    </div>
                    {users.map((user) => (
                      <div key={user.id} className="admin-table-row admin-user-grid">
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
                        <span className="admin-role">{user.is_admin ? "Admin" : "User"}</span>
                        <div className="admin-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => handleOpenUser(user)}>
                            View
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleRoleToggle(user)}>
                            {user.is_admin ? "Remove admin" : "Make admin"}
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleForceLogout(user)}>
                            Force logout
                          </button>
                          {user.is_suspended ? (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleUnsuspend(user)}>
                              Unsuspend
                            </button>
                          ) : (
                            <button className="btn btn-danger btn-sm" onClick={() => handleSuspend(user)}>
                              Suspend
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "posts" && (
              <div className="admin-table">
                <div className="admin-table-toolbar">
                  <div>
                    <h3>Posts report</h3>
                    <p>Latest posts and engagement</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleExportPosts}>
                    Export CSV
                  </button>
                </div>
                {exportStatus.state !== "idle" && (
                  <div className={`admin-inline-status ${exportStatus.state}`}>{exportStatus.message}</div>
                )}
                <div className="admin-table-head">
                  <span>Post</span>
                  <span>Author</span>
                  <span>Published</span>
                  <span>Likes</span>
                </div>
                {postsLoading ? (
                  <LoadingPage variant="table" count={6} />
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className="admin-table-row">
                      <Link to={`/p/${post.slug}`} className="admin-link">{post.title}</Link>
                      <span>@{post.author_username}</span>
                      <span>{post.is_published ? "Yes" : "Draft"}</span>
                      <span>{post.like_count || 0}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="admin-table">
                <div className="admin-table-toolbar">
                  <div>
                    <h3>Comments report</h3>
                    <p>Recent discussion and replies</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleExportComments}>
                    Export CSV
                  </button>
                </div>
                {exportStatus.state !== "idle" && (
                  <div className={`admin-inline-status ${exportStatus.state}`}>{exportStatus.message}</div>
                )}
                <div className="admin-table-head">
                  <span>Comment</span>
                  <span>Author</span>
                  <span>Post</span>
                  <span>Date</span>
                </div>
                {commentsLoading ? (
                  <LoadingPage variant="table" count={6} />
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="admin-table-row">
                      <span className="admin-comment">{comment.content}</span>
                      <span>@{comment.author?.username}</span>
                      <Link to={`/p/${comment.post?.slug}`} className="admin-link">{comment.post?.title}</Link>
                      <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "broadcasts" && (
              <div className="admin-broadcasts">
                <form className="admin-panel admin-form" onSubmit={handleBroadcastSubmit}>
                  <div className="admin-panel-header">
                    <h3>Broadcast message</h3>
                    <span>Send platform-wide announcements</span>
                  </div>
                  <div className="admin-form-grid">
                    <div>
                      <label className="form-label">Title</label>
                      <input
                        className="form-input"
                        value={broadcastForm.title}
                        onChange={(event) => setBroadcastForm((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="Platform update headline"
                        maxLength={120}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Type</label>
                      <select
                        className="form-input"
                        value={broadcastForm.type}
                        onChange={(event) => setBroadcastForm((prev) => ({ ...prev, type: event.target.value }))}
                      >
                        <option value="announcement">Announcement</option>
                        <option value="warning">Warning</option>
                        <option value="update">Update</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message</label>
                    <textarea
                      className="form-input form-textarea"
                      value={broadcastForm.body}
                      onChange={(event) => setBroadcastForm((prev) => ({ ...prev, body: event.target.value }))}
                      placeholder="Share details, release notes, or policy updates."
                      maxLength={400}
                      rows={4}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Optional link</label>
                    <input
                      className="form-input"
                      value={broadcastForm.link}
                      onChange={(event) => setBroadcastForm((prev) => ({ ...prev, link: event.target.value }))}
                      placeholder="https://"
                    />
                  </div>
                  <div className="admin-form-actions">
                    <button className="btn btn-primary btn-sm" type="submit" disabled={broadcastStatus.state === "loading"}>
                      Send broadcast
                    </button>
                    {broadcastStatus.state !== "idle" && (
                      <div className={`admin-inline-status ${broadcastStatus.state}`}>{broadcastStatus.message}</div>
                    )}
                  </div>
                </form>

                <div className="admin-panel">
                  <div className="admin-panel-header">
                    <h3>Recent broadcasts</h3>
                    <span>Last 20 sends</span>
                  </div>
                {broadcastLoading ? (
                  <LoadingPage variant="list" count={4} />
                ) : (
                    <div className="admin-broadcast-list">
                      {broadcasts.map((item) => (
                        <div key={item.id} className="admin-broadcast-item">
                          <div className="admin-broadcast-meta">
                            <span className={`admin-pill ${item.type}`}>{item.type}</span>
                            <span>{formatShortDate(item.created_at)}</span>
                          </div>
                          <div className="admin-broadcast-title">{item.title}</div>
                          {item.body && <div className="admin-broadcast-body">{item.body}</div>}
                          <div className="admin-broadcast-foot">
                            <span>{item.sent_count} recipients</span>
                            {item.link && (
                              <a className="admin-link" href={item.link} target="_blank" rel="noreferrer">
                                View link
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="admin-security">
                <div className="admin-panel admin-form">
                  <div className="admin-panel-header">
                    <h3>Log security event</h3>
                    <span>Track suspicious login or manual actions</span>
                  </div>
                  <form onSubmit={handleSecurityEventSubmit}>
                    <div className="admin-form-grid">
                      <div>
                        <label className="form-label">Event type</label>
                        <select
                          className="form-input"
                          value={eventForm.event_type}
                          onChange={(event) =>
                            setEventForm((prev) => ({ ...prev, event_type: event.target.value }))
                          }
                        >
                          <option value="suspicious_login">Suspicious login</option>
                          <option value="rate_limit">Rate limit hit</option>
                          <option value="ip_block">IP blocked</option>
                          <option value="manual">Manual note</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Severity</label>
                        <select
                          className="form-input"
                          value={eventForm.severity}
                          onChange={(event) =>
                            setEventForm((prev) => ({ ...prev, severity: event.target.value }))
                          }
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <div>
                        <label className="form-label">User ID (optional)</label>
                        <input
                          className="form-input"
                          value={eventForm.user_id}
                          onChange={(event) =>
                            setEventForm((prev) => ({ ...prev, user_id: event.target.value }))
                          }
                          placeholder="UUID"
                        />
                      </div>
                      <div>
                        <label className="form-label">IP address (optional)</label>
                        <input
                          className="form-input"
                          value={eventForm.ip_address}
                          onChange={(event) =>
                            setEventForm((prev) => ({ ...prev, ip_address: event.target.value }))
                          }
                          placeholder="203.0.113.10"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">User agent (optional)</label>
                      <input
                        className="form-input"
                        value={eventForm.user_agent}
                        onChange={(event) =>
                          setEventForm((prev) => ({ ...prev, user_agent: event.target.value }))
                        }
                        placeholder="Browser / device"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-input form-textarea"
                        value={eventForm.notes}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, notes: event.target.value }))}
                        rows={3}
                        placeholder="Short description of the incident."
                      />
                    </div>
                    <div className="admin-form-actions">
                      <button className="btn btn-primary btn-sm" type="submit">
                        Log event
                      </button>
                    </div>
                  </form>
                </div>

                <div className="admin-panel">
                  <div className="admin-panel-header">
                    <h3>Security events</h3>
                    <span>Most recent activity</span>
                  </div>
                  {securityLoading ? (
                    <LoadingPage variant="list" count={5} />
                  ) : (
                    <div className="admin-event-list">
                      {securityEvents.map((event) => (
                        <div key={event.id} className="admin-event-item">
                          <div>
                            <div className="admin-event-title">
                              <span className={`admin-pill ${event.severity}`}>{event.severity}</span>
                              <span>{event.event_type.replace("_", " ")}</span>
                            </div>
                            <div className="admin-event-meta">
                              {event.user?.username ? `@${event.user.username}` : "System"} ·{" "}
                              {formatShortDate(event.created_at)}
                            </div>
                            <div className="admin-event-notes">{event.notes}</div>
                          </div>
                          <div className="admin-event-details">
                            {event.ip_address && <span>{event.ip_address}</span>}
                            {event.user_agent && <span>{event.user_agent}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-panel admin-form">
                  <div className="admin-panel-header">
                    <h3>Ban IP range</h3>
                    <span>Block abusive sources</span>
                  </div>
                  <form onSubmit={handleBanSubmit} className="admin-form-grid">
                    <div>
                      <label className="form-label">IP / CIDR</label>
                      <input
                        className="form-input"
                        value={banForm.ip_range}
                        onChange={(event) => setBanForm((prev) => ({ ...prev, ip_range: event.target.value }))}
                        placeholder="203.0.113.0/24"
                      />
                    </div>
                    <div>
                      <label className="form-label">Reason</label>
                      <input
                        className="form-input"
                        value={banForm.reason}
                        onChange={(event) => setBanForm((prev) => ({ ...prev, reason: event.target.value }))}
                        placeholder="Spam activity"
                      />
                    </div>
                    <div className="admin-form-actions">
                      <button className="btn btn-primary btn-sm" type="submit">Add ban</button>
                    </div>
                  </form>
                  <div className="admin-list">
                    {bannedIps.map((ban) => (
                      <div key={ban.id} className="admin-list-row">
                        <div>
                          <div className="admin-list-title">{ban.ip_range}</div>
                          {ban.reason && <div className="admin-list-meta">{ban.reason}</div>}
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleBan(ban)}
                        >
                          {ban.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-panel admin-form">
                  <div className="admin-panel-header">
                    <h3>Rate limit rules</h3>
                    <span>Define per-scope limits</span>
                  </div>
                  <form onSubmit={handleRateLimitSubmit} className="admin-form-grid">
                    <div>
                      <label className="form-label">Scope</label>
                      <input
                        className="form-input"
                        value={rateLimitForm.scope}
                        onChange={(event) =>
                          setRateLimitForm((prev) => ({ ...prev, scope: event.target.value }))
                        }
                        placeholder="comments:create"
                      />
                    </div>
                    <div>
                      <label className="form-label">Max requests</label>
                      <input
                        className="form-input"
                        type="number"
                        min="1"
                        value={rateLimitForm.max_requests}
                        onChange={(event) =>
                          setRateLimitForm((prev) => ({ ...prev, max_requests: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="form-label">Window (seconds)</label>
                      <input
                        className="form-input"
                        type="number"
                        min="10"
                        value={rateLimitForm.window_seconds}
                        onChange={(event) =>
                          setRateLimitForm((prev) => ({ ...prev, window_seconds: event.target.value }))
                        }
                      />
                    </div>
                    <div className="admin-form-actions">
                      <button className="btn btn-primary btn-sm" type="submit">Save rule</button>
                    </div>
                  </form>
                  <div className="admin-list">
                    {rateLimits.map((rule) => (
                      <div key={rule.id} className="admin-list-row">
                        <div>
                          <div className="admin-list-title">{rule.scope}</div>
                          <div className="admin-list-meta">
                            {rule.max_requests} requests / {rule.window_seconds}s
                          </div>
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleRateLimit(rule)}
                        >
                          {rule.active ? "Disable" : "Enable"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedUser && (
        <div className="admin-drawer" role="dialog" aria-modal="true">
          <div className="admin-drawer-backdrop" onClick={() => setSelectedUser(null)} />
          <div className="admin-drawer-panel">
            <div className="admin-drawer-header">
              <div>
                <h3>{selectedUser.full_name || selectedUser.username}</h3>
                <p>@{selectedUser.username}</p>
              </div>
              <button className="icon-btn" onClick={() => setSelectedUser(null)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {userHistoryLoading ? (
              <LoadingPage variant="list" count={4} />
            ) : (
              <div className="admin-drawer-body">
                <div className="admin-drawer-section">
                  <h4>Recent posts</h4>
                  {(userHistory?.posts || []).map((post) => (
                    <Link key={post.id} to={`/p/${post.slug}`} className="admin-link">
                      {post.title}
                    </Link>
                  ))}
                </div>
                <div className="admin-drawer-section">
                  <h4>Recent comments</h4>
                  {(userHistory?.comments || []).map((comment) => (
                    <Link key={comment.id} to={`/p/${comment.post?.slug}`} className="admin-comment">
                      {comment.content}
                    </Link>
                  ))}
                </div>
                <div className="admin-drawer-section">
                  <h4>Recent reads</h4>
                  {(userHistory?.reading || []).map((entry) => (
                    <Link key={entry.id} to={`/p/${entry.post?.slug}`} className="admin-link">
                      {entry.post?.title} · {Math.round(entry.progress || 0)}%
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
