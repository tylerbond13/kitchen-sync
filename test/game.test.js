const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATA_DIR = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'ks-test-'));

const { Game, itemToken, multisetEqual, isSubset } = require('../server/game');
const { LEVELS, RECIPES } = require('../server/levels');

const ROSTER = [{ id: 'p1', name: 'Ada', avatar: '🦊' }];

function makeGame(levelId = 'salad-days') {
  const level = LEVELS.find((l) => l.id === levelId);
  return new Game(level, ROSTER, { rng: () => 0 });
}

function stationKey(game, type, pred = () => true) {
  return Object.entries(game.stations).find(([, s]) => s.type === type && pred(s))[0];
}

function standAt(game, p, key) {
  const [x, y] = key.split(',').map(Number);
  const f = game.adjacentFloors(x, y)[0];
  p.x = f.x + 0.5;
  p.y = f.y + 0.5;
  p.path = [];
}

test('token & multiset helpers', () => {
  assert.equal(itemToken({ id: 'tomato', state: 'chopped' }), 'tomato.chopped');
  assert.equal(itemToken({ kind: 'dish', id: 'soup_onion' }), 'soup_onion.dish');
  assert.equal(itemToken({ kind: 'plate', contents: [] }), null);
  assert.ok(multisetEqual(['a', 'b'], ['b', 'a']));
  assert.ok(!multisetEqual(['a'], ['a', 'a']));
  assert.ok(isSubset(['a'], ['a', 'b']));
  assert.ok(!isSubset(['a', 'a'], ['a', 'b']));
});

test('every level layout is valid and reachable', () => {
  for (const level of LEVELS) {
    const game = new Game(level, ROSTER);
    assert.ok(game.spawnTiles.length > 0, `${level.id} has floor`);
    // every station must be reachable from spawn
    const spawn = game.spawnTiles[0];
    for (const [key, s] of Object.entries(game.stations)) {
      if (s.type === 'counter') continue; // corner counters can be decorative
      const [x, y] = key.split(',').map(Number);
      const adj = game.adjacentFloors(x, y);
      assert.ok(adj.length > 0, `${level.id} station ${s.type}@${key} has adjacent floor`);
      const reachable = adj.some((f) => game.findPath(spawn.x, spawn.y, f.x, f.y) !== null);
      assert.ok(reachable, `${level.id} station ${s.type}@${key} reachable`);
    }
    // every order recipe must be craftable from the level's crates/appliances
    for (const r of level.orders.recipes) {
      assert.ok(RECIPES[r], `${level.id} recipe ${r} exists`);
    }
    assert.equal(level.stars.length, 3);
    assert.ok(level.stars[0] < level.stars[1] && level.stars[1] < level.stars[2]);
  }
});

test('crate pickup and trash', () => {
  const game = makeGame();
  const p = game.players.p1;
  const crate = stationKey(game, 'crate', (s) => s.ing === 'lettuce');
  game.interact(p, crate);
  assert.deepEqual(p.carry, { id: 'lettuce', state: 'raw' });
  game.interact(p, stationKey(game, 'trash'));
  assert.equal(p.carry, null);
});

test('chopping requires standing at the board', () => {
  const game = makeGame();
  const p = game.players.p1;
  const board = stationKey(game, 'board');
  p.carry = { id: 'lettuce', state: 'raw' };
  standAt(game, p, board);
  game.interact(p, board);
  assert.equal(p.carry, null);
  assert.equal(game.stations[board].item.state, 'raw');

  // walk away — no chopping happens
  p.x = 100.5; p.y = 100.5;
  for (let i = 0; i < 30; i++) game.tick(0.1);
  assert.equal(game.stations[board].item.state, 'raw');

  // stand next to it — chops in ~2.2s
  standAt(game, p, board);
  for (let i = 0; i < 30; i++) game.tick(0.1);
  assert.equal(game.stations[board].item.state, 'chopped');

  game.interact(p, board);
  assert.deepEqual(p.carry, { id: 'lettuce', state: 'chopped' });
});

