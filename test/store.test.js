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
  assert.equal(crew.wallet.coins, 1150, 'round score banked (+50 day-1 streak bonus)');
  assert.equal(crew.stats.meals, 5);
  assert.equal(crew.stats.rounds, 1);

  assert.ok(store.buyUpgrade(crew, 'auto_chopper', 800));
  assert.equal(crew.wallet.coins, 350);
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

test('saved boards surface as star-tracked custom levels', () => {
  const rooms = require('../server/rooms');
  const crew = store.restoreCrew({ code: 'BRDS', hostId: 'h', progress: {} });
  const cfg = { layout: ['.W.', '.1.', '...'], crates: { 1: 'lettuce' }, recipes: ['salad'], stars: [100, 200, 300] };
  assert.ok(store.saveBoard(crew, 'My Diner', cfg));

  let custom = rooms.levelList(crew).find((l) => l.id === 'custom:My Diner');
  assert.ok(custom, 'saved board appears in the level list');
  assert.equal(custom.custom, true);
  assert.equal(custom.section, 'custom');
  assert.equal(custom.unlocked, true);
  assert.equal(custom.stars, 0);

  // stars track under the custom id, independent of built-in levels
  store.recordLevelResult(crew, 'custom:My Diner', 250, 2, 4);
  custom = rooms.levelList(crew).find((l) => l.id === 'custom:My Diner');
  assert.equal(custom.stars, 2);
  assert.equal(custom.bestScore, 250);

  // deleting the board takes its star record with it
  assert.ok(store.deleteBoard(crew, 'My Diner'));
  assert.equal(rooms.levelList(crew).find((l) => l.id === 'custom:My Diner'), undefined);
  assert.equal(crew.progress['custom:My Diner'], undefined);
});

test('editing a built-in level persists a per-crew override', () => {
  const rooms = require('../server/rooms');
  const crew = store.restoreCrew({ code: 'OVRD', hostId: 'h', progress: { 'salad-days': { stars: 1, bestScore: 0, plays: 1 } } });
  const cfg = { layout: ['.W.', '.1.', '...'], crates: { 1: 'tomato' }, recipes: ['salad'], speedMult: 2, stars: [120, 240, 360] };
  assert.ok(store.saveOverride(crew, 'salad-days', cfg));

  const lvl = rooms.levelList(crew).find((l) => l.id === 'salad-days');
  assert.equal(lvl.edited, true, 'flagged as edited');
  assert.equal(lvl.stars, 1, 'keeps its own star record');

  // reverting clears the override
  assert.ok(store.saveOverride(crew, 'salad-days', null));
  assert.equal(rooms.levelList(crew).find((l) => l.id === 'salad-days').edited, false);
});

test('device backups carry custom boards and overrides', () => {
  const crew = store.restoreCrew({ code: 'BKUP', hostId: 'h', progress: {} });
  store.mergeCrew(crew, {
    boards: { 'Lost Kitchen': { layout: ['.W.', '...'], recipes: ['salad'] } },
    overrides: { 'salad-days': { layout: ['.W.', '...'], recipes: ['salad'] } },
  });
  assert.ok(crew.boards['Lost Kitchen'], 'custom board restored from backup');
  assert.ok(crew.overrides['salad-days'], 'override restored from backup');
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

test('claimMilestone pays exactly once', () => {
  const crew = store.createCrew('MSTEST');
  store.ensureCrewExtras(crew);
  const before = crew.wallet.coins;
  assert.equal(store.claimMilestone(crew, 'first_service', 100), true);
  assert.equal(crew.wallet.coins, before + 100);
  assert.equal(store.claimMilestone(crew, 'first_service', 100), false, 'second claim rejected');
  assert.equal(crew.wallet.coins, before + 100, 'not paid twice');
});

test('daily crew streak: pays once per UTC day, grows on consecutive days, resets after a gap, caps at 7', () => {
  const crew = store.createCrew('STREAK1');
  const day = (s) => new Date(`${s}T12:00:00Z`);
  // day 1 — first round pays 50, second round same day pays nothing
  let r = store.recordLevelResult(crew, 'salad-days', 100, 1, 3, day('2026-07-03'));
  assert.deepEqual(r.streak, { days: 1, bonus: 50 });
  r = store.recordLevelResult(crew, 'salad-days', 100, 1, 3, day('2026-07-03'));
  assert.deepEqual(r.streak, { days: 1, bonus: 0 }, 'same day pays once');
  // day 2 — consecutive: streak grows
  r = store.recordLevelResult(crew, 'salad-days', 100, 1, 3, day('2026-07-04'));
  assert.deepEqual(r.streak, { days: 2, bonus: 100 });
  // skip a day — resets to 1
  r = store.recordLevelResult(crew, 'salad-days', 100, 1, 3, day('2026-07-06'));
  assert.deepEqual(r.streak, { days: 1, bonus: 50 });
  // cap: run 9 consecutive days, bonus tops out at 350
  for (let i = 7; i <= 15; i++) {
    r = store.recordLevelResult(crew, 'salad-days', 100, 1, 3, day(`2026-07-${String(i).padStart(2, '0')}`));
  }
  assert.equal(r.streak.days, 10);
  assert.equal(r.streak.bonus, 350, 'bonus capped at day 7 rate');
});
