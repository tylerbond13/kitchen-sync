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
  function prepare(img, ent) {
    const crop = ent.crop;
    const sx = crop ? crop[0] : 0, sy = crop ? crop[1] : 0;
    const sw = crop ? crop[2] : (img.naturalWidth  || img.width);
    const sh = crop ? crop[3] : (img.naturalHeight || img.height);
    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
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
      const TOL = 2400; // squared RGB distance — flat AI backgrounds are uniform
      const near = (o) => {
        const dr=px[o]-br, dg=px[o+1]-bg, db=px[o+2]-bb;
        return dr*dr + dg*dg + db*db < TOL;
      };
      const seen = new Uint8Array(sw*sh);
      const stack = [];
      for (let ix=0; ix<sw; ix++) { stack.push(ix, (sh-1)*sw + ix); }
      for (let iy=0; iy<sh; iy++) { stack.push(iy*sw, iy*sw + sw-1); }
      while (stack.length) {
        const i = stack.pop();
        if (seen[i]) continue;
        seen[i] = 1;
        const o = i*4;
        if (!near(o)) continue;
        px[o+3] = 0;
        const ix = i % sw, iy = (i / sw) | 0;
        if (ix > 0)    stack.push(i-1);
        if (ix < sw-1) stack.push(i+1);
        if (iy > 0)    stack.push(i-sw);
        if (iy < sh-1) stack.push(i+sw);
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
    return out;
  }

  const GFX = {
    ASSETS,

    // Prepared sprite canvas for a key, or null while loading / missing.
    img(key) {
      if (prepCache.has(key)) return prepCache.get(key) || null;
      const ent = norm(key);
      if (!ent) { prepCache.set(key, false); return null; }
      prepCache.set(key, false);                   // claimed; filled on load
      loadImage(ent.path, (image) => { prepCache.set(key, prepare(image, ent)); });
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
    drawAnchored(ctx, key, cx, baseY, w) {
      const img = this.img(key);
      if (!img || !img.width || !img.height) return false;
      const ent = ASSETS[key];
      if (ent && typeof ent === 'object' && ent.scale) w *= ent.scale;
      const h = w * img.height / img.width;
      const x = cx - w/2, y = baseY - h;
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
