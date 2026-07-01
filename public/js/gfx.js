// ============================================================================
//  Kitchen Sync — GFX sprite loader
//  ---------------------------------------------------------------------------
//  Consumes window.ASSETS (assetManifest.js). For every asset key:
//
//    1. Load the source image (one fetch per file — sheet crops share it).
//    2. Crop to the manifest's crop rect, if any.
//    3. KEY OUT the flat studio background: if the corners are opaque, flood
//       every border-connected pixel within tolerance of the corner colour to
//       transparent. (HD renders arrive on plain white/beige cards.)
//    4. TRIM to the alpha bounding box, so the prepared sprite's pixel
//       dimensions exactly match its visible content — draw calls keep true
//       proportions automatically.
//
//    Prepared sprites are cached canvases. Real .png missing? The same path
//    with .svg is tried (bundled placeholders), so the game is never blank.
// ============================================================================
(function () {
  const ASSETS = window.ASSETS || {};

  const norm = (key) => {
    const e = ASSETS[key];
    if (!e) return null;
    return typeof e === 'string' ? { path: e } : e;
  };

  const imgCache  = new Map();  // path → Image | null(loading) | false(missing)
  const prepCache = new Map();  // key  → canvas | false
  const pending   = new Map();  // path → [callback, ...] while loading
                                // (several keys may crop one shared sheet)

  function loadImage(path, onDone) {
    const v = imgCache.get(path);
    if (v) { onDone(v); return v; }
    if (v === false) return false;
    if (imgCache.has(path)) { pending.get(path).push(onDone); return null; }

    imgCache.set(path, null);
    pending.set(path, [onDone]);
    const fire = (image) => {
      imgCache.set(path, image);
      const cbs = pending.get(path) || [];
      pending.delete(path);
      if (image) for (const cb of cbs) cb(image);
    };
    const img = new Image();
    img.onload  = () => fire(img);
    img.onerror = () => {
      if (/\.png$/.test(path)) {
        const ph = new Image();
        ph.onload  = () => fire(ph);
        ph.onerror = () => fire(false);
        ph.src = '/' + path.replace(/\.png$/, '.svg');
      } else {
        fire(false);
      }
    };
    img.src = '/' + path;
    return null;
  }

  // Background-key + trim. Returns a tight canvas of just the sprite.
  // Sources are capped to working size FIRST: nothing draws bigger than
  // ~150 device px, and the flood fill below is per-pixel, so keying a
  // full-res studio render would burn 16x the CPU for zero visible gain.
  const MAX_SPRITE = 512, MAX_BACKDROP = 1536;
  function prepare(img, ent) {
    const crop = ent.crop;
    const cx0 = crop ? crop[0] : 0, cy0 = crop ? crop[1] : 0;
    const cw = crop ? crop[2] : (img.naturalWidth  || img.width);
    const ch = crop ? crop[3] : (img.naturalHeight || img.height);
    const cap = ent.nokey ? MAX_BACKDROP : MAX_SPRITE;
    const k = Math.min(1, cap / Math.max(cw, ch));
    const sw = Math.max(1, Math.round(cw * k));
    const sh = Math.max(1, Math.round(ch * k));
    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, cx0, cy0, cw, ch, 0, 0, sw, sh);
    if (ent.nokey) return c;

    let d;
    try { d = x.getImageData(0, 0, sw, sh); } catch (e) { return c; }
    const px = d.data;
    const at = (ix, iy) => (iy * sw + ix) * 4;

    // Key the background only when the corners are opaque (HD studio cards).
    const corners = [at(0,0), at(sw-1,0), at(0,sh-1), at(sw-1,sh-1)];
    if (corners.every(o => px[o+3] > 200)) {
      const br = (px[corners[0]]+px[corners[1]]+px[corners[2]]+px[corners[3]])/4;
      const bg = (px[corners[0]+1]+px[corners[1]+1]+px[corners[2]+1]+px[corners[3]+1])/4;
      const bb = (px[corners[0]+2]+px[corners[1]+2]+px[corners[2]+2]+px[corners[3]+2])/4;
      const dist2 = (o) => { const dr=px[o]-br, dg=px[o+1]-bg, db=px[o+2]-bb; return dr*dr+dg*dg+db*db; };
      const push4 = (i, arr) => {
        const ix = i % sw, iy = (i / sw) | 0;
        if (ix > 0)    arr.push(i-1);
        if (ix < sw-1) arr.push(i+1);
        if (iy > 0)    arr.push(i-sw);
        if (iy < sh-1) arr.push(i+sw);
      };
      const removed = new Uint8Array(sw*sh);

      // Phase 1 — remove the FLAT studio card only: flood from the border, eating
      // just pixels very close to the corner colour. A tight threshold means the
      // subtly-shaded light parts of a sprite (white plates, a white dress) are
      // NOT mistaken for background, so they stop being punched into see-through
      // holes. (The old single loose pass ate ~70% of pale characters.)
      const CORE = 600; // squared RGB distance — flat card + mild compression noise
      const seen = new Uint8Array(sw*sh);
      const stack = [];
      for (let ix=0; ix<sw; ix++) { stack.push(ix, (sh-1)*sw + ix); }
      for (let iy=0; iy<sh; iy++) { stack.push(iy*sw, iy*sw + sw-1); }
      while (stack.length) {
        const i = stack.pop();
        if (seen[i]) continue;
        seen[i] = 1;
        if (dist2(i*4) > CORE) continue;
        px[i*4+3] = 0; removed[i] = 1;
        push4(i, stack);
      }

      // Phase 2 — feather the thin anti-aliased halo where sprite meets card,
      // up to 2 pixels deep. Bounded depth means it can clean the edge without
      // ever eating into the sprite body.
      const EDGE = 3200;
      let frontier = [];
      for (let i=0; i<sw*sh; i++) if (removed[i]) push4(i, frontier);
      for (let ring=0; ring<2; ring++) {
        const next = [];
        for (const i of frontier) {
          if (removed[i] || px[i*4+3] === 0) continue;
          if (dist2(i*4) <= EDGE) { px[i*4+3] = 0; removed[i] = 1; push4(i, next); }
        }
        frontier = next;
      }
    }

    // Optional second pass (`deplate`): some food renders arrived sitting on
    // a white china plate, which players read as "already plated". Spread
    // from the border through transparent pixels and eat connected
    // low-chroma pixels (white china, grey rim shading, its outline) —
    // saturated food pixels stop the flood, so only the plate disappears.
    if (ent.deplate) {
      const seen2 = new Uint8Array(sw*sh);
      const stack2 = [];
      for (let ix=0; ix<sw; ix++) { stack2.push(ix, (sh-1)*sw + ix); }
      for (let iy=0; iy<sh; iy++) { stack2.push(iy*sw, iy*sw + sw-1); }
      while (stack2.length) {
        const i = stack2.pop();
        if (seen2[i]) continue;
        seen2[i] = 1;
        const o = i*4;
        if (px[o+3] > 8) {
          const r=px[o], g=px[o+1], b=px[o+2];
          const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
          if (mx - mn >= Math.max(36, mx * 0.22)) continue; // saturated = food
          px[o+3] = 0;
        }
        const ix = i % sw, iy = (i / sw) | 0;
        if (ix > 0)    stack2.push(i-1);
        if (ix < sw-1) stack2.push(i+1);
        if (iy > 0)    stack2.push(i-sw);
        if (iy < sh-1) stack2.push(i+sw);
      }
    }

    // Trim to alpha bounding box.
    let minX=sw, minY=sh, maxX=-1, maxY=-1;
    for (let iy=0; iy<sh; iy++) for (let ix=0; ix<sw; ix++) {
      if (px[at(ix,iy)+3] > 8) {
        if (ix<minX) minX=ix; if (ix>maxX) maxX=ix;
        if (iy<minY) minY=iy; if (iy>maxY) maxY=iy;
      }
    }
    if (maxX < 0) return c;                        // fully transparent — keep as is
    x.putImageData(d, 0, 0);
    const bw = maxX-minX+1, bh = maxY-minY+1;
    const out = document.createElement('canvas');
    out.width = bw; out.height = bh;
    out.getContext('2d').drawImage(c, minX, minY, bw, bh, 0, 0, bw, bh);
    return ent.flatten ? flattenStrips(out, ent.flatten) : out;
  }

  // Perspective-flattener for wall decor: the iso renders draw wall items as
  // trapezoids (near edge taller than far edge), which looks broken on the
  // straight-on wall. `flatten: { top:[fL,fR], bot:[fL,fR] }` gives the
  // trapezoid's top/bottom edges at the left/right of the trimmed sprite as
  // fractions of its height; vertical strips are re-stretched so both edges
  // come out horizontal. Runs once at prepare time, never per frame.
  function flattenStrips(src, f) {
    const w = src.width, h = src.height;
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const ctx = out.getContext('2d');
    const N = Math.min(w, 96);
    for (let i = 0; i < N; i++) {
      const x0 = Math.floor(i * w / N), x1 = Math.ceil((i + 1) * w / N);
      const t = (i + 0.5) / N;
      const top = (f.top[0] + (f.top[1] - f.top[0]) * t) * h;
      const bot = (f.bot[0] + (f.bot[1] - f.bot[0]) * t) * h;
      if (bot - top < 1) continue;
      ctx.drawImage(src, x0, top, x1 - x0, bot - top, x0, 0, x1 - x0, h);
    }
    return out;
  }

  // Keying + trimming is real CPU work, and image onloads tend to land in
  // bursts — preparing each sprite the moment it arrives froze the first
  // render for seconds. Instead loads feed a queue that a budgeted pump
  // drains a few ms per frame, so sprites stream in without jank.
  const prepQueue = [];
  let pumping = false;
  // rAF aligns the work to frames, but it stops entirely in background /
  // headless tabs — the timeout keeps the queue draining there. Whichever
  // fires first cancels the other.
  function schedulePump() {
    const raf = requestAnimationFrame(run);
    const tmo = setTimeout(run, 40);
    function run() {
      cancelAnimationFrame(raf); clearTimeout(tmo);
      pump();
    }
  }
  function pump() {
    const t0 = performance.now();
    while (prepQueue.length && performance.now() - t0 < 10) {
      const { key, image, ent } = prepQueue.shift();
      try {
        prepCache.set(key, prepare(image, ent));
      } catch (e) {
        // a bad asset must never stall the rest of the pipeline
        console.warn('GFX prepare failed:', key, e);
        prepCache.set(key, false);
      }
    }
    if (prepQueue.length) schedulePump();
    else pumping = false;
  }
  function enqueuePrepare(key, image, ent) {
    prepQueue.push({ key, image, ent });
    if (!pumping) { pumping = true; schedulePump(); }
  }

  const GFX = {
    ASSETS,

    // Prepared sprite canvas for a key, or null while loading / missing.
    img(key) {
      if (prepCache.has(key)) return prepCache.get(key) || null;
      const ent = norm(key);
      if (!ent) { prepCache.set(key, false); return null; }
      prepCache.set(key, false);                   // claimed; filled on load
      loadImage(ent.path, (image) => enqueuePrepare(key, image, ent));
      return prepCache.get(key) || null;
    },

    has(key) { return !!ASSETS[key]; },
    dims(key) { const i=this.img(key); return i ? [i.width, i.height] : null; },

    // Contain-fit centered inside a w×h box (aspect preserved). → drew?
    draw(ctx, key, cx, cy, w, h) {
      const img = this.img(key);
      if (!img || !img.width || !img.height) return false;
      const s = Math.min(w / img.width, h / img.height);
      const dw = img.width * s, dh = img.height * s;
      ctx.drawImage(img, cx - dw/2, cy - dh/2, dw, dh);
      return true;
    },

    // Bottom-center anchored at baseY, scaled to width w (aspect preserved),
    // times the asset's manifest `scale`. Returns the exact drawn rect (a
    // truthy object) so callers can register precise hit regions, or false.
    // opts.squash compresses height, opts.dy shifts the base — used as a
    // visual correction while the art is still isometric.
    drawAnchored(ctx, key, cx, baseY, w, opts) {
      const img = this.img(key);
      if (!img || !img.width || !img.height) return false;
      const ent = ASSETS[key];
      if (ent && typeof ent === 'object' && ent.scale) w *= ent.scale;
      const h = w * (img.height / img.width) * ((opts && opts.squash) || 1);
      const x = cx - w/2, y = baseY - h + ((opts && opts.dy) || 0);
      ctx.drawImage(img, x, y, w, h);
      return { x, y, w, h };
    },

    // Pixel-precision hit test: is the sprite opaque at (u,v) ∈ [0,1]²?
    // Used by reverse-depth click picking so transparent corners of a
    // bounding rect never steal a tap from the sprite behind them.
    alphaAt(key, u, v) {
      const img = this.img(key);
      if (!img) return false;
      const px = Math.min(img.width-1,  Math.max(0, Math.floor(u * img.width)));
      const py = Math.min(img.height-1, Math.max(0, Math.floor(v * img.height)));
      if (!this._probe) {
        this._probe = document.createElement('canvas');
        this._probe.width = this._probe.height = 1;
        this._probeCtx = this._probe.getContext('2d', { willReadFrequently: true });
      }
      this._probeCtx.clearRect(0, 0, 1, 1);
      this._probeCtx.drawImage(img, px, py, 1, 1, 0, 0, 1, 1);
      return this._probeCtx.getImageData(0, 0, 1, 1).data[3] > 40;
    },

    // Stretch-blit to fill an exact rect (floor diamonds, backdrop, patch).
    tile(ctx, key, x, y, w, h) {
      const img = this.img(key);
      if (!img) return false;
      ctx.drawImage(img, x, y, w, h);
      return true;
    },

    preload() { for (const k in ASSETS) this.img(k); },
  };

  window.GFX = GFX;
})();
