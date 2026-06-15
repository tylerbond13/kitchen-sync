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
//   K  sink (wash dirty plates back into the stack)
//   1-9  ingredient crate (mapped via level.crates)
//
// Recipes are plates whose contents match a multiset of "id.state" tokens
// (or a single cooked dish token like "soup"). Recipes with `handheld: true`
// can be assembled without a plate (the bun/tortilla IS the plate) and don't
// generate a dirty dish when served.

const ING = {
  lettuce:    { name: 'Lettuce',    emoji: '🥬' },
  tomato:     { name: 'Tomato',     emoji: '🍅' },
  cucumber:   { name: 'Cucumber',   emoji: '🥒' },
  bun:        { name: 'Bun',        emoji: '🍞' },
  patty:      { name: 'Patty',      emoji: '🥩' },
  cheese:     { name: 'Cheese',     emoji: '🧀' },
  onion:      { name: 'Onion',      emoji: '🧅' },
  rice:       { name: 'Rice',       emoji: '🍚' },
  fish:       { name: 'Fish',       emoji: '🐟' },
  seaweed:    { name: 'Seaweed',    emoji: '🌿' },
  dough:      { name: 'Dough',      emoji: '🫓' },
  potato:     { name: 'Potato',     emoji: '🥔' },
  carrot:     { name: 'Carrot',     emoji: '🥕' },
  milk:       { name: 'Milk',       emoji: '🥛' },
  cocoa:      { name: 'Cocoa',      emoji: '🍫' },
  tortilla:   { name: 'Tortilla',   emoji: '🌮' },
  pineapple:  { name: 'Pineapple',  emoji: '🍍' },
  strawberry: { name: 'Strawberry', emoji: '🍓' },
  banana:     { name: 'Banana',     emoji: '🍌' },
  // ── Cake World pantry (emoji are placeholders; real art lives in
  //    assets/images/cake-world/ and is wired in assetManifest.js) ──
  flour:      { name: 'Flour',      emoji: '🌾' },
  sugar:      { name: 'Sugar',      emoji: '🧂' },
  matcha:     { name: 'Matcha',     emoji: '🍵' },
  blueberry:  { name: 'Blueberry',  emoji: '🫐' },
};

const DISHES = {
  soup_onion:  { name: 'Onion Soup',  emoji: '🥣' },
  soup_tomato: { name: 'Tomato Soup', emoji: '🍲' },
  pizza:       { name: 'Pizza',       emoji: '🍕' },
  stew:        { name: 'Hearty Stew', emoji: '🥘' },
  cocoa:       { name: 'Hot Cocoa',   emoji: '☕' },
  juice:       { name: 'Smoothie',    emoji: '🍹' },
  // ── Cake World: a baked cake is a "dish" (like pizza), produced by the oven
  //    from a batter. Icing/garnish are a later phase (open design questions).
  rose_cake:   { name: 'Rose Cake',   emoji: '🎂' },
  matcha_cake: { name: 'Matcha Cake', emoji: '🍰' },
  galaxy_cake: { name: 'Galaxy Cake', emoji: '🎂' },
};

const RECIPES = {
  salad:        { name: 'Garden Salad', emoji: '🥗', needs: ['lettuce.chopped', 'tomato.chopped'], points: 60 },
  big_salad:    { name: 'Chef Salad',   emoji: '🥙', needs: ['lettuce.chopped', 'tomato.chopped', 'cucumber.chopped'], points: 90 },
  burger:       { name: 'Burger',       emoji: '🍔', needs: ['bun.raw', 'patty.cooked'], points: 80, handheld: true },
  cheeseburger: { name: 'Cheeseburger', emoji: '🍔', needs: ['bun.raw', 'patty.cooked', 'cheese.chopped'], points: 110, handheld: true },
  soup_onion:   { name: 'Onion Soup',   emoji: '🥣', needs: ['soup_onion.dish'], points: 100 },
  soup_tomato:  { name: 'Tomato Soup',  emoji: '🍲', needs: ['soup_tomato.dish'], points: 100 },
  sushi:        { name: 'Sushi',        emoji: '🍣', needs: ['rice.cooked', 'fish.chopped', 'seaweed.raw'], points: 110 },
  pizza:        { name: 'Pizza',        emoji: '🍕', needs: ['pizza.dish'], points: 120 },
  // winter
  stew:         { name: 'Hearty Stew',  emoji: '🥘', needs: ['stew.dish'], points: 110 },
  cocoa:        { name: 'Hot Cocoa',    emoji: '☕', needs: ['cocoa.dish'], points: 80 },
  // beach
  juice:        { name: 'Smoothie',     emoji: '🍹', needs: ['juice.dish'], points: 90 },
  poke:         { name: 'Poke Bowl',    emoji: '🥗', needs: ['rice.cooked', 'fish.chopped', 'cucumber.chopped'], points: 110 },
  fish_taco:    { name: 'Fish Taco',    emoji: '🌮', needs: ['tortilla.raw', 'fish.chopped', 'lettuce.chopped'], points: 100, handheld: true },
  // ── Cake World (Phase 2: chop -> mix -> bake -> plate -> serve) ──
  rose_cake:    { name: 'Rose Cake',    emoji: '🌹', needs: ['rose_cake.dish'],   points: 90 },
  matcha_cake:  { name: 'Matcha Cake',  emoji: '🍵', needs: ['matcha_cake.dish'], points: 90 },
  galaxy_cake:  { name: 'Galaxy Cake',  emoji: '🌌', needs: ['galaxy_cake.dish'], points: 100 },
};

