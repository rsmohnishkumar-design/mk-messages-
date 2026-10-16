# MK Messages

Group chat app on Cloudflare: a Worker + Durable Object (`src/index.js`) for real-time chat and storage, and a static frontend (`index.html`) hosted on GitHub Pages.

- First account registered becomes Admin; only the Admin creates groups (6-digit number). Anyone with the number can join.
- **Frontend:** served by GitHub Pages from `index.html` at the repo root; it talks to the Worker over HTTPS/WebSocket.
- Backend: `npm install && npm run deploy` (needs a Cloudflare login/token).
- File, photo and voice-note sharing is not enabled (it would need R2 storage).
