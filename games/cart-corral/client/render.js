/** Canvas renderer for Cart Corral. Everything is drawn with local vector art. */

import { WORLD, CART_RADIUS } from './physics.js';

export const CANVAS_W = 720;
export const CANVAS_H = 1000;

const ASPHALT = '#18242a';
const LINE = 'rgba(224, 232, 208, 0.44)';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function createRenderState(player) {
  return {
    camera: {
      x: clamp(player.x - CANVAS_W / 2, 0, WORLD.width - CANVAS_W),
      y: clamp(player.y - CANVAS_H / 2, 0, WORLD.height - CANVAS_H),
    },
    shake: 0,
    time: 0,
    particles: [],
    floaters: [],
  };
}

export function addEventEffect(view, event, label = '') {
  const x = Number.isFinite(event.x) ? event.x : null;
  const y = Number.isFinite(event.y) ? event.y : null;
  if (event.type === 'hit') {
    view.shake = Math.max(view.shake, 9);
    burst(view, x, y, 16, ['#ff6b72', '#ffd166'], 155);
  } else if (event.type === 'deliver') {
    burst(view, x, y, 18, ['#68f0a8', '#7ee8ff', '#fff2a6'], 115);
  } else if (event.type === 'grab') {
    burst(view, x, y, 8, ['#7ee8ff', '#d9fbff'], 65);
  } else if (event.type === 'release') {
    burst(view, x, y, 7, ['#ffd166', '#fff2a6'], 55);
  } else if (event.type === 'win') {
    for (let i = 0; i < 72; i += 1) {
      view.particles.push({
        x: Math.random() * WORLD.width,
        y: 80 + Math.random() * 220,
        vx: (Math.random() - 0.5) * 80,
        vy: 45 + Math.random() * 125,
        life: 2.2 + Math.random(),
        maxLife: 3.2,
        size: 4 + Math.random() * 5,
        color: ['#68f0a8', '#7ee8ff', '#ffd166', '#ff7eb6'][i % 4],
        shape: 'confetti',
      });
    }
  }
  if (label && x != null && y != null) {
    view.floaters.push({ x, y: y - 30, text: label, life: 1.25, maxLife: 1.25, type: event.type });
  }
}

function burst(view, x, y, count, colors, speed) {
  if (x == null || y == null) return;
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    view.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.4 + Math.random() * 0.45,
      maxLife: 0.85,
      size: 2 + Math.random() * 4,
      color: colors[i % colors.length],
      shape: 'spark',
    });
  }
}

export function updateRenderState(view, sim, dt) {
  view.time += dt;
  const tx = clamp(sim.player.x - CANVAS_W / 2, 0, WORLD.width - CANVAS_W);
  const ty = clamp(sim.player.y - CANVAS_H / 2, 0, WORLD.height - CANVAS_H);
  const follow = 1 - Math.exp(-dt * 7);
  view.camera.x += (tx - view.camera.x) * follow;
  view.camera.y += (ty - view.camera.y) * follow;
  view.shake = Math.max(0, view.shake - dt * 24);

  for (let i = view.particles.length - 1; i >= 0; i -= 1) {
    const p = view.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.shape === 'confetti' ? 65 : 24) * dt;
    p.vx *= Math.exp(-dt * 1.6);
    if (p.life <= 0) view.particles.splice(i, 1);
  }
  for (let i = view.floaters.length - 1; i >= 0; i -= 1) {
    const f = view.floaters[i];
    f.life -= dt;
    f.y -= 18 * dt;
    if (f.life <= 0) view.floaters.splice(i, 1);
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function withWorld(ctx, view, fn) {
  const mag = view.shake;
  const sx = mag ? (Math.random() - 0.5) * mag : 0;
  const sy = mag ? (Math.random() - 0.5) * mag : 0;
  ctx.save();
  ctx.translate(-view.camera.x + sx, -view.camera.y + sy);
  fn();
  ctx.restore();
}

function drawGround(ctx, layout, view, dropLabel) {
  ctx.fillStyle = ASPHALT;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  // Subtle aggregate specks are fixed in world space, so the surface does not
  // shimmer when the camera moves.
  ctx.fillStyle = 'rgba(160, 188, 181, 0.085)';
  for (let y = 34; y < WORLD.height; y += 47) {
    for (let x = 22 + ((y / 47) % 2) * 17; x < WORLD.width; x += 61) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  ctx.strokeStyle = 'rgba(70, 94, 94, 0.34)';
  ctx.lineWidth = 3;
  const cracks = [
    [52, 570, 220, 548, 278, 584], [932, 574, 1060, 598, 1170, 575],
    [643, 944, 704, 919, 786, 948], [1090, 1197, 1188, 1218, 1296, 1192],
  ];
  for (const c of cracks) {
    ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[2], c[3]); ctx.lineTo(c[4], c[5]); ctx.stroke();
  }

  drawStore(ctx, layout.store);
  drawParkingMarks(ctx, layout);
  drawDriveArrows(ctx);
  drawDropZone(ctx, layout.dropZone, view.time, dropLabel);
}

function drawStore(ctx, store) {
  ctx.fillStyle = '#303b40';
  ctx.fillRect(store.x, store.y, store.w, store.h);
  ctx.fillStyle = '#e6d9b2';
  ctx.fillRect(store.x, store.y + store.h - 16, store.w, 16);
  for (let x = 24; x < store.w; x += 112) {
    ctx.fillStyle = (x / 112) % 2 < 1 ? '#d95f64' : '#f2e8c8';
    ctx.fillRect(x, store.y + store.h - 31, 76, 15);
  }
  roundedRect(ctx, 616, 20, 208, 45, 9);
  ctx.fillStyle = '#142026'; ctx.fill();
  ctx.strokeStyle = '#7ee8ff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#f3faf6';
  ctx.font = '800 26px Montserrat, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NIGHT MART', 720, 43);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(0, store.h, WORLD.width, 34);
}

