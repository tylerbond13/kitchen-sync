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
  eggs:       { name: 'Eggs',       emoji: '🥚' },
  chocolate:  { name: 'Chocolate',  emoji: '🍫' },
  honeycomb:  { name: 'Honeycomb',  emoji: '🍯' },
};

const DISHES = {
  soup_onion:  { name: 'Onion Soup',  emoji: '🥣' },
  soup_tomato: { name: 'Tomato Soup', emoji: '🍲' },
  pizza:       { name: 'Pizza',       emoji: '🍕' },
  stew:        { name: 'Hearty Stew', emoji: '🥘' },
  cocoa:       { name: 'Hot Cocoa',   emoji: '☕' },
  juice:       { name: 'Smoothie',    emoji: '🍹' },
  // ── Cake World: a baked cake is a "dish" (like pizza), produced by the oven.
  chocolate_cake: { name: 'Chocolate Cake', emoji: '🎂' },
  carrot_cake:    { name: 'Carrot Cake',    emoji: '🍰' },
  honeycomb_cake: { name: 'Honeycomb Cake', emoji: '🍯' },
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
  // Full decorate loop: bake -> ICE (pink) -> GARNISH (sprinkles) -> serve.
  chocolate_cake: { name: 'Chocolate Cake', emoji: '🍫', needs: ['chocolate_cake.dish#pink+sprinkles'], points: 120 },
  carrot_cake:    { name: 'Carrot Cake',    emoji: '🥕', needs: ['carrot_cake.dish#pink+sprinkles'],    points: 110 },
  honeycomb_cake: { name: 'Honeycomb Cake', emoji: '🍯', needs: ['honeycomb_cake.dish#pink+sprinkles'], points: 120 },
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
  { tool: 'mixer', inputs: ['flour.raw', 'eggs.raw', 'chocolate.chopped'], out: { kind: 'item', id: 'chocolate_batter', state: 'raw' }, time: 3, burnAfter: 999 },
  { tool: 'mixer', inputs: ['flour.raw', 'eggs.raw', 'carrot.chopped'],    out: { kind: 'item', id: 'carrot_batter',    state: 'raw' }, time: 3, burnAfter: 999 },
  { tool: 'mixer', inputs: ['flour.raw', 'eggs.raw', 'honeycomb.chopped'], out: { kind: 'item', id: 'honeycomb_batter', state: 'raw' }, time: 3, burnAfter: 999 },
  { tool: 'oven',  inputs: ['chocolate_batter.raw'], out: { kind: 'dish', id: 'chocolate_cake' }, time: 8, burnAfter: 11 },
  { tool: 'oven',  inputs: ['carrot_batter.raw'],    out: { kind: 'dish', id: 'carrot_cake' },    time: 8, burnAfter: 11 },
  { tool: 'oven',  inputs: ['honeycomb_batter.raw'], out: { kind: 'dish', id: 'honeycomb_cake' }, time: 8, burnAfter: 11 },
];

const CHOPPABLE = new Set([
  'lettuce', 'tomato', 'cucumber', 'cheese', 'onion', 'fish', 'patty',
  'potato', 'carrot', 'cocoa', 'pineapple', 'strawberry', 'banana',
  'blueberry', 'chocolate', 'honeycomb',
]);

