import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlatform } from '../context/PlatformContext';
import AppIcon from './ui/AppIcon';

export default function SplashScreen() {
  const { isNative, isCustomer, isDriver } = usePlatform();
  const [isVisible, setIsVisible] = useState(true);

  const appName = isCustomer ? 'MiniTruck' : isDriver ? 'MiniTruck Captain' : '';
  const bgColor = isCustomer ? '#3B82F6' : isDriver ? '#10B981' : '#3B82F6';
  const dotColor = isCustomer ? '#60A5FA' : isDriver ? '#34D399' : '#60A5FA';

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
            fontSize: 28,
            fontWeight: 700,
            color: '#fff',
            margin: 0,
            marginBottom: 8,
            textAlign: 'center',
            letterSpacing: '-0.01em',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)'
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
            color: 'rgba(255, 255, 255, 0.8)',
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
                background: 'rgba(255, 255, 255, 0.6)',
              }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
