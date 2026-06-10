// Level definitions: kitchen layouts, recipes, cook combos, order schedules, star thresholds.
//
// Layout legend (each string row = one grid row, each char = one tile):
//   .  floor (walkable)
//   #  counter (can hold one item)
//   B  cutting board
//   S  stove with pan (capacity 1)
//   O  stove with pot (capacity 3)
//   V  oven (capacity 3)
//   P  plate stack
//   W  serving window
//   T  trash
//   1-9  ingredient crate (mapped via level.crates)
//
// Recipes are plates whose contents match a multiset of "id.state" tokens
// (or a single cooked dish token like "soup").

const ING = {
  lettuce:  { name: 'Lettuce',  emoji: '🥬', chopped: '🥗' },
  tomato:   { name: 'Tomato',   emoji: '🍅', chopped: '🍅' },
  cucumber: { name: 'Cucumber', emoji: '🥒', chopped: '🥒' },
  bun:      { name: 'Bun',      emoji: '🍞' },
  patty:    { name: 'Patty',    emoji: '🥩', cooked: '🍖' },
  cheese:   { name: 'Cheese',   emoji: '🧀', chopped: '🧀' },
  onion:    { name: 'Onion',    emoji: '🧅', chopped: '🧅' },
  rice:     { name: 'Rice',     emoji: '🍚', cooked: '🍚' },
  fish:     { name: 'Fish',     emoji: '🐟', chopped: '🍣' },
  seaweed:  { name: 'Seaweed',  emoji: '🌿' },
  dough:    { name: 'Dough',    emoji: '🫓' },
};

const DISHES = {
  soup_onion:  { name: 'Onion Soup',  emoji: '🥣' },
  soup_tomato: { name: 'Tomato Soup', emoji: '🍲' },
  pizza:       { name: 'Pizza',       emoji: '🍕' },
};

const RECIPES = {
  salad:        { name: 'Garden Salad', emoji: '🥗', needs: ['lettuce.chopped', 'tomato.chopped'], points: 60 },
  big_salad:    { name: 'Chef Salad',   emoji: '🥙', needs: ['lettuce.chopped', 'tomato.chopped', 'cucumber.chopped'], points: 90 },
  burger:       { name: 'Burger',       emoji: '🍔', needs: ['bun.raw', 'patty.cooked'], points: 80 },
  cheeseburger: { name: 'Cheeseburger', emoji: '🍔', needs: ['bun.raw', 'patty.cooked', 'cheese.chopped'], points: 110 },
  soup_onion:   { name: 'Onion Soup',   emoji: '🥣', needs: ['soup_onion.dish'], points: 100 },
  soup_tomato:  { name: 'Tomato Soup',  emoji: '🍲', needs: ['soup_tomato.dish'], points: 100 },
  sushi:        { name: 'Sushi',        emoji: '🍣', needs: ['rice.cooked', 'fish.chopped', 'seaweed.raw'], points: 110 },
  pizza:        { name: 'Pizza',        emoji: '🍕', needs: ['pizza.dish'], points: 120 },
};

// What appliances can cook: a multiset of input tokens -> output.
// kind 'item' keeps id+state, kind 'dish' produces a finished dish item.
const COOK_COMBOS = [
  { tool: 'pan',  inputs: ['patty.raw'],                                      out: { kind: 'item', id: 'patty', state: 'cooked' }, time: 6,  burnAfter: 8 },
  { tool: 'pot',  inputs: ['onion.chopped', 'onion.chopped', 'onion.chopped'], out: { kind: 'dish', id: 'soup_onion' },             time: 10, burnAfter: 12 },
  { tool: 'pot',  inputs: ['tomato.chopped', 'tomato.chopped', 'tomato.chopped'], out: { kind: 'dish', id: 'soup_tomato' },         time: 10, burnAfter: 12 },
  { tool: 'pot',  inputs: ['rice.raw'],                                       out: { kind: 'item', id: 'rice', state: 'cooked' },  time: 7,  burnAfter: 12 },
  { tool: 'oven', inputs: ['dough.raw', 'tomato.chopped', 'cheese.chopped'],  out: { kind: 'dish', id: 'pizza' },                  time: 9,  burnAfter: 10 },
];

