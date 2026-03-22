import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getResumeReading } from "../lib/api";
import LoadingPage from "../components/ui/LoadingPage";
import "./ResumeReading.css";

export default function ResumeReading() {
  const { user } = useAuth();
  const [resumeItems, setResumeItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await getResumeReading(user.id, 20);
      const next = (data || []).map((item) => ({
        ...item,
        post: item.post,
        progress: item.progress || 0,
      }));
      setResumeItems(next);
      setLoading(false);
    };
    load();
  }, [user]);

  if (!user) return null;

  return (
    <div className="resume-reading-page">
      <div className="container">
        <div className="resume-reading-header">
          <h1>Resume reading</h1>
          <p>Pick up where you left off.</p>
        </div>

        {loading ? (
          <LoadingPage variant="list" count={6} />
        ) : resumeItems.length === 0 ? (
          <div className="empty-state">
            <h3>No recent reads</h3>
            <p>Start reading and your progress will show up here.</p>
          </div>
        ) : (
          <div className="resume-reading-grid">
            {resumeItems.map((item) => (
              <Link
                key={item.post?.id}
                to={`/p/${item.post?.slug}`}
                className="resume-card"
              >
                <div className="resume-card-title">{item.post?.title}</div>
                <div className="resume-card-meta">
                  <span>@{item.post?.author_username}</span>
                  <span>·</span>
                  <span>{item.progress}% read</span>
                </div>
                <div className="resume-progress">
                  <span style={{ width: `${item.progress}%` }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