// What appliances can cook: a multiset of input tokens -> output.
// kind 'item' keeps id+state, kind 'dish' produces a finished dish item.
const COOK_COMBOS = [
  { tool: 'pan',  inputs: ['patty.chopped'],                                  out: { kind: 'item', id: 'patty', state: 'cooked' }, time: 6,  burnAfter: 8 },
  { tool: 'pot',  inputs: ['onion.chopped', 'onion.chopped', 'onion.chopped'], out: { kind: 'dish', id: 'soup_onion' },             time: 10, burnAfter: 12 },
  { tool: 'pot',  inputs: ['tomato.chopped', 'tomato.chopped', 'tomato.chopped'], out: { kind: 'dish', id: 'soup_tomato' },         time: 10, burnAfter: 12 },
  { tool: 'pot',  inputs: ['rice.raw'],                                       out: { kind: 'item', id: 'rice', state: 'cooked' },  time: 7,  burnAfter: 12 },
  { tool: 'oven', inputs: ['dough.raw', 'tomato.chopped', 'cheese.chopped'],  out: { kind: 'dish', id: 'pizza' },                  time: 9,  burnAfter: 10 },
  // winter
  { tool: 'pot',  inputs: ['potato.chopped', 'carrot.chopped', 'onion.chopped'], out: { kind: 'dish', id: 'stew' },                time: 10, burnAfter: 12 },
  { tool: 'pot',  inputs: ['milk.raw', 'cocoa.chopped'],                      out: { kind: 'dish', id: 'cocoa' },                  time: 6,  burnAfter: 10 },
  // beach
  { tool: 'pot',  inputs: ['pineapple.chopped', 'strawberry.chopped', 'banana.chopped'], out: { kind: 'dish', id: 'juice' },       time: 5,  burnAfter: 9 },
  // ── Cake World — the Mixing Bowl (tool 'mixer') combines pantry + prepped
  //    fruit into a batter; the oven bakes the batter into a cake. Mixers never
  //    burn (huge burnAfter), so a batter waits patiently to be carried off.
  { tool: 'mixer', inputs: ['flour.raw', 'sugar.raw', 'strawberry.chopped'], out: { kind: 'item', id: 'rose_batter',   state: 'raw' }, time: 3, burnAfter: 999 },
  { tool: 'mixer', inputs: ['flour.raw', 'sugar.raw', 'matcha.raw'],         out: { kind: 'item', id: 'matcha_batter', state: 'raw' }, time: 3, burnAfter: 999 },
  { tool: 'mixer', inputs: ['flour.raw', 'sugar.raw', 'blueberry.chopped'],  out: { kind: 'item', id: 'galaxy_batter', state: 'raw' }, time: 3, burnAfter: 999 },
  { tool: 'oven',  inputs: ['rose_batter.raw'],   out: { kind: 'dish', id: 'rose_cake' },   time: 8, burnAfter: 11 },
  { tool: 'oven',  inputs: ['matcha_batter.raw'], out: { kind: 'dish', id: 'matcha_cake' }, time: 8, burnAfter: 11 },
  { tool: 'oven',  inputs: ['galaxy_batter.raw'], out: { kind: 'dish', id: 'galaxy_cake' }, time: 8, burnAfter: 11 },
];

const CHOPPABLE = new Set([
  'lettuce', 'tomato', 'cucumber', 'cheese', 'onion', 'fish', 'patty',
  'potato', 'carrot', 'cocoa', 'pineapple', 'strawberry', 'banana',
  'blueberry',
]);

