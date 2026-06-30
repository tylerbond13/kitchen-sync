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

function profileChef(profile) {
  return String((profile && profile.chef) || 'chef').slice(0, 64);
}

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
    members: {},          // playerId -> { name, avatar, chef, joinedAt }
    progress: {},         // levelId -> { stars, bestScore, plays }
  };
  crews.save();
  return crews.data[code];
}

function getCrew(code) {
  return crews.data[(code || '').toUpperCase().trim()] || null;
}

// "BOND" — the family admin kitchen: always exists, all levels unlocked
// (see rooms.levelList), and a fat wallet for testing upgrades.
const ADMIN_CODE = 'BOND';
function ensureAdminCrew() {
  if (!crews.data[ADMIN_CODE]) {
    crews.data[ADMIN_CODE] = {
      code: ADMIN_CODE,
      createdAt: Date.now(),
      hostId: 'admin',
      members: {},
      progress: {},
    };
    ensureCrewExtras(crews.data[ADMIN_CODE]);
    crews.data[ADMIN_CODE].wallet.coins = 50000;
    crews.save();
  }
  return crews.data[ADMIN_CODE];
}

function touchCrewMember(crew, profile) {
  const existing = crew.members[profile.id] || { joinedAt: Date.now() };
  crew.members[profile.id] = {
    ...existing,
    name: profile.name,
    avatar: profile.avatar,
    chef: profileChef(profile),
    lastSeen: Date.now(),
  };
  crews.save();
}

// wallet / settings / lifetime stats, lazily initialized on older crews.
// coins are retro-seeded from best scores so long-time crews aren't broke
// when the Kitchen Shop arrives.
function ensureCrewExtras(crew) {
  if (!crew.wallet) {
    const seed = Object.values(crew.progress || {}).reduce((sum, p) => sum + (p.bestScore || 0), 0);
    crew.wallet = { coins: seed, upgrades: {} };
  }
  if (!crew.settings) crew.settings = {};
  if (!crew.stats) crew.stats = { meals: 0, rounds: 0, earned: crew.wallet.coins };
  if (!crew.boards) crew.boards = {};       // saved custom boards (name -> level config)
  if (!crew.overrides) crew.overrides = {}; // per-crew edits to built-in levels (levelId -> config)
  return crew;
}

// Persist a custom board under the crew's codename so it survives sessions.
// Saved boards surface as their own playable levels (id "custom:<name>") with
// independent star tracking, so editing one means re-saving under the same name.
function saveBoard(crew, name, cfg) {
  ensureCrewExtras(crew);
  name = String(name || '').trim().slice(0, 40);
  if (!name) return false;
  if (!crew.boards[name] && Object.keys(crew.boards).length >= 50) return false;
  crew.boards[name] = cfg;
  crews.save();
  return true;
}

function deleteBoard(crew, name) {
  ensureCrewExtras(crew);
  if (crew.boards[name]) {
    delete crew.boards[name];
    delete crew.progress[`custom:${name}`]; // its star record goes with it
    crews.save();
    return true;
  }
  return false;
}

// Per-crew edit of a built-in level: every future play of that level for this
// codename uses the edited board + tuning, while keeping the level's own id
// (and therefore its star record) intact. Passing a null cfg reverts to stock.
function saveOverride(crew, levelId, cfg) {
  ensureCrewExtras(crew);
  levelId = String(levelId || '').slice(0, 48);
  if (!levelId) return false;
  if (cfg) crew.overrides[levelId] = cfg;
  else delete crew.overrides[levelId];
  crews.save();
  return true;
}

function buyUpgrade(crew, id, cost) {
  ensureCrewExtras(crew);
  if (crew.wallet.upgrades[id] || crew.wallet.coins < cost) return false;
  crew.wallet.coins -= cost;
  crew.wallet.upgrades[id] = true;
  crews.save();
  return true;
}

function recordLevelResult(crew, levelId, score, stars, delivered = 0) {
  ensureCrewExtras(crew);
  const prev = crew.progress[levelId] || { stars: 0, bestScore: 0, plays: 0 };
  crew.progress[levelId] = {
    stars: Math.max(prev.stars, stars),
    bestScore: Math.max(prev.bestScore, score),
    plays: prev.plays + 1,
  };
  crew.wallet.coins += score;
  crew.stats.earned += score;
  crew.stats.meals += delivered;
  crew.stats.rounds += 1;
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
  existing.chef = profileChef(profile);
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
    if (typeof levelId !== 'string' || levelId.length > 48 || !p) continue;
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
        chef: profileChef(m),
        joinedAt: int(m.joinedAt) || Date.now(),
      };
    }
  }
  // wallet / settings / stats survive in device backups too
  ensureCrewExtras(crew);
  if (backup.wallet && typeof backup.wallet === 'object') {
    crew.wallet.coins = Math.max(crew.wallet.coins, int(backup.wallet.coins, 1e9));
    for (const [id, owned] of Object.entries(backup.wallet.upgrades || {})) {
      if (owned && typeof id === 'string' && id.length <= 32) crew.wallet.upgrades[id] = true;
    }
  }
  if (backup.settings && typeof backup.settings === 'object') {
    crew.settings.autoChop = !!backup.settings.autoChop || !!crew.settings.autoChop;
  }
  // Custom boards and built-in edits are part of a crew's identity — restore any
  // the server lost, without clobbering ones it still has.
  if (backup.boards && typeof backup.boards === 'object') {
    for (const [name, cfg] of Object.entries(backup.boards)) {
      if (!crew.boards[name] && cfg && typeof cfg === 'object'
          && Object.keys(crew.boards).length < 50) crew.boards[name] = cfg;
    }
  }
  if (backup.overrides && typeof backup.overrides === 'object') {
    for (const [levelId, cfg] of Object.entries(backup.overrides)) {
      if (!crew.overrides[levelId] && cfg && typeof cfg === 'object'
          && typeof levelId === 'string' && levelId.length <= 48) {
        crew.overrides[levelId] = cfg;
      }
    }
  }
  if (backup.stats && typeof backup.stats === 'object') {
    for (const k of ['meals', 'rounds', 'earned']) {
      crew.stats[k] = Math.max(crew.stats[k] || 0, int(backup.stats[k], 1e9));
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

// Append-only jukebox history: every song anyone queues, forever. One JSON
// object per line (JSONL) so the file only ever grows by appending — it is
// never rewritten, so past entries can't be lost to a bad write.
const SONG_LOG_FILE = path.join(DATA_DIR, 'song-history.jsonl');

function logSongRequest(entry) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(SONG_LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('store: failed to append song history:', err.message);
  }
}

module.exports = {
  createCrew, getCrew, touchCrewMember, recordLevelResult,
  getPlayer, upsertPlayer, recordPlayerResult, flushAll,
  restoreCrew, mergeCrew, mergePlayerStats,
  ensureCrewExtras, buyUpgrade, saveBoard, deleteBoard, saveOverride,
  ensureAdminCrew, ADMIN_CODE,
  logSongRequest, SONG_LOG_FILE,
};
