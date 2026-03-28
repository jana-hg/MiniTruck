import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlatform } from '../context/PlatformContext';
import { useTheme } from '../context/ThemeContext';
import AppIcon from './ui/AppIcon';

export default function SplashScreen() {
  const { isCustomer, isDriver } = usePlatform();
  const { isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(true);

  const bgColor = isDark ? '#000000' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const subColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 23, 42, 0.6)';

  useEffect(() => {
    // Show splash screen for exactly 2 seconds before fading out beautifully
    const timer = setTimeout(() => setIsVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: bgColor,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{ marginBottom: 24 }}
        >
          <AppIcon size={120} />
        </motion.div>

        {/* App Name */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            fontSize: 32,
            fontWeight: 900,
            fontFamily: "'Lexend', sans-serif",
            background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            marginBottom: 8,
            textAlign: 'center',
            letterSpacing: '-0.02em',
          }}
        >
          {isDriver ? 'MiniTruck Captain' : 'MiniTruck'}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            fontSize: 13,
            color: subColor,
            margin: 0,
            marginBottom: 32,
          }}
        >
          Precision Truck Booking
        </motion.p>

        {/* Loading Dots */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [0.8, 1, 0.8] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(59, 130, 246, 0.4)',
              }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
