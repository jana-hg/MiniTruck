import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePlatform } from '../../context/PlatformContext';
import Icon from '../../components/ui/Icon';
import AppIcon from '../../components/ui/AppIcon';

const portals = [
  { to: '/login-user', icon: 'person', label: 'Customer', sub: 'Book & Track', clr: '#3B82F6', dark: '#60A5FA' },
  { to: '/login-driver', icon: 'local_shipping', label: 'Driver', sub: 'Operate & Earn', clr: '#10B981', dark: '#34D399' },
  { to: '/login-admin', icon: 'shield', label: 'Admin', sub: 'Command Center', clr: '#8B5CF6', dark: '#A78BFA' },
];

export default function PortalSwitcher() {
  const { logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { platform, isCustomer, isDriver } = usePlatform();

  useEffect(() => { if (isAuthenticated) logout(); }, []);

  // If running as customer app, redirect directly to customer login
  if (isCustomer) {
    return <Navigate to="/login-user" replace />;
  }

  // If running as driver app, redirect directly to driver login
  if (isDriver) {
    return <Navigate to="/login-driver" replace />;
  }

  // Web platform shows all portals (no admin in mobile apps)

  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9',
    card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0',
    text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B',
    muted: isDark ? '#52525B' : '#94A3B8',
    accent: isDark ? '#FFD700' : '#3B82F6',
    shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px 24px' }}>
      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{
        position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', border: `1px solid ${isDark ? 'rgba(255,215,0,0.2)' : C.border}`,
        background: isDark ? 'rgba(255,215,0,0.08)' : C.card, color: isDark ? '#FFD700' : C.sub
      }}>
        <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={18} />
      </button>

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <AppIcon size={52} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: '0 0 6px', letterSpacing: '-0.02em' }}>MiniTruck</h1>
        <p style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Select your portal to continue</p>
      </motion.div>

      {/* Portal Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 380 }}>
        {portals.map((p, i) => {
          const clr = isDark ? p.dark : p.clr;
          return (
            <motion.div key={p.to} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Link to={p.to} style={{
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: C.shadow,
                transition: 'all 0.15s', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = clr; e.currentTarget.style.boxShadow = `0 4px 16px ${clr}20`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = C.shadow; }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${clr}15` }}>
                  <Icon name={p.icon} filled size={24} style={{ color: clr }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.sub}</div>
                </div>
                <Icon name="chevron_right" size={20} style={{ color: C.muted }} />
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        style={{ fontSize: 10, color: C.muted, marginTop: 28, fontWeight: 500 }}>
        MiniTruck v2.5 · Precision Truck Booking
      </motion.p>
    </div>
  );
}
