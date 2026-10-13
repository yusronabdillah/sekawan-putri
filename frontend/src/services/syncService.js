import { db } from '../db/db';
import { apiClient } from './apiClient';
import { logger } from '../utils/logger';

// Constants
const MAX_RETRY = 5;
const BASE_DELAY_MS = 2000;

const calculateBackoff = (retryCount) => {
  return BASE_DELAY_MS * Math.pow(2, retryCount); // 2s, 4s, 8s, 16s, 32s
};

let isPulling = false;

export const syncService = {
  unsubscribers: [],

  startRealtimeSync: () => {
    if (syncService.unsubscribers.length > 0) {
      logger.info('Realtime sync already active. Skipping...');
      return;
    }

    logger.info('Starting Realtime Sync (onSnapshot)...');
    
    // Listen to all collections that the Dashboard and POS use
    const collections = [
      'transactions', 'transaction_items', 'cash_sessions', 
      'products', 'stock_movements', 'batches',
      'restock_requests', 'approvals', 'notifications', 'audit_logs'
    ];

    collections.forEach(coll => {
      const unsub = apiClient.listenToCollection(coll, async (changes) => {
        logger.info(`[REALTIME] ${changes.length} changes detected in Firebase for table ${coll}. Merging to Dexie...`);
        let hasUpdates = false;

        try {
          // 1. Process Removed Items
          const removedIds = changes.filter(c => c.type === 'removed').map(c => c.data.id);
          if (removedIds.length > 0) {
            await db[coll].bulkDelete(removedIds);
            hasUpdates = true;
            console.log(`[REALTIME] Deleted ${removedIds.length} items from ${coll}`);
          }

          // 2. Process Added/Modified Items
          const upserts = changes.filter(c => c.type === 'added' || c.type === 'modified');
          if (upserts.length > 0) {
            // We do a safe merge: pull existing Dexie data first
            const existingData = await db[coll].where('id').anyOf(upserts.map(u => u.data.id)).toArray();
            const existingMap = new Map(existingData.map(item => [item.id, item]));

            const mergedData = upserts.map(c => {
              const cloudItem = c.data;
              const localItem = existingMap.get(cloudItem.id);
              if (localItem) {
                // cloud wins for realtime, overwrite local (unless we want to preserve specific fields)
                // for stock updates, cloud should win.
                return { ...localItem, ...cloudItem };
              }
              return cloudItem;
            });

            await db[coll].bulkPut(mergedData);
            hasUpdates = true;
            console.log(`[REALTIME] Upserted ${mergedData.length} items to ${coll}`);
          }

          if (hasUpdates) {
             logger.info(`[REALTIME] Successfully merged table ${coll}. React will automatically re-render via useLiveQuery.`);
          }
        } catch (err) {
           logger.error(`[REALTIME-ERROR] Failed to merge table ${coll}:`, err);
        }
      });
      syncService.unsubscribers.push(unsub);
    });
  },

  stopRealtimeSync: () => {
    if (syncService.unsubscribers.length > 0) {
      logger.info('Stopping Realtime Sync...');
      syncService.unsubscribers.forEach(unsub => unsub());
      syncService.unsubscribers = [];
    }
  },

  pullData: async () => {
    if (isPulling) {
      logger.info('Pull already in progress. Skipping...');
      return false;
    }
    isPulling = true;
    if (!window.navigator.onLine) {
      logger.info('Offline. Cannot pull data.');
      isPulling = false;
      return false;
    }

    try {
      logger.info('Starting Cloud Restore (Pull Data)...');
      
      const collections = [
        'products', 'transactions', 'transaction_items', 
        'batches', 'stock_movements', 'audit_logs', 'cash_sessions',
        'restock_requests', 'approvals', 'notifications'
      ];

      for (const coll of collections) {
        console.log(`[CLOUD-RESTORE] Memulai pull tabel ${coll}...`);
        const data = await apiClient.pullCollection(coll);
        if (data && data.length > 0) {
          console.log(`[CLOUD-RESTORE] Berhasil menarik ${data.length} record dari Firebase untuk tabel ${coll}.`);
          // SAFE MERGE LOGIC
          const existingData = await db[coll].toArray();
          console.log(`[SAFE-MERGE] Record lokal sebelum merge di tabel ${coll}: ${existingData.length}`);
          
          const existingMap = new Map(existingData.map(item => [item.id, item]));
          let updateCount = 0;
          let insertCount = 0;
          
          const mergedData = data.map(cloudItem => {
            const localItem = existingMap.get(cloudItem.id);
            if (localItem) {
              updateCount++;
              // Merge cloudItem ON TOP OF localItem (cloud wins for shared fields like stock)
              return { ...localItem, ...cloudItem };
            }
            insertCount++;
            return cloudItem;
          });
          
          await db[coll].bulkPut(mergedData);
          const afterCount = await db[coll].count();
          logger.info(`[SAFE-MERGE] Selesai merge tabel ${coll}. Inserted: ${insertCount}, Updated: ${updateCount}. Record lokal sekarang: ${afterCount}.`);
        } else {
          console.log(`[CLOUD-RESTORE] Tabel ${coll} kosong di awan, dilewati.`);
        }
      }

      // AUTO-RECOVERY for corrupted products
      try {
        const queue = await db.sync_queue.toArray();
        // Look for any full product payload we ever created locally
        const productCreations = queue.filter(q => 
          (q.type === 'PRODUCT' || q.entity === 'products') && 
          q.payload && q.payload.name
        );
        
        if (productCreations.length > 0) {
          productCreations.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
          const recoveredMap = {};
          
          for (const q of productCreations) {
            recoveredMap[q.payload.id] = q.payload;
          }
          
          const recoveredProducts = Object.values(recoveredMap);
          for (const p of recoveredProducts) {
             const existing = await db.products.get(p.id);
             if (existing && existing.stock !== undefined) {
               p.stock = existing.stock; // preserve latest stock
             }
          }
          
          await db.products.bulkPut(recoveredProducts);
          logger.info(`Recovered ${recoveredProducts.length} full products from local queue.`);
          
          // Re-upload to Firebase to fix the corrupted stubs
          for (const p of recoveredProducts) {
            await apiClient.syncOperation({ entity: 'products', action: 'UPDATE', payload: p });
          }
        }
      } catch(e) {
        logger.error('Auto-recovery failed:', e);
      }

      logger.info('Cloud Restore Complete! All local data is now synchronized with Firebase.');
      isPulling = false;
      return true;
    } catch (err) {
      logger.error('Failed to pull data from Firebase:', err);
      isPulling = false;
      return false;
    }
  },

  /**
   * Process the sync_queue sequentially.
   * Wrapped in a Web Lock to prevent concurrent execution (Mutex).
   */
  processQueue: async () => {
    if (!window.navigator.onLine) {
      logger.info('Offline. Skipping sync.');
      return false;
    }

    logger.info('Online detected. Attempting to start queue processor...');

    // Use Web Locks API for Mutex
    if (navigator.locks) {
      return navigator.locks.request('sync_queue_mutex', { mode: 'exclusive', ifAvailable: true }, async (lock) => {
        if (!lock) {
          logger.info('Sync already running in another tab or process. Lock not acquired.');
          return false;
        }
        logger.info('Lock acquired successfully.');
        try {
          return await executeSync();
        } finally {
          logger.info('Lock released.');
        }
      });
    } else {
      // Fallback
      logger.warn('Web Locks API not supported. Running sync without cross-tab protection.');
      try {
        return await executeSync();
      } finally {
        logger.info('Lock released (fallback).');
      }
    }
  },

  /**
   * Insert item to sync_queue
   */
  addToQueue: async (entity, action, payload) => {
    const now = new Date().toISOString();
    const item = {
      id: `sq-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      idempotency_key: `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      entity,
      action,
      payload,
      local_version: 1,
      retry_count: 0,
      status: 'PENDING',
      last_error: null,
      created_at: now,
      updated_at: now,
      next_retry_at: now
    };

    await db.sync_queue.add(item);
    logger.info(`Queue item created: [${action}] ${entity} (Queue size increased)`, item);
    
    // Trigger sync asynchronously after adding
    setTimeout(() => {
      syncService.processQueue();
    }, 100);
  }
};

