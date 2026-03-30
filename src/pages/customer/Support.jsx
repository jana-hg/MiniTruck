import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { support as supportApi } from '../../services/api';
import Icon from '../../components/ui/Icon';
import StatusBadge from '../../components/ui/StatusBadge';

const CATEGORIES = ['delivery', 'payment', 'account', 'other'];

export default function Support() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [tickets, setTickets] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [newTicket, setNewTicket] = useState({ subject: '', category: 'delivery', message: '' });
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordingTicketId, setRecordingTicketId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const C = { card: isDark ? '#18181B' : '#FFFFFF', border: isDark ? '#27272A' : '#E2E8F0', text: isDark ? '#FAFAFA' : '#0F172A', sub: isDark ? '#A1A1AA' : '#64748B', muted: isDark ? '#52525B' : '#94A3B8', accent: isDark ? '#FFD700' : '#3B82F6', accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF', shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)' };
  const box = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.shadow };
  const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#fff', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  const fetchTickets = () => { if (user?.id) supportApi.getTickets({ userId: user.id }).then(d => Array.isArray(d) && setTickets(d)).catch(() => {}); };
  useEffect(fetchTickets, [user]);

  const fetchSuggestions = (category) => {
    supportApi.getSuggestions(category).then(d => setSuggestions(d.suggestions || [])).catch(() => setSuggestions([]));
  };

  const handleCategoryChange = (category) => {
    const label = category.charAt(0).toUpperCase() + category.slice(1);
    let message = '';
    if (category === 'payment') {
      message = 'I have a query regarding a payment for my recent trip. [Please provide details here]';
    } else if (category === 'delivery') {
      message = 'I am facing an issue with a delivery. [Please provide details here]';
    }
    setNewTicket({ ...newTicket, category, subject: `${label} Issue`, message });
    fetchSuggestions(category);
  };

  const handleSuggestionClick = (suggestion) => {
    setNewTicket({ ...newTicket, subject: suggestion, message: suggestion });
  };

  const handleCreate = () => { if (!newTicket.subject || !newTicket.message) return; setSending(true); supportApi.createTicket({ userId: user.id, ...newTicket }).then(() => { setShowNew(false); setNewTicket({ subject: '', category: 'delivery', message: '' }); setSuggestions([]); fetchTickets(); }).finally(() => setSending(false)); };

  const startVoiceRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (err) { console.error('Microphone access denied', err); alert('Microphone access required'); }
  };

  const stopVoiceRecord = async (ticketId) => {
    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const base64Audio = reader.result.split(',')[1];
          setSending(true);
          supportApi.replyTicket(ticketId, { sender: 'user', type: 'voice', voiceData: base64Audio }).then(() => {
            setReply('');
            setRecording(false);
            fetchTickets();
            resolve();
          }).finally(() => setSending(false));
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current.stop();
    });
  };

  const handleReply = (id) => { if (!reply.trim()) return; setSending(true); supportApi.replyTicket(id, { sender: 'user', message: reply }).then(() => { setReply(''); fetchTickets(); }).finally(() => setSending(false)); };

  const statusMap = { open: 'confirmed', 'in-progress': 'in-transit', resolved: 'completed' };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 0 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Support</div>
        <button onClick={() => setShowNew(!showNew)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: C.accent, color: isDark ? '#000' : '#fff' }}>
          <Icon name={showNew ? 'close' : 'add'} size={16} /> {showNew ? 'Cancel' : 'New Ticket'}
        </button>
      </div>

      {/* New Ticket */}
      {showNew && (
        <div style={{ ...box, padding: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Create Support Ticket</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Subject" value={newTicket.subject} onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })} style={inp} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => handleCategoryChange(c)}
                    style={{ padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${newTicket.category === c ? C.accent : C.border}`,
                      background: newTicket.category === c ? (isDark ? 'rgba(255,215,0,0.1)' : '#EFF6FF') : 'transparent',
                      color: newTicket.category === c ? C.accent : C.sub }}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {suggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>💡 Suggestions:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSuggestionClick(s)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${C.accent}`, background: 'transparent', color: C.accent, cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <textarea rows={4} placeholder="Describe your issue..." value={newTicket.message} onChange={e => setNewTicket({ ...newTicket, message: e.target.value })} style={{ ...inp, resize: 'none' }} />
            <button onClick={handleCreate} disabled={sending} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: C.accent, color: isDark ? '#000' : '#fff', opacity: sending ? 0.6 : 1 }}>
              {sending ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </div>
      )}

      {tickets.length === 0 && !showNew && (
        <div style={{ ...box, padding: '48px 20px', textAlign: 'center' }}>
          <Icon name="support_agent" size={48} style={{ color: C.muted, marginBottom: 12 }} />
          <div style={{ fontSize: 14, color: C.sub }}>No support tickets yet</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Click "New Ticket" to get help</div>
        </div>
      )}

      {tickets.map(t => (
        <div key={t.id} style={{ ...box, overflow: 'hidden' }}>
          <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
            style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'transparent', border: 'none', textAlign: 'left' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>{t.id}</span>
                <StatusBadge status={statusMap[t.status] || t.status} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{t.category} · {t.createdAt}</div>
            </div>
            <Icon name={expandedId === t.id ? 'expand_less' : 'expand_more'} size={20} style={{ color: C.muted, flexShrink: 0 }} />
          </button>

          {expandedId === t.id && (
            <div style={{ padding: '12px 20px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {t.messages?.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '80%', borderRadius: 10, padding: '10px 14px', background: m.sender === 'user' ? C.accentBg : (isDark ? '#27272A' : '#F1F5F9') }}>
                    {m.type === 'voice' && m.voiceData ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon name="mic" size={16} style={{ color: C.accent }} />
                        <audio controls style={{ height: 24, maxWidth: 200 }} src={`data:audio/webm;base64,${m.voiceData}`} />
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: C.text }}>{m.message}</div>
                    )}
                    <div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>{m.sender === 'admin' ? 'Support Agent' : 'You'} · {new Date(m.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
              {t.status !== 'resolved' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input placeholder="Type a reply..." value={expandedId === t.id ? reply : ''} onChange={e => setReply(e.target.value)} style={{ ...inp, flex: 1 }} />
                    <button onClick={() => handleReply(t.id)} disabled={sending || recording} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: C.accent, color: isDark ? '#000' : '#fff', opacity: sending || recording ? 0.6 : 1 }}>
                      <Icon name="send" size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {recording && recordingTicketId === t.id ? (
                      <button onClick={() => stopVoiceRecord(t.id)} disabled={sending} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#EF4444', color: '#fff', opacity: sending ? 0.6 : 1 }}>
                        🎙️ Stop Recording
                      </button>
                    ) : (
                      <button onClick={() => { startVoiceRecord(); setRecordingTicketId(t.id); }} disabled={sending} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: C.accent, color: isDark ? '#000' : '#fff', opacity: sending ? 0.6 : 1 }}>
                        🎤 Voice Message
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
