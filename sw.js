const CACHE = 'kopdes-merge-v8';
const ASSETS = [
  './', 'index.html', 'style.css', 'game.js', 'audio.js', 'vendor/matter.min.js', 'manifest.webmanifest',
  'assets/lvl1.png', 'assets/lvl2.png', 'assets/lvl3.png', 'assets/lvl4.png', 'assets/lvl5.png', 'assets/lvl6.png',
  'assets/m2_lvl1.png', 'assets/m2_lvl2.png', 'assets/m2_lvl3.png', 'assets/m2_lvl4.png', 'assets/m2_lvl5.png',
  'assets/merge_lvl1.wav', 'assets/merge_lvl2.wav', 'assets/merge_lvl3_hutang.wav', 'assets/merge_lvl4_mbg.wav',
  'assets/m2_merge1.wav', 'assets/m2_merge2.wav', 'assets/m2_merge3.wav',
  'assets/icon-192.png', 'assets/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: cepat dari cache, diperbarui di belakang layar.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    )
  );
});
