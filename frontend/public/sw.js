const CACHE_NAME = 'storybridge-v1';
const API_CACHE_NAME = 'storybridge-api-v1';

// Files to cache for offline functionality
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  // Add other static assets
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } 
  // Handle static assets
  else {
    event.respondWith(handleStaticRequest(request));
  }
});

async function handleApiRequest(request) {
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    // Cache successful GET requests
    if (networkResponse.status === 200 && request.method === 'GET') {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed for API request, trying cache');
    
    // For GET requests, try cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline response for failed requests
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This feature requires an internet connection' 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleStaticRequest(request) {
  try {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network if not in cache
    const networkResponse = await fetch(request);
    
    // Cache the response
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    console.log('Both cache and network failed');
    
    // Return offline fallback
    if (request.destination === 'document') {
      return caches.match('/');
    }
    
    return new Response('Offline content not available', { status: 503 });
  }
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-progress') {
    event.waitUntil(syncProgressData());
  }
});

async function syncProgressData() {
  try {
    // Get offline progress data from IndexedDB
    const offlineData = await getOfflineProgressData();
    
    if (offlineData.length > 0) {
      for (const progressData of offlineData) {
        await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${progressData.token}`
          },
          body: JSON.stringify(progressData.data)
        });
      }
      
      // Clear synced data
      await clearSyncedProgressData();
    }
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getOfflineProgressData() {
  // This would integrate with IndexedDB
  return [];
}

async function clearSyncedProgressData() {
  // This would clear synced data from IndexedDB
}

// Message handling for cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'UPDATE_CACHE') {
    // Force cache update
    caches.delete(CACHE_NAME).then(() => {
      caches.delete(API_CACHE_NAME);
    });
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

console.log('StoryBridge Service Worker loaded');