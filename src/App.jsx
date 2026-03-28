import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PlatformProvider } from './context/PlatformContext';
import { DataSyncProvider } from './context/DataSyncContext';
import { Capacitor } from '@capacitor/core';
import { SplashScreen as CapSplash } from '@capacitor/splash-screen';
import { useEffect } from 'react';

import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import SplashScreen from './components/SplashScreen';


import PortalSwitcher from './pages/auth/PortalSwitcher';
import LoginScreen from './pages/auth/LoginScreen';
import DriverRegister from './pages/auth/DriverRegister';
import UserRegister from './pages/auth/UserRegister';

import HomeBooking from './pages/customer/HomeBooking';
import MyBookings from './pages/customer/MyBookings';
import RideTracking from './pages/customer/RideTracking';
import PaymentScreen from './pages/customer/PaymentScreen';
import Profile from './pages/customer/Profile';
import Wallet from './pages/customer/Wallet';
import Support from './pages/customer/Support';

import DriverHome from './pages/driver/DriverHome';
import DriverEarnings from './pages/driver/DriverEarnings';
import DriverProfile from './pages/driver/DriverProfile';
import DriverSupport from './pages/driver/DriverSupport';

import AdminDashboard from './pages/admin/AdminDashboard';
import FleetManagement from './pages/admin/FleetManagement';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, logout } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!role) { logout(); return <Navigate to="/login" replace />; }
  if (allowedRoles && !allowedRoles.includes(role)) {
    const homeMap = { customer: '/', driver: '/driver', admin: '/admin' };
    return <Navigate to={homeMap[role] || '/login'} replace />;
  }
  return children;
}

function AppRoutes() {
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/fleet');
  const isTrackingRoute = location.pathname.startsWith('/tracking');
  const isAuthRoute = location.pathname.startsWith('/login');

  useEffect(() => {
    // Hide native splash screen immediately when React app starts
    if (Capacitor.isNativePlatform()) {
      CapSplash.hide();
    }
  }, []);

  return (
    <>
      <SplashScreen />

      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--on-surface)' }}>
        {!isAdminRoute && !isAuthRoute && <Header />}

      <main style={{
        width: '100%',
        paddingTop: isAuthRoute ? 0 : isTrackingRoute ? 'calc(56px + env(safe-area-inset-top))' : isAdminRoute ? 0 : 'calc(72px + env(safe-area-inset-top))',
        paddingBottom: isAuthRoute ? 0 : isTrackingRoute ? 'env(safe-area-inset-bottom)' : isAdminRoute ? 0 : 'calc(84px + env(safe-area-inset-bottom))',
        paddingLeft: isAuthRoute || isTrackingRoute || isAdminRoute ? 0 : 16,
        paddingRight: isAuthRoute || isTrackingRoute || isAdminRoute ? 0 : 16,
        flex: 1,
        overflowY: 'visible',
      }}>
        <div style={isAuthRoute || isTrackingRoute || isAdminRoute ? {} : { maxWidth: 1280, margin: '0 auto', width: '100%' }}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              {/* Auth */}
              <Route path="/login" element={<PortalSwitcher />} />
              <Route path="/login-user" element={<LoginScreen role="customer" />} />
              <Route path="/login-driver" element={<LoginScreen role="driver" />} />
              <Route path="/login-admin" element={<LoginScreen role="admin" />} />
              <Route path="/register-driver" element={<DriverRegister />} />
              <Route path="/register-user" element={<UserRegister />} />

              {/* Customer */}
              <Route path="/" element={<ProtectedRoute allowedRoles={['customer']}><HomeBooking /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute allowedRoles={['customer', 'admin']}><MyBookings /></ProtectedRoute>} />
              <Route path="/tracking/:id?" element={<ProtectedRoute allowedRoles={['customer', 'driver', 'admin']}><RideTracking /></ProtectedRoute>} />
              <Route path="/payment" element={<ProtectedRoute allowedRoles={['customer']}><PaymentScreen /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute allowedRoles={['customer']}><Profile /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute allowedRoles={['customer']}><Wallet /></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute allowedRoles={['customer']}><Support /></ProtectedRoute>} />

              {/* Driver */}
              <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverHome /></ProtectedRoute>} />
              <Route path="/earnings" element={<ProtectedRoute allowedRoles={['driver']}><DriverEarnings /></ProtectedRoute>} />
              <Route path="/driver/profile" element={<ProtectedRoute allowedRoles={['driver']}><DriverProfile /></ProtectedRoute>} />
              <Route path="/driver/support" element={<ProtectedRoute allowedRoles={['driver']}><DriverSupport /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/fleet" element={<ProtectedRoute allowedRoles={['admin']}><FleetManagement /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={
                isAuthenticated
                  ? <Navigate to={role === 'admin' ? '/admin' : role === 'driver' ? '/driver' : '/'} replace />
                  : <Navigate to="/login" replace />
              } />
            </Routes>
          </AnimatePresence>
        </div>
      </main>

        {!isAdminRoute && !isAuthRoute && <BottomNav />}
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PlatformProvider>
        <ThemeProvider>
          <AuthProvider>
            <DataSyncProvider>
              <AppRoutes />
            </DataSyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </PlatformProvider>
    </BrowserRouter>
  );
}
