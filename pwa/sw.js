// MK Messages service worker: caches the app shell; shows call / message / invitation
// alerts from Web Push (calls re-alert like a ringer); handles notification actions
// (reply, mark read, answer, hang up); receives files and text shared from other apps.
const CACHE = 'mk-shell-v6';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];
const RING_TIMES = 12, RING_EVERY = 3000; // about 35 seconds of ringing

// small key-value store shared with the page (sign-in token, shared files)
const kvDb = () => new Promise((res, rej) => { const r = indexedDB.open('mk', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function kvSet(k, v) { try { const db = await kvDb(); await new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); db.close(); } catch {} }
async function kvGet(k) { try { const db = await kvDb(); const v = await new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); db.close(); return v; } catch { return undefined; } }

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method === 'POST' && u.pathname === '/share') {      // "Share to MK Messages" from another app
    e.respondWith((async () => {
      try {
        const fd = await r.formData();
        const files = fd.getAll('media').filter((f) => f && f.size).map((f) => ({ name: f.name, type: f.type, blob: f }));
        await kvSet('share', { title: String(fd.get('title') || ''), text: String(fd.get('text') || ''), url: String(fd.get('url') || ''), files, at: Date.now() });
      } catch {}
      return Response.redirect('/?share=1', 303);
    })());
    return;
  }
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(r).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r).then((m) => m || caches.match('/')))
  );
});

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
      await self.registration.showNotification(d.title || 'New message', {
        ...base, body: d.body || '', tag: 'msg-' + d.chat, renotify: true, vibrate: [120, 60, 120],
        actions: [{ action: 'reply', type: 'text', title: 'Reply', placeholder: 'Write a reply' }, { action: 'read', title: 'Mark as read' }],
      });
    } else {
      await self.registration.showNotification(d.title || 'MK Messages', { ...base, body: d.body || '', tag: 'inv', vibrate: [120, 60, 120] });
    }
  })());
});

async function api(path, body) {
  const [token, base] = [await kvGet('token'), await kvGet('api')];
  if (!token || !base) return false;
  try { return (await fetch(base + path, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).ok; } catch { return false; }
}
self.addEventListener('notificationclick', (e) => {
  const n = e.notification, d = n.data || {};
  if (e.action === 'decline') { n.close(); return; }
  if (e.action === 'reply' && e.reply && d.chat) {          // reply straight from the notification
    e.waitUntil((async () => {
      const ok = await api('/api/send', { chat: d.chat, text: e.reply });
      await self.registration.showNotification(n.title, { icon: '/icon-192.png', badge: '/icon-192.png', tag: n.tag, silent: true, data: d, body: ok ? 'You: ' + e.reply : 'Could not send. Open MK Messages to retry.' });
      if (ok) setTimeout(() => n.close(), 2500);
    })());
    return;
  }
  if (e.action === 'read' && d.chat) { n.close(); e.waitUntil(api('/api/read', { chat: d.chat })); return; }
  n.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (e.action === 'hangup') { wins.forEach((w) => w.postMessage({ type: 'hangup' })); return; }
    if (wins.length) { const w = wins[0]; await w.focus(); w.postMessage({ type: 'open', chat: d.chat, call: !!d.call, ongoing: !!d.ongoing }); }
    else await self.clients.openWindow('/?chat=' + encodeURIComponent(d.chat || '') + (d.call ? '&call=1' : ''));
  })());
});
