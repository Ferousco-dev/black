import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import './Monetization.css';

function fmtMoney(cents) { return '$' + ((cents||0)/100).toFixed(2); }
function fmt(n) { return (n||0).toLocaleString(); }

export default function Monetization() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [paidSubs, setPaidSubs] = useState([]);
  const [tips, setTips] = useState([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('overview');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [annualPrice, setAnnualPrice] = useState('');
  const [foundingPrice, setFoundingPrice] = useState('');
  const [paidEnabled, setPaidEnabled] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);
    setMonthlyPrice(p?.monthly_price_usd || '');
    setAnnualPrice(p?.annual_price_usd || '');
    setFoundingPrice(p?.founding_price_usd || '');
    setPaidEnabled(p?.paid_tier_enabled || false);

    const [subsRes, tipsRes] = await Promise.all([
      supabase.from('paid_subscriptions').select('*, subscriber:profiles!subscriber_id(username,full_name,avatar_url)').eq('publisher_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tips').select('*, sender:profiles!sender_id(username,full_name,avatar_url)').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);
    setPaidSubs(subsRes.data || []);
    setTips(tipsRes.data || []);
  }

  const handleSavePricing = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      paid_tier_enabled: paidEnabled,
      monthly_price_usd: parseFloat(monthlyPrice) || null,
      annual_price_usd: parseFloat(annualPrice) || null,
      founding_price_usd: parseFloat(foundingPrice) || null,
    }).eq('id', user.id);
    if (error) toast.error('Save failed');
    else toast.success('Pricing updated!');
    setSaving(false);
  };

  const mrr = paidSubs.filter(s => s.status === 'active').reduce((sum, s) => {
    if (s.tier === 'annual') return sum + s.amount_cents / 12;
    return sum + s.amount_cents;
  }, 0);
  const totalTips = tips.reduce((s, t) => s + (t.amount_cents || 0), 0);
  const activePaid = paidSubs.filter(s => s.status === 'active').length;

  return (
    <div className="monetization-page">
      <div className="mono-header">
        <div>
          <h1 className="mono-title">Monetization</h1>
          <p className="mono-subtitle">Manage your revenue, pricing, and paid subscribers</p>
        </div>
      </div>

      <div className="mono-kpis">
        <div className="mono-kpi mono-kpi-main">
          <span className="mono-kpi-label">Monthly Recurring Revenue</span>
          <span className="mono-kpi-value">{fmtMoney(mrr)}</span>
        </div>
        <div className="mono-kpi">
          <span className="mono-kpi-label">Paid Subscribers</span>
          <span className="mono-kpi-value">{fmt(activePaid)}</span>
        </div>
        <div className="mono-kpi">
          <span className="mono-kpi-label">Total Tips</span>
          <span className="mono-kpi-value">{fmtMoney(totalTips)}</span>
        </div>
        <div className="mono-kpi">
          <span className="mono-kpi-label">ARR (est.)</span>
          <span className="mono-kpi-value">{fmtMoney(mrr * 12)}</span>
        </div>
      </div>

      <div className="mono-tabs">
        {['overview','pricing','subscribers','tips'].map(t => (
          <button key={t} className={`mono-tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'pricing' && (
        <div className="mono-card">
          <h3 className="mono-card-title">Subscription Pricing</h3>
          <div className="pricing-toggle-row">
            <span className="pricing-toggle-label">Enable paid subscriptions</span>
            <button className={`toggle-btn ${paidEnabled?'on':''}`} onClick={()=>setPaidEnabled(v=>!v)}>
              <span className="toggle-knob"/>
            </button>
          </div>
          {paidEnabled && (
            <div className="pricing-fields">
              <div className="pricing-field">
                <label>Monthly price (USD)</label>
                <div className="price-input-wrap"><span className="price-prefix">$</span>
                  <input className="form-input price-input" type="number" min="1" placeholder="5.00" value={monthlyPrice} onChange={e=>setMonthlyPrice(e.target.value)}/>
                </div>
              </div>
              <div className="pricing-field">
                <label>Annual price (USD)</label>
                <div className="price-input-wrap"><span className="price-prefix">$</span>
                  <input className="form-input price-input" type="number" min="1" placeholder="50.00" value={annualPrice} onChange={e=>setAnnualPrice(e.target.value)}/>
                </div>
                <p className="pricing-hint">Recommend ~2 months free vs monthly</p>
              </div>
              <div className="pricing-field">
                <label>Founding member price (USD)</label>
                <div className="price-input-wrap"><span className="price-prefix">$</span>
                  <input className="form-input price-input" type="number" min="1" placeholder="200.00" value={foundingPrice} onChange={e=>setFoundingPrice(e.target.value)}/>
                </div>
                <p className="pricing-hint">One-time founding member tier — lifetime access</p>
              </div>
            </div>
          )}
          <div className="pricing-note">
            <strong>Note:</strong> Payments are processed via Stripe Connect. Connect your Stripe account in Settings → Payments to activate billing.
          </div>
          <button className="btn btn-primary" onClick={handleSavePricing} disabled={saving}>
            {saving ? 'Saving…' : 'Save pricing'}
          </button>
        </div>
      )}

      {tab === 'subscribers' && (
        <div className="mono-card">
          <h3 className="mono-card-title">Paid Subscribers ({activePaid})</h3>
          <table className="subs-table">
            <thead><tr><th>Subscriber</th><th>Tier</th><th>Amount</th><th>Status</th><th>Since</th></tr></thead>
            <tbody>
              {paidSubs.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="sub-user">
                      {s.subscriber?.avatar_url && <img src={s.subscriber.avatar_url} className="sub-avatar" alt=""/>}
                      <span>{s.subscriber?.full_name || s.subscriber?.username || 'Anonymous'}</span>
                    </div>
                  </td>
                  <td><span className={`tier-badge tier-${s.tier}`}>{s.tier}</span></td>
                  <td>{fmtMoney(s.amount_cents)}/{s.tier === 'annual' ? 'yr' : s.tier === 'founding' ? 'life' : 'mo'}</td>
                  <td><span className={`status-badge status-${s.status}`}>{s.status}</span></td>
                  <td>{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {paidSubs.length === 0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--text-muted)',padding:'32px'}}>No paid subscribers yet. Enable pricing to start.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tips' && (
        <div className="mono-card">
          <h3 className="mono-card-title">Tips Received</h3>
          <div className="tips-list">
            {tips.map(t => (
              <div key={t.id} className="tip-row">
                <div className="tip-sender">
                  {t.sender?.avatar_url && <img src={t.sender.avatar_url} className="sub-avatar" alt=""/>}
                  <span>{t.sender?.full_name || t.sender?.username || 'Anonymous'}</span>
                </div>
                <div className="tip-amount">{fmtMoney(t.amount_cents)}</div>
                {t.message && <div className="tip-message">"{t.message}"</div>}
                <div className="tip-date">{new Date(t.created_at).toLocaleDateString()}</div>
              </div>
            ))}
            {tips.length === 0 && <div style={{textAlign:'center',color:'var(--text-muted)',padding:'32px',fontSize:'0.875rem'}}>No tips yet. Tips appear here once readers send them.</div>}
          </div>
        </div>
      )}

      {tab === 'overview' && (
        <div className="mono-card">
          <h3 className="mono-card-title">Revenue Overview</h3>
          <div className="revenue-breakdown">
            <div className="rev-row"><span>Paid subscriptions (MRR)</span><strong>{fmtMoney(mrr)}</strong></div>
            <div className="rev-row"><span>Tips (all time)</span><strong>{fmtMoney(totalTips)}</strong></div>
            <div className="rev-row rev-total"><span>Est. ARR</span><strong>{fmtMoney(mrr * 12)}</strong></div>
          </div>
          <div className="pricing-note" style={{marginTop:20}}>
            Connect Stripe to enable real payouts. Go to <strong>Settings → Payments</strong> to set up Stripe Connect.
          </div>
        </div>
      )}
    </div>
  );
}
