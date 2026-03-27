import { useDataSync } from '../context/DataSyncContext';
import Icon from './ui/Icon';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

export default function SyncStatusIndicator() {
  const { syncStatus, lastSync, pendingEvents } = useDataSync();
  const { isDark } = useTheme();

  const C = {
    bg: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0',
    text: isDark ? '#FAFAFA' : '#0F172A',
    muted: isDark ? '#A1A1AA' : '#64748B',
  };

  if (syncStatus === 'idle') {
    return null;
  }

  const statusConfig = {
    connected: {
      color: '#10B981',
      icon: 'cloud_done',
      label: 'Synced',
      bgColor: 'rgba(16, 185, 129, 0.1)',
    },
    connecting: {
      color: '#F59E0B',
      icon: 'cloud_upload',
      label: 'Syncing...',
      bgColor: 'rgba(245, 158, 11, 0.1)',
    },
    offline: {
      color: '#EF4444',
      icon: 'cloud_off',
      label: 'Offline',
      bgColor: 'rgba(239, 68, 68, 0.1)',
    },
  };

  const config = statusConfig[syncStatus] || statusConfig.offline;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 40,
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: `0 4px 12px rgba(0,0,0,${isDark ? 0.3 : 0.08})`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {/* Status Icon */}
      <motion.div
        animate={syncStatus === 'connecting' ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 1.5, repeat: syncStatus === 'connecting' ? Infinity : 0 }}
        style={{
          background: config.bgColor,
          width: 36,
          height: 36,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={config.icon} size={18} style={{ color: config.color }} />
      </motion.div>

      {/* Status Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
          {config.label}
        </div>
        {lastSync && syncStatus === 'connected' && (
          <div style={{ fontSize: 10, color: C.muted }}>
            {formatTime(lastSync)}
          </div>
        )}
        {pendingEvents.length > 0 && (
          <div style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>
            {pendingEvents.length} pending
          </div>
        )}
      </div>
    </motion.div>
  );
}

function formatTime(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}
