import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import './Reactions.css';

const EMOJIS = ['❤️','🔥','💡','🎉','😢','😮'];

export default function Reactions({ postId }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({});
  const [myReactions, setMyReactions] = useState(new Set());

  useEffect(() => { load(); }, [postId]);

  async function load() {
    const { data } = await supabase.from('post_reactions').select('emoji, user_id').eq('post_id', postId);
    const c = {};
    data?.forEach(r => { c[r.emoji] = (c[r.emoji] || 0) + 1; });
    setCounts(c);
    if (user) setMyReactions(new Set(data?.filter(r => r.user_id === user.id).map(r => r.emoji)));
  }

  async function toggle(emoji) {
    if (!user) { toast.error('Sign in to react'); return; }
    if (myReactions.has(emoji)) {
      await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', user.id).eq('emoji', emoji);
      setCounts(c => ({ ...c, [emoji]: Math.max(0, (c[emoji]||0)-1) }));
      setMyReactions(s => { const n = new Set(s); n.delete(emoji); return n; });
    } else {
      const { error } = await supabase.from('post_reactions').insert({ post_id: postId, user_id: user.id, emoji });
      if (!error) {
        setCounts(c => ({ ...c, [emoji]: (c[emoji]||0)+1 }));
        setMyReactions(s => new Set([...s, emoji]));
      }
    }
  }

  return (
    <div className="reactions-bar">
      {EMOJIS.map(emoji => (
        <button key={emoji} className={`reaction-btn ${myReactions.has(emoji) ? 'active' : ''}`} onClick={() => toggle(emoji)}>
          <span className="reaction-emoji">{emoji}</span>
          {counts[emoji] > 0 && <span className="reaction-count">{counts[emoji]}</span>}
        </button>
      ))}
    </div>
  );
}
