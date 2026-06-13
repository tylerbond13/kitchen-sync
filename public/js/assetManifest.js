// ============================================================================
//  Kitchen Sync — ASSET MANIFEST (single source of truth)
//  ---------------------------------------------------------------------------
//  Entry forms:
//    key: 'path'                         — file is the sprite
//    key: { path, scale }                — scale multiplies engine draw width
//    key: { path, crop:[x,y,w,h] }       — sprite is a region of a sheet
//    key: { path, wallAnchor: {          — wall-mounted decor, positioned
//             wall: 'back'|'left',         relative to the WALL SURFACE:
//             pos: <tiles along wall>,     pos in tile units from the corner,
//             height: <px floor→bottom>,   height up from the floor line,
//             width: <draw width px> } }   draw width in world px
//
//  The loader (gfx.js) keys out flat studio backgrounds and trims every
//  sprite to content, so drawn proportions always match the art.
// ============================================================================
(function () {
  const HD = 'assets/images/hd/';
  const FLAT = 'assets/images/flat/';

  window.KS_CHEFS = [
    { key: 'chef', name: 'Chef' },
    { key: 'grandma_rose', name: 'Grandma Rose' },
    { key: 'workhorse', name: 'Business Chef' },
    { key: 'influencer', name: 'Influencer' },
    { key: 'socialite', name: 'Socialite' },
    { key: 'kid', name: 'Kid' },
    { key: 'barney', name: 'Barney' },
    { key: 'betty_white', name: 'Betty White' },
    { key: 'camp_counselor', name: 'Counselor' },
    { key: 'dolly', name: 'Dolly' },
    { key: 'judy', name: 'Judy' },
    { key: 'sinatra', name: 'Sinatra' },
    { key: 'wadsworth', name: 'Wadsworth' },
    { key: 'obama', name: 'Obama' },
    { key: 'britney', name: 'Britney Spears' },
    { key: 'blanche_devereaux', name: 'Blanche' },
    { key: 'dorothy_zbornak', name: 'Dorothy' },
    { key: 'julie_andrews', name: 'Julie Andrews' },
    { key: 'rory_gilmore', name: 'Rory Gilmore' },
    { key: 'lorelai_gilmore', name: 'Lorelai Gilmore' },
    { key: 'angela_lansbury', name: 'Angela Lansbury' },
    { key: 'elaine_benes', name: 'Elaine Benes' },
    { key: 'cosmo_kramer', name: 'Kramer' },
    { key: 'george_costanza', name: 'George Costanza' },
    { key: 'carrie_bradshaw', name: 'Carrie Bradshaw' },
    { key: 'marilyn_monroe', name: 'Marilyn Monroe' },
    { key: 'donald_trump', name: 'Donald Trump' },
    { key: 'lucy_ricardo', name: 'Lucy Ricardo' },
    { key: 'ricky_ricardo', name: 'Ricky Ricardo' },
    { key: 'oprah_winfrey', name: 'Oprah Winfrey' },
    { key: 'dr_phil', name: 'Dr. Phil' },
    { key: 'princess_diana', name: 'Princess Diana' },
    { key: 'george_washington', name: 'George Washington' },
    { key: 'john_lennon', name: 'John Lennon' },
    { key: 'elvis_presley', name: 'Elvis Presley' },
    { key: 'queen_elizabeth_ii', name: 'Queen Elizabeth II' },
    { key: 'joe_biden', name: 'Joe Biden' },
    { key: 'kamala_harris', name: 'Kamala Harris' },
    { key: 'stephen_hawking', name: 'Stephen Hawking' },
    { key: 'greta_thunberg', name: 'Greta Thunberg' },
    { key: 'bart_simpson', name: 'Bart Simpson' },
    { key: 'marge_simpson', name: 'Marge Simpson' },
    { key: 'sonic_hedgehog', name: 'Sonic' },
    { key: 'cher', name: 'Cher' },
    { key: 'harry_potter', name: 'Harry Potter' },
    { key: 'taylor_swift', name: 'Taylor Swift' },
    { key: 'kanye_west', name: 'Kanye West' },
    { key: 'joker_dark_knight', name: 'The Joker' },
    { key: 'babe_pig', name: 'Babe' },
    { key: 'celine_dion', name: 'Celine Dion' },
    { key: 'snooki', name: 'Snooki' },
    { key: 'tom_cruise', name: 'Tom Cruise' },
    { key: 'michael_jordan', name: 'Michael Jordan' },
    { key: 'jerry_seinfeld', name: 'Jerry Seinfeld' },
    { key: 'shaquille_oneal', name: "Shaquille O'Neal" },
    { key: 'elton_john', name: 'Elton John' },
    { key: 'brad_pitt', name: 'Brad Pitt' },
    { key: 'darth_vader', name: 'Darth Vader' },
    { key: 'justin_bieber', name: 'Justin Bieber' },
    { key: 'kim_kardashian', name: 'Kim Kardashian' },
    { key: 'kris_jenner', name: 'Kris Jenner' },
    { key: 'katy_perry', name: 'Katy Perry' },
    { key: 'lady_gaga', name: 'Lady Gaga' },
    { key: 'robyn', name: 'Robyn' },
    { key: 'shania_twain', name: 'Shania Twain' },
    { key: 'drake', name: 'Drake' },
    { key: 'joe_walsh', name: 'Joe Walsh' },
    { key: 'don_henley', name: 'Don Henley' },
    { key: 'glenn_frey', name: 'Glenn Frey' },
    { key: 'yoda', name: 'Yoda' },
  ];

  window.ASSETS = {
    // ── Player chefs ─────────────────────────────────────────────────────────
    chef:           { path: HD + 'ks-chef-idle-front.png' },
    chef_back:      { path: HD + 'ks-chef-idle-back.png' },     // for walk anim

    // ── Customers (queue rotates through all of them) ───────────────────────
    grandma_rose:   { path: HD + 'ks-char-grandma-rose.png' },
    workhorse:      { path: HD + 'ks-char-businessman.png' },
    influencer:     { path: HD + 'ks-char-influencer.png' },
    socialite:      { path: HD + 'ks-char-socialite.png' },
    kid:            { path: HD + 'ks-char-kid.png' },
    barney:         { path: HD + 'ks-char-barney.png' },
    betty_white:    { path: HD + 'ks-char-betty-white.png' },
    camp_counselor: { path: HD + 'ks-char-camp-counselor.png' },
    dolly:          { path: HD + 'ks-char-dolly.png' },
    judy:           { path: HD + 'ks-char-judy.png' },
    sinatra:        { path: HD + 'ks-char-sinatra.png' },
    wadsworth:      { path: HD + 'ks-char-wadsworth.png' },
    // pose sheets ship at 50% (shrink-assets.sh) — crops pick the front
    // idle pose in halved coordinates (sheet cells are 176x384)
    obama:          { path: HD + 'ks-char-sprite-barack-obama.png',   crop: [0, 0, 176, 384] },
    britney: { path: HD + 'ks-char-britney-spears.png' },
    blanche_devereaux: { path: HD + 'ks-char-blanche-devereaux.png' },
    dorothy_zbornak:   { path: HD + 'ks-char-dorothy-zbornak.png' },
    julie_andrews:     { path: HD + 'ks-char-julie-andrews.png' },
    rory_gilmore:      { path: HD + 'ks-char-rory-gilmore.png' },
    lorelai_gilmore:   { path: HD + 'ks-char-lorelai-gilmore.png' },
    angela_lansbury:   { path: HD + 'ks-char-angela-lansbury.png' },
    elaine_benes:      { path: HD + 'ks-char-elaine-benes.png' },
    cosmo_kramer:      { path: HD + 'ks-char-cosmo-kramer.png' },
    george_costanza:   { path: HD + 'ks-char-george-costanza.png' },
    carrie_bradshaw:   { path: HD + 'ks-char-carrie-bradshaw.png' },
    marilyn_monroe:    { path: HD + 'ks-char-marilyn-monroe.png' },
    donald_trump:      { path: HD + 'ks-char-donald-trump.png' },
    lucy_ricardo:      { path: HD + 'ks-char-lucy-ricardo.png' },
    ricky_ricardo:     { path: HD + 'ks-char-ricky-ricardo.png' },
    oprah_winfrey:     { path: HD + 'ks-char-oprah-winfrey.png' },
    dr_phil:           { path: HD + 'ks-char-dr-phil.png' },
    princess_diana:    { path: HD + 'ks-char-princess-diana.png' },
    george_washington: { path: HD + 'ks-char-george-washington.png' },
    john_lennon:       { path: HD + 'ks-char-john-lennon.png' },
    elvis_presley:     { path: HD + 'ks-char-elvis-presley.png' },
    queen_elizabeth_ii:{ path: HD + 'ks-char-queen-elizabeth-ii.png' },
    joe_biden:         { path: HD + 'ks-char-joe-biden.png' },
    kamala_harris:     { path: HD + 'ks-char-kamala-harris.png' },
    stephen_hawking:   { path: HD + 'ks-char-stephen-hawking.png' },
    greta_thunberg:    { path: HD + 'ks-char-greta-thunberg.png' },
    bart_simpson:      { path: HD + 'ks-char-bart-simpson.png' },
    marge_simpson:     { path: HD + 'ks-char-marge-simpson.png' },
    sonic_hedgehog:    { path: HD + 'ks-char-sonic-hedgehog.png' },
    cher: { path: HD + 'ks-char-cher.png' },
    harry_potter: { path: HD + 'ks-char-harry-potter.png' },
    taylor_swift: { path: HD + 'ks-char-taylor-swift.png' },
    kanye_west: { path: HD + 'ks-char-kanye-west.png' },
    joker_dark_knight: { path: HD + 'ks-char-joker-dark-knight.png' },
    babe_pig: { path: HD + 'ks-char-babe-pig.png' },
    celine_dion: { path: HD + 'ks-char-celine-dion.png' },
    snooki: { path: HD + 'ks-char-snooki.png' },
    tom_cruise: { path: HD + 'ks-char-tom-cruise.png' },
    michael_jordan: { path: HD + 'ks-char-michael-jordan.png' },
    jerry_seinfeld: { path: HD + 'ks-char-jerry-seinfeld.png' },
    shaquille_oneal: { path: HD + 'ks-char-shaquille-oneal.png' },
    elton_john: { path: HD + 'ks-char-elton-john.png' },
    brad_pitt: { path: HD + 'ks-char-brad-pitt.png' },
    darth_vader: { path: HD + 'ks-char-darth-vader.png' },
    justin_bieber: { path: HD + 'ks-char-justin-bieber.png' },
    kim_kardashian: { path: HD + 'ks-char-kim-kardashian.png' },
    kris_jenner: { path: HD + 'ks-char-kris-jenner.png' },
    katy_perry: { path: HD + 'ks-char-katy-perry.png' },
    lady_gaga: { path: HD + 'ks-char-lady-gaga.png' },
    robyn: { path: HD + 'ks-char-robyn.png' },
    shania_twain: { path: HD + 'ks-char-shania-twain.png' },
    drake: { path: HD + 'ks-char-drake.png' },
    joe_walsh: { path: HD + 'ks-char-joe-walsh.png' },
    don_henley: { path: HD + 'ks-char-don-henley.png' },
    glenn_frey: { path: HD + 'ks-char-glenn-frey.png' },
    yoda: { path: HD + 'ks-char-yoda.png' },

    // ── Stations (grid chars) + live state variants ─────────────────────────
    // `flat: true` = straight-on art, renderer skips its iso squash.
    // Keys without a front-facing HD render yet use hand-built SVG stand-ins
    // (assets/images/flat/) — swap each back to its .png as regens land.
    counter:        { path: HD + 'ks-countertop.png', flat: true },
    chopping_board: { path: HD + 'ks-chopping-block.png', flat: true },
    oven:           { path: HD + 'ks-industrial-baking-oven.png' },
    stove:          { path: HD + 'ks-stove-pan.png' },
    stove_fire:     { path: HD + 'ks-stove-pan-fire.png' },
    pot:            { path: HD + 'ks-stockpot.png' },
    plate_stack:    { path: HD + 'ks-plate-stack.png', flat: true },
    serve_window:   { path: HD + 'ks-delivery-counter.png', flat: true, scale: 1.05 },
    trash:          { path: HD + 'ks-trash-can.png', flat: true, scale: 0.88 },
    sink:           { path: HD + 'ks-sink.png', flat: true },
    sink_dirty:     { path: HD + 'ks-sink-dirty.png', flat: true },

    // ── Ingredient crates ────────────────────────────────────────────────────
    // Front-facing HD crates where they exist; everything else gets the
    // generic flat crate and the renderer drops the raw ingredient sprite
    // into its open top.
    crate:            { path: FLAT + 'crate.svg', flat: true },
    crate_lettuce:    { path: HD + 'ks-lettuce-crate.png', flat: true },
    crate_tomato:     { path: HD + 'ks-tomato-crate.png', flat: true },
    crate_cucumber:   { path: HD + 'ks-cucumber-crate.png', flat: true },

    // ── Ingredients: raw ─────────────────────────────────────────────────────
    lettuce:    { path: HD + 'ks-lettuce.png' },
    tomato:     { path: HD + 'ks-tomato.png' },
    cucumber:   { path: HD + 'ks-cucumber.png' },
    cheese:     { path: HD + 'ks-cheese.png' },
    onion:      { path: HD + 'ks-onion.png' },
    fish:       { path: HD + 'ks-fish.png' },
    patty:      { path: HD + 'ks-patty.png' },
    potato:     { path: HD + 'ks-potato.png' },
    carrot:     { path: HD + 'ks-carrot.png' },
    cocoa:      { path: HD + 'ks-cocoa.png' },
    pineapple:  { path: HD + 'ks-pineapple.png' },
    strawberry: { path: HD + 'ks-strawberry.png' },
    banana:     { path: HD + 'ks-banana.png' },
    bun:        { path: HD + 'ks-bun.png' },
    rice:       { path: HD + 'ks-rice.png' },
    seaweed:    { path: HD + 'ks-seaweed.png' },
    dough:      { path: HD + 'ks-dough.png' },
    milk:       { path: HD + 'ks-milk.png' },
    tortilla:   { path: HD + 'ks-tortilla.png' },

    // ── Ingredients: chopped / cooked ───────────────────────────────────────
    // deplate: these two renders arrived ON a white plate — key it out so
    // chopped food never reads as already plated.
    lettuce_chopped:    { path: HD + 'ks-lettuce-chopped.png', deplate: true },
    tomato_chopped:     { path: HD + 'ks-tomato-chopped.png', deplate: true },
    cucumber_chopped:   { path: HD + 'ks-cucumber-chopped.png' },
    cheese_chopped:     { path: HD + 'ks-cheese-chopped.png' },
    onion_chopped:      { path: HD + 'ks-onion-chopped.png' },
    fish_chopped:       { path: HD + 'ks-fish-chopped.png' },
    patty_chopped:      { path: HD + 'ks-patty-chopped.png' },
    potato_chopped:     { path: HD + 'ks-potato-chopped.png' },
    carrot_chopped:     { path: HD + 'ks-carrot-chopped.png' },
    cocoa_chopped:      { path: HD + 'ks-cocoa-chopped.png' },
    pineapple_chopped:  { path: HD + 'ks-pineapple-chopped.png' },
    strawberry_chopped: { path: HD + 'ks-strawberry-chopped.png' },
    banana_chopped:     { path: HD + 'ks-banana-chopped.png' },
    patty_cooked:       { path: HD + 'ks-patty-cooked.png' },
    rice_cooked:        { path: HD + 'ks-rice-cooked.png' },

    // ── Plates & dishes ─────────────────────────────────────────────────────
    plate:        { path: HD + 'ks-plate-clean.png' },
    plate_dirty:  { path: HD + 'ks-plate-dirty.png' },
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

    // ── Environment: walls + floors per theme ───────────────────────────────
    wall_diner:   { path: HD + 'ks-wall-diner.png',  nokey: true },
    wall_winter:  { path: HD + 'ks-wall-winter.png', nokey: true },
    wall_beach:   { path: HD + 'ks-wall-beach.png',  nokey: true },
    floor_tile:     'assets/images/env/floor_sq_a.svg',
    floor_tile_alt: 'assets/images/env/floor_sq_b.svg',

    // ── Wall-anchored decor (coords relative to the wall surface) ──────────
    // The diner window render is iso-tilted; flatten remaps it orthogonal
    // (edge fractions of the trimmed sprite's height — see gfx.js).
    wall_window:        { path: HD + 'ks-window.png',
                          flatten: { top: [0.20, 0], bot: [0.84, 1] },
                          wallAnchor: { wall:'back', pos: 2.15, height: 14, width: 92 } },
    // vibe-summary sheet ships at 50% (scripts/shrink-assets.sh) — crops are
    // in the halved coordinate space.
    wall_clock:         { path: HD + 'ks-vibe-summary.png', crop: [314, 342, 116, 123],
                          wallAnchor: { wall:'back', pos: 4.55, height: 68, width: 26 } },
    wall_photos:        { path: HD + 'ks-vibe-summary.png', crop: [17, 295, 258, 205],
                          wallAnchor: { wall:'back', pos: 5.9, height: 42, width: 66 } },
    wall_sign:          { path: HD + 'ks-vibe-summary.png', crop: [607, 274, 150, 233],
                          wallAnchor: { wall:'back', pos: 0.62, height: 16, width: 54 } },
    wall_window_winter: { path: HD + 'ks-window-winter.png',
                          wallAnchor: { wall:'back', pos: 2.15, height: 14, width: 92 } },
    decor_wreath:       { path: HD + 'ks-decor-wreath.png',
                          wallAnchor: { wall:'back', pos: 4.9, height: 52, width: 42 } },
    decor_cocoa_sign:   { path: HD + 'ks-decor-cocoa-sign.png',
                          wallAnchor: { wall:'back', pos: 0.65, height: 18, width: 50 } },
    wall_window_beach:  { path: HD + 'ks-window-beach.png',
                          wallAnchor: { wall:'back', pos: 2.15, height: 14, width: 92 } },
    decor_surfboard:    { path: HD + 'ks-decor-surfboard.png',
                          wallAnchor: { wall:'back', pos: 5.4, height: 8, width: 40 } },
    decor_tiki_sign:    { path: HD + 'ks-decor-tiki-sign.png',
                          wallAnchor: { wall:'back', pos: 0.65, height: 18, width: 52 } },
    decor_fireplace:    { path: HD + 'ks-decor-fireplace.png',
                          wallAnchor: { wall:'back', pos: 5.7, height: 0, width: 78 } },
    decor_palm:         { path: HD + 'ks-decor-palm.png',
                          wallAnchor: { wall:'back', pos: 6.4, height: 0, width: 52 } },

    // ── Desk clutter ────────────────────────────────────────────────────────
    decor_vase:     { path: HD + 'ks-flower-vase.png' },
    decor_utensils: { path: HD + 'ks-utensil-cup.png' },

    // ── UI on the canvas ────────────────────────────────────────────────────
    speech_bubble: { path: HD + 'ks-ui-bubble.png' },
    heart:         { path: HD + 'ks-ui-heart.png' },
    heart_empty:   'assets/images/ui/heart_empty.svg',
    ui_crown:      { path: HD + 'ks-ui-crown.png' },
    ui_coin:       { path: HD + 'ks-ui-coin.png' },
  };
})();
