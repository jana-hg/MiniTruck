import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import socketService from '../services/socketService';

const DataSyncContext = createContext(null);

export function DataSyncProvider({ children }) {
  const { user, role, token, isAuthenticated } = useAuth();
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, connecting, connected, offline
  const [lastSync, setLastSync] = useState(null);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [syncErrors, setSyncErrors] = useState([]);

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !token) {
      setSyncStatus('idle');
      return;
    }

    const initSocket = async () => {
      try {
        setSyncStatus('connecting');
        await socketService.initializeSocket(token, user.id, role);
        setSyncStatus('connected');
        setLastSync(new Date());

        // Subscribe to connection status changes
        socketService.onConnectionStatusChange(({ connected, error }) => {
          setSyncStatus(connected ? 'connected' : 'offline');
          if (error) {
            setSyncErrors((prev) => [...prev, { error, timestamp: new Date() }]);
          }
        });
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        setSyncStatus('offline');
        setSyncErrors((prev) => [...prev, { error: error.message, timestamp: new Date() }]);
      }
    };

    initSocket();

    return () => {
      socketService.disconnectSocket();
      setSyncStatus('idle');
    };
  }, [isAuthenticated, user?.id, token, role]);

  /**
   * Queue event if offline
   */
  const queueEvent = useCallback((event, data) => {
    setPendingEvents((prev) => [...prev, { event, data, timestamp: Date.now() }]);
  }, []);

  /**
   * Process pending events when online
   */
  useEffect(() => {
    if (syncStatus === 'connected' && pendingEvents.length > 0) {
      pendingEvents.forEach(({ event, data }) => {
        try {
          socketService.emitEvent(event, data);
        } catch (error) {
          console.error('Failed to emit pending event:', error);
        }
      });
      setPendingEvents([]);
    }
  }, [syncStatus, pendingEvents]);

  /**
   * Request sync after offline period
   */
  const requestSync = useCallback(async () => {
    if (syncStatus !== 'connected') {
      console.warn('Cannot sync: socket not connected');
      return false;
    }

    try {
      const response = await socketService.requestSync();
      setLastSync(new Date());
      return response.status === 'acknowledged';
    } catch (error) {
      console.error('Sync request failed:', error);
      return false;
    }
  }, [syncStatus]);

  const value = {
    // Status
    syncStatus,
    isConnected: syncStatus === 'connected',
    isOffline: syncStatus === 'offline',
    lastSync,

    // Events
    pendingEvents,
    syncErrors,

    // Methods
    queueEvent,
    requestSync,
  };

  return <DataSyncContext.Provider value={value}>{children}</DataSyncContext.Provider>;
}

export function useDataSync() {
  const ctx = useContext(DataSyncContext);
  if (!ctx) throw new Error('useDataSync must be used within DataSyncProvider');
  return ctx;
}

export default DataSyncContext;
