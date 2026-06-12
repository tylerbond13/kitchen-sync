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
      // Reserve bottom 26% of canvas for customer queue; fit grid in remaining 74%
      const custReserve = Math.floor(this.canvas.height * 0.26);
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
    renderBackground() {
      const ctx=this.bgCtx;
      const {ts,ox,oy,lvl}=this;
      ctx.clearRect(0,0,this.bgCanvas.width,this.bgCanvas.height);

      this.drawWall(ctx);
      this.drawPerspectiveFloor(ctx);

      // Draw merged counter runs first (so appliances sit on top)
      this.drawCounterRuns(ctx);

      // Draw all non-counter appliances
      for (let y=0;y<lvl.h;y++) {
        for (let x=0;x<lvl.w;x++) {
          const c=lvl.grid[y][x];
          const X=ox+x*ts, Y=oy+y*ts;
          if (c!=='.' && c!=='#') this.drawStationBase(ctx,c,x,y,X,Y);
        }
      }
    }

    // ── Merged counter runs — scan each row for runs of # cells ──────────────
    drawCounterRuns(ctx) {
      const {ts,ox,oy,lvl}=this;
      const t=this.theme;
      const ol=Math.max(2.5,ts*0.055)*this.dpr;

      for (let y=0;y<lvl.h;y++) {
        let runStart=-1;
        const flush=(endX)=>{
          if (runStart<0) return;
          const rx=ox+runStart*ts, ry=oy+y*ts;
          const rw=(endX-runStart)*ts;
          const slabH=ts*0.55, slabY=ry+ts*0.2, frontH=ts*0.2;
          const r=ts*0.12;

          // Shadow
          ctx.fillStyle='rgba(0,0,0,0.14)';
          ctx.fillRect(rx+4,slabY+slabH+frontH*0.5,rw-4,8);

          // Front face
          ctx.fillStyle=t.counterFront;
          ctx.fillRect(rx,slabY+slabH-frontH*0.3,rw,frontH);

          // Top face
          const cg=ctx.createLinearGradient(rx,slabY,rx,slabY+slabH);
          cg.addColorStop(0,t.counterTop); cg.addColorStop(1,t.counterFront);
          ctx.fillStyle=cg;
          ctx.beginPath();
          if(ctx.roundRect) ctx.roundRect(rx,slabY,rw,slabH-frontH*0.3,r);
          else ctx.rect(rx,slabY,rw,slabH-frontH*0.3);
          ctx.fill();

          // Shine
          ctx.fillStyle='rgba(255,255,255,0.38)';
          ctx.beginPath();
          if(ctx.roundRect) ctx.roundRect(rx+6,slabY+5,rw-12,slabH*0.14,[r,r,0,0]);
          else ctx.rect(rx+6,slabY+5,rw-12,slabH*0.14);
          ctx.fill();

          // Edge trim lines (tile seams along run)
          ctx.strokeStyle=t.counterLine||'rgba(180,140,80,0.35)'; ctx.lineWidth=1.5*this.dpr;
          for(let tx2=runStart+1;tx2<endX;tx2++){
            const seam=ox+tx2*ts;
            ctx.beginPath(); ctx.moveTo(seam,slabY+slabH*0.12); ctx.lineTo(seam,slabY+slabH*0.88); ctx.stroke();
          }

          // Outline
          ctx.strokeStyle=t.counterOutline; ctx.lineWidth=ol;
          ctx.beginPath();
          if(ctx.roundRect) ctx.roundRect(rx,slabY,rw,slabH+frontH*0.7,r);
          else ctx.rect(rx,slabY,rw,slabH+frontH*0.7);
          ctx.stroke();

          runStart=-1;
        };

        for (let x=0;x<lvl.w;x++) {
          if (lvl.grid[y][x]==='#') { if(runStart<0) runStart=x; }
          else flush(x);
        }
        flush(lvl.w);
      }
    }

    // ── Back wall ──────────────────────────────────────────────────────────────
    drawWall(ctx) {
      const {ts,ox,oy,lvl}=this;
      const cw=this.bgCanvas.width, ch=this.bgCanvas.height;
      const t=this.theme;
      const gw=lvl.w*ts;
      const gridBot=oy+lvl.h*ts;

      // Full canvas bg
      ctx.fillStyle=t.wallBot;
      ctx.fillRect(0,0,cw,ch);

      // Wall gradient
      const wallH=oy+ts*1.2;
      const wg=ctx.createLinearGradient(0,0,0,wallH);
      wg.addColorStop(0,t.wallTop);
      wg.addColorStop(1,t.wallBot);
      ctx.fillStyle=wg;
      ctx.fillRect(0,0,cw,wallH);

      // Ceiling strip
      const ceilH=Math.max(oy*0.15,6);
      ctx.fillStyle=this.theme.ceilingColor;
      ctx.fillRect(0,0,cw,ceilH);

      // Side walls
      ctx.fillStyle=t.wallBot;
      ctx.fillRect(0,ceilH,ox,gridBot-ceilH);
      ctx.fillRect(ox+gw,ceilH,cw-ox-gw,gridBot-ceilH);

      // Horizontal chair-rail line
      const railY=oy*0.55;
      ctx.fillStyle='rgba(0,0,0,0.1)';
      ctx.fillRect(0,railY,cw,Math.max(2,ts*0.04));
      ctx.fillStyle='rgba(255,255,255,0.18)';
      ctx.fillRect(0,railY-Math.max(1,ts*0.02),cw,Math.max(1,ts*0.02));

      // Thick baseboard
      const bbH=Math.max(ts*0.18,8);
      ctx.fillStyle=t.baseboard;
      ctx.fillRect(ox-bbH,oy-bbH*0.3,gw+bbH*2,bbH);
      ctx.fillStyle='rgba(255,255,255,0.12)';
      ctx.fillRect(ox-bbH,oy-bbH*0.3,gw+bbH*2,bbH*0.28);

      // World decorations
      if (this.themeName==='diner')  this.drawWallDeco_diner(ctx);
      else if (this.themeName==='winter') this.drawWallDeco_winter(ctx);
      else if (this.themeName==='beach')  this.drawWallDeco_beach(ctx);

      // Side trim pillars
      const pilW=Math.max(ts*0.14,8);
      ctx.fillStyle=t.wallTrim;
      ctx.fillRect(ox-pilW,oy-bbH,pilW,oy-bbH+ts*2);
      ctx.fillRect(ox+gw,oy-bbH,pilW,oy-bbH+ts*2);
      ctx.fillStyle='rgba(255,255,255,0.2)';
      ctx.fillRect(ox-pilW,oy-bbH,pilW*0.2,oy-bbH+ts*2);
    }

    // ── Perspective wood floor ─────────────────────────────────────────────────
    drawPerspectiveFloor(ctx) {
      const {ts,ox,oy,lvl}=this;
      const t=this.theme;
      const gw=lvl.w*ts, gh=lvl.h*ts;
      const floorTop=oy, floorBot=oy+gh;

      // Base fill
      ctx.fillStyle=t.floorBase;
      ctx.fillRect(ox,floorTop,gw,gh);

      // Perspective depth gradient: dark at top (far), light at bottom (near)
      const dg=ctx.createLinearGradient(ox,floorTop,ox,floorBot);
      dg.addColorStop(0,'rgba(0,0,0,0.42)');
      dg.addColorStop(0.5,'rgba(0,0,0,0.1)');
      dg.addColorStop(1,'rgba(255,255,255,0.1)');
      ctx.fillStyle=dg; ctx.fillRect(ox,floorTop,gw,gh);

      // Horizontal plank seams — one per grid row
      for (let gy=0;gy<lvl.h;gy++) {
        const Y=oy+gy*ts;
        // Alternate plank tone
        if (gy%2===0) {
          ctx.fillStyle='rgba(0,0,0,0.06)';
          ctx.fillRect(ox,Y,gw,ts);
        }
        // Seam line
        ctx.strokeStyle='rgba(0,0,0,0.28)';
        ctx.lineWidth=Math.max(1.5,ts*0.025);
        ctx.beginPath(); ctx.moveTo(ox,Y); ctx.lineTo(ox+gw,Y); ctx.stroke();
        // Highlight just below seam
        ctx.strokeStyle='rgba(255,255,255,0.1)';
        ctx.lineWidth=Math.max(1,ts*0.012);
        ctx.beginPath(); ctx.moveTo(ox,Y+ts*0.04); ctx.lineTo(ox+gw,Y+ts*0.04); ctx.stroke();
      }

      // Vertical plank joints (staggered per row)
      ctx.strokeStyle='rgba(0,0,0,0.14)';
      ctx.lineWidth=Math.max(1,ts*0.016);
      for (let gx=0;gx<lvl.w;gx++) {
        const X=ox+gx*ts;
        for (let gy=0;gy<lvl.h;gy++) {
          if ((gx+gy)%3===0) {
            const Y=oy+gy*ts;
            ctx.beginPath(); ctx.moveTo(X,Y+ts*0.06); ctx.lineTo(X,Y+ts*0.94); ctx.stroke();
          }
        }
      }

      // Centre highlight streak (light from above)
      const sg=ctx.createLinearGradient(ox,floorTop,ox+gw,floorTop);
      sg.addColorStop(0,'rgba(255,210,160,0)');
      sg.addColorStop(0.4,'rgba(255,210,160,0.12)');
      sg.addColorStop(0.6,'rgba(255,210,160,0.12)');
      sg.addColorStop(1,'rgba(255,210,160,0)');
      ctx.fillStyle=sg; ctx.fillRect(ox,floorTop,gw,gh);

      // Bottom vignette
      const bv=ctx.createLinearGradient(0,floorBot-ts*0.35,0,floorBot);
      bv.addColorStop(0,'rgba(0,0,0,0)'); bv.addColorStop(1,'rgba(0,0,0,0.25)');
      ctx.fillStyle=bv; ctx.fillRect(ox,floorBot-ts*0.35,gw,ts*0.35);
    }

    // ── World wall decorations ─────────────────────────────────────────────────
    drawWallDeco_diner(ctx) {
      const {ts,ox,oy,lvl}=this;
      const gw=lvl.w*ts;

      // Pendant lights (3 evenly spaced)
      [0.18,0.5,0.82].forEach((pct)=>{
        const lx=ox+gw*pct;
        const cordLen=oy*0.55;
        ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=2*this.dpr;
        ctx.beginPath(); ctx.moveTo(lx,0); ctx.lineTo(lx,cordLen); ctx.stroke();
        const sw=ts*0.38, sh=ts*0.26;
        ctx.fillStyle='#F0A820';
        ctx.beginPath();
        ctx.moveTo(lx-sw*0.28,cordLen); ctx.lineTo(lx+sw*0.28,cordLen);
        ctx.lineTo(lx+sw*0.52,cordLen+sh); ctx.lineTo(lx-sw*0.52,cordLen+sh);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle='#9A6810'; ctx.lineWidth=2*this.dpr; ctx.stroke();
        const gg=ctx.createRadialGradient(lx,cordLen+sh*0.5,0,lx,cordLen+sh*0.5,ts*0.85);
        gg.addColorStop(0,'rgba(255,220,80,0.35)'); gg.addColorStop(1,'rgba(255,220,80,0)');
        ctx.fillStyle=gg;
        ctx.beginPath(); ctx.arc(lx,cordLen+sh*0.5,ts*0.85,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#FFF8C0';
        ctx.beginPath(); ctx.arc(lx,cordLen+sh*0.08,ts*0.065,0,Math.PI*2); ctx.fill();
      });

      // Retro wall clock
      const cr=Math.min(oy*0.27,ts*0.38,30);
      if (cr>8) {
        const cx=ox+gw/2, cy=oy*0.3;
        ctx.fillStyle='#FFF8F0'; ctx.beginPath(); ctx.arc(cx,cy,cr,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#3A1808'; ctx.lineWidth=3*this.dpr; ctx.stroke();
        for (let i=0;i<12;i++) {
          const a=(i/12)*Math.PI*2-Math.PI/2;
          ctx.strokeStyle='#3A1808'; ctx.lineWidth=(i%3===0?2:1)*this.dpr;
          ctx.beginPath();
          ctx.moveTo(cx+Math.cos(a)*cr*(i%3===0?0.7:0.82),cy+Math.sin(a)*cr*(i%3===0?0.7:0.82));
          ctx.lineTo(cx+Math.cos(a)*cr*0.93,cy+Math.sin(a)*cr*0.93); ctx.stroke();
        }
        ctx.lineCap='round'; ctx.strokeStyle='#1A0800';
        ctx.lineWidth=2.5*this.dpr;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx,cy-cr*0.54); ctx.stroke();
        ctx.lineWidth=1.8*this.dpr;
        const mA=-Math.PI/2+Math.PI/6;
        ctx.beginPath(); ctx.moveTo(cx,cy);
        ctx.lineTo(cx+Math.cos(mA)*cr*0.7,cy+Math.sin(mA)*cr*0.7); ctx.stroke();
        ctx.lineCap='butt';
        ctx.fillStyle='#E03020'; ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fill();
      }

      // Red/white checkered wainscot
      const wcH=Math.max(oy*0.16,5);
      const wcY=oy-wcH*0.5;
      const sqS=wcH;
      let red=true;
      for (let wx=ox;wx<ox+gw;wx+=sqS,red=!red) {
        ctx.fillStyle=red?'#C82020':'#FFFEF8';
        ctx.fillRect(wx,wcY,sqS,wcH);
      }
      ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.lineWidth=1; ctx.strokeRect(ox,wcY,gw,wcH);

      // Menu board
      const mbW=ts*1.9, mbH=ts*0.95;
      const mbX=ox+gw*0.7, mbY=oy*0.1;
      ctx.fillStyle='#1A0808';
      if(ctx.roundRect) ctx.roundRect(mbX,mbY,mbW,mbH,4); else ctx.rect(mbX,mbY,mbW,mbH);
      ctx.fill();
      ctx.strokeStyle='#8A5020'; ctx.lineWidth=3*this.dpr; ctx.stroke();
      ctx.fillStyle='rgba(255,230,180,0.9)';
      ctx.font=`bold ${Math.max(8,ts*0.14)}px sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ['🍔 Burger','🍕 Pizza','🥗 Salad'].forEach((txt,i)=>{
        ctx.fillText(txt,mbX+mbW/2,mbY+mbH*(0.25+i*0.3));
      });

      // Sauce bottles on shelf
      [[ox+gw*0.33,oy-ts*0.28,'#E02020'],[ox+gw*0.4,oy-ts*0.28,'#E0C020']].forEach(([bx,by,col])=>{
        ctx.fillStyle=col;
        const bw=ts*0.07, bh=ts*0.22;
        if(ctx.roundRect) ctx.roundRect(bx-bw/2,by,bw,bh,bw*0.4); else ctx.rect(bx-bw/2,by,bw,bh);
        ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.28)'; ctx.fillRect(bx-bw*0.1,by+bh*0.08,bw*0.2,bh*0.5);
        ctx.strokeStyle='rgba(0,0,0,0.28)'; ctx.lineWidth=1*this.dpr; ctx.stroke();
      });
    }

    drawWallDeco_winter(ctx) {
      const {ts,ox,oy,lvl}=this;
      const gw=lvl.w*ts;

      const winW=Math.min(gw*0.5,ts*4);
      const winH=Math.max(oy*0.65,ts*0.75);
      const winX=ox+gw/2-winW/2, winY=oy*0.06;

      const sky=ctx.createLinearGradient(winX,winY,winX,winY+winH);
      sky.addColorStop(0,'#8BBCE8'); sky.addColorStop(1,'#C8E0F8');
      ctx.fillStyle=sky;
      if(ctx.roundRect) ctx.roundRect(winX,winY,winW,winH,6); else ctx.rect(winX,winY,winW,winH);
      ctx.fill();

      // Pine trees
      [[winX+winW*0.15,winY+winH*0.44],[winX+winW*0.74,winY+winH*0.48]].forEach(([tx,ty])=>{
        ctx.fillStyle='#1A4828';
        ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx-ts*0.22,ty+ts*0.45); ctx.lineTo(tx+ts*0.22,ty+ts*0.45); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(tx,ty+ts*0.18); ctx.lineTo(tx-ts*0.28,ty+ts*0.56); ctx.lineTo(tx+ts*0.28,ty+ts*0.56); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#3A2010'; ctx.fillRect(tx-ts*0.04,ty+ts*0.56,ts*0.08,ts*0.12);
        ctx.fillStyle='rgba(255,255,255,0.88)';
        ctx.beginPath(); ctx.ellipse(tx,ty+ts*0.02,ts*0.18,ts*0.04,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(tx,ty+ts*0.2,ts*0.24,ts*0.04,0,0,Math.PI*2); ctx.fill();
      });

      // Snow ground
      ctx.fillStyle='#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(winX,winY+winH);
      ctx.quadraticCurveTo(winX+winW*0.3,winY+winH*0.7,winX+winW*0.5,winY+winH*0.75);
      ctx.quadraticCurveTo(winX+winW*0.7,winY+winH*0.65,winX+winW,winY+winH*0.72);
      ctx.lineTo(winX+winW,winY+winH); ctx.closePath(); ctx.fill();

      // Window frame
      ctx.strokeStyle='#5060B0'; ctx.lineWidth=4*this.dpr;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(winX,winY,winW,winH,6); else ctx.rect(winX,winY,winW,winH);
      ctx.stroke();
      ctx.lineWidth=2.5*this.dpr;
      ctx.beginPath();
      ctx.moveTo(winX+winW/2,winY); ctx.lineTo(winX+winW/2,winY+winH);
      ctx.moveTo(winX,winY+winH/2); ctx.lineTo(winX+winW,winY+winH/2); ctx.stroke();

      // Icicles
      const numI=Math.floor(winW/9);
      for (let i=0;i<numI;i++) {
        const ix=winX+(i+0.5)*(winW/numI);
        const iLen=8+Math.sin(i*1.9)*7+Math.cos(i*3.1)*3;
        const iW=3.5+Math.sin(i*2.7)*1.5;
        const ig=ctx.createLinearGradient(ix,winY+winH,ix,winY+winH+iLen);
        ig.addColorStop(0,'#B8D8F8'); ig.addColorStop(1,'rgba(180,210,248,0)');
        ctx.fillStyle=ig;
        ctx.beginPath();
        ctx.moveTo(ix-iW/2,winY+winH); ctx.lineTo(ix+iW/2,winY+winH);
        ctx.lineTo(ix,winY+winH+iLen); ctx.closePath(); ctx.fill();
      }

      // Snowflakes on wall
      ctx.globalAlpha=0.4; ctx.fillStyle='#FFFFFF';
      ctx.font=`${ts*0.22}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      [[ox+gw*0.08,oy*0.38],[ox+gw*0.9,oy*0.32],[ox+gw*0.12,oy*0.72],[ox+gw*0.88,oy*0.68]].forEach(([px,py])=>{
        ctx.fillText('❄',px,py);
      });
      ctx.globalAlpha=1;
    }

    drawWallDeco_beach(ctx) {
      const {ts,ox,oy,lvl}=this;
      const gw=lvl.w*ts;

      const winW=Math.min(gw*0.58,ts*4.5);
      const winH=Math.max(oy*0.72,ts*0.85);
      const winX=ox+gw/2-winW/2, winY=oy*0.04;

      const sky=ctx.createLinearGradient(winX,winY,winX,winY+winH*0.55);
      sky.addColorStop(0,'#50B8F0'); sky.addColorStop(1,'#90D8FF');
      ctx.fillStyle=sky;
      if(ctx.roundRect) ctx.roundRect(winX,winY,winW,winH,10); else ctx.rect(winX,winY,winW,winH);
      ctx.fill();

      const ocean=ctx.createLinearGradient(winX,winY+winH*0.5,winX,winY+winH);
      ocean.addColorStop(0,'#2070C0'); ocean.addColorStop(1,'#0848A0');
      ctx.fillStyle=ocean;
      ctx.beginPath();
      ctx.moveTo(winX,winY+winH*0.55);
      ctx.quadraticCurveTo(winX+winW*0.3,winY+winH*0.52,winX+winW*0.6,winY+winH*0.56);
      ctx.quadraticCurveTo(winX+winW*0.8,winY+winH*0.59,winX+winW,winY+winH*0.53);
      ctx.lineTo(winX+winW,winY+winH); ctx.lineTo(winX,winY+winH); ctx.closePath(); ctx.fill();

      // Wave crests
      ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=2*this.dpr;
      [[0.2,0.58],[0.5,0.62],[0.75,0.57]].forEach(([px,py])=>{
        ctx.beginPath();
        ctx.moveTo(winX+winW*px,winY+winH*py);
        ctx.quadraticCurveTo(winX+winW*(px+0.05),winY+winH*(py-0.02),winX+winW*(px+0.1),winY+winH*py);
        ctx.stroke();
      });

      // Sun
      ctx.fillStyle='#FFE040';
      ctx.beginPath(); ctx.arc(winX+winW*0.78,winY+winH*0.2,ts*0.22,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(255,220,40,0.5)'; ctx.lineWidth=2.5*this.dpr;
      for (let i=0;i<8;i++) {
        const a=(i/8)*Math.PI*2; const r1=ts*0.28, r2=ts*0.42;
        ctx.beginPath();
        ctx.moveTo(winX+winW*0.78+Math.cos(a)*r1,winY+winH*0.2+Math.sin(a)*r1);
        ctx.lineTo(winX+winW*0.78+Math.cos(a)*r2,winY+winH*0.2+Math.sin(a)*r2); ctx.stroke();
      }

      // Window frame
      ctx.strokeStyle='#B09020'; ctx.lineWidth=5*this.dpr;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(winX,winY,winW,winH,10); else ctx.rect(winX,winY,winW,winH);
      ctx.stroke();

      // Palm fronds
      ctx.strokeStyle='#1A6810'; ctx.lineWidth=3.5*this.dpr; ctx.lineCap='round';
      [[winX-5,oy*0.85,winX+gw*0.1,oy*0.08],[winX+8,oy*0.95,winX+gw*0.06,oy*0.48]].forEach(([x1,y1,x2,y2])=>{
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo((x1+x2)/2,y2*1.05,x2,y2); ctx.stroke();
      });
      [[ox+gw+5,oy*0.85,ox+gw-gw*0.09,oy*0.1],[ox+gw-5,oy*0.92,ox+gw-gw*0.06,oy*0.52]].forEach(([x1,y1,x2,y2])=>{
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo((x1+x2)/2,y2*1.05,x2,y2); ctx.stroke();
      });
      ctx.lineCap='butt';
    }

    // ── Station base — each type is a unique illustrated shape, no shared box ──
    drawStationBase(ctx, c, gx, gy, X, Y) {
      const {ts,lvl}=this;
      const t=this.theme;
      const cx=X+ts/2, cy=Y+ts/2;
      const ol=Math.max(2.5,ts*0.055)*this.dpr; // outline weight

      const stroke=(col,w)=>{ ctx.strokeStyle=col; ctx.lineWidth=(w||ol); ctx.stroke(); };
      const fill=(col)=>{ ctx.fillStyle=col; ctx.fill(); };
      const rr=(x,y,w,h,r)=>{ ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(x,y,w,h,r); else ctx.rect(x,y,w,h); };

      // Shared: floor shadow under every appliance
      ctx.fillStyle='rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(cx,Y+ts*0.88,ts*0.38,ts*0.08,0,0,Math.PI*2); ctx.fill();

      // ── Chopping board (B) ───────────────────────────────────────────────────
      if (c==='B') {
        // A light wood rectangle board sitting flat, with handles at each end
        const bw=ts*0.74, bh=ts*0.46, bx=cx-bw/2, by=cy-bh/2+ts*0.06;
        // Board shadow
        ctx.fillStyle='rgba(0,0,0,0.14)';
        rr(bx+4,by+6,bw,bh,ts*0.08); ctx.fill();
        // Board surface
        const bg=ctx.createLinearGradient(bx,by,bx+bw,by+bh);
        bg.addColorStop(0,'#E8DCA8'); bg.addColorStop(0.5,'#D4C888'); bg.addColorStop(1,'#C4B870');
        ctx.fillStyle=bg; rr(bx,by,bw,bh,ts*0.08); ctx.fill();
        // Wood grain lines
        ctx.strokeStyle='rgba(140,110,40,0.22)'; ctx.lineWidth=1.2*this.dpr;
        for(let i=1;i<5;i++){
          ctx.beginPath(); ctx.moveTo(bx+4,by+bh*i/5); ctx.lineTo(bx+bw-4,by+bh*i/5); ctx.stroke();
        }
        // Handles at left+right
        [bx-ts*0.1, bx+bw+ts*0.02].forEach((hx,i)=>{
          const hg=ctx.createLinearGradient(hx,by+bh*0.3,hx+ts*0.1,by+bh*0.7);
          hg.addColorStop(0,'#C8A048'); hg.addColorStop(1,'#A07828');
          ctx.fillStyle=hg;
          rr(hx,by+bh*0.3,ts*0.1,bh*0.4,ts*0.04); ctx.fill();
          ctx.strokeStyle='#7A5018'; ctx.lineWidth=ol*0.7; ctx.stroke();
        });
        // Outline
        ctx.strokeStyle='#5A4010'; ctx.lineWidth=ol; rr(bx,by,bw,bh,ts*0.08); ctx.stroke();
        // Knife
        this.glyphC(ctx,'🔪',bx+bw*0.78,by+bh*0.75,ts*0.3);

      // ── Stove (S) ────────────────────────────────────────────────────────────
      } else if (c==='S') {
        // Range top: dark rectangle, 4 burner rings, knob panel along top edge
        const sw=ts*0.82, sh=ts*0.62, sx=cx-sw/2, sy=cy-sh/2+ts*0.06;
        // Body shadow
        ctx.fillStyle='rgba(0,0,0,0.2)'; rr(sx+5,sy+8,sw,sh,ts*0.1); ctx.fill();
        // Body
        const stg=ctx.createLinearGradient(sx,sy,sx,sy+sh);
        stg.addColorStop(0,'#6A7280'); stg.addColorStop(1,'#3A4048');
        ctx.fillStyle=stg; rr(sx,sy,sw,sh,ts*0.12); ctx.fill();
        // Knob panel strip along top
        ctx.fillStyle='#2A3038'; rr(sx,sy,sw,sh*0.22,ts*0.12); ctx.fill();
        // Knobs
        for(let i=0;i<3;i++){
          const kx=sx+sw*(0.2+i*0.3), ky=sy+sh*0.11;
          ctx.fillStyle='#181E24'; ctx.beginPath(); ctx.arc(kx,ky,ts*0.065,0,Math.PI*2); ctx.fill();
          ctx.fillStyle='#E08028'; ctx.beginPath(); ctx.arc(kx,ky,ts*0.032,0,Math.PI*2); ctx.fill();
        }
        // 4 burner rings in a 2×2 grid
        [[0.3,0.55],[0.7,0.55],[0.3,0.82],[0.7,0.82]].forEach(([px,py])=>{
          const brx=sx+sw*px, bry=sy+sh*py;
          ctx.strokeStyle='#858A90'; ctx.lineWidth=ts*0.055*this.dpr;
          ctx.beginPath(); ctx.arc(brx,bry,ts*0.14,0,Math.PI*2); ctx.stroke();
          ctx.strokeStyle='#505860'; ctx.lineWidth=ts*0.032*this.dpr;
          ctx.beginPath(); ctx.arc(brx,bry,ts*0.068,0,Math.PI*2); ctx.stroke();
          ctx.fillStyle='#30363E'; ctx.beginPath(); ctx.arc(brx,bry,ts*0.028,0,Math.PI*2); ctx.fill();
        });
        // Outline
        ctx.strokeStyle='#181E24'; ctx.lineWidth=ol; rr(sx,sy,sw,sh,ts*0.12); ctx.stroke();

      // ── Oven (O) ─────────────────────────────────────────────────────────────
      } else if (c==='O') {
        // Tall standing oven: grey body, big glass door, handle, knobs on top
        const ow=ts*0.76, oh=ts*0.72, ox2=cx-ow/2, oy2=cy-oh/2+ts*0.04;
        // Body shadow
        ctx.fillStyle='rgba(0,0,0,0.18)'; rr(ox2+5,oy2+7,ow,oh,ts*0.1); ctx.fill();
        // Body
        const oBodyG=ctx.createLinearGradient(ox2,oy2,ox2+ow,oy2);
        oBodyG.addColorStop(0,'#9098A8'); oBodyG.addColorStop(1,'#6870808');
        ctx.fillStyle='#8890A0'; rr(ox2,oy2,ow,oh,ts*0.12); ctx.fill();
        // Knob row on top
        ctx.fillStyle='#2A3038'; rr(ox2,oy2,ow,oh*0.18,ts*0.12); ctx.fill();
        for(let i=0;i<3;i++){
          const kx=ox2+ow*(0.22+i*0.28), ky=oy2+oh*0.09;
          ctx.fillStyle='#181E24'; ctx.beginPath(); ctx.arc(kx,ky,ts*0.055,0,Math.PI*2); ctx.fill();
          ctx.fillStyle='#D07030'; ctx.beginPath(); ctx.arc(kx,ky,ts*0.026,0,Math.PI*2); ctx.fill();
        }
        // Door panel (dark frame)
        const dx=ox2+ow*0.1, dy=oy2+oh*0.22, dw=ow*0.8, dh=oh*0.58;
        ctx.fillStyle='#303038'; rr(dx,dy,dw,dh,ts*0.08); ctx.fill();
        // Door window glass
        const dg=ctx.createLinearGradient(dx,dy+dh*0.1,dx,dy+dh*0.9);
        dg.addColorStop(0,'#484858'); dg.addColorStop(1,'#282830');
        ctx.fillStyle=dg; rr(dx+dw*0.1,dy+dh*0.1,dw*0.8,dh*0.8,ts*0.06); ctx.fill();
        // Glass reflection
        ctx.fillStyle='rgba(255,255,255,0.08)';
        rr(dx+dw*0.12,dy+dh*0.12,dw*0.28,dh*0.35,ts*0.04); ctx.fill();
        // Door handle
        ctx.fillStyle='#C0C8D0';
        rr(dx+dw*0.3,dy+dh*0.88,dw*0.4,dh*0.08,dh*0.04); ctx.fill();
        ctx.strokeStyle='#909898'; ctx.lineWidth=1.5*this.dpr; ctx.stroke();
        // Outline
        ctx.strokeStyle='#202028'; ctx.lineWidth=ol; rr(ox2,oy2,ow,oh,ts*0.12); ctx.stroke();

      // ── Fryer (V) ────────────────────────────────────────────────────────────
      } else if (c==='V') {
        // Deep fryer: dark boxy unit with oil vat opening on top
        const fw=ts*0.72, fh=ts*0.6, fx=cx-fw/2, fy=cy-fh/2+ts*0.08;
        ctx.fillStyle='rgba(0,0,0,0.2)'; rr(fx+4,fy+6,fw,fh,ts*0.1); ctx.fill();
        ctx.fillStyle='#5A4838'; rr(fx,fy,fw,fh,ts*0.1); ctx.fill();
        // Front panel stripe
        ctx.fillStyle='rgba(255,255,255,0.06)'; rr(fx+fw*0.06,fy+fh*0.06,fw*0.88,fh*0.18,ts*0.06); ctx.fill();
        // Vat opening (dark recessed top)
        const vx=fx+fw*0.14, vy=fy+fh*0.28, vw=fw*0.72, vh=fh*0.42;
        ctx.fillStyle='#1A0E08'; rr(vx,vy,vw,vh,ts*0.06); ctx.fill();
        // Oil surface shimmer
        const oilG=ctx.createLinearGradient(vx,vy,vx,vy+vh);
        oilG.addColorStop(0,'rgba(200,140,20,0.7)'); oilG.addColorStop(1,'rgba(140,80,10,0.4)');
        ctx.fillStyle=oilG; rr(vx,vy+vh*0.35,vw,vh*0.65,ts*0.04); ctx.fill();
        // Basket handle hint
        ctx.strokeStyle='#C0A060'; ctx.lineWidth=Math.max(2,ts*0.038)*this.dpr; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(cx-fw*0.15,vy); ctx.quadraticCurveTo(cx,vy-fh*0.18,cx+fw*0.15,vy); ctx.stroke();
        ctx.lineCap='butt';
        ctx.strokeStyle='#281808'; ctx.lineWidth=ol; rr(fx,fy,fw,fh,ts*0.1); ctx.stroke();

      // ── Sink (K) ─────────────────────────────────────────────────────────────
      } else if (c==='K') {
        // White porcelain basin with chrome faucet arching over
        const skw=ts*0.78, skh=ts*0.52, skx=cx-skw/2, sky=cy-skh/2+ts*0.12;
        // Outer cabinet base
        ctx.fillStyle='rgba(0,0,0,0.15)'; rr(skx+4,sky+6,skw,skh+ts*0.14,ts*0.1); ctx.fill();
        ctx.fillStyle=t.counterFront; rr(skx,sky,skw,skh+ts*0.14,ts*0.1); ctx.fill();
        ctx.strokeStyle=t.counterOutline; ctx.lineWidth=ol; rr(skx,sky,skw,skh+ts*0.14,ts*0.1); ctx.stroke();
        // Basin recess
        const bsx=skx+skw*0.1, bsy=sky+skh*0.1, bsw=skw*0.8, bsh=skh*0.7;
        ctx.fillStyle='rgba(0,0,0,0.14)'; rr(bsx+2,bsy+2,bsw,bsh,ts*0.08); ctx.fill();
        // Basin interior
        const basinG=ctx.createLinearGradient(bsx,bsy,bsx,bsy+bsh);
        basinG.addColorStop(0,'#D8ECF8'); basinG.addColorStop(1,'#88B8D8');
        ctx.fillStyle=basinG; rr(bsx,bsy,bsw,bsh,ts*0.08); ctx.fill();
        // Water surface sheen
        ctx.fillStyle='rgba(255,255,255,0.25)'; rr(bsx+bsw*0.06,bsy+bsh*0.08,bsw*0.5,bsh*0.18,ts*0.04); ctx.fill();
        // Drain
        ctx.fillStyle='rgba(20,40,80,0.5)'; ctx.beginPath(); ctx.ellipse(bsx+bsw/2,bsy+bsh*0.78,bsw*0.07,bsh*0.04,0,0,Math.PI*2); ctx.fill();
        // Faucet — chrome arch
        ctx.strokeStyle='#D0D8E8'; ctx.lineWidth=Math.max(3,ts*0.09)*this.dpr; ctx.lineCap='round';
        ctx.beginPath();
        ctx.moveTo(bsx+bsw*0.62,bsy+bsh*0.15);
        ctx.lineTo(bsx+bsw*0.62,bsy-skh*0.28);
        ctx.lineTo(bsx+bsw*0.3,bsy-skh*0.28);
        ctx.lineTo(bsx+bsw*0.3,bsy+bsh*0.2);
        ctx.stroke();
        // Faucet head
        ctx.fillStyle='#D0D8E8'; ctx.beginPath(); ctx.ellipse(bsx+bsw*0.3,bsy+bsh*0.22,ts*0.048,ts*0.03,0,0,Math.PI*2); ctx.fill();
        ctx.lineCap='butt';
        // Basin outline
        ctx.strokeStyle='#8090A8'; ctx.lineWidth=1.5*this.dpr; rr(bsx,bsy,bsw,bsh,ts*0.08); ctx.stroke();

      // ── Serve window (W) ─────────────────────────────────────────────────────
      } else if (c==='W') {
        // An arched pass-through opening in the wall, not a box
        const wx=cx-ts*0.42, wy=Y+ts*0.05, ww=ts*0.84, wh=ts*0.78;
        // Opening arch shape
        ctx.fillStyle=this.theme.wallTrim;
        ctx.beginPath();
        ctx.moveTo(wx,wy+wh);
        ctx.lineTo(wx,wy+wh*0.5);
        ctx.quadraticCurveTo(wx,wy+wh*0.15,cx,wy+wh*0.15);
        ctx.quadraticCurveTo(wx+ww,wy+wh*0.15,wx+ww,wy+wh*0.5);
        ctx.lineTo(wx+ww,wy+wh);
        ctx.closePath(); ctx.fill();
        // Inner arch (the opening itself — green glow)
        const archG=ctx.createRadialGradient(cx,wy+wh*0.5,0,cx,wy+wh*0.5,ts*0.4);
        archG.addColorStop(0,'#38D8A8'); archG.addColorStop(1,'#108060');
        ctx.fillStyle=archG;
        ctx.beginPath();
        ctx.moveTo(wx+ww*0.12,wy+wh);
        ctx.lineTo(wx+ww*0.12,wy+wh*0.52);
        ctx.quadraticCurveTo(wx+ww*0.12,wy+wh*0.26,cx,wy+wh*0.26);
        ctx.quadraticCurveTo(wx+ww*0.88,wy+wh*0.26,wx+ww*0.88,wy+wh*0.52);
        ctx.lineTo(wx+ww*0.88,wy+wh);
        ctx.closePath(); ctx.fill();
        // Shelf ledge at the bottom of arch
        ctx.fillStyle=t.counterTop;
        ctx.fillRect(wx,wy+wh*0.78,ww,wh*0.14);
        ctx.strokeStyle=t.counterOutline; ctx.lineWidth=ol*0.7;
        ctx.beginPath(); ctx.moveTo(wx,wy+wh*0.78); ctx.lineTo(wx+ww,wy+wh*0.78); ctx.stroke();
        // Bell
        this.glyphC(ctx,'🛎️',cx,wy+wh*0.56,ts*0.38);
        // Arch outline
        ctx.strokeStyle='#045038'; ctx.lineWidth=ol;
        ctx.beginPath();
        ctx.moveTo(wx,wy+wh);
        ctx.lineTo(wx,wy+wh*0.5);
        ctx.quadraticCurveTo(wx,wy+wh*0.15,cx,wy+wh*0.15);
        ctx.quadraticCurveTo(wx+ww,wy+wh*0.15,wx+ww,wy+wh*0.5);
        ctx.lineTo(wx+ww,wy+wh);
        ctx.stroke();

      // ── Plate rack (P) ───────────────────────────────────────────────────────
      } else if (c==='P') {
        // Vertical plate rack — plates lean in a holder, not a box
        const px2=cx-ts*0.32, py2=cy+ts*0.05;
        // Rack base
        ctx.fillStyle=t.counterFront;
        rr(cx-ts*0.38,py2+ts*0.18,ts*0.76,ts*0.16,ts*0.04); ctx.fill();
        ctx.strokeStyle=t.counterOutline; ctx.lineWidth=ol*0.8; ctx.stroke();
        // Rack rods (two vertical posts)
        ctx.strokeStyle=t.counterOutline; ctx.lineWidth=Math.max(2,ts*0.04)*this.dpr; ctx.lineCap='round';
        [cx-ts*0.2,cx+ts*0.2].forEach(rx=>{
          ctx.beginPath(); ctx.moveTo(rx,py2+ts*0.18); ctx.lineTo(rx,py2-ts*0.26); ctx.stroke();
        });
        ctx.lineCap='butt';
        // Stacked plates (ellipses leaning slightly)
        for(let i=0;i<4;i++){
          const ey=py2+ts*(0.14-i*0.08);
          const pr=ctx.createRadialGradient(cx-ts*0.1,ey-ts*0.04,0,cx,ey,ts*0.28);
          pr.addColorStop(0,'#FFFFFF'); pr.addColorStop(1,'#EEE8F4');
          ctx.fillStyle=pr;
          ctx.beginPath(); ctx.ellipse(cx,ey,ts*0.28,ts*0.085,0,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle='#FFAAD8'; ctx.lineWidth=Math.max(1.5,ts*0.028)*this.dpr; ctx.stroke();
        }

      // ── Trash can (T) ────────────────────────────────────────────────────────
      } else if (c==='T') {
        // Cylindrical trash can — tapered body, lid on top
        const tw=ts*0.52, th=ts*0.6, tx=cx-tw/2, ty=cy-th/2+ts*0.1;
        // Shadow
        ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(cx,ty+th+6,tw*0.45,ts*0.07,0,0,Math.PI*2); ctx.fill();
        // Body (slightly tapered: wider at bottom)
        ctx.fillStyle='#788080';
        ctx.beginPath();
        ctx.moveTo(tx+tw*0.08,ty+th*0.2);
        ctx.lineTo(tx,ty+th);
        ctx.lineTo(tx+tw,ty+th);
        ctx.lineTo(tx+tw*0.92,ty+th*0.2);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle='#404848'; ctx.lineWidth=ol; ctx.stroke();
        // Lid
        ctx.fillStyle='#909898'; ctx.beginPath(); ctx.ellipse(cx,ty+th*0.2,tw*0.5,ts*0.06,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#404848'; ctx.lineWidth=ol*0.8; ctx.stroke();
        // Lid handle
        ctx.fillStyle='#606868'; rr(cx-tw*0.08,ty+th*0.08,tw*0.16,ts*0.08,ts*0.03); ctx.fill();
        ctx.strokeStyle='#404848'; ctx.lineWidth=ol*0.7; ctx.stroke();
        // Horizontal band lines
        ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.lineWidth=1.5*this.dpr;
        [0.45,0.68].forEach(f=>{ ctx.beginPath(); ctx.moveTo(tx+tw*(0.08+(1-f)*0.04),ty+th*f); ctx.lineTo(tx+tw*(0.92-(1-f)*0.04),ty+th*f); ctx.stroke(); });

      // ── Ingredient crate (1-9) ────────────────────────────────────────────────
      } else if (/[1-9]/.test(c)) {
        // Wooden crate: distinct shape with lid overhang and slat detail
        const crw=ts*0.76, crh=ts*0.58, crx=cx-crw/2, cry=cy-crh/2+ts*0.1;
        // Crate shadow
        ctx.fillStyle='rgba(0,0,0,0.2)'; rr(crx+5,cry+7,crw,crh,ts*0.06); ctx.fill();
        // Crate body
        const crg=ctx.createLinearGradient(crx,cry,crx,cry+crh);
        crg.addColorStop(0,'#D8B870'); crg.addColorStop(1,'#A87830');
        ctx.fillStyle=crg; rr(crx,cry,crw,crh,ts*0.06); ctx.fill();
        // Front slat lines
        ctx.strokeStyle='rgba(80,40,10,0.3)'; ctx.lineWidth=Math.max(1.2,ts*0.024)*this.dpr;
        [0.3,0.6].forEach(f=>{ ctx.beginPath(); ctx.moveTo(crx+3,cry+crh*f); ctx.lineTo(crx+crw-3,cry+crh*f); ctx.stroke(); });
        // Vertical dividers
        [0.33,0.67].forEach(f=>{ ctx.beginPath(); ctx.moveTo(crx+crw*f,cry+3); ctx.lineTo(crx+crw*f,cry+crh-3); ctx.stroke(); });
        // Lid overhang (3px wider each side)
        ctx.fillStyle='#C8A050';
        rr(crx-ts*0.03,cry-ts*0.05,crw+ts*0.06,crh*0.18,ts*0.05); ctx.fill();
        ctx.strokeStyle='#7A5010'; ctx.lineWidth=ol*0.8; ctx.stroke();
        // Crate outline
        ctx.strokeStyle='#7A5010'; ctx.lineWidth=ol; rr(crx,cry,crw,crh,ts*0.06); ctx.stroke();
        // Ingredient icon centered in lower area
        const ing=this.lvl.crates[c];
        this.drawBareC(ctx,{id:ing,state:'raw'},cx,cry+crh*0.66,ts*0.42);
      }
    }

    // ── Animated station effects ───────────────────────────────────────────────
    drawStationAnimations(now) {
      const {ctx,ts,ox,oy,lvl}=this;
      for(let y=0;y<lvl.h;y++){
        for(let x=0;x<lvl.w;x++){
          const c=lvl.grid[y][x]; if(c==='.') continue;
          const X=ox+x*ts, Y=oy+y*ts;
          const st=this.stationAt(x,y);
          const iX=X+ts*0.052, iY=Y+ts*0.052, iW=ts*0.896, iH=ts*0.896;

          if(c==='S'){
            const cooking=st&&(st.state==='cooking'||st.state==='done');
            if(cooking){
              const bx=X+ts/2, by=Y+ts*0.52;
              const pulse=0.7+0.3*Math.sin(now/180);
              ctx.globalAlpha=pulse;
              for(let i=0;i<5;i++){
                const a=(i/5)*Math.PI*2+now/500;
                this.glyph('🔥',bx+Math.cos(a)*ts*0.24,by+Math.sin(a)*ts*0.22,ts*0.26);
              }
              ctx.globalAlpha=1;
            }
          } else if(c==='O'){
            const cooking=st&&(st.state==='cooking'||st.state==='done');
            if(cooking){
              const pulse=0.55+0.45*Math.sin(now/260);
              const og=ctx.createRadialGradient(X+ts/2,Y+ts*0.49,0,X+ts/2,Y+ts*0.49,ts*0.38);
              og.addColorStop(0,`rgba(255,220,60,${pulse})`);
              og.addColorStop(1,`rgba(255,80,20,${pulse*0.4})`);
              ctx.globalAlpha=pulse*0.75; ctx.fillStyle=og;
              ctx.beginPath();
              if(ctx.roundRect) ctx.roundRect(iX+iW*0.2,iY+iH*0.32,iW*0.6,iH*0.34,iW*0.06);
              else ctx.rect(iX+iW*0.2,iY+iH*0.32,iW*0.6,iH*0.34);
              ctx.fill();
              ctx.globalAlpha=1;
            }
          } else if(c==='K'){
            const shimBase=now/700;
            ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=Math.max(1.5,ts*0.035)*this.dpr;
            for(let i=0;i<3;i++){
              const phase=shimBase+i*0.75;
              const wy=Y+ts*(0.42+i*0.09);
              ctx.beginPath();
              ctx.moveTo(X+ts*0.22,wy);
              ctx.quadraticCurveTo(X+ts*0.5,wy+Math.sin(phase)*ts*0.055,X+ts*0.78,wy);
              ctx.stroke();
            }
          } else if(c==='W'){
            const pulse=0.42+0.38*Math.sin(now/380);
            ctx.globalAlpha=pulse*0.55;
            ctx.fillStyle='#3DC9A0';
            ctx.beginPath(); ctx.arc(X+ts/2,Y+ts/2,ts*0.68,0,Math.PI*2); ctx.fill();
            ctx.globalAlpha=1;
          }
        }
      }
    }

    // ── Dynamic station contents ───────────────────────────────────────────────
    drawStationContents(now) {
      const {ctx,ts,ox,oy,lvl}=this;
      for(const [key,s] of Object.entries(this.cur.stations)){
        const [x,y]=key.split(',').map(Number);
        const X=ox+x*ts, Y=oy+y*ts;
        const cell=lvl.grid[y][x];

        if(s.item){
          this.drawItem(s.item,X+ts/2,Y+ts/2,ts*0.52);
          if(cell==='B'&&s.item.state==='raw'&&s.progress>0)
            this.bar(X,Y,s.progress,'#3DC9A0','#A8F0D8');
        }
        if(s.dirty!==undefined){
          const n=Math.min(s.dirty,3);
          for(let i=0;i<n;i++){
            ctx.fillStyle='#D8CBB4';
            ctx.beginPath(); ctx.ellipse(X+ts/2,Y+ts*(0.56-i*0.08),ts*0.26,ts*0.1,0,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='#A8927A'; ctx.lineWidth=1.2*this.dpr; ctx.stroke();
          }
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
            this.drawItem(it,X+ts/2+off,Y+ts/2-ts*0.06,ts*(n>1?0.34:0.5),false);
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

    // ── Chefs — cartoon style ─────────────────────────────────────────────────
    drawChefs(now) {
      const {ctx,ts,ox,oy}=this;
      for(const p of this.lerpPlayers()){
        const X=ox+p.x*ts, Y=oy+p.y*ts;
        const bounce=p.moving?Math.abs(Math.sin(now/88))*ts*0.1:0;
        const wiggle=p.working?Math.sin(now/60)*0.14:0;
        const r=ts*0.4;
        const col=this.colorOf[p.id]||PLAYER_COLORS[0];
        const isMe=p.id===this.myId;

        // Floor shadow
        ctx.fillStyle='rgba(20,10,40,0.3)';
        ctx.beginPath(); ctx.ellipse(X,Y+r*0.85,r*0.68,r*0.23,0,0,Math.PI*2); ctx.fill();

        ctx.save();
        ctx.translate(X,Y-bounce);
        ctx.rotate(wiggle);

        // Me aura
        if(isMe){
          const pulse=0.5+0.22*Math.sin(now/420);
          ctx.globalAlpha=pulse*0.45;
          ctx.fillStyle=col;
          ctx.beginPath(); ctx.arc(0,0,r*1.9,0,Math.PI*2); ctx.fill();
          ctx.globalAlpha=1;
        }

        // Body
        const rg=ctx.createRadialGradient(-r*0.25,-r*0.28,0,0,0,r);
        rg.addColorStop(0,this.shiftHex(col,0.42));
        rg.addColorStop(0.55,col);
        rg.addColorStop(1,this.shiftHex(col,-0.3));
        ctx.fillStyle=rg;
        ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();

        // Body outline
        ctx.strokeStyle='rgba(0,0,0,0.38)';
        ctx.lineWidth=Math.max(2,ts*0.058)*this.dpr; ctx.stroke();

        if(isMe){
          ctx.strokeStyle='rgba(255,255,255,0.88)';
          ctx.lineWidth=Math.max(2.5,ts*0.065)*this.dpr; ctx.stroke();
        }

        // Apron
        ctx.fillStyle='rgba(255,255,255,0.62)';
        ctx.beginPath();
        ctx.moveTo(-r*0.3,r*0.06); ctx.lineTo(0,r*0.52); ctx.lineTo(r*0.3,r*0.06);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=1.5*this.dpr; ctx.stroke();

        // Avatar
        this.glyph(p.avatar,0,0,r*1.22,true);

        // Chef hat (toque)
        const hatY=-r*0.9;
        const hw=r*0.76, hh=r*0.66;
        // Brim
        ctx.fillStyle='#FFFFFF';
        ctx.beginPath(); ctx.ellipse(0,hatY,hw*0.78,hh*0.18,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.28)'; ctx.lineWidth=Math.max(1.5,ts*0.042)*this.dpr; ctx.stroke();
        // Toque body
        const hg=ctx.createLinearGradient(-hw*0.5,hatY-hh,hw*0.5,hatY);
        hg.addColorStop(0,'#FFFFFF'); hg.addColorStop(1,'#EEE8F0');
        ctx.fillStyle=hg;
        ctx.beginPath();
        if(ctx.roundRect) ctx.roundRect(-hw*0.52,hatY-hh,hw*1.04,hh,hw*0.18);
        else ctx.rect(-hw*0.52,hatY-hh,hw*1.04,hh);
        ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=Math.max(1.5,ts*0.042)*this.dpr; ctx.stroke();
        // Pleat details
        ctx.strokeStyle='rgba(180,160,200,0.55)'; ctx.lineWidth=Math.max(1,ts*0.022)*this.dpr;
        [-hw*0.2,0,hw*0.2].forEach(px=>{
          ctx.beginPath(); ctx.moveTo(px,hatY-hh*0.3); ctx.lineTo(px,hatY); ctx.stroke();
        });
        ctx.beginPath(); ctx.moveTo(-hw*0.46,hatY-hh*0.44); ctx.lineTo(hw*0.46,hatY-hh*0.44); ctx.stroke();

        ctx.restore();

        // Carried item
        if(p.carry){
          if(p.carry.kind==='plate') this.drawPlate(p.carry,X,Y-bounce-r*1.55,ts*0.6);
          else this.drawItem(p.carry,X,Y-bounce-r*1.5,ts*0.46);
        }

        // Emote
        const em=this.emotes[p.id];
        if(em&&em.until>now){
          const by=Y-bounce-r*2.6;
          ctx.fillStyle='#FFFFFF'; ctx.strokeStyle='rgba(0,0,0,0.12)';
          ctx.lineWidth=2*this.dpr;
          ctx.beginPath(); ctx.arc(X,by,r*0.82,0,Math.PI*2); ctx.fill(); ctx.stroke();
          this.glyph(em.emoji,X,by,r);
        }

        // Name
        const nSz=Math.max(9,Math.round(ts*0.22));
        const label=p.id===this.myId?'You':p.name;
        ctx.font=`800 ${nSz}px ui-rounded,system-ui`;
        ctx.textAlign='center'; ctx.textBaseline='alphabetic';
        ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.fillText(label,X+1,Y+r*1.8+1);
        ctx.fillStyle=isMe?col:'rgba(20,8,40,0.8)'; ctx.fillText(label,X,Y+r*1.78);
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
    drawItem(item,x,y,size,chip=true){
      if(item.kind==='plate'){this.drawPlate(item,x,y,size);return;}
      if(item.kind==='stack'){this.drawStack(item,x,y,size);return;}
      if(chip){
        this.ctx.fillStyle='rgba(255,255,255,0.95)';
        this.ctx.beginPath(); this.ctx.arc(x,y,size*0.72,0,Math.PI*2); this.ctx.fill();
        this.ctx.strokeStyle='rgba(0,0,0,0.18)'; this.ctx.lineWidth=Math.max(1.5,size*0.075)*this.dpr; this.ctx.stroke();
      }
      this.drawBare(item,x,y,size);
    }
    drawBare(item,x,y,size){
      if(window.KSArt&&KSArt.canDraw(item)){KSArt.draw(this.ctx,item,x,y,size);return;}
      this.glyph(itemEmoji(item),x,y,size);
      if(item.state==='chopped'&&!CHOPPED_EMOJI[item.id]) this.badge('🔪',x+size*0.52,y+size*0.46,size*0.62);
      else if(item.state==='cooked'&&!COOKED_EMOJI[item.id]) this.badge('♨️',x+size*0.52,y+size*0.46,size*0.62);
    }
    drawStack(stack,x,y,size){
      const n=stack.contents.length;
      stack.contents.forEach((it,i)=>this.drawBare(it,x,y+size*0.16-i*size*0.26,size*0.85));
      if(n===0) this.glyph('🍽️',x,y,size*0.6);
    }
    drawPlate(plate,x,y,size){
      const {ctx}=this;
      const pg=ctx.createRadialGradient(x-size*0.15,y,0,x,y+size*0.18,size*0.6);
      pg.addColorStop(0,'#FFFFFF'); pg.addColorStop(1,'#F8EEF8');
      ctx.fillStyle=pg;
      ctx.beginPath(); ctx.ellipse(x,y+size*0.18,size*0.55,size*0.24,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.22)'; ctx.lineWidth=Math.max(1.5,size*0.06)*this.dpr; ctx.stroke();
      const n=plate.contents.length;
      plate.contents.forEach((it,i)=>this.drawBare(it,x+(i-(n-1)/2)*size*0.35,y-size*0.12,size*0.5));
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
    drawCustomers(now) {
      if (!this.cur || !this.cur.orders || !this.cur.orders.length) return;
      if (!this.orderSeen) this.orderSeen = new Map();

      const {ctx, ts, ox, oy, lvl, dpr} = this;
      const orders = this.cur.orders.slice(0, 5);
      const ids = new Set(orders.map(o => o.id));
      for (const id of this.orderSeen.keys()) { if (!ids.has(id)) this.orderSeen.delete(id); }
      orders.forEach(o => { if (!this.orderSeen.has(o.id)) this.orderSeen.set(o.id, now); });

      const gridBot = oy + lvl.h * ts;
      const canH = this.canvas.height;
      const belowH = canH - gridBot;

      // Each customer is a ~full-height figure in the below-grid strip
      const custH = Math.min(belowH * 0.82, ts * 1.05);
      if (custH < 18 * dpr) return;

      const totalW = lvl.w * ts;
      const slotW = totalW / orders.length;

      orders.forEach((order, i) => {
        const age = now - (this.orderSeen.get(order.id) || now);
        const walkIn = this.easeOut(age / 500);
        const urgency = 1 - Math.max(0, order.ttl) / order.ttlMax;

        const targX = ox + slotW * (i + 0.5);
        const targY = gridBot + custH * 0.6;
        const startY = canH + custH;
        const cy = startY + (targY - startY) * walkIn;
        const cx = targX;

        // Tiny walk bounce only after fully on screen
        const bounce = walkIn >= 1 ? Math.sin(now / 320 + i * 2.1) * custH * 0.025 : 0;

        this._drawCustomerFigure(ctx, cx, cy + bounce, custH, order, urgency, now, i);
      });
    }

    _drawCustomerFigure(ctx, cx, cy, h, order, urgency, now, idx) {
      // 5 fixed Cake Mania-style illustrated presets assigned by order id
      const preset = ((order.id - 1) % 5 + 5) % 5;
      const lw = Math.max(1.5, h * 0.028); // thick outline scale
      const ol = '#1A0A00'; // universal dark outline

      // Shared helpers
      const stroke = (col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w ?? lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; };
      const fill   = (col) => { ctx.fillStyle = col; };
      const filledCircle = (x, y, r, fc, sc, sw) => {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
        fill(fc); ctx.fill();
        if (sc) { stroke(sc, sw??lw); ctx.stroke(); }
      };
      const filledRR = (x, y, w2, h2, r, fc, sc, sw) => {
        this.rrC(ctx, x, y, w2, h2, r); fill(fc); ctx.fill();
        if (sc) { stroke(sc, sw??lw); ctx.stroke(); }
      };

      // Layout — BIG head (Cake Mania caricature style)
      const headR = h * 0.24;
      const bodyH = h * 0.24;
      const bodyW = h * 0.20;
      const legH  = h * 0.20;
      const legW  = h * 0.085;
      const footW = h * 0.13;
      const neckH = h * 0.04;

      const headY = cy - h * 0.5 + headR;
      const neckY = headY + headR - neckH * 0.3;
      const bodyY = neckY + neckH;
      const legY  = bodyY + bodyH;
      const footY = legY + legH - legW * 0.4;

      const walk = Math.sin(now / 260 + idx * 2.3);
      const ls = legH * 0.14 * walk; // leg swing

      // Ground shadow
      ctx.save(); ctx.globalAlpha = 0.18; fill('#000');
      ctx.beginPath(); ctx.ellipse(cx, footY + legW * 0.8, bodyW * 0.7, h * 0.035, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // ── PRESET 0: Grandma Rose ─────────────────────────────────────────────
      // Purple floral dress, white bun, big round specs, rosy cheeks
      if (preset === 0) {
        const skin = '#F5C8A0', dress = '#C060C8', dressHi = '#D880E0', spec = '#88AACC';
        // Legs (thick stockings)
        filledRR(cx - legW - ls*0.4, legY, legW, legH, legW*0.4, '#E8D8F0', ol, lw*0.8);
        filledRR(cx + ls*0.4, legY, legW, legH, legW*0.4, '#E8D8F0', ol, lw*0.8);
        // Shoes (chunky mary-janes)
        filledRR(cx - legW*1.1 - ls*0.6, footY, footW, legW*0.65, legW*0.3, '#3A1050', ol, lw*0.8);
        filledRR(cx + legW*0.1 + ls*0.6, footY, footW, legW*0.65, legW*0.3, '#3A1050', ol, lw*0.8);
        // Dress (trapezoid — wide at hem)
        ctx.beginPath();
        ctx.moveTo(cx - bodyW*0.45, bodyY);
        ctx.lineTo(cx + bodyW*0.45, bodyY);
        ctx.lineTo(cx + bodyW*0.7, bodyY + bodyH);
        ctx.lineTo(cx - bodyW*0.7, bodyY + bodyH);
        ctx.closePath(); fill(dress); ctx.fill(); stroke(ol); ctx.stroke();
        // Dress hi stripe
        ctx.beginPath(); ctx.moveTo(cx - bodyW*0.3, bodyY + bodyH*0.35); ctx.lineTo(cx + bodyW*0.3, bodyY + bodyH*0.35);
        stroke(dressHi, lw*0.6); ctx.stroke();
        // Floral dots on dress
        for (let fi=0; fi<5; fi++) {
          const fx = cx - bodyW*0.4 + (fi%3)*bodyW*0.4, fy = bodyY + bodyH*0.25 + Math.floor(fi/3)*bodyH*0.35;
          filledCircle(fx, fy, lw*0.9, '#FFB8D8');
        }
        // Arms
        filledRR(cx - bodyW*0.5 - legW*0.6 - walk*legH*0.08, bodyY+bodyH*0.1, legW, bodyH*0.55, legW*0.4, dress, ol, lw*0.7);
        filledRR(cx + bodyW*0.5 + walk*legH*0.08, bodyY+bodyH*0.1, legW, bodyH*0.55, legW*0.4, dress, ol, lw*0.7);
        // Head (wide oval)
        ctx.beginPath(); ctx.ellipse(cx, headY, headR*1.05, headR, 0, 0, Math.PI*2);
        fill(skin); ctx.fill(); stroke(ol); ctx.stroke();
        // White bun hair
        filledCircle(cx, headY - headR*0.62, headR*0.52, '#F0EEE8', ol, lw);
        filledCircle(cx - headR*0.28, headY - headR*0.72, headR*0.28, '#F0EEE8', ol, lw*0.6);
        filledCircle(cx + headR*0.28, headY - headR*0.72, headR*0.28, '#F0EEE8', ol, lw*0.6);
        // Bun cross-lines
        stroke('#CCCCB8', lw*0.4);
        ctx.beginPath(); ctx.moveTo(cx - headR*0.2, headY-headR*0.9); ctx.lineTo(cx+headR*0.2, headY-headR*0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+headR*0.2, headY-headR*0.9); ctx.lineTo(cx-headR*0.2, headY-headR*0.35); ctx.stroke();
        // Specs frames
        filledCircle(cx - headR*0.38, headY+headR*0.05, headR*0.19, '#EEF4FF', spec, lw*0.9);
        filledCircle(cx + headR*0.38, headY+headR*0.05, headR*0.19, '#EEF4FF', spec, lw*0.9);
        stroke(spec, lw*0.7); ctx.beginPath(); ctx.moveTo(cx-headR*0.19, headY+headR*0.05); ctx.lineTo(cx+headR*0.19, headY+headR*0.05); ctx.stroke();
        // Pupils behind specs
        filledCircle(cx - headR*0.38, headY+headR*0.05, headR*0.09, urgency>0.7?'#FF2020':'#3A1A6A');
        filledCircle(cx + headR*0.38, headY+headR*0.05, headR*0.09, urgency>0.7?'#FF2020':'#3A1A6A');
        // Rosy cheeks
        ctx.globalAlpha = 0.45; fill('#FF8888');
        ctx.beginPath(); ctx.ellipse(cx-headR*0.6, headY+headR*0.3, headR*0.21, headR*0.11, -0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx+headR*0.6, headY+headR*0.3, headR*0.21, headR*0.11, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Mouth
        const mY0 = headY + headR * 0.55;
        stroke(ol, lw*0.8); ctx.beginPath();
        if (urgency < 0.45) ctx.arc(cx, mY0 - headR*0.08, headR*0.22, 0.3, Math.PI-0.3);
        else if (urgency < 0.75) { ctx.moveTo(cx-headR*0.2, mY0); ctx.lineTo(cx+headR*0.2, mY0); }
        else ctx.arc(cx, mY0+headR*0.15, headR*0.22, Math.PI+0.35, -0.35);
        ctx.stroke();
      }

      // ── PRESET 1: Cool Teen ────────────────────────────────────────────────
      // Spiky cyan hair, green hoodie, white kicks, earbuds
      else if (preset === 1) {
        const skin = '#FDDBB5', hair = '#00D8E8', hoodie = '#3DC9A0', hoodieD = '#28A880';
        // Legs (skinny jeans)
        filledRR(cx - legW - ls*0.4, legY, legW, legH, legW*0.4, '#2A3050', ol, lw*0.8);
        filledRR(cx + ls*0.4, legY, legW, legH, legW*0.4, '#2A3050', ol, lw*0.8);
        // Sneakers (chunky white)
        filledRR(cx - legW*1.2 - ls*0.6, footY, footW*1.1, legW*0.65, legW*0.35, '#F8F8F8', ol, lw*0.8);
        stroke('#DDDDDD', lw*0.4); ctx.beginPath(); ctx.moveTo(cx-legW*1.2-ls*0.6+footW*0.25, footY+legW*0.35); ctx.lineTo(cx-legW*1.2-ls*0.6+footW*0.9, footY+legW*0.35); ctx.stroke();
        filledRR(cx + legW*0.0 + ls*0.6, footY, footW*1.1, legW*0.65, legW*0.35, '#F8F8F8', ol, lw*0.8);
        // Hoodie body
        ctx.beginPath();
        ctx.moveTo(cx - bodyW*0.45, bodyY); ctx.lineTo(cx + bodyW*0.45, bodyY);
        ctx.lineTo(cx + bodyW*0.5, bodyY + bodyH); ctx.lineTo(cx - bodyW*0.5, bodyY + bodyH);
        ctx.closePath(); fill(hoodie); ctx.fill(); stroke(ol); ctx.stroke();
        // Kangaroo pocket
        filledRR(cx - bodyW*0.28, bodyY+bodyH*0.55, bodyW*0.56, bodyH*0.35, bodyW*0.1, hoodieD, ol, lw*0.5);
        // Hood on back (visible as arc)
        ctx.beginPath(); ctx.arc(cx, bodyY - headR*0.1, bodyW*0.38, Math.PI, 0);
        fill(hoodieD); ctx.fill(); stroke(ol, lw*0.7); ctx.stroke();
        // Arms
        filledRR(cx - bodyW*0.5 - legW*0.6 - walk*legH*0.1, bodyY+bodyH*0.08, legW*1.1, bodyH*0.6, legW*0.4, hoodie, ol, lw*0.8);
        filledRR(cx + bodyW*0.5 + walk*legH*0.1, bodyY+bodyH*0.08, legW*1.1, bodyH*0.6, legW*0.4, hoodie, ol, lw*0.8);
        // Head
        ctx.beginPath(); ctx.ellipse(cx, headY, headR, headR*1.0, 0, 0, Math.PI*2);
        fill(skin); ctx.fill(); stroke(ol); ctx.stroke();
        // Spiky hair (cyan spikes radiating up)
        fill(hair); stroke(ol, lw*0.7);
        const spikes = [[-0.7,1.2],[-0.4,1.45],[0,1.55],[0.4,1.45],[0.7,1.2]];
        spikes.forEach(([dx,dy]) => {
          ctx.beginPath();
          ctx.moveTo(cx + dx*headR*0.55 - headR*0.14, headY - headR*0.55);
          ctx.lineTo(cx + dx*headR, headY - headR*dy);
          ctx.lineTo(cx + dx*headR*0.55 + headR*0.14, headY - headR*0.55);
          ctx.closePath(); fill(hair); ctx.fill(); stroke(ol, lw*0.7); ctx.stroke();
        });
        // Eyes (anime large)
        filledCircle(cx-headR*0.35, headY+headR*0.05, headR*0.2, '#fff', ol, lw*0.8);
        filledCircle(cx+headR*0.35, headY+headR*0.05, headR*0.2, '#fff', ol, lw*0.8);
        filledCircle(cx-headR*0.35, headY+headR*0.08, headR*0.12, urgency>0.7?'#FF2020':'#1A8888');
        filledCircle(cx+headR*0.35, headY+headR*0.08, headR*0.12, urgency>0.7?'#FF2020':'#1A8888');
        filledCircle(cx-headR*0.3, headY+headR*0.01, headR*0.04, '#fff');
        filledCircle(cx+headR*0.3, headY+headR*0.01, headR*0.04, '#fff');
        // Earbud wire
        stroke('#333', lw*0.5); ctx.beginPath(); ctx.moveTo(cx+headR*0.55, headY); ctx.quadraticCurveTo(cx+headR*0.8, headY+headR*0.5, cx+headR*0.5, headY+headR*0.6); ctx.stroke();
        filledCircle(cx+headR*0.55, headY, headR*0.07, '#222');
        // Mouth smirk
        stroke(ol, lw*0.8); ctx.beginPath();
        if (urgency < 0.5) { ctx.moveTo(cx-headR*0.05, headY+headR*0.52); ctx.quadraticCurveTo(cx+headR*0.15, headY+headR*0.65, cx+headR*0.28, headY+headR*0.50); }
        else { ctx.moveTo(cx-headR*0.2, headY+headR*0.52); ctx.lineTo(cx+headR*0.2, headY+headR*0.52); }
        ctx.stroke();
      }

      // ── PRESET 2: Business Guy ────────────────────────────────────────────
      // Slicked brown hair, grey suit, red tie, briefcase silhouette in arm
      else if (preset === 2) {
        const skin = '#E8B888', suit = '#5A6A7A', suitHi = '#7A8A9A', tie = '#DD2233', trouser = '#3A4A5A';
        // Trousers
        filledRR(cx - legW - ls*0.4, legY, legW, legH, legW*0.3, trouser, ol, lw*0.8);
        filledRR(cx + ls*0.4, legY, legW, legH, legW*0.3, trouser, ol, lw*0.8);
        // Oxford shoes
        filledRR(cx - legW*1.1 - ls*0.6, footY, footW, legW*0.6, legW*0.25, '#2A1A08', ol, lw*0.8);
        filledRR(cx + legW*0.1 + ls*0.6, footY, footW, legW*0.6, legW*0.25, '#2A1A08', ol, lw*0.8);
        // Suit jacket
        ctx.beginPath();
        ctx.moveTo(cx - bodyW*0.5, bodyY); ctx.lineTo(cx + bodyW*0.5, bodyY);
        ctx.lineTo(cx + bodyW*0.48, bodyY+bodyH); ctx.lineTo(cx - bodyW*0.48, bodyY+bodyH);
        ctx.closePath(); fill(suit); ctx.fill(); stroke(ol); ctx.stroke();
        // Lapels
        ctx.beginPath(); ctx.moveTo(cx, bodyY+bodyH*0.15); ctx.lineTo(cx-bodyW*0.3, bodyY); ctx.lineTo(cx-bodyW*0.1, bodyY+bodyH*0.4); ctx.closePath(); fill(suitHi); ctx.fill(); stroke(ol, lw*0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, bodyY+bodyH*0.15); ctx.lineTo(cx+bodyW*0.3, bodyY); ctx.lineTo(cx+bodyW*0.1, bodyY+bodyH*0.4); ctx.closePath(); fill(suitHi); ctx.fill(); stroke(ol, lw*0.6); ctx.stroke();
        // Tie
        ctx.beginPath(); ctx.moveTo(cx-lw*1.2, bodyY+bodyH*0.1); ctx.lineTo(cx+lw*1.2, bodyY+bodyH*0.1); ctx.lineTo(cx+lw*2, bodyY+bodyH*0.7); ctx.lineTo(cx, bodyY+bodyH*0.85); ctx.lineTo(cx-lw*2, bodyY+bodyH*0.7); ctx.closePath(); fill(tie); ctx.fill(); stroke(ol, lw*0.5); ctx.stroke();
        // Arms + right arm holds mini briefcase
        filledRR(cx - bodyW*0.5 - legW*0.65 - walk*legH*0.08, bodyY+bodyH*0.08, legW, bodyH*0.58, legW*0.4, suit, ol, lw*0.8);
        filledRR(cx + bodyW*0.5 + walk*legH*0.08, bodyY+bodyH*0.08, legW, bodyH*0.58, legW*0.4, suit, ol, lw*0.8);
        // Briefcase (right hand)
        const bcX = cx + bodyW*0.5 + legW + walk*legH*0.08;
        filledRR(bcX, bodyY+bodyH*0.45, legW*1.8, bodyH*0.42, lw, '#8B6020', ol, lw*0.7);
        stroke(ol, lw*0.4); ctx.beginPath(); ctx.moveTo(bcX+legW*0.55, bodyY+bodyH*0.45); ctx.lineTo(bcX+legW*0.55, bodyY+bodyH*0.45-lw*1.5); ctx.lineTo(bcX+legW*1.25, bodyY+bodyH*0.45-lw*1.5); ctx.lineTo(bcX+legW*1.25, bodyY+bodyH*0.45); ctx.stroke();
        // Head (squarish jaw)
        ctx.beginPath(); ctx.ellipse(cx, headY, headR*0.92, headR, 0, 0, Math.PI*2); fill(skin); ctx.fill(); stroke(ol); ctx.stroke();
        // Slicked hair
        fill('#5C3010');
        ctx.beginPath(); ctx.ellipse(cx - headR*0.1, headY - headR*0.55, headR*0.85, headR*0.5, -0.15, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx+headR*0.3, headY-headR*0.4); ctx.quadraticCurveTo(cx+headR*0.8, headY-headR*0.9, cx+headR*0.5, headY-headR*1.1); ctx.quadraticCurveTo(cx+headR*0.2, headY-headR*0.55, cx+headR*0.3, headY-headR*0.4); ctx.closePath(); ctx.fill();
        stroke(ol, lw*0.7); ctx.beginPath(); ctx.moveTo(cx-headR*0.9, headY-headR*0.4); ctx.ellipse(cx-headR*0.1, headY-headR*0.55, headR*0.85, headR*0.5, -0.15, Math.PI, 0); ctx.stroke();
        // Eyes (sharp brow)
        filledCircle(cx-headR*0.34, headY+headR*0.05, headR*0.16, '#fff', ol, lw*0.7);
        filledCircle(cx+headR*0.34, headY+headR*0.05, headR*0.16, '#fff', ol, lw*0.7);
        filledCircle(cx-headR*0.34, headY+headR*0.07, headR*0.09, urgency>0.7?'#FF2020':'#2A3A50');
        filledCircle(cx+headR*0.34, headY+headR*0.07, headR*0.09, urgency>0.7?'#FF2020':'#2A3A50');
        // Brows (angular)
        stroke('#3A2010', lw*0.9);
        ctx.beginPath(); ctx.moveTo(cx-headR*0.52, headY-headR*0.2); ctx.lineTo(cx-headR*0.16, headY-headR*(urgency>0.6?0.28:0.15)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+headR*0.52, headY-headR*0.2); ctx.lineTo(cx+headR*0.16, headY-headR*(urgency>0.6?0.28:0.15)); ctx.stroke();
        // Mouth (thin serious)
        stroke(ol, lw*0.8); ctx.beginPath();
        if (urgency<0.45) { ctx.moveTo(cx-headR*0.22, headY+headR*0.52); ctx.quadraticCurveTo(cx, headY+headR*0.65, cx+headR*0.22, headY+headR*0.52); }
        else { ctx.moveTo(cx-headR*0.2, headY+headR*0.52); ctx.lineTo(cx+headR*0.2, headY+headR*0.52); }
        ctx.stroke();
      }

      // ── PRESET 3: Fancy Lady ─────────────────────────────────────────────
      // Giant purple hat, pearl necklace, red gown, long lashes
      else if (preset === 3) {
        const skin = '#F8D0A8', gown = '#B02880', gownHi = '#D050A8', hat = '#7020B0', hatBrim = '#9030C8';
        // Gown (wide A-line)
        ctx.beginPath();
        ctx.moveTo(cx - bodyW*0.42, bodyY);
        ctx.lineTo(cx + bodyW*0.42, bodyY);
        ctx.lineTo(cx + bodyW*0.9, bodyY + bodyH + legH*0.6);
        ctx.lineTo(cx - bodyW*0.9, bodyY + bodyH + legH*0.6);
        ctx.closePath(); fill(gown); ctx.fill(); stroke(ol); ctx.stroke();
        // Gown sheen
        ctx.save(); ctx.clip();
        const gwg = ctx.createLinearGradient(cx-bodyW*0.5, bodyY, cx+bodyW*0.1, bodyY+bodyH);
        gwg.addColorStop(0, 'rgba(255,255,255,0.22)'); gwg.addColorStop(1, 'rgba(255,255,255,0)');
        fill(gwg); ctx.fillRect(cx-bodyW, bodyY, bodyW, bodyH+legH); ctx.restore();
        // Gown ruffle hem
        for (let ri=0; ri<7; ri++) {
          const rx = cx - bodyW*0.85 + ri*bodyW*0.28;
          filledCircle(rx, bodyY+bodyH+legH*0.55, lw*1.5, gownHi, ol, lw*0.5);
        }
        // Legs (barely visible under gown)
        // Arms (gloved white)
        filledRR(cx - bodyW*0.45 - legW*0.6 - walk*legH*0.08, bodyY+bodyH*0.1, legW, bodyH*0.55, legW*0.4, '#F0EEE8', ol, lw*0.7);
        filledRR(cx + bodyW*0.45 + walk*legH*0.08, bodyY+bodyH*0.1, legW, bodyH*0.55, legW*0.4, '#F0EEE8', ol, lw*0.7);
        // Pearl necklace
        for (let pi=0; pi<7; pi++) {
          const pa = Math.PI - pi * (Math.PI/6);
          filledCircle(cx + Math.cos(pa)*headR*0.55, headY+headR*0.72 + Math.sin(pa)*headR*0.08, headR*0.07, '#F8F4E8', ol, lw*0.4);
        }
        // Head (oval)
        ctx.beginPath(); ctx.ellipse(cx, headY, headR*0.88, headR, 0, 0, Math.PI*2); fill(skin); ctx.fill(); stroke(ol); ctx.stroke();
        // Hat brim (flat wide ellipse)
        ctx.beginPath(); ctx.ellipse(cx, headY - headR*0.68, headR*1.5, headR*0.3, 0, 0, Math.PI*2); fill(hatBrim); ctx.fill(); stroke(ol, lw*0.8); ctx.stroke();
        // Hat crown (tall rounded rect)
        filledRR(cx - headR*0.7, headY - headR*0.68 - headR*1.1, headR*1.4, headR*1.1, headR*0.3, hat, ol, lw);
        // Hat ribbon
        filledRR(cx - headR*0.7, headY - headR*0.68 - headR*0.28, headR*1.4, headR*0.22, 0, '#FF80C0', ol, lw*0.5);
        // Hat flower
        for (let pf=0; pf<5; pf++) {
          const pfA = (pf/5)*Math.PI*2;
          filledCircle(cx + headR*0.35 + Math.cos(pfA)*headR*0.14, headY-headR*0.7+Math.sin(pfA)*headR*0.14, headR*0.1, '#FFD0E8');
        }
        filledCircle(cx+headR*0.35, headY-headR*0.7, headR*0.09, '#FFB0C0');
        // Eyes (big lashes)
        filledCircle(cx-headR*0.34, headY+headR*0.12, headR*0.19, '#fff', ol, lw*0.8);
        filledCircle(cx+headR*0.34, headY+headR*0.12, headR*0.19, '#fff', ol, lw*0.8);
        filledCircle(cx-headR*0.34, headY+headR*0.15, headR*0.11, urgency>0.7?'#FF2020':'#6020A0');
        filledCircle(cx+headR*0.34, headY+headR*0.15, headR*0.11, urgency>0.7?'#FF2020':'#6020A0');
        // Lashes (5 lines upper lid)
        stroke(ol, lw*0.6);
        [-0.18,-0.1,0,0.1,0.18].forEach(lx => {
          ctx.beginPath();
          ctx.moveTo(cx-headR*0.34+lx*headR, headY+headR*0.12-headR*0.19);
          ctx.lineTo(cx-headR*0.34+lx*headR*1.3, headY+headR*0.12-headR*0.28);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx+headR*0.34+lx*headR, headY+headR*0.12-headR*0.19);
          ctx.lineTo(cx+headR*0.34+lx*headR*1.3, headY+headR*0.12-headR*0.28);
          ctx.stroke();
        });
        // Glossy lips
        stroke('#8B1040', lw*0.7); fill('#EE3060');
        ctx.beginPath(); ctx.ellipse(cx, headY+headR*0.62, headR*0.22, headR*0.1, 0, 0, Math.PI*2); ctx.fill();
        if (urgency > 0.65) { stroke(ol, lw*0.8); ctx.beginPath(); ctx.arc(cx, headY+headR*0.72, headR*0.18, Math.PI+0.4, -0.4); ctx.stroke(); }
      }

      // ── PRESET 4: Little Kid ─────────────────────────────────────────────
      // Tiny proportions, red cap, overalls, freckles, gap-tooth grin
      else {
        const skin = '#FDDBB5', overall = '#4478C8', cap = '#DD2020', shirt = '#F8F0D0';
        // Shorter legs (kid proportion)
        const kidLegH = legH * 0.75;
        filledRR(cx - legW - ls*0.5, legY, legW, kidLegH, legW*0.4, overall, ol, lw*0.8);
        filledRR(cx + ls*0.5, legY, legW, kidLegH, legW*0.4, overall, ol, lw*0.8);
        // Sneakers (rounded, colourful)
        filledRR(cx - legW*1.15 - ls*0.7, legY+kidLegH-lw, footW*0.95, legW*0.65, legW*0.35, '#EEEEEE', ol, lw*0.8);
        filledRR(cx + legW*0.05 + ls*0.7, legY+kidLegH-lw, footW*0.95, legW*0.65, legW*0.35, '#EEEEEE', ol, lw*0.8);
        // Overalls bib
        ctx.beginPath(); ctx.moveTo(cx-bodyW*0.42, bodyY); ctx.lineTo(cx+bodyW*0.42, bodyY); ctx.lineTo(cx+bodyW*0.45, bodyY+bodyH); ctx.lineTo(cx-bodyW*0.45, bodyY+bodyH); ctx.closePath(); fill(overall); ctx.fill(); stroke(ol); ctx.stroke();
        // Shirt collar showing under bib
        ctx.beginPath(); ctx.moveTo(cx-bodyW*0.3, bodyY); ctx.lineTo(cx-bodyW*0.12, bodyY+bodyH*0.25); ctx.lineTo(cx+bodyW*0.12, bodyY+bodyH*0.25); ctx.lineTo(cx+bodyW*0.3, bodyY); ctx.closePath(); fill(shirt); ctx.fill();
        // Overall straps
        stroke(overall, lw*0.9);
        ctx.beginPath(); ctx.moveTo(cx-bodyW*0.2, bodyY); ctx.lineTo(cx-bodyW*0.3, bodyY-headR*0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+bodyW*0.2, bodyY); ctx.lineTo(cx+bodyW*0.3, bodyY-headR*0.3); ctx.stroke();
        // Pocket
        filledRR(cx-bodyW*0.22, bodyY+bodyH*0.3, bodyW*0.44, bodyH*0.3, lw, overall, ol, lw*0.5);
        // Arms (chubby)
        filledRR(cx-bodyW*0.5-legW*0.65-walk*legH*0.1, bodyY+bodyH*0.08, legW*1.1, bodyH*0.55, legW*0.5, shirt, ol, lw*0.8);
        filledRR(cx+bodyW*0.5+walk*legH*0.1, bodyY+bodyH*0.08, legW*1.1, bodyH*0.55, legW*0.5, shirt, ol, lw*0.8);
        // BIG round head
        ctx.beginPath(); ctx.ellipse(cx, headY, headR*1.08, headR*1.05, 0, 0, Math.PI*2); fill(skin); ctx.fill(); stroke(ol); ctx.stroke();
        // Red baseball cap
        filledRR(cx - headR*0.85, headY - headR*0.42, headR*1.7, headR*0.72, headR*0.3, cap, ol, lw);
        ctx.beginPath(); ctx.ellipse(cx-headR*0.05, headY-headR*0.42, headR*1.0, headR*0.2, -0.08, Math.PI, 0); fill(cap); ctx.fill(); stroke(ol, lw*0.7); ctx.stroke();
        // Cap brim
        ctx.beginPath(); ctx.ellipse(cx+headR*0.5, headY-headR*0.3, headR*0.65, headR*0.16, 0.2, 0, Math.PI*2); fill('#BB1818'); ctx.fill(); stroke(ol, lw*0.7); ctx.stroke();
        // Eyes (big cute circles)
        filledCircle(cx-headR*0.35, headY+headR*0.12, headR*0.22, '#fff', ol, lw*0.9);
        filledCircle(cx+headR*0.35, headY+headR*0.12, headR*0.22, '#fff', ol, lw*0.9);
        filledCircle(cx-headR*0.35, headY+headR*0.15, headR*0.14, urgency>0.7?'#FF2020':'#3A1A6A');
        filledCircle(cx+headR*0.35, headY+headR*0.15, headR*0.14, urgency>0.7?'#FF2020':'#3A1A6A');
        filledCircle(cx-headR*0.3, headY+headR*0.09, headR*0.05, '#fff');
        filledCircle(cx+headR*0.3, headY+headR*0.09, headR*0.05, '#fff');
        // Freckles
        ctx.globalAlpha = 0.55; fill('#D07040');
        [[-0.58,0.35],[-0.48,0.44],[-0.62,0.46],[0.58,0.35],[0.48,0.44],[0.62,0.46]].forEach(([fx,fy])=>{
          ctx.beginPath(); ctx.arc(cx+fx*headR, headY+fy*headR, headR*0.04, 0, Math.PI*2); ctx.fill();
        }); ctx.globalAlpha=1;
        // Gap-tooth grin
        fill('#fff'); stroke(ol, lw*0.7);
        ctx.beginPath(); ctx.arc(cx, headY+headR*0.62, headR*0.24, 0.1, Math.PI-0.1); ctx.fill(); ctx.stroke();
        if (urgency < 0.5) {
          // gap tooth
          fill('#E8C0A0'); ctx.beginPath(); ctx.rect(cx-lw*0.4, headY+headR*0.62, lw*0.8, headR*0.15); ctx.fill();
        } else {
          fill('#222'); ctx.beginPath(); ctx.arc(cx, headY+headR*0.68, headR*0.14, 0, Math.PI); ctx.fill();
        }
      }

      // ── Speech bubble (shared across all presets) ─────────────────────────
      const bubbleW = Math.max(headR * 3.2, h * 0.44);
      const bubbleH = headR * 1.8;
      const bx = cx;
      const by = headY - headR * 1.5 - bubbleH;
      const urgColor = urgency > 0.7 ? '#FF4444' : urgency > 0.4 ? '#FFAA00' : '#FFFFFF';
      const urgBorder = urgency > 0.7 ? '#CC0000' : urgency > 0.4 ? '#CC6600' : ol;

      // Bubble drop shadow
      ctx.save(); ctx.globalAlpha=0.18; fill('#000');
      this.rrC(ctx, bx - bubbleW/2 + lw, by + lw, bubbleW, bubbleH, bubbleH*0.44); ctx.fill();
      ctx.restore();
      // Bubble body
      this.rrC(ctx, bx - bubbleW/2, by, bubbleW, bubbleH, bubbleH*0.44);
      fill(urgColor); ctx.fill(); stroke(urgBorder, lw); ctx.stroke();
      // Bubble tail
      const tailTip = headY - headR * 1.05;
      ctx.beginPath();
      ctx.moveTo(cx - headR*0.2, by + bubbleH);
      ctx.lineTo(cx + headR*0.2, by + bubbleH);
      ctx.lineTo(cx, tailTip);
      ctx.closePath(); fill(urgColor); ctx.fill();
      stroke(urgBorder, lw*0.7);
      ctx.beginPath(); ctx.moveTo(cx-headR*0.2, by+bubbleH); ctx.lineTo(cx, tailTip); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+headR*0.2, by+bubbleH); ctx.lineTo(cx, tailTip); ctx.stroke();
      // Dish emoji
      this.glyphC(ctx, order.emoji || '🍽️', bx, by + bubbleH*0.5, bubbleH*0.62);

      // Timer bar under feet
      const barW = bodyW * 1.3;
      const barH2 = lw * 1.4;
      const barX = cx - barW/2;
      const barY2 = cy + h*0.5 - barH2;
      const pct = Math.max(0, order.ttl / order.ttlMax);
      filledRR(barX, barY2, barW, barH2, barH2/2, 'rgba(0,0,0,0.28)');
      filledRR(barX, barY2, barW*pct, barH2, barH2/2, pct>0.5?'#44DD44':pct>0.25?'#FFCC00':'#FF3333');
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
