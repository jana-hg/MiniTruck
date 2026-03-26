import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../../components/ui/Icon';
import AppIcon from '../../components/ui/AppIcon';
import StatusBadge from '../../components/ui/StatusBadge';
import MapView, { createFleetActiveIcon, createFleetIdleIcon } from '../../components/map/MapView';
import { bookings as bookingsApi, drivers as driversApi, trucks as trucksApi, payments as paymentsApi, fleet as fleetApi } from '../../services/api';
import { INDIAN_TRUCKS, ALL_TRUCK_MODELS } from '../../config/indianTrucks';

function useIsMobile(bp = 768) {
  const [m, setM] = useState(window.innerWidth < bp);
  useEffect(() => { const h = () => setM(window.innerWidth < bp); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, [bp]);
  return m;
}

const TABS = [
  { id: 'overview', icon: 'space_dashboard', label: 'Dashboard', color: '#3B82F6', dark: '#FFD700' },
  { id: 'rides', icon: 'route', label: 'Rides', color: '#8B5CF6', dark: '#A78BFA' },
  { id: 'drivers', icon: 'badge', label: 'Drivers', color: '#10B981', dark: '#34D399' },
  { id: 'trucks', icon: 'local_shipping', label: 'Trucks & Pricing', color: '#F59E0B', dark: '#FBBF24' },
  { id: 'users', icon: 'group', label: 'Users', color: '#EC4899', dark: '#F472B6' },
  { id: 'payments', icon: 'account_balance_wallet', label: 'Payments', color: '#06B6D4', dark: '#22D3EE' },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const mob = useIsMobile();
  const [activeTab, setActiveTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [trucksList, setTrucksList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [fleetData, setFleetData] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    bookingsApi.getBookings({}).then(d => Array.isArray(d) && setBookings(d)).catch(() => { });
    driversApi.getDrivers().then(d => Array.isArray(d) && setDriversList(d)).catch(() => { });
    trucksApi.getTrucks().then(d => Array.isArray(d) && setTrucksList(d)).catch(() => { });
    paymentsApi.getPayments().then(d => Array.isArray(d) && setPaymentsList(d)).catch(() => { });
    fleetApi.getFleet().then(d => Array.isArray(d) && setFleetData(d)).catch(() => { });
    fetch('/api/users').then(r => r.json()).then(d => Array.isArray(d) && setUsers(d)).catch(() => { });
  }, []);

  // Poll fleet & driver locations every 10s for live map updates
  useEffect(() => {
    const interval = setInterval(() => {
      fleetApi.getFleet().then(d => Array.isArray(d) && setFleetData(d)).catch(() => { });
      driversApi.getDrivers().then(d => Array.isArray(d) && setDriversList(d)).catch(() => { });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalRevenue = paymentsList.reduce((s, p) => s + (p.amount || 0), 0);
  const activeRides = bookings.filter(b => b.status === 'in-transit' || b.status === 'confirmed').length;
  const completedRides = bookings.filter(b => b.status === 'completed').length;
  const activeDrivers = driversList.filter(d => d.status === 'active' || d.status === 'on-trip').length;

  // Theme colors
  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9',
    headerBg: isDark ? '#0A0A0A' : '#FFFFFF',
    card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0',
    text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B',
    muted: isDark ? '#52525B' : '#94A3B8',
    rowAlt: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    accent: isDark ? '#FFD700' : '#3B82F6',
    accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF',
    shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
  };

  const tabData = {
    overview: { bookings, driversList, trucksList, paymentsList, fleetData, users, totalRevenue, activeRides, completedRides, activeDrivers },
    rides: { bookings },
    drivers: { driversList },
    trucks: { trucksList },
    users: { users },
    payments: { paymentsList },
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>

      {/* ═══════════════════════════════════════
          BIG HEADER
         ═══════════════════════════════════════ */}
      <header style={{ background: C.headerBg, borderBottom: `1px solid ${C.border}`, boxShadow: C.shadow, height: mob ? 56 : 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: mob ? '0 12px' : '0 24px', position: 'sticky', top: 0, zIndex: 30 }}>

        {/* Left: Menu + Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', border: 'none', transition: 'all 0.2s',
              background: menuOpen ? C.accent : (isDark ? '#18181B' : '#F1F5F9'),
              color: menuOpen ? (isDark ? '#000' : '#fff') : C.sub,
            }}>
            <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
          </button>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AppIcon size={38} />
            {!mob && <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>MiniTruck</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Command Center</div>
            </div>}
          </div>
        </div>

        {/* Right: Fleet Map + Theme + Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Fleet Map Toggle */}
          <button onClick={() => { const next = !showMap; setShowMap(next); if (next) setTimeout(() => document.getElementById('fleet-map-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: mob ? '6px 8px' : '6px 12px', borderRadius: 8,
            background: showMap ? (isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5') : (isDark ? 'rgba(59,130,246,0.1)' : '#F0F9FF'),
            color: showMap ? '#10B981' : (isDark ? '#60A5FA' : '#3B82F6'),
            border: `1px solid ${showMap ? (isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0') : (isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE')}`,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            <Icon name={showMap ? 'map' : 'map'} size={16} filled={showMap} />
            {!mob && <span>{showMap ? 'Hide Map' : 'Fleet Map'}</span>}
          </button>

          {/* Theme toggle */}
          <button onClick={toggleTheme}
            style={{
              width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', border: `1px solid ${isDark ? 'rgba(255,215,0,0.2)' : '#E2E8F0'}`,
              background: isDark ? 'rgba(255,215,0,0.08)' : '#F8FAFC', color: isDark ? '#FFD700' : '#64748B',
            }}>
            <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={18} />
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: C.border, margin: '0 4px' }} />

          {/* Profile */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setProfileOpen(!profileOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}>
              {!mob && <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{user?.name || 'Admin'}</div>
                <div style={{ fontSize: 10, color: C.muted }}>Administrator</div>
              </div>}
              <div style={{
                width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: isDark ? 'linear-gradient(135deg,#FFD700,#FF8C00)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
                boxShadow: isDark ? '0 2px 8px rgba(255,215,0,0.2)' : '0 2px 8px rgba(59,130,246,0.2)',
              }}>
                <Icon name="person" size={16} style={{ color: isDark ? '#000' : '#fff' }} />
              </div>
            </button>

            {/* Profile dropdown */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: 'absolute', right: 0, top: 48, width: 220, borderRadius: 12, overflow: 'hidden', zIndex: 50,
                    background: C.card, border: `1px solid ${C.border}`,
                    boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.12)',
                  }}>
                  {/* User info */}
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDark ? 'linear-gradient(135deg,#FFD700,#FF8C00)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
                    }}>
                      <Icon name="person" size={16} style={{ color: isDark ? '#000' : '#fff' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{user?.name || 'Admin'}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>admin@minitruck.com</div>
                    </div>
                  </div>
                  {/* Items */}
                  {[
                    { icon: 'settings', label: 'Settings' },
                    { icon: 'help', label: 'Help Center' },
                  ].map(item => (
                    <button key={item.label} onClick={() => setProfileOpen(false)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: C.sub, fontSize: 13 }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? '#27272A' : '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <Icon name={item.icon} size={18} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                  {/* Logout */}
                  <div style={{ borderTop: `1px solid ${C.border}` }}>
                    <button onClick={() => { logout(); setProfileOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#EF4444', fontSize: 13, fontWeight: 600 }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <Icon name="logout" size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ═══ SIDEBAR - opens from left on menu click ═══ */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            {/* Sidebar panel */}
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[300px]"
              style={{ background: C.card, borderRight: `1px solid ${C.border}`, boxShadow: '8px 0 30px rgba(0,0,0,0.15)', overflowY: 'auto' }}
            >
              {/* ── TOP SECTION: Logo + Close ── */}
              <div style={{ height: 80, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <AppIcon size={36} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>MiniTruck</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Admin Panel</div>
                  </div>
                </div>
                <button onClick={() => setMenuOpen(false)}
                  style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', background: isDark ? '#27272A' : '#F1F5F9', color: C.sub }}>
                  <Icon name="close" size={18} />
                </button>
              </div>

              {/* ── SPACER ── */}
              <div style={{ height: 8 }} />

              {/* ── MENU ITEMS ── */}
              <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id;
                  const tabColor = isDark ? tab.dark : tab.color;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '10px 12px',
                        borderRadius: 14,
                        textAlign: 'left',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: isActive ? (isDark ? C.accent : tabColor) : 'transparent',
                        boxShadow: isActive ? `0 4px 14px ${tabColor}30` : 'none',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isDark ? '#18181B' : '#F5F5F5'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        background: isActive ? 'rgba(255,255,255,0.2)' : `${tabColor}15`,
                      }}>
                        <Icon name={tab.icon} filled={isActive} size={20}
                          style={{ color: isActive ? (isDark ? '#000' : '#fff') : tabColor }} />
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 600, flex: 1,
                        color: isActive ? (isDark ? '#000' : '#fff') : C.text,
                      }}>
                        {tab.label}
                      </span>
                      {isActive && <div style={{ width: 6, height: 20, borderRadius: 3, background: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>

              {/* ── FOOTER ── */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
                <span style={{ fontSize: 10, color: C.muted }}>MiniTruck Admin v2.5</span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ═══ PAGE CONTENT ═══ */}
      <div style={{ padding: mob ? '20px 12px 40px' : '32px 24px 48px', maxWidth: 1600, margin: '0 auto' }}>
        {/* Section title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg }}>
            <Icon name={TABS.find(t => t.id === activeTab)?.icon || 'dashboard'} filled size={18} style={{ color: C.accent }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{TABS.find(t => t.id === activeTab)?.label || 'Dashboard'}</div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {activeTab === 'overview' ? 'Real-time overview of all operations' : activeTab === 'rides' ? 'All booking and ride records' : activeTab === 'drivers' ? 'Fleet operator management' : activeTab === 'trucks' ? 'Vehicle inventory and pricing' : activeTab === 'users' ? 'Customer accounts and activity' : 'Transaction history and billing'}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {activeTab === 'overview' && <OverviewTab {...tabData.overview} C={C} isDark={isDark} mob={mob} showMap={showMap} setShowMap={setShowMap} />}
            {activeTab === 'rides' && <RidesTab {...tabData.rides} C={C} isDark={isDark} mob={mob} />}
            {activeTab === 'drivers' && <DriversTab {...tabData.drivers} C={C} isDark={isDark} mob={mob} />}
            {activeTab === 'trucks' && <TrucksTab {...tabData.trucks} C={C} isDark={isDark} mob={mob} />}
            {activeTab === 'users' && <UsersTab {...tabData.users} C={C} isDark={isDark} mob={mob} />}
            {activeTab === 'payments' && <PaymentsTab {...tabData.payments} C={C} isDark={isDark} mob={mob} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══ Box ═══ */
function Box({ children, C, s = {} }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: C.shadow, ...s }}>{children}</div>;
}

function BoxHead({ title, icon, iconColor, iconBg, right, C }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg || C.accentBg }}>
          <Icon name={icon} filled size={16} style={{ color: iconColor || C.accent }} />
        </div>}
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{title}</span>
      </div>
      {right && <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{right}</span>}
    </div>
  );
}

function TH({ children, align, C }) {
  return <th style={{ padding: '10px 20px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: align || 'left' }}>{children}</th>;
}

function TD({ children, bold, accent, align, C }) {
  return <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: bold ? 600 : 400, color: accent ? C.accent : (bold ? C.text : C.sub), textAlign: align || 'left' }}>{children}</td>;
}

/* ═══ Overview ═══ */
function OverviewTab({ bookings, driversList, trucksList, paymentsList, fleetData, users, totalRevenue, activeRides, completedRides, activeDrivers, C, isDark, mob, showMap, setShowMap }) {
  const [selectedDriver, setSelectedDriver] = useState(null);
  // Get bookings for selected driver
  const driverBookings = selectedDriver ? bookings.filter(b => b.driverId === selectedDriver.id) : [];
  // Build route markers for selected driver
  const routeMarkers = [];
  const routeLines = [];
  if (selectedDriver) {
    // Driver current location
    const dLoc = selectedDriver.location || fleetData.find(f => f.driverId === selectedDriver.id)?.location;
    if (dLoc) routeMarkers.push({ lat: dLoc.lat, lng: dLoc.lng, icon: createFleetActiveIcon() });
    // Booking pickup/dropoff
    driverBookings.forEach(b => {
      if (b.pickup?.lat && b.dropoff?.lat) {
        routeLines.push([[b.pickup.lat, b.pickup.lng], [b.dropoff.lat, b.dropoff.lng]]);
      }
    });
  }

  const bc = isDark ? ['#FFD700', '#60A5FA', '#F472B6', '#34D399'] : ['#3B82F6', '#F97316', '#EC4899', '#10B981'];
  const stats = [
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, sub: 'All transactions', icon: 'trending_up', change: '+12.5%' },
    { label: 'Active Rides', value: String(activeRides), sub: `${completedRides} completed`, icon: 'route' },
    { label: 'Pending', value: String(bookings.filter(b => b.status === 'confirmed').length), sub: 'Awaiting dispatch', icon: 'pending_actions' },
    { label: 'Clients', value: String(users.length), sub: `${activeDrivers} drivers online`, icon: 'group' },
  ];
  const chart = [1200, 1800, 1600, 2100, 2800, 3200, 2900];
  const cMax = Math.max(...chart);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: mob ? 10 : 16 }}>
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Box C={C} s={{ borderLeft: `4px solid ${bc[i]}` }}>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>{s.label}</span>
                  <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${bc[i]}15` }}>
                    <Icon name={s.icon} size={18} style={{ color: bc[i] }} />
                  </div>
                </div>
                <div style={{ fontSize: mob ? 20 : 28, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  {s.change && <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>{s.change}</span>}
                  <span style={{ fontSize: 11, color: C.muted }}>{s.sub}</span>
                </div>
              </div>
            </Box>
          </motion.div>
        ))}
      </div>

      {/* Chart + Mix */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '2fr 1fr', gap: 16 }}>
        <Box C={C}>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Revenue Overview</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Weekly performance</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.accent, cursor: 'pointer' }}>Report <Icon name="north_east" size={12} /></span>
            </div>
            <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
              {chart.map((v, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(v / cMax) * 160}px` }} transition={{ delay: 0.06 * i, duration: 0.4 }}
                    style={{ width: '70%', maxWidth: 32, borderRadius: '6px 6px 0 0', background: isDark ? 'linear-gradient(to top,#FFD700,#FF8C00)' : `linear-gradient(to top,${i >= 4 ? '#3B82F6' : '#93C5FD'},${i >= 4 ? '#1D4ED8' : '#60A5FA'})` }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', marginTop: 6 }}>
              {days.map(d => <span key={d} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 500, color: C.muted }}>{d}</span>)}
            </div>
          </div>
        </Box>
        <Box C={C}>
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Booking Mix</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>Status breakdown</div>
            {[
              { l: 'Completed', c: bookings.filter(b => b.status === 'completed').length, clr: '#10B981' },
              { l: 'In Transit', c: bookings.filter(b => b.status === 'in-transit').length, clr: isDark ? '#FFD700' : '#3B82F6' },
              { l: 'Confirmed', c: bookings.filter(b => b.status === 'confirmed').length, clr: '#F59E0B' },
              { l: 'Cancelled', c: bookings.filter(b => b.status === 'cancelled').length, clr: '#EF4444' },
            ].map(it => (
              <div key={it.l} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>{it.l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{it.c}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', background: isDark ? '#27272A' : '#F1F5F9' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: bookings.length ? `${(it.c / bookings.length) * 100}%` : '0%' }}
                    transition={{ duration: 0.5 }} style={{ height: '100%', borderRadius: 4, background: it.clr, minWidth: it.c > 0 ? 6 : 0 }} />
                </div>
              </div>
            ))}
          </div>
        </Box>
      </div>

      {/* Rides */}
      <Box C={C}>
        <BoxHead title="Recent Rides" icon="route" iconColor={isDark ? '#A78BFA' : '#8B5CF6'} iconBg={isDark ? 'rgba(167,139,250,0.1)' : '#F5F3FF'} right={`${bookings.length} total`} C={C} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
            <thead><tr style={{ borderBottom: `1px solid ${C.border}`, background: C.rowAlt }}>
              <TH C={C}>ID</TH>{!mob && <TH C={C}>Route</TH>}<TH C={C}>Status</TH><TH align="right" C={C}>Amount</TH>
            </tr></thead>
            <tbody>
              {bookings.slice(0, 5).map((b, i) => (
                <tr key={b.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.rowAlt : 'transparent' }}>
                  <TD bold C={C}>{b.id}</TD>
                  {!mob && <TD C={C}><span style={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.pickup?.address || '—'} → {b.dropoff?.address || '—'}</span></TD>}
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={b.status} /></td>
                  <TD bold align="right" C={C}>₹{b.fare?.total?.toFixed(0) || '0'}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bookings.length === 0 && <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 13, color: C.muted }}>No rides</div>}
      </Box>

      {/* Live Fleet Map */}
      <div id="fleet-map-section" />
      <AnimatePresence>
        {showMap && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }}>
            <div style={{ borderRadius: mob ? 12 : 16, overflow: 'hidden', border: `1px solid ${isDark ? '#27272A' : '#E2E8F0'}`, background: isDark ? '#18181B' : '#fff', boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)' }}>
              {/* Map Header */}
              <div style={{ padding: mob ? '10px 12px' : '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.05))' : 'linear-gradient(135deg, #ECFDF5, #F0F9FF)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#10B981', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                    <Icon name="satellite_alt" filled size={14} style={{ color: '#fff' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: mob ? 12 : 13, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {selectedDriver ? selectedDriver.name : 'Live Fleet Map'}
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    </div>
                    <div style={{ fontSize: mob ? 9 : 10, color: C.muted, marginTop: 1 }}>
                      {selectedDriver ? `${driverBookings.length} active route(s)` : `${fleetData.filter(f => f.status === 'active' || f.status === 'on-trip').length} active · ${fleetData.length} total`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {selectedDriver && (
                    <button onClick={() => setSelectedDriver(null)}
                      style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#10B981', border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 6 }}>
                      All
                    </button>
                  )}
                  <button onClick={() => setShowMap(false)}
                    style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: C.muted }}>
                    <Icon name="close" size={14} />
                  </button>
                </div>
              </div>

              {/* Selected driver info bar */}
              {selectedDriver && (
                <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, background: isDark ? 'rgba(255,215,0,0.04)' : '#FFFBEB', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="person" filled size={10} style={{ color: isDark ? '#000' : '#fff' }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{selectedDriver.name}</span>
                  <span style={{ fontSize: 9, color: C.muted }}>·</span>
                  <span style={{ fontSize: 9, color: C.muted }}>{selectedDriver.status}</span>
                  {selectedDriver.rating > 0 && <>
                    <span style={{ fontSize: 9, color: C.muted }}>·</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? '#FFD700' : '#F59E0B' }}>★ {selectedDriver.rating}</span>
                  </>}
                </div>
              )}

              {/* Map */}
              <div style={{ height: mob ? 260 : 380, position: 'relative' }}>
                <MapView
                  center={selectedDriver?.location ? [selectedDriver.location.lat, selectedDriver.location.lng] : [19.065, 72.878]}
                  zoom={selectedDriver ? 14 : 12}
                  markers={selectedDriver
                    ? [...(selectedDriver.location ? [{ lat: selectedDriver.location.lat, lng: selectedDriver.location.lng, icon: createFleetActiveIcon() }] : [])]
                    : fleetData.map(f => ({ lat: f.location?.lat || 19.07, lng: f.location?.lng || 72.87, icon: (f.status === 'active' || f.status === 'on-trip') ? createFleetActiveIcon() : createFleetIdleIcon() }))
                  }
                  origin={driverBookings[0]?.pickup?.lat ? [driverBookings[0].pickup.lat, driverBookings[0].pickup.lng] : null}
                  destination={driverBookings[0]?.dropoff?.lat ? [driverBookings[0].dropoff.lat, driverBookings[0].dropoff.lng] : null}
                  showLocate={false} className="w-full h-full"
                />
                {/* Legend overlay */}
                <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 500, background: isDark ? 'rgba(24,24,27,0.92)' : 'rgba(255,255,255,0.95)', borderRadius: 8, padding: '5px 10px', display: 'flex', gap: 10, fontSize: 9, fontWeight: 700, border: `1px solid ${C.border}`, backdropFilter: 'blur(10px)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: 4, background: '#10B981', boxShadow: '0 0 4px rgba(16,185,129,0.5)' }} /> Active</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: 4, background: '#94A3B8' }} /> Idle</span>
                </div>
              </div>

              {/* Driver routes list */}
              {selectedDriver && driverBookings.length > 0 && (
                <div style={{ borderTop: `1px solid ${C.border}`, maxHeight: 80, overflowY: 'auto' }}>
                  {driverBookings.map(b => (
                    <div key={b.id} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, fontSize: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, flex: 1 }}>
                        <Icon name="route" size={12} style={{ color: '#10B981', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: C.text }}>{b.id}</span>
                        {!mob && <span style={{ color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.pickup?.address} → {b.dropoff?.address}</span>}
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payments + Drivers */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 16 }}>
        <Box C={C}>
          <BoxHead title="Recent Payments" icon="account_balance_wallet" iconColor={isDark ? '#22D3EE' : '#06B6D4'} iconBg={isDark ? 'rgba(34,211,238,0.1)' : '#ECFEFF'} C={C} />
          {paymentsList.slice(0, 4).map(p => (
            <div key={p.id} style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.bookingId}</div><div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{p.method} · {p.date}</div></div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{p.amount?.toFixed(2)}</span>
            </div>
          ))}
          {paymentsList.length === 0 && <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: C.muted }}>No payments</div>}
        </Box>
        <Box C={C}>
          <BoxHead title="Fleet Operators" icon="badge" iconColor={isDark ? '#34D399' : '#10B981'} iconBg={isDark ? 'rgba(52,211,153,0.1)' : '#ECFDF5'} C={C} />
          {driversList.slice(0, 4).map(d => {
            const isSelected = selectedDriver?.id === d.id;
            return (
              <div key={d.id}
                onClick={() => setSelectedDriver(isSelected ? null : d)}
                style={{
                  padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.15s',
                  background: isSelected ? (isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF') : 'transparent',
                  borderLeft: isSelected ? `3px solid ${C.accent}` : '3px solid transparent',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = isDark ? '#18181B' : '#F9FAFB'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? C.accent : C.accentBg }}>
                    <Icon name="person" filled size={16} style={{ color: isSelected ? (isDark ? '#000' : '#fff') : C.accent }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{d.truckId || d.id}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="star" filled size={14} style={{ color: '#FBBF24' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{d.rating}</span>
                  <Icon name={isSelected ? 'visibility' : 'chevron_right'} size={16} style={{ color: isSelected ? C.accent : C.muted, marginLeft: 4 }} />
                </div>
              </div>
            );
          })}
          {driversList.length === 0 && <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: C.muted }}>No drivers</div>}
        </Box>
      </div>
    </div>
  );
}

/* ═══ Rides ═══ */
function RidesTab({ bookings, C, isDark }) {
  return (
    <Box C={C}>
      <BoxHead title="All Rides" icon="route" iconColor={isDark ? '#A78BFA' : '#8B5CF6'} iconBg={isDark ? 'rgba(167,139,250,0.1)' : '#F5F3FF'} right={`${bookings.length} total`} C={C} />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead><tr style={{ borderBottom: `1px solid ${C.border}`, background: C.rowAlt }}>
            <TH C={C}>ID</TH><TH C={C}>Route</TH><TH C={C}>Cargo</TH><TH C={C}>Truck</TH><TH C={C}>Status</TH><TH align="right" C={C}>Amount</TH>
          </tr></thead>
          <tbody>
            {bookings.map((b, i) => (
              <tr key={b.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.rowAlt : 'transparent' }}>
                <TD bold C={C}>{b.id}</TD>
                <TD C={C}><span style={{ maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.pickup?.address || '?'} → {b.dropoff?.address || '?'}</span></TD>
                <TD C={C}>{b.cargo?.description || '--'}</TD>
                <TD C={C}><span style={{ textTransform: 'uppercase' }}>{b.truckType}</span></TD>
                <td style={{ padding: '12px 20px' }}><StatusBadge status={b.status} /></td>
                <TD bold align="right" C={C}>{b.fare?.total?.toFixed(2) || '0'}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bookings.length === 0 && <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 13, color: C.muted }}>No rides</div>}
    </Box>
  );
}

/* ═══ Modal Input ═══ */
function ModalInput({ label, value, onChange, placeholder, type, C }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
      <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ''}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );
}

/* ═══ Modal Wrapper ═══ */
function Modal({ open, onClose, title, children, C, isDark }) {
  const mobM = useIsMobile();
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: mobM ? 'flex-end' : 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ position: 'relative', width: mobM ? '100%' : 440, maxHeight: '85vh', overflowY: 'auto', background: C.card, border: `1px solid ${C.border}`, borderRadius: mobM ? '14px 14px 0 0' : 14, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', zIndex: 101 }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: C.card, zIndex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? '#27272A' : '#F1F5F9', border: 'none', cursor: 'pointer', color: C.sub }}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </motion.div>
    </div>
  );
}

/* ═══ Truck Type Config ═══ */
const TRUCK_TYPES = [
  { id: 'small', label: 'Mini Truck (500KG)', payRate: 1.2, basePay: 45, icon: 'minor_crash' },
  { id: 'medium', label: 'Box Truck (2.5T)', payRate: 2.5, basePay: 120, icon: 'local_shipping' },
  { id: 'large', label: 'Heavy Duty (10T+)', payRate: 5.5, basePay: 380, icon: 'rv_hookup' },
];

/* ═══ Drivers ═══ */
function DriversTab({ driversList, C, isDark, mob }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', city: '', truckType: 'medium', make: '', model: '', year: '2024', plateNumber: '', licenseNumber: '', licenseExpiry: '', profilePicture: null, vehiclePicture: null, rcFront: null, rcBack: null, dlFront: null, dlBack: null });
  const [brandOpen, setBrandOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [modelOptions, setModelOptions] = useState([]);
  const [drivers, setDrivers] = useState(driversList);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [viewDriver, setViewDriver] = useState(null);

  useEffect(() => { setDrivers(driversList); }, [driversList]);

  const pendingDrivers = drivers.filter(d => d.approved === false && d.status === 'pending-approval');

  const refreshDrivers = async () => {
    try {
      const res = await fetch('/api/drivers');
      const data = await res.json();
      if (Array.isArray(data)) setDrivers(data);
    } catch (e) { console.error(e); }
  };

  const handleApproval = async (id, approve) => {
    setApprovingId(id);
    try {
      const body = approve
        ? { approved: true }
        : { approved: false, reason: 'Rejected by admin' };
      await fetch(`/api/drivers/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await refreshDrivers();
    } catch (e) { console.error(e); }
    setApprovingId(null);
  };

  const openAdd = () => { setForm({ name: '', phone: '', city: '', truckType: 'medium', make: '', model: '', year: '2024', plateNumber: '', licenseNumber: '', licenseExpiry: '', profilePicture: null, vehiclePicture: null, rcFront: null, rcBack: null, dlFront: null, dlBack: null }); setSelectedBrand(''); setModelOptions([]); setEditDriver(null); setShowAdd(true); };
  const openEdit = (d) => {
    setForm({ name: d.name, phone: d.phone, city: d.city || '', truckType: d.truckType || 'medium', make: d.vehicleDetails?.make || '', model: d.vehicleDetails?.model || '', year: String(d.vehicleDetails?.year || '2024'), plateNumber: d.vehicleDetails?.plateNumber || '', licenseNumber: d.licenseNumber || '', licenseExpiry: d.licenseExpiry || '', profilePicture: d.profilePicture || null, vehiclePicture: d.vehiclePicture || null, rcFront: null, rcBack: null, dlFront: null, dlBack: null });
    setSelectedBrand(d.vehicleDetails?.make || ''); setModelOptions(d.vehicleDetails?.make ? ALL_TRUCK_MODELS.filter(t => t.brand === d.vehicleDetails.make) : []);
    setEditDriver(d); setShowAdd(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const truckInfo = TRUCK_TYPES.find(t => t.id === form.truckType) || TRUCK_TYPES[1];
      // Track which mandatory fields are missing
      const missing = [];
      if (!form.name) missing.push('name');
      if (!form.phone) missing.push('phone');
      if (!form.city) missing.push('city');
      if (!form.licenseNumber) missing.push('licenseNumber');
      if (!form.licenseExpiry) missing.push('licenseExpiry');
      if (!form.make && !form.model) missing.push('vehicleDetails');
      if (!form.plateNumber) missing.push('plateNumber');

      const payload = {
        name: form.name || 'New Driver', phone: form.phone || '', city: form.city || '',
        truckType: form.truckType, payRate: truckInfo.payRate, basePay: truckInfo.basePay,
        licenseNumber: form.licenseNumber, licenseExpiry: form.licenseExpiry,
        vehicleDetails: { make: form.make, model: form.model ? `${form.make} ${form.model}` : '', year: Number(form.year), plateNumber: form.plateNumber, regNumber: form.plateNumber },
        missingFields: missing.length > 0 ? missing : null,
        profileIncomplete: missing.length > 0,
        createdByAdmin: true,
      };
      if (form.profilePicture) payload.profilePicture = form.profilePicture;
      if (form.vehiclePicture) payload.vehiclePicture = form.vehiclePicture;
      if (form.rcFront || form.rcBack || form.dlFront || form.dlBack) {
        payload.uploadedDocuments = {};
        if (form.rcFront) payload.uploadedDocuments.rcFront = form.rcFront;
        if (form.rcBack) payload.uploadedDocuments.rcBack = form.rcBack;
        if (form.dlFront) payload.uploadedDocuments.dlFront = form.dlFront;
        if (form.dlBack) payload.uploadedDocuments.dlBack = form.dlBack;
      }
      if (editDriver) {
        // On edit, recalculate missing
        const updated = await (await fetch(`/api/drivers/${editDriver.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })).json();
        setDrivers(prev => prev.map(d => d.id === editDriver.id ? { ...d, ...updated } : d));
      } else {
        const created = await (await fetch('/api/drivers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })).json();
        setDrivers(prev => [...prev, created]);
      }
      setShowAdd(false);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Search + Add */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Icon name="search" size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input type="text" placeholder="Search by Driver ID, name, or phone..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#F8FAFC', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2 }}>
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: C.accent, color: isDark ? '#000' : '#fff', flexShrink: 0 }}>
          <Icon name="person_add" size={16} /> Add
        </button>
      </div>

      {/* Pending Approvals */}
      {pendingDrivers.length > 0 && (
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: mob ? 16 : 20, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Icon name="pending_actions" size={22} style={{ color: isDark ? '#FBBF24' : '#F59E0B' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Pending Approvals</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
              background: isDark ? 'rgba(251,191,36,0.15)' : '#FEF3C7',
              color: isDark ? '#FBBF24' : '#B45309',
            }}>{pendingDrivers.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {pendingDrivers.map(pd => (
              <div key={pd.id} style={{
                borderRadius: 12, border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A'}`,
                background: isDark ? 'rgba(251,191,36,0.04)' : '#FFFEF5', padding: 16,
              }}>
                {/* Header: picture + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  {pd.profilePicture ? (
                    <img src={pd.profilePicture.startsWith('data:') ? pd.profilePicture : pd.profilePicture}
                      alt={pd.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: `1px solid ${C.border}` }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(52,211,153,0.1)' : '#ECFDF5' }}>
                      <Icon name="person" filled size={22} style={{ color: isDark ? '#34D399' : '#10B981' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pd.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{pd.phone}</div>
                  </div>
                  {pd.city && <span style={{ fontSize: 11, fontWeight: 600, color: C.sub, background: isDark ? '#27272A' : '#F1F5F9', padding: '3px 8px', borderRadius: 6 }}>{pd.city}</span>}
                </div>

                {/* Vehicle info */}
                {(pd.vehicleDetails || pd.vehicleType) && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: isDark ? '#27272A' : '#F8FAFC', border: `1px solid ${C.border}`, marginBottom: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Vehicle Info</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                      {pd.vehicleType && <span>{pd.vehicleType} </span>}
                      {pd.vehicleDetails?.model && <span>- {pd.vehicleDetails.model} </span>}
                      {pd.vehicleDetails?.make && <span>({pd.vehicleDetails.make})</span>}
                    </div>
                    {(pd.vehicleDetails?.plateNumber || pd.registrationNumber) && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Reg: {pd.vehicleDetails?.plateNumber || pd.registrationNumber}</div>
                    )}
                  </div>
                )}

                {/* License info */}
                {(pd.licenseNumber || pd.licenseExpiry) && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: isDark ? '#27272A' : '#F8FAFC', border: `1px solid ${C.border}`, marginBottom: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>License</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {pd.licenseNumber && <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{pd.licenseNumber}</span>}
                      {pd.licenseExpiry && <span style={{ fontSize: 11, color: C.muted }}>Exp: {new Date(pd.licenseExpiry).toLocaleDateString()}</span>}
                    </div>
                  </div>
                )}

                {/* Vehicle picture */}
                {pd.vehiclePicture && (
                  <div style={{ marginBottom: 10 }}>
                    <img src={pd.vehiclePicture.startsWith('data:') ? pd.vehiclePicture : pd.vehiclePicture}
                      alt="Vehicle" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}` }} />
                  </div>
                )}

                {/* Applied date */}
                {(pd.appliedAt || pd.appliedDate) && (
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="calendar_today" size={13} /> Applied: {new Date(pd.appliedAt || pd.appliedDate).toLocaleDateString()}
                  </div>
                )}

                {/* Approve / Reject buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handleApproval(pd.id, true)}
                    disabled={approvingId === pd.id}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, background: '#10B981', color: '#fff',
                      opacity: approvingId === pd.id ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                    <Icon name="check_circle" size={16} /> Approve
                  </button>
                  <button
                    onClick={() => handleApproval(pd.id, false)}
                    disabled={approvingId === pd.id}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, background: '#EF4444', color: '#fff',
                      opacity: approvingId === pd.id ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                    <Icon name="cancel" size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {drivers.filter(d => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          return (d.id?.toLowerCase().includes(q) || d.name?.toLowerCase().includes(q) || d.phone?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) || d.city?.toLowerCase().includes(q) || d.licenseNumber?.toLowerCase().includes(q) || d.vehicleDetails?.plateNumber?.toLowerCase().includes(q));
        }).map(d => (
          <Box key={d.id} C={C}>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isDark ? 'rgba(52,211,153,0.1)' : '#ECFDF5' }}>
                  <Icon name="person" filled size={22} style={{ color: isDark ? '#34D399' : '#10B981' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>ID: {d.id}</div>
                </div>
                <StatusBadge status={d.status} />
              </div>
              {/* Truck Type & Pay */}
              {(() => {
                const tt = TRUCK_TYPES.find(t => t.id === d.truckType) || TRUCK_TYPES.find(t => t.id === 'medium');
                return (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: isDark ? '#27272A' : '#F8FAFC', border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Truck Type</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name={tt.icon} filled size={16} style={{ color: C.accent }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{tt.label.split('(')[0].trim()}</span>
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: isDark ? 'rgba(255,215,0,0.06)' : '#FFFBEB', border: `1px solid ${isDark ? 'rgba(255,215,0,0.15)' : '#FEF3C7'}`, minWidth: 90 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Pay Rate</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#FFD700' : '#F59E0B' }}>{d.payRate || tt.payRate}/km</div>
                    </div>
                  </div>
                );
              })()}
              {/* Vehicle info */}
              {d.vehicleDetails?.make && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: isDark ? '#27272A' : '#F8FAFC', marginBottom: 14, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Vehicle (Owner: {d.name})</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{d.vehicleDetails.make} {d.vehicleDetails.model} ({d.vehicleDetails.year})</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{d.vehicleDetails.plateNumber}</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                {[{ l: 'Rating', v: d.rating, star: true }, { l: 'Base Pay', v: `₹${d.basePay || (TRUCK_TYPES.find(t => t.id === d.truckType) || TRUCK_TYPES[1]).basePay}` }, { l: 'Earned', v: `₹${d.earnings?.toLocaleString() || '0'}` }].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.l}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                      {s.star && <Icon name="star" filled size={14} style={{ color: '#FBBF24' }} />}{s.v}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="local_shipping" size={14} />{d.truckId || 'N/A'}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setViewDriver(d)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: isDark ? '#60A5FA' : '#3B82F6' }}>
                    <Icon name="visibility" size={14} /> View
                  </button>
                  <button onClick={() => openEdit(d)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: C.accent }}>
                    <Icon name="edit" size={14} /> Edit
                  </button>
                </div>
              </div>
            </div>
          </Box>
        ))}
        {drivers.length === 0 && <div style={{ gridColumn: '1/-1', padding: '48px 0', textAlign: 'center', fontSize: 13, color: C.muted }}>No drivers</div>}
        {drivers.length > 0 && searchQuery && drivers.filter(d => { const q = searchQuery.toLowerCase(); return (d.id?.toLowerCase().includes(q) || d.name?.toLowerCase().includes(q) || d.phone?.replace(/\D/g, '').includes(q.replace(/\D/g, ''))); }).length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '40px 0', textAlign: 'center' }}>
            <Icon name="search_off" size={36} style={{ color: C.muted, marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: C.muted }}>No driver found for "{searchQuery}"</div>
          </div>
        )}
      </div>

      {/* View Driver Detail Modal */}
      <AnimatePresence>
        {viewDriver && (
          <Modal open={!!viewDriver} onClose={() => setViewDriver(null)} title={`Driver: ${viewDriver.name}`} C={C} isDark={isDark}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {viewDriver.profilePicture ? (
                  <img src={viewDriver.profilePicture} alt={viewDriver.name} style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: `2px solid ${C.border}` }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(52,211,153,0.1)' : '#ECFDF5' }}>
                    <Icon name="person" filled size={32} style={{ color: isDark ? '#34D399' : '#10B981' }} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{viewDriver.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>ID: {viewDriver.id}</div>
                  <div style={{ marginTop: 4 }}><StatusBadge status={viewDriver.status} /></div>
                </div>
              </div>

              {/* Contact & Location */}
              <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#27272A' : '#F8FAFC', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Contact & Location</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><span style={{ fontSize: 10, color: C.muted }}>Phone</span><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{viewDriver.phone || '—'}</div></div>
                  <div><span style={{ fontSize: 10, color: C.muted }}>City</span><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{viewDriver.city || '—'}</div></div>
                </div>
              </div>

              {/* Vehicle Details */}
              <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#27272A' : '#F8FAFC', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Vehicle Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><span style={{ fontSize: 10, color: C.muted }}>Type</span><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{viewDriver.vehicleDetails?.type || viewDriver.truckType || '—'}</div></div>
                  <div><span style={{ fontSize: 10, color: C.muted }}>Brand</span><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{viewDriver.vehicleDetails?.make || '—'}</div></div>
                  <div><span style={{ fontSize: 10, color: C.muted }}>Model</span><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{viewDriver.vehicleDetails?.model || '—'}</div></div>
                  <div><span style={{ fontSize: 10, color: C.muted }}>Year</span><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{viewDriver.vehicleDetails?.year || '—'}</div></div>
                  <div style={{ gridColumn: '1 / -1' }}><span style={{ fontSize: 10, color: C.muted }}>Registration Number</span><div style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: '0.05em' }}>{viewDriver.vehicleDetails?.regNumber || viewDriver.vehicleDetails?.plateNumber || '—'}</div></div>
                </div>
              </div>

              {/* License Details */}
              <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#27272A' : '#F8FAFC', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>License Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><span style={{ fontSize: 10, color: C.muted }}>License Number</span><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{viewDriver.licenseNumber || '—'}</div></div>
                  <div><span style={{ fontSize: 10, color: C.muted }}>Expiry Date</span><div style={{ fontSize: 13, fontWeight: 600, color: viewDriver.licenseExpiry && new Date(viewDriver.licenseExpiry) < new Date() ? '#EF4444' : C.text }}>{viewDriver.licenseExpiry ? new Date(viewDriver.licenseExpiry).toLocaleDateString() : '—'}</div></div>
                </div>
              </div>

              {/* Performance */}
              <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#27272A' : '#F8FAFC', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Performance</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div><span style={{ fontSize: 10, color: C.muted }}>Rating</span><div style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#FFD700' : '#F59E0B', display: 'flex', alignItems: 'center', gap: 3 }}><Icon name="star" filled size={14} />{viewDriver.rating || 0}</div></div>
                  <div><span style={{ fontSize: 10, color: C.muted }}>Earnings</span><div style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>₹{viewDriver.earnings?.toLocaleString() || '0'}</div></div>
                  <div><span style={{ fontSize: 10, color: C.muted }}>Trips</span><div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{viewDriver.stats?.totalTrips || 0}</div></div>
                </div>
              </div>

              {/* Photos & Documents */}
              {(viewDriver.vehiclePicture || viewDriver.uploadedDocuments) && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Photos & Documents</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {viewDriver.vehiclePicture && (
                      <div>
                        <img src={viewDriver.vehiclePicture} alt="Vehicle" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}` }} />
                        <div style={{ fontSize: 9, color: C.muted, marginTop: 3, textAlign: 'center', fontWeight: 600 }}>Vehicle</div>
                      </div>
                    )}
                    {viewDriver.uploadedDocuments?.rcFront && (
                      <div>
                        <img src={viewDriver.uploadedDocuments.rcFront} alt="RC Front" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}` }} />
                        <div style={{ fontSize: 9, color: C.muted, marginTop: 3, textAlign: 'center', fontWeight: 600 }}>RC Front</div>
                      </div>
                    )}
                    {viewDriver.uploadedDocuments?.rcBack && (
                      <div>
                        <img src={viewDriver.uploadedDocuments.rcBack} alt="RC Back" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}` }} />
                        <div style={{ fontSize: 9, color: C.muted, marginTop: 3, textAlign: 'center', fontWeight: 600 }}>RC Back</div>
                      </div>
                    )}
                    {viewDriver.uploadedDocuments?.dlFront && (
                      <div>
                        <img src={viewDriver.uploadedDocuments.dlFront} alt="DL Front" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}` }} />
                        <div style={{ fontSize: 9, color: C.muted, marginTop: 3, textAlign: 'center', fontWeight: 600 }}>DL Front</div>
                      </div>
                    )}
                    {viewDriver.uploadedDocuments?.dlBack && (
                      <div>
                        <img src={viewDriver.uploadedDocuments.dlBack} alt="DL Back" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}` }} />
                        <div style={{ fontSize: 9, color: C.muted, marginTop: 3, textAlign: 'center', fontWeight: 600 }}>DL Back</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div style={{ paddingTop: 8, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(viewDriver.appliedAt || viewDriver.appliedDate) && (
                  <div style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="calendar_today" size={13} /> Registered: {new Date(viewDriver.appliedAt || viewDriver.appliedDate).toLocaleDateString()}
                  </div>
                )}
                {viewDriver.lastEditedAt && (
                  <div style={{ fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="edit_note" size={13} /> Last edited: {new Date(viewDriver.lastEditedAt).toLocaleString()}
                    {viewDriver.lastEditedFields?.length > 0 && <span style={{ fontWeight: 600 }}> ({viewDriver.lastEditedFields.join(', ')})</span>}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAdd && (
          <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editDriver ? `Edit Driver: ${editDriver.name}` : 'Add New Driver'} C={C} isDark={isDark}>
            {/* Info banner */}
            {!editDriver && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF', border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE'}`, marginBottom: 14, fontSize: 11, color: isDark ? '#60A5FA' : '#2563EB', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="info" size={14} /> All fields optional. Driver will be notified to complete missing details.
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Personal Info</div>
            <ModalInput label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Driver name" C={C} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ModalInput label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+91 9876543210" C={C} />
              <ModalInput label="City" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} placeholder="e.g. Mumbai" C={C} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 14 }}>License Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ModalInput label="License Number" value={form.licenseNumber} onChange={v => setForm(f => ({ ...f, licenseNumber: v }))} placeholder="TN01 20190012345" C={C} />
              <ModalInput label="License Expiry" value={form.licenseExpiry} onChange={v => setForm(f => ({ ...f, licenseExpiry: v }))} placeholder="" type="date" C={C} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 14 }}>Truck & Vehicle</div>

            {/* Truck Type Select */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Truck Type</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {TRUCK_TYPES.map(tt => {
                  const selected = form.truckType === tt.id;
                  return (
                    <button key={tt.id} onClick={() => setForm(f => ({ ...f, truckType: tt.id }))}
                      style={{
                        flex: 1, padding: '10px 6px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                        border: selected ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                        background: selected ? C.accentBg : 'transparent',
                      }}>
                      <Icon name={tt.icon} filled size={18} style={{ color: selected ? C.accent : C.muted, display: 'block', margin: '0 auto 4px' }} />
                      <div style={{ fontSize: 10, fontWeight: 600, color: selected ? C.text : C.sub }}>{tt.id.charAt(0).toUpperCase() + tt.id.slice(1)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vehicle Brand - button grid */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Vehicle Brand</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {Object.keys(INDIAN_TRUCKS).map(brand => {
                  const sel = selectedBrand === brand;
                  return (
                    <button key={brand} onClick={() => { setSelectedBrand(brand); setForm(f => ({ ...f, make: brand, model: '' })); setModelOptions(ALL_TRUCK_MODELS.filter(t => t.brand === brand)); }}
                      style={{ padding: '8px 4px', borderRadius: 6, cursor: 'pointer', textAlign: 'center', border: sel ? `2px solid ${C.accent}` : `1px solid ${C.border}`, background: sel ? C.accentBg : 'transparent', fontSize: 10, fontWeight: sel ? 700 : 500, color: sel ? C.accent : C.text }}>
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vehicle Model - list from selected brand */}
            {modelOptions.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Vehicle Model {form.model && <span style={{ color: C.accent }}>✓ {form.make} {form.model}</span>}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
                  {modelOptions.map((t, i) => {
                    const sel = form.model === t.model;
                    return (
                      <button key={i} onClick={() => setForm(f => ({ ...f, model: t.model }))}
                        style={{ padding: '8px 6px', borderRadius: 6, cursor: 'pointer', textAlign: 'left', border: sel ? `2px solid ${C.accent}` : `1px solid ${C.border}`, background: sel ? C.accentBg : 'transparent', fontSize: 11, fontWeight: sel ? 700 : 500, color: sel ? C.accent : C.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="local_shipping" size={12} style={{ color: sel ? C.accent : C.muted }} /> {t.model}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ModalInput label="Year" value={form.year} onChange={v => setForm(f => ({ ...f, year: v }))} placeholder="2024" type="number" C={C} />
              <ModalInput label="Reg Number" value={form.plateNumber} onChange={v => setForm(f => ({ ...f, plateNumber: v }))} placeholder="MH 04 AB 1234" C={C} />
            </div>

            {/* Document Uploads */}
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 14 }}>Documents & Photos</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { key: 'profilePicture', label: 'Profile', icon: 'person' },
                { key: 'vehiclePicture', label: 'Vehicle', icon: 'directions_car' },
                { key: 'rcFront', label: 'RC Front', icon: 'description' },
                { key: 'rcBack', label: 'RC Back', icon: 'flip' },
                { key: 'dlFront', label: 'DL Front', icon: 'badge' },
                { key: 'dlBack', label: 'DL Back', icon: 'flip' },
              ].map(doc => (
                <div key={doc.key} style={{ textAlign: 'center' }}>
                  <input type="file" accept="image/*" id={`admin-${doc.key}`} style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => setForm(prev => ({ ...prev, [doc.key]: r.result })); r.readAsDataURL(f); }} />
                  {form[doc.key] ? (
                    <div style={{ position: 'relative' }}>
                      <img src={form[doc.key]} alt={doc.label} style={{ width: '100%', height: 56, objectFit: 'cover', borderRadius: 8, border: `2px solid ${C.accent}` }} />
                      <button onClick={() => setForm(f => ({ ...f, [doc.key]: null }))}
                        style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, background: '#EF4444', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0 }}>
                        <Icon name="close" size={10} />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor={`admin-${doc.key}`}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 4px', borderRadius: 8, border: `1.5px dashed ${C.border}`, cursor: 'pointer', background: 'transparent' }}>
                      <Icon name={doc.icon} size={18} style={{ color: C.muted }} />
                    </label>
                  )}
                  <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, marginTop: 3 }}>{doc.label}</div>
                </div>
              ))}
            </div>

            {/* Missing fields warning */}
            {!editDriver && (() => {
              const m = [];
              if (!form.name) m.push('Name');
              if (!form.phone) m.push('Phone');
              if (!form.licenseNumber) m.push('License');
              if (!form.plateNumber) m.push('Reg Number');
              if (m.length === 0) return null;
              return (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(251,191,36,0.08)' : '#FFFBEB', border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A'}`, marginTop: 10, fontSize: 11, color: isDark ? '#FBBF24' : '#92400E', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <Icon name="warning" size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Missing: {m.join(', ')}. Driver will be notified daily to complete these.</span>
                </div>
              );
            })()}

            <button onClick={handleSave} disabled={saving}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, marginTop: 12, background: C.accent, color: isDark ? '#000' : '#fff', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : editDriver ? 'Update Driver' : 'Add Driver'}
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══ Trucks ═══ */
function TrucksTab({ trucksList, C, isDark, mob }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editTruck, setEditTruck] = useState(null);
  const [form, setForm] = useState({ label: '', capacity: '', price: '', kmCharge: '', icon: 'local_shipping', ownerName: '' });
  const [truckItems, setTruckItems] = useState(trucksList);
  const [driverNames, setDriverNames] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { setTruckItems(trucksList); }, [trucksList]);

  // Fetch driver names for owner display
  useEffect(() => {
    fetch('/api/drivers').then(r => r.json()).then(drivers => {
      if (!Array.isArray(drivers)) return;
      const map = {};
      drivers.forEach(d => { if (d.truckId) map[d.truckId] = d.name; });
      setDriverNames(map);
    }).catch(() => { });
  }, []);

  const openAdd = () => { setForm({ label: '', capacity: '', price: '', kmCharge: '', icon: 'local_shipping', ownerName: '' }); setEditTruck(null); setShowAdd(true); };
  const openEdit = (t) => {
    setForm({ label: t.label, capacity: t.capacity, price: String(t.price), kmCharge: String(t.kmCharge), icon: t.icon || 'local_shipping', ownerName: '' });
    setEditTruck(t); setShowAdd(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { label: form.label, capacity: form.capacity, price: Number(form.price), kmCharge: Number(form.kmCharge), icon: form.icon };
      if (editTruck) {
        const updated = await (await fetch(`/api/trucks/${editTruck.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })).json();
        setTruckItems(prev => prev.map(t => t.id === editTruck.id ? { ...t, ...updated } : t));
      } else {
        const created = await (await fetch('/api/trucks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id: form.label.toLowerCase().replace(/\s+/g, '-'), active: true }) })).json();
        setTruckItems(prev => [...prev, created]);
      }
      setShowAdd(false);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: C.accent, color: isDark ? '#000' : '#fff', boxShadow: `0 2px 10px ${C.accent}40` }}>
          <Icon name="add" size={18} /> Add Truck
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {truckItems.map(t => {
          const ownerName = driverNames[t.id] || Object.entries(driverNames).find(([tid]) => tid.toLowerCase().includes(t.id))?.[1] || null;
          return (
            <Box key={t.id} C={C}>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isDark ? 'rgba(251,191,36,0.1)' : '#FFFBEB' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1", color: isDark ? '#FBBF24' : '#F59E0B' }}>{t.icon || 'local_shipping'}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{t.id} · {t.capacity}</div>
                  </div>
                </div>
                {/* Owner info */}
                {ownerName && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: isDark ? '#27272A' : '#F8FAFC', marginBottom: 14, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="person" filled size={14} style={{ color: C.accent }} />
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Owner / Assigned Driver</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{ownerName}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Base</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.accent, marginTop: 4 }}>{t.price}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Per KM</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginTop: 4 }}>{t.kmCharge}</div>
                  </div>
                </div>
                {/* Edit button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <button onClick={() => openEdit(t)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: C.accent }}>
                    <Icon name="edit" size={14} /> Edit
                  </button>
                </div>
              </div>
            </Box>
          );
        })}
        {truckItems.length === 0 && <div style={{ gridColumn: '1/-1', padding: '48px 0', textAlign: 'center', fontSize: 13, color: C.muted }}>No trucks</div>}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAdd && (
          <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editTruck ? `Edit: ${editTruck.label}` : 'Add New Truck'} C={C} isDark={isDark}>
            <ModalInput label="Truck Name" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder="Mini Truck" C={C} />
            <ModalInput label="Capacity" value={form.capacity} onChange={v => setForm(f => ({ ...f, capacity: v }))} placeholder="500KG" C={C} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ModalInput label="Base Price ($)" value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} placeholder="45" type="number" C={C} />
              <ModalInput label="Per KM ($)" value={form.kmCharge} onChange={v => setForm(f => ({ ...f, kmCharge: v }))} placeholder="1.2" type="number" C={C} />
            </div>
            <ModalInput label="Icon (Material Symbol)" value={form.icon} onChange={v => setForm(f => ({ ...f, icon: v }))} placeholder="local_shipping" C={C} />
            <button onClick={handleSave} disabled={saving || !form.label || !form.capacity}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, marginTop: 10, background: (!form.label || !form.capacity) ? C.muted : C.accent, color: isDark ? '#000' : '#fff', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : editTruck ? 'Update Truck' : 'Add Truck'}
            </button>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Pricing Settings ── */}
      <PricingSection C={C} isDark={isDark} mob={mob} />
    </div>
  );
}

/* ═══ Pricing Section (inside Trucks tab) ═══ */
function PricingSection({ C, isDark, mob }) {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/pricing/config').then(r => r.json()).then(setConfig).catch(() => { });
  }, []);

  if (!config) return null;

  const update = (section, key, value) => {
    setConfig(prev => ({ ...prev, [section]: { ...prev[section], [key]: Number(value) || 0 } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/pricing/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handlingLabels = { standard: 'Standard', fragile: 'Fragile', hazmat: 'Hazardous', temperature: 'Temperature', oversized: 'Oversized' };
  const handlingIcons = { standard: 'inventory_2', fragile: 'warning', hazmat: 'science', temperature: 'thermostat', oversized: 'open_in_full' };
  const weightLabels = { below500: '< 500 KG', above500: '500-2000 KG', above2000: '2000-5000 KG', above5000: '> 5000 KG' };
  const priorityLabels = { standard: 'Standard', express: 'Express', urgent: 'Urgent' };

  const PriceCell = ({ label, value, onChange }) => (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, marginBottom: 3 }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: C.muted }}>₹</span>
        <input type="number" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '7px 7px 7px 22px', borderRadius: 6, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#F8FAFC', color: C.text, fontSize: 13, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
      </div>
    </div>
  );

  return (
    <div>
      {/* Toggle header */}
      <button onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', marginBottom: expanded ? 14 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(249,115,22,0.1)' : '#FFF7ED' }}>
            <Icon name="currency_rupee" size={16} style={{ color: isDark ? '#FB923C' : '#F97316' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Pricing Settings</div>
            <div style={{ fontSize: 10, color: C.muted }}>Handling, weight, priority & surge charges</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saved && <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981' }}>Saved!</span>}
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size={20} style={{ color: C.muted }} />
        </div>
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Handling Charges */}
          <Box C={C}>
            <div style={{ padding: mob ? 14 : 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="inventory_2" size={14} style={{ color: isDark ? '#FB923C' : '#F97316' }} /> Handling Charges
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 10 }}>
                {Object.entries(config.handlingCharges || {}).map(([key, val]) => (
                  <div key={key} style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#FAFAFA', textAlign: 'center' }}>
                    <Icon name={handlingIcons[key] || 'package'} size={16} style={{ color: isDark ? '#FB923C' : '#F97316', marginBottom: 4 }} />
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.text, marginBottom: 6 }}>{handlingLabels[key] || key}</div>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: C.muted }}>₹</span>
                      <input type="number" value={val} onChange={e => update('handlingCharges', key, e.target.value)}
                        style={{ width: '100%', padding: '6px 6px 6px 18px', borderRadius: 6, border: `1px solid ${C.border}`, background: isDark ? '#18181B' : '#fff', color: C.text, fontSize: 13, fontWeight: 800, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Box>

          {/* Weight & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 14 }}>
            <Box C={C}>
              <div style={{ padding: mob ? 14 : 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="scale" size={14} style={{ color: isDark ? '#A78BFA' : '#8B5CF6' }} /> Weight Surcharges
                </div>
                {Object.entries(config.weightCharges || {}).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: C.text }}>{weightLabels[key] || key}</span>
                    <div style={{ width: 80 }}><PriceCell label="" value={val} onChange={v => update('weightCharges', key, v)} /></div>
                  </div>
                ))}
              </div>
            </Box>
            <Box C={C}>
              <div style={{ padding: mob ? 14 : 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="bolt" size={14} style={{ color: isDark ? '#F472B6' : '#EC4899' }} /> Priority Multipliers
                </div>
                {Object.entries(config.priorityMultipliers || {}).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: C.text }}>{priorityLabels[key] || key}</span>
                    <input type="number" step="0.1" value={val} onChange={e => update('priorityMultipliers', key, e.target.value)}
                      style={{ width: 60, padding: '6px', borderRadius: 6, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#F8FAFC', color: C.text, fontSize: 12, fontWeight: 700, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
                    <span style={{ fontSize: 10, color: C.muted }}>×</span>
                  </div>
                ))}
              </div>
            </Box>
          </div>

          {/* Surge & Min Fare */}
          <Box C={C}>
            <div style={{ padding: mob ? 14 : 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="tune" size={14} style={{ color: isDark ? '#22D3EE' : '#06B6D4' }} /> Commission & Surge
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 120 }}><PriceCell label="Minimum Fare" value={config.commission?.minimumFare || 50} onChange={v => update('commission', 'minimumFare', v)} /></div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, marginBottom: 3 }}>Surge Multiplier</div>
                  <input type="number" step="0.1" value={config.commission?.surgeMultiplier || 1.5} onChange={e => update('commission', 'surgeMultiplier', e.target.value)}
                    style={{ width: '100%', padding: '7px', borderRadius: 6, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#F8FAFC', color: C.text, fontSize: 13, fontWeight: 700, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ fontSize: 10, color: isDark ? '#FBBF24' : '#92400E', background: isDark ? 'rgba(255,215,0,0.05)' : '#FFFBEB', padding: '6px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="info" size={12} /> Peak hours: {(config.commission?.peakHours || []).join(', ')}h
              </div>
            </div>
          </Box>

          {/* Save button */}
          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: saved ? '#10B981' : (isDark ? '#FB923C' : '#F97316'), color: '#fff', opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name={saved ? 'check_circle' : 'save'} size={16} />
            {saving ? 'Saving...' : saved ? 'All Prices Saved!' : 'Save Pricing Settings'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══ Users ═══ */
function UsersTab({ users, C, isDark }) {
  return (
    <Box C={C}>
      <BoxHead title="Customers" icon="group" iconColor={isDark ? '#F472B6' : '#EC4899'} iconBg={isDark ? 'rgba(244,114,182,0.1)' : '#FDF2F8'} right={`${users.length} users`} C={C} />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead><tr style={{ borderBottom: `1px solid ${C.border}`, background: C.rowAlt }}>
            <TH C={C}>ID</TH><TH C={C}>Name</TH><TH C={C}>Email</TH><TH C={C}>Bookings</TH><TH C={C}>Standing</TH>
          </tr></thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.rowAlt : 'transparent' }}>
                <TD bold C={C}>{u.id}</TD>
                <TD bold C={C}>{u.name}</TD>
                <TD C={C}>{u.email || '--'}</TD>
                <TD C={C}>{u.bookings} trips</TD>
                <td style={{ padding: '12px 20px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: u.standing === 'Elite' ? C.accentBg : C.rowAlt, color: u.standing === 'Elite' ? C.accent : C.muted }}>{u.standing}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 13, color: C.muted }}>No users</div>}
    </Box>
  );
}

/* ═══ Payments ═══ */
function PaymentsTab({ paymentsList, C, isDark }) {
  const total = paymentsList.reduce((s, p) => s + (p.amount || 0), 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Total */}
      <Box C={C}>
        <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg }}>
              <Icon name="payments" filled size={22} style={{ color: C.accent }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>Total Revenue</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>{total.toLocaleString()}</div>
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, padding: '4px 10px', borderRadius: 6, background: C.rowAlt }}>{paymentsList.length} transactions</span>
        </div>
      </Box>
      {/* Table */}
      <Box C={C}>
        <BoxHead title="Payment History" icon="receipt_long" iconColor={isDark ? '#22D3EE' : '#06B6D4'} iconBg={isDark ? 'rgba(34,211,238,0.1)' : '#ECFEFF'} C={C} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead><tr style={{ borderBottom: `1px solid ${C.border}`, background: C.rowAlt }}>
              <TH C={C}>ID</TH><TH C={C}>Booking</TH><TH C={C}>Method</TH><TH C={C}>Date</TH><TH C={C}>Status</TH><TH align="right" C={C}>Amount</TH>
            </tr></thead>
            <tbody>
              {paymentsList.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.rowAlt : 'transparent' }}>
                  <TD bold C={C}>{p.id}</TD>
                  <TD C={C}>{p.bookingId}</TD>
                  <TD C={C}><span style={{ textTransform: 'uppercase' }}>{p.method}</span></TD>
                  <TD C={C}>{p.date}</TD>
                  <td style={{ padding: '12px 20px' }}><StatusBadge status={p.status === 'completed' ? 'completed' : 'confirmed'} /></td>
                  <TD accent bold align="right" C={C}>{p.amount?.toFixed(2)}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {paymentsList.length === 0 && <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 13, color: C.muted }}>No payments</div>}
      </Box>
    </div>
  );
}

/* ═══ Pricing (legacy - merged into TrucksTab) ═══ */
function PricingTab_unused({ C, isDark, mob }) {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/pricing/config').then(r => r.json()).then(setConfig).catch(() => { });
  }, []);

  if (!config) return <div style={{ padding: 48, textAlign: 'center', color: C.muted }}>Loading pricing config...</div>;

  const update = (section, key, value) => {
    setConfig(prev => ({ ...prev, [section]: { ...prev[section], [key]: Number(value) || 0 } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/pricing/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const PriceInput = ({ label, value, onChange, icon, desc }) => (
    <div style={{ flex: 1, minWidth: mob ? '100%' : 140 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon && <Icon name={icon} size={12} style={{ color: C.accent }} />}
        {label}
      </div>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: C.muted }}>₹</span>
        <input type="number" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '10px 10px 10px 26px', borderRadius: 8, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#F8FAFC', color: C.text, fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
      </div>
      {desc && <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{desc}</div>}
    </div>
  );

  const MultInput = ({ label, value, onChange }) => (
    <div style={{ flex: 1, minWidth: mob ? '100%' : 120 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <input type="number" step="0.1" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#F8FAFC', color: C.text, fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
    </div>
  );

  const handlingLabels = { standard: 'Standard', fragile: 'Fragile', hazmat: 'Hazardous', temperature: 'Temperature', oversized: 'Oversized' };
  const handlingIcons = { standard: 'inventory_2', fragile: 'warning', hazmat: 'science', temperature: 'thermostat', oversized: 'open_in_full' };
  const weightLabels = { below500: 'Below 500 KG', above500: '500 - 2000 KG', above2000: '2000 - 5000 KG', above5000: 'Above 5000 KG' };
  const priorityLabels = { standard: 'Standard', express: 'Express', urgent: 'Urgent' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Save button bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: C.muted }}>All prices in ₹ (INR). Changes reflect on user booking estimates.</div>
        <button onClick={handleSave} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: saved ? '#10B981' : C.accent, color: isDark ? '#000' : '#fff', opacity: saving ? 0.6 : 1 }}>
          <Icon name={saved ? 'check_circle' : 'save'} size={16} />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Prices'}
        </button>
      </div>

      {/* Truck Pricing */}
      <Box C={C}>
        <BoxHead title="Truck Pricing" icon="local_shipping" iconColor={isDark ? '#FBBF24' : '#F59E0B'} iconBg={isDark ? 'rgba(251,191,36,0.1)' : '#FFFBEB'} right={`${config.trucks?.length || 0} types`} C={C} />
        <div style={{ padding: mob ? 14 : 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {(config.trucks || []).map(t => (
              <div key={t.id} style={{ padding: 16, borderRadius: 12, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#FAFAFA' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(251,191,36,0.1)' : '#FFFBEB' }}>
                    <Icon name={t.icon || 'local_shipping'} filled size={18} style={{ color: isDark ? '#FBBF24' : '#F59E0B' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{t.capacity}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <PriceInput label="Base Fare" value={t.price} onChange={v => {
                    setConfig(prev => ({ ...prev, trucks: prev.trucks.map(tr => tr.id === t.id ? { ...tr, price: Number(v) || 0 } : tr) }));
                    setSaved(false);
                  }} desc="Starting price" />
                  <PriceInput label="Per KM" value={t.kmCharge} onChange={v => {
                    setConfig(prev => ({ ...prev, trucks: prev.trucks.map(tr => tr.id === t.id ? { ...tr, kmCharge: Number(v) || 0 } : tr) }));
                    setSaved(false);
                  }} desc="Distance rate" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Box>

      {/* Handling Charges */}
      <Box C={C}>
        <BoxHead title="Handling Charges" icon="inventory_2" iconColor={isDark ? '#FB923C' : '#F97316'} iconBg={isDark ? 'rgba(249,115,22,0.1)' : '#FFF7ED'} C={C} />
        <div style={{ padding: mob ? 14 : 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {Object.entries(config.handlingCharges || {}).map(([key, val]) => (
              <div key={key} style={{ padding: 14, borderRadius: 10, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#FAFAFA', textAlign: 'center' }}>
                <Icon name={handlingIcons[key] || 'package'} size={20} style={{ color: isDark ? '#FB923C' : '#F97316', marginBottom: 6 }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 8 }}>{handlingLabels[key] || key}</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: C.muted }}>₹</span>
                  <input type="number" value={val} onChange={e => update('handlingCharges', key, e.target.value)}
                    style={{ width: '100%', padding: '8px 8px 8px 22px', borderRadius: 8, border: `1px solid ${C.border}`, background: isDark ? '#18181B' : '#fff', color: C.text, fontSize: 15, fontWeight: 800, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Box>

      {/* Weight & Priority side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 16 }}>
        {/* Weight Charges */}
        <Box C={C}>
          <BoxHead title="Weight Surcharges" icon="scale" iconColor={isDark ? '#A78BFA' : '#8B5CF6'} iconBg={isDark ? 'rgba(167,139,250,0.1)' : '#F5F3FF'} C={C} />
          <div style={{ padding: mob ? 14 : 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(config.weightCharges || {}).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.text }}>{weightLabels[key] || key}</span>
                <div style={{ width: 100, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: C.muted }}>₹</span>
                  <input type="number" value={val} onChange={e => update('weightCharges', key, e.target.value)}
                    style={{ width: '100%', padding: '8px 8px 8px 22px', borderRadius: 8, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#F8FAFC', color: C.text, fontSize: 13, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            ))}
          </div>
        </Box>

        {/* Priority Multipliers */}
        <Box C={C}>
          <BoxHead title="Priority Multipliers" icon="bolt" iconColor={isDark ? '#F472B6' : '#EC4899'} iconBg={isDark ? 'rgba(244,114,182,0.1)' : '#FDF2F8'} C={C} />
          <div style={{ padding: mob ? 14 : 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(config.priorityMultipliers || {}).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.text }}>{priorityLabels[key] || key}</span>
                <div style={{ width: 80 }}>
                  <input type="number" step="0.1" value={val} onChange={e => update('priorityMultipliers', key, e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#F8FAFC', color: C.text, fontSize: 13, fontWeight: 700, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
                </div>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>×</span>
              </div>
            ))}
          </div>
        </Box>
      </div>

      {/* Commission & Surge */}
      <Box C={C}>
        <BoxHead title="Commission & Surge" icon="tune" iconColor={isDark ? '#22D3EE' : '#06B6D4'} iconBg={isDark ? 'rgba(34,211,238,0.1)' : '#ECFEFF'} C={C} />
        <div style={{ padding: mob ? 14 : 20 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <PriceInput label="Minimum Fare" value={config.commission?.minimumFare || 50} onChange={v => update('commission', 'minimumFare', v)} icon="price_check" desc="Floor price for any booking" />
            <MultInput label="Surge Multiplier" value={config.commission?.surgeMultiplier || 1.5} onChange={v => update('commission', 'surgeMultiplier', v)} />
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: isDark ? 'rgba(255,215,0,0.05)' : '#FFFBEB', border: `1px solid ${isDark ? 'rgba(255,215,0,0.15)' : '#FDE68A'}`, fontSize: 11, color: isDark ? '#FBBF24' : '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="info" size={14} />
            Surge applies during peak hours ({(config.commission?.peakHours || []).join(', ')}h). Prices = base × surge multiplier.
          </div>
        </div>
      </Box>
    </div>
  );
}
