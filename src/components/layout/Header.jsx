import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../ui/Icon';
import AppIcon from '../ui/AppIcon';

export default function Header() {
  const { isAuthenticated, role, user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const C = {
    bg: isDark ? '#0A0A0A' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0',
    text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B',
    muted: isDark ? '#52525B' : '#94A3B8',
    accent: isDark ? '#FFD700' : '#3B82F6',
    accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF',
  };

  const homeLink = isAuthenticated ? (role === 'admin' ? '/admin' : role === 'driver' ? '/driver' : '/') : '/login';

  const menuItems = role === 'customer'
    ? [
        { to: '/profile', icon: 'person', label: 'My Profile' },
        { to: '/wallet', icon: 'account_balance_wallet', label: 'Wallet' },
        { to: '/support', icon: 'support_agent', label: 'Support' },
      ]
    : role === 'driver'
    ? [
        { to: '/driver/profile', icon: 'person', label: 'Driver Profile' },
        { to: '/earnings', icon: 'payments', label: 'Earnings' },
      ]
    : [];

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
        background: C.bg, borderBottom: `1px solid ${C.border}`,
        boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Left: Brand */}
        <Link to={homeLink} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppIcon size={30} />
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>MINITRUCK</span>
        </Link>

        {/* Right: Theme + Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{
            width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: `1px solid ${isDark ? 'rgba(255,215,0,0.2)' : '#E2E8F0'}`,
            background: isDark ? 'rgba(255,215,0,0.08)' : '#F8FAFC', color: isDark ? '#FFD700' : '#64748B',
          }}>
            <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={16} />
          </button>

          {/* Hamburger menu */}
          {isAuthenticated && (
            <button onClick={() => setMenuOpen(!menuOpen)}
              style={{
                width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', border: 'none',
                background: menuOpen ? C.accent : (isDark ? '#18181B' : '#F1F5F9'),
                color: menuOpen ? (isDark ? '#000' : '#fff') : C.sub,
              }}>
              <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
            </button>
          )}

          {!isAuthenticated && (
            <Link to="/login" style={{
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: C.accent, color: isDark ? '#000' : '#fff',
            }}>
              <Icon name="shield" size={14} /> LOGIN
            </Link>
          )}
        </div>
      </header>

      {/* Hamburger menu dropdown */}
      {menuOpen && isAuthenticated && (
        <>
          <div style={{ position: 'fixed', inset: 0, top: 56, zIndex: 40, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setMenuOpen(false)} />
          <div style={{
            position: 'fixed', right: 0, top: 56, width: 260, zIndex: 45,
            background: C.bg, borderLeft: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
            borderRadius: '0 0 0 16px',
            boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}>
            {/* User info */}
            <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDark ? 'linear-gradient(135deg,#FFD700,#FF8C00)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
              }}>
                <Icon name="person" size={18} style={{ color: isDark ? '#000' : '#fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{user?.name || user?.id}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{role}</div>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: '8px' }}>
              {menuItems.map(item => {
                const active = location.pathname === item.to;
                return (
                  <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
                    style={{
                      textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 12px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                      background: active ? C.accentBg : 'transparent',
                      color: active ? C.accent : C.text, transition: 'all 0.15s',
                    }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: active ? `${C.accent}20` : (isDark ? '#18181B' : '#F1F5F9'),
                    }}>
                      <Icon name={item.icon} filled={active} size={18} style={{ color: active ? C.accent : C.sub }} />
                    </div>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Logout */}
            <div style={{ padding: '8px', borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => { logout(); setMenuOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 12px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#EF4444', textAlign: 'left',
                }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
                }}>
                  <Icon name="logout" size={18} style={{ color: '#EF4444' }} />
                </div>
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