test('pan rejects raw patty, cooks a chopped one, then burns it', () => {
  const game = makeGame('burger-bay');
  const p = game.players.p1;
  const pan = stationKey(game, 'cook', (s) => s.tool === 'pan');

  p.carry = { id: 'patty', state: 'raw' };
  game.interact(p, pan);
  assert.notEqual(p.carry, null, 'raw patty must be chopped first');
  assert.equal(game.stations[pan].state, 'idle');

  p.carry = { id: 'patty', state: 'chopped' };
  game.interact(p, pan);
  assert.equal(game.stations[pan].state, 'cooking');

  for (let i = 0; i < 70; i++) game.tick(0.1); // 7s > 6s cook time
  assert.equal(game.stations[pan].state, 'done');
  assert.deepEqual(game.stations[pan].contents[0], { id: 'patty', state: 'cooked' });

  for (let i = 0; i < 90; i++) game.tick(0.1); // past burnAfter
  assert.equal(game.stations[pan].state, 'burned');

  game.interact(p, pan);
  assert.deepEqual(p.carry, { kind: 'dish', id: 'burned' });
  assert.equal(game.stations[pan].state, 'idle');
});

test('pot rejects wrong ingredients, accepts soup combo', () => {
  const game = makeGame('soups-on');
  const p = game.players.p1;
  const pot = stationKey(game, 'cook', (s) => s.tool === 'pot');

  p.carry = { id: 'onion', state: 'raw' }; // must be chopped first
  game.interact(p, pot);
  assert.notEqual(p.carry, null, 'raw onion rejected');

  for (let i = 0; i < 3; i++) {
    p.carry = { id: 'onion', state: 'chopped' };
    game.interact(p, pot);
    assert.equal(p.carry, null);
  }
  assert.equal(game.stations[pot].state, 'cooking');
  for (let i = 0; i < 110; i++) game.tick(0.1);
  assert.equal(game.stations[pot].state, 'done');
  assert.deepEqual(game.stations[pot].contents[0], { kind: 'dish', id: 'soup_onion' });

  // plate it straight from the pot
  p.carry = { kind: 'plate', contents: [] };
  game.interact(p, pot);
  assert.deepEqual(p.carry.contents, [{ kind: 'dish', id: 'soup_onion' }]);
  assert.equal(game.stations[pot].state, 'idle');
});

test('chopped items stay chopped wherever they are placed', () => {
  const game = makeGame();
  const p = game.players.p1;
  const board = stationKey(game, 'board');

  // put a chopped item back on a board — it must not re-chop or revert
  p.carry = { id: 'lettuce', state: 'chopped' };
  standAt(game, p, board);
  game.interact(p, board);
  assert.equal(p.carry, null, 'chopped item can rest on a board');
  for (let i = 0; i < 40; i++) game.tick(0.1); // player standing right there
  assert.equal(game.stations[board].item.state, 'chopped', 'still chopped');
  assert.equal(game.stations[board].item.prog, undefined, 'no chop progress on chopped items');

  // a raw non-choppable (bun) can rest on a board without becoming "chopped"
  game.interact(p, board); // pick the lettuce back up
  game.interact(p, stationKey(game, 'trash'));
  p.carry = { id: 'bun', state: 'raw' };
  game.interact(p, board);
  for (let i = 0; i < 40; i++) game.tick(0.1);
  assert.equal(game.stations[board].item.state, 'raw', 'bun never chops');
});

test('tapping a busy board with full hands swaps items (no dead taps)', () => {
  const game = makeGame();
  const p = game.players.p1;
  const board = stationKey(game, 'board');
  game.stations[board].item = { id: 'lettuce', state: 'chopped' };
  p.carry = { id: 'tomato', state: 'raw' };
  standAt(game, p, board);
  game.interact(p, board);
  assert.deepEqual(p.carry, { id: 'lettuce', state: 'chopped' }, 'hands now hold the chopped item');
  assert.deepEqual(game.stations[board].item, { id: 'tomato', state: 'raw' }, 'tomato took its place');
  // and the freshly swapped-in tomato chops while we stand here
  for (let i = 0; i < 30; i++) game.tick(0.1);
  assert.equal(game.stations[board].item.state, 'chopped');
});

