import { firestore } from '../config/firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { logger } from '../utils/logger';
import { sendTelegramNotification } from '../utils/telegram';

export const apiClient = {
  /**
   * Sync a single operation to Firebase Firestore
   * @param {Object} item Queue item
   */
  syncOperation: async (item) => {
    const { entity, action, payload } = item;
    
    if (!payload || !payload.id) {
      throw new Error(`Payload must have an id for Firestore sync. Entity: ${entity}`);
    }

    const docRef = doc(firestore, entity, payload.id);

    try {
      console.log(`[PUSH-FIREBASE] Memulai push data ke Firebase. Entity: ${entity}, Action: ${action}, ID: ${payload.id}`);
      if (action === 'CREATE' || action === 'UPDATE') {
        // We use setDoc with merge: true to avoid overwriting existing documents
        // with partial payloads (e.g. stock updates).
        await setDoc(docRef, payload, { merge: true });
        console.log(`[PUSH-FIREBASE] Sukses merge document ${entity}/${payload.id}`);
      } else if (action === 'DELETE') {
        await deleteDoc(docRef);
        console.log(`[PUSH-FIREBASE] Sukses delete document ${entity}/${payload.id}`);
      } else {
        throw new Error(`Unknown action: ${action}`);
      }
      
      logger.info(`[Firebase Sync] Success: ${action} ${entity}/${payload.id}`);
      
      // TRIGGER TELEGRAM NOTIFICATION ON NEW TRANSACTION SYNC
      if (entity === 'transactions' && action === 'CREATE') {
          // Fire and forget (it won't block the sync loop, and errors are handled inside)
          sendTelegramNotification(payload);
      }

      return {
        success: true,
        data: {
          id: payload.id,
          server_updated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(`[Firebase Sync Error] for ${entity} ${action}:`, error);
      
      // If permission denied or network error, it will throw here
      // The syncService will catch it and retry later
      throw error;
    }
  },

  /**
   * Pull an entire collection from Firebase Firestore
   * @param {string} entity Collection name
   * @returns {Promise<Array>} Array of documents
   */
  pullCollection: async (entity) => {
    try {
      const querySnapshot = await getDocs(collection(firestore, entity));
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      logger.info(`[Firebase Sync] Pulled ${data.length} items from ${entity}`);
      return data;
    } catch (error) {
      logger.error(`[Firebase Pull Error] for ${entity}:`, error);
      throw error;
    }
  },

  /**
   * Listen to real-time changes on a collection
   * @param {string} entity Collection name
   * @param {function} onChange Callback function for changes
   * @returns {function} Unsubscribe function
   */
  listenToCollection: (entity, onChange) => {
    try {
      const q = collection(firestore, entity);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const changes = [];
        snapshot.docChanges().forEach((change) => {
          changes.push({
            type: change.type, // 'added', 'modified', 'removed'
            data: { id: change.doc.id, ...change.doc.data() },
            isLocalWrite: change.doc.metadata.hasPendingWrites
          });
        });
        if (changes.length > 0) {
          onChange(changes);
        }
      }, (error) => {
        logger.error(`[Firebase onSnapshot Error] for ${entity}:`, error);
      });
      return unsubscribe;
    } catch (error) {
      logger.error(`[Firebase listenToCollection Error] for ${entity}:`, error);
      throw error;
    }
  }
};

window.apiClient = apiClient;