const CHOPPABLE = new Set(['lettuce', 'tomato', 'cucumber', 'cheese', 'onion', 'fish']);

const LEVELS = [
  {
    id: 'salad-days',
    n: 1,
    name: 'Salad Days',
    blurb: 'Chop it like it’s hot. Salads only — learn the ropes.',
    emoji: '🥗',
    duration: 150,
    stars: [300, 540, 780],
    crates: { 1: 'lettuce', 2: 'tomato', 3: 'cucumber' },
    layout: [
      '#1#2#3#',
      'B.....#',
      'B.....P',
      '#.....W',
      'T..#..W',
      '#######',
    ],
    orders: { recipes: ['salad', 'salad', 'big_salad'], every: 14, ttl: 60, maxOpen: 4 },
  },
  {
    id: 'burger-bay',
    n: 2,
    name: 'Burger Bay',
    blurb: 'Fire up the pan — and don’t let the patties burn!',
    emoji: '🍔',
    duration: 160,
    stars: [350, 640, 950],
    crates: { 1: 'bun', 2: 'patty', 3: 'lettuce', 4: 'cheese' },
    layout: [
      '#1#2#3#',
      'S.....4',
      'S.....B',
      '#..#..P',
      'T.....W',
      '###P#W#',
    ],
    orders: { recipes: ['burger', 'burger', 'cheeseburger'], every: 16, ttl: 70, maxOpen: 4 },
  },
  {
    id: 'soups-on',
    n: 3,
    name: "Soup's On",
    blurb: 'Three chopped veggies in the pot. Stir crazy.',
    emoji: '🥣',
    duration: 170,
    stars: [400, 700, 1050],
    crates: { 1: 'onion', 2: 'tomato' },
    layout: [
      '#1#.#2#',
      'B.....B',
      'O..#..O',
      '#.....P',
      'T.....W',
      '###P#W#',
    ],
    orders: { recipes: ['soup_onion', 'soup_tomato'], every: 17, ttl: 80, maxOpen: 4 },
  },
  {
    id: 'sushi-squad',
    n: 4,
    name: 'Sushi Squad',
    blurb: 'Rice in the pot, fish on the board. Teamwork time.',
    emoji: '🍣',
    duration: 170,
    stars: [420, 760, 1100],
    crates: { 1: 'rice', 2: 'fish', 3: 'seaweed' },
    layout: [
      '#1#2#3#',
      'O.....B',
      'O.....B',
      '#..#..P',
      'T.....W',
      '###P#W#',
    ],
    orders: { recipes: ['sushi'], every: 15, ttl: 75, maxOpen: 4 },
  },
  {
    id: 'pizza-panic',
    n: 5,
    name: 'Pizza Panic',
    blurb: 'Dough, sauce, cheese, oven. Hot and fast.',
    emoji: '🍕',
    duration: 180,
    stars: [450, 820, 1200],
    crates: { 1: 'dough', 2: 'tomato', 3: 'cheese' },
    layout: [
      '#1#2#3#',
      'B.....B',
      'V..#..V',
      '#.....P',
      'T.....W',
      '###P#W#',
    ],
    orders: { recipes: ['pizza'], every: 16, ttl: 85, maxOpen: 4 },
  },
  {
    id: 'grand-feast',
    n: 6,
    name: 'The Grand Feast',
    blurb: 'Everything, everywhere, all at once. The full menu.',
    emoji: '👑',
    duration: 210,
    stars: [550, 1000, 1500],
    crates: { 1: 'lettuce', 2: 'tomato', 3: 'bun', 4: 'patty', 5: 'cheese', 6: 'onion' },
    layout: [
      '#1#2#3#4#',
      'B.......5',
      'B.......6',
      'S...#...B',
      'O...#...P',
      '#.......P',
      'T.......W',
      '####P#W##',
    ],
    orders: { recipes: ['salad', 'burger', 'cheeseburger', 'soup_onion', 'soup_tomato'], every: 13, ttl: 75, maxOpen: 4 },
  },
];

module.exports = { ING, DISHES, RECIPES, COOK_COMBOS, CHOPPABLE, LEVELS };
