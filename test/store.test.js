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

test('mergePlayerStats takes per-counter maximums', () => {
  store.upsertPlayer({ id: 'p9', name: 'Z', avatar: 'z' });
  store.recordPlayerResult('p9', { delivered: 5, stars: 1 });
  store.mergePlayerStats('p9', { stats: { levelsPlayed: 9, mealsDelivered: 2, starsEarned: 4 } });
  const p = store.getPlayer('p9');
  assert.equal(p.stats.levelsPlayed, 9);
  assert.equal(p.stats.mealsDelivered, 5);
  assert.equal(p.stats.starsEarned, 4);
});
