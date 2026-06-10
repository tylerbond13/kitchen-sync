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
};
