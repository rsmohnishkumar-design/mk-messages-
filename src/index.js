// MK Messages on Cloudflare: a Worker routes requests to one Durable Object (Hub)
// that holds all state and WebSocket connections. Uploads live in R2.
// First registered user = Admin. Only the admin creates groups (6-digit number).
// Anyone with the number can join and chat.

const ORIGINS = ['https://rsmohnishkumar-design.github.io'];

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
  const url = new URL(request.url);
  if (url.pathname.startsWith('/uploads/') && env.UPLOADS) {
    const obj = await env.UPLOADS.get(decodeURIComponent(url.pathname.slice(9)));
    if (!obj) return new Response('Not found', { status: 404 });
    const h = new Headers();
    obj.writeHttpMetadata(h);
    h.set('X-Content-Type-Options', 'nosniff');
    h.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(obj.body, { headers: h });
  }
  const stub = env.HUB.get(env.HUB.idFromName('main'));
  return stub.fetch(request);
}

const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json' } });
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const rand = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const id = () => rand(8);
const MAX_MSGS = 1000;

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
    this.socks = new Map(); // WebSocket -> uid
    ctx.blockConcurrencyWhile(async () => {
      const s = ctx.storage;
      this.users = (await s.get('users')) || {};
      this.groups = (await s.get('groups')) || {};
      this.sessions = (await s.get('sessions')) || {};
      const ms = await s.list({ prefix: 'm:' });
      for (const [k, v] of ms) this.messages[k.slice(2)] = v;
    });
  }

  // ---- persistence ----
  save(...chatIds) {
    const o = { users: this.users, groups: this.groups, sessions: this.sessions };
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
    return new Response('Not found', { status: 404 });
  }

  newSession(uid) {
    const token = rand(24);
    this.sessions[token] = uid;
    const keys = Object.keys(this.sessions);
    if (keys.length > 2000) for (const k of keys.slice(0, keys.length - 2000)) delete this.sessions[k];
    return token;
  }
  async register({ username, password, name }) {
    const uname = String(username || '').trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,20}$/.test(uname)) return json({ error: 'Username: 3-20 letters, numbers, _ or .' }, 400);
    if (String(password || '').length < 4) return json({ error: 'Password must be at least 4 characters' }, 400);
    if (Object.values(this.users).some((u) => u.username === uname)) return json({ error: 'Username already taken' }, 400);
    const first = Object.keys(this.users).length === 0;
    const u = { id: id(), username: uname, name: String(name || uname).slice(0, 30), pw: await hashPw(String(password)), about: 'Hey there! I am using MK Messages', avatar: null, isAdmin: first, lastSeen: Date.now() };
    this.users[u.id] = u;
    const token = this.newSession(u.id);
    this.save();
    return json({ token, user: this.pub(u) });
  }
  async login({ username, password }) {
    const u = Object.values(this.users).find((x) => x.username === String(username || '').trim().toLowerCase());
    if (!u || !(await verifyPw(String(password || ''), u.pw))) return json({ error: 'Wrong username or password' }, 400);
    const token = this.newSession(u.id);
    this.save();
    return json({ token, user: this.pub(u) });
  }
  async upload(request) {
    const uid = this.sessions[(request.headers.get('Authorization') || '').replace('Bearer ', '')];
    if (!uid) return json({ error: 'Not signed in' }, 401);
    if (!this.env.UPLOADS) return json({ error: 'File sharing is not enabled yet (admin must enable R2 storage)' }, 501);
    const orig = decodeURIComponent(request.headers.get('X-Filename') || 'file').replace(/[^\w.\- ]/g, '_').slice(0, 80);
    const type = request.headers.get('X-Mime') || 'application/octet-stream';
    const body = await request.arrayBuffer();
    if (body.byteLength > 25e6) return json({ error: 'File too large' }, 413);
    const key = id() + '_' + orig;
    await this.env.UPLOADS.put(key, body, { httpMetadata: { contentType: type } });
    return json({ url: '/uploads/' + encodeURIComponent(key), name: orig, size: body.byteLength, type });
  }

  // ---- WebSocket ----
  onConnect(ws, uid) {
    this.socks.set(ws, uid);
    this.send(ws, 'init', { me: this.pub(this.users[uid]), chats: this.chatsFor(uid), users: this.pubUsers(this.allMemberIds(uid)) });
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
        this.users[uid].lastSeen = Date.now();
        this.save();
        this.toAll('presence', { id: uid, online: false, lastSeen: this.users[uid].lastSeen });
      }
    };
    ws.addEventListener('close', gone);
    ws.addEventListener('error', gone);
  }

  chatOf(uid, cid) { const c = this.groups[cid]; return c && c.members.includes(uid) ? c : null; }
  canManage(c, me) { return c.admin === me.id || me.isAdmin; }
  findMsg(cid, mid) { return (this.messages[cid] || []).find((x) => x.id === mid); }

  get handlers() {
    return {
      'group:create'({ uid, me }, { name, description, onlyAdminPosts }, cb) {
        if (!me.isAdmin) return cb({ error: 'Only the admin can create groups' });
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
        delete this.groups[g.id];
        delete this.messages[g.id];
        this.ctx.storage.delete('m:' + g.id);
        this.save();
        members.forEach((m) => { this.toUser(m, 'chat:deleted', g.id); this.sendChats(m); });
        cb({ ok: true });
      },
      'dm:open'({ uid }, { username }, cb) {
        const other = Object.values(this.users).find((u) => u.username === String(username || '').trim().toLowerCase());
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
      'message:send'({ ws, uid }, { chat, text, file, replyTo, forwarded }, cb) {
        const c = this.chatOf(uid, chat);
        if (!c) return cb({ error: 'Not a member' });
        if (c.type === 'group' && c.onlyAdminPosts && c.admin !== uid) return cb({ error: 'Only the admin can send messages here' });
        text = String(text || '').slice(0, 4000);
        if (!text.trim() && !file) return cb({ ok: true });
        if (file) file = { url: String(file.url || ''), name: String(file.name || 'file').slice(0, 80), size: +file.size || 0, type: String(file.type || '') };
        const list = (this.messages[chat] = this.messages[chat] || []);
        let rp = null;
        if (replyTo) {
          const o = list.find((m) => m.id === replyTo);
          if (o) rp = { id: o.id, from: o.from, text: o.deleted ? 'Message deleted' : o.text || (o.file ? '📎 ' + o.file.name : '') };
        }
        const m = { id: id(), chat, from: uid, text, ts: Date.now(), file: file || null, replyTo: rp, forwarded: !!forwarded, reactions: {}, readBy: [uid], deliveredTo: [uid], starredBy: [] };
        c.members.forEach((mm) => { if (mm !== uid && this.isOnline(mm)) m.deliveredTo.push(mm); });
        list.push(m);
        if (list.length > MAX_MSGS) list.splice(0, list.length - MAX_MSGS);
        this.save(chat);
        this.toChat(chat, 'message', m);
        c.members.forEach((mm) => this.sendChats(mm));
        cb({ ok: true });
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
        if (name) me.name = String(name).trim().slice(0, 30);
        if (about !== undefined) me.about = String(about).slice(0, 120);
        if (avatar !== undefined) me.avatar = avatar;
        this.save();
        const pu = [this.pub(me)];
        this.allMemberIds(uid).forEach((u) => this.toUser(u, 'users', pu));
        cb({ ok: true, user: pu[0] });
      },
      'users:lookup'({ ws, uid }, { ids }) {
        const allowed = new Set(this.allMemberIds(uid));
        this.send(ws, 'users', this.pubUsers((ids || []).filter((i) => allowed.has(i))));
      },
    };
  }
}
