import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getProfileByUsername,
  getUserPublishedPosts,
  checkFollowing,
  followUser,
  unfollowUser,
  checkSubscribed,
  subscribeToUser,
  unsubscribeFromUser,
  getFollowers,
  getPublishedQuestions,
  submitQuestion,
} from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import PostCard from "../components/posts/PostCard";
import ProfileStatsCard from "../components/share/ProfileStatsCard";
import toast from "react-hot-toast";
import LoadingPage from "../components/ui/LoadingPage";
import "./Profile.css";

export default function Profile() {
  const { atUsername } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState("posts"); // posts | about | qa
  const [questions, setQuestions] = useState([]);
  const [questionText, setQuestionText] = useState("");
  const [questionAnonymous, setQuestionAnonymous] = useState(false);
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsStatus, setStatsStatus] = useState({ state: "idle", message: "" });
  const statsExportRef = useRef(null);

  const isOwnProfile = user?.id === profile?.id;

  useEffect(() => {
    if (atUsername?.startsWith("@")) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [atUsername]);

  useEffect(() => {
    if (profile && user && !isOwnProfile) {
      checkFollowing(user.id, profile.id).then(({ following }) =>
        setFollowing(following)
      );
      checkSubscribed(user.id, profile.id).then(({ subscribed }) =>
        setSubscribed(subscribed)
      );
    }
  }, [profile, user]);

  const loadProfile = async () => {
    const clean = atUsername.startsWith("@") ? atUsername.slice(1) : atUsername;
    const { data: prof, error } = await getProfileByUsername(clean);
    if (error || !prof) {
      setLoading(false);
      return;
    }
    setProfile(prof);

    // Load posts, followers, and questions in parallel
    const [postsRes, followersRes, questionsRes] = await Promise.all([
      getUserPublishedPosts(prof.id),
      getFollowers(prof.id),
      getPublishedQuestions(prof.id),
    ]);

    setPosts(postsRes.data || []);
    setFollowers(followersRes.data || []);
    setQuestions(questionsRes.data || []);
    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error("Sign in to follow");
      return;
    }
    if (following) {
      setFollowing(false);
      setFollowers((f) => f.filter((u) => u.id !== user.id));
      await unfollowUser(user.id, profile.id);
    } else {
      setFollowing(true);
      await followUser(user.id, profile.id);
      await loadProfile();
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Sign in to subscribe");
      return;
    }
    if (subscribed) {
      setSubscribed(false);
      await unsubscribeFromUser(user.id, profile.id);
      toast.success("Unsubscribed");
    } else {
      setSubscribed(true);
      await subscribeToUser(user.id, profile.id);
      toast.success(
        `Subscribed to ${
          profile.publication_name || profile.full_name || profile.username
        }`
      );
    }
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in to ask a question");
      return;
    }
    if (!questionText.trim()) {
      toast.error("Write a question first");
      return;
    }
    setQuestionSubmitting(true);
    const { error } = await submitQuestion({
      publisherId: profile.id,
      askerId: user.id,
      questionText: questionText.trim(),
      isAnonymous: questionAnonymous,
    });
    setQuestionSubmitting(false);
    if (error) {
      toast.error("Could not submit question");
      return;
    }
    setQuestionText("");
    setQuestionAnonymous(false);
    toast.success("Question submitted for review");
  };

  const handleOpenStats = () => {
    setStatsStatus({ state: "idle", message: "" });
    setStatsOpen(true);
  };

  const renderStatsImage = async () => {
    if (!statsExportRef.current) return null;
    setStatsStatus({ state: "loading", message: "Generating stats card…" });
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(statsExportRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      return canvas;
    } catch (err) {
      setStatsStatus({ state: "error", message: "Failed to generate image." });
      return null;
    }
  };

  const handleDownloadStats = async () => {
    const canvas = await renderStatsImage();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${profile.username}-stats.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setStatsStatus({ state: "success", message: "PNG downloaded." });
  };

  const handleCopyStatsImage = async () => {
    if (!navigator.clipboard || !window.ClipboardItem) {
      setStatsStatus({ state: "error", message: "Clipboard image not supported." });
      toast.error("Clipboard image not supported");
      return;
    }
    const canvas = await renderStatsImage();
    if (!canvas) return;
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) {
        setStatsStatus({ state: "error", message: "Unable to copy image." });
        return;
      }
      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
      setStatsStatus({ state: "success", message: "Image copied to clipboard." });
    } catch (err) {
      setStatsStatus({ state: "error", message: "Unable to copy image." });
    }
  };

  const handleCopyProfileLink = async () => {
    if (!navigator.clipboard) {
      setStatsStatus({ state: "error", message: "Clipboard access not available." });
      toast.error("Clipboard access not available");
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatsStatus({ state: "success", message: "Profile link copied." });
    } catch (err) {
      setStatsStatus({ state: "error", message: "Unable to copy link." });
    }
  };

  const handleWebShareStats = async () => {
    if (!navigator.share) {
      toast.error("Web Share is not supported on this device.");
      return;
    }
    try {
      setStatsStatus({ state: "loading", message: "Opening share sheet…" });
      await navigator.share({
        title: `${profile.username} on Chronicles`,
        text: `Check out @${profile.username} on Chronicles.`,
        url: window.location.href,
      });
      setStatsStatus({ state: "success", message: "Share sheet opened." });
    } catch (err) {
      if (err?.name !== "AbortError") {
        setStatsStatus({ state: "error", message: "Unable to share profile." });
      } else {
        setStatsStatus({ state: "idle", message: "" });
      }
    }
  };

  if (loading)
    return <LoadingPage variant="detail" />;
  if (!profile)
    return (
      <div
        className="container"
        style={{ padding: "8rem 0", textAlign: "center" }}
      >
        <h1 style={{ fontFamily: "var(--font-serif)", marginBottom: "1rem" }}>
          User not found
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          The profile you are looking for does not exist.
        </p>
        <a href="/" className="btn btn-primary" style={{ marginTop: "2rem" }}>
          Go Home
        </a>
      </div>
    );

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile.username[0].toUpperCase();

  const accentColor = profile.accent_color || "var(--navy)";
  const socialLinks = profile.social_links || {};

  return (
    <div className="profile-twitter">
      {/* Header with Cover + Avatar */}
      <div className="profile-header-twitter">
        <div className="profile-cover-twitter">
          {profile.cover_image_url && (
            <img src={profile.cover_image_url} alt="Cover" />
          )}
        </div>

        <div className="profile-header-info-twitter">
          <div className="profile-avatar-twitter">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="avatar-twitter"
              />
            ) : (
              <div className="avatar-placeholder avatar-twitter">
                {initials}
              </div>
            )}
          </div>

          <div className="profile-header-top-twitter">
            <div className="profile-info-twitter">
              <h1 className="profile-name-twitter">
                {profile.publication_name ||
                  profile.full_name ||
                  profile.username}
              </h1>
              <p className="profile-handle-twitter">@{profile.username}</p>
            </div>

            {user && !isOwnProfile ? (
              <div className="header-actions">
                <button
                  className={`btn-twitter ${
                    following ? "btn-twitter-outlined" : "btn-twitter-solid"
                  }`}
                  onClick={handleFollow}
                >
                  {following ? "Following" : "Follow"}
                </button>
                <button className="btn-twitter btn-twitter-outlined" onClick={handleOpenStats}>
                  Share stats
                </button>
              </div>
            ) : isOwnProfile ? (
              <div className="header-actions">
                <a href="/settings" className="btn-twitter btn-twitter-outlined">
                  Edit Profile
                </a>
                <button className="btn-twitter btn-twitter-outlined" onClick={handleOpenStats}>
                  Share stats
                </button>
              </div>
            ) : (
              <a href="/signup" className="btn-twitter btn-twitter-solid">
                Follow
              </a>
            )}
          </div>

          {profile.bio && <p className="profile-bio-twitter">{profile.bio}</p>}

          <div className="profile-stats-twitter">
            {Object.keys(socialLinks).length > 0 && (
              <div className="social-twitter">
                {socialLinks.website && (
                  <a
                    href={socialLinks.website}
                    target="_blank"
                    rel="noreferrer"
                    className="social-twitter-link"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20M12 2a15.3 15.3 0 0110 4m0 8a15.3 15.3 0 01-10 4M12 2a15.3 15.3 0 00-10 4m0 8a15.3 15.3 0 0110 4" />
                    </svg>
                    {socialLinks.website}
                  </a>
                )}
                {socialLinks.twitter && (
                  <a
                    href={`https://twitter.com/${socialLinks.twitter}`}
                    target="_blank"
                    rel="noreferrer"
                    className="social-twitter-link"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 10 0 10-5.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
            <div className="stats-group-twitter">
              <div className="stat-twitter">
                <span className="stat-count">{followers.length}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="stat-twitter">
                <span className="stat-count">{posts.length}</span>
                <span className="stat-label">Posts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container-wide">
        <nav className="tabs-twitter">
          <button
            className={`tab-twitter ${activeTab === "posts" ? "active" : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            Posts
          </button>
          <button
            className={`tab-twitter ${activeTab === "qa" ? "active" : ""}`}
            onClick={() => setActiveTab("qa")}
          >
            Q&A
          </button>
          <button
            className={`tab-twitter ${activeTab === "about" ? "active" : ""}`}
            onClick={() => setActiveTab("about")}
          >
            About
          </button>
        </nav>

        {/* Content */}
        <div className="feed-twitter">
          {activeTab === "posts" && (
            <div>
              {posts.length === 0 ? (
                <div className="empty-twitter">
                  <p>No posts yet</p>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} showAuthor={false} />
                ))
              )}
            </div>
          )}

          {activeTab === "qa" && (
            <div>
              <form className="qa-form" onSubmit={handleSubmitQuestion}>
                <textarea
                  className="qa-input"
                  placeholder={`Ask ${profile.publication_name || profile.full_name || profile.username} a question…`}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={3}
                />
                <div className="qa-form-actions">
                  <label className="qa-checkbox">
                    <input
                      type="checkbox"
                      checked={questionAnonymous}
                      onChange={(e) => setQuestionAnonymous(e.target.checked)}
                    />
                    Ask anonymously
                  </label>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={questionSubmitting}>
                    {questionSubmitting ? "Submitting…" : "Submit question"}
                  </button>
                </div>
                <p className="qa-hint">Questions are reviewed before they appear publicly.</p>
              </form>

              {questions.length === 0 ? (
                <div className="empty-twitter">
                  <p>No Q&A yet</p>
                </div>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="qa-card-twitter">
                    <p className="qa-q-twitter">{q.question_text}</p>
                    <div
                      className="qa-a-twitter prose"
                      dangerouslySetInnerHTML={{ __html: q.answer_text }}
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "about" && (
            <div className="about-twitter">
              {profile.bio && <p>{profile.bio}</p>}
              <p className="about-date">
                Joined{" "}
                {new Date(profile.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {statsOpen && (
        <div className="profile-share-modal" role="dialog" aria-modal="true">
          <div className="profile-share-backdrop" onClick={() => setStatsOpen(false)} />
          <div className="profile-share-panel">
            <div className="profile-share-header-row">
              <div>
                <h3>Share your stats</h3>
                <p>Create a shareable card with your latest profile metrics.</p>
              </div>
              <button className="icon-btn share-close" onClick={() => setStatsOpen(false)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="profile-share-body">
              <div className="profile-share-preview">
                <div className="profile-share-frame">
                  <ProfileStatsCard
                    name={profile.publication_name || profile.full_name}
                    username={profile.username}
                    avatarUrl={profile.avatar_url}
                    followers={followers.length}
                    posts={posts.length}
                  />
                </div>
              </div>

              <div className="profile-share-actions">
                <div className="profile-share-link-row">
                  <input className="form-input" value={window.location.href} readOnly />
                  <button className="btn btn-secondary btn-sm" onClick={handleCopyProfileLink}>Copy link</button>
                </div>
                <div className="profile-share-button-row">
                  <button className="btn btn-primary btn-sm" onClick={handleDownloadStats} disabled={statsStatus.state === "loading"}>
                    Download PNG
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleCopyStatsImage} disabled={statsStatus.state === "loading"}>
                    Copy image
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={handleWebShareStats} disabled={statsStatus.state === "loading"}>
                    Share…
                  </button>
                </div>
                {statsStatus.state !== "idle" && (
                  <div className={`profile-share-status ${statsStatus.state}`}>{statsStatus.message}</div>
                )}
              </div>
            </div>
          </div>

          <div className="profile-share-export" aria-hidden="true">
            <ProfileStatsCard
              ref={statsExportRef}
              name={profile.publication_name || profile.full_name}
              username={profile.username}
              avatarUrl={profile.avatar_url}
              followers={followers.length}
              posts={posts.length}
            />
          </div>
        </div>
      )}
    </div>
  );
}
