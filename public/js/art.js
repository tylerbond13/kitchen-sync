// KSArt — custom vector art for ingredients whose emoji are ambiguous.
// Single source of geometry, rendered two ways: canvas (kitchen) and inline
// SVG (order tickets). States are drawn, not badged: a chopped patty looks
// chopped, a cooked patty looks grilled.
(function () {
  const C = {
    bunTop: '#F2BD6E', bunBottom: '#E8A857', bunSeed: '#FFF3E2',
    pattyRaw: '#E06A62', pattyRawDark: '#C95650',
    pattyCooked: '#9C5B2E', pattyGrill: '#6E3D1B',
    dough: '#F4E7C8', doughRim: '#E2CFA3',
    tortilla: '#F2D896', tortillaSpot: '#E0BE6E',
  };

  // ---- canvas renderers (x,y = center, size = nominal diameter) ----
  const DRAW = {
    'bun.raw'(ctx, x, y, s) {
      // bottom slice
      ctx.fillStyle = C.bunBottom;
      rr(ctx, x - s * 0.42, y + s * 0.1, s * 0.84, s * 0.22, s * 0.08);
      ctx.fill();
      // top dome
      ctx.fillStyle = C.bunTop;
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.04, s * 0.44, s * 0.3, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      // sesame
      ctx.fillStyle = C.bunSeed;
      for (const [dx, dy] of [[-0.18, -0.14], [0.02, -0.2], [0.2, -0.12]]) {
        ctx.beginPath();
        ctx.ellipse(x + dx * s, y + dy * s, s * 0.035, s * 0.05, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    'patty.raw'(ctx, x, y, s) {
      ctx.fillStyle = C.pattyRaw;
      rr(ctx, x - s * 0.42, y - s * 0.2, s * 0.84, s * 0.4, s * 0.16);
      ctx.fill();
      ctx.fillStyle = C.pattyRawDark;
      for (const [dx, dy] of [[-0.2, -0.04], [0.05, 0.06], [0.22, -0.06]]) {
        ctx.beginPath();
        ctx.arc(x + dx * s, y + dy * s, s * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    'patty.chopped'(ctx, x, y, s) {
      ctx.fillStyle = C.pattyRaw;
      rr(ctx, x - s * 0.45, y - s * 0.18, s * 0.4, s * 0.36, s * 0.13);
      ctx.fill();
      rr(ctx, x + 0.05 * s, y - s * 0.18, s * 0.4, s * 0.36, s * 0.13);
      ctx.fill();
      ctx.fillStyle = C.pattyRawDark;
      ctx.beginPath();
      ctx.arc(x - s * 0.25, y, s * 0.04, 0, Math.PI * 2);
      ctx.arc(x + s * 0.25, y, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
    },
    'patty.cooked'(ctx, x, y, s) {
      ctx.fillStyle = C.pattyCooked;
      rr(ctx, x - s * 0.42, y - s * 0.2, s * 0.84, s * 0.4, s * 0.16);
      ctx.fill();
      ctx.strokeStyle = C.pattyGrill;
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      for (const dx of [-0.2, 0, 0.2]) {
        ctx.beginPath();
        ctx.moveTo(x + dx * s - s * 0.06, y - s * 0.12);
        ctx.lineTo(x + dx * s + s * 0.06, y + s * 0.12);
        ctx.stroke();
      }
    },
    'dough.raw'(ctx, x, y, s) {
      ctx.fillStyle = C.doughRim;
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.04, s * 0.44, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.dough;
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.44, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    'tortilla.raw'(ctx, x, y, s) {
      ctx.fillStyle = C.tortilla;
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.46, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.tortillaSpot;
      for (const [dx, dy] of [[-0.2, -0.05], [0.08, 0.08], [0.22, -0.08], [-0.02, -0.12]]) {
        ctx.beginPath();
        ctx.arc(x + dx * s, y + dy * s, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  // ---- inline SVG twins (32x32 viewBox) for DOM tickets ----
  const SVGS = {
    'bun.raw': `<rect x="3" y="18" width="26" height="7" rx="3" fill="${C.bunBottom}"/><path d="M2 18 a14 10 0 0 1 28 0 z" fill="${C.bunTop}"/><ellipse cx="11" cy="11" rx="1.2" ry="1.7" fill="${C.bunSeed}"/><ellipse cx="16" cy="9.4" rx="1.2" ry="1.7" fill="${C.bunSeed}"/><ellipse cx="21" cy="11" rx="1.2" ry="1.7" fill="${C.bunSeed}"/>`,
    'patty.raw': `<rect x="3" y="10" width="26" height="12" rx="5" fill="${C.pattyRaw}"/><circle cx="10" cy="15" r="1.4" fill="${C.pattyRawDark}"/><circle cx="17" cy="18" r="1.4" fill="${C.pattyRawDark}"/><circle cx="23" cy="14" r="1.4" fill="${C.pattyRawDark}"/>`,
    'patty.chopped': `<rect x="2" y="11" width="12" height="11" rx="4" fill="${C.pattyRaw}"/><rect x="18" y="11" width="12" height="11" rx="4" fill="${C.pattyRaw}"/><circle cx="8" cy="16" r="1.2" fill="${C.pattyRawDark}"/><circle cx="24" cy="16" r="1.2" fill="${C.pattyRawDark}"/>`,
    'patty.cooked': `<rect x="3" y="10" width="26" height="12" rx="5" fill="${C.pattyCooked}"/><path d="M9 12 l3 8 M15 12 l3 8 M21 12 l3 8" stroke="${C.pattyGrill}" stroke-width="1.6" stroke-linecap="round"/>`,
    'dough.raw': `<ellipse cx="16" cy="18" rx="13" ry="9" fill="${C.doughRim}"/><ellipse cx="16" cy="16" rx="13" ry="9" fill="${C.dough}"/>`,
    'tortilla.raw': `<ellipse cx="16" cy="16" rx="14" ry="9" fill="${C.tortilla}"/><circle cx="10" cy="14" r="1.3" fill="${C.tortillaSpot}"/><circle cx="18" cy="19" r="1.3" fill="${C.tortillaSpot}"/><circle cx="23" cy="13" r="1.3" fill="${C.tortillaSpot}"/>`,
  };

  function keyOf(item) {
    if (!item || item.kind === 'plate' || item.kind === 'stack' || item.kind === 'dish') return null;
    return `${item.id}.${item.state}`;
  }

  window.KSArt = {
    canDraw(item) {
      const k = keyOf(item);
      return !!(k && DRAW[k]);
    },
    draw(ctx, item, x, y, size) {
      const k = keyOf(item);
      if (k && DRAW[k]) DRAW[k](ctx, x, y, size);
    },
    svg(token) {
      const body = SVGS[token];
      if (!body) return null;
      return `<svg viewBox="0 0 32 32" class="art">${body}</svg>`;
    },
  };
})();
