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
    // Chef girl (with cake) is cropped from the master sheet.
    chef:           { path: SHEET, crop: [55, 10, 320, 490], width: 320, height: 490 },

    // ── Customers ───────────────────────────────────────────────────────────
    grandma_rose:   { path: HD + 'ks-char-grandma-rose.png', width: 1408, height: 768 },
    workhorse:      { path: HD + 'ks-char-businessman.png',  width: 1408, height: 768 },
    influencer:     'assets/images/customers/influencer.png',
    socialite:      'assets/images/customers/socialite.png',
    kid:            'assets/images/customers/kid.png',

    // ── Stations / appliances ───────────────────────────────────────────────
    counter:        { path: HD + 'ks-countertop.png',             width: 1408, height: 768 },
    chopping_board: { path: HD + 'ks-chopping-block.png',         width: 1408, height: 768 },
    oven:           { path: HD + 'ks-industrial-baking-oven.png', width: 1408, height: 768 },
    stove:          'assets/images/stations/stove.png',
    pot:            'assets/images/stations/pot.png',
    plate_stack:    'assets/images/stations/plate_stack.png',
    serve_window:   'assets/images/stations/serve_window.png',
    trash:          'assets/images/stations/trash.png',
    sink:           'assets/images/stations/sink.png',

    // Ingredient crates with dedicated art render as themselves (a market
    // basket); other crates render as counter + ingredient icon.
    crate_lettuce:  { path: HD + 'ks-lettuce-crate.png', width: 1408, height: 768 },
    crate_tomato:   { path: HD + 'ks-tomato-crate.png',  width: 1408, height: 768 },

    // ── Ingredients ─────────────────────────────────────────────────────────
    lettuce:          { path: HD + 'ks-lettuce.png',         width: 1408, height: 768 },
    lettuce_chopped:  { path: HD + 'ks-lettuce-chopped.png', width: 1408, height: 768 },
    tomato:           { path: HD + 'ks-tomato.png',          width: 1408, height: 768 },
    tomato_chopped:   { path: HD + 'ks-tomato-chopped.png',  width: 1408, height: 768 },
    cucumber:         'assets/images/ingredients/cucumber.png',
    cucumber_chopped: 'assets/images/ingredients/cucumber_chopped.png',
    onion:            'assets/images/ingredients/onion.png',
    onion_chopped:    'assets/images/ingredients/onion_chopped.png',
    cheese:           'assets/images/ingredients/cheese.png',
    cheese_chopped:   'assets/images/ingredients/cheese_chopped.png',
    potato:           'assets/images/ingredients/potato.png',
    carrot:           'assets/images/ingredients/carrot.png',
    bun:              'assets/images/ingredients/bun.png',
    patty:            'assets/images/ingredients/patty.png',
    patty_cooked:     'assets/images/ingredients/patty_cooked.png',
    rice:             'assets/images/ingredients/rice.png',
    fish:             'assets/images/ingredients/fish.png',
    fish_chopped:     'assets/images/ingredients/fish_sashimi.png',
    seaweed:          'assets/images/ingredients/seaweed.png',
    dough:            'assets/images/ingredients/dough.png',
    milk:             'assets/images/ingredients/milk.png',
    cocoa:            'assets/images/ingredients/cocoa.png',
    pineapple:        'assets/images/ingredients/pineapple.png',
    strawberry:       'assets/images/ingredients/strawberry.png',
    banana:           'assets/images/ingredients/banana.png',
    tortilla:         'assets/images/ingredients/tortilla.png',
    plate:            'assets/images/ingredients/plate.png',

    // ── Plated dishes ───────────────────────────────────────────────────────
    dish_salad:        'assets/images/dishes/salad.png',
    dish_big_salad:    'assets/images/dishes/big_salad.png',
    dish_burger:       'assets/images/dishes/burger.png',
    dish_cheeseburger: 'assets/images/dishes/cheeseburger.png',
    dish_soup_onion:   'assets/images/dishes/soup_onion.png',
    dish_soup_tomato:  'assets/images/dishes/soup_tomato.png',
    dish_sushi:        'assets/images/dishes/sushi.png',
    dish_pizza:        'assets/images/dishes/pizza.png',
    dish_stew:         'assets/images/dishes/stew.png',
    dish_cocoa:        'assets/images/dishes/cocoa.png',
    dish_juice:        'assets/images/dishes/juice.png',
    dish_poke:         'assets/images/dishes/poke.png',
    dish_fish_taco:    'assets/images/dishes/fish_taco.png',
    dish_burned:       'assets/images/dishes/burned.png',

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
