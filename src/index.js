// MK Messages on Cloudflare: a Worker routes requests to one Durable Object (Hub)
// that holds all state and WebSocket connections. Uploaded media is stored in
// the Durable Object's own storage (chunked), so no R2 bucket is needed.
// Anyone can create a group (6-digit number) and becomes that group's admin.
// Anyone with the number can join and chat. Also: calls (WebRTC signaling),
// scheduled messages and AR pins.

const ORIGINS = ['https://rsmohnishkumar-design.github.io', 'https://mk-messages.pages.dev'];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = origin && ORIGINS.includes(origin) ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Filename, X-Mime',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    } : {};
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const res = await route(request, env);
    if (res.status === 101 || !origin) return res;
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) h.set(k, v);
    return new Response(res.body, { status: res.status, headers: h });
  },
};

async function route(request, env) {
  const stub = env.HUB.get(env.HUB.idFromName('main'));
  return stub.fetch(request);
}

const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json' } });
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const rand = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const id = () => rand(8);
const MAX_MSGS = 1000;
const CHUNK = 120 * 1024;          // DO storage values are limited to 128 KiB
const MAX_FILE = 12 * 1024 * 1024; // per upload
const FILE_URL = /^\/api\/file\/[0-9a-f]{32}$/;
const GIF_HOSTS = /^https:\/\/(media\d*\.giphy\.com|i\.giphy\.com|media\.tenor\.com|c\.tenor\.com)\//;
const INLINE_TYPES = /^(image\/(png|jpeg|gif|webp|avif)|video\/(mp4|webm|quicktime|ogg)|audio\/(webm|ogg|mpeg|mp4|wav|aac|x-m4a))$/;
const normName = (v) => String(v || '').trim().replace(/\s+/g, ' ');
const num = (v, min, max, def) => { v = +v; return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def; };
function cleanFile(f) {
  if (!f) return null;
  const url = String(f.url || '');
  if (!FILE_URL.test(url) && !GIF_HOSTS.test(url)) return undefined; // invalid
  return { url, name: String(f.name || 'file').slice(0, 80), size: +f.size || 0, type: String(f.type || '').slice(0, 60) };
}

async function pbkdf2(pw, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256));
}
async function hashPw(pw) { const salt = rand(16); return salt + ':' + (await pbkdf2(pw, salt)); }
async function verifyPw(pw, stored) { const [salt, h] = stored.split(':'); return (await pbkdf2(pw, salt)) === h; }

