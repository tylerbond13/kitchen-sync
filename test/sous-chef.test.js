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

test('Sous-Chef preps chopped ingredients during a live round', () => {
  const salad = LEVELS.find((l) => l.id === 'salad-days');
  const game = new Game(salad, roster());
  const bot = new SousChef(game, BOT_ID);
  const dt = 1 / 12;
  for (let i = 0; i < 12 * 30; i++) { bot.think(dt); game.tick(dt); } // ~30 sim-seconds

  const chopped = Object.values(game.stations)
    .filter((s) => s.type === 'board' && s.item && s.item.state === 'chopped').length;
  assert.ok(chopped >= 1, `bot should leave chopped prep on a board (found ${chopped})`);
  assert.ok(game.players[BOT_ID], 'bot chef exists in the sim');
});

test('Sous-Chef never crashes the sim on any level', () => {
  const dt = 1 / 12;
  for (const level of LEVELS) {
    const game = new Game(level, roster());
    const bot = new SousChef(game, BOT_ID);
    assert.doesNotThrow(() => {
      for (let i = 0; i < 12 * 12; i++) { bot.think(dt); game.tick(dt); }
    }, `${level.id}: bot loop threw`);
  }
});