// Kitchen Shop upgrades — persist per crew, bought with banked score coins.
// `group` buckets them in the shop UI; `needs` is a prerequisite upgrade id.
// The AI Sous-Chef is earned, not given: hire it, then teach it each skill.
const UPGRADES = {
  // ── AI Sous-Chef progression ──
  sous_chef:  { name: 'Hire a Sous-Chef',  emoji: '🤖', desc: 'An AI teammate you can toggle into any round', cost: 600,  group: 'sous' },
  sous_chop:  { name: 'Teach: Chopping',   emoji: '🔪', desc: 'It preps ingredients on the cutting boards',   cost: 700,  group: 'sous', needs: 'sous_chef' },
  sous_wash:  { name: 'Teach: Dishwashing', emoji: '🫧', desc: 'It keeps the plate stack clean at the sink',   cost: 700,  group: 'sous', needs: 'sous_chef' },
  sous_cook:  { name: 'Teach: Cooking',    emoji: '🍲', desc: 'It loads pots & ovens and saves food from burning', cost: 1200, group: 'sous', needs: 'sous_chop' },
  sous_plate: { name: 'Teach: Plating',    emoji: '🍽️', desc: 'It assembles orders onto plates',              cost: 1400, group: 'sous', needs: 'sous_chef' },
  sous_serve: { name: 'Teach: Delivery',   emoji: '🛎️', desc: 'It serves finished orders at the window',       cost: 1800, group: 'sous', needs: 'sous_plate' },
  // ── Kitchen tools ──
  fast_shoes:   { name: 'Speedy Sneakers', emoji: '👟', desc: 'All chefs move 12% faster', cost: 1000, group: 'kitchen' },
  turbo_stove:  { name: 'Turbo Burners',   emoji: '🔥', desc: 'Everything cooks 15% faster', cost: 1600, group: 'kitchen' },
  nonstick:     { name: 'Non-Stick Pans',  emoji: '🍳', desc: '+3 seconds before food burns', cost: 1200, group: 'kitchen' },
  extra_plate:  { name: 'Bonus Plate',     emoji: '🍽️', desc: '+1 clean plate in the stack', cost: 1400, group: 'kitchen' },
  auto_chopper: { name: 'Auto-Chopper',    emoji: '⚙️', desc: 'Cutting boards chop twice as fast', cost: 900, group: 'kitchen' },
  dish_bot:     { name: 'Dish-Bot 3000',   emoji: '🧽', desc: 'The sink slowly washes dishes on its own', cost: 1800, group: 'kitchen' },
};

