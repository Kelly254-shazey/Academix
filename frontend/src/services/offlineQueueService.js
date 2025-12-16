/**
 * Offline Queue Service
 * Purpose: Store attendance scans when offline, sync when reconnected
 * 
 * CRITICAL: Each scan is VALIDATED by backend before accepting
 * Offline scans queued locally, synced on reconnection
 * NO fake scans accepted - all validated against database
 */

class OfflineQueueService {
  constructor() {
    this.queueKey = 'attendance_scan_queue';
    this.syncStatusKey = 'queue_sync_status';
    this.isOnline = navigator.onLine;
    
    // Setup online/offline listeners
    window.addEventListener('online', () => this._handleOnline());
    window.addEventListener('offline', () => this._handleOffline());
  }

  /**
   * Add scan to queue when offline
   * @param {object} scanData { qrToken, sessionId, latitude, longitude, deviceId }
   * @returns {string} Queue item ID
   */
  addToQueue(scanData) {
    try {
      const queue = this._getQueue();
      
      const queueItem = {
        id: `scan_${Date.now()}_${Math.random()}`,
        data: scanData,
        timestamp: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
        status: 'pending' // pending, syncing, completed, failed
      };

      queue.push(queueItem);
      this._saveQueue(queue);

      console.log(`✓ Scan added to offline queue (${queue.length} items)`);
      return queueItem.id;
    } catch (error) {
      console.error('❌ Error adding to queue:', error);
      return null;
    }
  }

  /**
   * Sync all queued scans when online
   * @param {object} apiClient API client with token
   * @returns {Promise<object>} Sync results { success, processed, failed }
   */
  async syncQueue(apiClient) {
    if (!this.isOnline) {
      console.warn('⚠️  Device offline - cannot sync queue');
      return { success: false, reason: 'offline' };
    }

    try {
      const queue = this._getQueue();
      if (queue.length === 0) {
        console.log('✓ Queue empty - nothing to sync');
        return { success: true, processed: 0, failed: 0 };
      }

      console.log(`🔄 Syncing ${queue.length} offline scans...`);
      
      let processed = 0;
      let failed = 0;
      const failedScans = [];

      for (let item of queue) {
        if (item.attempts >= item.maxAttempts) {
          console.warn(`⚠️  Scan ${item.id} exceeded max attempts`);
          failed++;
          failedScans.push(item);
          continue;
        }

        try {
          // Call backend API to process scan
          // Backend validates against database:
          // - Check if session exists and is active
          // - Check if QR token is valid
          // - Check geolocation bounds
          // - Verify student hasn't already scanned
          // - Check device fingerprint
          const response = await apiClient.scanQR(
            item.data.qrToken,
            {
              latitude: item.data.latitude,
              longitude: item.data.longitude
            },
            item.data.deviceId
          );

          if (response && response.success) {

            // Backend validated and stored in database
            item.status = 'completed';
            processed++;
            console.log(`✓ Scan ${item.id} synced successfully`);
          } else {
            // Backend rejected the scan
            item.attempts++;
            item.status = item.attempts >= item.maxAttempts ? 'failed' : 'pending';
            failed++;
            console.warn(`⚠️  Scan ${item.id} rejected:`, response.message || 'Unknown error');
            failedScans.push(item);
          }
        } catch (error) {
          item.attempts++;
          item.status = item.attempts >= item.maxAttempts ? 'failed' : 'pending';
          failed++;
          console.error(`❌ Error syncing scan ${item.id}:`, error.message);
          failedScans.push(item);
        }
      }

      // Keep only failed/pending scans in queue
      const updatedQueue = queue.filter(item => 
        item.status === 'pending' || item.status === 'failed'
      );
      this._saveQueue(updatedQueue);

      console.log(`✓ Sync complete: ${processed} processed, ${failed} failed`);
      
      return {
        success: true,
        processed,
        failed,
        failedScans: failedScans.length > 0 ? failedScans : null
      };
    } catch (error) {
      console.error('❌ Queue sync error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus() {
    const queue = this._getQueue();
    const pendingCount = queue.filter(item => item.status === 'pending').length;
    const failedCount = queue.filter(item => item.status === 'failed').length;

    return {
      isOnline: this.isOnline,
      totalItems: queue.length,
      pending: pendingCount,
      failed: failedCount,
      queue: queue
    };
  }

  /**
   * Clear failed scans from queue
   */
  clearFailed() {
    const queue = this._getQueue();
    const updated = queue.filter(item => item.status !== 'failed');
    this._saveQueue(updated);
    console.log(`✓ Cleared ${queue.length - updated.length} failed scans`);
  }

  /**
   * Clear entire queue (careful!)
   */
  clearQueue() {
    localStorage.removeItem(this.queueKey);
    console.log('✓ Queue cleared');
  }

  // Private methods

  _getQueue() {
    try {
      const queue = localStorage.getItem(this.queueKey);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error reading queue:', error);
      return [];
    }
  }

  _saveQueue(queue) {
    try {
      localStorage.setItem(this.queueKey, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  _handleOnline() {
    console.log('✓ Device online - ready to sync');
    this.isOnline = true;
    
    // Trigger queue sync in app component
    window.dispatchEvent(new CustomEvent('device:online'));
  }

  _handleOffline() {
    console.warn('⚠️  Device offline - scans will be queued');
    this.isOnline = false;
    window.dispatchEvent(new CustomEvent('device:offline'));
  }
}

const offlineQueueService = new OfflineQueueService();
export default offlineQueueService;
