const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-store-test-'));

const store = require('../server/store');

test('restoreCrew rebuilds a lost crew from a device backup', () => {
  const backup = {
    code: 'QQQQ',
    createdAt: 123,
    hostId: 'host-1',
    members: { 'host-1': { name: 'Tyler', avatar: '🐻', joinedAt: 123 } },
    progress: { 'salad-days': { stars: 2, bestScore: 600, plays: 3 } },
  };
  const crew = store.restoreCrew(backup);
  assert.ok(crew);
  assert.equal(crew.code, 'QQQQ');
  assert.equal(crew.progress['salad-days'].stars, 2);
  assert.equal(crew.members['host-1'].name, 'Tyler');
  assert.equal(store.getCrew('qqqq'), crew, 'restored crew is queryable');

  // restoring again is a no-op (does not clobber the live record)
  assert.equal(store.restoreCrew(backup), null);
});

test('restoreCrew rejects malformed backups', () => {
  assert.equal(store.restoreCrew(null), null);
  assert.equal(store.restoreCrew({ code: 'toolong' }), null);
  assert.equal(store.restoreCrew({ code: 'ab!?' }), null);
});

test('mergeCrew keeps the best of both records and sanitizes values', () => {
  const crew = store.restoreCrew({
    code: 'WWWW', hostId: 'h',
    progress: { 'salad-days': { stars: 1, bestScore: 400, plays: 2 } },
  });
  store.mergeCrew(crew, {
    progress: {
      'salad-days': { stars: 3, bestScore: 350, plays: 1 },   // higher stars, lower score
      'burger-bay': { stars: 99, bestScore: 'NaN!', plays: -5 }, // hostile values
    },
    members: { m2: { name: 'Megan', avatar: '🦊' } },
  });
  assert.equal(crew.progress['salad-days'].stars, 3);
  assert.equal(crew.progress['salad-days'].bestScore, 400);
  assert.equal(crew.progress['salad-days'].plays, 2);
  assert.equal(crew.progress['burger-bay'].stars, 3, 'stars clamped to 3');
  assert.equal(crew.progress['burger-bay'].bestScore, 0);
  assert.equal(crew.progress['burger-bay'].plays, 0);
  assert.equal(crew.members.m2.name, 'Megan');
});

test('kitchen shop wallet: retro-seeded coins, earning, buying', () => {
  const crew = store.restoreCrew({
    code: 'SHOP', hostId: 'h',
    progress: { 'salad-days': { stars: 1, bestScore: 500, plays: 1 } },
  });
  store.ensureCrewExtras(crew);
  assert.equal(crew.wallet.coins, 500, 'coins retro-seeded from best scores');
  assert.ok(!store.buyUpgrade(crew, 'auto_chopper', 800), 'cannot afford yet');

  store.recordLevelResult(crew, 'salad-days', 600, 2, 5);
  assert.equal(crew.wallet.coins, 1100, 'round score banked');
  assert.equal(crew.stats.meals, 5);
  assert.equal(crew.stats.rounds, 1);

  assert.ok(store.buyUpgrade(crew, 'auto_chopper', 800));
  assert.equal(crew.wallet.coins, 300);
  assert.ok(crew.wallet.upgrades.auto_chopper);
  assert.ok(!store.buyUpgrade(crew, 'auto_chopper', 800), 'no double-buy');
});

test('device backups carry the wallet (upgrades survive server loss)', () => {
  const crew = store.restoreCrew({ code: 'WLLT', hostId: 'h', progress: {} });
  store.mergeCrew(crew, {
    wallet: { coins: 2500, upgrades: { fast_shoes: true } },
    stats: { meals: 40, rounds: 9, earned: 4000 },
  });
  assert.equal(crew.wallet.coins, 2500);
  assert.ok(crew.wallet.upgrades.fast_shoes);
  assert.equal(crew.stats.meals, 40);
});

test('BOND admin kitchen: always exists, everything unlocked, rich wallet', () => {
  const rooms = require('../server/rooms');
  const admin = store.ensureAdminCrew();
  assert.equal(admin.code, 'BOND');
  assert.equal(admin.wallet.coins, 50000);
  const levels = rooms.levelList(admin);
  assert.ok(levels.length >= 14);
  assert.ok(levels.every((l) => l.unlocked), 'every level unlocked with zero stars');
  assert.equal(store.ensureAdminCrew(), admin, 'idempotent');
});

test('mergePlayerStats takes per-counter maximums', () => {
  store.upsertPlayer({ id: 'p9', name: 'Z', avatar: 'z' });
  store.recordPlayerResult('p9', { delivered: 5, stars: 1 });
  store.mergePlayerStats('p9', { stats: { levelsPlayed: 9, mealsDelivered: 2, starsEarned: 4 } });
  const p = store.getPlayer('p9');
  assert.equal(p.stats.levelsPlayed, 9);
  assert.equal(p.stats.mealsDelivered, 5);
  assert.equal(p.stats.starsEarned, 4);
});
