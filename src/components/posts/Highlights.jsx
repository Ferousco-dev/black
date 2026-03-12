import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import './Highlights.css';

export default function Highlights({ postId }) {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => { load(); }, [postId]);

  async function load() {
    const { data } = await supabase.from('highlights').select('*, user:profiles!user_id(username,avatar_url)').eq('post_id', postId).eq('is_public', true).order('created_at', { ascending: false }).limit(20);
    setHighlights(data || []);
  }

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 10 || text.length > 500) { setShowPopover(false); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectedText(text);
    setPopoverPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 48 });
    setShowPopover(true);
  }, []);

  async function saveHighlight() {
    if (!user) { toast.error('Sign in to save highlights'); return; }
    const { error } = await supabase.from('highlights').insert({ post_id: postId, user_id: user.id, selected_text: selectedText, is_public: true });
    if (error) { if (error.code === '23505') toast.error('Already highlighted'); else toast.error('Could not save'); }
    else { toast.success('Highlight saved!'); load(); }
    setShowPopover(false);
    window.getSelection()?.removeAllRanges();
  }

  return (
    <>
      <div onMouseUp={handleMouseUp}>
        {showPopover && (
          <div className="highlight-popover" style={{ left: popoverPos.x, top: popoverPos.y }}>
            <button className="highlight-pop-btn" onClick={saveHighlight}>✏️ Highlight</button>
            <button className="highlight-pop-close" onClick={() => setShowPopover(false)}>×</button>
          </div>
        )}
      </div>
      {highlights.length > 0 && (
        <div className="highlights-list">
          <h4 className="highlights-title">Reader highlights</h4>
          {highlights.map(h => (
            <div key={h.id} className="highlight-item">
              <span className="highlight-bar"/>
              <div className="highlight-content">
                <p className="highlight-text">"{h.selected_text}"</p>
                <span className="highlight-author">— {h.user?.username || 'reader'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
