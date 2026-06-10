// Canvas kitchen renderer with snapshot interpolation and juicy effects.
(function () {
  const ING_EMOJI = {
    lettuce: '🥬', tomato: '🍅', cucumber: '🥒', bun: '🍞', patty: '🥩',
    cheese: '🧀', onion: '🧅', rice: '🍚', fish: '🐟', seaweed: '🌿', dough: '🫓',
  };
  // only use a distinct emoji when it truly reads as "chopped X" —
  // everything else keeps its emoji and gets a clear knife badge
  const CHOPPED_EMOJI = { fish: '🍣' };
  const COOKED_EMOJI = { patty: '🍖' };
  const DISH_EMOJI = { soup_onion: '🥣', soup_tomato: '🍲', pizza: '🍕', burned: '🪨' };
  const PLAYER_COLORS = ['#E8543F', '#5BA8C9', '#6FA84C', '#B176C9', '#F4B942', '#E87BA4', '#48B59E', '#8A7568'];

  function itemEmoji(item) {
    if (!item) return '';
    if (item.kind === 'dish') return DISH_EMOJI[item.id] || '🍽️';
    if (item.kind === 'plate') return '🍽️';
    if (item.state === 'chopped' && CHOPPED_EMOJI[item.id]) return CHOPPED_EMOJI[item.id];
    if (item.state === 'cooked' && COOKED_EMOJI[item.id]) return COOKED_EMOJI[item.id];
    return ING_EMOJI[item.id] || '❓';
  }

  function tokenEmoji(token) {
    const [id, state] = token.split('.');
    if (state === 'dish') return DISH_EMOJI[id] || '🍽️';
    return itemEmoji({ id, state });
  }

  // HTML for order tickets: emoji plus a small state badge (🔪 chop / ♨️ cook)
  function tokenHtml(token) {
    const [id, state] = token.split('.');
    const badge = state === 'chopped' && !CHOPPED_EMOJI[id] ? '🔪'
      : state === 'cooked' && !COOKED_EMOJI[id] ? '♨️' : '';
    return `<span class="need">${tokenEmoji(token)}${badge ? `<b>${badge}</b>` : ''}</span>`;
  }

  class Renderer {
    constructor(canvas, staticState, myId, onTap) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.lvl = staticState;
      this.myId = myId;
      this.onTap = onTap;
      this.prev = null;
      this.cur = null;
      this.prevAt = 0;
      this.curAt = 0;
      this.fx = [];
      this.colorOf = {};
      this.running = true;
      this.dpr = Math.min(window.devicePixelRatio || 1, 3);

      this.resize = this.resize.bind(this);
      window.addEventListener('resize', this.resize);
      this.resize();

      canvas.addEventListener('pointerdown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
        const tx = Math.floor((cx - this.ox) / this.ts);
        const ty = Math.floor((cy - this.oy) / this.ts);
        this.fx.push({ kind: 'ripple', x: cx, y: cy, t: 0 });
        if (tx >= 0 && ty >= 0 && tx < this.lvl.w && ty < this.lvl.h) this.onTap(tx, ty);
      });

      requestAnimationFrame(() => this.frame());
    }

    destroy() {
      this.running = false;
      window.removeEventListener('resize', this.resize);
    }

    resize() {
      const wrap = this.canvas.parentElement;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.ts = Math.floor(Math.min(this.canvas.width / this.lvl.w, this.canvas.height / this.lvl.h));
      this.ox = Math.floor((this.canvas.width - this.ts * this.lvl.w) / 2);
      this.oy = Math.floor((this.canvas.height - this.ts * this.lvl.h) / 2);
    }

    update(state) {
      this.prev = this.cur;
      this.prevAt = this.curAt;
      this.cur = state;
      this.curAt = performance.now();
      state.players.forEach((p, i) => {
        if (!this.colorOf[p.id]) this.colorOf[p.id] = PLAYER_COLORS[Object.keys(this.colorOf).length % PLAYER_COLORS.length];
      });
      for (const ev of state.events) this.addFx(ev);
    }

    addFx(ev) {
      const px = (x) => this.ox + (x + 0.5) * this.ts;
      const py = (y) => this.oy + (y + 0.5) * this.ts;
      if (ev.type === 'serve') {
        this.fx.push({ kind: 'points', x: px(ev.x), y: py(ev.y), text: `+${ev.points}`, t: 0 });
        for (let i = 0; i < 10; i++) {
          this.fx.push({
            kind: 'confetti', x: px(ev.x), y: py(ev.y), t: 0,
            vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 6 - 2,
            color: PLAYER_COLORS[i % PLAYER_COLORS.length],
          });
        }
      } else if (ev.type === 'burn') {
        this.fx.push({ kind: 'points', x: px(ev.x), y: py(ev.y), text: '🔥 burned!', t: 0, color: '#C93D2B' });
      } else if (ev.type === 'chopped' || ev.type === 'ding') {
        this.fx.push({ kind: 'pop', x: px(ev.x), y: py(ev.y), text: ev.type === 'ding' ? '♨️' : '✨', t: 0 });
      } else if (ev.type === 'reject' && ev.playerId === this.myId) {
        this.fx.push({ kind: 'points', x: px(ev.x), y: py(ev.y), text: '✕', t: 0, color: '#C93D2B' });
      }
    }

    lerpPlayers() {
      if (!this.cur) return [];
      if (!this.prev) return this.cur.players;
      const span = Math.max(this.curAt - this.prevAt, 1);
      const a = Math.min((performance.now() - this.curAt) / span, 1);
      return this.cur.players.map((p) => {
        const q = this.prev.players.find((x) => x.id === p.id);
        if (!q) return p;
        return { ...p, x: q.x + (p.x - q.x) * a, y: q.y + (p.y - q.y) * a };
      });
    }

    frame() {
      if (!this.running) return;
      this.draw();
      requestAnimationFrame(() => this.frame());
    }

    draw() {
      const { ctx, ts, ox, oy, lvl } = this;
      const now = performance.now();
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // floor + static tiles
      for (let y = 0; y < lvl.h; y++) {
        for (let x = 0; x < lvl.w; x++) {
          const c = lvl.grid[y][x];
          const X = ox + x * ts, Y = oy + y * ts;
          // floor under everything
          ctx.fillStyle = (x + y) % 2 ? '#F3E3C3' : '#EEDBB5';
          ctx.fillRect(X, Y, ts, ts);
          if (c === '.') continue;
          this.drawStation(c, x, y, X, Y);
        }
      }

      // dynamic station contents
      if (this.cur) {
        for (const [key, s] of Object.entries(this.cur.stations)) {
          const [x, y] = key.split(',').map(Number);
          const X = ox + x * ts, Y = oy + y * ts;
          const cell = lvl.grid[y][x];
          if (s.item) {
            this.drawItem(s.item, X + ts / 2, Y + ts / 2, ts * 0.52);
            if (cell === 'B' && s.item.state === 'raw' && s.progress > 0) {
              this.bar(X, Y, s.progress, '#6FA84C');
            }
          }
          if (s.contents) {
            // cooker contents
            const n = s.contents.length;
            s.contents.forEach((it, i) => {
              const off = n > 1 ? (i - (n - 1) / 2) * ts * 0.26 : 0;
              this.drawItem(it, X + ts / 2 + off, Y + ts / 2 - ts * 0.06, ts * (n > 1 ? 0.34 : 0.5), false);
            });
            if (s.state === 'cooking') {
              this.bar(X, Y, s.progress, '#F4B942');
              if (Math.floor(now / 300) % 2) this.glyph('💨', X + ts * 0.78, Y + ts * 0.2, ts * 0.3);
            } else if (s.state === 'done') {
              this.bar(X, Y, s.progress, s.progress > 0.6 ? '#E8543F' : '#6FA84C');
              this.glyph('✅', X + ts * 0.8, Y + ts * 0.22, ts * 0.3);
            } else if (s.state === 'burned') {
              if (Math.floor(now / 250) % 2) this.glyph('💨', X + ts * 0.5, Y + ts * 0.1, ts * 0.4);
            }
          }
        }
      }

      // chefs
      for (const p of this.lerpPlayers()) {
        const X = ox + p.x * ts, Y = oy + p.y * ts;
        const bounce = p.moving ? Math.abs(Math.sin(now / 90)) * ts * 0.08 : 0;
        const wiggle = p.working ? Math.sin(now / 60) * 0.12 : 0;
        const r = ts * 0.42;

        // shadow
        ctx.fillStyle = 'rgba(59,46,42,.18)';
        ctx.beginPath();
        ctx.ellipse(X, Y + r * 0.85, r * 0.7, r * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();

        // body
        ctx.save();
        ctx.translate(X, Y - bounce);
        ctx.rotate(wiggle);
        ctx.fillStyle = this.colorOf[p.id] || '#E8543F';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        if (p.id === this.myId) {
          ctx.lineWidth = Math.max(2, ts * 0.06);
          ctx.strokeStyle = '#FFFDF8';
          ctx.stroke();
        }
        this.glyph(p.avatar, 0, 0, r * 1.25, true);
        ctx.restore();

        // carried item above head
        if (p.carry) {
          if (p.carry.kind === 'plate') {
            this.drawPlate(p.carry, X, Y - bounce - r * 1.5, ts * 0.6);
          } else {
            this.drawItem(p.carry, X, Y - bounce - r * 1.45, ts * 0.46);
          }
        }

        // name
        ctx.font = `700 ${Math.max(9, ts * 0.2)}px ui-rounded, system-ui`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(59,46,42,.75)';
        ctx.fillText(p.id === this.myId ? 'You' : p.name, X, Y + r * 1.7);
      }

      // effects
      this.fx = this.fx.filter((f) => {
        f.t += 1 / 60;
        if (f.kind === 'ripple') {
          const a = 1 - f.t / 0.35;
          if (a <= 0) return false;
          ctx.strokeStyle = `rgba(232,84,63,${a * 0.7})`;
          ctx.lineWidth = 3 * this.dpr;
          ctx.beginPath();
          ctx.arc(f.x, f.y, (f.t / 0.35) * ts * 0.7, 0, Math.PI * 2);
          ctx.stroke();
        } else if (f.kind === 'points') {
          const a = 1 - f.t / 1.1;
          if (a <= 0) return false;
          ctx.font = `800 ${ts * 0.42}px ui-rounded, system-ui`;
          ctx.textAlign = 'center';
          ctx.fillStyle = f.color || '#6FA84C';
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillText(f.text, f.x, f.y - f.t * ts * 1.2);
          ctx.globalAlpha = 1;
        } else if (f.kind === 'pop') {
          const a = 1 - f.t / 0.6;
          if (a <= 0) return false;
          ctx.globalAlpha = a;
          this.glyph(f.text, f.x, f.y - f.t * ts, ts * 0.5);
          ctx.globalAlpha = 1;
        } else if (f.kind === 'confetti') {
          if (f.t > 1) return false;
          f.vy += 0.25;
          f.x += f.vx * this.dpr;
          f.y += f.vy * this.dpr;
          ctx.fillStyle = f.color;
          ctx.fillRect(f.x, f.y, 4 * this.dpr, 4 * this.dpr);
        }
        return true;
      });
    }

    drawStation(c, gx, gy, X, Y) {
      const { ctx, ts } = this;
      const pad = ts * 0.04;
      const r = ts * 0.18;

      const base = (fill) => {
        ctx.fillStyle = fill;
        this.rr(X + pad, Y + pad, ts - pad * 2, ts - pad * 2, r);
        ctx.fill();
        ctx.fillStyle = 'rgba(59,46,42,.10)';
        this.rr(X + pad, Y + ts * 0.72, ts - pad * 2, ts * 0.24, r * 0.6);
        ctx.fill();
      };

      if (c === '#') {
        base('#D9B98C');
      } else if (c === 'B') {
        base('#D9B98C');
        ctx.fillStyle = '#F2E2C4';
        this.rr(X + ts * 0.16, Y + ts * 0.2, ts * 0.68, ts * 0.52, r * 0.5);
        ctx.fill();
        this.glyph('🔪', X + ts * 0.78, Y + ts * 0.78, ts * 0.3);
      } else if (c === 'S') {
        base('#9AA1A8');
        this.glyph('🍳', X + ts / 2, Y + ts / 2, ts * 0.62);
      } else if (c === 'O') {
        base('#9AA1A8');
        ctx.fillStyle = '#5A5F66';
        ctx.beginPath();
        ctx.arc(X + ts / 2, Y + ts / 2, ts * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#788087';
        ctx.beginPath();
        ctx.arc(X + ts / 2, Y + ts / 2, ts * 0.27, 0, Math.PI * 2);
        ctx.fill();
      } else if (c === 'V') {
        base('#6B5B53');
        ctx.fillStyle = '#3B2E2A';
        this.rr(X + ts * 0.2, Y + ts * 0.3, ts * 0.6, ts * 0.42, r * 0.5);
        ctx.fill();
        ctx.fillStyle = '#E8743F';
        this.rr(X + ts * 0.27, Y + ts * 0.5, ts * 0.46, ts * 0.16, r * 0.3);
        ctx.fill();
      } else if (c === 'P') {
        base('#D9B98C');
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = '#FFFDF8';
          ctx.beginPath();
          ctx.ellipse(X + ts / 2, Y + ts * (0.62 - i * 0.09), ts * 0.3, ts * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#E4D6BE';
          ctx.lineWidth = 1.2 * this.dpr;
          ctx.stroke();
        }
      } else if (c === 'W') {
        base('#6FA84C');
        ctx.fillStyle = '#5C8F3E';
        this.rr(X + ts * 0.14, Y + ts * 0.14, ts * 0.72, ts * 0.44, r * 0.5);
        ctx.fill();
        this.glyph('🛎️', X + ts / 2, Y + ts * 0.62, ts * 0.42);
      } else if (c === 'T') {
        base('#8A7568');
        this.glyph('🗑️', X + ts / 2, Y + ts / 2, ts * 0.55);
      } else if (/[1-9]/.test(c)) {
        base('#C99B5F');
        ctx.fillStyle = '#B3854A';
        this.rr(X + ts * 0.12, Y + ts * 0.12, ts * 0.76, ts * 0.2, r * 0.4);
        ctx.fill();
        const ing = this.lvl.crates[c];
        this.glyph(ING_EMOJI[ing] || '📦', X + ts / 2, Y + ts * 0.56, ts * 0.5);
      }
    }

    drawItem(item, x, y, size, chip = true) {
      if (item.kind === 'plate') {
        this.drawPlate(item, x, y, size);
        return;
      }
      if (chip) {
        // white backing chip so items read clearly on any tile
        const { ctx } = this;
        ctx.fillStyle = 'rgba(255,253,248,.95)';
        ctx.beginPath();
        ctx.arc(x, y, size * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(59,46,42,.15)';
        ctx.lineWidth = 1.5 * this.dpr;
        ctx.stroke();
      }
      this.glyph(itemEmoji(item), x, y, size);
      // state badge
      if (item.state === 'chopped' && !CHOPPED_EMOJI[item.id]) {
        this.badge('🔪', x + size * 0.52, y + size * 0.46, size * 0.62);
      } else if (item.state === 'cooked' && !COOKED_EMOJI[item.id]) {
        this.badge('♨️', x + size * 0.52, y + size * 0.46, size * 0.62);
      }
    }

    drawPlate(plate, x, y, size) {
      const { ctx } = this;
      ctx.fillStyle = '#FFFDF8';
      ctx.beginPath();
      ctx.ellipse(x, y + size * 0.18, size * 0.55, size * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#E4D6BE';
      ctx.lineWidth = 1.5 * this.dpr;
      ctx.stroke();
      const n = plate.contents.length;
      plate.contents.forEach((it, i) => {
        const off = (i - (n - 1) / 2) * size * 0.35;
        this.glyph(itemEmoji(it), x + off, y - size * 0.12, size * 0.5);
      });
    }

    badge(text, x, y, size) {
      const { ctx } = this;
      ctx.fillStyle = '#FFFDF8';
      ctx.beginPath();
      ctx.arc(x, y, size * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(59,46,42,.35)';
      ctx.lineWidth = 1.5 * this.dpr;
      ctx.stroke();
      this.glyph(text, x, y, size * 0.85);
    }

    bar(X, Y, frac, color) {
      const { ctx, ts } = this;
      const w = ts * 0.76;
      ctx.fillStyle = 'rgba(59,46,42,.25)';
      this.rr(X + ts * 0.12, Y - ts * 0.08, w, ts * 0.12, ts * 0.06);
      ctx.fill();
      ctx.fillStyle = color;
      this.rr(X + ts * 0.12, Y - ts * 0.08, Math.max(w * Math.min(frac, 1), ts * 0.08), ts * 0.12, ts * 0.06);
      ctx.fill();
    }

    glyph(text, x, y, size, centered = true) {
      const { ctx } = this;
      ctx.font = `${Math.round(size)}px "Apple Color Emoji", "Segoe UI Emoji", system-ui`;
      ctx.textAlign = centered ? 'center' : 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y);
    }

    rr(x, y, w, h, r) {
      const { ctx } = this;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
    }
  }

  window.KSRender = { Renderer, itemEmoji, tokenEmoji, tokenHtml };
})();
