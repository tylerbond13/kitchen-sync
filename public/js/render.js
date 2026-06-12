// Kitchen Sync — 2.5D ISOMETRIC sprite engine
// ─────────────────────────────────────────────────────────────────────────────
// Projection (strict 2:1 diamond):
//   isoX = (gx - gy) * tileW/2 + originX
//   isoY = (gx + gy) * tileH/2 + originY        where tileH = tileW / 2
// Inverse (tap → grid):
//   fx = (sx - originX) / (tileW/2); fy = (sy - originY) / (tileH/2)
//   gx = (fx + fy) / 2;  gy = (fy - fx) / 2
// Depth: every entity is Y-sorted by (gx + gy) and drawn back-to-front, so
// chefs walk behind and in front of counters without clipping.
// Counters/stations are 3D block sprites; items sit ON TOP at isoY - LIFT,
// where LIFT = 0.75 * tileH (matches the 96px block height in the 256px art).
(function () {
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

  // Grid char → station image key, and customer preset → sprite key.
  const STATION_KEY = { B:'chopping_board', S:'stove', O:'pot', V:'oven', P:'plate_stack', W:'serve_window', T:'trash', K:'sink' };
  const CUSTOMER_KEYS = ['grandma_rose','influencer','workhorse','socialite','kid'];

  const THEMES = {
    diner:  { wallTop:'#3DBBB8', bgA:'#FF7DB8', bgB:'#FFB0D8' },
    winter: { wallTop:'#A8D8F8', bgA:'#7860C8', bgB:'#A888E8' },
    beach:  { wallTop:'#48C8E8', bgA:'#28C898', bgB:'#58E8B8' },
  };

  // ── Customer face SVG (used by the HTML ticket strip) ──────────────────────
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

  // ── Isometric Renderer ───────────────────────────────────────────────────────
  class Renderer {
    constructor(canvas, staticState, myId, onTap) {
      this.canvas  = canvas;
      this.ctx     = canvas.getContext('2d');
      this.lvl     = staticState;
      this.myId    = myId;
      this.onTap   = onTap;
      this.prev    = null; this.cur  = null;
      this.prevAt  = 0;    this.curAt = 0;
      this.fx      = [];
      this.colorOf = {};
      this.emotes  = {};
      this.qPos    = new Map();   // orderId → smoothed queue position {x, y}
      this.theme   = THEMES[staticState.theme] || THEMES.diner;
      this.running = true;
      this.dpr     = Math.min(window.devicePixelRatio||1, 3);

      this.bgCanvas = document.createElement('canvas');
      this.bgCtx    = this.bgCanvas.getContext('2d');
      this.bgDirty  = true;
      if (window.GFX) { GFX.onReady(() => { this.bgDirty = true; }); GFX.preload(); }
      const t = this.theme;
      canvas.parentElement.style.background =
        `linear-gradient(145deg,${t.bgA} 0%,${t.bgB} 100%)`;

      this.resize = this.resize.bind(this);
      window.addEventListener('resize', this.resize);
      this.resize();

      canvas.addEventListener('pointerdown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const sx = (e.clientX-rect.left)*(canvas.width/rect.width);
        const sy = (e.clientY-rect.top)*(canvas.height/rect.height);
        this.fx.push({kind:'ripple',x:sx,y:sy,t:0});
        const hit = this.pick(sx, sy);
        if (hit) this.onTap(hit[0], hit[1]);
      });
      requestAnimationFrame(()=>this.frame());
    }

    destroy() { this.running=false; window.removeEventListener('resize',this.resize); }

    // ── THE ISOMETRIC COORDINATE TRANSFORMATION ─────────────────────────────
    // Grid (gx, gy) → screen center of that tile's floor diamond.
    iso(gx, gy) {
      return [
        (gx - gy) * this.tw / 2 + this.originX,
        (gx + gy) * this.th / 2 + this.originY,
      ];
    }
    // Players are continuous coords with tile centers at +0.5 — shift to tile space.
    isoOf(px, py) { return this.iso(px - 0.5, py - 0.5); }

    // Screen → grid (exact inverse of iso()).
    unproject(sx, sy) {
      const fx = (sx - this.originX) / (this.tw / 2);
      const fy = (sy - this.originY) / (this.th / 2);
      return [(fx + fy) / 2, (fy - fx) / 2];
    }

    // Tap picking: counters are tall blocks, so a tap on a block's visible body
    // lands "behind" its floor diamond in inverse-projection space. Test the
    // direct hit first, then the cells the block body would cover.
    pick(sx, sy) {
      const [ux, uy] = this.unproject(sx, sy);
      const gx = Math.floor(ux), gy = Math.floor(uy);
      const inside = (x,y) => x>=0 && y>=0 && x<this.lvl.w && y<this.lvl.h;
      const isStation = (x,y) => inside(x,y) && this.lvl.grid[y][x] !== '.';
      if (isStation(gx, gy)) return [gx, gy];
      // Block tops sit LIFT (=1.5 half-steps) above their diamond: check the
      // cells in front of the projected point.
      for (const [cx2,cy2] of [[gx+1,gy+1],[gx+1,gy],[gx,gy+1]])
        if (isStation(cx2,cy2)) return [cx2,cy2];
      if (inside(gx, gy)) return [gx, gy];   // floor → walk there
      return null;
    }

    resize() {
      const wrap=this.canvas.parentElement;
      const cssW=wrap.clientWidth, cssH=wrap.clientHeight;
      this.canvas.width  = Math.round(cssW*this.dpr);
      this.canvas.height = Math.round(cssH*this.dpr);
      this.bgCanvas.width  = this.canvas.width;
      this.bgCanvas.height = this.canvas.height;

      const W=this.canvas.width, H=this.canvas.height;
      const {w,h}=this.lvl;
      // Deepest visible point: the customer queue row in front of the kitchen.
      const queueMaxXY = (w/2 + 3.4) + (h + 0.45);
      const maxXY = Math.max(w + h - 2, queueMaxXY);
      // Fit horizontally: total iso width = (w+h) * tw/2.
      const twByW = (W * 0.97 * 2) / (w + h);
      // Fit vertically: top pad (block + held item headroom) ≈ 0.9·tw,
      // vertical span = maxXY · tw/4, bottom margin ≈ 0.35·tw.
      const twByH = H / (0.9 + maxXY / 4 + 0.35);
      this.tw = Math.floor(Math.min(twByW, twByH));   // diamond width
      this.th = Math.floor(this.tw / 2);              // strict 2:1 ratio
      this.lift = this.th * 0.75;                     // block top height (96/256 art)
      this.originX = Math.round(W/2 - (w - h) * this.tw / 4);
      // Center the island + queue vertically in whatever space is left.
      const usedH = this.tw * (0.9 + maxXY / 4 + 0.35);
      const pad = Math.max(0, (H - usedH) / 2);
      this.originY = Math.round(pad + this.tw * 0.9 + this.th / 2);
      this.bgDirty = true;
    }

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

    spawnServeJuice(gx, gy, points, vip) {
      const [px, pyBase] = this.iso(gx, gy);
      const py = pyBase - this.lift;            // erupt from the block top
      const n = vip ? 22 : 14;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const spd = (2.5 + Math.random() * 3.5) * this.dpr;
        this.fx.push({
          kind: 'coin', x: px, y: py, t: 0,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd * 0.5 - 2 * this.dpr,
          rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.3,
          size: (vip ? 9 : 7) * this.dpr,
        });
      }
      this.fx.push({ kind: 'points', x: px, y: py - this.tw * 0.2, text: `+${points}`, t: 0, color: vip ? '#FFD700' : '#3DC9A0' });
      this.fx.push({ kind: 'ring', x: px, y: py, t: 0, maxR: this.tw * 0.55, color: vip ? '#FFD700' : '#FF6FAE' });
    }

    addFx(ev) {
      const at=(x,y)=>{ const [px,py]=this.iso(x,y); return [px, py-this.lift]; };
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

    // ── THE RENDER LOOP: floor cache → Y-sorted entities → effects ───────────
    draw() {
      const {ctx}=this;
      const now=performance.now();
      ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

      if (this.bgDirty) { this.renderBackground(); this.bgDirty=false; }
      ctx.drawImage(this.bgCanvas,0,0);

      // Collect every renderable with its depth, then sort back-to-front.
      // STRICT Y-SORTING: layer = gx + gy (the iso scanline).
      const ents = [];

      const {lvl}=this;
      for (let y=0;y<lvl.h;y++) for (let x=0;x<lvl.w;x++) {
        const c=lvl.grid[y][x];
        if (c==='.') continue;
        ents.push({ d: x + y, draw: () => this.drawBlock(c, x, y, now) });
      }
      if (this.cur) {
        for (const p of this.lerpPlayers())
          ents.push({ d: (p.x - 0.5) + (p.y - 0.5) + 0.001, draw: () => this.drawChef(p, now) });
        for (const q of this.queue(now))
          ents.push({ d: q.x + q.y, draw: () => this.drawCustomer(q, now) });
      }

      ents.sort((a,b)=>a.d-b.d);
      this._labels = [];
      for (const e of ents) e.draw();

      // Name labels render after all entities so counters never bury them.
      for (const L of this._labels) {
        ctx.font=`800 ${L.size}px ui-rounded,system-ui`;
        ctx.textAlign='center'; ctx.textBaseline='alphabetic';
        ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.fillText(L.text,L.x+1,L.y+1);
        ctx.fillStyle=L.color; ctx.fillText(L.text,L.x,L.y);
      }

      this.drawEffects(now);
    }

    // ── Background cache: backdrop + diamond floor (static, never re-sorted) ──
    renderBackground() {
      const ctx=this.bgCtx, {tw,th,lvl}=this;
      const W=this.bgCanvas.width, H=this.bgCanvas.height;
      ctx.clearRect(0,0,W,H);
      if(!GFX.tile(ctx,'wall',0,0,W,H)){ ctx.fillStyle=this.theme.wallTop; ctx.fillRect(0,0,W,H); }
      // The kitchen island: one diamond floor sprite per tile, checkered.
      for (let y=0;y<lvl.h;y++) for (let x=0;x<lvl.w;x++) {
        const [px,py]=this.iso(x,y);
        const key = (x+y)%2 ? 'floor_alt' : 'floor';
        if(!GFX.tile(ctx, key, px-tw/2, py-th/2, tw, th))
          GFX.tile(ctx, 'floor', px-tw/2, py-th/2, tw, th);
      }
      // Queue zone: a short diamond walkway in front of the kitchen.
      for (let i=-1;i<5;i++) {
        const qx = lvl.w/2 - 1 + i*0.95, qy = lvl.h + 0.45;
        const [px,py]=this.iso(qx,qy);
        ctx.globalAlpha = 0.45;
        GFX.tile(ctx, 'floor', px-tw/2, py-th/2, tw, th);
        ctx.globalAlpha = 1;
      }
    }

    // ── ELEVATED 3D COUNTER BLOCKS ────────────────────────────────────────────
    // Each block sprite is 256×256: base diamond center at y=192, top face
    // center at y=96. Drawn at (isoX-tw/2, isoY+th/2-tw, tw, tw) the base
    // lands exactly on the floor diamond and the top face at isoY - LIFT.
    drawBlock(c, gx, gy, now) {
      const {ctx,tw,th}=this;
      const [px,py]=this.iso(gx,gy);
      const key = STATION_KEY[c] || 'counter';
      if (!GFX.tile(ctx, key, px-tw/2, py+th/2-tw, tw, tw))
        GFX.tile(ctx, 'counter', px-tw/2, py+th/2-tw, tw, tw);
      const topY = py - this.lift;
      // Ingredient crates (digits 1-9): show their ingredient on the block top.
      const ing = this.lvl.crates && this.lvl.crates[c];
      if (ing) this.drawBare({id:ing, state:'raw'}, px, topY - tw*0.07, tw*0.26);
      // What's sitting on this block:
      const s = this.cur && this.cur.stations[`${gx},${gy}`];
      if (!s) return;

      if (s.item) {
        this.drawItem(s.item, px, topY - tw*0.06, tw*0.3);
        if (c==='B' && s.item.state==='raw' && s.progress>0)
          this.bar(px, topY - tw*0.42, s.progress, '#3DC9A0','#A8F0D8');
      }
      if (s.dirty!==undefined) {
        const n=Math.min(s.dirty,3);
        for(let i=0;i<n;i++) GFX.draw(ctx,'plate',px,topY-tw*0.02-i*tw*0.05,tw*0.4,tw*0.4);
        if (s.dirty>0) {
          this.glyph('🫧',px+tw*0.2,topY-tw*0.22,tw*0.18);
          ctx.font=`800 ${tw*0.16}px ui-rounded,system-ui`;
          ctx.textAlign='center'; ctx.fillStyle='#FF4070';
          ctx.fillText(String(s.dirty),px-tw*0.26,topY-tw*0.2);
        }
        if (s.progress>0) this.bar(px, topY - tw*0.42, s.progress, '#5BADDE','#A8D8F8');
      }
      if (s.contents) {
        const n=s.contents.length;
        s.contents.forEach((it,i)=>{
          const off=n>1?(i-(n-1)/2)*tw*0.16:0;
          this.drawItem(it,px+off,topY-tw*0.07,tw*(n>1?0.22:0.3),false);
        });
        if (s.state==='cooking') {
          this.bar(px, topY - tw*0.42, s.progress, '#FFD23F','#FFF0A0');
          if(Math.floor(now/280)%2) this.glyph('💨',px+tw*0.22,topY-tw*0.3,tw*0.18);
        } else if (s.state==='done') {
          this.bar(px, topY - tw*0.42, s.progress, s.progress>0.6?'#FF6040':'#3DC9A0', s.progress>0.6?'#FFA090':'#A8F0D8');
          this.glyph('✅',px+tw*0.24,topY-tw*0.28,tw*0.18);
        } else if (s.state==='burned') {
          if(Math.floor(now/250)%2) this.glyph('💨',px,topY-tw*0.32,tw*0.26);
        }
      }
      if (c==='P' && this.cur.plates!==undefined) {
        const supply=this.cur.plates;
        ctx.font=`800 ${tw*0.17}px ui-rounded,system-ui`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle=supply===0?'#FF4070':'rgba(45,22,52,0.85)';
        ctx.fillText(String(supply),px+tw*0.26,topY-tw*0.26);
      }
    }

    // ── Chefs — billboard sprites standing on the iso floor ──────────────────
    drawChef(p, now) {
      const {ctx,tw}=this;
      const [X,Yfeet]=this.isoOf(p.x,p.y);
      const bounce=p.moving?Math.abs(Math.sin(now/88))*tw*0.05:0;
      const col=this.colorOf[p.id]||PLAYER_COLORS[0];
      const isMe=p.id===this.myId;
      const ch=tw*0.82;                       // sprite height

      // Identity ring on the floor diamond (gameplay affordance).
      ctx.save();
      if (isMe) {
        const pulse=0.5+0.25*Math.sin(now/400);
        ctx.globalAlpha=pulse*0.4; ctx.fillStyle=col;
        ctx.beginPath(); ctx.ellipse(X,Yfeet,tw*0.34,tw*0.13,0,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha=isMe?0.9:0.55; ctx.fillStyle=col;
      ctx.beginPath(); ctx.ellipse(X,Yfeet,tw*0.22,tw*0.085,0,0,Math.PI*2); ctx.fill();
      ctx.restore();

      GFX.draw(ctx,'chef',X,Yfeet-bounce-ch*0.52,ch*0.85,ch);
      if(p.avatar) this.glyph(p.avatar,X,Yfeet-bounce-ch*0.62,ch*0.3);

      if (p.carry) {
        if (p.carry.kind==='plate') this.drawPlate(p.carry,X,Yfeet-bounce-ch*1.18,tw*0.3);
        else this.drawItem(p.carry,X,Yfeet-bounce-ch*1.16,tw*0.26);
      }

      const em=this.emotes[p.id];
      if (em&&em.until>now) {
        const by=Yfeet-bounce-ch*1.62;
        GFX.draw(ctx,'speech_bubble',X,by,tw*0.5,tw*0.42);
        this.glyph(em.emoji,X,by-tw*0.03,tw*0.2);
      }

      this._labels.push({
        text: isMe?'You':p.name, x: X, y: Yfeet+tw*0.2,
        size: Math.max(9,Math.round(tw*0.13)),
        color: isMe?col:'rgba(20,8,40,0.85)',
      });
    }

    // ── THE CUSTOMER QUEUE — a diagonal waiting line outside the kitchen ─────
    // Slot i sits at grid (w/2-1 + 0.95i, h+0.45): one row OUTSIDE the front
    // wall, marching down-right in screen space. Slot 0 is the head of the
    // line; when it's served, everyone's target shifts forward one slot and
    // the smoothed positions glide up the queue.
    queue(now) {
      if (!this.cur || !this.cur.orders) return [];
      const {lvl}=this;
      const orders=this.cur.orders.slice(0,5);
      const ids=new Set(orders.map(o=>o.id));
      for (const id of this.qPos.keys()) if (!ids.has(id)) this.qPos.delete(id);

      const out=[];
      orders.forEach((order,i)=>{
        const tx = lvl.w/2 - 1 + i*0.95;      // queue direction: +x (down-right)
        const ty = lvl.h + 0.45;
        let pos=this.qPos.get(order.id);
        if (!pos) {                            // spawn further down the line, walk in
          pos={x:tx+3, y:ty};
          this.qPos.set(order.id,pos);
        }
        pos.x += (tx-pos.x)*0.10;              // glide toward the current slot
        pos.y += (ty-pos.y)*0.10;
        out.push({ order, i, x:pos.x, y:pos.y,
          urgency: 1 - Math.max(0,order.ttl)/order.ttlMax });
      });
      return out;
    }

    drawCustomer(q, now) {
      const {ctx,tw}=this;
      const [X,Yfeet]=this.iso(q.x,q.y);
      const ch=tw*1.0;
      const bob=Math.sin(now/320+q.i*2.1)*ch*0.015;
      const preset=((q.order.id-1)%5+5)%5;

      GFX.draw(ctx, CUSTOMER_KEYS[preset], X, Yfeet+bob-ch*0.5, ch*0.92, ch);

      // Hearts float above the head.
      const hearts=5, lit=Math.ceil((1-q.urgency)*hearts);
      const hSz=ch*0.13, hGap=hSz*1.02, hy=Yfeet+bob-ch*1.06;
      for(let h=0;h<hearts;h++){
        const hx=X-(hearts-1)*hGap/2+h*hGap;
        GFX.draw(ctx, h<lit?'heart':'heart_empty', hx, hy, hSz, hSz);
      }

      // Recipe bubble above the hearts.
      const bubW=ch*0.6, bubH=ch*0.5, bubCY=Yfeet+bob-ch*1.5;
      GFX.draw(ctx,'speech_bubble',X,bubCY,bubW,bubH);
      const dishKey='dish_'+q.order.recipe;
      if(!GFX.draw(ctx, GFX.has(dishKey)?dishKey:'__none__', X, bubCY-bubH*0.06, bubW*0.62, bubH*0.62))
        this.glyph(q.order.emoji||'🍽️', X, bubCY-bubH*0.06, bubH*0.45);
      if (q.order.vip) this.glyph('👑', X+bubW*0.42, bubCY-bubH*0.42, bubH*0.32);
    }

    // ── Particle effects (screen space, drawn last = always on top) ──────────
    drawEffects(now) {
      const {ctx}=this;
      const ts=this.tw*0.6;
      this.fx=this.fx.filter((f)=>{
        f.t+=1/60;
        if(f.kind==='ripple'){
          const a=1-f.t/0.4; if(a<=0) return false;
          ctx.strokeStyle=`rgba(255,111,174,${a*0.8})`; ctx.lineWidth=3*this.dpr;
          ctx.beginPath(); ctx.arc(f.x,f.y,(f.t/0.4)*ts*0.7,0,Math.PI*2); ctx.stroke();
        } else if(f.kind==='points'){
          const a=1-f.t/1.2; if(a<=0) return false;
          const sz=ts*0.44;
          ctx.font=`800 ${sz}px ui-rounded,system-ui`;
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.globalAlpha=Math.min(1,a*2)*0.4; ctx.fillStyle='#000';
          ctx.fillText(f.text,f.x+2,f.y-f.t*ts*1.2+2);
          ctx.globalAlpha=Math.min(1,a*2); ctx.fillStyle=f.color||'#3DC9A0';
          ctx.fillText(f.text,f.x,f.y-f.t*ts*1.2); ctx.globalAlpha=1;
        } else if(f.kind==='pop'){
          const a=1-f.t/0.65; if(a<=0) return false;
          ctx.globalAlpha=a; this.glyph(f.text,f.x,f.y-f.t*ts,ts*0.54); ctx.globalAlpha=1;
        } else if(f.kind==='coin'){
          if(f.t>1.0) return false;
          f.vy += 0.45 * this.dpr; f.x += f.vx; f.y += f.vy; f.rot += f.vrot;
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
            // Iso-flatten the ring (y radius halved) so it hugs the counter top.
            const sx=f.x+Math.cos(sa)*r, sy=f.y+Math.sin(sa)*r*0.5;
            ctx.save(); ctx.globalAlpha=a; ctx.translate(sx,sy); ctx.rotate(sa+f.t*5);
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
          f.vy+=0.28; f.x+=f.vx*this.dpr; f.y+=f.vy*this.dpr; f.rot=(f.rot||0)+0.16;
          const a=Math.max(0,1-f.t*0.9);
          ctx.globalAlpha=a; ctx.fillStyle=f.color;
          const sz=5.5*this.dpr;
          ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.rot);
          if(f.shape===0){ ctx.beginPath(); ctx.arc(0,0,sz*0.55,0,Math.PI*2); ctx.fill(); }
          else if(f.shape===1){ if(ctx.roundRect) ctx.roundRect(-sz/2,-sz/2,sz,sz,sz*0.3); else ctx.rect(-sz/2,-sz/2,sz,sz); ctx.fill(); }
          else { ctx.beginPath(); ctx.moveTo(0,-sz*0.6); ctx.lineTo(sz*0.55,sz*0.45); ctx.lineTo(-sz*0.55,sz*0.45); ctx.closePath(); ctx.fill(); }
          ctx.restore(); ctx.globalAlpha=1;
        }
        return true;
      });
    }

    // ── Item rendering — image sprites only ────────────────────────────────────
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
      const {ctx,tw}=this;
      const w=tw*0.5, h=tw*0.07, x0=cx-w/2, y0=topY;
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
