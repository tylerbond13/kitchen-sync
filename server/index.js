const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const rooms = require('./rooms');
const store = require('./store');
const youtube = require('./youtube');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // same-origin by default; CORS open so a split static/api deploy also works
  cors: { origin: true },
});

app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
  },
}));

app.get('/api/youtube/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });
  try {
    const results = await youtube.search(q);
    res.json({ results });
  } catch (err) {
    res.status(502).json({ error: 'YouTube search is unavailable right now.' });
  }
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

rooms.attach(io);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Kitchen Sync cooking on http://localhost:${PORT}`);
  });

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      store.flushAll();
      process.exit(0);
    });
  }
}

module.exports = { app, server, io };