test('chop progress lives on the item and survives pickup/replace', () => {
  const game = makeGame();
  const p = game.players.p1;
  const board = stationKey(game, 'board');
  p.carry = { id: 'lettuce', state: 'raw' };
  standAt(game, p, board);
  game.interact(p, board);
  for (let i = 0; i < 11; i++) game.tick(0.1); // ~50% of the 2.2s chop
  const half = game.stations[board].item.prog;
  assert.ok(half > 0.3 && half < 0.7, `mid-chop progress ${half}`);

  game.interact(p, board); // pick up mid-chop
  assert.ok(p.carry.prog > 0.3, 'progress travels with the item');
  game.interact(p, board); // put it back
  for (let i = 0; i < 14; i++) game.tick(0.1); // only the REMAINING time
  assert.equal(game.stations[board].item.state, 'chopped', 'finished without restarting');
});

test('handheld stacks: burger built on the bun, served without a plate', () => {
  const game = makeGame('burger-bay');
  const p = game.players.p1;
  game.tick(0.1); // first order: burger
  const counter = Object.entries(game.stations).find(([k, s]) => {
    if (s.type !== 'counter') return false;
    const [x, y] = k.split(',').map(Number);
    return game.adjacentFloors(x, y).length > 0;
  })[0];
  game.stations[counter].item = { id: 'patty', state: 'cooked' };
  p.carry = { id: 'bun', state: 'raw' };
  standAt(game, p, counter);
  game.interact(p, counter);
  assert.equal(p.carry.kind, 'stack', 'bun + cooked patty stack up');
  assert.equal(p.carry.contents.length, 2);

  const platesBefore = game.plateSupply;
  game.interact(p, stationKey(game, 'serve'));
  assert.equal(p.carry, null, 'burger served straight off the bun');
  assert.equal(game.deliveredCount, 1);
  assert.equal(game.plateSupply, platesBefore, 'no plate consumed');
  assert.equal(game.pendingDirty.length, 0, 'no dirty dish from a handheld serve');
});

test('grabbing a bun from the crate while holding the patty also stacks', () => {
  const game = makeGame('burger-bay');
  const p = game.players.p1;
  p.carry = { id: 'patty', state: 'cooked' };
  game.interact(p, stationKey(game, 'crate', (s) => s.ing === 'bun'));
  assert.equal(p.carry.kind, 'stack');
});

test('plating is order-independent: any ingredient can start or finish a plate', () => {
  const game = makeGame();
  const p = game.players.p1;
  const lettuce = () => ({ id: 'lettuce', state: 'chopped' });
  const tomato = () => ({ id: 'tomato', state: 'chopped' });
  const cucumber = () => ({ id: 'cucumber', state: 'chopped' });

  // direction 1: tomato-first plate, add lettuce from hand
  let plate = { kind: 'plate', contents: [tomato()] };
  assert.ok(game.addToPlate(plate, lettuce(), { x: 0, y: 0 }), 'lettuce onto tomato plate');

  // direction 2: lettuce-first plate, add tomato from hand
  plate = { kind: 'plate', contents: [lettuce()] };
  assert.ok(game.addToPlate(plate, tomato(), { x: 0, y: 0 }), 'tomato onto lettuce plate');

  // all 3! big-salad ingredients in reverse ticket order
  plate = { kind: 'plate', contents: [cucumber()] };
  assert.ok(game.addToPlate(plate, tomato(), { x: 0, y: 0 }));
  assert.ok(game.addToPlate(plate, lettuce(), { x: 0, y: 0 }));
  assert.equal(plate.contents.length, 3);

  // via counter station too, both directions
  const counter = Object.entries(game.stations).find(([k, s]) => {
    if (s.type !== 'counter') return false;
    const [x, y] = k.split(',').map(Number);
    return game.adjacentFloors(x, y).length > 0;
  })[0];
  game.stations[counter].item = { kind: 'plate', contents: [tomato()] };
  p.carry = lettuce();
  game.interact(p, counter); // hand ingredient -> seated plate
  assert.equal(game.stations[counter].item.contents.length, 2);
  assert.equal(p.carry, null);

  game.stations[counter].item = lettuce();
  p.carry = { kind: 'plate', contents: [tomato()] };
  game.interact(p, counter); // seated ingredient -> held plate
  assert.equal(p.carry.contents.length, 2);
  assert.equal(game.stations[counter].item, null);
});

