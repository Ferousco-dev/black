import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getForYouFeed } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import PostCard from "../components/posts/PostCard";
import LoadingPage from "../components/ui/LoadingPage";
import "./ForYou.css";

export default function ForYou() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    load(1, true);
  }, [user]);

  const load = async (p, reset = false) => {
    setLoading(true);
    const { data } = await getForYouFeed(user.id, p, 12);
    if (reset) setPosts(data || []);
    else setPosts((prev) => [...prev, ...(data || [])]);
    setHasMore((data || []).length === 12);
    setLoading(false);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next);
  };

  if (!user) {
    return (
      <div className="for-you-page">
        <div className="container">
          <div className="for-you-cta card">
            <h1>For You</h1>
            <p>Sign in to get a personalized feed based on what you read and highlight.</p>
            <div className="for-you-cta-actions">
              <Link to="/signin" className="btn btn-secondary">Sign in</Link>
              <Link to="/signup" className="btn btn-primary">Get started</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="for-you-page">
      <div className="container">
        <div className="for-you-header">
          <h1>For You</h1>
          <p>Personalized picks based on your reading habits, highlights, and follows.</p>
        </div>

        {loading && posts.length === 0 ? (
          <LoadingPage variant="feed" />
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <h3>No recommendations yet</h3>
            <p>Read and highlight posts to train your feed.</p>
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
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                  ) : (
                    "Load more"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
