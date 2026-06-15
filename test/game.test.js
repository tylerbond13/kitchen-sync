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
    const boards = [];
    const serves = [];
    for (let y = 0; y < level.layout.length; y++) {
      for (let x = 0; x < level.layout[y].length; x++) {
        const c = level.layout[y][x];
        if (c === 'B') boards.push({ x, y });
        if (c === 'W') serves.push({ x, y });
      }
    }
    assert.equal(boards.length, 2, `${level.id} has two cutting boards`);
    assert.ok(boards.every((b) => b.y === 0), `${level.id} boards are on top row`);
    assert.equal(Math.abs(boards[0].x - boards[1].x), 2, `${level.id} boards have one tile between them`);
    const boardSep = level.layout[0][(boards[0].x + boards[1].x) / 2];
    assert.match(boardSep, /[#1-9]/, `${level.id} board separator is a crate or counter`);

    const bottomY = level.layout.length - 1;
    assert.equal(serves.length, 2, `${level.id} has two delivery counters`);
    assert.ok(serves.every((s) => s.y === bottomY), `${level.id} delivery counters are on bottom row`);
    assert.equal(Math.abs(serves[0].x - serves[1].x), 2, `${level.id} delivery counters have one tile between them`);
    const serveSep = level.layout[bottomY][(serves[0].x + serves[1].x) / 2];
    assert.equal(serveSep, '#', `${level.id} delivery counters have an empty counter between them`);
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
    // corners stay clear of counters (open kitchen corners)
    const corners = [[0, 0], [game.w - 1, 0], [0, game.h - 1], [game.w - 1, game.h - 1]];
    for (const [cx, cy] of corners) {
      assert.notEqual(game.grid[cy][cx], '#', `${level.id} corner ${cx},${cy} is not a counter`);
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

test('chopping continues after the chef walks away', () => {
  const game = makeGame();
  const p = game.players.p1;
  const board = stationKey(game, 'board');
  p.carry = { id: 'lettuce', state: 'raw' };
  standAt(game, p, board);
  game.interact(p, board);
  assert.equal(p.carry, null);
  assert.equal(game.stations[board].item.state, 'raw');

  p.x = 100.5; p.y = 100.5;
  for (let i = 0; i < 30; i++) game.tick(0.1);
  assert.equal(game.stations[board].item.state, 'chopped');
  assert.equal(p.carry, null, 'chef can keep doing other things');
});

test('finished chop stays on the board so any chef can grab it', () => {
  const level = LEVELS.find((l) => l.id === 'salad-days');
  const game = new Game(level, [
    { id: 'p1', name: 'Ada', avatar: '🦊' },
    { id: 'p2', name: 'Sam', avatar: '🐸' },
  ], { rng: () => 0 });
  const chopper = game.players.p1;
  const helper = game.players.p2;
  const board = stationKey(game, 'board');

  chopper.carry = { id: 'lettuce', state: 'raw' };
  standAt(game, chopper, board);
  game.interact(chopper, board);

  // the chopper idles right next to the board while it finishes — the item
  // must NOT jump into their hands (that trapped it for everyone else)
  for (let i = 0; i < 30; i++) game.tick(0.1);
  assert.equal(game.stations[board].item.state, 'chopped');
  assert.equal(chopper.carry, null, 'no auto-grab into a bystander hands');

  // a second chef on the same tile takes it while the chopper stands there
  standAt(game, helper, board);
  game.interact(helper, board);
  assert.deepEqual(helper.carry, { id: 'lettuce', state: 'chopped' });
  assert.equal(game.stations[board].item, null);
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

test('cookers emit tool-specific start, completion, and burn-warning events', () => {
  const game = makeGame('burger-bay');
  const p = game.players.p1;
  const pan = stationKey(game, 'cook', (s) => s.tool === 'pan');

  p.carry = { id: 'patty', state: 'chopped' };
  game.interact(p, pan);
  let events = game.tick(0);
  assert.ok(events.some((e) => e.type === 'sizzle' && e.tool === 'pan'));

  events = [];
  for (let i = 0; i < 70; i++) events.push(...game.tick(0.1));
  assert.ok(events.some((e) => e.type === 'ding' && e.tool === 'pan'));

  events = [];
  for (let i = 0; i < 55; i++) events.push(...game.tick(0.1));
  const warning = events.find((e) => e.type === 'burn_warning');
  assert.ok(warning, 'warning starts before the burn');
  assert.equal(warning.tool, 'pan');
  assert.ok(warning.remaining <= 3);
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

test('a plate (empty or full) can be set down on a chopping board', () => {
  const game = makeGame();
  const p = game.players.p1;
  const board = stationKey(game, 'board');
  standAt(game, p, board);

  // empty plate rests on the board
  p.carry = { kind: 'plate', contents: [] };
  game.interact(p, board);
  assert.equal(p.carry, null, 'empty plate set down on the board');
  assert.equal(game.stations[board].item.kind, 'plate');

  // pick it back up, load it, and set the full plate down too
  game.interact(p, board);
  assert.equal(game.stations[board].item, null);
  p.carry = { kind: 'plate', contents: [{ id: 'lettuce', state: 'chopped' }] };
  game.interact(p, board);
  assert.equal(p.carry, null, 'full plate set down on the board');
  assert.equal(game.stations[board].item.contents.length, 1);

  // a chopped ingredient brought to the seated plate lands on it
  p.carry = { id: 'tomato', state: 'chopped' };
  game.interact(p, board);
  assert.equal(p.carry, null, 'ingredient added to the plate on the board');
  assert.equal(game.stations[board].item.contents.length, 2);
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

  p.carry = game.stations[board].item;
  game.stations[board].item = null;
  assert.ok(p.carry.prog > 0.3, 'progress travels with the item');
  game.interact(p, board); // put it back
  p.x = 100.5; p.y = 100.5;
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

test('tapping a busy board does not interrupt chopping', () => {
  const game = makeGame();
  const p = game.players.p1;
  const board = stationKey(game, 'board');
  const [bx, by] = board.split(',').map(Number);
  p.carry = { id: 'lettuce', state: 'raw' };
  standAt(game, p, board);
  game.interact(p, board); // place
  for (let i = 0; i < 11; i++) game.tick(0.1); // ~50% chopped
  game.tap('p1', bx, by);
  assert.equal(p.carry, null, 'keeps chopping instead of picking up raw food');
  assert.equal(p.queue.length, 0);
  for (let i = 0; i < 30 && game.stations[board].item.state !== 'chopped'; i++) game.tick(0.1);
  assert.equal(game.stations[board].item.state, 'chopped');
  assert.equal(p.carry, null, 'finished food waits on the board');
  game.interact(p, board);
  assert.deepEqual(p.carry, { id: 'lettuce', state: 'chopped' });
  assert.equal(game.stations[board].item, null);
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

test('boards chop unmanned by default', () => {
  const level = LEVELS.find((l) => l.id === 'salad-days');
  const off = new Game(level, ROSTER, { rng: () => 0 });
  const on = new Game(level, ROSTER, { rng: () => 0, upgrades: { auto_chopper: true }, autoChop: true });
  for (const game of [off, on]) {
    const board = stationKey(game, 'board');
    game.stations[board].item = { id: 'lettuce', state: 'raw' };
    game.players.p1.x = 100.5; game.players.p1.y = 100.5; // nobody nearby
    for (let i = 0; i < 30; i++) game.tick(0.1);
  }
  assert.equal(off.stations[stationKey(off, 'board')].item.state, 'chopped', 'base boards work alone');
  assert.equal(on.stations[stationKey(on, 'board')].item.state, 'chopped', 'legacy auto-chop toggle is still harmless');
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

test('queued taps continue while the board chops autonomously', () => {
  const game = makeGame();
  const p = game.players.p1;
  const lettuce = stationKey(game, 'crate', (s) => s.ing === 'lettuce');
  const tomato = stationKey(game, 'crate', (s) => s.ing === 'tomato');
  const board = stationKey(game, 'board');
  const [lx, ly] = lettuce.split(',').map(Number);
  const [tx, ty] = tomato.split(',').map(Number);
  const [bx, by] = board.split(',').map(Number);

  game.tap('p1', lx, ly);
  game.tap('p1', bx, by);
  game.tap('p1', tx, ty);

  assert.equal(p.queue.length, 2);
  let carriedTomatoWhileChopping = false;
  for (let i = 0; i < 300; i++) {
    game.tick(0.1);
    const item = game.stations[board].item;
    if (item && item.id === 'lettuce' && item.state === 'raw') {
      carriedTomatoWhileChopping ||= p.carry && p.carry.id === 'tomato';
    }
    if (item && item.id === 'lettuce' && item.state === 'chopped' && p.carry && p.carry.id === 'tomato') break;
  }

  assert.ok(carriedTomatoWhileChopping, 'tomato action ran while lettuce was still chopping');
  assert.equal(game.stations[board].item.state, 'chopped');
  assert.deepEqual(p.carry, { id: 'tomato', state: 'raw' });
  assert.equal(p.queue.length, 0);
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

test('cake world: mixer makes batter, oven bakes it, cake serves', () => {
  const game = makeGame('cake-sweet-beginnings');
  const p = game.players.p1;
  const mixer = stationKey(game, 'cook', (s) => s.tool === 'mixer');
  const oven  = stationKey(game, 'cook', (s) => s.tool === 'oven');

  // load the Chocolate Cake batter: flour + eggs + chopped chocolate
  p.carry = { id: 'flour', state: 'raw' };          game.interact(p, mixer);
  p.carry = { id: 'eggs', state: 'raw' };            game.interact(p, mixer);
  p.carry = { id: 'chocolate', state: 'chopped' };   game.interact(p, mixer);
  assert.equal(game.stations[mixer].state, 'cooking', 'mixer starts on the full combo');

  game.tick(3.2);
  assert.equal(game.stations[mixer].state, 'done', 'mixing finished');
  game.tick(40);
  assert.equal(game.stations[mixer].state, 'done', 'mixers never burn');
  game.interact(p, mixer);
  assert.deepEqual(p.carry, { id: 'chocolate_batter', state: 'raw' }, 'batter picked up');

  // bake the batter into a Chocolate Cake dish
  game.interact(p, oven);
  assert.equal(p.carry, null);
  assert.equal(game.stations[oven].state, 'cooking', 'oven starts baking the batter');
  game.tick(8.2);
  assert.equal(game.stations[oven].state, 'done');
  game.interact(p, oven);
  assert.deepEqual(p.carry, { kind: 'dish', id: 'chocolate_cake' }, 'baked cake picked up');

  // plate, then decorate: ice (pink) + garnish (sprinkles)
  p.carry = { kind: 'plate', contents: [p.carry] };
  game.interact(p, stationKey(game, 'ice'));
  assert.equal(p.carry.contents[0].icing, 'pink', 'iced pink at the dispenser');
  game.interact(p, stationKey(game, 'garnish'));
  assert.equal(p.carry.contents[0].topper, 'sprinkles', 'garnished with sprinkles');
  assert.equal(itemToken(p.carry.contents[0]), 'chocolate_cake.dish#pink+sprinkles');

  // serving an un-decorated cake would be rejected; the finished one scores
  game.orders = [{ id: 1, recipe: 'chocolate_cake', vip: false, ttl: 80, ttlMax: 80 }];
  const before = game.score;
  game.interact(p, stationKey(game, 'serve'));
  assert.equal(p.carry, null, 'decorated cake delivered at the window');
  assert.equal(game.orders.length, 0);
  assert.ok(game.score > before, `serving the cake scored (${game.score})`);
});

test('carrot and honeycomb batters bake into their own cakes', () => {
  const game = makeGame('cake-sweet-beginnings');
  const p = game.players.p1;
  const mixer = stationKey(game, 'cook', (s) => s.tool === 'mixer');
  const oven  = stationKey(game, 'cook', (s) => s.tool === 'oven');

  for (const [flavor, batter, cake] of [
    ['carrot', 'carrot_batter', 'carrot_cake'],
    ['honeycomb', 'honeycomb_batter', 'honeycomb_cake'],
  ]) {
    p.carry = { id: 'flour', state: 'raw' };          game.interact(p, mixer);
    p.carry = { id: 'eggs', state: 'raw' };            game.interact(p, mixer);
    p.carry = { id: flavor, state: 'chopped' };        game.interact(p, mixer);
    game.tick(3.2);
    game.interact(p, mixer);
    assert.deepEqual(p.carry, { id: batter, state: 'raw' });
    game.interact(p, oven);
    game.tick(8.2);
    game.interact(p, oven);
    assert.deepEqual(p.carry, { kind: 'dish', id: cake });
    p.carry = null;
  }
});

test('cake world Phase 3 infra: icing tags a baked cake, order matches when iced', () => {
  const game = makeGame('cake-sweet-beginnings');
  const p = game.players.p1;
  // inject an icing dispenser (no live level uses 'I' yet)
  game.stations['ice-1'] = { type: 'ice', colour: 'pink' };

  // plain baked cake is unchanged by the token folding (backward compatible)
  const bare = { kind: 'dish', id: 'chocolate_cake' };
  assert.equal(itemToken(bare), 'chocolate_cake.dish');

  // ice a cake sitting on a plate
  p.carry = { kind: 'plate', contents: [{ kind: 'dish', id: 'chocolate_cake' }] };
  game.interact(p, 'ice-1');
  assert.equal(p.carry.contents[0].icing, 'pink', 'cake iced pink');
  assert.equal(itemToken(p.carry.contents[0]), 'chocolate_cake.dish#pink', 'colour folds into the token');

  // an icing-requiring recipe only matches the iced cake
  const iced = ['chocolate_cake.dish#pink'];
  assert.ok(multisetEqual(p.carry.contents.map(itemToken), iced), 'iced cake matches an iced recipe');
  assert.ok(!multisetEqual(['chocolate_cake.dish'], iced), 'an un-iced cake would not match');

  // icing again is rejected (already iced)
  const n = game.events.length;
  game.interact(p, 'ice-1');
  assert.ok(game.events.slice(n).some((e) => e.type === 'reject'), 'double-ice rejected');

  // non-cake is rejected
  p.carry = { kind: 'plate', contents: [{ id: 'lettuce', state: 'chopped' }] };
  const n2 = game.events.length;
  game.interact(p, 'ice-1');
  assert.ok(game.events.slice(n2).some((e) => e.type === 'reject'), 'non-cake rejected');
});

test('cake world Phase 3 infra: garnish needs an iced cake, then tops it', () => {
  const game = makeGame('cake-sweet-beginnings');
  const p = game.players.p1;
  game.stations['ice-1'] = { type: 'ice', colour: 'pink' };
  game.stations['gar-1'] = { type: 'garnish', topper: 'rose_petal' };

  // garnish BEFORE icing is rejected (enforces bake -> ice -> garnish order)
  p.carry = { kind: 'plate', contents: [{ kind: 'dish', id: 'chocolate_cake' }] };
  let n = game.events.length;
  game.interact(p, 'gar-1');
  assert.ok(game.events.slice(n).some((e) => e.type === 'reject'), 'cannot garnish an un-iced cake');
  assert.equal(p.carry.contents[0].topper, undefined);

  // ice it, then garnish succeeds and folds the topper into the token
  game.interact(p, 'ice-1');
  game.interact(p, 'gar-1');
  assert.equal(p.carry.contents[0].topper, 'rose_petal');
  assert.equal(itemToken(p.carry.contents[0]), 'chocolate_cake.dish#pink+rose_petal');

  // garnishing again is rejected (only once)
  n = game.events.length;
  game.interact(p, 'gar-1');
  assert.ok(game.events.slice(n).some((e) => e.type === 'reject'), 'double-garnish rejected');
});