test('half-chopped item returns to the SAME board (tap-driven, like a player)', () => {
  const game = makeGame();
  const p = game.players.p1;
  const board = stationKey(game, 'board');
  const [bx, by] = board.split(',').map(Number);
  p.carry = { id: 'lettuce', state: 'raw' };
  standAt(game, p, board);
  game.interact(p, board); // place
  for (let i = 0; i < 11; i++) game.tick(0.1); // ~50% chopped
  game.tap('p1', bx, by); // pick it up
  assert.ok(p.carry && p.carry.prog > 0.3, 'holding the half-chopped item');
  game.tap('p1', bx, by); // tap the SAME board again
  assert.equal(p.carry, null, 'placed back on the same board');
  assert.ok(game.stations[board].item.prog > 0.3, 'progress preserved');
});

test('merging plates pours contents onto the seated plate, empty stays in hand', () => {
  const game = makeGame();
  const p = game.players.p1;
  const counter = Object.entries(game.stations).find(([k, s]) => {
    if (s.type !== 'counter') return false;
    const [x, y] = k.split(',').map(Number);
    return game.adjacentFloors(x, y).length > 0;
  })[0];

  game.stations[counter].item = { kind: 'plate', contents: [{ id: 'lettuce', state: 'chopped' }] };
  p.carry = { kind: 'plate', contents: [{ id: 'tomato', state: 'chopped' }] };
  game.interact(p, counter);
  assert.equal(game.stations[counter].item.contents.length, 2, 'seated plate has both ingredients');
  assert.deepEqual(p.carry, { kind: 'plate', contents: [] }, 'empty plate stays in hand');

  // pouring something that fits no recipe is rejected, nothing moves
  p.carry = { kind: 'plate', contents: [{ id: 'tomato', state: 'chopped' }] };
  game.interact(p, counter); // salad + extra tomato fits nothing
  assert.equal(game.stations[counter].item.contents.length, 2);
  assert.equal(p.carry.contents.length, 1);
});

test('non-handheld combos swap instead of stacking', () => {
  const game = makeGame();
  const p = game.players.p1;
  const counter = stationKey(game, 'counter');
  game.stations[counter].item = { id: 'tomato', state: 'chopped' };
  p.carry = { id: 'lettuce', state: 'chopped' };
  game.interact(p, counter);
  // salad isn't handheld — items swap rather than stacking plateless
  assert.deepEqual(p.carry, { id: 'tomato', state: 'chopped' });
  assert.deepEqual(game.stations[counter].item, { id: 'lettuce', state: 'chopped' });
});

test('auto-chopper upgrade chops unmanned boards, slowly', () => {
  const level = LEVELS.find((l) => l.id === 'salad-days');
  const off = new Game(level, ROSTER, { rng: () => 0 });
  const on = new Game(level, ROSTER, { rng: () => 0, upgrades: { auto_chopper: true }, autoChop: true });
  for (const game of [off, on]) {
    const board = stationKey(game, 'board');
    game.stations[board].item = { id: 'lettuce', state: 'raw' };
    game.players.p1.x = 100.5; game.players.p1.y = 100.5; // nobody nearby
    for (let i = 0; i < 60; i++) game.tick(0.1); // 6s > 2.2/0.45
  }
  assert.equal(off.stations[stationKey(off, 'board')].item.state, 'raw', 'no upgrade: nothing happens');
  assert.equal(on.stations[stationKey(on, 'board')].item.state, 'chopped', 'auto-chopper works alone');
});

test('kitchen upgrades apply: shoes, extra plate, non-stick', () => {
  const level = LEVELS.find((l) => l.id === 'burger-bay');
  const plain = new Game(level, ROSTER);
  const upgraded = new Game(level, ROSTER, {
    upgrades: { fast_shoes: true, extra_plate: true, nonstick: true, turbo_stove: true },
  });
  assert.ok(upgraded.speed > plain.speed);
  assert.equal(upgraded.plateSupply, plain.plateSupply + 1);
  assert.equal(upgraded.burnBonus, 3);
  assert.ok(upgraded.cookMult < 1);
});

