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
  const CHEF_H     = 118;                 // chef sprite height (world px) — ~1.9x
                                          // the original 62 so chefs read big &
                                          // characterful (the charm of the game)
  const CUSTOMER_H = 132;                 // customer sprite height (world px) —
                                          // ~1.65x the original 80; intentionally
                                          // larger than the chef, but the queue
                                          // overlaps less than the chef scale so
                                          // the waiting line stays readable
  const CARRY_GAP  = 52;                  // held item floats this many px above
                                          // the chef's head (scaled with CHEF_H)
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
    // Cake World pantry (emoji placeholders until art is assigned)
    flour:'🌾',sugar:'🧂',matcha:'🍵',blueberry:'🫐',
  };
  const CHOPPED_EMOJI = { fish:'🍣' };
  const COOKED_EMOJI  = { patty:'🍖' };
  const DISH_EMOJI = {
    soup_onion:'🥣',soup_tomato:'🍲',pizza:'🍕',burned:'🪨',
    stew:'🥘',cocoa:'☕',juice:'🍹',
    // Cake World cakes (emoji placeholders until cake art is mapped)
    rose_cake:'🎂',matcha_cake:'🍰',galaxy_cake:'🎂',
  };

  const PLAYER_COLORS = ['#FF6FAE','#5BADDE','#3DC9A0','#C09BFF','#FFD23F','#FF8251','#48D4C0','#9474E0'];

  // Grid char → station image key. Digits 1-9 are ingredient crates and render
  // as a counter block with the ingredient sprite on top (via level.crates).
  const STATION_KEY = { B:'chopping_board', S:'stove', O:'pot', V:'oven', P:'plate_stack', W:'serve_window', T:'trash', K:'sink', M:'mixing_bowl' };
  // Customer pool (grandma_rose benched for now). The order is shuffled per
  // round from the server's seed so every kitchen sees the same random cast.
  const CUSTOMER_KEYS = ['influencer','workhorse','socialite','kid',
    'barney','betty_white','camp_counselor','dolly','judy','sinatra','wadsworth',
    'obama','britney'];

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
      surroundA:'#F4D9E6', surroundB:'#C98BB0',          // soft framed backdrop
      wallTop:'#D7F2EA', wallBot:'#B4E3D4',               // upper wall gradient
      ledge:'#C98A5E', ledgeShadow:'#A66E45',             // wooden picture rail
      tile:'#F4F8F5', tileGrout:'#CFE2DA', baseboard:'#A7D2C5', // subway wainscot
      floorA:'#F0E3D0', floorB:'#E8D3BF', grout:'#E2CFB8',// warm checker floor (low-contrast)
      sky:['#BFE6FF','#E9F6FF'], skyGround:'#9FD6A8',     // window scene
      accent:'#FF6FAE',
    },
    winter: {
      surroundA:'#DCE6F6', surroundB:'#8E9FD0',
      wallTop:'#EAF3FB', wallBot:'#CFE2F2',
      ledge:'#8FA8C0', ledgeShadow:'#6F89A4',
      tile:'#F7FAFD', tileGrout:'#DCE8F2', baseboard:'#ABC4DC',
      floorA:'#EDF2F8', floorB:'#DCE6F0', grout:'#D4E0EB',
      sky:['#CFE6FA','#EEF7FE'], skyGround:'#E8F2FA',
      accent:'#7C8FE0',
    },
    beach: {
      surroundA:'#CFF1E8', surroundB:'#5FBFA8',
      wallTop:'#DFF7F0', wallBot:'#BEEBDD',
      ledge:'#D8B27E', ledgeShadow:'#B8915E',
      tile:'#F3FBF8', tileGrout:'#CFEDE2', baseboard:'#A7DCCB',
      floorA:'#F1E7CB', floorB:'#E5D4AF', grout:'#DCCDA9',
      sky:['#9FE0F0','#E6FAFB'], skyGround:'#F2E2B0',
      accent:'#2FC8A0',
    },
  };

  // ── Painted-scene metadata ──────────────────────────────────────────────────
  // Each theme ships a full hand-painted wall illustration + a real floor
  // palette. `floorLine` is the fraction of the wall image that is WALL (above
  // its own painted floor strip); we crop there and continue with our own
  // glossy checker so the play floor can be as deep as the grid needs. floorA/B
  // are the saturated checker colours sampled to match the wall art.
  const WALL_META = {
    diner:  { key:'wall_diner',  floorLine:0.80, floorA:'#F7EBD0', floorB:'#CC7B4C', deep:'#8E4F2E' },
    winter: { key:'wall_winter', floorLine:0.84, floorA:'#EFEBDA', floorB:'#A6C6E2', deep:'#6E96BC' },
    beach:  { key:'wall_beach',  floorLine:0.85, floorA:'#F3E8CE', floorB:'#67C3BE', deep:'#3C9A95' },
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
    if(item.kind==='dish')  return 'dish_'+item.id;          // dish_pizza, dish_burned, ...
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
    soup_onion:['🧅🧅🧅','🔪','🥘'],soup_tomato:['🍅🍅🍅','🔪','🥘'],
    pizza:()=>[ico('dough.raw')+'🍅🧀','🔪','🔥'],stew:['🥔🥕🧅','🔪','🥘'],
    cocoa:['🥛🍫','🔪','🥘'],juice:['🍍🍓🍌','🔪','🥘'],
  };
  const COOK_TOOL={patty:'🍳',rice:'🥘'};

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
    soup_onion:  ['onion','onion','onion'].map((id)=>({ id, prep:['🔪','🥘'] })),
    soup_tomato: ['tomato','tomato','tomato'].map((id)=>({ id, prep:['🔪','🥘'] })),
    pizza: [
      { id:'dough', prep:['🔥'] },
      { id:'tomato', prep:['🔪','🔥'] },
      { id:'cheese', prep:['🔪','🔥'] },
    ],
    stew: ['potato','carrot','onion'].map((id)=>({ id, prep:['🔪','🥘'] })),
    cocoa: [
      { id:'milk', prep:['🥘'] },
      { id:'cocoa', prep:['🔪','🥘'] },
    ],
    juice: ['pineapple','strawberry','banana'].map((id)=>({ id, prep:['🔪','🥘'] })),
  };

  function assetImgHtml(key, fallback, cls='') {
    const ent = window.ASSETS && window.ASSETS[key];
    const path = typeof ent === 'string' ? ent : ent && ent.path;
    if (path) return `<img class="${cls}" src="/${path}" alt="" draggable="false">`;
    return `<span class="${cls} glyph">${fallback}</span>`;
  }

  function miniIngredientHtml(id) {
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
    constructor(canvas, staticState, myId, onTap) {
      this.canvas  = canvas;
      this.ctx     = canvas.getContext('2d');
      this.lvl     = staticState;          // flat 2D grid — read-only, never mutated
      this.myId    = myId;
      this.onTap   = onTap;
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
      // Per-round customer cast: Fisher-Yates with the server's seed.
      const rand = mulberry32((staticState.seed ?? 1) >>> 0);
      this.cast = [...CUSTOMER_KEYS];
      for (let i = this.cast.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [this.cast[i], this.cast[j]] = [this.cast[j], this.cast[i]];
      }
      this.running = true;
      this.dpr     = Math.min(window.devicePixelRatio||1, 3);

      if (window.GFX) GFX.preload();
      // Backdrop behind/around the play area. With the flat image board the wood
      // board is the .canvas-wrap CSS background and shows through the
      // transparent canvas, so leave it to the stylesheet; otherwise paint the
      // per-theme framed gradient (the vignette in drawAtmosphere finishes it).
      if (!USE_IMAGE_BOARD) {
        const t = this.theme;
        canvas.parentElement.style.background =
          `radial-gradient(120% 100% at 50% 18%, ${t.surroundA} 0%, ${t.surroundB} 100%)`;
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
      }
      this.resize();

      canvas.addEventListener('pointerdown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.clientX-rect.left)*(canvas.width/rect.width);
        const cy = (e.clientY-rect.top)*(canvas.height/rect.height);
        const [wx, wy] = this.toWorld(cx, cy);
        this.fx.push({kind:'ripple',x:wx,y:wy,t:0});
        const hit = this.pick(wx, wy);
        if (hit) this.onTap(hit[0], hit[1]);
      });
      requestAnimationFrame(()=>this.frame());
    }

    destroy() { this.running=false; window.removeEventListener('resize',this.resize); this._ro && this._ro.disconnect(); }

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
      const QGAP = 1.35;                         // vertical tiles between waiting
                                                 // customers — >1 so the (now
                                                 // larger) sprites don't clump
      const col = w + 0.7;                       // one tile beyond the right wall
      const span = QGAP * (QUEUE_DEPTH - 1);
      const top = Math.max(0, (h - span) / 2);   // center the taller line vertically
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
      this.ox = PAD + WALL_SIDE + Math.max(0,-minGx)*TILE_WIDTH; // room origin
      this.oy = PAD + WALL_H;                                    // below the wall
      this.worldW = this.ox + (maxGx+1)*TILE_WIDTH + WALL_SIDE + PAD;
      this.worldH = this.oy + (maxGy+1)*TILE_HEIGHT + 30 + PAD;

      this.scale = Math.min(this.canvas.width/this.worldW, this.canvas.height/this.worldH);
      this.txOff = (this.canvas.width  - this.worldW*this.scale)/2;
      this.tyOff = (this.canvas.height - this.worldH*this.scale)/2;
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
      for (const hit of hits) {
        if (wx < hit.x || wx > hit.x + hit.w ||
            wy < hit.y || wy > hit.y + hit.h) continue;
        const u = (wx - hit.x) / hit.w, v = (wy - hit.y) / hit.h;
        if (GFX.alphaAt(hit.key, u, v)) return [hit.gx, hit.gy];
      }
      // gridX = floor(mouseX / tileWidth), gridY = floor(mouseY / tileHeight)
      const gx = Math.floor((wx - this.ox) / TILE_WIDTH);
      const gy = Math.floor((wy - this.oy) / TILE_HEIGHT);
      if (gx>=0 && gy>=0 && gx<this.lvl.w && gy<this.lvl.h) return [gx, gy];
      return null;
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
    spawnServeJuice(gx, gy, points, vip) {
      const [px, pyBase] = this.project(gx, gy);
      const py = pyBase - BLOCK_LIFT;
      const n = vip ? 22 : 14;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const spd = 2.5 + Math.random() * 3.5;
        this.fx.push({
          kind: 'coin', x: px, y: py, t: 0,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd * 0.5 - 2,
          rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.3,
          size: vip ? 9 : 7,
        });
      }
      this.fx.push({ kind: 'points', x: px, y: py - 14, text: `+${points}`, t: 0, color: vip ? '#FFD700' : '#3DC9A0' });
      this.fx.push({ kind: 'ring', x: px, y: py, t: 0, maxR: 36, color: vip ? '#FFD700' : '#FF6FAE' });
    }

    addFx(ev) {
      const at=(x,y)=>{ const [px,py]=this.project(x,y); return [px, py-BLOCK_LIFT]; };
      const cols=['#FF6FAE','#FFD23F','#3DC9A0','#C09BFF','#FF8251','#5BADDE'];
      if (ev.type==='serve') {
        const [px,py]=at(ev.x,ev.y);
        this.fx.push({kind:'points',x:px,y:py,text:`+${ev.points}`,t:0});
        for (let i=0;i<16;i++) this.fx.push({
          kind:'confetti',x:px,y:py,t:0,
          vx:(Math.random()-0.5)*8,vy:-Math.random()*9-2,
          color:cols[i%cols.length],shape:i%3,rot:Math.random()*Math.PI*2,
        });
      } else if (ev.type==='burn') {
        const [px,py]=at(ev.x,ev.y);
        this.fx.push({kind:'points',x:px,y:py,text:'🔥 burned!',t:0,color:'#FF6040'});
      } else if (ev.type==='chopped'||ev.type==='ding') {
        const [px,py]=at(ev.x,ev.y);
        this.fx.push({kind:'pop',x:px,y:py,text:ev.type==='ding'?'♨️':'✨',t:0});
      } else if (ev.type==='reject'&&ev.playerId===this.myId) {
        const [px,py]=at(ev.x,ev.y);
        this.fx.push({kind:'points',x:px,y:py,text:'✕',t:0,color:'#FF4070'});
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

      // 0. PAINTED SCENE BACKDROP (device space). The theme's hand-painted wall
      // illustration, bled to the screen edges and shown at true proportions,
      // sitting above a glossy checkerboard floor in the theme's real colours.
      // This fills every margin with the illustrated environment (no flat
      // gradient voids) and finally USES the authored wall art instead of
      // squashing it into a sliver or replacing it with vector shapes.
      this.drawScene();

      // Everything else draws in world space (fixed 64×48 units).
      ctx.setTransform(this.scale,0,0,this.scale,this.txOff,this.tyOff);

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

      if (this.cur) {
        // 3. Chefs — feet anchor.
        for (const p of this.lerpPlayers()) {
          const [sx, sy] = this.projectEntity(p.x, p.y);
          renderQueue.push({ screenY: sy + 0.01, draw: () => this.drawChef(p, sx, sy, now) });
        }
        // 4. Customers in the waiting line.
        for (const q of this.customerQueue()) {
          const [sx, sy] = this.project(q.x, q.y);
          renderQueue.push({ screenY: sy, draw: () => this.drawCustomer(q, sx, sy, now) });
        }
      }

      // THE SORT: lower on screen ⇒ drawn later ⇒ rendered on top.
      renderQueue.sort((a, b) => a.screenY - b.screenY);
      this._labels = [];
      for (const item of renderQueue) item.draw();

      // Name labels render after the whole queue so geometry never buries them.
      for (const L of this._labels) {
        ctx.font=`800 ${L.size}px ui-rounded,system-ui`;
        ctx.textAlign='center'; ctx.textBaseline='alphabetic';
        ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.fillText(L.text,L.x+1,L.y+1);
        ctx.fillStyle=L.color; ctx.fillText(L.text,L.x,L.y);
      }

      this.drawEffects(now);
      this.drawAtmosphere();
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

    // Cached glossy checkerboard pattern in the theme's real floor colours —
    // saturated, polished cells with a top-left gloss highlight, soft inner
    // shade, and grout. Built once per theme (device-pixel sized).
    floorPattern() {
      if (this._floorPat && this._floorPatKey===this.themeName) return this._floorPat;
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
        x.strokeStyle='rgba(0,0,0,0.14)'; x.lineWidth=Math.max(1.5,S*0.03);
        x.strokeRect(cx+0.75,cy+0.75,S-1.5,S-1.5);
      };
      cell(0,0,m.floorA); cell(S,0,m.floorB);
      cell(0,S,m.floorB); cell(S,S,m.floorA);
      this._floorPat=this.ctx.createPattern(c,'repeat');
      this._floorPatKey=this.themeName;
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

    // Cinematic finish: ambient top-light + corner vignette, in device space.
    drawAtmosphere() {
      const {ctx}=this;
      ctx.save();
      ctx.setTransform(1,0,0,1,0,0);
      const W=this.canvas.width, H=this.canvas.height;
      // bright warm top light (adds glow, never dulls the saturated art)
      const amb=ctx.createLinearGradient(0,0,0,H);
      amb.addColorStop(0,'rgba(255,250,235,0.14)');
      amb.addColorStop(0.45,'rgba(255,255,255,0)');
      ctx.fillStyle=amb; ctx.fillRect(0,0,W,H);
      // whisper-soft vignette — just enough to frame, edges stay vibrant
      const vg=ctx.createRadialGradient(W/2,H*0.44,Math.min(W,H)*0.34,W/2,H*0.52,Math.max(W,H)*0.78);
      vg.addColorStop(0,'rgba(0,0,0,0)');
      vg.addColorStop(1,'rgba(24,10,28,0.13)');
      ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
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
    drawBlock(c, gx, gy, sx, sy, now) {
      const {ctx}=this;
      const TW=TILE_WIDTH, TH=TILE_HEIGHT;
      const baseY = sy + TH/2;            // tile's south corner — ground anchor
      const ing = this.lvl.crates && this.lvl.crates[c];

      // Contact shadow under the block's footprint so nothing floats.
      this.contactShadow(sx, baseY-3, TW*0.40, 8, 0.16);

      // Crates: per-ingredient art if the manifest has it, otherwise the
      // flat generic crate with the raw ingredient sprite in its open top.
      if (ing) {
        const cKey = GFX.has('crate_'+ing) ? 'crate_'+ing : 'crate';
        const rect = GFX.drawAnchored(ctx, cKey, sx, baseY - 1, TW*SPRITE_FILL, isoFixFor(cKey));
        if (rect) {
          if (cKey === 'crate') this.drawBare({ id: ing, state: 'raw' }, sx, rect.y + rect.h*0.30, 16);
          this._hits.push({ ...rect, gx, gy, key: cKey, d: sy });
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
      if (c==='S' && s && s.contents && (s.state==='cooking'||s.state==='burned')) key='stove_fire';
      if (c==='K' && s && s.dirty > 0) key='sink_dirty';
      // Cake World: the mixing bowl shows its "full" art while it holds
      // ingredients/batter (filling, mixing, or done).
      if (c==='M' && s && s.contents && s.contents.length) key='mixing_bowl_full';
      let rect = GFX.drawAnchored(ctx, key, sx, baseY, TW*SPRITE_FILL, isoFixFor(key));
      if (!rect) { key='counter'; rect = GFX.drawAnchored(ctx, 'counter', sx, baseY, TW*SPRITE_FILL, isoFixFor(key)); }
      if (rect) this._hits.push({ ...rect, gx, gy, key, d: sy });
      const topY = sy - BLOCK_LIFT;

      // Crates without dedicated art: counter + ingredient sprite on top.
      if (ing) this.drawBare({id:ing, state:'raw'}, sx, topY - 5, 17);

      if (!s) return;

      if (s.item) {
        this.drawItem(s.item, sx, topY - 4, 23);
        if (c==='B' && s.item.state==='raw' && s.progress>0)
          this.bar(sx, topY - 28, s.progress, '#3DC9A0','#A8F0D8');
      }
      if (s.dirty!==undefined) {
        // The dirty-sink render already shows piled plates; don't double up.
        if (key !== 'sink_dirty') {
          const n=Math.min(s.dirty,3);
          for(let i=0;i<n;i++) GFX.draw(ctx,'plate',sx,topY-1-i*3,30,30);
        }
        if (s.dirty>0) {
          this.glyph('🫧',sx+13,topY-14,12);
          ctx.font='800 10px ui-rounded,system-ui';
          ctx.textAlign='center'; ctx.fillStyle='#FF4070';
          ctx.fillText(String(s.dirty),sx-17,topY-13);
        }
        if (s.progress>0) this.bar(sx, topY - 28, s.progress, '#5BADDE','#A8D8F8');
      }
      if (s.contents) {
        const n=s.contents.length;
        s.contents.forEach((it,i)=>{
          const off=n>1?(i-(n-1)/2)*10:0;
          this.drawItem(it,sx+off,topY-5,n>1?17:23,false);
        });
        if (s.state==='cooking') {
          this.bar(sx, topY - 28, s.progress, '#FFD23F','#FFF0A0');
          if(Math.floor(now/280)%2) this.glyph('💨',sx+14,topY-19,12);
        } else if (s.state==='done') {
          this.bar(sx, topY - 28, s.progress, s.progress>0.6?'#FF6040':'#3DC9A0', s.progress>0.6?'#FFA090':'#A8F0D8');
          this.glyph('✅',sx+15,topY-18,12);
        } else if (s.state==='burned') {
          if(Math.floor(now/250)%2) this.glyph('💨',sx,topY-20,17);
        }
      }
      if (c==='P' && this.cur.plates!==undefined) {
        const supply=this.cur.plates;
        const label=supply===null?'∞':String(supply);
        const empty=supply===0;
        const bw=Math.max(18, 12 + label.length*7), bh=17;
        const bx=sx+20-bw/2, by=topY-28;
        ctx.fillStyle=empty?'#FF4070':'rgba(255,255,255,0.94)';
        this.rrC(ctx,bx,by,bw,bh,bh/2); ctx.fill();
        ctx.strokeStyle=empty?'rgba(130,20,55,0.45)':'rgba(45,22,52,0.22)';
        ctx.lineWidth=1.3; this.rrC(ctx,bx,by,bw,bh,bh/2); ctx.stroke();
        ctx.font='900 11px ui-rounded,system-ui';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle=empty?'#fff':'rgba(45,22,52,0.9)';
        ctx.fillText(label,sx+20,by+bh/2+0.5);
      }
    }

    // ── Chef ──────────────────────────────────────────────────────────────────
    drawChef(p, sx, sy, now) {
      const {ctx}=this;
      const bounce=p.moving?Math.abs(Math.sin(now/88))*3:0;
      const col=this.colorOf[p.id]||PLAYER_COLORS[0];
      const isMe=p.id===this.myId;
      const chefKey = GFX.has(p.chef) ? p.chef : 'chef';

      // Clean base: a single soft ground shadow. Player identity lives in
      // the floating name tag (multiplayer requirement), not base clutter.
      this.contactShadow(sx, sy, 17, 6, 0.24);

      const headTopY = sy - bounce - CHEF_H;
      GFX.draw(ctx,chefKey,sx,sy-bounce-CHEF_H*0.52,CHEF_H*0.85,CHEF_H);

      // Held item floats EXACTLY CARRY_GAP px above the chef's head.
      if (p.carry) {
        const carryY = headTopY - CARRY_GAP;
        if (p.carry.kind==='plate') this.drawPlate(p.carry,sx,carryY,22);
        else this.drawItem(p.carry,sx,carryY,20);
      }
      if (p.queue && p.queue.length) {
        const y = headTopY - CARRY_GAP - (p.carry ? 28 : 8);
        this.drawActionQueue(p.queue, sx, y);
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
      const CH=CUSTOMER_H;
      const bob=Math.sin(now/320+q.i*2.1);

      // grounding shadow so the waiting line doesn't float on the walkway
      this.contactShadow(sx, sy+4, 16, 6, 0.20);
      GFX.draw(ctx, this.customerKeyForOrder(q.order), sx, sy+bob-CH*0.5, CH*0.92, CH);
    }

    // ── Particle effects (world space, after the queue = always on top) ──────
    drawEffects(now) {
      const {ctx}=this;
      const ts=38;
      this.fx=this.fx.filter((f)=>{
        f.t+=1/60;
        if(f.kind==='ripple'){
          const a=1-f.t/0.4; if(a<=0) return false;
          ctx.strokeStyle=`rgba(255,111,174,${a*0.8})`; ctx.lineWidth=2;
          ctx.beginPath(); ctx.arc(f.x,f.y,(f.t/0.4)*ts*0.7,0,Math.PI*2); ctx.stroke();
        } else if(f.kind==='points'){
          const a=1-f.t/1.2; if(a<=0) return false;
          const sz=ts*0.44;
          ctx.font=`800 ${sz}px ui-rounded,system-ui`;
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
      GFX.draw(this.ctx,'plate',x,y,size*1.9,size*1.1);
      stack.contents.forEach((it,i)=>this.drawBare(it,x,y-size*0.12-i*size*0.18,size*0.7));
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

  window.KSRender = { Renderer, itemEmoji, tokenEmoji, tokenHtml, prepChainHtml, ticketRecipeHtml, customerFace, customerKeyForOrder };
})();
