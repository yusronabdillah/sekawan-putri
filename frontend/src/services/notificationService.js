import { db } from '../db/db';
import { v4 as uuidv4 } from 'uuid';

export const notificationService = {
  // Request permission for native push notifications
  requestPermission: async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },

  // Show native notification if allowed
  showNativeNotification: (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/logo toko.jpeg'
        });
      } catch (e) {
        console.error("Native notification failed:", e);
      }
    }
  },

  // Notify Owner (Broadcast to role)
  notifyOwner: async ({ title, message, type, reference_id }) => {
    try {
      const now = new Date().toISOString();
      const notif = {
        id: `notif-${Date.now()}-${uuidv4().substring(0, 8)}`,
        user_id: 'OWNER', // Special role identifier
        title,
        message,
        type, 
        reference_id,
        is_read: 0, // 0 for unread
        created_at: now
      };
      await db.notifications.add(notif);
      
      await db.sync_queue.add({
        id: `sq-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        idempotency_key: `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        entity: 'notifications',
        action: 'CREATE',
        payload: notif,
        local_version: 1,
        retry_count: 0,
        status: 'PENDING',
        last_error: null,
        created_at: now,
        updated_at: now,
        next_retry_at: now
      });
    } catch (error) {
      console.error("Error creating owner notification:", error);
    }
  },

  // Notify specific staff
  notifyStaff: async (staffId, { title, message, type, reference_id }) => {
    try {
      const now = new Date().toISOString();
      const notif = {
        id: `notif-${Date.now()}-${uuidv4().substring(0, 8)}`,
        user_id: staffId,
        title,
        message,
        type,
        reference_id,
        is_read: 0,
        created_at: now
      };
      await db.notifications.add(notif);
      
      await db.sync_queue.add({
        id: `sq-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        idempotency_key: `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        entity: 'notifications',
        action: 'CREATE',
        payload: notif,
        local_version: 1,
        retry_count: 0,
        status: 'PENDING',
        last_error: null,
        created_at: now,
        updated_at: now,
        next_retry_at: now
      });
    } catch (error) {
      console.error("Error creating staff notification:", error);
    }
  }
};
