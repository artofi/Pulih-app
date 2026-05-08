const CACHE = 'pulih-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-48.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// PUSH NOTIFICATION dari SW
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'Pulih — Reminder';
  const options = {
    body: data.body || 'Jangan lupa check-in hari ini!',
    icon: './icons/icon-192.png',
    badge: './icons/icon-96.png',
    vibrate: [200, 100, 200],
    tag: 'pulih-reminder',
    renotify: true,
    data: { url: self.registration.scope }
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Klik notifikasi → buka app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('Pulih-app') && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(e.notification.data.url || './');
    })
  );
});

// PERIODIC BACKGROUND SYNC (untuk reminder harian)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'pulih-daily-reminder') {
    e.waitUntil(sendDailyReminder());
  }
});

async function sendDailyReminder() {
  const allClients = await clients.matchAll();
  // Cek apakah app sedang dibuka — kalau tidak, kirim notifikasi
  if (allClients.length === 0) {
    await self.registration.showNotification('Pulih — Check-in Harian', {
      body: 'Sudahkah kamu check-in hari ini? Jaga streakmu tetap hidup!',
      icon: './icons/icon-192.png',
      badge: './icons/icon-96.png',
      vibrate: [200, 100, 200],
      tag: 'pulih-daily',
      data: { url: self.registration.scope }
    });
  }
}

// MESSAGE dari halaman utama → kirim notifikasi
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = e.data;
    self.registration.showNotification(title || 'Pulih', {
      body: body || 'Jangan lupa check-in hari ini!',
      icon: './icons/icon-192.png',
      badge: './icons/icon-96.png',
      vibrate: [200, 100, 200],
      tag: 'pulih-reminder',
      renotify: true,
      data: { url: self.registration.scope }
    });
  }
});
