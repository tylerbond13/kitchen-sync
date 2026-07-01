// The AI teammate (Sous-Chef) drives a real chef in the authoritative sim.
const test = require('node:test');
const assert = require('node:assert/strict');
const { Game } = require('../server/game');
const { SousChef, chopsForRecipe } = require('../server/sousChef');
const { LEVELS } = require('../server/levels');

const BOT_ID = 'bot:sous-chef';
const roster = () => [
  { id: 'human', name: 'You', avatar: '🧑‍🍳', chef: 'chef', connected: true },
  { id: BOT_ID, name: 'Sous-Chef', avatar: '🤖', chef: 'chef', connected: true, bot: true },
];

test('chopsForRecipe expands a recipe to the chops it ultimately needs', () => {
  assert.deepEqual(chopsForRecipe('salad').sort(), ['lettuce', 'tomato']);
  assert.deepEqual(chopsForRecipe('big_salad').sort(), ['cucumber', 'lettuce', 'tomato']);
  // cook chains expand: onion soup = 3 chopped onions via the pot combo
  assert.deepEqual(chopsForRecipe('soup_onion'), ['onion', 'onion', 'onion']);
  // burger: bun.raw needs no chop; patty.cooked → patty.chopped
  assert.deepEqual(chopsForRecipe('burger'), ['patty']);
  // pizza dish expands through the oven combo to its chopped toppings
  assert.deepEqual(chopsForRecipe('pizza').sort(), ['cheese', 'tomato']);
  // iced/garnished cakes are left to the human for now
  assert.deepEqual(chopsForRecipe('chocolate_cake'), []);
});

test('Sous-Chef with only the chopping skill preps ingredients', () => {
  const salad = LEVELS.find((l) => l.id === 'salad-days');
  const game = new Game(salad, roster());
  const bot = new SousChef(game, BOT_ID, ['chop']);
  const dt = 1 / 12;
  for (let i = 0; i < 12 * 30; i++) { bot.think(dt); game.tick(dt); } // ~30 sim-seconds

  // prep bot leaves chopped ingredients out (on boards, or cleared onto counters)
  const chopped = Object.values(game.stations)
    .filter((s) => (s.type === 'board' || s.type === 'counter') && s.item && s.item.state === 'chopped').length;
  assert.ok(chopped >= 1, `bot should leave chopped prep out for the crew (found ${chopped})`);
  assert.ok(game.players[BOT_ID], 'bot chef exists in the sim');
});

test('Sous-Chef (cooking skill) rescues a finished dish off the stove before it burns', () => {
  const soup = LEVELS.find((l) => l.id === 'soups-on'); // has a pot + a sink
  const game = new Game(soup, roster());
  const bot = new SousChef(game, BOT_ID, ['cook']);
  // Stage a finished dish sitting on a cook station, about to burn.
  const key = Object.keys(game.stations).find((k) => game.stations[k].type === 'cook');
  const cooker = game.stations[key];
  // a valid "done" cooker keeps its combo (the tick counts down burnAfter on it)
  cooker.state = 'done';
  cooker.combo = { tool: 'pot', out: { kind: 'dish', id: 'soup_onion' }, time: 10, burnAfter: 12 };
  cooker.progress = 0;
  cooker.contents = [{ kind: 'dish', id: 'soup_onion' }];

  const dt = 1 / 12;
  let rescued = false;
  for (let i = 0; i < 12 * 15; i++) {
    bot.think(dt); game.tick(dt);
    if (cooker.state !== 'done') rescued = true; // bot grabbed it → cooker reset
  }
  assert.ok(rescued, 'bot should pull the finished dish off the stove');
  // …and set it down on a counter for the human to plate (not left in hand).
  const staged = Object.values(game.stations)
    .some((s) => s.item && s.item.kind === 'dish' && s.item.id === 'soup_onion');
  assert.ok(staged, 'the rescued dish should be staged on a counter');
});

test('Sous-Chef with chop+plate+deliver serves a salad on its own', () => {
  const salad = LEVELS.find((l) => l.id === 'salad-days');
  const game = new Game(salad, roster());
  const bot = new SousChef(game, BOT_ID, ['chop', 'plate', 'serve']);
  const dt = 1 / 12;
  for (let i = 0; i < 12 * 60; i++) { bot.think(dt); game.tick(dt); } // ~60 sim-seconds
  assert.ok(game.deliveredCount > 0, `bot should have served a dish (delivered=${game.deliveredCount}, score=${game.score})`);
});

test('Sous-Chef with the full skill set cooks, plates and serves soup on its own', () => {
  const soup = LEVELS.find((l) => l.id === 'soups-on'); // chop → cook → plate → serve
  const game = new Game(soup, roster());
  const bot = new SousChef(game, BOT_ID, ['chop', 'cook', 'plate', 'serve']);
  const dt = 1 / 12;
  for (let i = 0; i < 12 * 90; i++) { bot.think(dt); game.tick(dt); } // ~90 sim-seconds
  assert.ok(game.deliveredCount > 0, `bot should cook + serve a soup (delivered=${game.deliveredCount}, score=${game.score})`);
});

test('Sous-Chef does nothing without skills, and never crashes on any level / skill set', () => {
  const dt = 1 / 12;
  const skillSets = [[], ['chop'], ['chop', 'wash'], ['chop', 'cook', 'plate', 'serve', 'wash']];
  // With no skills taught, the bot exists but never acts.
  const salad = LEVELS.find((l) => l.id === 'salad-days');
  const idle = new Game(salad, roster());
  const idleBot = new SousChef(idle, BOT_ID, []);
  for (let i = 0; i < 12 * 20; i++) { idleBot.think(dt); idle.tick(dt); }
  assert.equal(idle.deliveredCount, 0, 'a skill-less bot should never deliver');
  // No crashes for any skill set on any level.
  for (const caps of skillSets) {
    for (const level of LEVELS) {
      const game = new Game(level, roster());
      const bot = new SousChef(game, BOT_ID, caps);
      assert.doesNotThrow(() => {
        for (let i = 0; i < 12 * 12; i++) { bot.think(dt); game.tick(dt); }
      }, `${level.id} [${caps.join(',')}]: bot loop threw`);
    }
  }
});
