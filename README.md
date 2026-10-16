# MK Messages

Group chat on Cloudflare: a Worker + Durable Object for real-time chat and storage, and a
Pages site serving a single-page app (installable as a PWA).

## Features
- Accounts keyed by mobile number; the username is also the display name (any characters).
  Numbers are not verified by SMS.
- Anyone can create a group and becomes its admin. Join with a 6-digit group code, a shared
  link, or an invitation sent to a member who already uses MK Messages.
- One search box finds chats and people (full number or exact username) and can join by code.
- Text, emoji, stickers (personal library), colour labels, photos, videos (up to 100 MB),
  files and voice messages (record, pause, play back, resume, delete or send).
- Voice and video calls (WebRTC, group calls), scheduled messages, AR notes.
- Web Push alerts so calls ring and messages arrive when the app is closed.

## Layout
- `src/index.js`, `src/push.js` - the Worker, the `Hub` Durable Object, Web Push (VAPID + RFC 8291).
- `web/` - page source (`style.css`, `body.html`, `core.js`, `features.js`, `call.js`, `ar.js`, `main.js`).
- `pwa/` - manifest, service worker, icons.
- `build.py` - assembles `index.html` and the Pages `_worker.js`:
  `python3 build.py OUT_DIR` writes `index.html` and `OUT_DIR/_worker.js`.
  `MK_LOCAL=1` points the page at its own origin (local testing).

## Deploying
Worker: upload `src/index.js` + `src/push.js` as modules (Durable Object binding `HUB`, class `Hub`).
Pages: deploy the generated `_worker.js` to the `mk-messages` project.
