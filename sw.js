self.addEventListener('install', event => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', event => {
  // voliteľné: tu môžeš pridať caching
});
