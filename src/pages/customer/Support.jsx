import { useState, useEffect } from 'react';
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

  const C = { card: isDark ? '#18181B' : '#FFFFFF', border: isDark ? '#27272A' : '#E2E8F0', text: isDark ? '#FAFAFA' : '#0F172A', sub: isDark ? '#A1A1AA' : '#64748B', muted: isDark ? '#52525B' : '#94A3B8', accent: isDark ? '#FFD700' : '#3B82F6', accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF', shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)' };
  const box = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.shadow };
  const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#fff', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  const fetchTickets = () => { if (user?.id) supportApi.getTickets({ userId: user.id }).then(d => Array.isArray(d) && setTickets(d)).catch(() => {}); };
  useEffect(fetchTickets, [user]);

  const handleCreate = () => { if (!newTicket.subject || !newTicket.message) return; setSending(true); supportApi.createTicket({ userId: user.id, ...newTicket }).then(() => { setShowNew(false); setNewTicket({ subject: '', category: 'delivery', message: '' }); fetchTickets(); }).finally(() => setSending(false)); };
  const handleReply = (id) => { if (!reply.trim()) return; setSending(true); supportApi.replyTicket(id, { sender: 'user', message: reply }).then(() => { setReply(''); fetchTickets(); }).finally(() => setSending(false)); };

  const statusMap = { open: 'confirmed', 'in-progress': 'in-transit', resolved: 'completed' };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            <select value={newTicket.category} onChange={e => setNewTicket({ ...newTicket, category: e.target.value })} style={inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
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
                    <div style={{ fontSize: 13, color: C.text }}>{m.message}</div>
                    <div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>{m.sender === 'admin' ? 'Support Agent' : 'You'} · {new Date(m.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
              {t.status !== 'resolved' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input placeholder="Type a reply..." value={expandedId === t.id ? reply : ''} onChange={e => setReply(e.target.value)} style={{ ...inp, flex: 1 }} />
                  <button onClick={() => handleReply(t.id)} disabled={sending} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: C.accent, color: isDark ? '#000' : '#fff' }}>
                    <Icon name="send" size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
