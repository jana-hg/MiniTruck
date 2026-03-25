import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../ui/Icon';

const NAV = {
  customer: [
    { to: '/', icon: 'local_shipping', label: 'Book' },
    { to: '/bookings', icon: 'receipt_long', label: 'Bookings' },
    { to: '/wallet', icon: 'account_balance_wallet', label: 'Wallet' },
    { to: '/support', icon: 'support_agent', label: 'Support' },
    { to: '/profile', icon: 'person', label: 'Profile' },
  ],
  driver: [
    { to: '/driver', icon: 'dashboard', label: 'Home' },
    { to: '/earnings', icon: 'payments', label: 'Earnings' },
    { to: '/driver/profile', icon: 'person', label: 'Profile' },
  ],
  admin: [],
};

export default function BottomNav() {
  const { role, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();

  if (!isAuthenticated) return null;
  const items = NAV[role] || NAV.customer;
  if (items.length === 0) return null;

  const C = {
    bg: isDark ? '#0A0A0A' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0',
    accent: isDark ? '#FFD700' : '#3B82F6',
    muted: isDark ? '#52525B' : '#94A3B8',
  };

  return (
    <nav className="lg:hidden" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: 64, padding: '0 8px',
      background: C.bg, borderTop: `1px solid ${C.border}`,
      boxShadow: isDark ? '0 -2px 10px rgba(0,0,0,0.3)' : '0 -1px 4px rgba(0,0,0,0.04)',
    }}>
      {items.map(item => {
        const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
        return (
          <Link key={item.to} to={item.to} style={{
            textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 12px', borderRadius: 10, transition: 'all 0.15s',
            background: active ? (isDark ? C.accent : C.accent) : 'transparent',
            color: active ? (isDark ? '#000' : '#fff') : C.muted,
          }}>
            <Icon name={item.icon} filled={active} size={20} />
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
