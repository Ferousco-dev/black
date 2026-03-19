import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useParams } from 'react-router-dom';
import LoadingPage from '../components/ui/LoadingPage';
import './Community.css';

export default function Community() {
  const { user } = useAuth();
  const { username } = useParams();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [publisher, setPublisher] = useState(null);
  const bottomRef = useRef();

  useEffect(() => {
    if (username) loadCommunity();
  }, [username]);

  useEffect(() => {
    if (activeRoom) {
      loadMessages(activeRoom.id);
      const channel = supabase.channel(`room:${activeRoom.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${activeRoom.id}` },
          payload => setMessages(m => [...m, payload.new]))
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [activeRoom]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadCommunity() {
    const { data: pub } = await supabase.from('profiles').select('*').eq('username', username).single();
    setPublisher(pub);
    if (pub) {
      const { data } = await supabase.from('chat_rooms').select('*').eq('publisher_id', pub.id).order('created_at');
      setRooms(data || []);
      if (data?.[0]) setActiveRoom(data[0]);
    }
  }

  async function loadMessages(roomId) {
    const { data } = await supabase.from('chat_messages')
      .select('*, author:profiles!author_id(id, username, full_name, avatar_url)')
      .eq('room_id', roomId).order('created_at').limit(100);
    setMessages(data || []);
  }

  async function sendMessage() {
    if (!newMsg.trim() || !user || !activeRoom) return;
    await supabase.from('chat_messages').insert({ room_id: activeRoom.id, author_id: user.id, content: newMsg.trim() });
    setNewMsg('');
  }

  if (!publisher) return <LoadingPage variant="list" count={5} />;

  return (
    <div className="community-page">
      <div className="community-sidebar">
        <div className="community-pub-header">
          <img src={publisher.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${publisher.username}`} className="community-pub-avatar" alt=""/>
          <div>
            <div className="community-pub-name">{publisher.publication_name || publisher.full_name || publisher.username}</div>
            <div className="community-pub-label">Community</div>
          </div>
        </div>
        <div className="room-list">
          {rooms.map(r => (
            <button key={r.id} className={`room-item ${activeRoom?.id === r.id ? 'active' : ''}`} onClick={() => setActiveRoom(r)}>
              <span className="room-hash">#</span>
              <span className="room-name">{r.name}</span>
              {r.is_paid_only && <span className="room-lock">🔒</span>}
            </button>
          ))}
          {rooms.length === 0 && <div className="no-rooms">No rooms yet</div>}
        </div>
      </div>
      <div className="community-main">
        {activeRoom ? (
          <>
            <div className="chat-header">
              <span className="chat-room-name"># {activeRoom.name}</span>
              {activeRoom.description && <span className="chat-room-desc">{activeRoom.description}</span>}
            </div>
            <div className="chat-messages">
              {messages.map((m, i) => {
                const prev = messages[i-1];
                const grouped = prev?.author_id === m.author_id && (new Date(m.created_at) - new Date(prev.created_at)) < 120000;
                return (
                  <div key={m.id} className={`chat-message ${grouped ? 'grouped' : ''}`}>
                    {!grouped && (
                      <img src={m.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.author?.username}`} className="chat-avatar" alt=""/>
                    )}
                    {grouped && <div className="chat-avatar-space"/>}
                    <div className="chat-content">
                      {!grouped && <span className="chat-author">{m.author?.full_name || m.author?.username}</span>}
                      <span className="chat-text">{m.content}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef}/>
            </div>
            {user ? (
              <div className="chat-input-row">
                <input
                  className="chat-input"
                  placeholder={`Message #${activeRoom.name}`}
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                />
                <button className="chat-send-btn" onClick={sendMessage} disabled={!newMsg.trim()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            ) : (
              <div className="chat-signin-prompt">Sign in to participate in the community</div>
            )}
          </>
        ) : (
          <div className="no-room-selected">Select a room to start chatting</div>
        )}
      </div>
    </div>
  );
}
