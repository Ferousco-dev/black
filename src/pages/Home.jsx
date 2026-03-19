import { useState, useEffect } from "react";
import { getPosts, getResumeReading } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import PostCard from "../components/posts/PostCard";
import LoadingPage from "../components/ui/LoadingPage";
import { buildCacheKey, getCache, setCache } from "../lib/cache";
import "./Home.css";

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [resumeItems, setResumeItems] = useState([]);

  useEffect(() => {
    loadPosts(1, true);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadResume();
  }, [user]);

  const loadPosts = async (p, reset = false) => {
    if (reset && p === 1) {
      const cached = getCache(buildCacheKey("home", "posts", "page", p));
      if (cached) {
        setPosts(cached.posts || []);
        setHasMore(!!cached.hasMore);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    const { data } = await getPosts({ page: p, limit: 15 });
    if (reset) setPosts(data || []);
    else setPosts((prev) => [...prev, ...(data || [])]);
    setHasMore((data || []).length === 15);
    if (reset && p === 1) {
      setCache(buildCacheKey("home", "posts", "page", p), {
        posts: data || [],
        hasMore: (data || []).length === 15,
      });
    }
    setLoading(false);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPosts(next);
  };

  const loadResume = async () => {
    const cached = getCache(buildCacheKey("home", "resume", user.id));
    if (cached) {
      setResumeItems(cached);
      return;
    }
    const { data } = await getResumeReading(user.id, 5);
    const next = (data || []).map((item) => ({
      ...item,
      post: item.post,
      progress: item.progress || 0,
    }));
    setResumeItems(next);
    setCache(buildCacheKey("home", "resume", user.id), next);
  };

  return (
    <div className="home-page">
      <div className="container">
        <div className="home-layout">
          <main className="home-main">
            <div className="home-header">
              <h1 className="home-title">Latest Posts</h1>
              <p className="home-subtitle">Thoughtful writing from people worth following.</p>
            </div>

            {user && resumeItems.length > 0 && (
              <section className="resume-shelf">
                <div className="resume-header">
                  <h2>Resume reading</h2>
                  <span>Most recent</span>
                </div>
                <a href={`/p/${resumeItems[0]?.post?.slug}`} className="resume-card resume-card-single">
                  <div className="resume-card-title">{resumeItems[0]?.post?.title}</div>
                  <div className="resume-card-meta">
                    <span>@{resumeItems[0]?.post?.author_username}</span>
                    <span>·</span>
                    <span>{resumeItems[0]?.progress}% read</span>
                  </div>
                  <div className="resume-progress">
                    <span style={{ width: `${resumeItems[0]?.progress}%` }} />
                  </div>
                </a>
              </section>
            )}

            {loading && posts.length === 0 ? (
              <LoadingPage variant="feed" />
            ) : posts.length === 0 ? (
              <div className="empty-state">
                <h3>No posts yet</h3>
                <p>Be the first to publish something.</p>
              </div>
            ) : (
              <>
                <div className="posts-list">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
                {hasMore && (
                  <div className="load-more">
                    <button
                      className="btn btn-secondary"
                      onClick={loadMore}
                      disabled={loading}
                    >
                      {loading ? (
                        <span
                          className="spinner"
                          style={{ width: 16, height: 16 }}
                        />
                      ) : (
                        "Load more"
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </main>

          <aside className="home-sidebar">
            <div className="sidebar-section">
              <h3 className="sidebar-title">About Chronicles</h3>
              <p className="sidebar-text">
                A platform for serious writers and thoughtful readers. Publish
                your ideas, build your audience.
              </p>
            </div>
            <div className="sidebar-divider" />
            <div className="sidebar-section">
              <h3 className="sidebar-title">Get started</h3>
              <div className="sidebar-actions">
                <a
                  href="/signup"
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  Start writing
                </a>
                <a
                  href="/signin"
                  className="btn btn-secondary"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginTop: 8,
                  }}
                >
                  Sign in
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
