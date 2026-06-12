// Asset manifest — maps every game object to a sprite path.
// Drop real PNG files at these paths to override the canvas fallback renderer.
// All paths are relative to /public/assets/sprites/

(function () {
  const BASE = '/assets/sprites/';

  window.KSAssets = {
    manifest: {
      // ── Environment ────────────────────────────────────────────────────────
      env: {
        floor_tile_diner:    'env/floor_tile_diner.png',
        floor_tile_winter:   'env/floor_tile_winter.png',
        floor_tile_beach:    'env/floor_tile_beach.png',
        back_wall_diner:     'env/back_wall_diner.png',
        back_wall_winter:    'env/back_wall_winter.png',
        back_wall_beach:     'env/back_wall_beach.png',
        counter_top:         'env/counter_top.png',
        counter_side:        'env/counter_side.png',
        customer_floor:      'env/customer_floor.png',
      },

      // ── Stations (idle + active states) ────────────────────────────────────
      stations: {
        chopping_board_idle:    'stations/chopping_board_idle.png',
        chopping_board_active:  'stations/chopping_board_active.png',
        stove_idle:             'stations/stove_idle.png',
        stove_cooking:          'stations/stove_cooking.png',
        stove_done:             'stations/stove_done.png',
        stove_burning:          'stations/stove_burning.png',
        oven_idle:              'stations/oven_idle.png',
        oven_cooking:           'stations/oven_cooking.png',
        oven_done:              'stations/oven_done.png',
        fryer_idle:             'stations/fryer_idle.png',
        fryer_active:           'stations/fryer_active.png',
        sink_idle:              'stations/sink_idle.png',
        sink_washing:           'stations/sink_washing.png',
        serve_window:           'stations/serve_window.png',
        plate_rack:             'stations/plate_rack.png',
        trash_can:              'stations/trash_can.png',
        counter_slot:           'stations/counter_slot.png',
        crate_lettuce:          'stations/crate_lettuce.png',
        crate_tomato:           'stations/crate_tomato.png',
        crate_cucumber:         'stations/crate_cucumber.png',
        crate_generic:          'stations/crate_generic.png',
      },

      // ── Ingredients (raw / chopped / cooked / plated) ──────────────────────
      ingredients: {
        lettuce_whole:    'ingredients/lettuce_whole.png',
        lettuce_chopped:  'ingredients/lettuce_chopped.png',
        tomato_whole:     'ingredients/tomato_whole.png',
        tomato_chopped:   'ingredients/tomato_chopped.png',
        cucumber_whole:   'ingredients/cucumber_whole.png',
        cucumber_chopped: 'ingredients/cucumber_chopped.png',
        bun:              'ingredients/bun.png',
        patty_raw:        'ingredients/patty_raw.png',
        patty_cooked:     'ingredients/patty_cooked.png',
        cheese:           'ingredients/cheese.png',
        onion_whole:      'ingredients/onion_whole.png',
        onion_chopped:    'ingredients/onion_chopped.png',
        rice:             'ingredients/rice.png',
        fish_raw:         'ingredients/fish_raw.png',
        fish_chopped:     'ingredients/fish_sashimi.png',
        seaweed:          'ingredients/seaweed.png',
        potato_whole:     'ingredients/potato_whole.png',
        dough:            'ingredients/dough.png',
        salad_plated:     'ingredients/salad_plated.png',
        burger_plated:    'ingredients/burger_plated.png',
        sushi_plated:     'ingredients/sushi_plated.png',
        burned:           'ingredients/burned.png',
        plate_clean:      'ingredients/plate_clean.png',
        plate_dirty:      'ingredients/plate_dirty.png',
      },

      // ── Player chefs ────────────────────────────────────────────────────────
      chefs: {
        // Spritesheet rows: idle(0), walk_down(1), walk_up(2), walk_side(3), chop(4), hold(5)
        // Each row has 4 frames at 64×80px
        chef_pink:   'chefs/chef_pink_spritesheet.png',
        chef_blue:   'chefs/chef_blue_spritesheet.png',
        chef_teal:   'chefs/chef_teal_spritesheet.png',
        chef_purple: 'chefs/chef_purple_spritesheet.png',
        chef_yellow: 'chefs/chef_yellow_spritesheet.png',
        chef_orange: 'chefs/chef_orange_spritesheet.png',
        chef_red:    'chefs/chef_red_spritesheet.png',
        chef_indigo: 'chefs/chef_indigo_spritesheet.png',
        // Spritesheet layout (pixels, at 2× resolution):
        CHEF_FRAME_W: 64, CHEF_FRAME_H: 80,
        CHEF_ROWS: { idle:0, walk_down:1, walk_up:2, walk_side:3, chop:4, hold:5 },
        CHEF_FRAMES_PER_ROW: 4,
      },

      // ── Customers ───────────────────────────────────────────────────────────
      // Each customer has: idle, happy, worried, panicked, walking (4 frames), leaving
      customers: {
        grandma_rose_idle:     'customers/grandma_rose_idle.png',
        grandma_rose_happy:    'customers/grandma_rose_happy.png',
        grandma_rose_worried:  'customers/grandma_rose_worried.png',
        grandma_rose_panicked: 'customers/grandma_rose_panicked.png',
        grandma_rose_walk:     'customers/grandma_rose_walk_spritesheet.png',

        influencer_idle:       'customers/influencer_idle.png',
        influencer_happy:      'customers/influencer_happy.png',
        influencer_worried:    'customers/influencer_worried.png',
        influencer_panicked:   'customers/influencer_panicked.png',
        influencer_walk:       'customers/influencer_walk_spritesheet.png',

        workhorse_idle:        'customers/workhorse_idle.png',
        workhorse_happy:       'customers/workhorse_happy.png',
        workhorse_worried:     'customers/workhorse_worried.png',
        workhorse_panicked:    'customers/workhorse_panicked.png',
        workhorse_walk:        'customers/workhorse_walk_spritesheet.png',

        socialite_idle:        'customers/socialite_idle.png',
        socialite_happy:       'customers/socialite_happy.png',
        socialite_worried:     'customers/socialite_worried.png',
        socialite_panicked:    'customers/socialite_panicked.png',
        socialite_walk:        'customers/socialite_walk_spritesheet.png',

        kid_idle:              'customers/kid_idle.png',
        kid_happy:             'customers/kid_happy.png',
        kid_worried:           'customers/kid_worried.png',
        kid_panicked:          'customers/kid_panicked.png',
        kid_walk:              'customers/kid_walk_spritesheet.png',

        CUST_FRAME_W: 48, CUST_FRAME_H: 80,
        CUST_WALK_FRAMES: 4,
      },

      // ── UI / HUD ────────────────────────────────────────────────────────────
      ui: {
        heart_full:    'ui/heart_full.png',
        heart_half:    'ui/heart_half.png',
        heart_empty:   'ui/heart_empty.png',
        coin:          'ui/coin.png',
        speech_bubble: 'ui/speech_bubble.png',
        vip_crown:     'ui/vip_crown.png',
        star_on:       'ui/star_on.png',
        star_off:      'ui/star_off.png',
      },

      // ── Particles ───────────────────────────────────────────────────────────
      particles: {
        coin_spin:   'particles/coin_spin_spritesheet.png',  // 8 frames 32×32
        sparkle:     'particles/sparkle_spritesheet.png',    // 6 frames 32×32
        smoke_puff:  'particles/smoke_spritesheet.png',
        flame:       'particles/flame_spritesheet.png',
        confetti_a:  'particles/confetti_a.png',
        confetti_b:  'particles/confetti_b.png',
      },
    },

    // ── Loader ──────────────────────────────────────────────────────────────────
    _cache: new Map(),
    _missing: new Set(),

    // Returns the cached Image if loaded, null if still loading, false if 404
    get(key) {
      const path = this._resolveKey(key);
      if (!path) return false;
      if (this._missing.has(path)) return false;
      if (this._cache.has(path)) return this._cache.get(path);
      // Kick off load
      const img = new Image();
      img.onload  = () => this._cache.set(path, img);
      img.onerror = () => { this._missing.add(path); this._cache.delete(path); };
      img.src = BASE + path;
      this._cache.set(path, null); // null = loading
      return null;
    },

    // Draw a sprite, or call fallback() if asset not ready/missing
    draw(ctx, key, dx, dy, dw, dh, fallback) {
      const img = this.get(key);
      if (img) {
        ctx.drawImage(img, dx, dy, dw, dh);
      } else if (fallback) {
        fallback();
      }
    },

    // Draw a single frame from a spritesheet
    drawFrame(ctx, key, frame, totalFrames, dx, dy, dw, dh, fallback) {
      const img = this.get(key);
      if (img && img.complete && img.naturalWidth > 0) {
        const fw = img.naturalWidth / totalFrames;
        const fh = img.naturalHeight;
        ctx.drawImage(img, frame * fw, 0, fw, fh, dx, dy, dw, dh);
      } else if (fallback) {
        fallback();
      }
    },

    _resolveKey(key) {
      // Flatten the manifest to find the path for a given key string
      for (const section of Object.values(this.manifest)) {
        if (typeof section === 'object' && section[key]) return section[key];
      }
      return null;
    },

    // Preload all assets eagerly (call once at game start)
    preloadAll() {
      const flatten = (obj) => {
        for (const v of Object.values(obj)) {
          if (typeof v === 'string' && v.endsWith('.png')) this.get(v);
          else if (typeof v === 'object') flatten(v);
        }
      };
      flatten(this.manifest);
    },
  };
})();