test('lunch rush kicks in and speeds up orders', () => {
  const game = makeGame();
  game.timeLeft = game.rushMarks[0] + 0.05;
  const events = [];
  game.tick(0.1);
  assert.ok(game.rush > 0, 'rush window opened');
  for (let i = 0; i < 200 && game.rush > 0; i++) events.push(...game.tick(0.5));
  assert.equal(game.rush, 0, 'rush window closed');
  assert.ok(events.some((e) => e.type === 'rush_end'));
});

test('VIP orders are worth more and expire faster', () => {
  const game = makeGame(); // rng()=0 makes every non-first order a VIP
  for (let i = 0; i < 60 && game.orders.length < 2; i++) game.tick(0.5);
  assert.ok(game.orders.length >= 2);
  assert.equal(game.orders[0].vip, false, 'first order is never a VIP');
  assert.equal(game.orders[1].vip, true);
  assert.ok(game.orders[1].ttlMax < game.orders[0].ttlMax, 'VIP timers are tighter');
});

test('plating works in either order: plate-first or ingredient-first', () => {
  const game = makeGame();
  const p = game.players.p1;

  // ingredient-first at the plate stack: holding food, tap plates → plated
  p.carry = { id: 'lettuce', state: 'chopped' };
  game.interact(p, stationKey(game, 'plates'));
  assert.equal(p.carry.kind, 'plate');
  assert.deepEqual(p.carry.contents, [{ id: 'lettuce', state: 'chopped' }]);

  // plate-first at a board: chopped tomato on the board, tap with plate
  const board = stationKey(game, 'board');
  game.stations[board].item = { id: 'tomato', state: 'chopped' };
  game.interact(p, board);
  assert.equal(game.stations[board].item, null, 'board item scooped onto plate');
  assert.equal(p.carry.contents.length, 2);
});

test('plates only accept items that fit some recipe', () => {
  const game = makeGame();
  const p = game.players.p1;
  p.carry = { kind: 'plate', contents: [{ id: 'lettuce', state: 'chopped' }] };
  const ok = game.addToPlate(p.carry, { id: 'tomato', state: 'chopped' }, { x: 0, y: 0 });
  assert.ok(ok);
  const bad = game.addToPlate(p.carry, { id: 'tomato', state: 'chopped' }, { x: 0, y: 0 });
  assert.ok(!bad, 'second tomato fits no recipe');
});

test('serving a matching order scores and clears it', () => {
  const game = makeGame();
  const p = game.players.p1;
  game.tick(0.1); // spawns first order: salad
  assert.equal(game.orders.length, 1);
  assert.equal(game.orders[0].recipe, 'salad');

  p.carry = {
    kind: 'plate',
    contents: [{ id: 'lettuce', state: 'chopped' }, { id: 'tomato', state: 'chopped' }],
  };
  const serve = stationKey(game, 'serve');
  game.interact(p, serve);
  assert.equal(p.carry, null);
  assert.equal(game.orders.length, 0);
  assert.ok(game.score >= RECIPES.salad.points, `score ${game.score}`);
  assert.equal(game.deliveredCount, 1);
  assert.equal(game.players.p1.delivered, 1);
});

test('wrong plate is rejected at the window', () => {
  const game = makeGame();
  const p = game.players.p1;
  game.tick(0.1);
  p.carry = { kind: 'plate', contents: [{ id: 'lettuce', state: 'chopped' }] };
  game.interact(p, stationKey(game, 'serve'));
  assert.notEqual(p.carry, null);
  assert.equal(game.score, 0);
});

test('expired orders cost points and reset combo', () => {
  const game = makeGame();
  game.tick(0.1);
  game.score = 100;
  game.combo = 3;
  game.orders[0].ttl = 0.05;
  game.tick(0.1);
  assert.equal(game.orders.length, 0);
  assert.equal(game.score, 80);
  assert.equal(game.combo, 0);
  assert.equal(game.missedCount, 1);
});

