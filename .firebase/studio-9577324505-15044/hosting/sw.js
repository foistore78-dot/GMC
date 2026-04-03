self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('Service worker activated');
});

self.addEventListener('fetch', () => {
  // Empty fetch handler to pass PWA installation criteria
});
