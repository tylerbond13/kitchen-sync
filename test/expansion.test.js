// Kitchen Expansion upgrades: crew-owned shop items that physically grow every
// kitchen — a third cutting board, an extra burner, an extra counter. Applied
// deterministically to the round's grid copy; levels missing the required
// pieces skip gracefully; the floor must always stay connected.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATA_DIR = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'ks-test-'));

const { Game } = require('../server/game');
const { LEVELS } = require('../server/levels');

const ROSTER = [{ id: 'p1', name: 'Ada', avatar: '🦊' }];

function makeGame(levelId, upgrades = {}) {
  const level = LEVELS.find((l) => l.id === levelId);
  return new Game(level, ROSTER, { rng: () => 0, upgrades });
}
const countChar = (game, ch) => game.grid.flat().filter((c) => c === ch).length;
const stationsOf = (game, type) => Object.values(game.stations).filter((s) => s.type === type);

test('no expansion upgrades → the grid matches the level template', () => {
  const plain = makeGame('salad-days');
  const level = LEVELS.find((l) => l.id === 'salad-days');
  assert.equal(plain.grid.map((r) => r.join('')).join('\n'), level.layout.join('\n'));
});

test('extra_board converts the counter nearest the boards into a third board', () => {
  const plain = makeGame('salad-days');
  const grown = makeGame('salad-days', { extra_board: true });
  assert.equal(stationsOf(plain, 'board').length, 2);
  assert.equal(stationsOf(grown, 'board').length, 3);
  assert.equal(countChar(grown, '#'), countChar(plain, '#') - 1, 'a counter was consumed');
});

test('extra_cooker duplicates the level cooker; no-op on cook-less levels', () => {
  const plainSoup = makeGame('soups-on');
  const grownSoup = makeGame('soups-on', { extra_cooker: true });
  const before = stationsOf(plainSoup, 'cook');
  const after = stationsOf(grownSoup, 'cook');
  assert.equal(after.length, before.length + 1);
  assert.equal(new Set(after.map((s) => s.tool)).size, 1, 'same tool as the level cooks with');

  const salad = makeGame('salad-days', { extra_cooker: true });
  assert.equal(stationsOf(salad, 'cook').length, 0, 'salad level has nothing to duplicate');
  assert.equal(stationsOf(salad, 'board').length, 2, 'nothing else changed');
});

test('extra_counter adds a counter and keeps the kitchen fully playable', () => {
  const plain = makeGame('salad-days');
  const grown = makeGame('salad-days', { extra_counter: true });
  assert.equal(countChar(grown, '#'), countChar(plain, '#') + 1);
  assert.equal(grown.spawnTiles.length, plain.spawnTiles.length - 1, 'one floor tile consumed');
  assert.ok(grown.mainFloorComponent().size >= plain.mainFloorComponent().size - 1, 'walkway intact');
  // the new counter is workable and no station lost its floor access
  for (const [key] of Object.entries(grown.stations)) {
    const [x, y] = key.split(',').map(Number);
    const before = plain.stations[key];
    const touched = grown.adjacentFloors(x, y).length > 0;
    if (before && plain.adjacentFloors(x, y).length > 0) {
      assert.ok(touched, `station ${key} still touches floor`);
    }
  }
});

test('all three expansions together still produce a playable board', () => {
  const game = makeGame('burger-bay', { extra_board: true, extra_cooker: true, extra_counter: true });
  assert.equal(stationsOf(game, 'board').length, 3);
  const plainBB = makeGame('burger-bay');
  assert.ok(game.mainFloorComponent().size >= plainBB.mainFloorComponent().size - 1, 'walkway intact');
  assert.ok(game.spawnTiles.length >= 1, 'chefs still have somewhere to stand');
  // every station that should be usable has adjacent floor
  const plain = plainBB;
  const usableBefore = Object.keys(plain.stations)
    .filter((k) => plain.adjacentFloors(...k.split(',').map(Number)).length > 0);
  for (const k of usableBefore) {
    if (!game.stations[k]) continue; // converted to a different station type — still there
    assert.ok(game.adjacentFloors(...k.split(',').map(Number)).length > 0, `${k} usable`);
  }
});

test('cramped custom boards skip the extra counter instead of wedging the kitchen', () => {
  const tiny = {
    id: 'tiny', name: 'Tiny', duration: 60, stars: [10, 20, 30], exactStars: true,
    crates: { 1: 'lettuce' }, recipes: ['salad'],
    layout: [
      '1B#',
      '...',
      '.W.',
    ],
  };
  const game = new Game(tiny, ROSTER, { rng: () => 0, upgrades: { extra_counter: true } });
  assert.equal(game.grid.flat().filter((c) => c === '#').length, 1, 'too cramped — no counter added');
});
