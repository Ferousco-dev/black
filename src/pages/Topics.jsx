import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTopics } from '../lib/api';
import './Topics.css';

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await getTopics(40);
    setTopics(data || []);
    setLoading(false);
  };

  return (
    <div className="topics-page">
      <div className="container">
        <div className="topics-header">
          <h1>Topics</h1>
          <p>Explore writing by theme, find new voices, and dive deeper.</p>
        </div>

        {loading ? (
          <div className="loading-page">
            <span className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : topics.length === 0 ? (
          <div className="empty-state">
            <h3>No topics yet</h3>
            <p>Topics will appear as posts are tagged.</p>
          </div>
        ) : (
          <div className="topics-grid">
            {topics.map((topic) => (
              <Link key={topic.id} to={`/topics/${topic.slug}`} className="topic-card">
                <div className="topic-card-top">
                  <div className="topic-pill" style={{ borderColor: topic.color || 'var(--accent)' }}>
                    {topic.name}
                  </div>
                  <div className="topic-count">{topic.post_count || 0} posts</div>
                </div>
                <p className="topic-desc">{topic.description || 'Discover new writing in this space.'}</p>
                <div className="topic-cta">Explore</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
