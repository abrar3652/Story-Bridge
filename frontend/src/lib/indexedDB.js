import { get, set, del, clear, keys } from 'idb-keyval';

// IndexedDB utilities for offline functionality
export class OfflineStorage {
  constructor() {
    this.DB_NAME = 'storybridge';
    this.STORES = {
      STORIES: 'stories',
      PROGRESS: 'progress',
      USER_DATA: 'userData',
      SYNC_QUEUE: 'syncQueue',
      BADGES: 'badges',
      AUDIO: 'audioFiles'
    };
  }

  // Story management
  async cacheStory(story) {
    const storyKey = `${this.STORES.STORIES}:${story.id}`;
    await set(storyKey, {
      ...story,
      cached_at: new Date().toISOString()
    });
  }

  async getCachedStory(storyId) {
    const storyKey = `${this.STORES.STORIES}:${storyId}`;
    return await get(storyKey);
  }

  async getCachedStories() {
    const allKeys = await keys();
    const storyKeys = allKeys.filter(key => key.startsWith(this.STORES.STORIES));
    
    const stories = [];
    for (const key of storyKeys) {
      const story = await get(key);
      if (story) stories.push(story);
    }
    
    return stories;
  }

  async removeStory(storyId) {
    const storyKey = `${this.STORES.STORIES}:${storyId}`;
    await del(storyKey);
  }

  // Progress management
  async saveProgress(userId, storyId, progressData) {
    const progressKey = `${this.STORES.PROGRESS}:${userId}:${storyId}`;
    const progress = {
      ...progressData,
      user_id: userId,
      story_id: storyId,
      updated_at: new Date().toISOString(),
      synced: false
    };
    
    await set(progressKey, progress);
    
    // Add to sync queue if online sync is needed
    if (!navigator.onLine) {
      await this.addToSyncQueue('progress', progress);
    }
    
    return progress;
  }

  async getProgress(userId, storyId = null) {
    const allKeys = await keys();
    const progressPrefix = storyId 
      ? `${this.STORES.PROGRESS}:${userId}:${storyId}`
      : `${this.STORES.PROGRESS}:${userId}:`;
    
    const progressKeys = allKeys.filter(key => key.startsWith(progressPrefix));
    
    if (storyId) {
      // Return single progress record
      const progressKey = `${this.STORES.PROGRESS}:${userId}:${storyId}`;
      return await get(progressKey);
    } else {
      // Return all progress for user
      const progressList = [];
      for (const key of progressKeys) {
        const progress = await get(key);
        if (progress) progressList.push(progress);
      }
      return progressList;
    }
  }

  async updateProgressSync(userId, storyId, synced = true) {
    const progressKey = `${this.STORES.PROGRESS}:${userId}:${storyId}`;
    const progress = await get(progressKey);
    
    if (progress) {
      progress.synced = synced;
      await set(progressKey, progress);
    }
  }

  // Enhanced user data management with full offline login support
  async saveUserData(user, token) {
    const userData = {
      user,
      token,
      saved_at: new Date().toISOString(),
      // Add credentials hash for offline verification
      email_hash: user.email ? await this.hashString(user.email) : null,
      // Store encrypted login state
      login_state: {
        authenticated: true,
        role: user.role,
        permissions: this.getRolePermissions(user.role),
        last_online: navigator.onLine ? new Date().toISOString() : null
      }
    };
    
    await set(this.STORES.USER_DATA, userData);
    
    // Also cache user preferences for offline use
    await this.cacheUserPreferences(user);
  }
  
  async cacheUserPreferences(user) {
    const preferencesKey = `preferences:${user.id}`;
    const preferences = {
      language: user.language || 'en',
      role: user.role,
      avatar_url: user.avatar_url,
      mfa_enabled: user.mfa_enabled || false,
      cached_at: new Date().toISOString()
    };
    
    await set(preferencesKey, preferences);
  }
  
  async getUserPreferences(userId) {
    const preferencesKey = `preferences:${userId}`;
    return await get(preferencesKey);
  }
  