// Kitchen Shop upgrades — persist per crew, bought with banked score coins.
const UPGRADES = {
  auto_chopper: { name: 'Auto-Chopper',    emoji: '🤖', desc: 'Boards chop 35% faster when toggled on in-game', cost: 800 },
  fast_shoes:   { name: 'Speedy Sneakers', emoji: '👟', desc: 'All chefs move 12% faster', cost: 1000 },
  nonstick:     { name: 'Non-Stick Pans',  emoji: '🍳', desc: '+3 seconds before food burns', cost: 1200 },
  extra_plate:  { name: 'Bonus Plate',     emoji: '🍽️', desc: '+1 plate in the stack', cost: 1500 },
  dish_bot:     { name: 'Dish-Bot 3000',   emoji: '🫧', desc: 'The sink slowly washes dishes by itself', cost: 2000 },
  turbo_stove:  { name: 'Turbo Burners',   emoji: '🔥', desc: 'Everything cooks 15% faster', cost: 2500 },
};

const SECTIONS = [
  { id: 'diner',  name: 'The Family Diner',  emoji: '🍳', blurb: 'Where it all begins.' },
  { id: 'winter', name: 'Winter Wonderland', emoji: '❄️', blurb: 'Cozy food for cold days.' },
  { id: 'beach',  name: 'Beach Club',        emoji: '🏖️', blurb: 'Sun, sand, and smoothies.' },
  { id: 'cake',   name: 'Cake World',        emoji: '🎂', blurb: 'Bake the dream cakes. (Beta)' },
];

