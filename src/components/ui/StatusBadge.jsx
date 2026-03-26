import { useTheme } from '../../context/ThemeContext';

const STYLES = {
  'in-transit': { light: { bg: '#EFF6FF', text: '#2563EB', dot: '#3B82F6' }, dark: { bg: 'rgba(59,130,246,0.12)', text: '#60A5FA', dot: '#3B82F6' } },
  'delayed': { light: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' }, dark: { bg: 'rgba(239,68,68,0.12)', text: '#F87171', dot: '#EF4444' } },
  'completed': { light: { bg: '#ECFDF5', text: '#059669', dot: '#10B981' }, dark: { bg: 'rgba(16,185,129,0.12)', text: '#34D399', dot: '#10B981' } },
  'confirmed': { light: { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' }, dark: { bg: 'rgba(245,158,11,0.12)', text: '#FBBF24', dot: '#F59E0B' } },
  'pending': { light: { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' }, dark: { bg: 'rgba(251,191,36,0.1)', text: '#FBBF24', dot: '#F59E0B' } },
  'cancelled': { light: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' }, dark: { bg: 'rgba(239,68,68,0.1)', text: '#F87171', dot: '#EF4444' } },
  'online': { light: { bg: '#ECFDF5', text: '#059669', dot: '#10B981' }, dark: { bg: 'rgba(16,185,129,0.12)', text: '#34D399', dot: '#10B981' } },
  'offline': { light: { bg: '#F4F4F5', text: '#71717A', dot: '#A1A1AA' }, dark: { bg: 'rgba(161,161,170,0.1)', text: '#A1A1AA', dot: '#71717A' } },
  'on-trip': { light: { bg: '#EFF6FF', text: '#2563EB', dot: '#3B82F6' }, dark: { bg: 'rgba(59,130,246,0.12)', text: '#60A5FA', dot: '#3B82F6' } },
  'active': { light: { bg: '#ECFDF5', text: '#059669', dot: '#10B981' }, dark: { bg: 'rgba(16,185,129,0.12)', text: '#34D399', dot: '#10B981' } },
  'idle': { light: { bg: '#F4F4F5', text: '#71717A', dot: '#A1A1AA' }, dark: { bg: 'rgba(161,161,170,0.1)', text: '#A1A1AA', dot: '#71717A' } },
  'maintenance': { light: { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' }, dark: { bg: 'rgba(245,158,11,0.12)', text: '#FBBF24', dot: '#F59E0B' } },
};

export default function StatusBadge({ status }) {
  const { isDark } = useTheme();
  const key = status?.toLowerCase() ?? 'pending';
  const s = STYLES[key] || STYLES.pending;
  const c = isDark ? s.dark : s.light;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20,
      background: c.bg, color: c.text,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
    }}>
      <div style={{ width: 6, height: 6, borderRadius: 3, background: c.dot, boxShadow: `0 0 6px ${c.dot}60` }} />
      {status}
    </span>
  );
}
