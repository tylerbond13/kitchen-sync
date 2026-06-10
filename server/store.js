// JSON-file persistence for crews (group campaign progress) and player profiles.
// Writes are debounced and atomic (write temp file, then rename).
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

class Store {
  constructor(filename, initial = {}) {
    this.file = path.join(DATA_DIR, filename);
    this.data = initial;
    this.writeTimer = null;
    this.load();
  }

  load() {
    try {
      this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      this.data = {};
    }
  }

  save() {
    if (this.writeTimer) return;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      this.flush();
    }, 250);
  }

  flush() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error(`store: failed to write ${this.file}:`, err.message);
    }
  }
}

const crews = new Store('crews.json');
const players = new Store('players.json');

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid 1/0 confusion

function newCrewCode() {
  for (let attempt = 0; attempt < 200; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
    }
    if (!crews.data[code]) return code;
  }
  throw new Error('could not allocate crew code');
}

function createCrew(hostId) {
  const code = newCrewCode();
  crews.data[code] = {
    code,
    createdAt: Date.now(),
    hostId,
    members: {},          // playerId -> { name, avatar, joinedAt }
    progress: {},         // levelId -> { stars, bestScore, plays }
  };
  crews.save();
  return crews.data[code];
}

function getCrew(code) {
  return crews.data[(code || '').toUpperCase().trim()] || null;
}

function touchCrewMember(crew, profile) {
  const existing = crew.members[profile.id] || { joinedAt: Date.now() };
  crew.members[profile.id] = {
    ...existing,
    name: profile.name,
    avatar: profile.avatar,
    lastSeen: Date.now(),
  };
  crews.save();
}

function recordLevelResult(crew, levelId, score, stars) {
  const prev = crew.progress[levelId] || { stars: 0, bestScore: 0, plays: 0 };
  crew.progress[levelId] = {
    stars: Math.max(prev.stars, stars),
    bestScore: Math.max(prev.bestScore, score),
    plays: prev.plays + 1,
  };
  crews.save();
}

function getPlayer(id) {
  return players.data[id] || null;
}

function upsertPlayer(profile) {
  const existing = players.data[profile.id] || {
    id: profile.id,
    createdAt: Date.now(),
    stats: { levelsPlayed: 0, mealsDelivered: 0, starsEarned: 0 },
  };
  existing.name = String(profile.name || 'Chef').slice(0, 16);
  existing.avatar = String(profile.avatar || '🧑‍🍳').slice(0, 8);
  existing.lastSeen = Date.now();
  if (!existing.stats) existing.stats = { levelsPlayed: 0, mealsDelivered: 0, starsEarned: 0 };
  players.data[profile.id] = existing;
  players.save();
  return existing;
}

// ---- device-backup restore/merge ------------------------------------------
// Clients cache their crew + profile records in localStorage and send them on
// join. If the server lost its data (ephemeral disk on free hosting), any
// member's phone can restore it. Merges always keep the best values.

const int = (v, max = Number.MAX_SAFE_INTEGER) =>
  Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

function restoreCrew(backup) {
  if (!backup || typeof backup !== 'object') return null;
  const code = String(backup.code || '').toUpperCase().trim();
  if (!/^[A-Z]{4}$/.test(code) || crews.data[code]) return null;
  crews.data[code] = {
    code,
    createdAt: int(backup.createdAt) || Date.now(),
    hostId: String(backup.hostId || '').slice(0, 64),
    members: {},
    progress: {},
  };
  mergeCrew(crews.data[code], backup);
  return crews.data[code];
}

function mergeCrew(crew, backup) {
  if (!backup || typeof backup !== 'object') return;
  for (const [levelId, p] of Object.entries(backup.progress || {})) {
    if (typeof levelId !== 'string' || levelId.length > 32 || !p) continue;
    const cur = crew.progress[levelId] || { stars: 0, bestScore: 0, plays: 0 };
    crew.progress[levelId] = {
      stars: Math.max(cur.stars, int(p.stars, 3)),
      bestScore: Math.max(cur.bestScore, int(p.bestScore, 1e6)),
      plays: Math.max(cur.plays, int(p.plays, 1e6)),
    };
  }
  for (const [id, m] of Object.entries(backup.members || {})) {
    if (!crew.members[id] && m && typeof m === 'object') {
      crew.members[id] = {
        name: String(m.name || 'Chef').slice(0, 16),
        avatar: String(m.avatar || '🧑‍🍳').slice(0, 8),
        joinedAt: int(m.joinedAt) || Date.now(),
      };
    }
  }
  crews.save();
}

function mergePlayerStats(id, backup) {
  const p = players.data[id];
  const stats = backup && backup.stats;
  if (!p || !stats || typeof stats !== 'object') return;
  for (const key of ['levelsPlayed', 'mealsDelivered', 'starsEarned']) {
    p.stats[key] = Math.max(p.stats[key] || 0, int(stats[key], 1e6));
  }
  players.save();
}

function recordPlayerResult(id, { delivered, stars }) {
  const p = players.data[id];
  if (!p) return;
  p.stats.levelsPlayed += 1;
  p.stats.mealsDelivered += delivered;
  p.stats.starsEarned += stars;
  players.save();
}

function flushAll() {
  crews.flush();
  players.flush();
}

module.exports = {
  createCrew, getCrew, touchCrewMember, recordLevelResult,
  getPlayer, upsertPlayer, recordPlayerResult, flushAll,
  restoreCrew, mergeCrew, mergePlayerStats,
};