const SECTIONS = [
  { id: 'diner',  name: 'The Family Diner',  emoji: '🍳', blurb: 'Where it all begins.' },
  { id: 'winter', name: 'Winter Wonderland', emoji: '❄️', blurb: 'Cozy food for cold days.' },
  { id: 'beach',  name: 'Beach Club',        emoji: '🏖️', blurb: 'Sun, sand, and smoothies.' },
  { id: 'cake',   name: 'Cake World',        emoji: '🎂', blurb: 'Bake the dream cakes. (Beta)' },
  { id: 'bonus',  name: 'Bonus Kitchen',     emoji: '🏆', blurb: 'Crew-built boards, gone official.' },
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
    stars: [820, 1430, 2040],
    crates: { 1: 'lettuce', 2: 'tomato', 3: 'cucumber' },
    layout: [
      '.1B2B3.#.#.',
      '#.........#',
      'P...#.#...P',
      '#...#.#...#',
      '#.........#',
      '.T..W#W..P.',
    ],
    orders: { recipes: ['salad', 'salad', 'big_salad'], every: 6, ttl: 60, maxOpen: 5 },
  },
  {
    id: 'burger-bay',
    n: 2, section: 'diner', theme: 'diner',
    name: 'Burger Bay',
    blurb: 'Chop the meat, fire the pan — build it right on the bun!',
    emoji: '🍔',
    duration: 160,
    stars: [750, 1320, 1880],
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
    orders: { recipes: ['burger', 'burger', 'cheeseburger'], every: 9, ttl: 60, maxOpen: 5 },
  },
  {
    id: 'soups-on',
    n: 3, section: 'diner', theme: 'diner',
    name: "Soup's On",
    blurb: 'Three chopped veggies in the pot. Stir crazy.',
    emoji: '🥣',
    duration: 170,
    stars: [1200, 2090, 2990],
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
    orders: { recipes: ['soup_onion', 'soup_tomato'], every: 11, ttl: 60, maxOpen: 5 },
  },
  {
    id: 'sushi-squad',
    n: 4, section: 'diner', theme: 'diner',
    name: 'Sushi Squad',
    blurb: 'Rice in the pot, fish on the board. Teamwork time.',
    emoji: '🍣',
    duration: 170,
    stars: [1440, 2520, 3600],
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
    orders: { recipes: ['sushi'], every: 7, ttl: 60, maxOpen: 5 },
  },
  {
    id: 'pizza-panic',
    n: 5, section: 'diner', theme: 'diner',
    name: 'Pizza Panic',
    blurb: 'Dough, sauce, cheese, oven. Hot and fast.',
    emoji: '🍕',
    duration: 180,
    stars: [1640, 2880, 4110],
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
    orders: { recipes: ['pizza'], every: 9, ttl: 60, maxOpen: 5 },
  },
  {
    id: 'grand-feast',
    n: 6, section: 'diner', theme: 'diner',
    name: 'The Grand Feast',
    blurb: 'Everything, everywhere, all at once. The full menu.',
    emoji: '👑',
    duration: 210,
    stars: [960, 1670, 2390],
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
    orders: { recipes: ['salad', 'burger', 'cheeseburger', 'soup_onion', 'soup_tomato'], every: 10, ttl: 60, maxOpen: 5 },
  },

  // ============ WINTER WONDERLAND ============
  {
    id: 'cocoa-cabin',
    n: 7, section: 'winter', theme: 'winter',
    name: 'Cocoa Cabin',
    blurb: 'Warm mugs for cold hands. Milk in, chocolate chopped.',
    emoji: '☕',
    duration: 150,
    stars: [1450, 2540, 3630],
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
    orders: { recipes: ['cocoa'], every: 6, ttl: 60, maxOpen: 5 },
  },
  {
    id: 'stew-season',
    n: 8, section: 'winter', theme: 'winter',
    name: 'Stew Season',
    blurb: 'Potato, carrot, onion — the holy trinity of warm.',
    emoji: '🥘',
    duration: 170,
    stars: [640, 1120, 1600],
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
    orders: { recipes: ['stew', 'cocoa'], every: 11, ttl: 60, maxOpen: 5 },
  },
  {
    id: 'frost-feast',
    n: 9, section: 'winter', theme: 'winter',
    name: 'Frostbite Feast',
    blurb: 'Stew, cocoa, and onion soup. The lodge is packed.',
    emoji: '⛄',
    duration: 190,
    stars: [870, 1530, 2180],
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
    orders: { recipes: ['stew', 'cocoa', 'soup_onion'], every: 11, ttl: 60, maxOpen: 5 },
  },
  {
    id: 'whiteout-rush',
    n: 10, section: 'winter', theme: 'winter',
    name: 'Whiteout Rush',
    blurb: 'The blizzard brought everyone in. Everything, faster.',
    emoji: '🌨️',
    duration: 210,
    stars: [650, 1200, 1780],
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
    orders: { recipes: ['stew', 'cocoa', 'soup_onion', 'soup_tomato'], every: 11, ttl: 60, maxOpen: 5 },
  },

  // ============ BEACH CLUB ============
  {
    id: 'smoothie-shack',
    n: 11, section: 'beach', theme: 'beach',
    name: 'Smoothie Shack',
    blurb: 'Three fruits, one blender, zero stress. (Some stress.)',
    emoji: '🍹',
    duration: 160,
    stars: [480, 870, 1260],
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
    orders: { recipes: ['juice'], every: 7, ttl: 60, maxOpen: 5 },
  },
  {
    id: 'taco-tide',
    n: 12, section: 'beach', theme: 'beach',
    name: 'Taco Tide',
    blurb: 'Fish tacos, no plate needed — the tortilla IS the plate.',
    emoji: '🌮',
    duration: 160,
    stars: [480, 880, 1310],
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
    orders: { recipes: ['fish_taco'], every: 7, ttl: 60, maxOpen: 5 },
  },
  {
    id: 'poke-point',
    n: 13, section: 'beach', theme: 'beach',
    name: 'Poke Point',
    blurb: 'Rice in the pot, fish on the board, cucumber on deck.',
    emoji: '🐟',
    duration: 170,
    stars: [580, 1080, 1580],
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
    orders: { recipes: ['poke'], every: 7, ttl: 60, maxOpen: 5 },
  },
  {
    id: 'heatwave',
    n: 14, section: 'beach', theme: 'beach',
    name: 'Heatwave',
    blurb: 'Tacos and poke for days. Hydrate and dominate.',
    emoji: '🌞',
    duration: 200,
    stars: [700, 1290, 1890],
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
    orders: { recipes: ['fish_taco', 'poke', 'poke'], every: 7, ttl: 60, maxOpen: 5 },
  },

  // ============ CAKE WORLD (Beta) ============
  // Phase 2 of the revamp (see docs/cake-world/): the mix -> bake chain on the
  // new Mixing Bowl (M) + oven (V). Icing/garnish come later. Crate digits:
  // 1 flour, 2 sugar, 3 strawberry, 4 matcha, 5 blueberry.
  {
    id: 'cake-sweet-beginnings',
    n: 15, section: 'cake', theme: 'diner', beta: true, decor: 'cake',
    name: 'Sweet Beginnings',
    blurb: 'Chop, mix, bake, ice & garnish. Three dream cakes — the full bakery.',
    emoji: '🎂',
    duration: 190,
    stars: [280, 590, 930],
    icing: 'pink',     // the I station's fixed colour (a remote colour button is later)
    topper: 'sprinkles', // the G station's stocked topper
    crates: { 1: 'flour', 2: 'eggs', 3: 'chocolate', 4: 'carrot', 5: 'honeycomb' },
    // M mixer · V oven · I icing dispenser · G garnish counter · P plates ·
    // W serve · T trash. Flow: chop → mix → bake → plate → ice → garnish → serve.
    layout: [
      '.1B2B3.4.5.',
      '#.........#',
      'M....I....V',
      'M....G....V',
      'P.........P',
      '.T...W#W.P.',
    ],
    orders: { recipes: ['chocolate_cake', 'carrot_cake', 'honeycomb_cake'], every: 6, ttl: 60, maxOpen: 5 },
  },

  // ============ BONUS KITCHEN ============
  // A crew build promoted to a permanent level (saved in the editor as
  // "salad-1"). It's a free-form board, so `bonus: true` marks it always-open
  // and exempt from the campaign board template (see test/game.test.js). It
  // already ships at the fast tuning it was built and scored on (best 2550 solo),
  // so its star goals need no order-rate bump — 3★ sits just under that score.
  {
    id: 'tylers-salad-bar',
    n: 16, section: 'bonus', theme: 'diner', bonus: true,
    name: "Tyler's Salad Bar",
    blurb: 'A crew original — three-veg salads at full tilt.',
    emoji: '🥗',
    duration: 150,
    stars: [1430, 2500, 3570],
    plates: 4,
    speedMult: 1.25,
    charScale: 1.5,
    wallpaper: 'brady',
    crates: { 1: 'lettuce', 2: 'tomato', 3: 'cucumber' },
    facings: { '0,1': 'right', '6,1': 'left', '0,2': 'right', '6,2': 'left', '0,3': 'right', '6,3': 'left', '0,4': 'right', '6,4': 'left' },
    layout: [
      '.123##.',
      'B.....#',
      'B.###.#',
      'B.###.#',
      '#.....#',
      '.P#T#W.',
    ],
    orders: { recipes: ['salad', 'big_salad'], every: 6, ttl: 60, maxOpen: 5 },
  },
];

module.exports = { ING, DISHES, RECIPES, COOK_COMBOS, CHOPPABLE, LEVELS, SECTIONS, UPGRADES };
