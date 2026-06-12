// Canvas kitchen renderer — Cake Mania style
// Perspective wood floor · cartoon 3D stations · illustrated back wall · chef hats · customer faces
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

  // Cake Mania-style themes: warm illustrated kitchen
  const THEMES = {
    diner: {
      floorBase: '#C8552A', floorHi: '#E07848', floorShadow: '#A03818',
      plankA: '#C8552A', plankB: '#B84820',
      wallTop: '#3DBBB8', wallBot: '#2D9A98',
      wallTrim: '#1A6A68', baseboard: '#2A1A10',
      counterTop: '#F5EDD8', counterFront: '#E8D8B8', counterLine: '#C4A870',
      counterOutline: '#3A2010',
      bgA: '#FF7DB8', bgB: '#FFB0D8',
      ceilingColor: '#FFE0D0',
    },
    winter: {
      floorBase: '#6858B8', floorHi: '#8878D0', floorShadow: '#4840A0',
      plankA: '#6858B8', plankB: '#5848A8',
      wallTop: '#A8D8F8', wallBot: '#88C0F0',
      wallTrim: '#4888C0', baseboard: '#282060',
      counterTop: '#EEF4FF', counterFront: '#D8E8F8', counterLine: '#8AAAC8',
      counterOutline: '#282060',
      bgA: '#7860C8', bgB: '#A888E8',
      ceilingColor: '#D0E8FF',
    },
    beach: {
      floorBase: '#D4A840', floorHi: '#E8C060', floorShadow: '#B08820',
      plankA: '#D4A840', plankB: '#C09830',
      wallTop: '#48C8E8', wallBot: '#28A8C8',
      wallTrim: '#1878A0', baseboard: '#3A2808',
      counterTop: '#FFFFF0', counterFront: '#F0F8E0', counterLine: '#A8C870',
      counterOutline: '#2A3010',
      bgA: '#28C898', bgB: '#58E8B8',
      ceilingColor: '#E8F8FF',
    },
  };

  // ── Customer face SVG ───────────────────────────────────────────────────────
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

  // ── Renderer ─────────────────────────────────────────────────────────────────
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
      this.theme   = THEMES[staticState.theme] || THEMES.diner;
      this.themeName = staticState.theme || 'diner';
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
        const cx = (e.clientX-rect.left)*(canvas.width/rect.width);
        const cy = (e.clientY-rect.top)*(canvas.height/rect.height);
        const tx = Math.floor((cx-this.ox)/this.ts);
        const ty = Math.floor((cy-this.oy)/this.ts);
        this.fx.push({kind:'ripple',x:cx,y:cy,t:0});
        if (tx>=0&&ty>=0&&tx<this.lvl.w&&ty<this.lvl.h) this.onTap(tx,ty);
      });
      requestAnimationFrame(()=>this.frame());
    }

    destroy() { this.running=false; window.removeEventListener('resize',this.resize); }

    resize() {
      const wrap=this.canvas.parentElement;
      const w=wrap.clientWidth, h=wrap.clientHeight;
      this.canvas.width  = Math.round(w*this.dpr);
      this.canvas.height = Math.round(h*this.dpr);
      this.bgCanvas.width  = this.canvas.width;
      this.bgCanvas.height = this.canvas.height;
      // Reserve bottom 34% of canvas for customer queue (hearts + bubble + figure)
      const custReserve = Math.floor(this.canvas.height * 0.34);
      this.ts = Math.floor(Math.min(this.canvas.width/this.lvl.w, (this.canvas.height - custReserve)/this.lvl.h));
      this.ox = Math.floor((this.canvas.width  - this.ts*this.lvl.w)/2);
      this.oy = Math.floor(((this.canvas.height - custReserve) - this.ts*this.lvl.h)/2);
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
      // Coin burst erupts from the serve window position
      const px = this.ox + (gx + 0.5) * this.ts;
      const py = this.oy + (gy + 0.5) * this.ts;
      const n = vip ? 22 : 14;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const spd = (2.5 + Math.random() * 3.5) * this.dpr;
        this.fx.push({
          kind: 'coin', x: px, y: py, t: 0,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 2 * this.dpr,
          rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.3,
          size: (vip ? 9 : 7) * this.dpr,
        });
      }
      // Big point pop
      this.fx.push({ kind: 'points', x: px, y: py - this.ts * 0.4, text: `+${points}`, t: 0, color: vip ? '#FFD700' : '#3DC9A0' });
      // Sparkle ring
      this.fx.push({ kind: 'ring', x: px, y: py, t: 0, maxR: this.ts * 1.1, color: vip ? '#FFD700' : '#FF6FAE' });
    }

    addFx(ev) {
      const px=(x)=>this.ox+(x+0.5)*this.ts;
      const py=(y)=>this.oy+(y+0.5)*this.ts;
      const cols=['#FF6FAE','#FFD23F','#3DC9A0','#C09BFF','#FF8251','#5BADDE'];
      if (ev.type==='serve') {
        this.fx.push({kind:'points',x:px(ev.x),y:py(ev.y),text:`+${ev.points}`,t:0});
        for (let i=0;i<16;i++) this.fx.push({
          kind:'confetti',x:px(ev.x),y:py(ev.y),t:0,
          vx:(Math.random()-0.5)*8,vy:-Math.random()*9-2,
          color:cols[i%cols.length],shape:i%3,rot:Math.random()*Math.PI*2,
        });
      } else if (ev.type==='burn') {
        this.fx.push({kind:'points',x:px(ev.x),y:py(ev.y),text:'🔥 burned!',t:0,color:'#FF6040'});
      } else if (ev.type==='chopped'||ev.type==='ding') {
        this.fx.push({kind:'pop',x:px(ev.x),y:py(ev.y),text:ev.type==='ding'?'♨️':'✨',t:0});
      } else if (ev.type==='reject'&&ev.playerId===this.myId) {
        this.fx.push({kind:'points',x:px(ev.x),y:py(ev.y),text:'✕',t:0,color:'#FF4070'});
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

    // ── Main draw ─────────────────────────────────────────────────────────────
    draw() {
      const {ctx}=this;
      const now=performance.now();
      ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

      if (this.bgDirty) { this.renderBackground(); this.bgDirty=false; }
      ctx.drawImage(this.bgCanvas,0,0);

      this.drawStationAnimations(now);
      if (this.cur) {
        this.drawStationContents(now);
        this.drawCustomers(now);
      }
      this.drawChefs(now);
      this.drawEffects(now);
    }

    // ── Background cache ───────────────────────────────────────────────────────
    // ── Background cache — image tiles only ────────────────────────────────────
    renderBackground() {
      const ctx=this.bgCtx, {ts,ox,oy,lvl}=this;
      const W=this.bgCanvas.width, H=this.bgCanvas.height;
      ctx.clearRect(0,0,W,H);
      // Wall behind everything, floor tiled over the whole canvas.
      if(!GFX.tile(ctx,'wall',0,0,W,H)){ ctx.fillStyle=this.theme.wallTop; ctx.fillRect(0,0,W,H); }
      for(let X=ox-ts; X<W+ts; X+=ts)
        for(let Y=oy; Y<H+ts; Y+=ts)
          GFX.tile(ctx,'floor',X,Y,ts,ts);
      // Counters + appliances: each non-floor cell is an image.
      for(let y=0;y<lvl.h;y++)for(let x=0;x<lvl.w;x++){
        const c=lvl.grid[y][x]; if(c==='.') continue;
        const X=ox+x*ts, Y=oy+y*ts;
        GFX.tile(ctx,'counter',X,Y,ts,ts);
        this.drawStationBase(ctx,c,X,Y);
      }
    }

    // Station appliance sprite (image only — zero shapes).
    drawStationBase(ctx, c, X, Y) {
      const key=STATION_KEY[c];
      if(key) GFX.draw(ctx,key,X+this.ts/2,Y+this.ts/2,this.ts*0.96,this.ts*0.96);
    }

    // Sizzle/steam is baked into the station sprite (or a .gif). Nothing to draw.
    drawStationAnimations(now) {}


    drawStationContents(now) {
      const {ctx,ts,ox,oy,lvl}=this;
      for(const [key,s] of Object.entries(this.cur.stations)){
        const [x,y]=key.split(',').map(Number);
        const X=ox+x*ts, Y=oy+y*ts;
        const cell=lvl.grid[y][x];

        if(s.item){
          this.drawItem(s.item,X+ts/2,Y+ts*0.42,ts*0.6);
          if(cell==='B'&&s.item.state==='raw'&&s.progress>0)
            this.bar(X,Y,s.progress,'#3DC9A0','#A8F0D8');
        }
        if(s.dirty!==undefined){
          const n=Math.min(s.dirty,3);
          for(let i=0;i<n;i++) GFX.draw(ctx,'plate',X+ts/2,Y+ts*(0.5-i*0.06),ts*0.62,ts*0.62);
          if(s.dirty>0){
            this.glyph('🫧',X+ts*0.74,Y+ts*0.3,ts*0.3);
            ctx.font=`800 ${ts*0.26}px ui-rounded,system-ui`;
            ctx.textAlign='center'; ctx.fillStyle='#FF4070';
            ctx.fillText(String(s.dirty),X+ts*0.2,Y+ts*0.24);
          }
          if(s.progress>0) this.bar(X,Y,s.progress,'#5BADDE','#A8D8F8');
        }
        if(s.contents){
          const n=s.contents.length;
          s.contents.forEach((it,i)=>{
            const off=n>1?(i-(n-1)/2)*ts*0.26:0;
            this.drawItem(it,X+ts/2+off,Y+ts*0.42,ts*(n>1?0.42:0.6),false);
          });
          if(s.state==='cooking'){
            this.bar(X,Y,s.progress,'#FFD23F','#FFF0A0');
            if(Math.floor(now/280)%2) this.glyph('💨',X+ts*0.78,Y+ts*0.2,ts*0.3);
          } else if(s.state==='done'){
            this.bar(X,Y,s.progress,s.progress>0.6?'#FF6040':'#3DC9A0',s.progress>0.6?'#FFA090':'#A8F0D8');
            this.glyph('✅',X+ts*0.8,Y+ts*0.22,ts*0.3);
          } else if(s.state==='burned'){
            if(Math.floor(now/250)%2) this.glyph('💨',X+ts*0.5,Y+ts*0.1,ts*0.4);
          }
        }
        if(cell==='P'&&this.cur.plates!==undefined){
          const supply=this.cur.plates;
          ctx.font=`800 ${ts*0.27}px ui-rounded,system-ui`;
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillStyle=supply===0?'#FF4070':'rgba(45,22,52,0.8)';
          ctx.fillText(String(supply),X+ts*0.82,Y+ts*0.22);
        }
      }
    }


    // ── Chefs — image sprite only ──────────────────────────────────────────────
    drawChefs(now) {
      const {ctx,ts,ox,oy}=this;
      for(const p of this.lerpPlayers()){
        const X=ox+p.x*ts, Y=oy+p.y*ts;
        const bounce=p.moving?Math.abs(Math.sin(now/88))*ts*0.1:0;
        const col=this.colorOf[p.id]||PLAYER_COLORS[0];
        const isMe=p.id===this.myId;
        const r=ts*0.5;

        // Identity highlight on the floor (Overcooked-style affordance, not art).
        ctx.save();
        if(isMe){
          const pulse=0.5+0.25*Math.sin(now/400);
          ctx.globalAlpha=pulse*0.4; ctx.fillStyle=col;
          ctx.beginPath(); ctx.ellipse(X,Y+r*0.8,r*0.95,r*0.34,0,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=isMe?0.95:0.6; ctx.fillStyle=col;
        ctx.beginPath(); ctx.ellipse(X,Y+r*0.8,r*0.6,r*0.2,0,0,Math.PI*2); ctx.fill();
        ctx.restore();

        // Chef sprite + the player's chosen avatar as an identity badge.
        GFX.draw(ctx,'chef',X,Y-bounce-r*0.35,ts*1.05,ts*1.3);
        if(p.avatar) this.glyph(p.avatar,X,Y-bounce-r*0.5,ts*0.4);

        // Carried item floats above.
        if(p.carry){
          if(p.carry.kind==='plate') this.drawPlate(p.carry,X,Y-bounce-r*1.5,ts*0.6);
          else this.drawItem(p.carry,X,Y-bounce-r*1.45,ts*0.52);
        }

        // Emote bubble.
        const em=this.emotes[p.id];
        if(em&&em.until>now){
          const by=Y-bounce-r*2.4;
          GFX.draw(ctx,'speech_bubble',X,by,ts*0.95,ts*0.82);
          this.glyph(em.emoji,X,by-ts*0.06,ts*0.4);
        }

        // Name.
        const nSz=Math.max(9,Math.round(ts*0.22));
        const label=isMe?'You':p.name;
        ctx.font=`800 ${nSz}px ui-rounded,system-ui`;
        ctx.textAlign='center'; ctx.textBaseline='alphabetic';
        ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.fillText(label,X+1,Y+r*1.5+1);
        ctx.fillStyle=isMe?col:'rgba(20,8,40,0.85)'; ctx.fillText(label,X,Y+r*1.5);
      }
    }

    // ── Particle effects ───────────────────────────────────────────────────────

    drawEffects(now) {
      const {ctx,ts}=this;
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
          // Gold coin
          const r = f.size * Math.abs(Math.cos(f.rot * 2 + 0.5)); // squish for spin illusion
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
          // Draw 8 sparkle stars around the ring
          for(let si=0;si<8;si++){
            const sa=si/8*Math.PI*2+f.t*3;
            const sx=f.x+Math.cos(sa)*r, sy=f.y+Math.sin(sa)*r;
            ctx.save(); ctx.globalAlpha=a; ctx.translate(sx,sy); ctx.rotate(sa+f.t*5);
            ctx.fillStyle=f.color;
            const sr=this.ts*0.07;
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

    // ── Item rendering ────────────────────────────────────────────────────────
    // ── Item rendering — image sprites only ────────────────────────────────────
    drawItem(item,x,y,size,chip=false){
      if(item.kind==='plate'){this.drawPlate(item,x,y,size);return;}
      if(item.kind==='stack'){this.drawStack(item,x,y,size);return;}
      this.drawBare(item,x,y,size);
    }
    drawBare(item,x,y,size){
      if(GFX.draw(this.ctx,itemKey(item),x,y,size*1.7,size*1.7)) return;
      this.glyph(itemEmoji(item),x,y,size); // final fallback only if even the placeholder is missing
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

    badge(text,x,y,size){
      const {ctx}=this;
      ctx.fillStyle='#FFFDF8'; ctx.beginPath(); ctx.arc(x,y,size*0.62,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=1.5*this.dpr; ctx.stroke();
      this.glyph(text,x,y,size*0.85);
    }
    bar(X,Y,frac,colorA,colorB){
      const {ctx,ts}=this;
      const w=ts*0.8, h=ts*0.13, x0=X+ts*0.1, y0=Y-ts*0.1;
      ctx.fillStyle='rgba(0,0,0,0.28)'; this.rrC(ctx,x0,y0,w,h,h/2); ctx.fill();
      const fw=Math.max(w*Math.min(frac,1),h*0.6);
      const bg=ctx.createLinearGradient(x0,y0,x0+fw,y0);
      bg.addColorStop(0,colorB||colorA); bg.addColorStop(1,colorA);
      ctx.fillStyle=bg; this.rrC(ctx,x0,y0,fw,h,h/2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.38)';
      this.rrC(ctx,x0+h*0.3,y0+h*0.15,fw-h*0.6,h*0.45,h*0.2); ctx.fill();
    }

    // ── Animated customers on the floor ──────────────────────────────────────
    // ── Customers — image sprite + recipe bubble (no name banners) ─────────────
    drawCustomers(now) {
      if (!this.cur || !this.cur.orders || !this.cur.orders.length) return;
      if (!this.orderSeen) this.orderSeen = new Map();
      const {ctx, ts, ox, oy, lvl} = this;
      const orders = this.cur.orders.slice(0, 5);
      const ids = new Set(orders.map(o => o.id));
      for (const id of this.orderSeen.keys()) if (!ids.has(id)) this.orderSeen.delete(id);
      orders.forEach(o => { if (!this.orderSeen.has(o.id)) this.orderSeen.set(o.id, now); });

      const gridBot = oy + lvl.h * ts;
      const belowH = this.canvas.height - gridBot;
      const custH = Math.min(belowH * 0.9, ts * 1.7);
      if (custH < 18) return;
      const slotW = (lvl.w * ts) / orders.length;

      orders.forEach((order, i) => {
        const age = now - (this.orderSeen.get(order.id) || now);
        const walkIn = this.easeOut(age / 500);
        const urgency = 1 - Math.max(0, order.ttl) / order.ttlMax;
        const targX = ox + slotW * (i + 0.5);
        const feetY = gridBot + custH * 0.6;
        const startY = this.canvas.height + custH;
        const cy = startY + (feetY - startY) * walkIn;
        const bounce = walkIn >= 1 ? Math.sin(now/320 + i*2.1) * custH * 0.02 : 0;
        const y = cy + bounce;

        const preset = ((order.id - 1) % 5 + 5) % 5;

        // Character sprite (feet anchored at y).
        GFX.draw(ctx, CUSTOMER_KEYS[preset], targX, y - custH*0.5, custH*0.92, custH);

        // Heart meter (image hearts, drain with urgency).
        const hearts=5, lit=Math.ceil((1-urgency)*hearts);
        const hSz=custH*0.14, hGap=hSz*1.02, hy=y - custH*1.04;
        for(let h=0;h<hearts;h++){
          const hx=targX-(hearts-1)*hGap/2+h*hGap;
          GFX.draw(ctx, h<lit?'heart':'heart_empty', hx, hy, hSz, hSz);
        }

        // Speech bubble with the recipe image they want.
        const bubW=custH*0.66, bubH=custH*0.54, bubCY=y - custH*1.52;
        GFX.draw(ctx,'speech_bubble',targX,bubCY,bubW,bubH);
        const dishKey='dish_'+order.recipe;
        if(!GFX.draw(ctx, GFX.has(dishKey)?dishKey:'__none__', targX, bubCY-bubH*0.06, bubW*0.62, bubH*0.62))
          this.glyph(order.emoji||'🍽️', targX, bubCY-bubH*0.06, bubH*0.5);
      });
    }

    // ── Canvas helpers ────────────────────────────────────────────────────────

    glyph(text,x,y,size,centered=true){
      const {ctx}=this;
      ctx.font=`${Math.round(size)}px "Apple Color Emoji","Segoe UI Emoji",system-ui`;
      ctx.textAlign=centered?'center':'left'; ctx.textBaseline='middle';
      ctx.fillText(text,x,y);
    }
    glyphC(ctx,text,x,y,size){
      ctx.font=`${Math.round(size)}px "Apple Color Emoji","Segoe UI Emoji",system-ui`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,x,y);
    }
    drawBareC(ctx,item,x,y,size){ this.glyphC(ctx,itemEmoji(item),x,y,size); }
    rrC(ctx,x,y,w,h,r){
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(x,y,w,h,r); else ctx.rect(x,y,w,h);
    }
    shiftHex(hex,amt){
      const h=hex.replace('#','');
      const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
      const cl=(v)=>Math.min(255,Math.max(0,Math.round(v+amt*255)));
      return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
    }
  }

  window.KSRender = { Renderer, itemEmoji, tokenEmoji, tokenHtml, prepChainHtml, customerFace };
})();