export class Hub {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.users = {}; this.groups = {}; this.sessions = {}; this.messages = {};
    this.sched = {}; this.pins = {}; this.calls = {};
    this.socks = new Map(); // WebSocket -> uid
    ctx.blockConcurrencyWhile(async () => {
      const s = ctx.storage;
      this.users = (await s.get('users')) || {};
      this.groups = (await s.get('groups')) || {};
      this.sessions = (await s.get('sessions')) || {};
      const ms = await s.list({ prefix: 'm:' });
      for (const [k, v] of ms) this.messages[k.slice(2)] = v;
      this.sched = (await s.get('sched')) || {};
      for (const [k, v] of await s.list({ prefix: 'p:' })) this.pins[k.slice(2)] = v;
    });
  }

  // ---- persistence ----
  save(...chatIds) {
    const o = { users: this.users, groups: this.groups, sessions: this.sessions, sched: this.sched };
    for (const c of chatIds) if (this.messages[c]) o['m:' + c] = this.messages[c];
    this.ctx.storage.put(o);
  }

  // ---- views ----
  isOnline(uid) { for (const u of this.socks.values()) if (u === uid) return true; return false; }
  pub(u) { return { id: u.id, username: u.username, name: u.name, about: u.about, avatar: u.avatar, isAdmin: u.isAdmin, online: this.isOnline(u.id), lastSeen: u.lastSeen }; }
  pubUsers(ids) { return ids.map((i) => this.users[i]).filter(Boolean).map((u) => this.pub(u)); }
  slim(m) { return m.deleted ? { ...m, text: '', file: null } : m; }
  chatView(c, uid) {
    const msgs = this.messages[c.id] || [];
    const last = [...msgs].reverse().find((m) => !(m.deletedFor || []).includes(uid));
    const unread = msgs.filter((m) => m.from !== uid && !m.system && !(m.readBy || []).includes(uid) && !(m.deletedFor || []).includes(uid)).length;
    const v = { id: c.id, type: c.type, members: c.members, unread, last: last && this.slim(last), pinned: (c.pinnedBy || []).includes(uid), muted: (c.mutedBy || []).includes(uid) };
    if (c.type === 'group') Object.assign(v, { name: c.name, number: c.number, description: c.description, admin: c.admin, onlyAdminPosts: !!c.onlyAdminPosts });
    return v;
  }
  chatsFor(uid) { return Object.values(this.groups).filter((g) => g.members.includes(uid)).map((g) => this.chatView(g, uid)); }
  allMemberIds(uid) { const s = new Set([uid]); this.chatsFor(uid).forEach((c) => c.members.forEach((m) => s.add(m))); return [...s]; }
  newGroupNumber() {
    let n;
    do { n = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000)); }
    while (Object.values(this.groups).some((g) => g.number === n));
    return n;
  }

  // ---- emit helpers ----
  send(ws, ev, data) { try { ws.send(JSON.stringify({ ev, data })); } catch {} }
  toUser(uid, ev, data) { for (const [ws, u] of this.socks) if (u === uid) this.send(ws, ev, data); }
  toChat(cid, ev, data, except) {
    const g = this.groups[cid]; if (!g) return;
    for (const [ws, u] of this.socks) if (ws !== except && g.members.includes(u)) this.send(ws, ev, data);
  }
  toAll(ev, data) { for (const ws of this.socks.keys()) this.send(ws, ev, data); }
  sendChats(uid) { this.toUser(uid, 'chats', this.chatsFor(uid)); }
  refreshAll(g) {
    const users = this.pubUsers(g.members);
    g.members.forEach((m) => { this.toUser(m, 'users', users); this.sendChats(m); });
  }
  addSystem(cid, text) {
    const m = { id: id(), chat: cid, from: null, system: true, text, ts: Date.now(), readBy: [] };
    (this.messages[cid] = this.messages[cid] || []).push(m);
    this.toChat(cid, 'message', m);
  }

  // ---- HTTP ----
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 });
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      const uid = this.sessions[url.searchParams.get('token')];
      if (!uid || !this.users[uid]) { server.close(4001, 'auth'); return new Response(null, { status: 101, webSocket: client }); }
      this.onConnect(server, uid);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname === '/api/register' && request.method === 'POST') return this.register(await request.json().catch(() => ({})));
    if (url.pathname === '/api/login' && request.method === 'POST') return this.login(await request.json().catch(() => ({})));
    if (url.pathname === '/api/upload' && request.method === 'POST') return this.upload(request);
    if (url.pathname.startsWith('/api/file/') && (request.method === 'GET' || request.method === 'HEAD')) return this.serveFile(request, url.pathname.slice(10));
    return new Response('Not found', { status: 404 });
  }

  newSession(uid) {
    const token = rand(24);
    this.sessions[token] = uid;
    const keys = Object.keys(this.sessions);
    if (keys.length > 2000) for (const k of keys.slice(0, keys.length - 2000)) delete this.sessions[k];
    return token;
  }
  findByName(v) { const k = normName(v).toLowerCase(); return k ? Object.values(this.users).find((u) => u.username.toLowerCase() === k) : null; }
  async register({ username, password }) {
    const name = normName(username).slice(0, 30);
    if (!name) return json({ error: 'Enter a username' }, 400);
    if (String(password || '').length < 4) return json({ error: 'Password must be at least 4 characters' }, 400);
    if (this.findByName(name)) return json({ error: 'That username is already taken' }, 400);
    const first = Object.keys(this.users).length === 0;
    const u = { id: id(), username: name, name, pw: await hashPw(String(password)), about: 'Hey there! I am using MK Messages', avatar: null, isAdmin: first, lastSeen: Date.now() };
    this.users[u.id] = u;
    const token = this.newSession(u.id);
    this.save();
    return json({ token, user: this.pub(u) });
  }
  async login({ username, password }) {
    const u = this.findByName(username);
    if (!u || !(await verifyPw(String(password || ''), u.pw))) return json({ error: 'Wrong username or password' }, 400);
    const token = this.newSession(u.id);
    this.save();
    return json({ token, user: this.pub(u) });
  }
  async upload(request) {
    const uid = this.sessions[(request.headers.get('Authorization') || '').replace('Bearer ', '')];
    if (!uid) return json({ error: 'Not signed in' }, 401);
    if ((+request.headers.get('Content-Length') || 0) > MAX_FILE + 1024) return json({ error: 'File too large (max 12 MB)' }, 413);
    let orig = 'file';
    try { orig = decodeURIComponent(request.headers.get('X-Filename') || 'file'); } catch {}
    orig = orig.replace(/[^\w.\- ]/g, '_').slice(0, 80) || 'file';
    const type = String(request.headers.get('X-Mime') || 'application/octet-stream').split(';')[0].trim().slice(0, 60);
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_FILE) return json({ error: 'File too large (max 12 MB)' }, 413);
    const fid = rand(16);
    const chunks = Math.max(1, Math.ceil(body.byteLength / CHUNK));
    for (let i = 0; i < chunks; i += 32) {
      const o = {};
      for (let j = i; j < Math.min(chunks, i + 32); j++) o[`f:${fid}:${j}`] = body.slice(j * CHUNK, (j + 1) * CHUNK);
      await this.ctx.storage.put(o);
    }
    await this.ctx.storage.put('fm:' + fid, { name: orig, type, size: body.byteLength, chunks, owner: uid, ts: Date.now() });
    return json({ url: '/api/file/' + fid, name: orig, size: body.byteLength, type });
  }
  async serveFile(request, fid) {
    if (!/^[0-9a-f]{32}$/.test(fid)) return new Response('Not found', { status: 404 });
    const meta = await this.ctx.storage.get('fm:' + fid);
    if (!meta) return new Response('Not found', { status: 404 });
    const size = meta.size;
    let start = 0, end = size - 1, status = 200;
    const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') || '');
    if (m && (m[1] || m[2])) {
      if (m[1] === '') start = Math.max(0, size - +m[2]);
      else { start = +m[1]; if (m[2] !== '') end = Math.min(end, +m[2]); }
      if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      status = 206;
    }
    const inline = INLINE_TYPES.test(meta.type);
    const h = {
      'Content-Type': inline ? meta.type : 'application/octet-stream',
      'Content-Length': String(size ? end - start + 1 : 0),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Content-Security-Policy': 'sandbox',
      'Content-Disposition': (inline ? 'inline' : 'attachment') + `; filename="${meta.name}"`,
    };
    if (status === 206) h['Content-Range'] = `bytes ${start}-${end}/${size}`;
    if (request.method === 'HEAD' || !size) return new Response(null, { status, headers: h });
    const first = Math.floor(start / CHUNK), last = Math.floor(end / CHUNK);
    const out = new Uint8Array(end - start + 1);
    for (let i = first; i <= last; i += 32) {
      const keys = []; for (let j = i; j <= Math.min(last, i + 31); j++) keys.push(`f:${fid}:${j}`);
      const got = await this.ctx.storage.get(keys);
      for (let j = i; j <= Math.min(last, i + 31); j++) {
        const buf = new Uint8Array(got.get(`f:${fid}:${j}`));
        const cs = j * CHUNK, from = Math.max(start, cs), to = Math.min(end, cs + buf.length - 1);
        out.set(buf.subarray(from - cs, to - cs + 1), from - start);
      }
    }
    return new Response(out, { status, headers: h });
  }
  purgeFile(f) {
    const mm = f && FILE_URL.test(f.url || '') ? f.url.slice(10) : null;
    if (!mm) return;
    this.ctx.storage.get('fm:' + mm).then((meta) => {
      if (!meta) return;
      const keys = ['fm:' + mm]; for (let i = 0; i < meta.chunks; i++) keys.push(`f:${mm}:${i}`);
      for (let i = 0; i < keys.length; i += 120) this.ctx.storage.delete(keys.slice(i, i + 120));
    }).catch(() => {});
  }

  // ---- WebSocket ----
  onConnect(ws, uid) {
    this.socks.set(ws, uid);
    this.send(ws, 'init', { me: this.pub(this.users[uid]), chats: this.chatsFor(uid), users: this.pubUsers(this.allMemberIds(uid)), calls: this.callsFor(uid) });
    this.toAll('presence', { id: uid, online: true });
    ws.addEventListener('message', async (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      const h = this.handlers[m.ev];
      if (!h) return;
      const cb = (d) => m.ack && this.send(ws, 'ack:' + m.ack, d);
      try { await h.call(this, { ws, uid, me: this.users[uid] }, m.data || {}, cb); }
      catch (err) { console.error(m.ev, err); cb({ error: 'Server error' }); }
    });
    const gone = () => {
      if (!this.socks.delete(ws)) return;
      if (!this.isOnline(uid)) {
        this.leaveCalls(uid);
        this.users[uid].lastSeen = Date.now();
        this.save();
        this.toAll('presence', { id: uid, online: false, lastSeen: this.users[uid].lastSeen });
      }
    };
    ws.addEventListener('close', gone);
    ws.addEventListener('error', gone);
  }

  // ---- messages ----
  deliver(uid, chat, { text, file, replyTo, forwarded }) {
    const c = this.chatOf(uid, chat);
    if (!c) return { error: 'Not a member' };
    if (c.type === 'group' && c.onlyAdminPosts && c.admin !== uid) return { error: 'Only the admin can send messages here' };
    text = String(text || '').slice(0, 4000);
    file = cleanFile(file);
    if (file === undefined) return { error: 'Invalid attachment' };
    if (!text.trim() && !file) return { ok: true };
    const list = (this.messages[chat] = this.messages[chat] || []);
    let rp = null;
    if (replyTo) {
      const o = list.find((m) => m.id === replyTo);
      if (o) rp = { id: o.id, from: o.from, text: o.deleted ? 'Message deleted' : o.text || (o.file ? '📎 ' + o.file.name : '') };
    }
    const m = { id: id(), chat, from: uid, text, ts: Date.now(), file: file || null, replyTo: rp, forwarded: !!forwarded, reactions: {}, readBy: [uid], deliveredTo: [uid], starredBy: [] };
    c.members.forEach((mm) => { if (mm !== uid && this.isOnline(mm)) m.deliveredTo.push(mm); });
    list.push(m);
    if (list.length > MAX_MSGS) list.splice(0, list.length - MAX_MSGS).forEach((x) => this.purgeFile(x.file));
    this.save(chat);
    this.toChat(chat, 'message', m);
    c.members.forEach((mm) => this.sendChats(mm));
    return { ok: true, m };
  }

  // ---- scheduled messages ----
  armAlarm() {
    const ts = Object.values(this.sched).map((i) => i.at);
    if (ts.length) this.ctx.storage.setAlarm(Math.max(Math.min(...ts), Date.now() + 1000));
    else this.ctx.storage.deleteAlarm();
  }
  async alarm() {
    const now = Date.now();
    for (const [k, it] of Object.entries(this.sched)) {
      if (it.at > now) continue;
      delete this.sched[k];
      const r = this.deliver(it.from, it.chat, it);
      this.toUser(it.from, 'schedule:done', { id: it.id, error: r.error || null });
    }
    this.save();
    this.armAlarm();
  }

  // ---- calls (WebRTC signaling only; media flows peer-to-peer) ----
  callView(call) { return call ? { id: call.id, video: call.video, users: call.users.slice(), started: call.started } : null; }
  callsFor(uid) {
    const o = {};
    for (const [cid, call] of Object.entries(this.calls)) if (this.chatOf(uid, cid)) o[cid] = this.callView(call);
    return o;
  }
  leaveCall(uid, cid) {
    const call = this.calls[cid];
    if (!call || !call.users.includes(uid)) return;
    call.users = call.users.filter((u) => u !== uid);
    call.users.forEach((u) => this.toUser(u, 'call:left', { chat: cid, user: uid }));
    if (!call.users.length) {
      delete this.calls[cid];
      const mins = Math.max(1, Math.round((Date.now() - call.started) / 60000));
      this.addSystem(cid, `Call ended · ${mins} min`);
      this.save(cid);
    }
    const g = this.groups[cid];
    if (g) g.members.forEach((m) => this.toUser(m, 'call:state', { chat: cid, call: this.callView(this.calls[cid]) }));
  }
  leaveCalls(uid) { for (const cid of Object.keys(this.calls)) this.leaveCall(uid, cid); }

  chatOf(uid, cid) { const c = this.groups[cid]; return c && c.members.includes(uid) ? c : null; }
  canManage(c, me) { return c.admin === me.id; }
  findMsg(cid, mid) { return (this.messages[cid] || []).find((x) => x.id === mid); }

  get handlers() {
    return {
      'group:create'({ uid, me }, { name, description, onlyAdminPosts }, cb) {
        name = String(name || '').trim().slice(0, 40);
        if (!name) return cb({ error: 'Group name required' });
        const g = { id: id(), type: 'group', name, description: String(description || '').slice(0, 200), number: this.newGroupNumber(), admin: uid, members: [uid], created: Date.now(), onlyAdminPosts: !!onlyAdminPosts };
        this.groups[g.id] = g;
        this.addSystem(g.id, `${me.name} created group "${name}"`);
        this.save(g.id);
        this.sendChats(uid);
        cb({ ok: true, chat: this.chatView(g, uid) });
      },
      'group:join'({ uid, me }, { number }, cb) {
        const g = Object.values(this.groups).find((x) => x.type === 'group' && x.number === String(number || '').trim());
        if (!g) return cb({ error: 'No group with that number' });
        if (g.members.includes(uid)) return cb({ ok: true, chat: this.chatView(g, uid), already: true });
        g.members.push(uid);
        this.addSystem(g.id, `${me.name} joined using the group number`);
        this.save(g.id);
        this.refreshAll(g);
        cb({ ok: true, chat: this.chatView(g, uid) });
      },
      'group:leave'({ uid, me }, { chat }, cb) {
        const g = this.chatOf(uid, chat); if (!g) return cb({ error: 'Not a member' });
        this.addSystem(g.id, `${me.name} left`);
        g.members = g.members.filter((m) => m !== uid);
        this.save(g.id);
        this.sendChats(uid);
        this.refreshAll(g);
        cb({ ok: true });
      },
      'group:update'({ uid, me }, { chat, name, description, onlyAdminPosts }, cb) {
        const g = this.chatOf(uid, chat);
        if (!g || !this.canManage(g, me)) return cb({ error: 'Admin only' });
        if (name) g.name = String(name).trim().slice(0, 40);
        if (description !== undefined) g.description = String(description).slice(0, 200);
        if (onlyAdminPosts !== undefined) g.onlyAdminPosts = !!onlyAdminPosts;
        this.save();
        this.refreshAll(g);
        cb({ ok: true });
      },
      'group:remove'({ uid, me }, { chat, user }, cb) {
        const g = this.chatOf(uid, chat);
        if (!g || !this.canManage(g, me)) return cb({ error: 'Admin only' });
        if (user === g.admin) return cb({ error: 'Cannot remove the group admin' });
        const target = this.users[user];
        g.members = g.members.filter((m) => m !== user);
        this.addSystem(g.id, `${me.name} removed ${target ? target.name : 'a member'}`);
        this.save(g.id);
        this.sendChats(user);
        this.refreshAll(g);
        cb({ ok: true });
      },
      'group:regenerate'({ uid, me }, { chat }, cb) {
        const g = this.chatOf(uid, chat);
        if (!g || !this.canManage(g, me)) return cb({ error: 'Admin only' });
        g.number = this.newGroupNumber();
        this.addSystem(g.id, `${me.name} changed the group number`);
        this.save(g.id);
        this.refreshAll(g);
        cb({ ok: true, number: g.number });
      },
      'group:delete'({ uid, me }, { chat }, cb) {
        const g = this.chatOf(uid, chat);
        if (!g || !this.canManage(g, me)) return cb({ error: 'Admin only' });
        const members = g.members.slice();
        (this.messages[g.id] || []).forEach((x) => this.purgeFile(x.file));
        (this.pins[g.id] || []).forEach((x) => this.purgeFile(x.photo && { url: x.photo }));
        delete this.pins[g.id]; this.ctx.storage.delete('p:' + g.id); delete this.calls[g.id];
        Object.keys(this.sched).forEach((k) => { if (this.sched[k].chat === g.id) delete this.sched[k]; });
        delete this.groups[g.id];
        delete this.messages[g.id];
        this.ctx.storage.delete('m:' + g.id);
        this.save();
        members.forEach((m) => { this.toUser(m, 'chat:deleted', g.id); this.sendChats(m); });
        cb({ ok: true });
      },
      'dm:open'({ uid }, { username }, cb) {
        const other = this.findByName(username);
        if (!other || other.id === uid) return cb({ error: 'User not found' });
        const cid = 'dm_' + [uid, other.id].sort().join('_');
        let c = this.groups[cid];
        if (!c) { c = { id: cid, type: 'dm', members: [uid, other.id], created: Date.now() }; this.groups[cid] = c; this.save(); }
        this.refreshAll(c);
        cb({ ok: true, chat: this.chatView(c, uid) });
      },
      'chat:history'({ uid }, { chat }, cb) {
        if (!this.chatOf(uid, chat)) return cb({ error: 'Not a member' });
        const msgs = (this.messages[chat] || []).filter((m) => !(m.deletedFor || []).includes(uid));
        cb({ messages: msgs.slice(-300).map((m) => this.slim(m)) });
      },
      'message:send'({ uid }, d, cb) {
        const r = this.deliver(uid, d.chat, d);
        cb(r.error ? { error: r.error } : { ok: true });
      },
      'message:edit'({ uid }, { chat, id: mid, text }) {
        const m = this.chatOf(uid, chat) && this.findMsg(chat, mid);
        if (!m || m.from !== uid || m.deleted) return;
        m.text = String(text || '').slice(0, 4000); m.edited = true;
        this.save(chat);
        this.toChat(chat, 'message:update', { chat, id: mid, text: m.text, edited: true });
      },
      'message:delete'({ uid, me }, { chat, id: mid, everyone }) {
        const c = this.chatOf(uid, chat);
        const m = c && this.findMsg(chat, mid);
        if (!m) return;
        if (everyone && (m.from === uid || this.canManage(c, me))) {
          this.purgeFile(m.file);
          m.deleted = true; m.text = ''; m.file = null;
          this.save(chat);
          this.toChat(chat, 'message:update', { chat, id: mid, deleted: true, text: '', file: null });
        } else {
          (m.deletedFor = m.deletedFor || []).push(uid);
          this.save(chat);
          this.toUser(uid, 'message:remove', { chat, id: mid });
        }
        c.members.forEach((mm) => this.sendChats(mm));
      },
      'message:react'({ uid }, { chat, id: mid, emoji }) {
        const m = this.chatOf(uid, chat) && this.findMsg(chat, mid);
        if (!m || m.deleted) return;
        m.reactions = m.reactions || {};
        for (const e of Object.keys(m.reactions)) {
          m.reactions[e] = m.reactions[e].filter((u) => u !== uid);
          if (!m.reactions[e].length) delete m.reactions[e];
        }
        if (emoji) (m.reactions[emoji] = m.reactions[emoji] || []).push(uid);
        this.save(chat);
        this.toChat(chat, 'message:update', { chat, id: mid, reactions: m.reactions });
      },
      'message:star'({ uid }, { chat, id: mid }) {
        const m = this.chatOf(uid, chat) && this.findMsg(chat, mid);
        if (!m) return;
        const s = m.starredBy || [];
        m.starredBy = s.includes(uid) ? s.filter((u) => u !== uid) : [...s, uid];
        this.save(chat);
        this.toUser(uid, 'message:update', { chat, id: mid, starredBy: m.starredBy });
      },
      'chat:read'({ uid }, { chat }) {
        if (!this.chatOf(uid, chat)) return;
        let changed = false;
        for (const m of this.messages[chat] || []) if (!m.system && !m.readBy.includes(uid)) { m.readBy.push(uid); changed = true; }
        if (changed) { this.save(chat); this.toChat(chat, 'chat:read', { chat, user: uid }); this.sendChats(uid); }
      },
      'chat:pref'({ uid }, { chat, pinned, muted }) {
        const c = this.chatOf(uid, chat); if (!c) return;
        const toggle = (k, on) => { c[k] = (c[k] || []).filter((u) => u !== uid); if (on) c[k].push(uid); };
        if (pinned !== undefined) toggle('pinnedBy', pinned);
        if (muted !== undefined) toggle('mutedBy', muted);
        this.save();
        this.sendChats(uid);
      },
      'chat:clear'({ uid }, { chat }) {
        if (!this.chatOf(uid, chat)) return;
        for (const m of this.messages[chat] || []) (m.deletedFor = m.deletedFor || []).push(uid);
        this.save(chat);
        this.sendChats(uid);
      },
      typing({ ws, uid, me }, { chat, typing }) {
        if (this.chatOf(uid, chat)) this.toChat(chat, 'typing', { chat, user: uid, name: me.name, typing: !!typing }, ws);
      },
      'profile:update'({ uid, me }, { name, about, avatar }, cb) {
        if (name && normName(name) !== me.name) {
          const nn = normName(name).slice(0, 30), clash = this.findByName(nn);
          if (!nn || (clash && clash.id !== uid)) return cb({ error: 'That username is already taken' });
          me.name = nn; me.username = nn;
        }
        if (about !== undefined) me.about = String(about).slice(0, 120);
        if (avatar !== undefined) me.avatar = avatar;
        this.save();
        const pu = [this.pub(me)];
        this.allMemberIds(uid).forEach((u) => this.toUser(u, 'users', pu));
        cb({ ok: true, user: pu[0] });
      },
      'message:schedule'({ uid }, { chat, text, file, replyTo, at }, cb) {
        const c = this.chatOf(uid, chat);
        if (!c) return cb({ error: 'Not a member' });
        at = +at;
        if (!(at > Date.now() + 5000) || at > Date.now() + 366 * 864e5) return cb({ error: 'Pick a time in the future (within a year)' });
        text = String(text || '').slice(0, 4000);
        file = cleanFile(file);
        if (file === undefined) return cb({ error: 'Invalid attachment' });
        if (!text.trim() && !file) return cb({ error: 'Type a message first' });
        if (Object.values(this.sched).filter((i) => i.from === uid).length >= 50) return cb({ error: 'Too many scheduled messages (max 50)' });
        const it = { id: id(), chat, from: uid, text, file: file || null, replyTo: replyTo || null, at };
        this.sched[it.id] = it;
        this.save();
        this.armAlarm();
        cb({ ok: true, item: it });
      },
      'schedule:list'({ uid }, _d, cb) {
        cb({ items: Object.values(this.sched).filter((i) => i.from === uid).sort((a, b) => a.at - b.at) });
      },
      'schedule:cancel'({ uid }, { id: sid }, cb) {
        const it = this.sched[sid];
        if (!it || it.from !== uid) return cb({ error: 'Not found' });
        delete this.sched[sid];
        this.save();
        this.armAlarm();
        cb({ ok: true });
      },
      'call:join'({ uid, me }, { chat, video }, cb) {
        const c = this.chatOf(uid, chat);
        if (!c) return cb({ error: 'Not a member' });
        let call = this.calls[chat];
        const fresh = !call;
        if (fresh) call = this.calls[chat] = { id: id(), chat, video: !!video, started: Date.now(), users: [] };
        if (call.users.includes(uid)) return cb({ error: 'Already in this call' });
        const others = call.users.slice();
        call.users.push(uid);
        if (fresh) {
          this.addSystem(chat, `📞 ${me.name} started a ${call.video ? 'video' : 'voice'} call`);
          this.save(chat);
          c.members.forEach((m) => { if (m !== uid) this.toUser(m, 'call:ring', { chat, from: uid, video: call.video, id: call.id }); });
        } else others.forEach((u) => this.toUser(u, 'call:joined', { chat, user: uid }));
        c.members.forEach((m) => this.toUser(m, 'call:state', { chat, call: this.callView(call) }));
        cb({ ok: true, call: { id: call.id, video: call.video, users: others } });
      },
      'call:leave'({ uid }, { chat }, cb) { this.leaveCall(uid, chat); cb({ ok: true }); },
      'call:signal'({ uid }, { chat, to, data }) {
        const call = this.calls[chat];
        if (!call || !call.users.includes(uid) || !call.users.includes(to) || !data) return;
        this.toUser(to, 'call:signal', { chat, from: uid, data });
      },
      'call:annot'({ uid }, { chat, target, x, y, text, aid }) {
        const call = this.calls[chat];
        if (!call || !call.users.includes(uid)) return;
        const d = { chat, from: uid, target: String(target || ''), x: num(x, 0, 1, 0.5), y: num(y, 0, 1, 0.5), text: String(text || '').slice(0, 120), aid: String(aid || id()).slice(0, 24) };
        call.users.forEach((u) => { if (u !== uid) this.toUser(u, 'call:annot', d); });
      },
      'pin:list'({ uid }, { chat }, cb) {
        if (!this.chatOf(uid, chat)) return cb({ error: 'Not a member' });
        cb({ pins: this.pins[chat] || [] });
      },
      'pin:create'({ uid }, d, cb) {
        const c = this.chatOf(uid, d.chat);
        if (!c) return cb({ error: 'Not a member' });
        const text = String(d.text || '').trim().slice(0, 200);
        if (!text) return cb({ error: 'Write a note first' });
        if (!Number.isFinite(+d.lat) || !Number.isFinite(+d.lng)) return cb({ error: 'Location not available yet' });
        const photo = d.photo && FILE_URL.test(String(d.photo)) ? String(d.photo) : null;
        const pin = { id: id(), chat: d.chat, from: uid, text, emoji: String(d.emoji || '📌').slice(0, 8),
          lat: num(d.lat, -90, 90, 0), lng: num(d.lng, -180, 180, 0), acc: num(d.acc, 0, 100000, 0),
          heading: num(d.heading, 0, 360, 0), pitch: num(d.pitch, -90, 90, 0), dist: num(d.dist, 0.3, 15, 2), photo, ts: Date.now() };
        const list = (this.pins[d.chat] = this.pins[d.chat] || []);
        list.push(pin);
        if (list.length > 120) { const old = list.shift(); this.purgeFile(old.photo && { url: old.photo }); }
        this.ctx.storage.put('p:' + d.chat, list);
        this.toChat(d.chat, 'pin', pin);
        cb({ ok: true, pin });
      },
      'pin:delete'({ uid, me }, { chat, id: pid }, cb) {
        const c = this.chatOf(uid, chat);
        const list = this.pins[chat] || [];
        const pin = c && list.find((x) => x.id === pid);
        if (!pin || (pin.from !== uid && !this.canManage(c, me))) return cb({ error: 'Not allowed' });
        this.pins[chat] = list.filter((x) => x.id !== pid);
        this.ctx.storage.put('p:' + chat, this.pins[chat]);
        this.purgeFile(pin.photo && { url: pin.photo });
        this.toChat(chat, 'pin:removed', { chat, id: pid });
        cb({ ok: true });
      },
      'users:lookup'({ ws, uid }, { ids }) {
        const allowed = new Set(this.allMemberIds(uid));
        this.send(ws, 'users', this.pubUsers((ids || []).filter((i) => allowed.has(i))));
      },
    };
  }
}
