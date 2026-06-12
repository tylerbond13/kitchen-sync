// ============================================================================
//  Kitchen Sync — isoRender.js
//  Visual-only 2.5D isometric projection layer over a flat 2D kitchen grid.
// ----------------------------------------------------------------------------
//  ENGINEERING RULES (do not violate):
//
//  1. LEAVE THE MAP DATA ALONE.
//     The server simulates a standard flat 2D grid. A player at (2,3) is at
//     (2,3). Nothing in this file mutates, rotates, or re-indexes game state.
//     Isometry exists ONLY inside drawing code, at the moment of drawing.
//
//  2. VISUAL-ONLY PROJECTION FORMULA (2:1 ratio, locked):
//       screenX = (gridX - gridY) * (TILE_WIDTH  / 2) + worldCenterX
//       screenY = (gridX + gridY) * (TILE_HEIGHT / 2) + VERTICAL_OFFSET
//     TILE_WIDTH = 64, TILE_HEIGHT = 32. All layout math is in this fixed
//     "world space"; a single uniform scale transform fits world space to the
//     device canvas (so 64×32 art stays crisp on any phone, retina included).
//
//  3. Y-SORTED RENDER QUEUE.
//     Each frame: clear the canvas, push EVERY visible element (floor tiles,
//     counter blocks, stations, crates, chefs, customers) into one flat
//     renderQueue, each entry carrying its calculated screenY. Sort the whole
//     queue by screenY, then draw. Things lower on screen render on top.
//
//  4. Every element draws via image assets from the GFX manifest (gfx.js).
// ============================================================================
(function () {

  // ── Locked isometric constants ──────────────────────────────────────────────
  const TILE_WIDTH  = 64;                 // diamond width  (world px)
  const TILE_HEIGHT = 32;                 // diamond height (world px) — 2:1
  const BLOCK_LIFT  = 24;                 // counter top sits this far above its
                                          // floor diamond (96/256 of block art)
  const VERTICAL_OFFSET = 128;            // headroom above the back corner for
                                          // tall blocks, carried items, bubbles
  const CHEF_H     = 52;                  // chef sprite height (world px)
  const CUSTOMER_H = 64;                  // customer sprite height (world px)
  const CARRY_GAP  = 40;                  // held item floats exactly this many
                                          // px above the chef's head (rule 4)

  // ── Game-object lookups ─────────────────────────────────────────────────────
  const ING_EMOJI = {
    lettuce:'🥬',tomato:'🍅',cucumber:'🥒',bun:'🍞',patty:'🥩',
    cheese:'🧀',onion:'🧅',rice:'🍚',fish:'🐟',seaweed:'🌿',dough:'🫓',
    potato:'🥔',carrot:'🥕',milk:'🥛',cocoa:'🍫',tortilla:'🌮',
    pineapple:'🍍',strawberry:'🍓',banana:'🍌',
  };
  const CHOPPED_EMOJI = { fish:'🍣' };
  const COOKED_EMOJI  = { patty:'🍖' };
  const DISH_EMOJI = {
    soup_onion:'🥣',soup_tomato:'🍲',pizza:'🍕',burned:'🪨',
    stew:'🥘',cocoa:'☕',juice:'🍹',
  };

  const PLAYER_COLORS = ['#FF6FAE','#5BADDE','#3DC9A0','#C09BFF','#FFD23F','#FF8251','#48D4C0','#9474E0'];

  // Grid char → station image key. Digits 1-9 are ingredient crates and render
  // as a counter block with the ingredient sprite on top (via level.crates).
  const STATION_KEY = { B:'chopping_board', S:'stove', O:'pot', V:'oven', P:'plate_stack', W:'serve_window', T:'trash', K:'sink' };
  const CUSTOMER_KEYS = ['grandma_rose','influencer','workhorse','socialite','kid'];

  const THEMES = {
    diner:  { wallTop:'#3DBBB8', bgA:'#FF7DB8', bgB:'#FFB0D8' },
    winter: { wallTop:'#A8D8F8', bgA:'#7860C8', bgB:'#A888E8' },
    beach:  { wallTop:'#48C8E8', bgA:'#28C898', bgB:'#58E8B8' },
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
      this.emotes  = {};
      this.qPos    = new Map();            // orderId → smoothed queue position
      this.theme   = THEMES[staticState.theme] || THEMES.diner;
      this.running = true;
      this.dpr     = Math.min(window.devicePixelRatio||1, 3);

      if (window.GFX) GFX.preload();
      const t = this.theme;
      canvas.parentElement.style.background =
        `linear-gradient(145deg,${t.bgA} 0%,${t.bgB} 100%)`;

      this.resize = this.resize.bind(this);
      window.addEventListener('resize', this.resize);
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

    destroy() { this.running=false; window.removeEventListener('resize',this.resize); }

    // ── World space ⇄ canvas ──────────────────────────────────────────────────
    // World space uses the locked 64×32 tile constants. One uniform scale +
    // translate maps world space onto the device canvas.
    resize() {
      const wrap=this.canvas.parentElement;
      this.canvas.width  = Math.round(wrap.clientWidth*this.dpr);
      this.canvas.height = Math.round(wrap.clientHeight*this.dpr);

      const {w,h}=this.lvl;
      // Deepest scanline we ever draw: back grid corner vs. last queue slot.
      const queueMaxXY = (w/2 - 1 + 4*0.95) + (h + 0.45);
      const maxXY = Math.max(w + h - 2, queueMaxXY);

      this.worldW = (w + h) * (TILE_WIDTH/2) + 32;
      this.worldCX = this.worldW / 2 + (h - w) * (TILE_WIDTH/4); // centers the island
      this.worldH = VERTICAL_OFFSET + maxXY * (TILE_HEIGHT/2) + TILE_HEIGHT + 56;

      this.scale = Math.min(this.canvas.width/this.worldW, this.canvas.height/this.worldH);
      this.txOff = (this.canvas.width  - this.worldW*this.scale)/2;
      this.tyOff = (this.canvas.height - this.worldH*this.scale)/2;
    }

    toWorld(cx, cy) { return [(cx-this.txOff)/this.scale, (cy-this.tyOff)/this.scale]; }

    // ── THE PROJECTION (visual only — never touches game state) ─────────────
    project(gridX, gridY) {
      const screenX = (gridX - gridY) * (TILE_WIDTH  / 2) + this.worldCX;
      const screenY = (gridX + gridY) * (TILE_HEIGHT / 2) + VERTICAL_OFFSET;
      return [screenX, screenY];
    }
    // Players are continuous grid coords with tile centers at +0.5.
    projectEntity(px, py) { return this.project(px - 0.5, py - 0.5); }

    // Exact algebraic inverse of project().
    unproject(wx, wy) {
      const fx = (wx - this.worldCX)     / (TILE_WIDTH  / 2);
      const fy = (wy - VERTICAL_OFFSET)  / (TILE_HEIGHT / 2);
      return [(fx + fy) / 2, (fy - fx) / 2];
    }

    // Tap picking. A floor tap is a floor tap — movement is never hijacked.
    // Only when the tap point itself doesn't hit a station do we re-test the
    // point shifted down by BLOCK_LIFT, which catches taps landing on the
    // raised TOP FACE of a counter block (those project to the cell behind).
    pick(wx, wy) {
      const inside    = (x,y) => x>=0 && y>=0 && x<this.lvl.w && y<this.lvl.h;
      const isStation = (x,y) => inside(x,y) && this.lvl.grid[y][x] !== '.';

      let [ux, uy] = this.unproject(wx, wy);
      let gx = Math.floor(ux), gy = Math.floor(uy);
      if (isStation(gx, gy)) return [gx, gy];          // direct diamond hit

      const [bx, by] = this.unproject(wx, wy + BLOCK_LIFT);
      const tx = Math.floor(bx), ty = Math.floor(by);
      if (isStation(tx, ty)) return [tx, ty];          // hit a block's top face

      if (inside(gx, gy)) return [gx, gy];             // floor → walk there
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

    addEmote(playerId, emoji) {
      this.emotes[playerId]={emoji,until:performance.now()+2500};
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

      // Clear + backdrop in raw device space.
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      if(!GFX.tile(ctx,'wall',0,0,this.canvas.width,this.canvas.height)){
        ctx.fillStyle=this.theme.wallTop;
        ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      }
      // Everything else draws in world space (fixed 64×32 units).
      ctx.setTransform(this.scale,0,0,this.scale,this.txOff,this.tyOff);

      const renderQueue = [];
      const {lvl}=this;

      // 1. Floor. The HD checkered patch is itself an iso diamond whose
      // corners are the island's corners — one draw covers the whole floor.
      // Per-tile diamonds are the fallback while it loads.
      if (GFX.img('floor_patch')) {
        const [lx]  = this.project(0, lvl.h-1), [rx]  = this.project(lvl.w-1, 0);
        const [,ty] = this.project(0, 0),       [,by] = this.project(lvl.w-1, lvl.h-1);
        renderQueue.push({ screenY: -1e9, draw: () =>
          GFX.tile(ctx, 'floor_patch', lx-TILE_WIDTH/2, ty-TILE_HEIGHT/2,
                   (rx-lx)+TILE_WIDTH, (by-ty)+TILE_HEIGHT) });
      } else {
        for (let gy=0; gy<lvl.h; gy++) for (let gx=0; gx<lvl.w; gx++) {
          const [sx, sy] = this.project(gx, gy);
          const key = (gx+gy)%2 ? 'floor_alt' : 'floor';
          renderQueue.push({ screenY: sy - TILE_HEIGHT, draw: () => {
            if(!GFX.tile(ctx, key, sx-TILE_WIDTH/2, sy-TILE_HEIGHT/2, TILE_WIDTH, TILE_HEIGHT))
              GFX.tile(ctx, 'floor', sx-TILE_WIDTH/2, sy-TILE_HEIGHT/2, TILE_WIDTH, TILE_HEIGHT);
          }});
        }
      }
      // Queue-zone walkway tiles (faded) in front of the kitchen.
      for (let i=-1;i<5;i++) {
        const qx = lvl.w/2 - 1 + i*0.95, qy = lvl.h + 0.45;
        const [sx, sy] = this.project(qx, qy);
        renderQueue.push({ screenY: sy - TILE_HEIGHT, draw: () => {
          ctx.globalAlpha = 0.45;
          GFX.tile(ctx, 'floor', sx-TILE_WIDTH/2, sy-TILE_HEIGHT/2, TILE_WIDTH, TILE_HEIGHT);
          ctx.globalAlpha = 1;
        }});
      }

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
    }

    // ── Background Layer: wall-mounted decor + decorative clutter ────────────
    // Everything here goes through the same renderQueue and the same
    // drawAnchored asset path as the gameplay objects. Wall items anchor to
    // back-perimeter tiles with screenY just behind their row, so the counters
    // overlap their bottom edge and chefs always pass in front; clutter
    // crates anchor outside the island (gy < 0), peeking over the back wall.
    pushDecor(queue) {
      const {lvl}=this;
      // Hang an item on the wall above a back-perimeter tile.
      const hang = (key, gx, gy, w) => {
        const [sx, sy] = this.project(gx, gy);
        queue.push({ screenY: sy - 0.5, draw: () =>
          GFX.drawAnchored(this.ctx, key, sx, sy - BLOCK_LIFT - 6, w) });
      };
      // Back-right wall (row 0): multi-pane street window, clock, photos.
      hang('wall_window', Math.max(1, Math.round(lvl.w*0.30)), 0, 92);
      hang('wall_clock',  Math.max(2, Math.round(lvl.w*0.55)), 0, 22);
      hang('wall_photos', Math.max(3, Math.round(lvl.w*0.78)), 0, 56);
      // Back-left wall (column 0): the INDUSTRIAL BAKERY sign.
      hang('wall_sign', 0, Math.max(1, Math.round(lvl.h*0.45)), 40);

      // Flower vase with utensils on the back-corner counter top.
      if (lvl.grid[0][0] !== '.') {
        const [sx, sy] = this.project(0, 0);
        queue.push({ screenY: sy + 0.02, draw: () =>
          GFX.drawAnchored(this.ctx, 'decor_vase', sx, sy - BLOCK_LIFT + 2, 20) });
      }
      // Spare produce baskets stacked outside along the back wall.
      const clutter = (key, gx, w) => {
        const [sx, sy] = this.project(gx, -0.55);
        queue.push({ screenY: sy, draw: () =>
          GFX.drawAnchored(this.ctx, key, sx, sy + TILE_HEIGHT/2, w) });
      };
      clutter('crate_lettuce', Math.max(1, Math.round(lvl.w*0.12)), 44);
      clutter('crate_tomato',  Math.max(1, Math.round(lvl.w*0.12)) + 1.15, 40);
    }

    // ── Blocks (counters, stations, crates) + whatever sits on them ──────────
    drawBlock(c, gx, gy, sx, sy, now) {
      const {ctx}=this;
      const TW=TILE_WIDTH, TH=TILE_HEIGHT;
      const baseY = sy + TH/2;            // tile's south corner — ground anchor
      const ing = this.lvl.crates && this.lvl.crates[c];

      // Crates with dedicated art ARE the art (market basket on the floor).
      if (ing && GFX.img('crate_'+ing)) {
        GFX.drawAnchored(ctx, 'crate_'+ing, sx, baseY - 1, TW*0.92);
        return;
      }

      const s = this.cur && this.cur.stations[`${gx},${gy}`];

      // Bottom-anchored, aspect-true: iso block placeholders and full 3D
      // renders both stand on the tile's floor diamond this way.
      // Stations with state-variant art swap sprites live.
      let key = STATION_KEY[c] || 'counter';
      if (c==='S' && s && s.contents && (s.state==='cooking'||s.state==='burned')) key='stove_fire';
      if (c==='K' && s && s.dirty > 0) key='sink_dirty';
      // Per-station footprint tweaks for renders whose aspect runs tall.
      const scale = c==='T' ? 0.74 : 1;
      if (!GFX.drawAnchored(ctx, key, sx, baseY, TW*scale))
        GFX.drawAnchored(ctx, 'counter', sx, baseY, TW);
      const topY = sy - BLOCK_LIFT;

      // Crates without dedicated art: counter + ingredient sprite on top.
      if (ing) this.drawBare({id:ing, state:'raw'}, sx, topY - 5, 22);

      if (!s) return;

      if (s.item) {
        this.drawItem(s.item, sx, topY - 4, 19);
        if (c==='B' && s.item.state==='raw' && s.progress>0)
          this.bar(sx, topY - 28, s.progress, '#3DC9A0','#A8F0D8');
      }
      if (s.dirty!==undefined) {
        // The dirty-sink render already shows piled plates; don't double up.
        if (key !== 'sink_dirty') {
          const n=Math.min(s.dirty,3);
          for(let i=0;i<n;i++) GFX.draw(ctx,'plate',sx,topY-1-i*3,26,26);
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
          this.drawItem(it,sx+off,topY-5,n>1?14:19,false);
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
        ctx.font='800 11px ui-rounded,system-ui';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle=supply===0?'#FF4070':'rgba(45,22,52,0.85)';
        ctx.fillText(String(supply),sx+17,topY-17);
      }
    }

    // ── Chef ──────────────────────────────────────────────────────────────────
    drawChef(p, sx, sy, now) {
      const {ctx}=this;
      const bounce=p.moving?Math.abs(Math.sin(now/88))*3:0;
      const col=this.colorOf[p.id]||PLAYER_COLORS[0];
      const isMe=p.id===this.myId;

      // Identity ring on the floor (gameplay affordance).
      ctx.save();
      if (isMe) {
        const pulse=0.5+0.25*Math.sin(now/400);
        ctx.globalAlpha=pulse*0.4; ctx.fillStyle=col;
        ctx.beginPath(); ctx.ellipse(sx,sy,22,8.5,0,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha=isMe?0.9:0.55; ctx.fillStyle=col;
      ctx.beginPath(); ctx.ellipse(sx,sy,14,5.5,0,0,Math.PI*2); ctx.fill();
      ctx.restore();

      const headTopY = sy - bounce - CHEF_H;
      GFX.draw(ctx,'chef',sx,sy-bounce-CHEF_H*0.52,CHEF_H*0.85,CHEF_H);
      if(p.avatar) this.glyph(p.avatar,sx,sy-bounce-CHEF_H*0.62,16);

      // Held item floats EXACTLY CARRY_GAP px above the chef's head.
      if (p.carry) {
        const carryY = headTopY - CARRY_GAP;
        if (p.carry.kind==='plate') this.drawPlate(p.carry,sx,carryY,19);
        else this.drawItem(p.carry,sx,carryY,17);
      }

      const em=this.emotes[p.id];
      if (em&&em.until>now) {
        const by=headTopY-CARRY_GAP-26;
        GFX.draw(ctx,'speech_bubble',sx,by,32,27);
        this.glyph(em.emoji,sx,by-2,13);
      }

      this._labels.push({
        text: isMe?'You':p.name, x: sx, y: sy+13,
        size: 9, color: isMe?col:'rgba(20,8,40,0.85)',
      });
    }

    // ── Customer waiting line ─────────────────────────────────────────────────
    // Slot i targets flat-grid coords (w/2-1 + 0.95i, h+0.45): a diagonal row
    // just OUTSIDE the kitchen's front wall. Smoothed per-order positions make
    // the whole line glide forward when the front customer is served.
    customerQueue() {
      if (!this.cur || !this.cur.orders) return [];
      const {lvl}=this;
      const orders=this.cur.orders.slice(0,5);
      const ids=new Set(orders.map(o=>o.id));
      for (const id of this.qPos.keys()) if (!ids.has(id)) this.qPos.delete(id);

      const out=[];
      orders.forEach((order,i)=>{
        const tx = lvl.w/2 - 1 + i*0.95;
        const ty = lvl.h + 0.45;
        let pos=this.qPos.get(order.id);
        if (!pos) { pos={x:tx+3, y:ty}; this.qPos.set(order.id,pos); }
        pos.x += (tx-pos.x)*0.10;
        pos.y += (ty-pos.y)*0.10;
        out.push({ order, i, x:pos.x, y:pos.y,
          urgency: 1 - Math.max(0,order.ttl)/order.ttlMax });
      });
      return out;
    }

    drawCustomer(q, sx, sy, now) {
      const {ctx}=this;
      const CH=CUSTOMER_H;
      const bob=Math.sin(now/320+q.i*2.1);
      const preset=((q.order.id-1)%5+5)%5;

      GFX.draw(ctx, CUSTOMER_KEYS[preset], sx, sy+bob-CH*0.5, CH*0.92, CH);

      // Hearts above the head.
      const hearts=5, lit=Math.ceil((1-q.urgency)*hearts);
      const hSz=8.5, hGap=hSz*1.05, hy=sy+bob-CH-6;
      for(let h=0;h<hearts;h++){
        const hx=sx-(hearts-1)*hGap/2+h*hGap;
        GFX.draw(ctx, h<lit?'heart':'heart_empty', hx, hy, hSz, hSz);
      }

      // Thought bubble. Staggered by line index in a high/low zigzag: the
      // queue itself descends ~15px per slot, so a monotonic lift would line
      // all bubbles up at the same screen height (an unreadable band). The
      // zigzag keeps each bubble glued to its owner and clear of neighbours.
      const bubW=38, bubH=32;
      const bubCY=sy+bob-CH-14-bubH/2 - (q.i%2)*16;
      GFX.draw(ctx,'speech_bubble',sx,bubCY,bubW,bubH);
      const dishKey='dish_'+q.order.recipe;
      if(!GFX.draw(ctx, GFX.has(dishKey)?dishKey:'__none__', sx, bubCY-2, bubW*0.62, bubH*0.62))
        this.glyph(q.order.emoji||'🍽️', sx, bubCY-2, 14);
      if (q.order.vip) this.glyph('👑', sx+bubW*0.42, bubCY-bubH*0.42, 10);
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
      const w=32, h=4.5, x0=cx-w/2, y0=topY;
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

  window.KSRender = { Renderer, itemEmoji, tokenEmoji, tokenHtml, prepChainHtml, customerFace };
})();
