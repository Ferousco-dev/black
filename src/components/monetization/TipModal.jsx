import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import './TipModal.css';

const PRESET_AMOUNTS = [3, 5, 10, 25];

export default function TipModal({ recipient, postId, onClose }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(5);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const finalAmount = custom ? parseFloat(custom) : amount;

  const handleTip = async () => {
    if (!user) { toast.error('Sign in to send a tip'); return; }
    if (!finalAmount || finalAmount < 1) { toast.error('Minimum tip is $1'); return; }
    setLoading(true);
    // In production: create Stripe PaymentIntent via Edge Function, then confirm
    // For now, record the intent in DB (Stripe webhook will confirm)
    const { error } = await supabase.from('tips').insert({
      sender_id: user.id,
      recipient_id: recipient.id,
      post_id: postId || null,
      amount_cents: Math.round(finalAmount * 100),
      message: message.trim() || null,
      status: 'pending', // Stripe would confirm this
    });
    if (error) toast.error('Could not send tip. Try again.');
    else { toast.success(`Tip of $${finalAmount} sent! ☕`); onClose(); }
    setLoading(false);
  };

  return (
    <div className="tip-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tip-modal">
        <button className="tip-close" onClick={onClose}>×</button>
        <div className="tip-header">
          <img src={recipient.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${recipient.username}`} className="tip-recipient-avatar" alt=""/>
          <div>
            <h3 className="tip-title">Support {recipient.full_name || recipient.username}</h3>
            <p className="tip-subtitle">Send a one-time tip to show your appreciation</p>
          </div>
        </div>
        <div className="tip-amounts">
          {PRESET_AMOUNTS.map(a => (
            <button key={a} className={`tip-amount-btn ${amount===a && !custom ? 'active' : ''}`} onClick={() => { setAmount(a); setCustom(''); }}>
              ${a}
            </button>
          ))}
        </div>
        <div className="tip-custom-row">
          <span className="tip-custom-prefix">$</span>
          <input className="tip-custom-input" type="number" placeholder="Custom amount" min="1" value={custom} onChange={e => { setCustom(e.target.value); setAmount(0); }}/>
        </div>
        <textarea className="tip-message-input" placeholder="Leave a message (optional)" rows={2} value={message} onChange={e => setMessage(e.target.value)}/>
        <button className="btn btn-primary tip-submit" onClick={handleTip} disabled={loading || !finalAmount || finalAmount < 1}>
          {loading ? 'Processing…' : `Send $${finalAmount || '—'} tip`}
        </button>
        <p className="tip-note">Payments are powered by Stripe. Your tip goes directly to the writer.</p>
      </div>
    </div>
  );
}