const LEVELS = [
  // ============ THE FAMILY DINER ============
  {
    id: 'salad-days',
    n: 1, section: 'diner', theme: 'diner',
    name: 'Salad Days',
    blurb: 'Chop it like it’s hot. Salads only — learn the ropes.',
    emoji: '🥗',
    duration: 150,
    stars: [300, 540, 780],
    crates: { 1: 'lettuce', 2: 'tomato', 3: 'cucumber' },
    layout: [
      '.1B2B3.#.#.',
      '#.........#',
      'P...#.#...P',
      '#...#.#...#',
      '#.........#',
      '.T..W#W..P.',
    ],
    orders: { recipes: ['salad', 'salad', 'big_salad'], every: 14, ttl: 60, maxOpen: 4 },
  },
  {
    id: 'burger-bay',
    n: 2, section: 'diner', theme: 'diner',
    name: 'Burger Bay',
    blurb: 'Chop the meat, fire the pan — build it right on the bun!',
    emoji: '🍔',
    duration: 160,
    stars: [330, 600, 900],
    plates: 4,
    crates: { 1: 'bun', 2: 'patty', 3: 'lettuce', 4: 'cheese' },
    layout: [
      '.1B2B3.4.#.',
      'S.........#',
      'P...#.#...P',
      'S...#.#...#',
      '#.........#',
      '.KT.W#W.PP.',
    ],
    orders: { recipes: ['burger', 'burger', 'cheeseburger'], every: 18, ttl: 84, maxOpen: 4 },
  },
  {
    id: 'soups-on',
    n: 3, section: 'diner', theme: 'diner',
    name: "Soup's On",
    blurb: 'Three chopped veggies in the pot. Stir crazy.',
    emoji: '🥣',
    duration: 170,
    stars: [380, 660, 980],
    plates: 4,
    crates: { 1: 'onion', 2: 'tomato' },
    layout: [
      '.1B2B..#.#.',
      '#.........#',
      'O...#.#...O',
      'P...#.#...P',
      '#.........#',
      '.KT.W#W.PP.',
    ],
    orders: { recipes: ['soup_onion', 'soup_tomato'], every: 19, ttl: 86, maxOpen: 4 },
  },
  {
    id: 'sushi-squad',
    n: 4, section: 'diner', theme: 'diner',
    name: 'Sushi Squad',
    blurb: 'Rice in the pot, fish on the board. Teamwork time.',
    emoji: '🍣',
    duration: 170,
    stars: [400, 720, 1040],
    plates: 4,
    crates: { 1: 'rice', 2: 'fish', 3: 'seaweed' },
    layout: [
      '.1B2B3.#.#.',
      'O.........#',
      'O...#.#...P',
      'P...#.#...#',
      '#.........#',
      '.KT.W#W.PP.',
    ],
    orders: { recipes: ['sushi'], every: 17, ttl: 82, maxOpen: 4 },
  },
  {
    id: 'pizza-panic',
    n: 5, section: 'diner', theme: 'diner',
    name: 'Pizza Panic',
    blurb: 'Dough, sauce, cheese, oven. Hot and fast.',
    emoji: '🍕',
    duration: 180,
    stars: [430, 780, 1130],
    plates: 4,
    crates: { 1: 'dough', 2: 'tomato', 3: 'cheese' },
    layout: [
      '.1B2B3.#.#.',
      'V.........#',
      'V...#.#...P',
      'P...#.#...#',
      '#.........#',
      '.KT.W#W.PP.',
    ],
    orders: { recipes: ['pizza'], every: 18, ttl: 90, maxOpen: 4 },
  },
  {
    id: 'grand-feast',
    n: 6, section: 'diner', theme: 'diner',
    name: 'The Grand Feast',
    blurb: 'Everything, everywhere, all at once. The full menu.',
    emoji: '👑',
    duration: 210,
    stars: [520, 950, 1400],
    plates: 6,
    crates: { 1: 'lettuce', 2: 'tomato', 3: 'bun', 4: 'patty', 5: 'cheese', 6: 'onion' },
    layout: [
      '.1B2B3#456.',
      'S.........#',
      'O...#.#...P',
      '#...#.#...#',
      'P...#.#...P',
      'O...#.#...#',
      '#.........#',
      '.KT.PW#W.P.',
    ],
    orders: { recipes: ['salad', 'burger', 'cheeseburger', 'soup_onion', 'soup_tomato'], every: 15, ttl: 82, maxOpen: 4 },
  },

  // ============ WINTER WONDERLAND ============
  {
    id: 'cocoa-cabin',
    n: 7, section: 'winter', theme: 'winter',
    name: 'Cocoa Cabin',
    blurb: 'Warm mugs for cold hands. Milk in, chocolate chopped.',
    emoji: '☕',
    duration: 150,
    stars: [300, 560, 820],
    plates: 4,
    crates: { 1: 'milk', 2: 'cocoa' },
    layout: [
      '.1B2B..#.#.',
      'O.........#',
      'O...#.#...P',
      'P...#.#...#',
      '#.........#',
      '.KT.W#W.PP.',
    ],
    orders: { recipes: ['cocoa'], every: 13, ttl: 70, maxOpen: 4 },
  },
  {
    id: 'stew-season',
    n: 8, section: 'winter', theme: 'winter',
    name: 'Stew Season',
    blurb: 'Potato, carrot, onion — the holy trinity of warm.',
    emoji: '🥘',
    duration: 170,
    stars: [380, 700, 1030],
    plates: 4,
    crates: { 1: 'potato', 2: 'carrot', 3: 'onion', 4: 'milk', 5: 'cocoa' },
    layout: [
      '.1B2B3.45..',
      'O.........#',
      'O...#.#...P',
      'P...#.#...#',
      '#.........#',
      '.KT.W#W.PP.',
    ],
    orders: { recipes: ['stew', 'cocoa'], every: 18, ttl: 88, maxOpen: 4 },
  },
  {
    id: 'frost-feast',
    n: 9, section: 'winter', theme: 'winter',
    name: 'Frostbite Feast',
    blurb: 'Stew, cocoa, and onion soup. The lodge is packed.',
    emoji: '⛄',
    duration: 190,
    stars: [450, 830, 1230],
    plates: 5,
    crates: { 1: 'potato', 2: 'carrot', 3: 'onion', 4: 'milk', 5: 'cocoa' },
    layout: [
      '.1B2B3.45..',
      'O.........#',
      'O...#.#...P',
      '#...#.#...#',
      'P...#.#...P',
      'O...#.#...#',
      '#.........#',
      '.KT.PW#W.P.',
    ],
    orders: { recipes: ['stew', 'cocoa', 'soup_onion'], every: 16, ttl: 85, maxOpen: 4 },
  },
  {
    id: 'whiteout-rush',
    n: 10, section: 'winter', theme: 'winter',
    name: 'Whiteout Rush',
    blurb: 'The blizzard brought everyone in. Everything, faster.',
    emoji: '🌨️',
    duration: 210,
    stars: [520, 960, 1420],
    plates: 5,
    crates: { 1: 'potato', 2: 'carrot', 3: 'onion', 4: 'tomato', 5: 'milk', 6: 'cocoa' },
    layout: [
      '.1B2B3#456.',
      'O.........#',
      'O...#.#...P',
      '#...#.#...#',
      'P...#.#...P',
      'O...#.#...#',
      '#.........#',
      '.KT.PW#W.P.',
    ],
    orders: { recipes: ['stew', 'cocoa', 'soup_onion', 'soup_tomato'], every: 14, ttl: 80, maxOpen: 4 },
  },

  // ============ BEACH CLUB ============
  {
    id: 'smoothie-shack',
    n: 11, section: 'beach', theme: 'beach',
    name: 'Smoothie Shack',
    blurb: 'Three fruits, one blender, zero stress. (Some stress.)',
    emoji: '🍹',
    duration: 160,
    stars: [340, 620, 900],
    plates: 4,
    crates: { 1: 'pineapple', 2: 'strawberry', 3: 'banana' },
    layout: [
      '.1B2B3.#.#.',
      'O.........#',
      'O...#.#...P',
      'P...#.#...#',
      '#.........#',
      '.KT.W#W.PP.',
    ],
    orders: { recipes: ['juice'], every: 14, ttl: 75, maxOpen: 4 },
  },
  {
    id: 'taco-tide',
    n: 12, section: 'beach', theme: 'beach',
    name: 'Taco Tide',
    blurb: 'Fish tacos, no plate needed — the tortilla IS the plate.',
    emoji: '🌮',
    duration: 160,
    stars: [360, 660, 980],
    plates: 4,
    crates: { 1: 'tortilla', 2: 'fish', 3: 'lettuce' },
    layout: [
      '.1B2B3.#.#.',
      '#.........#',
      'P...#.#...P',
      '#...#.#...#',
      '#.........#',
      '.KT.W#W.PP.',
    ],
    orders: { recipes: ['fish_taco'], every: 13, ttl: 70, maxOpen: 4 },
  },
  {
    id: 'poke-point',
    n: 13, section: 'beach', theme: 'beach',
    name: 'Poke Point',
    blurb: 'Rice in the pot, fish on the board, cucumber on deck.',
    emoji: '🐟',
    duration: 170,
    stars: [400, 740, 1080],
    plates: 4,
    crates: { 1: 'rice', 2: 'fish', 3: 'cucumber' },
    layout: [
      '.1B2B3.#.#.',
      'O.........#',
      'O...#.#...P',
      'P...#.#...#',
      '#.........#',
      '.KT.W#W.PP.',
    ],
    orders: { recipes: ['poke'], every: 15, ttl: 80, maxOpen: 4 },
  },
  {
    id: 'heatwave',
    n: 14, section: 'beach', theme: 'beach',
    name: 'Heatwave',
    blurb: 'Tacos and poke for days. Hydrate and dominate.',
    emoji: '🌞',
    duration: 200,
    stars: [500, 920, 1350],
    plates: 5,
    crates: { 1: 'rice', 2: 'fish', 3: 'cucumber', 4: 'tortilla', 5: 'lettuce' },
    layout: [
      '.1B2B3.45..',
      'O.........#',
      'O...#.#...P',
      '#...#.#...#',
      'P...#.#...P',
      '#...#.#...#',
      '#.........#',
      '.KT.PW#W.P.',
    ],
    orders: { recipes: ['fish_taco', 'poke', 'poke'], every: 14, ttl: 80, maxOpen: 4 },
  },

  // ============ CAKE WORLD (Beta) ============
  // Phase 2 of the revamp (see docs/cake-world/): the mix -> bake chain on the
  // new Mixing Bowl (M) + oven (V). Icing/garnish come later. Crate digits:
  // 1 flour, 2 sugar, 3 strawberry, 4 matcha, 5 blueberry.
  {
    id: 'cake-sweet-beginnings',
    n: 15, section: 'cake', theme: 'diner',
    name: 'Sweet Beginnings',
    blurb: 'Chop, mix, bake. Three dream cakes — learn the bakery ropes.',
    emoji: '🎂',
    duration: 170,
    stars: [200, 420, 660],
    crates: { 1: 'flour', 2: 'sugar', 3: 'strawberry', 4: 'matcha', 5: 'blueberry' },
    layout: [
      '.1B2B3.4.5.',
      '#.........#',
      'M....#....V',
      'M....#....V',
      'P.........P',
      '.T...W#W.P.',
    ],
    orders: { recipes: ['rose_cake', 'matcha_cake', 'galaxy_cake'], every: 16, ttl: 82, maxOpen: 4 },
  },
];

module.exports = { ING, DISHES, RECIPES, COOK_COMBOS, CHOPPABLE, LEVELS, SECTIONS, UPGRADES };
