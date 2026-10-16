// Pages advanced-mode worker: forwards API, WebSocket and upload traffic to the
// mk-messages Worker (service binding "WORKER"); everything else is static.
export default {
  async fetch(request, env) {
    const p = new URL(request.url).pathname;
    if (p === '/ws' || p.startsWith('/api/') || p.startsWith('/uploads/')) return env.WORKER.fetch(request);
    return env.ASSETS.fetch(request);
  },
};
