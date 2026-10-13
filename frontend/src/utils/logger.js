/**
 * Centralized Logger for Offline-First Sync
 */

export const logger = {
  info: (message, data) => {
    console.log(`[SYNC-INFO] ${new Date().toISOString()} - ${message}`, data || '');
  },
  warn: (message, data) => {
    console.warn(`[SYNC-WARN] ${new Date().toISOString()} - ${message}`, data || '');
  },
  error: (message, error) => {
    console.error(`[SYNC-ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  }
};
