# MK Messages

Group chat app on Cloudflare: a Worker + Durable Object (`src/index.js`) for real-time chat and storage, and a Pages frontend (`public/`).

- First account registered becomes Admin; only the Admin creates groups (6-digit number). Anyone with the number can join.
- **Frontend deploys automatically** from GitHub Actions on every push to `main` that changes `public/` (needs the repo secret `CLOUDFLARE_API_TOKEN`).
- Backend: `npm install && npm run deploy` (needs a Cloudflare login/token).
- File, photo and voice-note sharing is not enabled (it would need R2 storage).