function drawParkingMarks(ctx, layout) {
  ctx.save();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  for (const car of layout.cars) {
    const padX = car.w > car.h ? 12 : 9;
    const padY = car.h > car.w ? 12 : 9;
    ctx.strokeRect(car.x - padX, car.y - padY, car.w + padX * 2, car.h + padY * 2);
  }
  ctx.setLineDash([28, 22]);
  ctx.strokeStyle = 'rgba(238, 226, 164, .24)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(20, 610); ctx.lineTo(WORLD.width - 20, 610); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, 997); ctx.lineTo(WORLD.width - 20, 997); ctx.stroke();
  ctx.restore();
}

function drawDriveArrows(ctx) {
  const arrows = [[720, 548, -Math.PI / 2], [720, 962, -Math.PI / 2], [64, 610, 0], [1376, 610, Math.PI]];
  ctx.save();
  ctx.fillStyle = 'rgba(225, 232, 207, .32)';
  for (const [x, y, a] of arrows) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(17, 3); ctx.lineTo(7, 3); ctx.lineTo(7, 21); ctx.lineTo(-7, 21); ctx.lineTo(-7, 3); ctx.lineTo(-17, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawDropZone(ctx, zone, time, label) {
  ctx.save();
  ctx.fillStyle = 'rgba(70, 230, 143, .16)';
  ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
  ctx.strokeStyle = '#64ef9e';
  ctx.lineWidth = 7;
  ctx.setLineDash([24, 13]);
  ctx.lineDashOffset = -time * 22;
  ctx.strokeRect(zone.x + 4, zone.y + 4, zone.w - 8, zone.h - 8);
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = '#d9ffe7';
  ctx.lineWidth = 2;
  for (let x = zone.x + 34; x < zone.x + zone.w; x += 54) {
    ctx.beginPath(); ctx.moveTo(x, zone.y + 14); ctx.lineTo(x - 38, zone.y + zone.h - 14); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#c9ffe0';
  ctx.font = '800 18px Montserrat, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label || 'CART RETURN', zone.x + zone.w / 2, zone.y + zone.h / 2);
  ctx.restore();
}

function drawCar(ctx, car) {
  const horizontal = car.w > car.h;
  const cx = car.x + car.w / 2;
  const cy = car.y + car.h / 2;
  const w = horizontal ? car.w : car.h;
  const h = horizontal ? car.h : car.w;
  let angle = horizontal ? 0 : Math.PI / 2;
  if (car.facing === 'west' || car.facing === 'north') angle += Math.PI;

  ctx.save();
  ctx.translate(cx + 5, cy + 7); ctx.rotate(angle);
  roundedRect(ctx, -w / 2, -h / 2, w, h, 19);
  ctx.fillStyle = 'rgba(0,0,0,.36)'; ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(angle);
  roundedRect(ctx, -w / 2, -h / 2, w, h, 19);
  ctx.fillStyle = car.color; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.23)'; ctx.lineWidth = 2; ctx.stroke();

  roundedRect(ctx, -w * 0.19, -h * 0.39, w * 0.43, h * 0.78, 12);
  ctx.fillStyle = 'rgba(13, 31, 42, .78)'; ctx.fill();
  ctx.strokeStyle = 'rgba(210, 242, 248, .3)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(194, 232, 241, .36)';
  ctx.fillRect(w * 0.29, -h * 0.31, 5, h * 0.24);
  ctx.fillRect(w * 0.29, h * 0.07, 5, h * 0.24);
  ctx.fillStyle = '#fff4c4';
  ctx.fillRect(w / 2 - 7, -h * 0.32, 4, 12);
  ctx.fillRect(w / 2 - 7, h * 0.2, 4, 12);
  ctx.fillStyle = '#7e1724';
  ctx.fillRect(-w / 2 + 3, -h * 0.32, 4, 12);
  ctx.fillRect(-w / 2 + 3, h * 0.2, 4, 12);
  ctx.restore();
}

function drawLinks(ctx, sim) {
  if (!sim.attached?.length) return;
  const byId = new Map(sim.carts.map((c) => [c.id, c]));
  let from = sim.player;
  ctx.save();
  ctx.strokeStyle = 'rgba(126, 232, 255, .65)';
  ctx.lineWidth = 4;
  ctx.setLineDash([7, 7]);
  for (const id of sim.attached) {
    const cart = byId.get(id);
    if (!cart || cart.status !== 'attached') continue;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(cart.x, cart.y); ctx.stroke();
    from = cart;
  }
  ctx.restore();
}

function drawCart(ctx, cart, time) {
  const speed = Math.hypot(cart.vx || 0, cart.vy || 0);
  const angle = speed > 5 ? Math.atan2(cart.vy, cart.vx) : (cart.angle || 0);
  const delivered = cart.status === 'delivered';
  ctx.save();
  ctx.translate(cart.x + 3, cart.y + 5); ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath(); ctx.ellipse(0, 0, 24, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cart.x, cart.y + (delivered ? Math.sin(time * 2 + cart.x) * 0.4 : 0));
  ctx.rotate(angle);
  ctx.strokeStyle = delivered ? '#68f0a8' : (cart.status === 'attached' ? '#7ee8ff' : '#f2e6aa');
  ctx.fillStyle = delivered ? 'rgba(80,225,145,.20)' : 'rgba(210,225,215,.18)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-15, -12); ctx.lineTo(10, -9); ctx.lineTo(15, 9); ctx.lineTo(-11, 12); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.5;
  for (let x = -8; x <= 7; x += 7) { ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x + 2, 10); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-16, -13); ctx.lineTo(-22, -17); ctx.lineTo(-24, -12); ctx.stroke();
  ctx.fillStyle = '#0f171a';
  for (const [x, y] of [[-9, -14], [-7, 14], [11, -11], [14, 11]]) {
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawPlayer(ctx, player, elapsed) {
  const speed = Math.hypot(player.vx || 0, player.vy || 0);
  const a = Number.isFinite(player.facing) ? player.facing : -Math.PI / 2;
  const walk = Math.sin(elapsed * (5 + speed * 0.045)) * Math.min(1, speed / 60);
  ctx.save();
  ctx.translate(player.x + 4, player.y + 7);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(player.x, player.y); ctx.rotate(a);
  ctx.strokeStyle = '#172329'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-9, 3); ctx.lineTo(-14, 15 + walk * 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, 3); ctx.lineTo(14, 15 - walk * 5); ctx.stroke();
  ctx.fillStyle = '#ff9f43';
  roundedRect(ctx, -17, -17, 34, 36, 12); ctx.fill();
  ctx.fillStyle = '#e8f3ec';
  ctx.fillRect(-4, -16, 8, 33);
  ctx.strokeStyle = '#f0b184'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-15, -8); ctx.lineTo(-24, 2 - walk * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(15, -8); ctx.lineTo(24, 2 + walk * 2); ctx.stroke();
  ctx.fillStyle = '#d49a70';
  ctx.beginPath(); ctx.arc(0, -21, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#26343a';
  ctx.beginPath(); ctx.arc(0, -24, 11, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(5, -24, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawEffects(ctx, view) {
  for (const p of view.particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = p.color;
    if (p.shape === 'confetti') {
      ctx.translate(p.x, p.y); ctx.rotate((p.life * 7) % Math.PI); ctx.fillRect(-p.size, -2, p.size * 2, 4);
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  for (const f of view.floaters) {
    const alpha = clamp(f.life / f.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha * 2.2);
    ctx.fillStyle = f.type === 'hit' ? '#ff7c82' : (f.type === 'deliver' ? '#78f0aa' : '#d9faff');
    ctx.font = '800 20px Montserrat, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 6;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

function screenPoint(view, x, y) { return { x: x - view.camera.x, y: y - view.camera.y }; }

function drawEdgeIndicator(ctx, view, target, color, glyph, avoidBottom = true) {
  const p = screenPoint(view, target.x, target.y);
  const top = 38;
  const bottom = avoidBottom ? CANVAS_H - 205 : CANVAS_H - 42;
  const margin = 42;
  if (p.x >= margin && p.x <= CANVAS_W - margin && p.y >= top && p.y <= bottom) return;
  const center = { x: CANVAS_W / 2, y: (top + bottom) / 2 };
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  const scale = Math.min(
    Math.abs(dx) > 0.001 ? (CANVAS_W / 2 - margin) / Math.abs(dx) : Infinity,
    Math.abs(dy) > 0.001 ? ((bottom - top) / 2 - 8) / Math.abs(dy) : Infinity,
  );
  const x = center.x + dx * scale;
  const y = center.y + dy * scale;
  const angle = Math.atan2(dy, dx);
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(6,13,18,.78)'; ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.rotate(angle);
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(14, -7); ctx.lineTo(14, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#f5fff9'; ctx.font = '700 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(glyph, 0, 1);
  ctx.restore();
}

function drawMinimap(ctx, sim, layout) {
  const w = 128, h = 108;
  const x = CANVAS_W - w - 12, y = 112;
  const sx = (w - 12) / WORLD.width, sy = (h - 12) / WORLD.height;
  ctx.save();
  roundedRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = 'rgba(5, 12, 16, .78)'; ctx.fill();
  ctx.strokeStyle = 'rgba(126,232,255,.38)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.translate(x + 6, y + 6);
  ctx.fillStyle = 'rgba(90,238,151,.45)';
  ctx.fillRect(layout.dropZone.x * sx, layout.dropZone.y * sy, layout.dropZone.w * sx, layout.dropZone.h * sy);
  ctx.fillStyle = 'rgba(210,220,220,.25)';
  for (const car of layout.cars) ctx.fillRect(car.x * sx, car.y * sy, Math.max(2, car.w * sx), Math.max(2, car.h * sy));
  for (const cart of sim.carts) {
    if (cart.status === 'delivered') continue;
    ctx.fillStyle = cart.status === 'attached' ? '#7ee8ff' : '#f4dc78';
    ctx.beginPath(); ctx.arc(cart.x * sx, cart.y * sy, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ff9f43';
  ctx.beginPath(); ctx.arc(sim.player.x * sx, sim.player.y * sy, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawFrame(ctx, sim, layout, view, options = {}) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.direction = 'ltr';

  withWorld(ctx, view, () => {
    drawGround(ctx, layout, view, options.dropLabel);
    for (const car of layout.cars) drawCar(ctx, car);
    drawLinks(ctx, sim);
    for (const cart of sim.carts) drawCart(ctx, cart, view.time);
    drawPlayer(ctx, sim.player, sim.elapsed || view.time);
    drawEffects(ctx, view);
  });

  const dropCenter = {
    x: layout.dropZone.x + layout.dropZone.w / 2,
    y: layout.dropZone.y + layout.dropZone.h / 2,
  };
  drawEdgeIndicator(ctx, view, dropCenter, '#68f0a8', '⌂');
  const free = sim.carts
    .filter((cart) => cart.status === 'free')
    .sort((a, b) => Math.hypot(a.x - sim.player.x, a.y - sim.player.y) - Math.hypot(b.x - sim.player.x, b.y - sim.player.y))[0];
  if (free) drawEdgeIndicator(ctx, view, free, '#f3dc76', '🛒');
  drawMinimap(ctx, sim, layout);

  const vignette = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.25, CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.25)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (options.paused) {
    ctx.fillStyle = 'rgba(4,10,14,.34)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  ctx.restore();
}

/** Useful for headless/browser checks of visual targeting math. */
export const RENDER_CONSTANTS = Object.freeze({ CANVAS_W, CANVAS_H, CART_RADIUS });
