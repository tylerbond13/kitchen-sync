// ============================================================================
//  Kitchen Sync — isoRender.js
//  Straight-on orthographic ¾ renderer (PlateUp!-style) over a flat 2D grid.
// ----------------------------------------------------------------------------
//  ENGINEERING RULES (do not violate):
//
//  1. LEAVE THE MAP DATA ALONE.
//     The server simulates a standard flat 2D grid. A player at (2,3) is at
//     (2,3). The projection exists ONLY inside drawing code.
//
//  2. ORTHOGRAPHIC PROJECTION — the grid aligns with the screen axes:
//       screenX = gridX * TILE_WIDTH  + originX
//       screenY = gridY * TILE_HEIGHT + originY
//     +x is right, +y is down; movement is axis-aligned automatically.
//     Tall assets (walls, counters, characters) are bottom-anchored on their
//     tile and extend upward — that is the rendering Y-offset for height.
//     A single uniform scale fits this fixed world space to any canvas.
//
//  3. Y-SORTED RENDER QUEUE.
//     Every visible element (walls, floor, blocks, chefs, customers, decor)
//     is pushed into one flat renderQueue with its screenY, sorted, drawn
//     back-to-front. Boundary walls carry minimum depth: behind counters and
//     characters, in front of the page background.
//
//  4. Every element draws via image assets from the GFX manifest (gfx.js).
// ============================================================================
(function () {

  // ── Locked grid constants ───────────────────────────────────────────────────
  const TILE_WIDTH  = 64;                 // tile width  (world px)
  const TILE_HEIGHT = 48;                 // tile height (world px) — slightly
                                          // rectangular for the ¾ look
  const BLOCK_LIFT  = 24;                 // counter work-surface sits this far
                                          // above the tile's base line
  const WALL_H      = 112;                // back wall height above floor line
  const WALL_SIDE   = 20;                 // left/right side wall strip width
  // TEMP iso-art correction: current station/crate renders are isometric
  // diamonds. Squashing them toward the tile keeps their footprint inside
  // the flat square until front-facing art is swapped in.
  const ISO_FIX     = { squash: 0.88, dy: 3 };
  const CHEF_H     = 118;                 // chef sprite BASE height (world px) —
                                          // ~1.9x the original 62 so chefs read
                                          // big & characterful. Multiplied at
                                          // draw time by the level's charScale.
  const CUSTOMER_H = 132;                 // customer sprite BASE height (world px)
                                          // — ~1.65x the original 80; larger than
                                          // the chef but the queue overlaps less
                                          // so the waiting line stays readable.
  // Characters (chefs + customers) draw at charScale × their base height. The
  // whole game ships at 1× by default (Tyler's call — kitchens stay roomy); the
  // Level Builder can override it per-board. resize() grows the back-wall
  // headroom to match so tall hats never clip at the top edge.
  const DEFAULT_CHAR_SCALE = 1;
  const CHAR_SCALE_MIN = 0.4, CHAR_SCALE_MAX = 4;
  const SPRITE_FILL = 0.84;               // stations render at 84% of their
                                          // tile width — visual "air" between
                                          // counters; grid coords unchanged
  const QUEUE_DEPTH = 5;                  // visible customers in the waiting
                                          // line (matches orders.slice(0,5))

  // Flat painted board: the play area uses a single board image (the wood floor
  // + frosting trim) set as the .canvas-wrap CSS background, instead of the
  // procedural isometric wall + checker floor. The canvas backdrop is left
  // transparent so the board shows through and stations/chefs draw on top.
  const USE_IMAGE_BOARD = true;

  // ── Game-object lookups ─────────────────────────────────────────────────────
  const ING_EMOJI = {
    lettuce:'🥬',tomato:'🍅',cucumber:'🥒',bun:'🍞',patty:'🥩',
    cheese:'🧀',onion:'🧅',rice:'🍚',fish:'🐟',seaweed:'🌿',dough:'🫓',
    potato:'🥔',carrot:'🥕',milk:'🥛',cocoa:'🍫',tortilla:'🌮',
    pineapple:'🍍',strawberry:'🍓',banana:'🍌',
    // Cake World pantry (emoji fallback; most have real art via the manifest)
    flour:'🌾',sugar:'🧂',matcha:'🍵',blueberry:'🫐',
    eggs:'🥚',chocolate:'🍫',honeycomb:'🍯',
  };
  const CHOPPED_EMOJI = { fish:'🍣' };
  const COOKED_EMOJI  = { patty:'🍖' };
  const DISH_EMOJI = {
    soup_onion:'🍰',soup_tomato:'🫐',pizza:'🎂',burned:'🪨',
    stew:'🍯',cocoa:'🍫',juice:'🍓',
    // Cake World cakes (emoji fallback; real cake art via dish_* manifest keys)
    chocolate_cake:'🎂',carrot_cake:'🍰',honeycomb_cake:'🍯',
  };

  const PLAYER_COLORS = ['#FF9FC8','#7FCFCB','#F0C15A','#B58AD8','#D94D74','#6A4ECF','#F3CFA0','#9ED9C6'];

  // Grid char → station image key. Digits 1-9 are ingredient crates and render
  // as a counter block with the ingredient sprite on top (via level.crates).
  const STATION_KEY = { B:'chopping_board', S:'stove', O:'pot', V:'oven', P:'plate_stack', W:'serve_window', T:'trash', K:'sink', M:'mixing_bowl', I:'icing_dispenser', G:'garnish_counter' };
  const PLAIN_STATION_KEY = {
    counter:'counter_plain',
    chopping_board:'chopping_board_plain',
    chopping_board_active:'chopping_board_active_plain',
    oven:'oven_plain',
    oven_active:'oven_active_plain',
    stove:'stove_plain',
    stove_full:'stove_full_plain',
    stove_fire:'stove_fire_plain',
    pot:'pot_plain',
    pot_full:'pot_full_plain',
    pot_active:'pot_active_plain',
    mixing_bowl:'mixing_bowl_plain',
    mixing_bowl_full:'mixing_bowl_full_plain',
    icing_dispenser:'icing_dispenser_plain',
    garnish_counter:'garnish_counter_plain',
    plate_stack:'plate_stack_plain',
    plate_stack_clean_0:'plate_stack_clean_0_plain',
    plate_stack_clean_1:'plate_stack_clean_1_plain',
    plate_stack_clean_2:'plate_stack_clean_2_plain',
    plate_stack_clean_3:'plate_stack_clean_3_plain',
    plate_stack_clean_4:'plate_stack_clean_4_plain',
    serve_window:'serve_window_plain',
    serve_window_active:'serve_window_active_plain',
    // trash intentionally NOT remapped: the HD photo bin (steel pedal can) was
    // the single worst style-breaker on the board — the cartoon cake-world can
    // matches every other station and has real left/right facings.
    sink:'sink_plain',
    sink_dirty:'sink_dirty_plain',
    sink_dirty_0:'sink_dirty_0_plain',
    sink_dirty_1:'sink_dirty_1_plain',
    sink_dirty_2:'sink_dirty_2_plain',
    sink_dirty_3:'sink_dirty_3_plain',
    sink_dirty_4:'sink_dirty_4_plain',
  };

  // Cake World ambient decor (drawn by pushCakeDecor when level.decor==='cake').
  // kind 'rug' = flat floor underlay (drawn first); 'prop' = floor-anchored
  // fixture (depth-sorted, may animate); 'float' = ambient flier on top of
  // everything (animates + gently bobs). `frames` cycles at `fps`.
  const CAKE_DECOR = [
    { kind:'rug',  key:'cw_rug_round',     gx:5,   gy:4.05, w:170 },
    { kind:'prop', key:'cw_display_stand', gx:6,   gy:0.1,  w:120 },
    // (purple mascot removed — never use it)
    { kind:'prop', key:'cw_wall_sconce',   gx:0.15, gy:1.2, w:36 },
    { kind:'prop', key:'cw_wall_sconce',   gx:10.85, gy:1.2, w:36 },
    { kind:'float', fps:9,   gx:2.6, gy:1.0, w:30, lift:52, bob:7, phase:0,   frames:['cw_bee_1','cw_bee_2','cw_bee_3'] },
    { kind:'float', fps:9,   gx:7.5, gy:0.8, w:26, lift:64, bob:6, phase:1.7, frames:['cw_bee_1','cw_bee_2','cw_bee_3'] },
    { kind:'float', fps:5.5, gx:4.4, gy:1.4, w:36, lift:46, bob:10, phase:0.6, frames:['cw_butterfly_1','cw_butterfly_2','cw_butterfly_3'] },
    { kind:'float', fps:5.5, gx:9.2, gy:1.7, w:32, lift:58, bob:8, phase:2.3, frames:['cw_butterfly_1','cw_butterfly_2','cw_butterfly_3'] },
  ];
  // Customer pool (grandma_rose benched for now). The order is shuffled per
  // round from the server's seed so every kitchen sees the same random cast.
  // The waiting line rotates through the full chef roster — every character that
  // has art — so customers are the same cast you can pick as your chef.
  const CUSTOMER_KEYS = (window.KS_CHEFS || [])
    .map((c) => c.key)
    .filter((k) => k && k !== 'chef' && window.ASSETS && !!window.ASSETS[k]);

  // Tiny seeded PRNG (mulberry32) — deterministic across every client.
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ISO_FIX only applies to the remaining isometric renders — the flat SVG
  // stand-ins (manifest `flat: true`) draw with no correction.
  function isoFixFor(key) {
    const e = (window.ASSETS || {})[key];
    return e && e.flat ? null : ISO_FIX;
  }

  // Per-theme scene palette. Everything cosmetic — wall, wainscot, floor,
  // fixtures, surround — is drawn as vector geometry from these so the whole
  // room shares one art language and aligns to the grid (no pasted-on PNGs
  // at mismatched angles).
  const THEMES = {
    diner: {
      surroundA:'#E4BFE8', surroundB:'#9ED9C6',
      wallTop:'#E4BFE8', wallBot:'#BCEFE0',
      ledge:'#F0C15A', ledgeShadow:'#A86A22',
      tile:'#FFF0D6', tileGrout:'#F7B6D4', baseboard:'#F0C15A',
      floorA:'#F7B6D4', floorB:'#C6A3E2', grout:'#F0C15A',
      sky:['#E4BFE8','#BCEFE0'], skyGround:'#9ED9C6',
      accent:'#FF9FC8',
    },
    winter: {
      surroundA:'#E4BFE8', surroundB:'#9ED9C6',
      wallTop:'#E4BFE8', wallBot:'#BCEFE0',
      ledge:'#F0C15A', ledgeShadow:'#A86A22',
      tile:'#FFF0D6', tileGrout:'#F7B6D4', baseboard:'#F0C15A',
      floorA:'#F7B6D4', floorB:'#C6A3E2', grout:'#F0C15A',
      sky:['#E4BFE8','#BCEFE0'], skyGround:'#9ED9C6',
      accent:'#FF9FC8',
    },
    beach: {
      surroundA:'#E4BFE8', surroundB:'#9ED9C6',
      wallTop:'#E4BFE8', wallBot:'#BCEFE0',
      ledge:'#F0C15A', ledgeShadow:'#A86A22',
      tile:'#FFF0D6', tileGrout:'#F7B6D4', baseboard:'#F0C15A',
      floorA:'#F7B6D4', floorB:'#C6A3E2', grout:'#F0C15A',
      sky:['#E4BFE8','#BCEFE0'], skyGround:'#9ED9C6',
      accent:'#FF9FC8',
    },
  };

  // ── Painted-scene metadata ──────────────────────────────────────────────────
  // Each theme ships a full hand-painted wall illustration + a real floor
  // palette. `floorLine` is the fraction of the wall image that is WALL (above
  // its own painted floor strip); we crop there and continue with our own
  // glossy checker so the play floor can be as deep as the grid needs. floorA/B
  // are the saturated checker colours sampled to match the wall art.
  const WALL_META = {
    diner:  { key:'wall_cake_shop', floorLine:1, floorA:'#F7B6D4', floorB:'#C6A3E2', deep:'#5A3664' },
    winter: { key:'wall_cake_shop', floorLine:1, floorA:'#F7B6D4', floorB:'#C6A3E2', deep:'#5A3664' },
    beach:  { key:'wall_cake_shop', floorLine:1, floorA:'#F7B6D4', floorB:'#C6A3E2', deep:'#5A3664' },
  };

  // ── Customer face SVG (used by the HTML ticket strip, not the canvas) ──────
  function customerFace(orderId) {
    const h = [...String(orderId??'x')].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0, 7);
    const skins   = ['#FDDBB5','#F5C489','#D4904A','#A06228','#784428','#FDE0B8'];
    const hairs   = ['#180800','#8B4513','#DAA520','#E05858','#C71585','#607080','#F0F0DC','#4169E1'];
    const skin    = skins[h % skins.length];
    const hairCol = hairs[(h>>4) % hairs.length];
    const hairSty = (h>>2) % 4;
    const accIdx  = (h>>8) % 5;

    const hairShapes = [
      `<ellipse cx="24" cy="17" rx="16" ry="11" fill="${hairCol}"/><rect x="8" y="17" width="32" height="5" fill="${hairCol}"/>`,
      `<ellipse cx="24" cy="15" rx="16" ry="11" fill="${hairCol}"/><rect x="8" y="15" width="5" height="20" rx="2" fill="${hairCol}"/><rect x="35" y="15" width="5" height="20" rx="2" fill="${hairCol}"/>`,
      `<circle cx="13" cy="14" r="8" fill="${hairCol}"/><circle cx="24" cy="10" r="9" fill="${hairCol}"/><circle cx="35" cy="14" r="8" fill="${hairCol}"/>`,
      `<ellipse cx="24" cy="19" rx="15" ry="9" fill="${hairCol}"/><circle cx="24" cy="9" r="7" fill="${hairCol}"/>`,
    ][hairSty];

    const accSvgs = [
      '',
      `<circle cx="18" cy="26" r="5" fill="none" stroke="#555" stroke-width="1.5"/><circle cx="30" cy="26" r="5" fill="none" stroke="#555" stroke-width="1.5"/><line x1="23" y1="26" x2="25" y2="26" stroke="#555" stroke-width="1.5"/>`,
      `<path d="M20,10 L24,13 L28,10 Q24,14 20,10Z" fill="#FF6FAE"/><path d="M15,8 Q20,11 24,13 Q19,14 15,12Z" fill="#FF6FAE"/><path d="M33,8 Q28,11 24,13 Q29,14 33,12Z" fill="#FF6FAE"/>`,
      `<rect x="10" y="15" width="28" height="4" rx="2" fill="#3D2050"/><rect x="15" y="4" width="18" height="13" rx="4" fill="#3D2050"/>`,
      `<path d="M11,17 L15,7 L19,13 L24,5 L29,13 L33,7 L37,17Z" fill="#FFD23F" stroke="#E8B800" stroke-width="1"/>`,
    ];

    return `<svg width="44" height="44" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      ${hairShapes}
      <circle cx="24" cy="27" r="16" fill="${skin}"/>
      <circle cx="18" cy="24" r="2.5" fill="#2D1634"/>
      <circle cx="30" cy="24" r="2.5" fill="#2D1634"/>
      <circle cx="19" cy="23" r="1" fill="white"/>
      <circle cx="31" cy="23" r="1" fill="white"/>
      <ellipse cx="13" cy="30" rx="4" ry="2.5" fill="rgba(255,100,100,0.3)" class="cust-blush"/>
      <ellipse cx="35" cy="30" rx="4" ry="2.5" fill="rgba(255,100,100,0.3)" class="cust-blush"/>
      <path class="cust-mouth cust-happy"  d="M16,30 Q24,36 32,30" stroke="#2D1634" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path class="cust-mouth cust-warn"   d="M17,31 Q24,31 31,31" stroke="#2D1634" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path class="cust-mouth cust-urgent" d="M16,34 Q24,29 32,34" stroke="#2D1634" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path class="cust-brow-urgent" d="M14,19 Q18,16 22,18" stroke="#5A3030" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path class="cust-brow-urgent" d="M26,18 Q30,16 34,19" stroke="#5A3030" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      ${accSvgs[accIdx]}
    </svg>`;
  }

  // ── Token / prep helpers ────────────────────────────────────────────────────
  function itemEmoji(item) {
    if (!item) return '';
    if (item.kind==='dish')  return DISH_EMOJI[item.id]||'🍽️';
    if (item.kind==='plate') return '🍽️';
    if (item.state==='chopped'&&CHOPPED_EMOJI[item.id]) return CHOPPED_EMOJI[item.id];
    if (item.state==='cooked'&&COOKED_EMOJI[item.id])   return COOKED_EMOJI[item.id];
    return ING_EMOJI[item.id]||'❓';
  }
  function itemKey(item){
    if(!item) return '__none__';
    if(item.kind==='plate') return 'plate';
    if(item.kind==='dish'){
      // Cake World: a baked-but-un-iced cake reads as the plain sponge stack;
      // icing switches it to its finished decorated art.
      if(/_cake$/.test(item.id) && !item.icing) return 'cake_plain';
      return 'dish_'+item.id;          // dish_pizza, dish_burned, ...
    }
    const id=item.id;
    if(item.state==='chopped'){
      if(id==='fish') return 'fish_chopped';
      return (window.ASSETS && window.ASSETS[id+'_chopped']) ? id+'_chopped' : id;
    }
    if(item.state==='cooked')
      return (window.ASSETS && window.ASSETS[id+'_cooked']) ? id+'_cooked' : id;
    return id;
  }

  function tokenEmoji(token) {
    const [id,state]=token.split('.');
    if (state==='dish') return DISH_EMOJI[id]||'🍽️';
    return itemEmoji({id,state});
  }
  function tokenHtml(token) {
    const [id,state]=token.split('.');
    const badge=state==='chopped'&&!CHOPPED_EMOJI[id]?'🔪':state==='cooked'&&!COOKED_EMOJI[id]?'♨️':'';
    return `<span class="need">${tokenEmoji(token)}${badge?`<b>${badge}</b>`:''}</span>`;
  }
  function ico(token) { return (window.KSArt&&KSArt.svg(token))||tokenEmoji(token); }

  const DISH_PREP = {
    soup_onion:['🧅🧅🧅','🔪','🍲'],soup_tomato:['🍅🍅🍅','🔪','🍲'],
    pizza:()=>[ico('dough.raw')+'🍅🧀','🔪','🔥'],stew:['🥔🥕🧅','🔪','🍲'],
    cocoa:['🥛🍫','🔪','🍲'],juice:['🍍🍓🍌','🔪','🍲'],
  };
  const COOK_TOOL={patty:'🍳',rice:'🍲'};

  function prepChainHtml(token) {
    const [id,state]=token.split('.');
    let steps;
    if (state==='dish'){const d=DISH_PREP[id];steps=typeof d==='function'?d():(d||[tokenEmoji(token)]);}
    else if (state==='chopped') steps=[ico(`${id}.raw`),'🔪'];
    else if (state==='cooked')  steps=id==='patty'?[ico('patty.raw'),'🔪','🍳']:[ico(`${id}.raw`),COOK_TOOL[id]||'🍳'];
    else steps=[ico(token)];
    return `<div class="chain">${steps.join('<i>›</i>')}</div>`;
  }

  const DISH_TICKET_CELLS = {
    soup_onion:  ['onion','onion','onion'].map((id)=>({ id, prep:['🔪','🍲'] })),
    soup_tomato: ['tomato','tomato','tomato'].map((id)=>({ id, prep:['🔪','🍲'] })),
    pizza: [
      { id:'dough', prep:['🔥'] },
      { id:'tomato', prep:['🔪','🔥'] },
      { id:'cheese', prep:['🔪','🔥'] },
    ],
    stew: ['potato','carrot','onion'].map((id)=>({ id, prep:['🔪','🍲'] })),
    cocoa: [
      { id:'milk', prep:['🍲'] },
      { id:'cocoa', prep:['🔪','🍲'] },
    ],
    juice: ['pineapple','strawberry','banana'].map((id)=>({ id, prep:['🔪','🍲'] })),
  };

  function assetImgHtml(key, fallback, cls='') {
    const ent = window.ASSETS && window.ASSETS[key];
    const path = typeof ent === 'string' ? ent : ent && ent.path;
    if (path) return `<img class="${cls}" src="/${path}" alt="" draggable="false">`;
    return `<span class="${cls} glyph">${fallback}</span>`;
  }

  function miniIngredientHtml(id) {
    if (window.ASSETS && window.ASSETS[id]) return assetImgHtml(id, ING_EMOJI[id] || '❓', 'ticket-mini-img');
    const svg = window.KSArt && KSArt.svg(`${id}.raw`);
    if (svg) return svg;
    return assetImgHtml(id, ING_EMOJI[id] || '❓', 'ticket-mini-img');
  }

  function customerKeyForOrder(order, cast) {
    if (!order || !cast || !cast.length) return null;
    const preset = ((order.id - 1) % cast.length + cast.length) % cast.length;
    return cast[preset];
  }

  function cellForToken(token) {
    const [id,state]=token.split('.');
    if (state === 'dish') return null;
    const prep = state === 'chopped' ? ['🔪']
      : state === 'cooked' ? (id === 'patty' ? ['🔪','🍳'] : [COOK_TOOL[id] || '🍳'])
      : [];
    return { id, prep };
  }

  function ticketIngredientHtml(cell) {
    const prep = (cell.prep || []).map((p)=>`<span>${p}</span>`).join('');
    return `<div class="ticket-ingredient">
      <div class="ticket-mini">${miniIngredientHtml(cell.id)}</div>
      <div class="ticket-prep">${prep}</div>
    </div>`;
  }

  function ticketRecipeHtml(order, customerKey) {
    const cells = DISH_TICKET_CELLS[order.recipe] || order.needs.map(cellForToken).filter(Boolean);
    const dish = assetImgHtml(`dish_${order.recipe}`, order.emoji || '🍽️', 'ticket-dish-img');
    const customer = customerKey
      ? assetImgHtml(customerKey, customerFace(order.id), 'ticket-customer-img')
      : customerFace(order.id);
    return `<div class="ticket-dish">${dish}</div>
      <div class="ticket-body">
        <div class="ticket-headline">
          <span class="ticket-customer">${customer}</span>
          <div class="ticket-name">${order.vip ? '👑 ' : ''}${order.name}</div>
        </div>
        <div class="ticket-ingredients">${cells.map(ticketIngredientHtml).join('')}</div>
      </div>`;
  }

  // ── The renderer ────────────────────────────────────────────────────────────
  class Renderer {
    constructor(canvas, staticState, myId, onTap, opts = {}) {
      this.canvas  = canvas;
      this.ctx     = canvas.getContext('2d');
      this.lvl     = staticState;          // flat 2D grid — read-only, never mutated
      this.myId    = myId;
      this.onTap   = onTap;
      // Preview mode (Level Builder): draws the scene exactly as it'll play, but
      // is non-interactive — no tap-to-cook, no live server state.
      this.preview = !!opts.preview;
      // Character (chef + customer) sprite multiplier — defaults to the global
      // 2× and can be tuned per-board from the builder.
      const cs = Number(staticState.charScale);
      this.charScale = Number.isFinite(cs)
        ? Math.max(CHAR_SCALE_MIN, Math.min(CHAR_SCALE_MAX, cs))
        : DEFAULT_CHAR_SCALE;
      this.prev    = null; this.cur  = null;
      this.prevAt  = 0;    this.curAt = 0;
      this.fx      = [];                   // particles, in world space
      this.colorOf = {};
      this.qPos    = new Map();            // orderId → smoothed queue position
      // Serve-window cells anchor the customer queue (game-flow alignment):
      // the line forms outside the wall nearest the hatch, front slot at it.
      this.serveCells = [];
      for (let y=0; y<staticState.h; y++) for (let x=0; x<staticState.w; x++)
        if (staticState.grid[y][x]==='W') this.serveCells.push([x,y]);
      this.themeName = staticState.theme || 'diner';
      this.theme   = THEMES[this.themeName] || THEMES.diner;
      this.wallMeta = WALL_META[this.themeName] || WALL_META.diner;
      // Every kitchen gets ambient set dressing (rugs, sconces, a mascot,
      // drifting bees/butterflies) generated from its own grid — Cake World
      // keeps its hand-tuned arrangement.
      this.ambience = staticState.decor === 'cake' ? null : this.buildAmbience(staticState.seed ?? 1);
      // Seeded dust motes drifting over the upper floor — every client sees
      // the same slow-moving specks (roadmap #9: a static composite screams
      // "pasted"; a couple of live elements sell one lit illustration).
      const mrand = mulberry32((((staticState.seed ?? 1) ^ 0xA5A5A5) >>> 0));
      this._motes = Array.from({ length: 10 + Math.floor(mrand()*5) }, () => ({
        x: mrand()*staticState.w*TILE_WIDTH,
        y: mrand()*staticState.h*TILE_HEIGHT*0.5,
        vx: (mrand()*2-1)*5, vy: (mrand()*2-1)*2.5,
        r: 1.5 + mrand()*1.5, ph: mrand()*Math.PI*2,
      }));
      // Per-round customer cast: Fisher-Yates with the server's seed.
      const rand = mulberry32((staticState.seed ?? 1) >>> 0);
      // a custom/admin level can restrict the cast to a chosen set of avatars
      this.cast = (staticState.customers && staticState.customers.length)
        ? [...staticState.customers]
        : [...CUSTOMER_KEYS];
      for (let i = this.cast.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [this.cast[i], this.cast[j]] = [this.cast[j], this.cast[i]];
      }
      this.running = true;
      this.dpr     = Math.min(window.devicePixelRatio||1, 3);

      if (window.GFX) this.preloadRoundArt();
      // Backdrop behind/around the play area. With the flat image board the wood
      // board is the .canvas-wrap CSS background and shows through the
      // transparent canvas, so leave it to the stylesheet; otherwise paint the
      // per-theme framed gradient (the vignette in drawAtmosphere finishes it).
      if (!USE_IMAGE_BOARD) {
        const t = this.theme;
        canvas.parentElement.style.background =
          `radial-gradient(120% 100% at 50% 18%, ${t.surroundA} 0%, ${t.surroundB} 100%)`;
      }

      // World-anchored backdrop (roadmap #6): the wallpaper is drawn ON the
      // canvas in world coordinates — its floor/wall boundary (trim) lands
      // just above the room's top edge and its floor grain scales with the
      // tiles, so the photo stops being a poster behind the kitchen and
      // becomes the room itself. The blurred CSS copy underneath only bleeds
      // into screen edges this aligned draw can't reach.
      if (opts.backdrop && opts.backdrop.url && window.ASSETS) {
        const bk = `backdrop:${opts.backdrop.url}`;
        if (!ASSETS[bk]) ASSETS[bk] = { path: opts.backdrop.url, nokey: true };
        this._backdropKey = bk;
        this._backdropTrim = Math.max(0, Math.min(1, opts.backdrop.trim ?? 0.30));
      }

      // Character overlay: a transparent canvas stacked ABOVE the HTML ticket
      // band. Character sprites (chefs, customers, carried items, name tags)
      // are replayed onto it, clipped to the band region, so people walk IN
      // FRONT of the order cards instead of hiding behind them. Created
      // before the first resize() so it gets sized with the main canvas.
      if (!this.preview) {
        this.overlay = document.createElement('canvas');
        this.overlay.className = 'char-overlay';
        canvas.parentElement.appendChild(this.overlay);
        this.octx = this.overlay.getContext('2d');
      }

      this.resize = this.resize.bind(this);
      window.addEventListener('resize', this.resize);
      // The canvas box also changes without a window resize — e.g. the orders
      // strip appearing/disappearing reflows the stage, and the landscape rail
      // wraps. Observe the wrapper directly so the draw buffer never goes stale
      // (resize() only writes canvas.width/height, so this can't loop).
      if (window.ResizeObserver) {
        this._ro = new ResizeObserver(() => this.resize());
        this._ro.observe(canvas.parentElement);
        // The HUD bands size themselves to their content (tickets spawn after
        // the round starts and vary in height per recipe), and the fit math
        // reserves exactly the measured band heights — so a band growing or
        // shrinking must re-fit the kitchen too.
        if (!this.preview) {
          for (const sel of ['.game-hud-top', '.game-hud-bottom']) {
            const band = document.querySelector(sel);
            if (band) this._ro.observe(band);
          }
        }
      }
      this.resize();

      // The builder preview is look-only: you can't click ingredients to start
      // cutting them like the real game.
      if (!this.preview) {
        // The <canvas> is a persistent DOM node reused across every round. If a
        // prior renderer left its tap listener attached (e.g. it wasn't
        // destroy()'d before this one was built — finishing a level then
        // reopening it), each tap would fire N times and on a counter the
        // place+pickup would cancel out → "can't pick up what you put down"
        // until a refresh. Guarantee exactly ONE tap listener per canvas:
        // remove whatever was bound before, then bind and remember ours.
        if (canvas.__ksTapHandler) canvas.removeEventListener('pointerdown', canvas.__ksTapHandler);
        this._onPointerDown = (e) => {
          const rect = canvas.getBoundingClientRect();
          const cx = (e.clientX-rect.left)*(canvas.width/rect.width);
          const cy = (e.clientY-rect.top)*(canvas.height/rect.height);
          const [wx, wy] = this.toWorld(cx, cy);
          this.fx.push({kind:'ripple',x:wx,y:wy,t:0});
          const hit = this.pick(wx, wy);
          if (hit) this.onTap(hit[0], hit[1]);
        };
        canvas.__ksTapHandler = this._onPointerDown;
        canvas.addEventListener('pointerdown', this._onPointerDown);
      }
      requestAnimationFrame(()=>this.frame());
    }

    // Warm ONLY the art this round can actually show. The manifest references
    // tens of MB across every theme and all ~70 characters — blanket
    // preloading made a first phone visit download the whole catalog. Missing
    // a key here is always safe: draws lazy-load on first use (stream-in).
    preloadRoundArt() {
      const warm = new Set(['chef', 'chef_back', 'plate', 'crate']);
      const VARIANTS = {
        '#': ['counter'],
        B: ['chopping_board', 'chopping_board_active'],
        S: ['stove', 'stove_full', 'stove_fire'],
        O: ['pot', 'pot_full', 'pot_active'],
        V: ['oven', 'oven_active'],
        M: ['mixing_bowl', 'mixing_bowl_full'],
        P: ['plate_stack', 'plate_stack_clean_0', 'plate_stack_clean_1',
            'plate_stack_clean_2', 'plate_stack_clean_3', 'plate_stack_clean_4'],
        W: ['serve_window', 'serve_window_active'],
        K: ['sink', 'sink_dirty', 'sink_dirty_0', 'sink_dirty_1',
            'sink_dirty_2', 'sink_dirty_3', 'sink_dirty_4'],
        T: ['trash'],
        I: ['icing_dispenser'], G: ['garnish_counter'],
      };
      const addFaced = (base) => {
        for (const k of [base, `${base}_left`, `${base}_right`]) if (GFX.has(k)) warm.add(k);
      };
      const cells = new Set();
      for (const row of this.lvl.grid || []) for (const c of row) cells.add(c);
      for (const c of cells) {
        for (const base of VARIANTS[c] || []) {
          addFaced(base);
          addFaced(this.stationArtKey(base));
        }
      }
      for (const ing of Object.values(this.lvl.crates || {})) {
        for (const k of [`crate_${ing}`, ing, `${ing}_chopped`, `${ing}_cooked`])
          if (GFX.has(k)) warm.add(k);
      }
      for (const r of this.lvl.recipes || []) {
        if (r.recipe && GFX.has(`dish_${r.recipe}`)) warm.add(`dish_${r.recipe}`);
      }
      // the customers most likely to walk in this round (cast is pre-shuffled)
      for (const k of (this.cast || []).slice(0, 12)) if (GFX.has(k)) warm.add(k);
      for (const d of this.ambience || []) {
        for (const k of d.frames || [d.key]) if (k && GFX.has(k)) warm.add(k);
      }
      if (this._backdropKey) warm.add(this._backdropKey);
      for (const k of warm) GFX.img(k);
    }

    destroy() {
      this.running=false;
      window.removeEventListener('resize',this.resize);
      this._ro && this._ro.disconnect();
      if (this.overlay) { this.overlay.remove(); this.overlay = this.octx = null; }
      if (this._onPointerDown) {
        this.canvas.removeEventListener('pointerdown', this._onPointerDown);
        if (this.canvas.__ksTapHandler === this._onPointerDown) this.canvas.__ksTapHandler = null;
      }
    }

    // ── World space ⇄ canvas ──────────────────────────────────────────────────
    // World space uses the locked 64×32 tile constants. One uniform scale +
    // translate maps world space onto the device canvas.
    // Queue geometry: landscape kitchens are wide and short, so the waiting
    // line forms a VERTICAL column just outside the right wall instead of a row
    // below the front. This fills the horizontal room and reserves no grid rows
    // below the floor, so scale-to-fit can grow the tiles. Slot 0 is at the top;
    // the line grows downward, centered against the room's depth.
    queueSlot(i) {
      const { w, h } = this.lvl;
      // Vertical tiles between waiting customers — grows with character size so
      // the bigger sprites don't clump, but CLAMPED so the whole line fits
      // within the room's rows. An overhanging queue used to stretch the fit
      // bounds and shrink every tile on screen; a tighter crowd costs nothing.
      const natural = 1.35 * (0.6 + 0.4 * this.charScale);
      const QGAP = Math.min(natural, Math.max(0.85, (h - 1.9) / (QUEUE_DEPTH - 1)));
      const col = w + 0.7;                       // one tile beyond the right wall
      const span = QGAP * (QUEUE_DEPTH - 1);
      // start no higher than the second row, so queue heads stay inside the
      // (reduced) headroom — see resize()
      const top = Math.max(1.0, (h - 1 - span) / 2);
      return { x: col, y: top + 0.5 + i * QGAP };
    }

    customerKeyForOrder(order) {
      return customerKeyForOrder(order, this.cast);
    }

    resize() {
      const wrap=this.canvas.parentElement;
      this.canvas.width  = Math.round(wrap.clientWidth*this.dpr);
      this.canvas.height = Math.round(wrap.clientHeight*this.dpr);

      const {w,h}=this.lvl;
      // World bounds from the room plus the hatch-anchored queue slots, so
      // the queue always fits no matter which wall it lines up on.
      let minGx=0, maxGx=w-1, maxGy=h-1;
      for (let i=-1;i<5;i++){
        const q=this.queueSlot(i);
        minGx=Math.min(minGx,q.x); maxGx=Math.max(maxGx,q.x); maxGy=Math.max(maxGy,q.y);
      }
      const PAD=10;
      // Characters anchor at their feet and draw upward, so the world needs
      // enough room above the floor line that a (possibly 2×) head/hat never
      // clips the top edge. Size that headroom to where characters can ACTUALLY
      // stand: the topmost walkable row (campaign boards have stations across
      // row 0, so chefs stand a full tile lower) and the queue's first slot —
      // not a worst case nobody occupies. Every world pixel saved here makes
      // all tiles bigger on a phone. Never shrink below the painted wall.
      const tallest = Math.max(CHEF_H, CUSTOMER_H) * this.charScale;
      let topFloor = 0;
      scan: for (let gy = 0; gy < h; gy++) {
        for (let gx = 0; gx < w; gx++) {
          if (this.lvl.grid[gy] && this.lvl.grid[gy][gx] === '.') { topFloor = gy; break scan; }
        }
      }
      const highestFeet = Math.min(topFloor + 0.5, this.queueSlot(0).y); // in tiles
      // How far a character standing on that highest spot rises ABOVE the
      // room's top edge — body + the floating name tag. That is GAMEPLAY, not
      // decoration, so the fit below must keep it out from under the tickets.
      const charRise = Math.max(0, Math.ceil(tallest + 22 - TILE_HEIGHT * highestFeet));
      const headroom = Math.max(WALL_H, charRise);
      this.ox = PAD + WALL_SIDE + Math.max(0,-minGx)*TILE_WIDTH; // room origin
      this.oy = PAD + headroom;                                  // below the wall
      this.worldW = this.ox + (maxGx+1)*TILE_WIDTH + WALL_SIDE + PAD;
      this.worldH = this.oy + (maxGy+1)*TILE_HEIGHT + 30 + PAD;

      // The HUD bands overlay the canvas. GAMEPLAY (the room's rows + front
      // faces) must fit BETWEEN them — chefs never walk behind the tickets and
      // the score bar never covers the front row. Only the decorative wall /
      // headroom may rise behind the ticket band.
      const bandH = (sel) => {
        if (this.preview) return 0;
        const el = document.querySelector(sel);
        return el ? el.getBoundingClientRect().height * this.dpr : 0;
      };
      this.bandTop = bandH('.game-hud-top');
      this.bandBot = bandH('.game-hud-bottom');
      // Publish the REAL band height for the under-tickets overlays (rush
      // banner, rotating hint, director HUD) — they position off this var so
      // a tall ticket band pushes them down instead of overlapping them.
      if (!this.preview) {
        const scr = document.getElementById('screen-game');
        if (scr) scr.style.setProperty('--hud-band-h', `${Math.round(this.bandTop / this.dpr)}px`);
      }
      // Fit the ROOM between the bands (max tile size). Characters near the
      // top rows rise into the zone behind the ticket band — those sprites
      // are replayed onto the char overlay canvas ABOVE the tickets, so
      // nothing gameplay-relevant is ever hidden (see drawCharOverlay).
      const playH  = this.worldH - this.oy;   // room rows + front-face padding
      const availH = Math.max(80, this.canvas.height - this.bandTop - this.bandBot);
      this.scale = Math.min(this.canvas.width / this.worldW, availH / playH);
      this.txOff = (this.canvas.width - this.worldW * this.scale) / 2;
      // pin the top row just below the tickets; float in any spare height
      this.tyOff = this.bandTop - this.oy * this.scale
                 + Math.max(0, availH - playH * this.scale) / 2;
      if (this.overlay) {
        this.overlay.width  = this.canvas.width;
        this.overlay.height = this.canvas.height;
      }
    }

    toWorld(cx, cy) { return [(cx-this.txOff)/this.scale, (cy-this.tyOff)/this.scale]; }

    // ── THE PROJECTION (visual only — never touches game state) ─────────────
    // Straight-on grid: returns the CENTER of tile (gridX, gridY).
    //   screenX = gridX * TILE_WIDTH  + originX  (+ half tile)
    //   screenY = gridY * TILE_HEIGHT + originY  (+ half tile)
    project(gridX, gridY) {
      return [
        this.ox + (gridX + 0.5) * TILE_WIDTH,
        this.oy + (gridY + 0.5) * TILE_HEIGHT,
      ];
    }
    // Players are continuous grid coords with tile centers at +0.5.
    projectEntity(px, py) { return this.project(px - 0.5, py - 0.5); }

    // Screen → grid: the straight-on inverse is a simple division.
    unproject(wx, wy) {
      return [(wx - this.ox) / TILE_WIDTH  - 0.5,
              (wy - this.oy) / TILE_HEIGHT - 0.5];
    }

    // ── CLICK DETECTION: reverse-depth sprite hit testing ────────────────────
    // The render pass registers every station's exact drawn rect (full sprite
    // height included) in this._hits. A tap walks those regions from the
    // FOREGROUND backwards (descending screenY), so the visually foremost
    // sprite captures the click — with a per-pixel alpha probe so the
    // transparent corners of a bounding rect pass through to whatever is
    // behind. If no sprite claims the tap, it falls through to the ground
    // plane via the exact inverse projection (floor movement).
    pick(wx, wy) {
      const hits = (this._hits || []).slice().sort((a, b) => b.d - a.d);
      // Pass 1 — precise, pixel-accurate pick on the drawn sprite art.
      for (const hit of hits) {
        if (hit.tile) continue;
        if (wx < hit.x || wx > hit.x + hit.w ||
            wy < hit.y || wy > hit.y + hit.h) continue;
        const u = (wx - hit.x) / hit.w, v = (wy - hit.y) / hit.h;
        if (!GFX.alphaAt(hit.key, u, v)) continue;
        // Overhang guard: a tall sprite (stove, oven, a counter with food on it)
        // is drawn well above its tile, so its rect can cover the open floor in
        // FRONT of it. If this tap is on that upper overhang AND the tile truly
        // under the cursor is walkable floor, treat it as a move (fall through)
        // instead of an accidental interact while sprinting past. Taps over the
        // station's own footprint — or over a wall / another station, like a
        // board hugging the wall on a one-wide lane — still interact normally.
        const baseY = hit.y + hit.h;
        if (wy < baseY - TILE_HEIGHT) {
          const ux = Math.floor((wx - this.ox) / TILE_WIDTH);
          const uy = Math.floor((wy - this.oy) / TILE_HEIGHT);
          if (!(ux === hit.gx && uy === hit.gy) && this.isFloorTile(ux, uy)) continue;
        }
        return [hit.gx, hit.gy];
      }
      // Pass 2 — generous fallback: a tap anywhere on a station's tile footprint
      // (plus the lifted work-surface / floating-item area just above it) still
      // interacts, so a near-miss over the station's own air doesn't silently do
      // nothing. Tiles are exclusive left-to-right, so neighbours never overlap;
      // vertical overlaps between stacked stations resolve foremost-first.
      for (const hit of hits) {
        if (!hit.tile) continue;
        if (wx < hit.x || wx > hit.x + hit.w ||
            wy < hit.y || wy > hit.y + hit.h) continue;
        return [hit.gx, hit.gy];
      }
      // gridX = floor(mouseX / tileWidth), gridY = floor(mouseY / tileHeight)
      const gx = Math.floor((wx - this.ox) / TILE_WIDTH);
      const gy = Math.floor((wy - this.oy) / TILE_HEIGHT);
      if (gx>=0 && gy>=0 && gx<this.lvl.w && gy<this.lvl.h) return [gx, gy];
      return null;
    }

    // Walkable floor = an open '.' tile in the static layout (stations/crates
    // are letters/digits). Used by the overhang guard above.
    isFloorTile(gx, gy) {
      const row = this.lvl.grid && this.lvl.grid[gy];
      return !!row && row[gx] === '.';
    }

    // ── Server state plumbing (flat 2D data in, flat 2D data out) ────────────
    update(state) {
      this.prev=this.cur; this.prevAt=this.curAt;
      this.cur=state; this.curAt=performance.now();
      state.players.forEach((p)=>{
        if (!this.colorOf[p.id])
          this.colorOf[p.id]=PLAYER_COLORS[Object.keys(this.colorOf).length%PLAYER_COLORS.length];
      });
      for (const ev of state.events) this.addFx(ev);
    }

    // Level Builder: populate a frozen, non-interactive scene so the board reads
    // exactly as it'll play — real station/crate sprites, the chosen wallpaper,
    // a sample idle chef, and a full customer waiting line at the configured
    // character size. There's no live game behind it, so stations stay empty.
    setPreviewScene(chefKeys) {
      const lvl = this.lvl;
      // first couple of open floor tiles → where sample chefs stand
      const floor = [];
      for (let y = 0; y < lvl.h && floor.length < 2; y++)
        for (let x = 0; x < lvl.w && floor.length < 2; x++)
          if (lvl.grid[y] && lvl.grid[y][x] === '.') floor.push({ x, y });
      const keys = (chefKeys && chefKeys.length) ? chefKeys : ['chef'];
      const players = floor.map((f, i) => ({
        id: 'preview-chef-' + i, name: '',
        chef: keys[i % keys.length],
        x: f.x + 0.5, y: f.y + 0.5,
        carry: null, queue: [], moving: false,
      }));
      // a sample order per visible queue slot, so the waiting line fills in
      const orders = [];
      for (let i = 0; i < QUEUE_DEPTH; i++) {
        orders.push({ id: i + 1, recipe: 'salad', name: '', needs: [], ttl: 60, ttlMax: 60 });
      }
      this.cur = { players, stations: {}, orders, events: [] };
      this.prev = null;                       // no interpolation from a real frame
      this.curAt = performance.now();
      players.forEach((p) => {
        if (!this.colorOf[p.id])
          this.colorOf[p.id] = PLAYER_COLORS[Object.keys(this.colorOf).length % PLAYER_COLORS.length];
      });
    }

    lerpPlayers() {
      if (!this.cur) return [];
      if (!this.prev) return this.cur.players;
      const span=Math.max(this.curAt-this.prevAt,1);
      const a=Math.min((performance.now()-this.curAt)/span,1);
      return this.cur.players.map((p)=>{
        const q=this.prev.players.find((x)=>x.id===p.id);
        if (!q) return p;
        return {...p,x:q.x+(p.x-q.x)*a,y:q.y+(p.y-q.y)*a};
      });
    }

    stationAt(gx,gy) { return this.cur?this.cur.stations[`${gx},${gy}`]||null:null; }

    frame() { if (!this.running) return; this.draw(); requestAnimationFrame(()=>this.frame()); }

    easeOut(t) { return 1-(1-Math.min(t,1))**3; }

    // ── Juice ─────────────────────────────────────────────────────────────────
    addFx(ev) {
      const at=(x,y)=>{ const [px,py]=this.project(x,y); return [px, py-BLOCK_LIFT]; };
      const cols=['#FF6FAE','#FFD23F','#3DC9A0','#C09BFF','#FF8251','#5BADDE'];
      if (ev.type==='serve') {
        const [px,py]=at(ev.x,ev.y);
        const vip = !!ev.vip;
        const combo = (this.cur && this.cur.combo) || 0;
        const gold = vip || combo >= 3;
        // floating score — bigger for VIPs / hot combos
        this.fx.push({kind:'points',x:px,y:py-6,text:`+${ev.points}`,t:0,color: gold ? '#FFB018' : '#3DC9A0', big: vip || ev.points >= 130});
        // a shower of coins, more for a bigger tip
        const coins = Math.max(8, Math.min(26, Math.round(ev.points / 11)));
        for (let i=0;i<coins;i++){
          const ang=(i/coins)*Math.PI*2;
          const spd=2.4+Math.random()*3.4;
          this.fx.push({kind:'coin',x:px,y:py,t:0,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd*0.5-2.4,rot:Math.random()*Math.PI*2,vrot:(Math.random()-0.5)*0.3,size: vip?9:7});
        }
        // burst ring that grows with the combo
        this.fx.push({kind:'ring',x:px,y:py,t:0,maxR: 34 + combo*7, color: gold ? '#FFD23F' : '#FF6FAE'});
        for (let i=0;i<(vip?18:12);i++) this.fx.push({
          kind:'confetti',x:px,y:py,t:0,
          vx:(Math.random()-0.5)*8,vy:-Math.random()*9-2,
          color:cols[i%cols.length],shape:i%3,rot:Math.random()*Math.PI*2,
        });
        // combo flourish — the streak escalates the celebration
        if (combo >= 2) this.fx.push({kind:'points',x:px,y:py-32,text:`COMBO ×${combo}!`,t:0,color:'#FF7AAE', big:true});
      } else if (ev.type==='burn') {
        const [px,py]=at(ev.x,ev.y);
        this.fx.push({kind:'points',x:px,y:py,text:'🔥 burned!',t:0,color:'#FF6040'});
      } else if (ev.type==='chopped'||ev.type==='ding') {
        const [px,py]=at(ev.x,ev.y);
        this.fx.push({kind:'pop',x:px,y:py,text:ev.type==='ding'?'♨️':'✨',t:0});
      } else if (ev.type==='reject'&&ev.playerId===this.myId) {
        const [px,py]=at(ev.x,ev.y);
        this.fx.push({kind:'points',x:px,y:py,text:'✕',t:0,color:'#FF4070'});
      } else if (ev.type==='waiting'&&ev.playerId===this.myId) {
        // tapped a busy board/cooker: the chef will auto-grab when it's ready
        const [px,py]=at(ev.x,ev.y);
        this.fx.push({kind:'points',x:px,y:py,text:'⏳',t:0,color:'#C09BFF'});
      }
    }

    // ── THE RENDER LOOP ───────────────────────────────────────────────────────
    // clear → backdrop → build flat renderQueue → sort by screenY → draw →
    // overlay labels → effects. No nested draw loops, no offscreen caches.
    draw() {
      const {ctx}=this;
      const now=performance.now();

      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

      // -1. WORLD-ANCHORED WALLPAPER (roadmap #6) — the sharp copy of the
      // board photo, scaled and positioned so its floor line meets the grid.
      this.drawWorldBackdrop();

      // 0. PAINTED SCENE BACKDROP (device space). The theme's hand-painted wall
      // illustration, bled to the screen edges and shown at true proportions,
      // sitting above a glossy checkerboard floor in the theme's real colours.
      // This fills every margin with the illustrated environment (no flat
      // gradient voids) and finally USES the authored wall art instead of
      // squashing it into a sliver or replacing it with vector shapes.
      this.drawScene();

      // 1. ROOM BASE (device space): the framed "stage" the kitchen stands on —
      // gold frame, warm floor sheen, AO under the back row, inner edge shadow.
      // This mediates between the sprites and the photo wallpaper so the island
      // reads as one built set instead of assets pasted on a background.
      this.drawBoardFrame();

      // Everything else draws in world space (fixed 64×48 units).
      ctx.setTransform(this.scale,0,0,this.scale,this.txOff,this.tyOff);

      // Merged island shadows go under everything on the floor.
      this.drawRunShadows();

      const renderQueue = [];
      this._hits = [];                 // precise sprite rects for click picking
      const {lvl}=this;

      // 2. Counter blocks, stations, crates — anchored at their base screenY.
      for (let gy=0; gy<lvl.h; gy++) for (let gx=0; gx<lvl.w; gx++) {
        const c=lvl.grid[gy][gx];
        if (c==='.') continue;
        const [sx, sy] = this.project(gx, gy);
        renderQueue.push({ screenY: sy, draw: () => this.drawBlock(c, gx, gy, sx, sy, now) });
      }

      // 2b. Background Layer: wall decor + scattered clutter, depth-sorted
      // with everything else.
      this.pushDecor(renderQueue);

      this._charDraws = [];            // characters replayed above the tickets
      if (this.cur) {
        // 3. Chefs — feet anchor.
        for (const p of this.lerpPlayers()) {
          const [sx, sy] = this.projectEntity(p.x, p.y);
          renderQueue.push({ screenY: sy + 0.01, char: true, draw: () => this.drawChef(p, sx, sy, now) });
        }
        // 4. Customers in the waiting line.
        for (const q of this.customerQueue()) {
          const [sx, sy] = this.project(q.x, q.y);
          renderQueue.push({ screenY: sy, char: true, draw: () => this.drawCustomer(q, sx, sy, now) });
        }
      }

      // THE SORT: lower on screen ⇒ drawn later ⇒ rendered on top.
      renderQueue.sort((a, b) => a.screenY - b.screenY);
      this._labels = [];
      this._overlays = [];              // station contents — always drawn on top
      for (const item of renderQueue) {
        item.draw();
        if (item.char) this._charDraws.push(item.draw);
      }

      // Station contents (food, cook items, progress bars, counts) render ABOVE
      // the chefs, so a chef (or the AI bot) standing in front never hides what's
      // on the surface — you can always read the ingredient and its state.
      for (const o of this._overlays) o();

      // Name labels render after the whole queue so geometry never buries them.
      this.drawLabels(ctx, this._labels);

      this.drawEffects(now);
      this.drawMotes(now);
      this.drawAtmosphere();
      this.drawCharOverlay();
    }

    drawLabels(ctx, labels) {
      for (const L of labels) {
        ctx.font=`800 ${L.size}px ui-rounded,system-ui`;
        ctx.textAlign='center'; ctx.textBaseline='alphabetic';
        ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.fillText(L.text,L.x+1,L.y+1);
        ctx.fillStyle=L.color; ctx.fillText(L.text,L.x,L.y);
      }
    }

    // Replay the character sprites onto the overlay canvas, CLIPPED to the
    // ticket-band region — the slice of every chef/customer that the main
    // canvas hides behind the order cards is redrawn ABOVE them. Below the
    // band the main canvas already shows the same pixels, so the overlay
    // stays empty there (no double-draw halos on opaque sprite art).
    drawCharOverlay() {
      const o = this.octx;
      if (!o) return;
      o.setTransform(1,0,0,1,0,0);
      o.clearRect(0,0,this.overlay.width,this.overlay.height);
      if (!this._charDraws || !this._charDraws.length || !(this.bandTop > 0)) return;
      o.save();
      o.beginPath();
      o.rect(0, 0, this.overlay.width, this.bandTop + 2 * this.dpr);
      o.clip();
      o.setTransform(this.scale,0,0,this.scale,this.txOff,this.tyOff);
      // drawChef/drawCustomer render through this.ctx and push name tags into
      // this._labels — swap both out, replay, then restore the real ones.
      const realCtx = this.ctx, realLabels = this._labels, realOverlays = this._overlays, realHits = this._hits;
      this.ctx = o; this._labels = []; this._overlays = []; this._hits = [];
      for (const d of this._charDraws) d();
      for (const fn of this._overlays) fn();
      this.drawLabels(o, this._labels);
      this.ctx = realCtx; this._labels = realLabels; this._overlays = realOverlays; this._hits = realHits;
      o.restore();
      o.setTransform(1,0,0,1,0,0);
    }

    // ── Background Layer: wall-mounted decor + decorative clutter ────────────
    // Everything here goes through the same renderQueue and the same
    // drawAnchored asset path as the gameplay objects. Wall items anchor to
    // back-perimeter tiles with screenY just behind their row, so the counters
    // overlap their bottom edge and chefs always pass in front; clutter
    // crates anchor outside the island (gy < 0), peeking over the back wall.
    // ── Decor: wall-anchored items + desk clutter ────────────────────────────
    // Wall items declare `wallAnchor` in the manifest:
    //   { wall:'back'|'left', pos:<tiles along the wall>, height:<px from the
    //     floor line up to the item's bottom>, width:<draw width px> }
    // Their coordinates derive from the WALL SURFACE, never raw screen space,
    // so they stay pinned when the room resizes or the theme changes.
    pushDecor(queue) {
      // Wall fixtures (window, clock, framed art) are drawn as vector geometry
      // inside drawWall so they align to the wall by construction. Only the
      // small counter-top clutter remains here.
      const {lvl}=this;
      const desk = (key, gx, w) => {
        if (!lvl.grid[0] || lvl.grid[0][gx] === '.') return;
        const [sx, sy] = this.project(gx, 0);
        queue.push({ screenY: sy + 0.03, draw: () =>
          GFX.drawAnchored(this.ctx, key, sx, sy - BLOCK_LIFT + 2, w) });
      };
      desk('decor_vase', 0, 20);
      desk('decor_utensils', lvl.w-1, 16);
      this.pushCakeDecor(queue, lvl.decor === 'cake' ? CAKE_DECOR : this.ambience);
    }

    // Ambient decor — rugs under the floor, fixtures depth-sorted, and animated
    // bees/butterflies bobbing above the whole scene. `list` is CAKE_DECOR for
    // Cake World or the per-level generated ambience for everything else.
    pushCakeDecor(queue, list) {
      if (!list) return;
      const now = performance.now();
      const frameKey = (d) => {
        if (!d.frames) return d.key;
        const i = Math.floor(now / (1000 / (d.fps || 4)) + (d.phase || 0)) % d.frames.length;
        return d.frames[i];
      };
      for (const d of list) {
        const [sx, sy] = this.project(d.gx, d.gy);
        if (d.kind === 'rug') {
          queue.push({ screenY: -1e6, draw: () => GFX.draw(this.ctx, d.key, sx, sy + TILE_HEIGHT * 0.2, d.w, d.w) });
        } else if (d.kind === 'qrug') {
          queue.push({ screenY: -1e6 + 1, draw: () => this.drawQueueRug() });
        } else if (d.kind === 'prop') {
          const key = frameKey(d);
          queue.push({ screenY: sy, draw: () => GFX.drawAnchored(this.ctx, key, sx, sy + TILE_HEIGHT / 2 - (d.lift || 0), d.w) });
        } else if (d.kind === 'float') {
          const key = frameKey(d);
          const bob = Math.sin(now / 600 + (d.phase || 0)) * (d.bob || 0);
          queue.push({ screenY: 1e6 + sy, draw: () => GFX.draw(this.ctx, key, sx, sy - (d.lift || 50) + bob, d.w, d.w) });
        }
      }
    }

    // A soft runner + per-slot pads under the waiting line, drawn from the
    // same queueSlot geometry the customers stand on — so it fits any board.
    drawQueueRug() {
      const {ctx}=this;
      const a=this.queueSlot(0), b=this.queueSlot(QUEUE_DEPTH-1);
      const [cx, ty]=this.projectEntity(a.x, a.y);
      const [, by]=this.projectEntity(b.x, b.y);
      const wpx = TILE_WIDTH*1.15;
      const top = ty - TILE_HEIGHT*0.55, bot = by + TILE_HEIGHT*0.55;
      ctx.save();
      ctx.fillStyle='rgba(178,59,98,0.10)';
      this.rrC(ctx, cx-wpx/2, top, wpx, bot-top, 16); ctx.fill();
      ctx.lineWidth=2; ctx.strokeStyle='rgba(120,60,40,0.16)';
      this.rrC(ctx, cx-wpx/2+2.5, top+2.5, wpx-5, bot-top-5, 13); ctx.stroke();
      for (let i=0;i<QUEUE_DEPTH;i++){
        const s=this.queueSlot(i);
        const [px,py]=this.projectEntity(s.x, s.y);
        ctx.fillStyle='rgba(60,25,45,0.07)';
        ctx.beginPath(); ctx.ellipse(px,py+3,20,8,0,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // Generate set dressing for ANY kitchen from its own grid: a rug centred on
    // the open floor, sconces high on the side walls, a mascot greeter tucked
    // into a walkway corner, and a few bees/butterflies drifting over the back.
    // Seeded from the round seed so every phone sees the same arrangement.
    buildAmbience(seed) {
      const { w, h, grid } = this.lvl;
      const rand = mulberry32(((seed * 2654435761) ^ 0x9E3779B9) >>> 0);
      const D = [];
      const isFloor = (x, y) => !!grid[y] && grid[y][x] === '.';
      const floorNear = (tx, ty, maxR = 3.5) => {
        let best = null, bd = 1e9;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (!isFloor(x, y)) continue;
          const d = Math.hypot(x + 0.5 - tx, y + 0.5 - ty);
          if (d < bd) { bd = d; best = { x: x + 0.5, y: y + 0.5 }; }
        }
        return bd <= maxR ? best : null;
      };

      // a round rug under the heart of the kitchen
      const c = floorNear(w / 2, h / 2 + 0.3);
      if (c) D.push({ kind: 'rug', key: 'cw_rug_round', gx: c.x - 0.5, gy: c.y - 0.45,
        w: Math.max(120, Math.min(190, w * 15)) });

      // Floral sconces on the stage-frame posts — anchored beside a FLOOR row
      // so the roses never sit on top of an edge-column appliance (they were
      // covering the sushi level's pots at a fixed gy).
      const sconceRow = (col) => {
        for (let r = 0; r < h; r++) if (grid[r] && grid[r][col] === '.') return r + 0.2;
        return null;
      };
      const sL = sconceRow(0), sR = sconceRow(w - 1);
      if (sL !== null) D.push({ kind: 'prop', key: 'cw_wall_sconce', gx: -0.32,    gy: sL, w: 36 });
      if (sR !== null) D.push({ kind: 'prop', key: 'cw_wall_sconce', gx: w + 0.32, gy: sR, w: 36 });

      // (no mascot — Tyler's call: the purple dinosaur is permanently benched)

      // Themed wall props along the back edge — the missing mid-ground band
      // between the wallpaper and the stations (roadmap #8). The manifest's
      // wallAnchor coords were authored for a 7-wide diner wall; pos scales
      // with the room width, props keep ≥1.5 tiles spacing, and each theme
      // finally looks like itself in-round (wreath in Winter, surfboard on
      // the Beach…). Drawn as normal depth-sorted props just above row 0.
      const WALL_PROPS = {
        diner:  ['wall_sign', 'wall_window', 'wall_clock', 'wall_photos'],
        winter: ['decor_cocoa_sign', 'wall_window_winter', 'decor_wreath', 'decor_fireplace'],
        beach:  ['decor_tiki_sign', 'wall_window_beach', 'decor_surfboard', 'decor_palm'],
      };
      let lastPropX = -Infinity;
      for (const key of (WALL_PROPS[this.themeName] || WALL_PROPS.diner)) {
        const ent = (window.ASSETS || {})[key];
        const wa = ent && ent.wallAnchor;
        if (!wa) continue;
        let gx = (wa.pos / 7) * w;
        if (gx - lastPropX < 1.5) gx = lastPropX + 1.5;
        if (gx > w - 0.4) break;
        lastPropX = gx;
        D.push({ kind: 'prop', key, gx, gy: -0.12, w: wa.width,
          lift: 26 + (wa.height || 0) * 0.5 });
      }

      // Ground the customer line: a soft runner + per-slot pads under the
      // queue column — full-height characters waiting on bare floor are the
      // floatiest thing on screen (roadmap #8).
      D.push({ kind: 'qrug' });

      // Beaux-Arts walkway props (art-tracker #10): a chalkboard menu greets
      // the END of the waiting line, flour sacks lean on the bottom-left
      // post, and a fiddle-leaf plant tops the queue-side corner — all just
      // OUTSIDE the room so they never crowd a station or a walkway.
      const lastSlot = this.queueSlot(QUEUE_DEPTH - 1);
      D.push({ kind: 'prop', key: 'prop_chalkboard',  gx: lastSlot.x, gy: Math.min(h - 0.15, lastSlot.y + 1.05), w: 46 });
      D.push({ kind: 'prop', key: 'prop_flour_sacks', gx: -0.38, gy: h - 0.55, w: 44 });
      D.push({ kind: 'prop', key: 'prop_fiddle_leaf', gx: w + 0.85, gy: 0.3, w: 38 });

      // bees & butterflies drifting over the back half of the room
      const n = Math.max(2, Math.min(4, Math.round((w * h) / 18)));
      const FLIERS = [
        { fps: 9,   w: 28, lift: 54, bob: 7,  frames: ['cw_bee_1', 'cw_bee_2', 'cw_bee_3'] },
        { fps: 5.5, w: 34, lift: 48, bob: 10, frames: ['cw_butterfly_1', 'cw_butterfly_2', 'cw_butterfly_3'] },
      ];
      for (let i = 0; i < n; i++) {
        const f = FLIERS[i % 2];
        D.push({ kind: 'float', fps: f.fps, bob: f.bob,
          w: f.w + Math.round(rand() * 6 - 3), lift: f.lift + rand() * 18,
          phase: rand() * 6.28,
          gx: 0.8 + rand() * (w - 1.6), gy: 0.6 + rand() * (h * 0.45) });
      }
      return D;
    }

    // ── Painted scene: wall illustration + glossy checker floor ──────────────
    // Drawn in DEVICE space (full canvas) so it bleeds to every edge. The wall
    // art is cover-fit across the width and bottom-anchored to the room's floor
    // line; its own floor strip is cropped off (floorLine) and our checker
    // continues underneath, as deep as the grid needs.
    drawScene() {
      // Flat image board: the wood board is the .canvas-wrap CSS background and
      // shows through the transparent canvas — skip the procedural floor + wall.
      if (USE_IMAGE_BOARD) return;
      const {ctx,canvas}=this, m=this.wallMeta;
      const W=canvas.width, H=canvas.height;
      const floorY = Math.round(this.tyOff + this.oy*this.scale); // room floor line

      // ---- glossy checker floor: from the floor line to the bottom edge ----
      const pat = this.floorPattern();
      if (pat) { ctx.fillStyle=pat; } else { ctx.fillStyle=m.floorA; }
      ctx.fillRect(0, Math.max(0,floorY), W, H-Math.max(0,floorY));
      // depth: darken toward the back of the floor (under the wall) + warm pool
      const fg=ctx.createLinearGradient(0,floorY,0,H);
      fg.addColorStop(0,'rgba(30,12,20,0.22)');
      fg.addColorStop(0.18,'rgba(30,12,20,0)');
      fg.addColorStop(1,'rgba(255,240,210,0.05)');
      ctx.fillStyle=fg; ctx.fillRect(0,floorY,W,H-floorY);

      // ---- wall illustration above the floor line ----
      const img=GFX.img(m.key);
      if (img && img.width) {
        const srcH=Math.round(img.height*m.floorLine);   // wall portion only
        // cover BOTH axes: fill the width, and guarantee the band reaches the
        // top edge (real art, no stretched filler strip). Slight side crop is
        // fine — the wall is a continuous illustration.
        const scale=Math.max(W/img.width, floorY/srcH);
        const drawW=img.width*scale, drawH=srcH*scale;
        const dx=Math.round((W-drawW)/2), dy=Math.round(floorY-drawH);
        ctx.drawImage(img, 0,0, img.width,srcH, dx,dy, drawW,drawH);
      } else {
        ctx.fillStyle=this.theme.wallBot||'#F4D9E6'; ctx.fillRect(0,0,W,floorY);
      }

      // contact shadow where the wall meets the floor (grounds the room)
      const ws=ctx.createLinearGradient(0,floorY-10,0,floorY+12);
      ws.addColorStop(0,'rgba(0,0,0,0)'); ws.addColorStop(1,'rgba(20,8,16,0.20)');
      ctx.fillStyle=ws; ctx.fillRect(0,floorY-10,W,22);
    }

    // The wallpaper drawn in WORLD coordinates: floor spans the room + a
    // 2-tile apron per side, and the image's wall/floor boundary (trim
    // fraction from the top) lands at world y = oy - 8, so the painted floor
    // and the grid floor are the same surface. Rooms whose floor slice is
    // shallow zoom in until the floor covers the play depth; wall-only strips
    // (trim ≈ 1) sit above the room over a procedural checker floor.
    drawWorldBackdrop() {
      if (!this._backdropKey) return false;
      const img = GFX.img(this._backdropKey);
      if (!img || !img.width) return false;     // CSS bleed shows until ready
      const { ctx, canvas, lvl } = this;
      const trim = this._backdropTrim;
      const aspect = img.height / img.width;
      const wallOnly = trim >= 0.97;
      const widthFit  = (lvl.w + 4) * TILE_WIDTH * this.scale;
      const floorNeed = (lvl.h * TILE_HEIGHT + 60) * this.scale;
      const heightFit = wallOnly ? 0 : (floorNeed / (1 - trim)) / aspect;
      const drawW = Math.max(widthFit, heightFit);
      const drawH = drawW * aspect;
      const cx = this.txOff + (this.ox + lvl.w * TILE_WIDTH / 2) * this.scale;
      const trimY = this.tyOff + (this.oy - 8) * this.scale;
      if (wallOnly) {
        // wall strips carry no floor — the theme's glossy checker stands in
        const pat = this.floorPattern();
        ctx.fillStyle = pat || this.wallMeta.floorA;
        ctx.fillRect(0, Math.max(0, trimY), canvas.width, canvas.height - Math.max(0, trimY));
      }
      ctx.drawImage(img, cx - drawW / 2, trimY - drawH * trim, drawW, drawH);
      return true;
    }

    drawBoardFrame() {
      const {ctx,lvl}=this;
      const x = Math.round(this.txOff + (this.ox - 12) * this.scale);
      const y = Math.round(this.tyOff + (this.oy - 14) * this.scale);
      const w = Math.round((lvl.w * TILE_WIDTH + 24) * this.scale);
      const h = Math.round((lvl.h * TILE_HEIGHT + 46) * this.scale); // include front-row faces
      const r = Math.max(16, Math.round(20 * this.scale));
      if (w <= 0 || h <= 0) return;

      ctx.save();
      ctx.shadowColor = 'rgba(58,36,64,0.26)';
      ctx.shadowBlur = Math.max(10, 18 * this.scale);
      ctx.shadowOffsetY = Math.max(2, 4 * this.scale);
      ctx.fillStyle = 'rgba(255,246,234,0.10)';
      this.rrC(ctx, x, y, w, h, r);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // Ground the room ON the wallpaper instead of floating over it: a warm
      // light pooled at the centre of the floor, ambient occlusion under the
      // back row, and a soft inner shadow around the whole frame. This is what
      // melts the sprite island into the photo backdrop.
      ctx.save();
      this.rrC(ctx, x, y, w, h, r);
      ctx.clip();
      const sheen = ctx.createRadialGradient(x + w / 2, y + h * 0.42, Math.min(w, h) * 0.18,
                                             x + w / 2, y + h * 0.55, Math.max(w, h) * 0.72);
      sheen.addColorStop(0, 'rgba(255,244,224,0.17)');
      sheen.addColorStop(0.55, 'rgba(255,235,214,0.05)');
      sheen.addColorStop(1, 'rgba(74,38,64,0.14)');
      ctx.fillStyle = sheen; ctx.fillRect(x, y, w, h);
      const aoH = Math.max(20, 36 * this.scale);
      const ao = ctx.createLinearGradient(0, y, 0, y + aoH);
      ao.addColorStop(0, 'rgba(58,26,48,0.20)');
      ao.addColorStop(1, 'rgba(58,26,48,0)');
      ctx.fillStyle = ao; ctx.fillRect(x, y, w, aoH);
      ctx.lineWidth = Math.max(12, 18 * this.scale);
      ctx.strokeStyle = 'rgba(58,26,48,0.10)';
      this.rrC(ctx, x, y, w, h, r);
      ctx.stroke();               // clipped: only the inner half of the stroke shows
      ctx.restore();
      const strokeW = Math.max(3, 5 * this.scale);
      ctx.lineWidth = strokeW;
      ctx.strokeStyle = '#A86A22';
      this.rrC(ctx, x + strokeW * 0.5, y + strokeW * 0.5, w - strokeW, h - strokeW, Math.max(4, r - strokeW));
      ctx.stroke();
      ctx.lineWidth = Math.max(1.5, 2.2 * this.scale);
      ctx.strokeStyle = '#F0C15A';
      this.rrC(ctx, x + strokeW, y + strokeW, w - strokeW * 2, h - strokeW * 2, Math.max(4, r - strokeW * 1.4));
      ctx.stroke();
      ctx.restore();
    }

    // Cached glossy checkerboard pattern in the theme's real floor colours —
    // saturated, polished cells with a top-left gloss highlight, soft inner
    // shade, and grout. Built once per theme (device-pixel sized).
    floorPattern() {
      const patKey = `${this.themeName}:${Math.round(this.scale * 1000)}`;
      if (this._floorPat && this._floorPatKey===patKey) return this._floorPat;
      const m=this.wallMeta;
      const S=Math.max(40, Math.round(TILE_WIDTH*this.scale*0.92)); // cell px
      const c=document.createElement('canvas'); c.width=c.height=S*2;
      const x=c.getContext('2d');
      const cell=(cx,cy,col)=>{
        x.fillStyle=col; x.fillRect(cx,cy,S,S);
        const g=x.createRadialGradient(cx+S*0.34,cy+S*0.30,S*0.04,cx+S*0.55,cy+S*0.6,S*0.95);
        g.addColorStop(0,'rgba(255,255,255,0.34)');
        g.addColorStop(0.45,'rgba(255,255,255,0.06)');
        g.addColorStop(1,'rgba(0,0,0,0.16)');
        x.fillStyle=g; x.fillRect(cx,cy,S,S);
        x.fillStyle='rgba(255,246,234,0.42)';
        x.beginPath(); x.arc(cx+S*0.76,cy+S*0.22,Math.max(1,S*0.025),0,Math.PI*2); x.fill();
        x.fillStyle='rgba(255,234,246,0.35)';
        x.beginPath(); x.arc(cx+S*0.22,cy+S*0.72,Math.max(1,S*0.018),0,Math.PI*2); x.fill();
        x.strokeStyle='rgba(90,54,100,0.18)'; x.lineWidth=Math.max(1.5,S*0.03);
        x.strokeRect(cx+0.75,cy+0.75,S-1.5,S-1.5);
      };
      cell(0,0,m.floorA); cell(S,0,m.floorB);
      cell(0,S,m.floorB); cell(S,S,m.floorA);
      this._floorPat=this.ctx.createPattern(c,'repeat');
      this._floorPatKey=patKey;
      return this._floorPat;
    }

    // Soft elliptical contact shadow that grounds any object on the floor.
    // A radial gradient gives it a real penumbra (no hard edge) so it reads as
    // a shadow rather than a painted blob.
    contactShadow(cx, cy, rx, ry, alpha) {
      const {ctx}=this;
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(1, ry/rx);
      const g=ctx.createRadialGradient(0,0,rx*0.2,0,0,rx);
      g.addColorStop(0,`rgba(36,16,25,${alpha})`);
      g.addColorStop(0.6,`rgba(36,16,25,${alpha*0.65})`);
      g.addColorStop(1,'rgba(36,16,25,0)');
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.arc(0,0,rx,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Cinematic finish: unifying colour grade + ambient top-light + corner
    // vignette, in device space.
    drawAtmosphere() {
      const {ctx}=this;
      ctx.save();
      ctx.setTransform(1,0,0,1,0,0);
      const W=this.canvas.width, H=this.canvas.height;
      // one warm grade over EVERYTHING (sprites + wallpaper alike) — the single
      // cheapest trick for making mixed art sources feel lit by the same room
      ctx.globalCompositeOperation='soft-light';
      ctx.fillStyle='rgba(255,186,145,0.20)';
      ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation='source-over';
      // bright warm top light (adds glow, never dulls the saturated art)
      const amb=ctx.createLinearGradient(0,0,0,H);
      amb.addColorStop(0,'rgba(255,250,235,0.14)');
      amb.addColorStop(0.45,'rgba(255,255,255,0)');
      ctx.fillStyle=amb; ctx.fillRect(0,0,W,H);
      // whisper-soft vignette — just enough to frame, edges stay vibrant
      const vg=ctx.createRadialGradient(W/2,H*0.44,Math.min(W,H)*0.34,W/2,H*0.52,Math.max(W,H)*0.78);
      vg.addColorStop(0,'rgba(0,0,0,0)');
      vg.addColorStop(1,'rgba(24,10,28,0.16)');
      ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
      // dim the top band a touch so the wallpaper's wall recedes behind the
      // tickets and the lit kitchen below reads as the subject
      const tb=ctx.createLinearGradient(0,0,0,H*0.2);
      tb.addColorStop(0,'rgba(40,16,44,0.14)');
      tb.addColorStop(1,'rgba(40,16,44,0)');
      ctx.fillStyle=tb; ctx.fillRect(0,0,W,H*0.2);
      ctx.restore();
    }

    // Lighten (+) or darken (−) a hex colour by a fraction.
    shade(hex, f) {
      const n=parseInt(hex.slice(1),16);
      let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
      const t=f<0?0:255, a=Math.abs(f);
      r=Math.round(r+(t-r)*a); g=Math.round(g+(t-g)*a); b=Math.round(b+(t-b)*a);
      return `rgb(${r},${g},${b})`;
    }

    // ── Blocks (counters, stations, crates) + whatever sits on them ──────────
    // Stations/counters face into the room based on which wall they sit on:
    //   top/back wall (gy 0) → front   ·   left wall (gx 0) → face right
    //   right wall (gx w-1)  → face left ·  bottom wall / interior → front
    // Uses the directional sprite variant (<key>_left / <key>_right) when it
    // exists, otherwise falls back to the straight front image.
    faceKey(key, gx, gy) {
      // An explicit per-tile facing (from the builder) overrides the wall rule.
      const explicit = this.lvl.facings && this.lvl.facings[`${gx},${gy}`];
      let dir = null;
      if (explicit === 'left' || explicit === 'right') {
        dir = explicit;
      } else if (explicit === 'straight') {
        dir = null;                           // forced front even on a side wall
      } else {
        const w = this.lvl.w;
        if (gy === 0) dir = null;             // top/back wall → front
        else if (gx === 0) dir = 'right';     // against the left wall → face right
        else if (gx === w - 1) dir = 'left';  // against the right wall → face left
      }
      if (!dir) return key;
      const variant = `${key}_${dir}`;
      return GFX.has(variant) ? variant : key;
    }

    isCakeWorld() {
      return this.lvl.decor === 'cake' || this.lvl.levelId === 'cake-sweet-beginnings';
    }

    stationArtKey(key) {
      if (this.isCakeWorld()) return key;
      const plain = PLAIN_STATION_KEY[key];
      return plain && GFX.has(plain) ? plain : key;
    }

    // ── Merged island shadows — design-roadmap #7 ─────────────────────────
    // A real counter run casts ONE continuous shadow, not a chain of scalloped
    // per-tile blobs. Maximal horizontal runs (len ≥ 2) of non-floor tiles get
    // a single soft pill at their base; isolated stations keep their ellipse.
    shadowRuns() {
      if (this._runs) return this._runs;
      const {lvl}=this;
      const runs=[]; this._runTiles=new Set();
      for (let gy=0; gy<lvl.h; gy++) {
        let gx=0;
        while (gx<lvl.w) {
          if (!lvl.grid[gy] || lvl.grid[gy][gx]==='.') { gx++; continue; }
          let end=gx;
          while (end+1<lvl.w && lvl.grid[gy][end+1]!=='.') end++;
          if (end>gx) {
            runs.push({ gy, gx0:gx, gx1:end });
            for (let x=gx;x<=end;x++) this._runTiles.add(`${x},${gy}`);
          }
          gx=end+1;
        }
      }
      this._runs=runs;
      return runs;
    }

    drawRunShadows() {
      const {ctx}=this;
      const TW=TILE_WIDTH, TH=TILE_HEIGHT;
      for (const r of this.shadowRuns()) {
        const x0=this.ox + r.gx0*TW + TW*0.03;
        const x1=this.ox + (r.gx1+1)*TW - TW*0.03;
        const cy=this.oy + (r.gy+1)*TH - 3;
        // Concentric pills fake a soft blur: faint wide rim → dark core
        // (stacked alphas sum to ~0.26 at the centre, the per-tile value).
        for (const [inset, a] of [[0,0.05],[3.5,0.07],[7,0.08],[10,0.09]]) {
          const h=22 - inset*1.4;
          const w=(x1-x0)-inset*2;
          if (h<=2 || w<=h) break;
          ctx.fillStyle=`rgba(36,16,25,${a})`;
          this.rrC(ctx, x0+inset, cy-h/2, w, h, h/2);
          ctx.fill();
        }
      }
    }

    drawBlock(c, gx, gy, sx, sy, now) {
      const {ctx}=this;
      const TW=TILE_WIDTH, TH=TILE_HEIGHT;
      const baseY = sy + TH/2;            // tile's south corner — ground anchor
      const ing = this.lvl.crates && this.lvl.crates[c];

      // Contact shadow under the block's footprint so nothing floats —
      // skipped inside merged runs, which draw one shared shadow mass.
      if (!this._runTiles || !this._runTiles.has(`${gx},${gy}`))
        this.contactShadow(sx, baseY-3, TW*0.47, 9, 0.21);

      // Crates: per-ingredient art if the manifest has it, otherwise the
      // flat generic crate with the raw ingredient sprite in its open top.
      if (ing) {
        const cKey = this.faceKey(GFX.has('crate_'+ing) ? 'crate_'+ing : 'crate', gx, gy);
        const rect = GFX.drawAnchored(ctx, cKey, sx, baseY - 1, TW*SPRITE_FILL, isoFixFor(cKey));
        if (rect) {
          if (cKey === 'crate') this.drawBare({ id: ing, state: 'raw' }, sx, rect.y + rect.h*0.30, 16);
          this._hits.push({ ...rect, gx, gy, key: cKey, d: sy });
          this._hits.push({ x: this.ox + gx*TW, y: this.oy + gy*TH - BLOCK_LIFT, w: TW, h: TH + BLOCK_LIFT, gx, gy, key: cKey, d: sy, tile: true });
          return;
        }
        // crate art still loading — fall through to the counter path
      }

      const s = this.cur && this.cur.stations[`${gx},${gy}`];

      // Bottom-anchored, aspect-true, at SPRITE_FILL of the tile width so
      // counters get visual air between them (grid coords unchanged).
      // Stations with state-variant art swap sprites live. Every drawn rect
      // registers as a precise hit region for reverse-depth click picking.
      let key = STATION_KEY[c] || 'counter';
      if (c==='B' && s && s.item && s.item.state === 'raw') key='chopping_board_active';
      // Cook stations are now always sent (for the fill count); only swap to the
      // "full"/active art once something's actually in them or they're cooking.
      const cookActive = s && s.contents && (s.contents.length || s.state !== 'idle');
      if (c==='S' && cookActive) key=(s.state==='cooking'||s.state==='done'||s.state==='burned') ? 'stove_fire' : 'stove_full';
      if (c==='O' && cookActive) key=(s.state==='cooking'||s.state==='done'||s.state==='burned') ? 'pot_active' : 'pot_full';
      if (c==='V' && cookActive) key=(s.state==='cooking'||s.state==='done'||s.state==='burned') ? 'oven_active' : 'oven';
      if (c==='K' && s && s.dirty > 0) key='sink_dirty';
      // Cake World: the mixing bowl shows its "full" art while it holds
      // ingredients/batter (filling, mixing, or done).
      if (c==='M' && s && s.contents && s.contents.length) key='mixing_bowl_full';

      if (!this.isCakeWorld()) {
        if (c==='P' && this.cur && this.cur.plates!==undefined) {
          const supply = this.cur.plates;
          const clean = supply===null ? 4 : Math.max(0, Math.min(4, Math.floor(supply || 0)));
          key = `plate_stack_clean_${clean}`;
        }
        if (c==='K' && s && s.dirty!==undefined) {
          const dirty = Math.max(0, Math.min(4, Math.floor(s.dirty || 0)));
          key = `sink_dirty_${dirty}`;
        }
      }

      const stateKey = key;
      key = this.faceKey(this.stationArtKey(key), gx, gy);
      let rect = GFX.drawAnchored(ctx, key, sx, baseY, TW*SPRITE_FILL, isoFixFor(key));
      if (!rect) {
        key = this.faceKey(this.stationArtKey('counter'), gx, gy);
        rect = GFX.drawAnchored(ctx, key, sx, baseY, TW*SPRITE_FILL, isoFixFor(key));
      }
      if (rect) {
        this._hits.push({ ...rect, gx, gy, key, d: sy });
        this._hits.push({ x: this.ox + gx*TW, y: this.oy + gy*TH - BLOCK_LIFT, w: TW, h: TH + BLOCK_LIFT, gx, gy, key, d: sy, tile: true });
      }
      const topY = sy - BLOCK_LIFT;

      // Everything that sits ON the surface (ingredients, cook contents, progress
      // bars, counts) is deferred to the always-on-top overlay pass so a chef
      // standing in front can never hide it.
      this._overlays.push(() => {
        // Crates without dedicated art: counter + ingredient sprite on top.
        if (ing) this.drawBare({id:ing, state:'raw'}, sx, topY - 5, 17);

        // Clean-plate count on the dish rack. Drawn BEFORE the `!s` bail below:
        // plate-stack tiles carry no per-station dynamic state, so `s` is
        // undefined for them — the supply count lives on the global cur.plates.
        if (c==='P' && this.cur && this.cur.plates!==undefined) {
          const supply=this.cur.plates;
          const label=supply===null?'∞':String(supply);
          // count pinned RIGHT AT the sprite's top-right corner (the rack art
          // itself carries the plate stack — count variants 0-4)
          if (rect) this.countBadge(rect.x + rect.w - 8, rect.y - 6, label, supply===0, '#FF4070');
          else this.countBadge(sx+20, topY-28, label, supply===0, '#FF4070');
        }

        if (!s) return;

        if (s.item) {
          this.drawItem(s.item, sx, topY - 4, 23);
          if (c==='B' && s.item.state==='raw' && s.progress>0)
            this.bar(sx, topY - 28, s.progress, '#3DC9A0','#A8F0D8');
        }
        if (s.dirty!==undefined) {
          // The dirty-sink render already shows piled plates; don't double up.
          if (stateKey !== 'sink_dirty' && !/^sink_dirty_\d$/.test(stateKey)) {
            const n=Math.min(s.dirty,3);
            for(let i=0;i<n;i++) GFX.draw(ctx,'plate',sx,topY-2-i*4,40,40);
          }
          if (s.dirty>0) this.glyph('🫧',sx+13,topY-16,13);
          if (s.progress>0) this.bar(sx, topY - 28, s.progress, '#5BADDE','#A8D8F8');
          // Dirty count pinned right at the sink's top-right corner —
          // mirrors the clean-plate count on the dish rack.
          if (rect) this.countBadge(rect.x + rect.w - 8, rect.y - 6, s.dirty, s.dirty>0, '#3E9BD6');
          else this.countBadge(sx+20, topY-46, s.dirty, s.dirty>0, '#3E9BD6');
        }
        if (s.contents) {
          const n=s.contents.length;
          s.contents.forEach((it,i)=>{
            const off=n>1?(i-(n-1)/2)*10:0;
            this.drawItem(it,sx+off,topY-5,n>1?17:23,false);
          });
          // Fill count on multi-item cookers (pots/ovens/mixers): while adding
          // ingredients it's hard to eyeball how many are in, so always show
          // 0 / 1 / 2 / 3. Once it's cooking, the progress bar takes over.
          if ((c==='O'||c==='V'||c==='M') && s.state==='idle') {
            this.countBadge(sx+19, topY-12, n, n>0, '#F5943B');
          }
          if (s.state==='cooking') {
            this.bar(sx, topY - 28, s.progress, '#FFD23F','#FFF0A0');
            // Soft procedural steam instead of the flickering 💨 emoji —
            // readable "cooking" state from across the room (roadmap #9).
            this.spawnSteam(gx, gy, sx, topY - 6, now);
          } else if (s.state==='done') {
            this.bar(sx, topY - 28, s.progress, s.progress>0.6?'#FF6040':'#3DC9A0', s.progress>0.6?'#FFA090':'#A8F0D8');
            this.glyph('✅',sx+15,topY-18,12);
          } else if (s.state==='burned') {
            if(Math.floor(now/250)%2) this.glyph('💨',sx,topY-20,17);
          }
        }
      });
    }

    // ── Chef ──────────────────────────────────────────────────────────────────
    drawChef(p, sx, sy, now) {
      const {ctx}=this;
      const bounce=p.moving?Math.abs(Math.sin(now/88))*3:0;
      const col=this.colorOf[p.id]||PLAYER_COLORS[0];
      const isMe=p.id===this.myId;
      const chefKey = GFX.has(p.chef) ? p.chef : 'chef';

      const H = CHEF_H * this.charScale;
      // Clean base: a single soft ground shadow. Player identity lives in
      // the floating name tag (multiplayer requirement), not base clutter.
      this.contactShadow(sx, sy, 17 * this.charScale, 6 * this.charScale, 0.24);

      const headTopY = sy - bounce - H;
      GFX.draw(ctx,chefKey,sx,sy-bounce-H*0.52,H*0.85,H);

      // Held item rides at the WAIST, overlaid on the chef — visible even when
      // the chef is at the top of the screen (an above-the-head item clipped).
      if (p.carry) {
        const carryY = sy - bounce - H * 0.42;
        if (p.carry.kind==='plate') this.drawPlate(p.carry,sx,carryY,22);
        else this.drawItem(p.carry,sx,carryY,20);
      }
      if (p.queue && p.queue.length) {
        this.drawActionQueue(p.queue, sx, headTopY - 10);
      }

      this._labels.push({
        // Centered right above the chef's head (multiplayer identification).
        text: isMe?'You':p.name, x: sx, y: headTopY - 6,
        size: 11, color: isMe?col:'rgba(20,8,40,0.85)',
      });
    }

    actionEmoji(action) {
      if (!action) return '•';
      if (action.type === 'crate') return itemEmoji({ id: action.ing, state: 'raw' });
      if (action.type === 'board') return '🔪';
      if (action.type === 'plates') return '🍽️';
      if (action.type === 'sink') return '🫧';
      if (action.type === 'serve') return '✅';
      if (action.type === 'trash') return '🗑️';
      if (action.type === 'cook') return action.tool === 'pot' ? '🥘' : action.tool === 'oven' ? '🔥' : '🍳';
      return '›';
    }

    drawActionQueue(queue, sx, y) {
      const {ctx}=this;
      const shown=queue.slice(0,5);
      const r=8, gap=4;
      const total=shown.length*(r*2)+(shown.length-1)*gap;
      let x=sx-total/2+r;
      ctx.save();
      for (const action of shown) {
        ctx.fillStyle='rgba(255,255,255,0.92)';
        ctx.strokeStyle='rgba(45,22,52,0.26)';
        ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
        this.glyph(this.actionEmoji(action),x,y,10);
        x+=r*2+gap;
      }
      if (queue.length>shown.length) {
        ctx.fillStyle='rgba(45,22,52,0.82)';
        ctx.font='800 9px ui-rounded,system-ui';
        ctx.textAlign='left'; ctx.textBaseline='middle';
        ctx.fillText(`+${queue.length-shown.length}`,x-r+1,y);
      }
      ctx.restore();
    }

    // ── Customer waiting line ─────────────────────────────────────────────────
    // Slot i targets the vertical column just outside the right wall (see
    // queueSlot). Smoothed per-order positions make the whole line glide
    // forward when the front customer is served.
    customerQueue() {
      if (!this.cur || !this.cur.orders) return [];
      const {lvl}=this;
      const orders=this.cur.orders.slice(0,5);
      const ids=new Set(orders.map(o=>o.id));
      for (const id of this.qPos.keys()) if (!ids.has(id)) this.qPos.delete(id);

      const out=[];
      orders.forEach((order,i)=>{
        const slot = this.queueSlot(i);
        let pos=this.qPos.get(order.id);
        if (!pos) {                          // walk in from down the line
          const sp = this.queueSlot(i+3);
          pos={x:sp.x, y:sp.y}; this.qPos.set(order.id,pos);
        }
        pos.x += (slot.x-pos.x)*0.10;
        pos.y += (slot.y-pos.y)*0.10;
        out.push({ order, i, x:pos.x, y:pos.y,
          urgency: 1 - Math.max(0,order.ttl)/order.ttlMax });
      });
      return out;
    }

    drawCustomer(q, sx, sy, now) {
      const {ctx}=this;
      const CH=CUSTOMER_H * this.charScale;
      const bob=Math.sin(now/320+q.i*2.1);

      // grounding shadow so the waiting line doesn't float on the walkway
      this.contactShadow(sx, sy+4, 16 * this.charScale, 6 * this.charScale, 0.20);
      GFX.draw(ctx, this.customerKeyForOrder(q.order), sx, sy+bob-CH*0.5, CH*0.92, CH);
    }

    // ── Ambient life: steam wisps + dust motes — design-roadmap #9 ──────────
    spawnSteam(gx, gy, x, y, now) {
      if (!this._lastSteam) this._lastSteam = new Map();
      const k = `${gx},${gy}`;
      if (now - (this._lastSteam.get(k) || 0) < 400) return;
      this._lastSteam.set(k, now);
      this.fx.push({ kind:'steam', x: x + (Math.random()*10-5), y, t:0, sway: Math.random()*Math.PI*2 });
    }

    drawMotes(now) {
      if (!this._motes) return;
      const {ctx}=this;
      const W=this.lvl.w*TILE_WIDTH, H=this.lvl.h*TILE_HEIGHT*0.55;
      const dt=1/60;
      for (const m of this._motes) {
        m.x=(m.x+m.vx*dt+W)%W; m.y=(m.y+m.vy*dt+H)%H;
        const a=0.22*(0.6+0.4*Math.sin(now/900+m.ph));
        ctx.fillStyle=`rgba(255,244,220,${a})`;
        ctx.beginPath(); ctx.arc(this.ox+m.x, this.oy+m.y, m.r, 0, Math.PI*2); ctx.fill();
      }
    }

    // ── Particle effects (world space, after the queue = always on top) ──────
    drawEffects(now) {
      const {ctx}=this;
      const ts=38;
      this.fx=this.fx.filter((f)=>{
        f.t+=1/60;
        if(f.kind==='steam'){
          const life=1.6, a=(1-f.t/life)*0.28; if(a<=0) return false;
          const r=4+(f.t/life)*7;
          const x=f.x+Math.sin(f.sway+f.t*3)*4, y=f.y-f.t*22;
          const g=ctx.createRadialGradient(x,y,r*0.2,x,y,r);
          g.addColorStop(0,`rgba(255,255,255,${a})`);
          g.addColorStop(1,'rgba(255,255,255,0)');
          ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
        } else if(f.kind==='ripple'){
          const a=1-f.t/0.4; if(a<=0) return false;
          ctx.strokeStyle=`rgba(255,111,174,${a*0.8})`; ctx.lineWidth=2;
          ctx.beginPath(); ctx.arc(f.x,f.y,(f.t/0.4)*ts*0.7,0,Math.PI*2); ctx.stroke();
        } else if(f.kind==='points'){
          const a=1-f.t/1.2; if(a<=0) return false;
          const sz=ts*(f.big?0.64:0.44);
          ctx.font=`900 ${sz}px ui-rounded,system-ui`;
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.globalAlpha=Math.min(1,a*2)*0.4; ctx.fillStyle='#000';
          ctx.fillText(f.text,f.x+1,f.y-f.t*ts*1.2+1);
          ctx.globalAlpha=Math.min(1,a*2); ctx.fillStyle=f.color||'#3DC9A0';
          ctx.fillText(f.text,f.x,f.y-f.t*ts*1.2); ctx.globalAlpha=1;
        } else if(f.kind==='pop'){
          const a=1-f.t/0.65; if(a<=0) return false;
          ctx.globalAlpha=a; this.glyph(f.text,f.x,f.y-f.t*ts,ts*0.54); ctx.globalAlpha=1;
        } else if(f.kind==='coin'){
          if(f.t>1.0) return false;
          f.vy += 0.45; f.x += f.vx; f.y += f.vy; f.rot += f.vrot;
          const a = Math.max(0, 1 - f.t * 1.1);
          ctx.save(); ctx.globalAlpha = a; ctx.translate(f.x, f.y); ctx.rotate(f.rot);
          const r = f.size * Math.abs(Math.cos(f.rot * 2 + 0.5)); // spin squish
          const cg = ctx.createRadialGradient(-r*0.3,-r*0.3,r*0.05,0,0,r+1);
          cg.addColorStop(0,'#FFF0A0'); cg.addColorStop(0.5,'#FFD700'); cg.addColorStop(1,'#B8860B');
          ctx.fillStyle=cg; ctx.beginPath(); ctx.ellipse(0,0,r,f.size,0,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle='#B8860B'; ctx.lineWidth=Math.max(1,f.size*0.1); ctx.stroke();
          ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-r*0.2,-r*0.25,r*0.3,r*0.18,0.5,0,Math.PI*2); ctx.fill();
          ctx.restore(); ctx.globalAlpha=1;
        } else if(f.kind==='ring'){
          if(f.t>0.55) return false;
          const prog = f.t/0.55;
          const a = Math.max(0, 1-prog*1.4);
          const r = f.maxR * this.easeOut(prog);
          for(let si=0;si<8;si++){
            const sa=si/8*Math.PI*2+f.t*3;
            // Flatten the ring vertically so it hugs the iso counter top.
            const px2=f.x+Math.cos(sa)*r, py2=f.y+Math.sin(sa)*r*0.5;
            ctx.save(); ctx.globalAlpha=a; ctx.translate(px2,py2); ctx.rotate(sa+f.t*5);
            ctx.fillStyle=f.color;
            const sr=ts*0.07;
            ctx.beginPath();
            for(let p=0;p<8;p++){
              const pr=p%2===0?sr:sr*0.45, pa=p/8*Math.PI*2;
              p===0?ctx.moveTo(Math.cos(pa)*pr,Math.sin(pa)*pr):ctx.lineTo(Math.cos(pa)*pr,Math.sin(pa)*pr);
            }
            ctx.closePath(); ctx.fill(); ctx.restore(); ctx.globalAlpha=1;
          }
        } else if(f.kind==='confetti'){
          if(f.t>1.1) return false;
          f.vy+=0.28; f.x+=f.vx; f.y+=f.vy; f.rot=(f.rot||0)+0.16;
          const a=Math.max(0,1-f.t*0.9);
          ctx.globalAlpha=a; ctx.fillStyle=f.color;
          const sz=5.5;
          ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.rot);
          if(f.shape===0){ ctx.beginPath(); ctx.arc(0,0,sz*0.55,0,Math.PI*2); ctx.fill(); }
          else if(f.shape===1){ if(ctx.roundRect) ctx.roundRect(-sz/2,-sz/2,sz,sz,sz*0.3); else ctx.rect(-sz/2,-sz/2,sz,sz); ctx.fill(); }
          else { ctx.beginPath(); ctx.moveTo(0,-sz*0.6); ctx.lineTo(sz*0.55,sz*0.45); ctx.lineTo(-sz*0.55,sz*0.45); ctx.closePath(); ctx.fill(); }
          ctx.restore(); ctx.globalAlpha=1;
        }
        return true;
      });
    }

    // ── Item rendering — image sprites only ──────────────────────────────────
    drawItem(item,x,y,size,chip=false){
      if(item.kind==='plate'){this.drawPlate(item,x,y,size);return;}
      if(item.kind==='stack'){this.drawStack(item,x,y,size);return;}
      this.drawBare(item,x,y,size);
    }
    drawBare(item,x,y,size){
      if(GFX.draw(this.ctx,itemKey(item),x,y,size*1.7,size*1.7)) return;
      this.glyph(itemEmoji(item),x,y,size); // only if even the placeholder is missing
    }
    drawStack(stack,x,y,size){
      // A "stack" is a handheld combo (bun + patty, fish taco, etc.) — the
      // bun/tortilla IS the vessel, so render the items directly with NO plate
      // underneath. Plates only appear once a real plate has been grabbed.
      stack.contents.forEach((it,i)=>this.drawBare(it,x,y-i*size*0.2,size*0.9));
    }
    drawPlate(plate,x,y,size){
      GFX.draw(this.ctx,'plate',x,y,size*1.9,size*1.1);
      const n=plate.contents.length;
      plate.contents.forEach((it,i)=>this.drawBare(it,x+(i-(n-1)/2)*size*0.34,y-size*0.16,size*0.55));
    }

    // Progress bar floating over a block top (gameplay affordance).
    bar(cx,topY,frac,colorA,colorB){
      const {ctx}=this;
      const w=40, h=5.5, x0=cx-w/2, y0=topY;
      ctx.fillStyle='rgba(0,0,0,0.28)'; this.rrC(ctx,x0,y0,w,h,h/2); ctx.fill();
      const fw=Math.max(w*Math.min(frac,1),h*0.6);
      const bg=ctx.createLinearGradient(x0,y0,x0+fw,y0);
      bg.addColorStop(0,colorB||colorA); bg.addColorStop(1,colorA);
      ctx.fillStyle=bg; this.rrC(ctx,x0,y0,fw,h,h/2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.38)';
      this.rrC(ctx,x0+h*0.3,y0+h*0.15,fw-h*0.6,h*0.45,h*0.2); ctx.fill();
    }
    // Number pill centred at (cx, topY) — clean-plate supply on the rack, dirty
    // count on the sink. `accent` tints it (red rack = empty, blue sink = dirty).
    countBadge(cx, topY, label, accent, accentColor) {
      const {ctx}=this; label=String(label);
      const bw=Math.max(18, 12 + label.length*7), bh=17, bx=cx-bw/2, by=topY;
      ctx.fillStyle = accent ? (accentColor||'#FF4070') : 'rgba(255,255,255,0.94)';
      this.rrC(ctx,bx,by,bw,bh,bh/2); ctx.fill();
      ctx.strokeStyle='rgba(45,22,52,0.30)'; ctx.lineWidth=1.3;
      this.rrC(ctx,bx,by,bw,bh,bh/2); ctx.stroke();
      ctx.font='900 11px ui-rounded,system-ui';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle = accent ? '#fff' : 'rgba(45,22,52,0.9)';
      ctx.fillText(label, cx, by+bh/2+0.5);
    }

    // ── Canvas helpers ────────────────────────────────────────────────────────
    glyph(text,x,y,size,centered=true){
      const {ctx}=this;
      ctx.font=`${Math.round(size)}px "Apple Color Emoji","Segoe UI Emoji",system-ui`;
      ctx.textAlign=centered?'center':'left'; ctx.textBaseline='middle';
      ctx.fillText(text,x,y);
    }
    rrC(ctx,x,y,w,h,r){
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(x,y,w,h,r); else ctx.rect(x,y,w,h);
    }
  }

  window.KSRender = { Renderer, itemEmoji, tokenEmoji, tokenHtml, prepChainHtml, ticketRecipeHtml, customerFace, customerKeyForOrder, CUSTOMER_KEYS };
})();