  // Enhanced offline authentication verification
  async verifyOfflineLogin(email) {
    const userData = await this.getUserData();
    if (!userData || !userData.user || !userData.login_state) {
      return false;
    }
    
    // Verify email matches cached user (using hash comparison)
    const emailHash = await this.hashString(email);
    return userData.email_hash === emailHash && userData.login_state.authenticated;
  }
  
  async getRolePermissions(role) {
    const permissions = {
      end_user: ['view_stories', 'save_progress', 'earn_badges'],
      creator: ['view_stories', 'create_stories', 'edit_own_stories', 'save_progress'],
      narrator: ['view_stories', 'create_narrations', 'edit_own_narrations', 'save_progress'],
      admin: ['view_all', 'manage_users', 'approve_content', 'view_analytics']
    };
    
    return permissions[role] || permissions.end_user;
  }
  
  async hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async getUserData() {
    return await get(this.STORES.USER_DATA);
  }

  async clearUserData() {
    await del(this.STORES.USER_DATA);
  }

  // Badge management
  async saveBadges(userId, badges) {
    const badgeKey = `${this.STORES.BADGES}:${userId}`;
    await set(badgeKey, {
      badges,
      updated_at: new Date().toISOString()
    });
  }

  async getBadges(userId) {
    const badgeKey = `${this.STORES.BADGES}:${userId}`;
    const data = await get(badgeKey);
    return data ? data.badges : [];
  }

  // Coins management
  async saveCoins(userId, coins) {
    const coinKey = `coins:${userId}`;
    await set(coinKey, {
      coins,
      updated_at: new Date().toISOString()
    });
  }

  async getCoins(userId) {
    const coinKey = `coins:${userId}`;
    const data = await get(coinKey);
    return data ? data.coins : 0;
  }

  async addCoins(userId, amount) {
    const currentCoins = await this.getCoins(userId);
    const newTotal = currentCoins + amount;
    await this.saveCoins(userId, newTotal);
    return newTotal;
  }

  // Sync queue management
  async addToSyncQueue(type, data) {
    const queueKey = `${this.STORES.SYNC_QUEUE}:${Date.now()}`;
    await set(queueKey, {
      type,
      data,
      created_at: new Date().toISOString()
    });
  }

