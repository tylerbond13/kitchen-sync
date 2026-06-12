// Illustrated customer characters — Cake Mania art style
// Each character uses bezier curves, layered shading, and organic shapes.
// No rectangles. No plain circles. Real cartoon anatomy.
// Drop in real PNG sprites via KSAssets to replace any character.

(function () {

  // ── Shared drawing utilities ────────────────────────────────────────────────

  function sSave(ctx, fn) { ctx.save(); fn(); ctx.restore(); }

  // Draw a filled + stroked bezier path. pathFn(ctx) calls moveTo/bezierCurveTo etc.
  function shape(ctx, pathFn, fill, strokeCol, sw) {
    ctx.beginPath(); pathFn(ctx);
    if (fill)      { ctx.fillStyle   = fill;      ctx.fill();   }
    if (strokeCol) { ctx.strokeStyle = strokeCol; ctx.lineWidth = sw ?? 1.8; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke(); }
  }

  // Organic head shape (slightly squashed, jawline, chin) instead of a circle
  function headPath(ctx, cx, cy, rx, ry) {
    ctx.moveTo(cx, cy - ry);
    ctx.bezierCurveTo(cx + rx * 1.05, cy - ry, cx + rx * 1.1, cy - ry * 0.2, cx + rx, cy + ry * 0.25);
    ctx.bezierCurveTo(cx + rx * 0.9, cy + ry * 0.7, cx + rx * 0.55, cy + ry, cx, cy + ry * 1.05);
    ctx.bezierCurveTo(cx - rx * 0.55, cy + ry, cx - rx * 0.9, cy + ry * 0.7, cx - rx, cy + ry * 0.25);
    ctx.bezierCurveTo(cx - rx * 1.1, cy - ry * 0.2, cx - rx * 1.05, cy - ry, cx, cy - ry);
    ctx.closePath();
  }

  // Large anime-style eye — the key to making characters feel alive
  function drawEye(ctx, ex, ey, ew, eh, irisCol, happy, worried) {
    const ol = '#1A0800';
    // White sclera (almond shape)
    shape(ctx, c => {
      c.moveTo(ex - ew * 0.5, ey);
      c.bezierCurveTo(ex - ew * 0.5, ey - eh * 0.9, ex + ew * 0.5, ey - eh * 0.9, ex + ew * 0.5, ey);
      c.bezierCurveTo(ex + ew * 0.5, ey + eh * 0.65, ex - ew * 0.5, ey + eh * 0.65, ex - ew * 0.5, ey);
      c.closePath();
    }, '#fff', ol, 1.4);
    // Iris gradient
    const ig = ctx.createRadialGradient(ex - ew * 0.12, ey - eh * 0.1, eh * 0.06, ex, ey, eh * 0.42);
    ig.addColorStop(0, irisCol === '#3A6A3A' ? '#88CC88' : lighten(irisCol, 0.3));
    ig.addColorStop(0.6, irisCol);
    ig.addColorStop(1, darken(irisCol, 0.3));
    shape(ctx, c => { c.arc(ex, ey, eh * 0.42, 0, Math.PI * 2); }, ig);
    // Pupil
    shape(ctx, c => { c.arc(ex, ey + eh * 0.04, eh * 0.22, 0, Math.PI * 2); }, '#111');
    // Catch-light (two dots)
    shape(ctx, c => { c.arc(ex + ew * 0.14, ey - eh * 0.14, eh * 0.1, 0, Math.PI * 2); }, '#fff');
    shape(ctx, c => { c.arc(ex - ew * 0.08, ey + eh * 0.02, eh * 0.05, 0, Math.PI * 2); }, 'rgba(255,255,255,0.6)');
    // Upper lash line (thick arc)
    shape(ctx, c => {
      c.moveTo(ex - ew * 0.52, ey - eh * 0.05);
      c.bezierCurveTo(ex - ew * 0.3, ey - eh, ex + ew * 0.3, ey - eh, ex + ew * 0.52, ey - eh * 0.05);
    }, null, ol, 2.2);
    // Eyelash fringe (3 short strokes)
    if (!worried) {
      for (let li = -1; li <= 1; li++) {
        shape(ctx, c => {
          const lx = ex + li * ew * 0.22;
          c.moveTo(lx, ey - eh * 0.85);
          c.lineTo(lx + li * ew * 0.05, ey - eh * 1.05);
        }, null, ol, 1.5);
      }
    }
    // Worried: single V eyebrow raised on inner edge
    if (worried) {
      shape(ctx, c => {
        c.moveTo(ex + ew * 0.45, ey - eh * 1.2);
        c.lineTo(ex, ey - eh * 1.55);
        c.lineTo(ex - ew * 0.45, ey - eh * 1.2);
      }, null, ol, 2);
    }
  }

  // Mouth shapes
  function drawMouth(ctx, mx, my, w, urgency) {
    const ol = '#1A0800';
    if (urgency < 0.45) {
      // Wide smile — visible teeth
      shape(ctx, c => {
        c.moveTo(mx - w * 0.5, my - w * 0.1);
        c.bezierCurveTo(mx - w * 0.3, my + w * 0.6, mx + w * 0.3, my + w * 0.6, mx + w * 0.5, my - w * 0.1);
        c.closePath();
      }, '#fff', ol, 1.5);
      shape(ctx, c => {
        c.moveTo(mx - w * 0.5, my - w * 0.1);
        c.bezierCurveTo(mx - w * 0.3, my + w * 0.6, mx + w * 0.3, my + w * 0.6, mx + w * 0.5, my - w * 0.1);
      }, null, ol, 2);
    } else if (urgency < 0.72) {
      // Flat / slight frown
      shape(ctx, c => {
        c.moveTo(mx - w * 0.42, my + w * 0.08);
        c.bezierCurveTo(mx - w * 0.15, my + w * 0.04, mx + w * 0.15, my + w * 0.04, mx + w * 0.42, my - w * 0.08);
      }, null, ol, 2.2);
    } else {
      // Open gasp / panic — oval opening
      shape(ctx, c => { c.ellipse(mx, my + w * 0.1, w * 0.3, w * 0.38, 0, 0, Math.PI * 2); }, '#2A0808', ol, 1.8);
    }
  }

  // Nose — simple soft bump
  function drawNose(ctx, nx, ny, sz) {
    shape(ctx, c => {
      c.moveTo(nx - sz * 0.4, ny + sz * 0.5);
      c.bezierCurveTo(nx - sz * 0.6, ny, nx - sz * 0.4, ny - sz * 0.8, nx, ny - sz * 0.4);
      c.bezierCurveTo(nx + sz * 0.4, ny - sz * 0.8, nx + sz * 0.6, ny, nx + sz * 0.4, ny + sz * 0.5);
    }, null, 'rgba(0,0,0,0.18)', 1.8);
  }

  // Blush ovals
  function blush(ctx, x, y, rx, ry, alpha) {
    sSave(ctx, () => {
      ctx.globalAlpha = alpha ?? 0.38;
      shape(ctx, c => { c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }, '#FF7090');
    });
  }

  // Ground shadow ellipse
  function shadow(ctx, cx, by, rx, ry) {
    sSave(ctx, () => {
      ctx.globalAlpha = 0.2;
      shape(ctx, c => { c.ellipse(cx, by, rx, ry, 0, 0, Math.PI * 2); }, '#000');
    });
  }

  // Heart meter (replaces boring progress bar)
  function drawHeartMeter(ctx, cx, topY, pct, sz) {
    const total = 5;
    const filled = Math.ceil(pct * total);
    const sp = sz * 2.3;
    for (let i = 0; i < total; i++) {
      const hx = cx - (total - 1) * sp / 2 + i * sp;
      const hy = topY;
      const on = i < filled;
      const col = on ? (pct < 0.35 ? '#FF2020' : pct < 0.65 ? '#FF8800' : '#FF4488') : 'rgba(0,0,0,0.18)';
      // Heart bezier
      sSave(ctx, () => {
        ctx.translate(hx, hy); ctx.scale(sz, sz);
        ctx.beginPath();
        ctx.moveTo(0, 0.38);
        ctx.bezierCurveTo(0.02, 0.12, 0.55, -0.25, 0.55, -0.55);
        ctx.bezierCurveTo(0.55, -0.95, 0, -1.05, 0, -0.68);
        ctx.bezierCurveTo(0, -1.05, -0.55, -0.95, -0.55, -0.55);
        ctx.bezierCurveTo(-0.55, -0.25, -0.02, 0.12, 0, 0.38);
        ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
        if (on) {
          ctx.strokeStyle = darken(col, 0.3); ctx.lineWidth = 0.12; ctx.lineJoin = 'round'; ctx.stroke();
          // shine
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath(); ctx.ellipse(-0.15, -0.52, 0.12, 0.07, -0.5, 0, Math.PI * 2); ctx.fill();
        }
      });
    }
  }

  // Speech bubble
  function drawBubble(ctx, cx, tipY, w, h, urgency) {
    const by = tipY - h - w * 0.28;
    const r = h * 0.42;
    const col  = urgency > 0.7 ? '#FF3333' : urgency > 0.42 ? '#FFAA00' : '#FFFDF0';
    const bord = urgency > 0.7 ? '#AA0000' : urgency > 0.42 ? '#AA6600' : '#CCBBA0';
    // shadow
    sSave(ctx, () => {
      ctx.globalAlpha = 0.15;
      shape(ctx, c => { if(c.roundRect) c.roundRect(cx-w/2+3, by+3, w, h, r); else c.rect(cx-w/2+3, by+3, w, h); }, '#000');
    });
    // body
    shape(ctx, c => { if(c.roundRect) c.roundRect(cx-w/2, by, w, h, r); else c.rect(cx-w/2, by, w, h); }, col, bord, 2.2);
    // tail
    shape(ctx, c => {
      c.moveTo(cx - w * 0.14, by + h);
      c.lineTo(cx + w * 0.14, by + h);
      c.lineTo(cx, tipY - 2);
      c.closePath();
    }, col, bord, 1.6);
    return by; // returns top of bubble for emoji placement
  }

  // Archetype name tag
  function drawNameTag(ctx, cx, y, name, col, h) {
    const tw = h * 4.4, th = h * 0.48;
    shape(ctx, c => { if(c.roundRect) c.roundRect(cx-tw/2, y, tw, th, th/2); else c.rect(cx-tw/2, y, tw, th); }, col, '#1A0800', 1.5);
    ctx.font = `800 ${Math.round(th * 0.6)}px ui-rounded,'Nunito',system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(name, cx, y + th * 0.5);
  }

  // Color helpers
  function lighten(hex, amt) { return shiftHex(hex, amt); }
  function darken(hex, amt)  { return shiftHex(hex, -amt); }
  function shiftHex(hex, amt) {
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    const cl = v => Math.min(255, Math.max(0, Math.round(v + amt * 255)));
    return `#${cl(r).toString(16).padStart(2,'0')}${cl(g).toString(16).padStart(2,'0')}${cl(b).toString(16).padStart(2,'0')}`;
  }

  // ── CHARACTER 0: Grandma Rose ────────────────────────────────────────────────
  // White curly bun, round face, big glasses, purple floral dress, sensible heels
  function drawGrandmaRose(ctx, cx, cy, h, urgency, walk) {
    const u = h / 100;
    const ol = '#1A0800';

    shadow(ctx, cx, cy + 46*u, 20*u, 5*u);

    // Shoes — chunky mary-janes with strap
    for (const [sx, flip] of [[cx - 9*u, 1], [cx + 9*u, -1]]) {
      const sw = walk * 4 * flip;
      shape(ctx, c => {
        c.moveTo(sx - 9*u + sw, cy + 41*u);
        c.bezierCurveTo(sx - 10*u + sw, cy + 44*u, sx - 8*u + sw, cy + 48*u, sx + sw, cy + 48*u);
        c.bezierCurveTo(sx + 9*u + sw, cy + 48*u, sx + 11*u + sw, cy + 44*u, sx + 10*u + sw, cy + 41*u);
        c.closePath();
      }, '#4A1060', ol, 1.8);
      // strap
      shape(ctx, c => { c.moveTo(sx - 7*u + sw, cy + 43*u); c.lineTo(sx + 7*u + sw, cy + 43*u); }, null, '#6A2080', 1.2);
    }

    // Stockings (white, slight knee shape)
    for (const [lx, flip] of [[cx - 7*u, 1], [cx + 7*u, -1]]) {
      const lw = walk * 5 * flip;
      shape(ctx, c => {
        c.moveTo(lx - 4*u + lw, cy + 15*u);
        c.bezierCurveTo(lx - 5*u + lw, cy + 28*u, lx - 4*u + lw, cy + 37*u, lx - 4*u + lw, cy + 41*u);
        c.bezierCurveTo(lx + 4*u + lw, cy + 41*u, lx + 5*u + lw, cy + 37*u, lx + 4*u + lw, cy + 28*u);
        c.bezierCurveTo(lx + 5*u + lw, cy + 15*u, lx + 4*u + lw, cy + 15*u, lx - 4*u + lw, cy + 15*u);
        c.closePath();
      }, '#F0EDE8', ol, 1.6);
    }

    // Dress (A-line, layered hem)
    shape(ctx, c => {
      c.moveTo(cx - 10*u, cy - 2*u);  // left shoulder
      c.bezierCurveTo(cx - 16*u, cy + 6*u, cx - 26*u, cy + 22*u, cx - 28*u, cy + 42*u);
      c.bezierCurveTo(cx - 22*u, cy + 44*u, cx - 8*u, cy + 45*u, cx, cy + 45*u);
      c.bezierCurveTo(cx + 8*u, cy + 45*u, cx + 22*u, cy + 44*u, cx + 28*u, cy + 42*u);
      c.bezierCurveTo(cx + 26*u, cy + 22*u, cx + 16*u, cy + 6*u, cx + 10*u, cy - 2*u);
      c.closePath();
    }, '#B040CC', ol, 2.2);
    // Dress highlight sheen
    sSave(ctx, () => {
      ctx.globalAlpha = 0.22;
      shape(ctx, c => {
        c.moveTo(cx - 9*u, cy);
        c.bezierCurveTo(cx - 12*u, cy + 12*u, cx - 14*u, cy + 25*u, cx - 12*u, cy + 40*u);
        c.bezierCurveTo(cx - 4*u, cy + 42*u, cx + 2*u, cy + 40*u, cx + 2*u, cy + 30*u);
        c.bezierCurveTo(cx - 2*u, cy + 15*u, cx - 4*u, cy + 4*u, cx - 9*u, cy);
        c.closePath();
      }, '#FF88EE');
    });
    // Floral dots on dress
    const flowers = [[-14*u, 18*u], [8*u, 20*u], [-4*u, 32*u], [14*u, 30*u], [-18*u, 35*u]];
    for (const [fx, fy] of flowers) {
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        shape(ctx, c => { c.arc(cx + fx + Math.cos(pa)*2.5*u, cy + fy + Math.sin(pa)*2.5*u, 1.8*u, 0, Math.PI*2); }, '#FF88D0');
      }
      shape(ctx, c => { c.arc(cx + fx, cy + fy, 1.5*u, 0, Math.PI*2); }, '#FFD040');
    }
    // Dress collar (white lace)
    shape(ctx, c => {
      c.moveTo(cx - 8*u, cy - 2*u);
      c.bezierCurveTo(cx - 5*u, cy + 4*u, cx - 2*u, cy + 5*u, cx, cy + 4*u);
      c.bezierCurveTo(cx + 2*u, cy + 5*u, cx + 5*u, cy + 4*u, cx + 8*u, cy - 2*u);
    }, null, '#F8F0F8', 2.5);
    // Hem ruffle
    for (let ri = 0; ri < 8; ri++) {
      const rx = cx - 26*u + ri * 7.5*u;
      shape(ctx, c => { c.arc(rx, cy + 44*u, 3.5*u, Math.PI, 0); }, '#D060E8', ol, 1.2);
    }

    // Arms (soft, coming from shoulders)
    for (const [ax, flip] of [[cx - 14*u, 1], [cx + 14*u, -1]]) {
      const aw = -walk * 4 * flip;
      shape(ctx, c => {
        c.moveTo(ax + aw, cy - 1*u);
        c.bezierCurveTo(ax - 5*u * flip + aw, cy + 5*u, ax - 7*u * flip + aw, cy + 14*u, ax - 5*u * flip + aw, cy + 22*u);
        c.bezierCurveTo(ax - 3*u * flip + aw, cy + 24*u, ax + 1*u * flip + aw, cy + 24*u, ax + 3*u * flip + aw, cy + 22*u);
        c.bezierCurveTo(ax + 5*u * flip + aw, cy + 14*u, ax + 3*u * flip + aw, cy + 5*u, ax + aw, cy - 1*u);
        c.closePath();
      }, '#B040CC', ol, 1.8);
      // Tiny hand
      shape(ctx, c => { c.arc(ax - 5*u*flip + aw, cy + 24*u, 3.5*u, 0, Math.PI*2); }, '#F8C888', ol, 1.5);
    }

    // Neck
    shape(ctx, c => {
      c.moveTo(cx - 4*u, cy - 4*u);
      c.bezierCurveTo(cx - 3*u, cy - 8*u, cx + 3*u, cy - 8*u, cx + 4*u, cy - 4*u);
      c.bezierCurveTo(cx + 4*u, cy, cx - 4*u, cy, cx - 4*u, cy - 4*u);
      c.closePath();
    }, '#F8C888', ol, 1.5);

    // Head shape
    shape(ctx, c => headPath(c, cx, cy - 24*u, 16*u, 18*u), '#F8C888', ol, 2.2);

    // White curly bun hair
    // Main bun mass
    shape(ctx, c => {
      c.moveTo(cx - 16*u, cy - 34*u);
      c.bezierCurveTo(cx - 22*u, cy - 50*u, cx - 10*u, cy - 62*u, cx, cy - 62*u);
      c.bezierCurveTo(cx + 10*u, cy - 62*u, cx + 22*u, cy - 50*u, cx + 16*u, cy - 34*u);
      c.bezierCurveTo(cx + 10*u, cy - 30*u, cx - 10*u, cy - 30*u, cx - 16*u, cy - 34*u);
      c.closePath();
    }, '#E8E6E0', ol, 2.0);
    // Curly texture bumps on bun
    const bumps = [[-10*u,-50*u,7*u], [0,-55*u,6*u], [10*u,-50*u,7*u], [-5*u,-42*u,5*u], [5*u,-42*u,5*u]];
    for (const [bx, by2, br] of bumps) {
      shape(ctx, c => { c.arc(cx+bx, cy+by2, br, 0, Math.PI*2); }, '#F0EEE8', '#CCCCBC', 1.0);
    }
    // Side hair wisps
    shape(ctx, c => {
      c.moveTo(cx - 16*u, cy - 34*u);
      c.bezierCurveTo(cx - 20*u, cy - 28*u, cx - 19*u, cy - 20*u, cx - 17*u, cy - 16*u);
      c.bezierCurveTo(cx - 15*u, cy - 20*u, cx - 14*u, cy - 26*u, cx - 13*u, cy - 30*u);
    }, null, '#D8D6D0', 1.5);
    shape(ctx, c => {
      c.moveTo(cx + 16*u, cy - 34*u);
      c.bezierCurveTo(cx + 20*u, cy - 28*u, cx + 19*u, cy - 20*u, cx + 17*u, cy - 16*u);
      c.bezierCurveTo(cx + 15*u, cy - 20*u, cx + 14*u, cy - 26*u, cx + 13*u, cy - 30*u);
    }, null, '#D8D6D0', 1.5);

    // Ears
    for (const [ex2, flip] of [[-1, -1], [1, 1]]) {
      shape(ctx, c => { c.ellipse(cx + flip*16*u, cy-22*u, 4*u, 5.5*u, 0.2*flip, 0, Math.PI*2); }, '#F0B878', ol, 1.5);
      shape(ctx, c => { c.ellipse(cx + flip*16*u, cy-22*u, 2*u, 3*u, 0.2*flip, 0, Math.PI*2); }, '#E8A068');
    }

    // Glasses frames
    for (const [gx2] of [[-7*u], [7*u]]) {
      shape(ctx, c => { c.arc(cx + gx2, cy - 22*u, 6*u, 0, Math.PI*2); }, 'rgba(220,240,255,0.5)', '#6688AA', 1.8);
    }
    shape(ctx, c => { c.moveTo(cx - 1*u, cy - 22*u); c.lineTo(cx + 1*u, cy - 22*u); }, null, '#6688AA', 1.8);
    // temple arms
    shape(ctx, c => { c.moveTo(cx - 13*u, cy - 22*u); c.lineTo(cx - 17*u, cy - 20*u); }, null, '#6688AA', 1.5);
    shape(ctx, c => { c.moveTo(cx + 13*u, cy - 22*u); c.lineTo(cx + 17*u, cy - 20*u); }, null, '#6688AA', 1.5);
    // Pupils inside glasses
    drawEye(ctx, cx - 7*u, cy - 22*u, 8*u, 7*u, '#4460A0', urgency < 0.45, urgency > 0.65);
    drawEye(ctx, cx + 7*u, cy - 22*u, 8*u, 7*u, '#4460A0', urgency < 0.45, urgency > 0.65);

    drawNose(ctx, cx, cy - 16*u, 4*u);
    blush(ctx, cx - 12*u, cy - 14*u, 6*u, 3.5*u, 0.35);
    blush(ctx, cx + 12*u, cy - 14*u, 6*u, 3.5*u, 0.35);
    drawMouth(ctx, cx, cy - 10*u, 9*u, urgency);

    // Pearl necklace
    for (let pi = 0; pi < 9; pi++) {
      const pa = Math.PI * 0.15 + (pi / 8) * Math.PI * 0.7;
      const pr = 12*u;
      shape(ctx, c => { c.arc(cx - Math.cos(pa)*pr, cy - 5*u - Math.sin(pa)*pr*0.35, 1.8*u, 0, Math.PI*2); }, '#F8F4EC', '#BBAA88', 0.8);
    }
  }

  // ── CHARACTER 1: The Influencer ───────────────────────────────────────────────
  // Long flowing pink-streaked hair, trendy crop top, high-waist jeans, platform shoes, phone
  function drawInfluencer(ctx, cx, cy, h, urgency, walk) {
    const u = h / 100;
    const ol = '#1A0800';

    shadow(ctx, cx, cy + 46*u, 18*u, 4.5*u);

    // Platform shoes
    for (const [sx, flip] of [[cx - 8*u, 1], [cx + 8*u, -1]]) {
      const sw = walk * 5 * flip;
      // Platform sole (thick)
      shape(ctx, c => {
        c.moveTo(sx - 9*u + sw, cy + 44*u); c.lineTo(sx + 9*u + sw, cy + 44*u);
        c.lineTo(sx + 9*u + sw, cy + 48*u); c.lineTo(sx - 9*u + sw, cy + 48*u); c.closePath();
      }, '#F0F0F0', ol, 1.5);
      // Shoe upper
      shape(ctx, c => {
        c.moveTo(sx - 9*u + sw, cy + 40*u);
        c.bezierCurveTo(sx - 10*u + sw, cy + 42*u, sx - 9*u + sw, cy + 44*u, sx + 9*u + sw, cy + 44*u);
        c.bezierCurveTo(sx + 10*u + sw, cy + 42*u, sx + 9*u + sw, cy + 40*u, sx - 9*u + sw, cy + 40*u);
        c.closePath();
      }, '#E83880', ol, 1.8);
    }

    // High-waist jeans (skinny)
    for (const [lx, flip] of [[cx - 7*u, 1], [cx + 7*u, -1]]) {
      const lw = walk * 5 * flip;
      shape(ctx, c => {
        c.moveTo(lx - 4*u + lw, cy + 10*u);
        c.bezierCurveTo(lx - 4.5*u + lw, cy + 22*u, lx - 4*u + lw, cy + 32*u, lx - 3.5*u + lw, cy + 40*u);
        c.bezierCurveTo(lx + 4*u + lw, cy + 40*u, lx + 4.5*u + lw, cy + 32*u, lx + 4*u + lw, cy + 22*u);
        c.bezierCurveTo(lx + 4.5*u + lw, cy + 10*u, lx + 4*u + lw, cy + 10*u, lx - 4*u + lw, cy + 10*u);
        c.closePath();
      }, '#3858C0', ol, 1.8);
      // jeans seam
      shape(ctx, c => {
        c.moveTo(lx + lw, cy + 12*u); c.bezierCurveTo(lx + lw, cy + 25*u, lx + lw, cy + 35*u, lx + lw, cy + 40*u);
      }, null, '#5070E0', 1.0);
    }

    // Crop top (short, midriff showing)
    shape(ctx, c => {
      c.moveTo(cx - 11*u, cy + 2*u);
      c.bezierCurveTo(cx - 12*u, cy + 6*u, cx - 11*u, cy + 12*u, cx - 11*u, cy + 12*u);
      c.bezierCurveTo(cx - 5*u, cy + 14*u, cx + 5*u, cy + 14*u, cx + 11*u, cy + 12*u);
      c.bezierCurveTo(cx + 11*u, cy + 12*u, cx + 12*u, cy + 6*u, cx + 11*u, cy + 2*u);
      c.bezierCurveTo(cx + 6*u, cy - 1*u, cx - 6*u, cy - 1*u, cx - 11*u, cy + 2*u);
      c.closePath();
    }, '#FF5090', ol, 2.0);
    // Midriff
    shape(ctx, c => {
      c.moveTo(cx - 8*u, cy + 12*u); c.bezierCurveTo(cx - 5*u, cy + 17*u, cx + 5*u, cy + 17*u, cx + 8*u, cy + 12*u);
    }, null, '#F8C888', 1.2);
    // Belly button
    shape(ctx, c => { c.arc(cx, cy + 15*u, 1.2*u, 0, Math.PI*2); }, null, 'rgba(0,0,0,0.2)', 1.2);

    // Arms (right holds phone)
    for (const [ax, flip] of [[cx - 14*u, 1], [cx + 14*u, -1]]) {
      const aw = -walk * 4 * flip;
      shape(ctx, c => {
        c.moveTo(ax + aw, cy + 2*u);
        c.bezierCurveTo(ax - 5*u*flip + aw, cy + 8*u, ax - 6*u*flip + aw, cy + 16*u, ax - 4*u*flip + aw, cy + 22*u);
        c.bezierCurveTo(ax + 4*u*flip + aw, cy + 22*u, ax + 5*u*flip + aw, cy + 16*u, ax + aw, cy + 2*u);
        c.closePath();
      }, '#F8C888', ol, 1.8);
    }
    // Phone in right hand
    shape(ctx, c => {
      const ph = cx + 19*u - walk * 4*u;
      c.roundRect ? c.roundRect(ph - 4*u, cy + 14*u, 7*u, 11*u, 1.5*u) : c.rect(ph - 4*u, cy + 14*u, 7*u, 11*u);
    }, '#222', ol, 1.5);
    shape(ctx, c => {
      const ph = cx + 19*u - walk * 4*u;
      c.rect(ph - 2.5*u, cy + 15.5*u, 4*u, 7*u);
    }, '#FF88CC');

    // Neck
    shape(ctx, c => {
      c.moveTo(cx - 3.5*u, cy - 2*u); c.lineTo(cx - 3*u, cy - 8*u);
      c.lineTo(cx + 3*u, cy - 8*u); c.lineTo(cx + 3.5*u, cy - 2*u);
      c.bezierCurveTo(cx + 2*u, cy + 2*u, cx - 2*u, cy + 2*u, cx - 3.5*u, cy - 2*u); c.closePath();
    }, '#F8C888', ol, 1.5);

    // Head
    shape(ctx, c => headPath(c, cx, cy - 22*u, 14*u, 17*u), '#FDDBB5', ol, 2.2);

    // Long flowing hair (two layers: back then front)
    // Back layer (darker)
    shape(ctx, c => {
      c.moveTo(cx - 16*u, cy - 30*u);
      c.bezierCurveTo(cx - 25*u, cy - 18*u, cx - 28*u, cy + 5*u, cx - 24*u, cy + 18*u);
      c.bezierCurveTo(cx - 20*u, cy + 22*u, cx - 16*u, cy + 18*u, cx - 14*u, cy + 12*u);
      c.bezierCurveTo(cx - 18*u, cy + 4*u, cx - 18*u, cy - 10*u, cx - 14*u, cy - 22*u);
    }, '#D04070', ol, 1.5);
    shape(ctx, c => {
      c.moveTo(cx + 16*u, cy - 30*u);
      c.bezierCurveTo(cx + 25*u, cy - 18*u, cx + 28*u, cy + 5*u, cx + 24*u, cy + 18*u);
      c.bezierCurveTo(cx + 20*u, cy + 22*u, cx + 16*u, cy + 18*u, cx + 14*u, cy + 12*u);
      c.bezierCurveTo(cx + 18*u, cy + 4*u, cx + 18*u, cy - 10*u, cx + 14*u, cy - 22*u);
    }, '#D04070', ol, 1.5);
    // Top hair mass
    shape(ctx, c => {
      c.moveTo(cx - 15*u, cy - 34*u);
      c.bezierCurveTo(cx - 18*u, cy - 48*u, cx - 8*u, cy - 55*u, cx, cy - 54*u);
      c.bezierCurveTo(cx + 8*u, cy - 55*u, cx + 18*u, cy - 48*u, cx + 15*u, cy - 34*u);
    }, '#E83080', ol, 2.0);
    // Pink highlight streak
    shape(ctx, c => {
      c.moveTo(cx + 4*u, cy - 54*u);
      c.bezierCurveTo(cx + 12*u, cy - 45*u, cx + 18*u, cy - 20*u, cx + 16*u, cy + 5*u);
    }, null, '#FFB0E0', 2.5);
    // Bangs
    shape(ctx, c => {
      c.moveTo(cx - 14*u, cy - 32*u);
      c.bezierCurveTo(cx - 12*u, cy - 24*u, cx - 5*u, cy - 22*u, cx, cy - 24*u);
      c.bezierCurveTo(cx + 5*u, cy - 22*u, cx + 12*u, cy - 24*u, cx + 14*u, cy - 32*u);
    }, null, '#CC2868', 2.0);

    // Sunglasses
    for (const [gx2] of [[-7*u], [7*u]]) {
      shape(ctx, c => { c.rect(cx + gx2 - 6.5*u, cy - 26*u, 13*u, 8*u); }, 'rgba(20,10,40,0.75)', ol, 1.8);
    }
    shape(ctx, c => { c.moveTo(cx - 0.5*u, cy - 24*u); c.lineTo(cx + 0.5*u, cy - 24*u); }, null, ol, 2.0);
    shape(ctx, c => { c.moveTo(cx - 13.5*u, cy - 24*u); c.lineTo(cx - 17*u, cy - 22*u); }, null, ol, 1.5);
    shape(ctx, c => { c.moveTo(cx + 13.5*u, cy - 24*u); c.lineTo(cx + 17*u, cy - 22*u); }, null, ol, 1.5);

    drawNose(ctx, cx, cy - 17*u, 3.5*u);
    blush(ctx, cx - 11*u, cy - 15*u, 5*u, 3*u, 0.28);
    blush(ctx, cx + 11*u, cy - 15*u, 5*u, 3*u, 0.28);
    drawMouth(ctx, cx, cy - 10*u, 9*u, urgency);
    if (urgency < 0.5) {
      // gloss lip sheen
      sSave(ctx, () => {
        ctx.globalAlpha = 0.4;
        shape(ctx, c => { c.ellipse(cx - 2*u, cy - 11.5*u, 4*u, 1.5*u, -0.3, 0, Math.PI*2); }, '#FFE0EE');
      });
    }

    // Ear + earring
    for (const [flip2, ex2] of [[-1, cx-14*u], [1, cx+14*u]]) {
      shape(ctx, c => { c.ellipse(ex2, cy-22*u, 3.5*u, 5*u, 0.2*flip2, 0, Math.PI*2); }, '#F0B070', ol, 1.5);
      // hoop earring
      shape(ctx, c => { c.arc(ex2, cy-18*u, 3*u, 0, Math.PI*2); }, null, '#FFD700', 2.2);
    }
  }

  // ── CHARACTER 2: The Workhorse ────────────────────────────────────────────────
  // Big guy, hard hat, flannel shirt, work boots, calloused hands, patient smile
  function drawWorkhorse(ctx, cx, cy, h, urgency, walk) {
    const u = h / 100;
    const ol = '#1A0800';

    shadow(ctx, cx, cy + 47*u, 24*u, 6*u);

    // Work boots (big, chunky)
    for (const [sx, flip] of [[cx - 10*u, 1], [cx + 10*u, -1]]) {
      const sw = walk * 4 * flip;
      shape(ctx, c => {
        c.moveTo(sx - 11*u + sw, cy + 38*u);
        c.bezierCurveTo(sx - 12*u + sw, cy + 42*u, sx - 11*u + sw, cy + 48*u, sx + 2*u + sw, cy + 48*u);
        c.bezierCurveTo(sx + 13*u + sw, cy + 48*u, sx + 14*u + sw, cy + 44*u, sx + 12*u + sw, cy + 38*u);
        c.closePath();
      }, '#4A2A08', ol, 2.0);
      // boot laces
      for (let li = 0; li < 3; li++) {
        shape(ctx, c => {
          c.moveTo(sx - 5*u + sw, cy + (39 + li*2.5)*u);
          c.lineTo(sx + 5*u + sw, cy + (39 + li*2.5)*u);
        }, null, '#C89050', 1.0);
      }
    }

    // Jeans (thick denim)
    for (const [lx, flip] of [[cx - 9*u, 1], [cx + 9*u, -1]]) {
      const lw = walk * 6 * flip;
      shape(ctx, c => {
        c.moveTo(lx - 5*u + lw, cy + 14*u);
        c.bezierCurveTo(lx - 6*u + lw, cy + 25*u, lx - 5.5*u + lw, cy + 34*u, lx - 5*u + lw, cy + 38*u);
        c.bezierCurveTo(lx + 5*u + lw, cy + 38*u, lx + 6.5*u + lw, cy + 34*u, lx + 5.5*u + lw, cy + 25*u);
        c.bezierCurveTo(lx + 5.5*u + lw, cy + 14*u, lx + 5*u + lw, cy + 14*u, lx - 5*u + lw, cy + 14*u);
        c.closePath();
      }, '#3050A0', ol, 2.0);
    }

    // Big torso — wide flannel shirt
    shape(ctx, c => {
      c.moveTo(cx - 16*u, cy + 3*u);
      c.bezierCurveTo(cx - 18*u, cy + 8*u, cx - 18*u, cy + 18*u, cx - 16*u, cy + 24*u);
      c.bezierCurveTo(cx - 10*u, cy + 26*u, cx + 10*u, cy + 26*u, cx + 16*u, cy + 24*u);
      c.bezierCurveTo(cx + 18*u, cy + 18*u, cx + 18*u, cy + 8*u, cx + 16*u, cy + 3*u);
      c.bezierCurveTo(cx + 10*u, cy - 1*u, cx - 10*u, cy - 1*u, cx - 16*u, cy + 3*u);
      c.closePath();
    }, '#C04020', ol, 2.2);
    // Plaid lines
    for (let pi = 0; pi < 4; pi++) {
      shape(ctx, c => { c.moveTo(cx - 18*u, cy + 4*u + pi*5*u); c.lineTo(cx + 18*u, cy + 4*u + pi*5*u); }, null, '#A03010', 1.0);
      shape(ctx, c => { c.moveTo(cx - 12*u + pi*8*u, cy); c.lineTo(cx - 12*u + pi*8*u, cy + 26*u); }, null, '#A03010', 1.0);
    }
    // Collar
    shape(ctx, c => {
      c.moveTo(cx - 6*u, cy); c.lineTo(cx - 2*u, cy + 6*u); c.lineTo(cx + 2*u, cy + 6*u); c.lineTo(cx + 6*u, cy);
    }, null, '#D06040', 1.8);

    // Big arms
    for (const [ax, flip] of [[cx - 18*u, 1], [cx + 18*u, -1]]) {
      const aw = -walk * 5 * flip;
      shape(ctx, c => {
        c.moveTo(ax + 2*u*flip + aw, cy + 2*u);
        c.bezierCurveTo(ax - 5*u*flip + aw, cy + 8*u, ax - 6*u*flip + aw, cy + 18*u, ax - 4*u*flip + aw, cy + 26*u);
        c.bezierCurveTo(ax + 4*u*flip + aw, cy + 26*u, ax + 6*u*flip + aw, cy + 18*u, ax + 2*u*flip + aw, cy + 2*u);
        c.closePath();
      }, '#C04020', ol, 1.8);
      // Big hand
      shape(ctx, c => { c.arc(ax - 4*u*flip + aw, cy + 27*u, 5*u, 0, Math.PI*2); }, '#E8A868', ol, 1.8);
      // knuckle lines
      shape(ctx, c => {
        c.moveTo(ax - 8*u*flip + aw, cy + 26*u); c.bezierCurveTo(ax - 6*u*flip + aw, cy + 24*u, ax - 2*u*flip + aw, cy + 24*u, ax + 0*u*flip + aw, cy + 26*u);
      }, null, '#C08850', 1.0);
    }

    // Wide neck
    shape(ctx, c => {
      c.moveTo(cx - 6*u, cy - 2*u); c.lineTo(cx - 5*u, cy - 10*u);
      c.lineTo(cx + 5*u, cy - 10*u); c.lineTo(cx + 6*u, cy - 2*u);
      c.bezierCurveTo(cx + 5*u, cy + 2*u, cx - 5*u, cy + 2*u, cx - 6*u, cy - 2*u); c.closePath();
    }, '#E8A868', ol, 1.8);

    // Big square-jawed head
    shape(ctx, c => {
      c.moveTo(cx, cy - 40*u);
      c.bezierCurveTo(cx + 18*u, cy - 40*u, cx + 20*u, cy - 28*u, cx + 20*u, cy - 20*u);
      c.bezierCurveTo(cx + 20*u, cy - 10*u, cx + 18*u, cy - 2*u, cx + 14*u, cy - 2*u);
      c.bezierCurveTo(cx + 8*u, cy - 1*u, cx - 8*u, cy - 1*u, cx - 14*u, cy - 2*u);
      c.bezierCurveTo(cx - 18*u, cy - 2*u, cx - 20*u, cy - 10*u, cx - 20*u, cy - 20*u);
      c.bezierCurveTo(cx - 20*u, cy - 28*u, cx - 18*u, cy - 40*u, cx, cy - 40*u);
      c.closePath();
    }, '#E8A868', ol, 2.5);

    // Hard hat
    shape(ctx, c => {
      c.moveTo(cx - 22*u, cy - 38*u); c.lineTo(cx + 22*u, cy - 38*u);
      c.bezierCurveTo(cx + 22*u, cy - 40*u, cx + 8*u, cy - 40*u, cx + 8*u, cy - 40*u);
    }, '#FFD700', ol, 2.0);
    shape(ctx, c => {
      c.moveTo(cx - 20*u, cy - 38*u);
      c.bezierCurveTo(cx - 16*u, cy - 50*u, cx + 16*u, cy - 50*u, cx + 20*u, cy - 38*u);
      c.closePath();
    }, '#FFD700', ol, 2.5);
    // Hat brim stripes
    shape(ctx, c => {
      c.moveTo(cx - 2*u, cy - 50*u); c.lineTo(cx - 2*u, cy - 38*u);
      c.moveTo(cx + 2*u, cy - 50*u); c.lineTo(cx + 2*u, cy - 38*u);
    }, null, '#E8C000', 1.2);
    // Ears
    for (const [flip2, ex2] of [[-1, cx-20*u], [1, cx+20*u]]) {
      shape(ctx, c => { c.ellipse(ex2, cy-20*u, 4*u, 5.5*u, 0.1*flip2, 0, Math.PI*2); }, '#D89858', ol, 1.8);
    }

    // Big friendly eyes
    drawEye(ctx, cx - 8*u, cy - 22*u, 9*u, 8*u, '#3A5A18', urgency < 0.4, urgency > 0.6);
    drawEye(ctx, cx + 8*u, cy - 22*u, 9*u, 8*u, '#3A5A18', urgency < 0.4, urgency > 0.6);
    // Thick brows
    shape(ctx, c => {
      c.moveTo(cx - 16*u, cy - 32*u); c.bezierCurveTo(cx - 10*u, cy - 33*u, cx - 4*u, cy - 33*u, cx - 0*u, cy - 31*u);
    }, null, '#5C3810', 2.8);
    shape(ctx, c => {
      c.moveTo(cx + 16*u, cy - 32*u); c.bezierCurveTo(cx + 10*u, cy - 33*u, cx + 4*u, cy - 33*u, cx, cy - 31*u);
    }, null, '#5C3810', 2.8);
    if (urgency > 0.6) {
      shape(ctx, c => {
        c.moveTo(cx - 16*u, cy - 33*u); c.bezierCurveTo(cx - 10*u, cy - 36*u, cx - 4*u, cy - 35*u, cx - 0*u, cy - 33*u);
      }, null, '#5C3810', 2.8);
    }
    // Stubble
    for (let si = 0; si < 18; si++) {
      const sa = (si / 18) * Math.PI * 1.2 + Math.PI * 0.9;
      shape(ctx, c => { c.arc(cx + Math.cos(sa)*14*u, cy - 5*u + Math.sin(sa)*8*u, 1*u, 0, Math.PI*2); }, '#AA7848');
    }
    drawNose(ctx, cx, cy - 14*u, 5.5*u);
    drawMouth(ctx, cx, cy - 6*u, 11*u, urgency);
  }

  // ── CHARACTER 3: The Socialite ────────────────────────────────────────────────
  // Giant elaborate hat, sharp features, pearls, elegant flared gown, long lashes
  function drawSocialite(ctx, cx, cy, h, urgency, walk) {
    const u = h / 100;
    const ol = '#1A0800';

    shadow(ctx, cx, cy + 46*u, 20*u, 5*u);

    // Heels (stiletto)
    for (const [sx, flip] of [[cx - 8*u, 1], [cx + 8*u, -1]]) {
      const sw = walk * 4 * flip;
      // Toe box
      shape(ctx, c => {
        c.moveTo(sx - 8*u + sw, cy + 43*u);
        c.bezierCurveTo(sx - 9*u + sw, cy + 45*u, sx - 8*u + sw, cy + 48*u, sx + 8*u + sw, cy + 48*u);
        c.bezierCurveTo(sx + 10*u + sw, cy + 48*u, sx + 10*u + sw, cy + 44*u, sx + 8*u + sw, cy + 42*u);
        c.closePath();
      }, '#2A1840', ol, 1.8);
      // Stiletto heel
      shape(ctx, c => {
        c.moveTo(sx - 7*u + sw, cy + 43*u); c.lineTo(sx - 8*u + sw, cy + 48*u); c.lineTo(sx - 6*u + sw, cy + 48*u); c.closePath();
      }, '#2A1840', ol, 1.2);
    }

    // Gown (dramatic A-line, flared)
    shape(ctx, c => {
      c.moveTo(cx - 12*u, cy + 2*u);
      c.bezierCurveTo(cx - 18*u, cy + 14*u, cx - 32*u, cy + 32*u, cx - 34*u, cy + 46*u);
      c.bezierCurveTo(cx - 28*u, cy + 48*u, cx - 5*u, cy + 49*u, cx, cy + 49*u);
      c.bezierCurveTo(cx + 5*u, cy + 49*u, cx + 28*u, cy + 48*u, cx + 34*u, cy + 46*u);
      c.bezierCurveTo(cx + 32*u, cy + 32*u, cx + 18*u, cy + 14*u, cx + 12*u, cy + 2*u);
      c.closePath();
    }, '#8020A8', ol, 2.2);
    // Gown gradient sheen
    sSave(ctx, () => {
      const gg = ctx.createLinearGradient(cx - 20*u, cy, cx + 10*u, cy + 40*u);
      gg.addColorStop(0, 'rgba(255,255,255,0.20)');
      gg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
      gg.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = gg;
      ctx.beginPath(); headPath(ctx, cx - 5*u, cy + 25*u, 28*u, 24*u); ctx.fill();
    });
    // Gown ruffle hem
    for (let ri = 0; ri < 10; ri++) {
      const rxx = cx - 33*u + ri * 7.2*u;
      shape(ctx, c => { c.arc(rxx, cy + 47*u, 4.5*u, Math.PI, 0); }, '#A030C8', ol, 1.2);
    }
    // Bodice details (vertical seam lines)
    shape(ctx, c => {
      c.moveTo(cx - 5*u, cy + 2*u); c.bezierCurveTo(cx - 6*u, cy + 10*u, cx - 4*u, cy + 18*u, cx - 3*u, cy + 26*u);
    }, null, '#6010A0', 1.2);
    shape(ctx, c => {
      c.moveTo(cx + 5*u, cy + 2*u); c.bezierCurveTo(cx + 6*u, cy + 10*u, cx + 4*u, cy + 18*u, cx + 3*u, cy + 26*u);
    }, null, '#6010A0', 1.2);

    // Long gloved arms
    for (const [ax, flip] of [[cx - 14*u, 1], [cx + 14*u, -1]]) {
      const aw = -walk * 3 * flip;
      shape(ctx, c => {
        c.moveTo(ax + aw, cy + 2*u);
        c.bezierCurveTo(ax - 4*u*flip + aw, cy + 8*u, ax - 5*u*flip + aw, cy + 20*u, ax - 4*u*flip + aw, cy + 28*u);
        c.bezierCurveTo(ax + 4*u*flip + aw, cy + 28*u, ax + 5*u*flip + aw, cy + 20*u, ax + aw, cy + 2*u);
        c.closePath();
      }, '#5A1880', ol, 1.8);
      // Glove (white, elbow length)
      shape(ctx, c => {
        c.moveTo(ax - 3.5*u*flip + aw, cy + 18*u);
        c.bezierCurveTo(ax - 4*u*flip + aw, cy + 24*u, ax - 3*u*flip + aw, cy + 29*u, ax - 2*u*flip + aw, cy + 30*u);
        c.bezierCurveTo(ax + 2*u*flip + aw, cy + 30*u, ax + 4*u*flip + aw, cy + 25*u, ax + 3.5*u*flip + aw, cy + 18*u);
        c.closePath();
      }, '#F8F4EC', ol, 1.5);
    }

    // Neck
    shape(ctx, c => {
      c.moveTo(cx - 3.5*u, cy - 2*u); c.lineTo(cx - 3*u, cy - 9*u);
      c.lineTo(cx + 3*u, cy - 9*u); c.lineTo(cx + 3.5*u, cy - 2*u);
      c.bezierCurveTo(cx + 2*u, cy + 2*u, cx - 2*u, cy + 2*u, cx - 3.5*u, cy - 2*u); c.closePath();
    }, '#FDDAB0', ol, 1.5);

    // Pearl necklace
    for (let pi = 0; pi < 11; pi++) {
      const pa = Math.PI * 0.1 + (pi / 10) * Math.PI * 0.8;
      shape(ctx, c => { c.arc(cx - Math.cos(pa)*11*u, cy - 5.5*u - Math.sin(pa)*4*u, 2*u, 0, Math.PI*2); }, '#FAF4EA', '#BBAASS0'.replace('S',''), 0.8);
    }

    // Head (longer, more elegant oval)
    shape(ctx, c => {
      c.moveTo(cx, cy - 40*u);
      c.bezierCurveTo(cx + 12*u, cy - 40*u, cx + 13*u, cy - 28*u, cx + 12*u, cy - 16*u);
      c.bezierCurveTo(cx + 10*u, cy - 8*u, cx + 7*u, cy - 3*u, cx, cy - 2*u);
      c.bezierCurveTo(cx - 7*u, cy - 3*u, cx - 10*u, cy - 8*u, cx - 12*u, cy - 16*u);
      c.bezierCurveTo(cx - 13*u, cy - 28*u, cx - 12*u, cy - 40*u, cx, cy - 40*u);
      c.closePath();
    }, '#FDDAB0', ol, 2.2);

    // Giant elaborate hat (the signature element)
    // Brim (huge wide ellipse)
    shape(ctx, c => { c.ellipse(cx + 4*u, cy - 45*u, 30*u, 10*u, -0.18, 0, Math.PI*2); }, '#4A1090', ol, 2.5);
    // Crown (tall)
    shape(ctx, c => {
      c.moveTo(cx - 10*u, cy - 45*u);
      c.bezierCurveTo(cx - 12*u, cy - 58*u, cx - 8*u, cy - 68*u, cx + 2*u, cy - 70*u);
      c.bezierCurveTo(cx + 12*u, cy - 68*u, cx + 16*u, cy - 58*u, cx + 14*u, cy - 45*u);
      c.closePath();
    }, '#6010B8', ol, 2.2);
    // Hat ribbon
    shape(ctx, c => { c.rect(cx - 10*u, cy - 48*u, 24*u, 5*u); }, '#FF88D0', ol, 1.5);
    // Hat feather
    shape(ctx, c => {
      c.moveTo(cx + 14*u, cy - 52*u);
      c.bezierCurveTo(cx + 24*u, cy - 60*u, cx + 30*u, cy - 55*u, cx + 26*u, cy - 48*u);
      c.bezierCurveTo(cx + 22*u, cy - 42*u, cx + 16*u, cy - 44*u, cx + 14*u, cy - 48*u);
    }, '#F0E0FF', '#A060D0', 1.5);
    // Feather veins
    for (let fv = 0; fv < 4; fv++) {
      shape(ctx, c => {
        const t = fv / 3;
        const fx1 = cx + (14 + 10*t)*u, fy1 = cy + (-50 + 5*t)*u;
        c.moveTo(fx1, fy1); c.lineTo(fx1 + 4*u*(1-t), fy1 - 3*u);
      }, null, '#C080E8', 0.8);
    }
    // Hat flower cluster
    for (let pf = 0; pf < 6; pf++) {
      const pfa = (pf / 6) * Math.PI * 2;
      shape(ctx, c => { c.arc(cx - 4*u + Math.cos(pfa)*4*u, cy - 46*u + Math.sin(pfa)*3*u, 2.5*u, 0, Math.PI*2); }, ['#FF88CC','#FFDD88','#88DDFF','#FF8888','#AAFFCC','#DDAAFF'][pf]);
    }

    // Ears
    for (const [flip2, ex3] of [[-1, cx-12*u], [1, cx+12*u]]) {
      shape(ctx, c => { c.ellipse(ex3, cy-22*u, 3.5*u, 5*u, 0.15*flip2, 0, Math.PI*2); }, '#FBBEA0', ol, 1.5);
      // Diamond earring
      shape(ctx, c => {
        c.moveTo(ex3, cy - 17*u); c.lineTo(ex3 + 2.5*u, cy - 14.5*u);
        c.lineTo(ex3, cy - 12*u); c.lineTo(ex3 - 2.5*u, cy - 14.5*u); c.closePath();
      }, '#C8F0FF', '#88CCEE', 1.0);
    }

    // Elegant eyes (heavy lashes)
    drawEye(ctx, cx - 6.5*u, cy - 25*u, 8.5*u, 7.5*u, '#6A1890', urgency < 0.45, urgency > 0.65);
    drawEye(ctx, cx + 6.5*u, cy - 25*u, 8.5*u, 7.5*u, '#6A1890', urgency < 0.45, urgency > 0.65);
    // Arched thin brows
    shape(ctx, c => {
      c.moveTo(cx - 14*u, cy - 35*u); c.bezierCurveTo(cx - 8*u, cy - 37*u, cx - 2*u, cy - 35*u, cx, cy - 34*u);
    }, null, '#5A2060', 1.8);
    shape(ctx, c => {
      c.moveTo(cx + 14*u, cy - 35*u); c.bezierCurveTo(cx + 8*u, cy - 37*u, cx + 2*u, cy - 35*u, cx, cy - 34*u);
    }, null, '#5A2060', 1.8);

    drawNose(ctx, cx, cy - 18*u, 3.5*u);
    blush(ctx, cx - 10*u, cy - 16*u, 5*u, 2.5*u, 0.25);
    blush(ctx, cx + 10*u, cy - 16*u, 5*u, 2.5*u, 0.25);
    drawMouth(ctx, cx, cy - 10*u, 8*u, urgency);
    // Lipstick highlight
    sSave(ctx, () => {
      ctx.globalAlpha = 0.5;
      shape(ctx, c => { c.ellipse(cx - 2*u, cy - 11.5*u, 3*u, 1.2*u, -0.2, 0, Math.PI*2); }, '#FFA0B8');
    });
  }

  // ── CHARACTER 4: The Kid ───────────────────────────────────────────────────────
  // Giant round head, huge eyes, tiny body, pigtails, colorful overalls, gap-tooth
  function drawKid(ctx, cx, cy, h, urgency, walk) {
    const u = h / 100;
    const ol = '#1A0800';

    shadow(ctx, cx, cy + 46*u, 16*u, 4*u);

    // Sneakers (rounded toe, colourful)
    for (const [sx, flip] of [[cx - 7*u, 1], [cx + 7*u, -1]]) {
      const sw = walk * 5 * flip;
      shape(ctx, c => {
        c.moveTo(sx - 8*u + sw, cy + 40*u);
        c.bezierCurveTo(sx - 10*u + sw, cy + 43*u, sx - 9*u + sw, cy + 48*u, sx + 8*u + sw, cy + 48*u);
        c.bezierCurveTo(sx + 11*u + sw, cy + 48*u, cx + 11*u + sw, cy + 43*u, sx + 8*u + sw, cy + 39*u);
        c.closePath();
      }, '#FF5020', ol, 1.8);
      shape(ctx, c => {
        c.moveTo(sx - 8*u + sw, cy + 42*u); c.lineTo(sx + 8*u + sw, cy + 42*u);
      }, null, '#fff', 1.0);
    }

    // Short legs (kid proportion, overalls)
    for (const [lx, flip] of [[cx - 6*u, 1], [cx + 6*u, -1]]) {
      const lw = walk * 5 * flip;
      shape(ctx, c => {
        c.moveTo(lx - 3.5*u + lw, cy + 20*u);
        c.bezierCurveTo(lx - 4*u + lw, cy + 30*u, lx - 3.5*u + lw, cy + 36*u, lx - 3*u + lw, cy + 40*u);
        c.bezierCurveTo(lx + 3*u + lw, cy + 40*u, lx + 4*u + lw, cy + 36*u, lx + 3.5*u + lw, cy + 30*u);
        c.bezierCurveTo(lx + 4*u + lw, cy + 20*u, lx + 3.5*u + lw, cy + 20*u, lx - 3.5*u + lw, cy + 20*u);
        c.closePath();
      }, '#4888E0', ol, 1.8);
    }

    // Overalls bib (short, square)
    shape(ctx, c => {
      c.moveTo(cx - 10*u, cy + 4*u);
      c.bezierCurveTo(cx - 11*u, cy + 8*u, cx - 10.5*u, cy + 18*u, cx - 10*u, cy + 22*u);
      c.bezierCurveTo(cx - 4*u, cy + 24*u, cx + 4*u, cy + 24*u, cx + 10*u, cy + 22*u);
      c.bezierCurveTo(cx + 10.5*u, cy + 18*u, cx + 11*u, cy + 8*u, cx + 10*u, cy + 4*u);
      c.bezierCurveTo(cx + 6*u, cy + 1*u, cx - 6*u, cy + 1*u, cx - 10*u, cy + 4*u);
      c.closePath();
    }, '#4888E0', ol, 2.0);
    // Overall pocket
    shape(ctx, c => {
      if(c.roundRect) c.roundRect(cx - 5*u, cy + 10*u, 10*u, 8*u, 2*u); else c.rect(cx - 5*u, cy + 10*u, 10*u, 8*u);
    }, '#3870C8', ol, 1.2);
    shape(ctx, c => { c.arc(cx, cy + 14*u, 1.5*u, 0, Math.PI*2); }, '#FFD700', ol, 1.0);
    // Shirt showing under bib
    shape(ctx, c => {
      c.moveTo(cx - 7*u, cy + 4*u); c.lineTo(cx - 3*u, cy + 10*u); c.lineTo(cx + 3*u, cy + 10*u); c.lineTo(cx + 7*u, cy + 4*u);
    }, '#FFEE88');
    // Overall straps
    for (const [stx, flip] of [[cx - 4*u, 1], [cx + 4*u, -1]]) {
      shape(ctx, c => {
        c.moveTo(stx, cy + 4*u); c.bezierCurveTo(stx - 2*u*flip, cy - 2*u, stx - 4*u*flip, cy - 5*u, stx - 5*u*flip, cy - 8*u);
      }, null, '#3870C8', 3.0);
      // buckle
      shape(ctx, c => {
        if(c.roundRect) c.roundRect(stx - 6.5*u*flip, cy - 9.5*u, 3*u, 3*u, 0.5*u); else c.rect(stx - 6.5*u*flip, cy - 9.5*u, 3*u, 3*u);
      }, '#FFD700', '#AA8800', 1.0);
    }

    // Chubby arms
    for (const [ax, flip] of [[cx - 12*u, 1], [cx + 12*u, -1]]) {
      const aw = -walk * 4 * flip;
      shape(ctx, c => {
        c.moveTo(ax + 2*u*flip + aw, cy + 4*u);
        c.bezierCurveTo(ax - 4*u*flip + aw, cy + 8*u, ax - 5*u*flip + aw, cy + 15*u, ax - 3*u*flip + aw, cy + 20*u);
        c.bezierCurveTo(ax + 3*u*flip + aw, cy + 20*u, ax + 5*u*flip + aw, cy + 14*u, ax + 2*u*flip + aw, cy + 4*u);
        c.closePath();
      }, '#FFEE88', ol, 1.8);
      // Chubby little hand
      shape(ctx, c => { c.arc(ax - 3*u*flip + aw, cy + 21*u, 4*u, 0, Math.PI*2); }, '#FDDBB5', ol, 1.5);
      // finger lines
      for (let fi = -1; fi <= 1; fi++) {
        shape(ctx, c => { c.moveTo(ax - 3*u*flip + fi*2*u + aw, cy + 20*u); c.lineTo(ax - 3*u*flip + fi*2*u + aw, cy + 25*u); }, null, '#E8B888', 0.8);
      }
    }

    // HUGE round head (kid proportion — 50% of total height!)
    const hh = 24*u; // head half-height
    shape(ctx, c => { c.arc(cx, cy - 22*u, hh, 0, Math.PI*2); }, '#FDDBB5', ol, 2.5);

    // Pigtails (two big puffs)
    for (const [px2, flip] of [[cx - 26*u, -1], [cx + 26*u, 1]]) {
      // Hair tie band
      shape(ctx, c => { c.arc(px2, cy - 36*u, 4*u, 0, Math.PI*2); }, '#FF4488', ol, 1.5);
      // Puff
      shape(ctx, c => {
        c.arc(px2, cy - 44*u, 9*u, 0, Math.PI*2);
      }, '#FF8830', ol, 2.0);
      // Puff highlight
      shape(ctx, c => { c.arc(px2 - flip*2*u, cy - 48*u, 3.5*u, 0, Math.PI*2); }, 'rgba(255,255,255,0.3)');
      // Connecting hair
      shape(ctx, c => {
        c.moveTo(cx + flip*22*u, cy - 30*u);
        c.bezierCurveTo(cx + flip*24*u, cy - 32*u, px2 - flip*5*u, cy - 35*u, px2, cy - 37*u);
      }, null, '#FF8830', 4.0);
    }
    // Front fringe
    shape(ctx, c => {
      c.moveTo(cx - 22*u, cy - 38*u);
      c.bezierCurveTo(cx - 18*u, cy - 30*u, cx - 8*u, cy - 26*u, cx, cy - 28*u);
      c.bezierCurveTo(cx + 8*u, cy - 26*u, cx + 18*u, cy - 30*u, cx + 22*u, cy - 38*u);
    }, null, '#FF8830', 3.5);

    // Ears (chubby)
    for (const [flip2, ex4] of [[-1, cx-24*u], [1, cx+24*u]]) {
      shape(ctx, c => { c.ellipse(ex4, cy-20*u, 5*u, 6.5*u, 0.15*flip2, 0, Math.PI*2); }, '#F0B878', ol, 2.0);
      shape(ctx, c => { c.ellipse(ex4, cy-20*u, 2.5*u, 3.5*u, 0.15*flip2, 0, Math.PI*2); }, '#E8A060');
    }

    // HUGE anime eyes
    drawEye(ctx, cx - 10*u, cy - 22*u, 12*u, 11*u, '#5050D0', urgency < 0.45, urgency > 0.65);
    drawEye(ctx, cx + 10*u, cy - 22*u, 12*u, 11*u, '#5050D0', urgency < 0.45, urgency > 0.65);

    // Freckles (6 dots)
    sSave(ctx, () => {
      ctx.globalAlpha = 0.55;
      for (const [fx2, fy2] of [[-12*u,-8*u],[-9*u,-6*u],[-14*u,-6*u],[12*u,-8*u],[9*u,-6*u],[14*u,-6*u]]) {
        shape(ctx, c => { c.arc(cx+fx2, cy+fy2, 1.5*u, 0, Math.PI*2); }, '#C07030');
      }
    });

    drawNose(ctx, cx, cy - 12*u, 3.5*u);
    blush(ctx, cx - 16*u, cy - 10*u, 7*u, 4*u, 0.38);
    blush(ctx, cx + 16*u, cy - 10*u, 7*u, 4*u, 0.38);

    // Gap-tooth grin / expression
    if (urgency < 0.5) {
      // Big grin with gap tooth
      shape(ctx, c => {
        c.moveTo(cx - 10*u, cy - 4*u);
        c.bezierCurveTo(cx - 5*u, cy + 6*u, cx + 5*u, cy + 6*u, cx + 10*u, cy - 4*u);
        c.closePath();
      }, '#fff', ol, 2.0);
      // Gap
      shape(ctx, c => { c.rect(cx - 1.5*u, cy - 4*u, 3*u, 5*u); }, '#FDDBB5');
    } else if (urgency < 0.72) {
      // Wavy lip
      shape(ctx, c => {
        c.moveTo(cx - 9*u, cy - 2*u);
        c.bezierCurveTo(cx - 4*u, cy + 4*u, cx + 4*u, cy - 4*u, cx + 9*u, cy - 2*u);
      }, null, ol, 2.2);
    } else {
      // Big open cry
      shape(ctx, c => { c.ellipse(cx, cy + 1*u, 6*u, 8*u, 0, 0, Math.PI*2); }, '#2A0808', ol, 2.0);
      // Tears
      for (const tx of [-14*u, 14*u]) {
        shape(ctx, c => {
          c.moveTo(cx + tx, cy - 14*u);
          c.bezierCurveTo(cx + tx - 1*u, cy - 10*u, cx + tx + 1*u, cy - 6*u, cx + tx, cy - 2*u);
        }, null, '#80C8FF', 2.5);
      }
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────────
  const PRESETS = [drawGrandmaRose, drawInfluencer, drawWorkhorse, drawSocialite, drawKid];
  const NAMES   = ['Grandma Rose', 'The Influencer', 'The Workhorse', 'The Socialite', 'The Kid'];
  const COLORS  = ['#9030C0', '#E83080', '#3050A0', '#6010B8', '#4888E0'];

  window.KSCustomers = {
    draw(ctx, cx, cy, h, order, urgency, now, idx) {
      const preset = ((order.id - 1) % 5 + 5) % 5;
      const walk = Math.sin(now / 260 + idx * 2.3) * 0.8;

      // Try sprite asset first, fall back to canvas illustration
      const state = urgency > 0.7 ? 'panicked' : urgency > 0.4 ? 'worried' : 'happy';
      const names = ['grandma_rose', 'influencer', 'workhorse', 'socialite', 'kid'];
      const assetKey = `${names[preset]}_${state}`;
      const img = window.KSAssets?.get(assetKey);
      if (img) {
        ctx.drawImage(img, cx - h * 0.5, cy - h * 0.9, h, h);
      } else {
        PRESETS[preset](ctx, cx, cy, h, urgency, walk);
      }

      // Heart meter above character
      const heartTop = cy - h * 0.72 - h * 0.12;
      drawHeartMeter(ctx, cx, heartTop, 1 - urgency, h * 0.055);

      // Speech bubble
      const bubbleH = h * 0.26;
      const bubbleW = h * 0.48;
      const bubbleTip = cy - h * 0.68;
      const bubbleTop = drawBubble(ctx, cx, bubbleTip, bubbleW, bubbleH, urgency);
      // Dish emoji inside bubble
      ctx.font = `${Math.round(bubbleH * 0.62)}px "Apple Color Emoji","Segoe UI Emoji",system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(order.emoji || '🍽️', cx, bubbleTop + bubbleH * 0.5);

      // Name tag below feet
      drawNameTag(ctx, cx, cy + h * 0.1, NAMES[preset], COLORS[preset], h);
    },
  };
})();
