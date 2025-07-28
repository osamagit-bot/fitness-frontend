// Service Worker for offline font caching
const CACHE_NAME = 'fitness-gym-fonts-v1';
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap',
  'https://fonts.googleapis.com/css2?family=Oxanium:wght@200..800&display=swap',
  'https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,100..700;1,100..700&family=Lilita+One&family=Righteous&display=swap',
  'https://fonts.googleapis.com/css2?family=Hammersmith+One&display=swap',
  'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
];

// Install event - cache fonts
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(FONT_URLS);
      })
      .catch((error) => {
        console.log('Font caching failed:', error);
      })
  );
});

// Fetch event - serve cached fonts when offline
self.addEventListener('fetch', (event) => {
  // Only handle font requests
  if (event.request.url.includes('fonts.googleapis.com') || 
      event.request.url.includes('fonts.gstatic.com') ||
      event.request.url.includes('unpkg.com/boxicons')) {
    
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Return cached version or fetch from network
          return response || fetch(event.request);
        })
        .catch(() => {
          // If both cache and network fail, return empty response
          return new Response('', { status: 200 });
        })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});