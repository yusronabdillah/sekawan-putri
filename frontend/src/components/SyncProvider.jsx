import React, { useEffect } from 'react';
import { syncService } from '../services/syncService';
import { useNetworkState } from '../hooks/useNetworkState';
import { logger } from '../utils/logger';

export function SyncProvider({ children }) {
  const { isOnline } = useNetworkState();

  useEffect(() => {
    if (isOnline) {
      logger.info('Network is online. Triggering Sync Queue and Realtime Sync.');
      syncService.processQueue();
      syncService.startRealtimeSync();
    } else {
      syncService.stopRealtimeSync();
    }

    return () => {
      syncService.stopRealtimeSync();
    };
  }, [isOnline]);

  useEffect(() => {
    // Run sync periodically if online (e.g. every 30 seconds)
    const interval = setInterval(() => {
      if (window.navigator.onLine) {
        syncService.processQueue();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
}
