/**
 * rain.js — continuous falling-raindrop particle system for Storm Warden.
 * Pure data + update/draw functions, no DOM. Two independent depth layers
 * (drawn once behind the village, once in front of it — see game.js's
 * render()) give the scene a "looking through rain" feel instead of rain
 * floating flatly on top of a static backdrop: the back layer is dimmer,
 * shorter and slower; the front layer is brighter, longer and faster, with
 * a matching bit of extra wind drift. Both layers share the same constant
 * wind angle so every drop falls the same consistent diagonal.
 */

const WIND_ANGLE = 0.22; // radians off vertical — a light, consistent slant, not a downpour blowing sideways

function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }

function makeDrop(W, H, layer) {
  const front = layer === 'front';
  return {
    x: randRange(-100, W + 100),
    y: randRange(-40, H),
    len: front ? randRange(16, 26) : randRange(9, 16),
    speed: front ? randRange(780, 1040) : randRange(420, 600),
    alpha: front ? randRange(0.28, 0.5) : randRange(0.12, 0.26),
  };
}

/** Drop count scaled to canvas area, clamped to a band that reads as
 * "steady night rain" without smothering threat/bolt readability — tuned
 * visually, not just derived. */
export function rainCountFor(W, H, layer) {
  const area = Math.max(1, W * H);
  const base = layer === 'front' ? area / 5400 : area / 7600;
  const cap = layer === 'front' ? 170 : 130;
  return Math.max(26, Math.min(cap, Math.round(base)));
}

export function createRainLayer(W, H, count, layer) {
  const drops = [];
  for (let i = 0; i < count; i++) drops.push(makeDrop(W, H, layer));
  return drops;
}

export function updateRain(drops, dt, W, H, layer) {
  const vx = Math.sin(WIND_ANGLE) * (layer === 'front' ? 150 : 90);
  for (const d of drops) {
    d.y += d.speed * dt;
    d.x += vx * dt;
    if (d.y - d.len > H) {
      d.y = randRange(-60, -d.len);
      d.x = randRange(-100, W + 100);
    }
    if (d.x > W + 100) d.x = -100;
  }
}

export function drawRain(ctx, drops, color) {
  const dx = Math.sin(WIND_ANGLE);
  const dy = Math.cos(WIND_ANGLE);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1;
  for (const d of drops) {
    ctx.globalAlpha = d.alpha;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - dx * d.len, d.y - dy * d.len);
    ctx.stroke();
  }
  ctx.restore();
}
