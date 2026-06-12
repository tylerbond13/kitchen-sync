// ============================================================================
//  Kitchen Sync — ASSET MANIFEST
//  ---------------------------------------------------------------------------
//  Single source of truth mapping every game object to its image file.
//
//  Entry forms:
//    key: 'path.png'                                — whole file is the sprite
//    key: { path, width, height }                   — whole file + source dims
//    key: { path, crop:[x,y,w,h] }                  — sprite is a region of a
//                                                     larger sheet (master
//                                                     asset sheet crops)
//    key: { path, nokey:true }                      — never background-key
//                                                     (full-bleed art)
//
//  The loader (gfx.js) automatically removes the flat studio background from
//  HD renders and trims each sprite to its content box, so draw calls always
//  use the sprite's true pixel dimensions and proportions.
//
//  Placeholder .png paths fall back to bundled .svg files of the same name —
//  drop a real .png at any path to override with zero code changes.
// ============================================================================
(function () {
  const HD    = 'assets/images/hd/';
  const SHEET = HD + 'ks-vibe-summary.png';      // 2816×1536 master asset sheet

  window.ASSETS = {
    // ── Characters ──────────────────────────────────────────────────────────
    chef:           { path: HD + 'ks-chef-idle-front.png' },
    chef_back:      { path: HD + 'ks-chef-idle-back.png' },   // for walk anim later

    // ── Customers ───────────────────────────────────────────────────────────
    grandma_rose:   { path: HD + 'ks-char-grandma-rose.png', width: 1408, height: 768 },
    workhorse:      { path: HD + 'ks-char-businessman.png',  width: 1408, height: 768 },
    influencer:     { path: HD + 'ks-char-influencer.png' },
    socialite:      { path: HD + 'ks-char-socialite.png' },
    kid:            { path: HD + 'ks-char-kid.png' },

    // ── Stations / appliances ───────────────────────────────────────────────
    counter:        { path: HD + 'ks-countertop.png',             width: 1408, height: 768 },
    chopping_board: { path: HD + 'ks-chopping-block.png',         width: 1408, height: 768 },
    oven:           { path: HD + 'ks-industrial-baking-oven.png', width: 1408, height: 768 },
    stove:          { path: HD + 'ks-stove-pan.png' },
    stove_fire:     { path: HD + 'ks-stove-pan-fire.png' },   // cooking/burning state
    pot:            { path: HD + 'ks-stockpot.png' },
    plate_stack:    { path: HD + 'ks-plate-stack.png' },
    serve_window:   { path: HD + 'ks-serve-window.png' },
    trash:          { path: HD + 'ks-trash-can.png' },
    sink:           { path: HD + 'ks-sink.png' },
    sink_dirty:     { path: HD + 'ks-sink-dirty.png' },       // plates piled up state

    // Ingredient crates with dedicated art render as themselves (a market
    // basket); other crates render as counter + ingredient icon.
    crate_lettuce:  { path: HD + 'ks-lettuce-crate.png', width: 1408, height: 768 },
    crate_tomato:   { path: HD + 'ks-tomato-crate.png',  width: 1408, height: 768 },

    // ── Ingredients ─────────────────────────────────────────────────────────
    lettuce:          { path: HD + 'ks-lettuce.png',         width: 1408, height: 768 },
    lettuce_chopped:  { path: HD + 'ks-lettuce-chopped.png', width: 1408, height: 768 },
    tomato:           { path: HD + 'ks-tomato.png',          width: 1408, height: 768 },
    tomato_chopped:   { path: HD + 'ks-tomato-chopped.png',  width: 1408, height: 768 },
    cucumber:         { path: HD + 'ks-cucumber.png' },
    cucumber_chopped: 'assets/images/ingredients/cucumber_chopped.png',
    onion:            { path: HD + 'ks-onion.png' },
    onion_chopped:    'assets/images/ingredients/onion_chopped.png',
    cheese:           { path: HD + 'ks-cheese.png' },
    cheese_chopped:   'assets/images/ingredients/cheese_chopped.png',
    potato:           { path: HD + 'ks-potato.png' },
    carrot:           { path: HD + 'ks-carrot.png' },
    bun:              'assets/images/ingredients/bun.png',
    patty:            { path: HD + 'ks-patty.png' },
    patty_cooked:     'assets/images/ingredients/patty_cooked.png',
    rice:             'assets/images/ingredients/rice.png',
    fish:             { path: HD + 'ks-fish.png' },
    fish_chopped:     'assets/images/ingredients/fish_sashimi.png',
    seaweed:          'assets/images/ingredients/seaweed.png',
    dough:            'assets/images/ingredients/dough.png',
    milk:             'assets/images/ingredients/milk.png',
    cocoa:            { path: HD + 'ks-cocoa.png' },
    pineapple:        { path: HD + 'ks-pineapple.png' },
    strawberry:       { path: HD + 'ks-strawberry.png' },
    banana:           { path: HD + 'ks-banana.png' },
    tortilla:         'assets/images/ingredients/tortilla.png',
    plate:            'assets/images/ingredients/plate.png',

    // ── Plated dishes ───────────────────────────────────────────────────────
    dish_salad:        { path: HD + 'ks-dish-salad.png' },
    dish_big_salad:    { path: HD + 'ks-dish-big-salad.png' },
    dish_burger:       { path: HD + 'ks-dish-burger.png' },
    dish_cheeseburger: { path: HD + 'ks-dish-cheeseburger.png' },
    dish_soup_onion:   { path: HD + 'ks-dish-soup-onion.png' },
    dish_soup_tomato:  { path: HD + 'ks-dish-soup-tomato.png' },
    dish_sushi:        { path: HD + 'ks-dish-sushi.png' },
    dish_pizza:        { path: HD + 'ks-dish-pizza.png' },
    dish_stew:         { path: HD + 'ks-dish-stew.png' },
    dish_cocoa:        { path: HD + 'ks-dish-cocoa.png' },
    dish_juice:        { path: HD + 'ks-dish-juice.png' },
    dish_poke:         { path: HD + 'ks-dish-poke.png' },
    dish_fish_taco:    { path: HD + 'ks-dish-fish-taco.png' },
    dish_burned:       { path: HD + 'ks-dish-burned.png' },

    // ── Environment ─────────────────────────────────────────────────────────
    // Checkered floor patch covers the whole island floor in one draw.
    floor_patch:    { path: HD + 'ks-tile-checkered.png', width: 1408, height: 768 },
    floor:          'assets/images/env/floor.png',
    floor_alt:      'assets/images/env/floor_alt.png',
    wall:           { path: 'assets/images/env/wall.png', nokey: true },

    // ── Back-wall decor (the "Background Layer") ────────────────────────────
    wall_window:    { path: HD + 'ks-window.png', width: 1408, height: 768 },
    wall_photos:    { path: SHEET, crop: [35,  590, 515, 410], width: 515, height: 410 },
    wall_clock:     { path: SHEET, crop: [628, 685, 232, 245], width: 232, height: 245 },
    wall_sign:      { path: SHEET, crop: [1215, 548, 300, 465], width: 300, height: 465 },

    // ── Decorative clutter ("life") ─────────────────────────────────────────
    decor_vase:     { path: HD + 'ks-flower-vase.png', width: 1408, height: 768 },

    // ── UI props on the canvas ──────────────────────────────────────────────
    speech_bubble:  'assets/images/ui/speech_bubble.png',
    heart:          'assets/images/ui/heart.png',
    heart_empty:    'assets/images/ui/heart_empty.png',
  };
})();
