import { useState, useEffect } from "react";
import { getPosts } from "../lib/api";
import PostCard from "../components/posts/PostCard";
import "./Home.css";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadPosts(1, true);
  }, []);

  const loadPosts = async (p, reset = false) => {
    setLoading(true);
    const { data } = await getPosts({ page: p, limit: 15 });
    if (reset) setPosts(data || []);
    else setPosts((prev) => [...prev, ...(data || [])]);
    setHasMore((data || []).length === 15);
    setLoading(false);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPosts(next);
  };

  return (
    <div className="home-page">
      <div className="container">
        <div className="home-layout">
          <main className="home-main">
            <div className="home-header">
              <h1 className="home-title">Latest Posts</h1>
            </div>

            {loading && posts.length === 0 ? (
              <div className="loading-page">
                <span className="spinner" style={{ width: 32, height: 32 }} />
              </div>
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
