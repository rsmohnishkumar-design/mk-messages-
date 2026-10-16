// MK Messages service worker: caches the app shell, and shows call / message /
// invitation alerts from Web Push so calls ring even when the app is closed.
const CACHE = 'mk-shell-v4';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r).then((m) => m || caches.match('/')))
  );
});

const RING_TIMES = 12, RING_EVERY = 3000; // about 35 seconds of ringing
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch {}
  e.waitUntil((async () => {
    if (d.t === 'call-end') {
      (await self.registration.getNotifications({ tag: 'call-' + d.chat })).forEach((n) => n.close());
      return;
    }
    // if the app is open and visible it already shows the alert itself
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some((w) => w.visibilityState === 'visible')) return;
    const base = { icon: '/icon-192.png', badge: '/icon-192.png', data: { chat: d.chat, call: d.t === 'call' } };
    if (d.t === 'call') {
      // Browsers cannot loop a ringtone from the background, so re-alert every few seconds
      // (sound + vibration each time) until the call is answered, dismissed or ended.
      const tag = 'call-' + d.chat;
      const opts = {
        ...base, body: d.from + (d.title && d.title !== d.from ? ' in ' + d.title : ''), tag,
        renotify: true, requireInteraction: true, vibrate: [500, 250, 500, 250, 500, 250, 500],
        actions: [{ action: 'answer', title: 'Answer' }, { action: 'decline', title: 'Decline' }],
      };
      const title = 'Incoming ' + (d.video ? 'video' : 'voice') + ' call';
      for (let i = 0; i < RING_TIMES; i++) {
        await self.registration.showNotification(title, opts);
        await new Promise((r) => setTimeout(r, RING_EVERY));
        if (!(await self.registration.getNotifications({ tag })).length) break;
        const w = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (w.some((x) => x.visibilityState === 'visible')) break;
      }
    } else if (d.t === 'msg') {
      await self.registration.showNotification(d.title || 'New message', { ...base, body: d.body || '', tag: 'msg-' + d.chat, renotify: true, vibrate: [120, 60, 120] });
    } else {
      await self.registration.showNotification(d.title || 'MK Messages', { ...base, body: d.body || '', tag: 'inv', vibrate: [120, 60, 120] });
    }
  })());
});
self.addEventListener('notificationclick', (e) => {
  const d = e.notification.data || {};
  e.notification.close();
  if (e.action === 'decline') return;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.length) { const w = wins[0]; await w.focus(); w.postMessage({ type: 'open', chat: d.chat, call: !!d.call }); }
    else await self.clients.openWindow('/?chat=' + encodeURIComponent(d.chat || '') + (d.call ? '&call=1' : ''));
  })());
});
