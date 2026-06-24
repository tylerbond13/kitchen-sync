const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const rooms = require('./rooms');
const store = require('./store');
const youtube = require('./youtube');
const { RECIPES, ING, LEVELS } = require('./levels');
const pkg = require('../package.json');

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

// Catalog for the in-app Level Builder: recipes, ingredients, and the built-in
// layouts (used as board-design presets / starting points).
app.get('/api/catalog', (_req, res) => {
  res.json({
    recipes: Object.entries(RECIPES).map(([id, r]) => ({ id, name: r.name, emoji: r.emoji, needs: r.needs, handheld: !!r.handheld })),
    ingredients: Object.entries(ING).map(([id, i]) => ({ id, name: i.name, emoji: i.emoji })),
    presets: LEVELS.map((l) => ({ id: l.id, name: l.name, emoji: l.emoji, layout: l.layout, crates: l.crates, recipes: l.orders.recipes, plates: l.plates || 0, duration: l.duration, stars: l.stars })),
  });
});

// Version banner: semver from package.json + the deployed git commit (Render
// sets RENDER_GIT_COMMIT). Lets you tell at a glance which build is live and
// whether a new push has finished deploying.
app.get('/api/version', (_req, res) => {
  res.json({
    version: pkg.version,
    commit: (process.env.RENDER_GIT_COMMIT || '').slice(0, 7) || 'local',
  });
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
