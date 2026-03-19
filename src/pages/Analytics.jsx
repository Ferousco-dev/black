import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import LoadingPage from '../components/ui/LoadingPage';
import './Analytics.css';

function fmt(n) { return (n||0).toLocaleString(); }
function fmtMoney(cents) { return '$' + ((cents||0)/100).toFixed(2); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}); }

export default function Analytics() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [subscribers, setSubscribers] = useState({ free: 0, paid: 0 });
  const [mrr, setMrr] = useState(0);
  const [tips, setTips] = useState(0);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => { if (user) load(); }, [user, range]);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - range * 86400000).toISOString();

    const [postsRes, analyticsRes, paidRes, freeRes, tipsRes, mrrRes] = await Promise.all([
      supabase.from('posts_with_stats').select('id,title,slug,view_count,like_count,comment_count,published_at,word_count,reading_time_mins').eq('author_id', user.id).eq('is_published', true).order('published_at', { ascending: false }).limit(20),
      supabase.from('post_analytics').select('*').in('post_id', []).gte('date', since.split('T')[0]).order('date'),
      supabase.from('paid_subscriptions').select('id', { count: 'exact', head: true }).eq('publisher_id', user.id).eq('status', 'active'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('publisher_id', user.id),
      supabase.from('tips').select('amount_cents').eq('recipient_id', user.id).eq('status', 'succeeded').gte('created_at', since),
      supabase.rpc('get_publisher_mrr', { p_publisher_id: user.id }),
    ]);

    setPosts(postsRes.data || []);
    setSubscribers({ free: freeRes.count || 0, paid: paidRes.count || 0 });
    setMrr(mrrRes.data || 0);
    const tipTotal = (tipsRes.data || []).reduce((s, t) => s + t.amount_cents, 0);
    setTips(tipTotal);

    // Load analytics for these posts
    if (postsRes.data?.length) {
      const ids = postsRes.data.map(p => p.id);
      const { data: an } = await supabase.from('post_analytics').select('*').in('post_id', ids).gte('date', since.split('T')[0]).order('date');
      setAnalytics(an || []);
    }

    setLoading(false);
  }

  // Aggregate analytics by date
  const byDate = {};
  analytics.forEach(row => {
    if (!byDate[row.date]) byDate[row.date] = { views: 0, reads: 0, new_subscribers: 0 };
    byDate[row.date].views += row.views;
    byDate[row.date].reads += row.reads;
    byDate[row.date].new_subscribers += row.new_subscribers;
  });
  const chartData = Object.entries(byDate).sort((a,b)=>a[0]>b[0]?1:-1).slice(-14);
  const maxViews = Math.max(...chartData.map(d=>d[1].views), 1);

  const totalViews = posts.reduce((s,p) => s + (p.view_count||0), 0);
  const totalLikes = posts.reduce((s,p) => s + (parseInt(p.like_count)||0), 0);

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">Analytics</h1>
          <p className="analytics-subtitle">Track your growth and revenue</p>
        </div>
        <div className="range-tabs">
          {[7,30,90].map(r => (
            <button key={r} className={`range-tab ${range===r?'active':''}`} onClick={()=>setRange(r)}>{r}d</button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Views</span>
          <span className="kpi-value">{fmt(totalViews)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Free Subscribers</span>
          <span className="kpi-value">{fmt(subscribers.free)}</span>
        </div>
        <div className="kpi-card kpi-paid">
          <span className="kpi-label">Paid Subscribers</span>
          <span className="kpi-value">{fmt(subscribers.paid)}</span>
        </div>
        <div className="kpi-card kpi-revenue">
          <span className="kpi-label">MRR</span>
          <span className="kpi-value">{fmtMoney(mrr)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Tips ({range}d)</span>
          <span className="kpi-value">{fmtMoney(tips)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Likes</span>
          <span className="kpi-value">{fmt(totalLikes)}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-card">
        <h3 className="chart-title">Views — last {Math.min(range,14)} days</h3>
        {chartData.length === 0 ? (
          <div className="chart-empty">No data yet. Views will appear here after your posts receive traffic.</div>
        ) : (
          <div className="bar-chart">
            {chartData.map(([date, vals]) => (
              <div key={date} className="bar-col">
                <div className="bar-wrap">
                  <div className="bar" style={{ height: `${Math.round((vals.views/maxViews)*100)}%` }} title={`${vals.views} views`}/>
                </div>
                <span className="bar-label">{fmtDate(date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Posts table */}
      <div className="posts-table-card">
        <h3 className="chart-title">Post Performance</h3>
        {loading ? <LoadingPage variant="table" count={6} /> : (
          <table className="perf-table">
            <thead>
              <tr>
                <th>Post</th>
                <th>Views</th>
                <th>Likes</th>
                <th>Comments</th>
                <th>Read time</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(p => (
                <tr key={p.id}>
                  <td><Link to={`/p/${p.slug}`} className="post-link">{p.title}</Link></td>
                  <td>{fmt(p.view_count)}</td>
                  <td>{fmt(p.like_count)}</td>
                  <td>{fmt(p.comment_count)}</td>
                  <td>{p.reading_time_mins||1} min</td>
                  <td>{p.published_at ? fmtDate(p.published_at) : '—'}</td>
                </tr>
              ))}
              {posts.length === 0 && <tr><td colSpan={6} style={{textAlign:'center',color:'var(--text-muted)',padding:'24px'}}>No published posts yet</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
