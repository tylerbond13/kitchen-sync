// ============================================================================
//  Kitchen Sync — IMAGE ASSET MANIFEST + sprite loader
//  ---------------------------------------------------------------------------
//  The renderer does ONE thing: position and blit these image files.
//  There is no shape-drawing for game objects anywhere in the engine.
//
//  To use your own art: drop a real .png (or animated .gif) at any path below.
//  Until you do, a bundled .svg placeholder of the same name is shown so the
//  game is never blank. Real files win automatically — no code change needed.
// ============================================================================
(function () {

  // Every game object → its image file. This is the single source of truth.
  const ASSETS = {
    // ── Characters (the players you control) ───────────────────────────────
    chef:             'assets/images/characters/chef.png',

    // ── Customers (one sprite each) ────────────────────────────────────────
    grandma_rose:     'assets/images/customers/grandma_rose.png',
    influencer:       'assets/images/customers/influencer.png',
    workhorse:        'assets/images/customers/workhorse.png',
    socialite:        'assets/images/customers/socialite.png',
    kid:              'assets/images/customers/kid.png',

    // ── Stations / appliances ──────────────────────────────────────────────
    counter:          'assets/images/stations/counter.png',
    chopping_board:   'assets/images/stations/chopping_board.png',
    stove:            'assets/images/stations/stove.png',
    pot:              'assets/images/stations/pot.png',
    oven:             'assets/images/stations/oven.png',
    plate_stack:      'assets/images/stations/plate_stack.png',
    serve_window:     'assets/images/stations/serve_window.png',
    trash:            'assets/images/stations/trash.png',
    sink:             'assets/images/stations/sink.png',

    // ── Ingredients (raw / chopped / cooked variants) ──────────────────────
    lettuce:          'assets/images/ingredients/lettuce.png',
    lettuce_chopped:  'assets/images/ingredients/lettuce_chopped.png',
    tomato:           'assets/images/ingredients/tomato.png',
    tomato_chopped:   'assets/images/ingredients/tomato_chopped.png',
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

    // ── Plated dishes (what a customer orders) ─────────────────────────────
    dish_salad:         'assets/images/dishes/salad.png',
    dish_big_salad:     'assets/images/dishes/big_salad.png',
    dish_burger:        'assets/images/dishes/burger.png',
    dish_cheeseburger:  'assets/images/dishes/cheeseburger.png',
    dish_soup_onion:    'assets/images/dishes/soup_onion.png',
    dish_soup_tomato:   'assets/images/dishes/soup_tomato.png',
    dish_sushi:         'assets/images/dishes/sushi.png',
    dish_pizza:         'assets/images/dishes/pizza.png',
    dish_stew:          'assets/images/dishes/stew.png',
    dish_cocoa:         'assets/images/dishes/cocoa.png',
    dish_juice:         'assets/images/dishes/juice.png',
    dish_poke:          'assets/images/dishes/poke.png',
    dish_fish_taco:     'assets/images/dishes/fish_taco.png',
    dish_burned:        'assets/images/dishes/burned.png',

    // ── Environment tiles ──────────────────────────────────────────────────
    floor:            'assets/images/env/floor.png',
    wall:             'assets/images/env/wall.png',

    // ── UI props rendered on the canvas ────────────────────────────────────
    speech_bubble:    'assets/images/ui/speech_bubble.png',
    heart:            'assets/images/ui/heart.png',
    heart_empty:      'assets/images/ui/heart_empty.png',
  };

  // path → Image (loaded) | null (still loading) | false (png + placeholder both failed)
  const cache = new Map();

  function load(path) {
    if (!path) return false;
    if (cache.has(path)) return cache.get(path);
    cache.set(path, null);
    const img = new Image();
    img.onload  = () => { cache.set(path, img); GFX._fire(); };
    img.onerror = () => {
      // Real PNG not present → fall back to the bundled SVG placeholder.
      if (/\.png$/.test(path)) {
        const ph = new Image();
        const svg = path.replace(/\.png$/, '.svg');
        ph.onload  = () => { cache.set(path, ph); GFX._fire(); };
        ph.onerror = () => { cache.set(path, false); };
        ph.src = '/' + svg;
      } else {
        cache.set(path, false);
      }
    };
    img.src = '/' + path;
    return null;
  }

  const GFX = {
    ASSETS,
    _listeners: [],
    onReady(fn) { this._listeners.push(fn); },
    _fire() { for (const fn of this._listeners) fn(); },

    // Returns the Image for a manifest key (or raw path), or null if not ready.
    img(key) { const img = load(ASSETS[key] || key); return img || null; },
    has(key) { return !!(ASSETS[key]); },

    // Blit centered inside a w×h box, preserving aspect ratio. → true if drawn.
    draw(ctx, key, cx, cy, w, h) {
      const img = this.img(key);
      if (!img) return false;
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      if (!iw || !ih) return false;
      const s = Math.min(w / iw, h / ih);
      const dw = iw * s, dh = ih * s;
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      return true;
    },

    // Stretch-blit to fill a box from its top-left (for floor/wall/counter tiles).
    tile(ctx, key, x, y, w, h) {
      const img = this.img(key);
      if (!img) return false;
      ctx.drawImage(img, x, y, w, h);
      return true;
    },

    // Warm the cache so the first frame already has art.
    preload() { for (const k in ASSETS) load(ASSETS[k]); },
  };

  window.GFX = GFX;
  window.ASSETS = ASSETS;
})();