test('dishwashing loop: finite plates, dirty returns, washing restores supply', () => {
  const game = makeGame('burger-bay'); // has a sink and plates: 4
  const p = game.players.p1;
  assert.equal(game.plateSupply, 4);
  const plates = stationKey(game, 'plates');
  const sinkKey = stationKey(game, 'sink');
  const sink = game.stations[sinkKey];

  // taking plates drains the supply; an empty stack refuses
  for (let i = 0; i < 4; i++) {
    p.carry = null;
    game.interact(p, plates);
    assert.equal(p.carry.kind, 'plate');
  }
  assert.equal(game.plateSupply, 0);
  p.carry = null;
  game.interact(p, plates);
  assert.equal(p.carry, null, 'no plates left');

  // serve a burger: the plate comes back dirty at the sink after a delay
  game.tick(0.1); // spawn first order (burger)
  p.carry = { kind: 'plate', contents: [{ id: 'bun', state: 'raw' }, { id: 'patty', state: 'cooked' }] };
  game.interact(p, stationKey(game, 'serve'));
  assert.equal(game.deliveredCount, 1);
  assert.equal(game.pendingDirty.length, 1);

  p.x = 100.5; p.y = 100.5; // away from everything while the plate travels
  for (let i = 0; i < 75; i++) game.tick(0.1); // > 7s return delay
  assert.equal(sink.dirty, 1, 'dirty plate arrived at the sink');
  assert.equal(game.plateSupply, 0, 'still no clean plates');

  // stand at the sink and scrub: supply comes back
  standAt(game, p, sinkKey);
  for (let i = 0; i < 30; i++) game.tick(0.1); // > 2.5s wash
  assert.equal(sink.dirty, 0);
  assert.equal(game.plateSupply, 1, 'washed plate rejoined the stack');
});

test('levels without a sink keep infinite plates', () => {
  const game = makeGame('salad-days');
  const p = game.players.p1;
  assert.equal(game.plateSupply, null);
  for (let i = 0; i < 6; i++) {
    p.carry = null;
    game.interact(p, stationKey(game, 'plates'));
    assert.equal(p.carry.kind, 'plate');
  }
});

test('tap pathfinds to a station and interacts on arrival', () => {
  const game = makeGame();
  const p = game.players.p1;
  const crate = stationKey(game, 'crate', (s) => s.ing === 'tomato');
  const [cx, cy] = crate.split(',').map(Number);
  game.tap('p1', cx, cy);
  assert.ok(p.path.length > 0 || p.carry, 'moving or already interacted');
  for (let i = 0; i < 100 && !p.carry; i++) game.tick(0.1);
  assert.deepEqual(p.carry, { id: 'tomato', state: 'raw' });
});

test('solo and duo games get gentler pacing and scaled star goals', () => {
  const solo = makeGame(); // 1 player
  solo.tick(0.1);
  assert.ok(solo.orders[0].ttlMax > solo.level.orders.ttl, 'solo tickets last longer');
  assert.ok(solo.starGoals[2] < solo.level.stars[2], 'solo star goals are lower');

  const trio = new Game(LEVELS[0], [
    { id: 'a', name: 'A', avatar: 'x' },
    { id: 'b', name: 'B', avatar: 'y' },
    { id: 'c', name: 'C', avatar: 'z' },
  ], { rng: () => 0 });
  trio.tick(0.1);
  assert.equal(trio.orders[0].ttlMax, trio.level.orders.ttl, 'full crews get standard pacing');
  assert.deepEqual(trio.starGoals, trio.level.stars);
});

test('game ends at time zero with star thresholds', () => {
  const game = makeGame();
  game.timeLeft = 0.05;
  game.tick(0.1);
  assert.equal(game.phase, 'over');
  assert.equal(game.starsEarned(), 0);
  game.score = game.starGoals[0];
  assert.equal(game.starsEarned(), 1);
  game.score = game.starGoals[2] + 50;
  assert.equal(game.starsEarned(), 3);
  const res = game.results();
  assert.equal(res.levelId, 'salad-days');
  assert.equal(res.players.length, 1);
});
