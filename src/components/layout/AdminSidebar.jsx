import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../ui/Icon';

const MENU_ITEMS = [
  { id: 'overview', icon: 'dashboard', label: 'Dashboard', color: '#3B82F6', darkColor: '#FFD700', desc: 'Overview & stats' },
  { id: 'rides', icon: 'route', label: 'All Rides', color: '#8B5CF6', darkColor: '#60A5FA', desc: 'Booking management' },
  { id: 'drivers', icon: 'badge', label: 'Drivers', color: '#10B981', darkColor: '#34D399', desc: 'Fleet operators' },
  { id: 'trucks', icon: 'local_shipping', label: 'Trucks', color: '#F59E0B', darkColor: '#FBBF24', desc: 'Vehicle inventory' },
  { id: 'users', icon: 'group', label: 'Customers', color: '#EC4899', darkColor: '#F472B6', desc: 'User accounts' },
  { id: 'payments', icon: 'account_balance_wallet', label: 'Payments', color: '#06B6D4', darkColor: '#22D3EE', desc: 'Transactions' },
];

const LINKS = [
  { to: '/fleet', icon: 'map', label: 'Fleet Map', color: '#6366F1', darkColor: '#818CF8' },
];

export default function AdminSidebar({ activeSection, onSectionChange }) {
  const location = useLocation();
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const sidebarBg = isDark ? '#0A0A0A' : '#FFFFFF';
  const borderColor = isDark ? '#27272A' : '#F3F4F6';
  const textColor = isDark ? '#E4E4E7' : '#374151';
  const mutedColor = isDark ? '#52525B' : '#9CA3AF';
  const hoverBg = isDark ? '#18181B' : '#F9FAFB';
  const activeBg = isDark ? '#FFD700' : '#3B82F6';

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}

      {/* Hamburger button - always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-[60] w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer border transition-all duration-200"
        style={{
          background: isDark ? (isOpen ? '#FFD700' : '#18181B') : (isOpen ? '#3B82F6' : '#FFFFFF'),
          borderColor: isDark ? '#27272A' : '#E5E7EB',
          color: isOpen ? (isDark ? '#000' : '#fff') : (isDark ? '#A1A1AA' : '#6B7280'),
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <Icon name={isOpen ? 'close' : 'menu'} size={22} />
      </button>

      {/* Sidebar - overlays on top, never pushes content */}
      <aside
        className={`fixed left-0 top-0 bottom-0 flex flex-col z-50 transition-transform duration-300 ease-in-out w-[280px] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: sidebarBg, borderRight: `1px solid ${borderColor}`, boxShadow: isOpen ? '8px 0 30px rgba(0,0,0,0.15)' : 'none' }}
      >
        {/* Brand */}
        <div className="px-6 pt-6 pb-5" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <div className="flex items-center gap-3 ml-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: isDark ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: isDark ? '0 2px 10px rgba(255,215,0,0.3)' : '0 2px 10px rgba(59,130,246,0.3)' }}>
              <span className="font-black text-base" style={{ color: isDark ? '#000' : '#fff' }}>M</span>
            </div>
            <div>
              <p className="text-base font-bold tracking-tight" style={{ color: textColor }}>MiniTruck</p>
              <p className="text-[10px] font-medium tracking-wide uppercase" style={{ color: mutedColor }}>Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 overflow-y-auto">
          <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: mutedColor }}>Main Menu</p>

          <div className="flex flex-col gap-1.5">
            {MENU_ITEMS.map(item => {
              const isActive = activeSection === item.id;
              const itemColor = isDark ? item.darkColor : item.color;
              return (
                <button
                  key={item.id}
                  onClick={() => { onSectionChange?.(item.id); setIsOpen(false); }}
                  className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left border-none cursor-pointer transition-all duration-200"
                  style={{
                    background: isActive ? activeBg : 'transparent',
                    boxShadow: isActive ? `0 4px 14px ${isDark ? 'rgba(255,215,0,0.25)' : 'rgba(59,130,246,0.25)'}` : 'none',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: isActive ? 'rgba(255,255,255,0.2)' : (isDark ? `${itemColor}15` : `${itemColor}12`) }}>
                    <Icon name={item.icon} filled={isActive} size={20}
                      style={{ color: isActive ? (isDark ? '#000' : '#fff') : itemColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate"
                      style={{ color: isActive ? (isDark ? '#000' : '#fff') : textColor }}>
                      {item.label}
                    </p>
                    <p className="text-[10px] truncate mt-0.5"
                      style={{ color: isActive ? (isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)') : mutedColor }}>
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="my-5 mx-3" style={{ borderTop: `1px solid ${borderColor}` }} />

          <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: mutedColor }}>Tools</p>
          {LINKS.map(link => {
            const isActive = location.pathname === link.to;
            const linkColor = isDark ? link.darkColor : link.color;
            return (
              <Link key={link.to} to={link.to} onClick={() => setIsOpen(false)}
                className="no-underline flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all"
                style={{ background: isActive ? activeBg : 'transparent' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: isActive ? 'rgba(255,255,255,0.2)' : (isDark ? `${linkColor}15` : `${linkColor}12`) }}>
                  <Icon name={link.icon} filled={isActive} size={20}
                    style={{ color: isActive ? (isDark ? '#000' : '#fff') : linkColor }} />
                </div>
                <span className="text-[13px] font-semibold"
                  style={{ color: isActive ? (isDark ? '#000' : '#fff') : textColor }}>
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: `1px solid ${borderColor}` }}>
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: isDark ? '#27272A' : '#E5E7EB' }}>
              <Icon name="person" size={16} style={{ color: mutedColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: textColor }}>Admin</p>
              <p className="text-[10px]" style={{ color: mutedColor }}>MiniTruck v2.5</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