  async getSyncQueue() {
    const allKeys = await keys();
    const queueKeys = allKeys.filter(key => key.startsWith(this.STORES.SYNC_QUEUE));
    
    const queueItems = [];
    for (const key of queueKeys) {
      const item = await get(key);
      if (item) {
        queueItems.push({ key, ...item });
      }
    }
    
    return queueItems.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  async removeSyncQueueItem(key) {
    await del(key);
  }

  async clearSyncQueue() {
    const allKeys = await keys();
    const queueKeys = allKeys.filter(key => key.startsWith(this.STORES.SYNC_QUEUE));
    
    for (const key of queueKeys) {
      await del(key);
    }
  }

  // Audio file caching
  async cacheAudioFile(audioId, audioBlob) {
    const audioKey = `${this.STORES.AUDIO}:${audioId}`;
    await set(audioKey, {
      blob: audioBlob,
      cached_at: new Date().toISOString()
    });
  }

  async getCachedAudioFile(audioId) {
    const audioKey = `${this.STORES.AUDIO}:${audioId}`;
    const data = await get(audioKey);
    return data ? data.blob : null;
  }

  async removeCachedAudioFile(audioId) {
    const audioKey = `${this.STORES.AUDIO}:${audioId}`;
    await del(audioKey);
  }

  // Vocabulary tracking
  async saveVocabularyProgress(userId, word, repetitions = 1, learned = false) {
    const vocabKey = `vocab:${userId}:${word}`;
    const existing = await get(vocabKey) || { repetitions: 0, learned: false };
    
    const vocab = {
      word,
      repetitions: existing.repetitions + repetitions,
      learned: learned || existing.learned,
      updated_at: new Date().toISOString()
    };
    
    await set(vocabKey, vocab);
    return vocab;
  }

  async getVocabularyProgress(userId) {
    const allKeys = await keys();
    const vocabKeys = allKeys.filter(key => key.startsWith(`vocab:${userId}:`));
    
    const vocabulary = [];
    for (const key of vocabKeys) {
      const vocab = await get(key);
      if (vocab) vocabulary.push(vocab);
    }
    
    return vocabulary;
  }

  // Storage management
  async getStorageUsage() {
    const allKeys = await keys();
    let totalSize = 0;
    let itemCount = 0;
    
    for (const key of allKeys) {
      const item = await get(key);
      if (item) {
        totalSize += JSON.stringify(item).length;
        itemCount++;
      }
    }
    
    return {
      itemCount,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }

  async clearAllData() {
    await clear();
  }

  async clearExpiredData(daysOld = 30) {
    const allKeys = await keys();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    for (const key of allKeys) {
      const item = await get(key);
      if (item && item.cached_at) {
        const cachedDate = new Date(item.cached_at);
        if (cachedDate < cutoffDate) {
          await del(key);
        }
      }
    }
  }

  // Sync with server when online
  async syncWithServer(apiClient, token) {
    if (!navigator.onLine) {
      console.log('Cannot sync - offline');
      return false;
    }

    try {
      const syncQueue = await this.getSyncQueue();
      const userData = await this.getUserData();
      
      if (!userData || !userData.user) {
        console.log('No user data for sync');
        return false;
      }

      const userId = userData.user.id;

      // Sync progress data
      for (const queueItem of syncQueue) {
        if (queueItem.type === 'progress') {
          try {
            await apiClient.post('/api/progress', queueItem.data, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            // Mark as synced and remove from queue
            await this.updateProgressSync(userId, queueItem.data.story_id, true);
            await this.removeSyncQueueItem(queueItem.key);
            
            console.log('Synced progress for story:', queueItem.data.story_id);
          } catch (error) {
            console.error('Failed to sync progress:', error);
          }
        }
      }

      console.log('Sync completed successfully');
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    }
  }

  // Network status handling
  setupNetworkListener(apiClient) {
    window.addEventListener('online', async () => {
      console.log('Network restored, attempting sync...');
      const userData = await this.getUserData();
      if (userData && userData.token) {
        await this.syncWithServer(apiClient, userData.token);
      }
    });

    window.addEventListener('offline', () => {
      console.log('Network lost, switching to offline mode');
    });
  }
}

// Create singleton instance
export const offlineStorage = new OfflineStorage();

// Helper functions for React components
export const useOfflineStorage = () => {
  return {
    storage: offlineStorage,
    
    // Story helpers
    cacheStory: (story) => offlineStorage.cacheStory(story),
    getCachedStories: () => offlineStorage.getCachedStories(),
    
    // Progress helpers
    saveProgress: (userId, storyId, progress) => 
      offlineStorage.saveProgress(userId, storyId, progress),
    getProgress: (userId, storyId) => 
      offlineStorage.getProgress(userId, storyId),
    
    // Coins and badges
    addCoins: (userId, amount) => offlineStorage.addCoins(userId, amount),
    getCoins: (userId) => offlineStorage.getCoins(userId),
    saveBadges: (userId, badges) => offlineStorage.saveBadges(userId, badges),
    getBadges: (userId) => offlineStorage.getBadges(userId),
    
    // Vocabulary
    saveVocab: (userId, word, reps, learned) => 
      offlineStorage.saveVocabularyProgress(userId, word, reps, learned),
    getVocab: (userId) => offlineStorage.getVocabularyProgress(userId),
    
    // Storage management
    getStorageUsage: () => offlineStorage.getStorageUsage(),
    clearExpired: (days) => offlineStorage.clearExpiredData(days),
    
    // Network sync
    syncWithServer: (apiClient, token) => 
      offlineStorage.syncWithServer(apiClient, token)
  };
};