/**
 * The actual sync logic (Internal)
 */
async function executeSync() {
  logger.info('Sync started.');
  let itemsProcessed = 0;

  try {
    const now = new Date().toISOString();
    
    // Auto-Healing: Find corrupted items from older versions/bugs
    const allQueueItems = await db.sync_queue.toArray();
    const corruptedItems = allQueueItems.filter(item => !item.next_retry_at || !item.entity);
    
    if (corruptedItems.length > 0) {
      logger.warn(`Found ${corruptedItems.length} corrupted queue items. Running auto-heal...`);
      for (const item of corruptedItems) {
        await db.sync_queue.update(item.id, {
          entity: item.entity || item.type || 'unknown',
          idempotency_key: item.idempotency_key || `idem-healed-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          retry_count: item.retry_count || 0,
          status: item.status === 'SYNCING' ? 'PENDING' : (item.status || 'PENDING'),
          local_version: item.local_version || 1,
          next_retry_at: item.next_retry_at || now,
          updated_at: now
        });
      }
      logger.info('Auto-heal completed.');
    }
    
    // Fetch PENDING, FAILED, or stuck SYNCING items
    const itemsToSync = await db.sync_queue
      .filter(item => {
        const isReady = item.next_retry_at <= now;
        // If an item is still SYNCING when a new lock is acquired, it means it got stuck from a previous crash.
        const validStatus = item.status === 'PENDING' || item.status === 'FAILED' || item.status === 'SYNCING';
        return validStatus && isReady;
      })
      .toArray();
      
    logger.info(`Queue size: ${itemsToSync.length} items ready for sync.`);

    // Sort by created_at to maintain order of operations
    itemsToSync.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    if (itemsToSync.length === 0) {
      logger.info('Queue finished / empty. Sync completed.');
      return true;
    }

    for (const item of itemsToSync) {
      // Check if we lost connection mid-sync
      if (!window.navigator.onLine) {
        logger.warn('Offline detected during sync. Aborting queue processing.');
        break;
      }

      console.log(`[SYNC-QUEUE] Memproses item ${item.id} (Entity: ${item.entity}, Action: ${item.action}, Attempt: ${item.retry_count + 1})`);
      
      // Mark as syncing
      await db.sync_queue.update(item.id, { status: 'SYNCING', updated_at: new Date().toISOString() });
      
      let itemSuccess = false;
      try {
        const response = await apiClient.syncOperation(item);
        itemSuccess = true;
      } catch (error) {
        // Conflict Logic
        if (error.status === 409) {
          logger.warn(`Item failed (Conflict) for ${item.id}`, error);
          await db.sync_queue.update(item.id, {
            status: 'CONFLICT',
            last_error: error.message || 'Conflict detected',
            updated_at: new Date().toISOString()
          });
        } else {
          // Retry Logic
          const newRetryCount = item.retry_count + 1;
          
          if (newRetryCount >= MAX_RETRY) {
            logger.error(`Item failed permanently: Max retries reached for ${item.id}.`);
            await db.sync_queue.update(item.id, {
              status: 'FAILED_PERMANENT',
              retry_count: newRetryCount,
              last_error: error.message || 'Unknown error',
              updated_at: new Date().toISOString()
            });
          } else {
            const backoffDelay = calculateBackoff(newRetryCount);
            const nextRetry = new Date(Date.now() + backoffDelay).toISOString();
            
            logger.warn(`Item failed for ${item.id}. Retry scheduled in ${backoffDelay}ms`, error);
            await db.sync_queue.update(item.id, {
              status: 'FAILED',
              retry_count: newRetryCount,
              next_retry_at: nextRetry,
              last_error: error.message || 'Unknown error',
              updated_at: new Date().toISOString()
            });
          }
        }
      } finally {
        if (itemSuccess) {
          await db.sync_queue.delete(item.id);
          console.log(`[SYNC-QUEUE] Sukses memproses dan menghapus item ${item.id} dari antrean.`);
          logger.info(`Item success: ${item.id} deleted from queue.`);
          itemsProcessed++;
        }
        logger.info(`Finished processing cycle for item ${item.id}.`);
      }
    }
  } catch (err) {
    logger.error('Critical Error during sync execution', err);
  } finally {
    logger.info(`Sync completed. Processed: ${itemsProcessed}. UI state updated.`);
  }

  return itemsProcessed > 0;
}
