/**
 * Pulse Race — top-down neon circuit
 * Offline: player + AI. Online-ready via OGHNet (when host /ws exists).
 */
import { OGHShaderBg } from '../../_shared/js/ogh-shader-bg.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHNet } from '../../_shared/js/ogh-net.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sfx = createOghSfx();
const bg = OGHShaderBg.mount(document.getElementById('bg'), { palette: 0 });
bg.start();

const $ = (id) => document.getElementById(id);
const overlay = $('overlay');

const W = canvas.width;
const H = canvas.height;

/** Elliptical track centerline + half-width */
const TRACK = {
  cx: W / 2,
  cy: H / 2 + 10,
  rx: 120,
  ry: 210,
  halfW: 38,
};

const COLORS = ['#5ce1ff', '#ff6bcb', '#5cffb0', '#ffd166'];

const input = {
  left: false,
  right: false,
  gas: false,
  brake: false,
};

const state = {
  running: false,
  finished: false,
  net: null,
  cars: [],
  totalLaps: 3,
  particles: [],
  countdown: 0,
  placeOrder: [],
};

function trackPoint(t) {
  // t in [0,1) clockwise from top
  const a = -Math.PI / 2 + t * Math.PI * 2;
  return {
    x: TRACK.cx + Math.cos(a) * TRACK.rx,
    y: TRACK.cy + Math.sin(a) * TRACK.ry,
    angle: a + Math.PI / 2, // tangent
  };
}

function progressOf(x, y) {
  const dx = (x - TRACK.cx) / TRACK.rx;
  const dy = (y - TRACK.cy) / TRACK.ry;
  let a = Math.atan2(dy, dx);
  // map to [0,1) starting from top (-PI/2)
  let t = (a + Math.PI / 2) / (Math.PI * 2);
  if (t < 0) t += 1;
  return t % 1;
}

function distToCenterline(x, y) {
  // approximate radial error in ellipse normal space
  const dx = (x - TRACK.cx) / TRACK.rx;
  const dy = (y - TRACK.cy) / TRACK.ry;
  const r = Math.hypot(dx, dy);
  // distance in "normalized" units → scale back roughly
  const err = Math.abs(r - 1);
  return err * ((TRACK.rx + TRACK.ry) / 2);
}

function onTrack(x, y) {
  return distToCenterline(x, y) < TRACK.halfW;
}

function makeCar(id, name, color, isPlayer, t0) {
  const p = trackPoint(t0);
  return {
    id,
    name,
    color,
    isPlayer,
    x: p.x,
    y: p.y,
    angle: p.angle,
    speed: 0,
    lap: 0,
    progress: t0,
    lastProgress: t0,
    finished: false,
    place: 0,
    aiSkill: 0.55 + Math.random() * 0.35,
  };
}

function startRace() {
  const aiN = parseInt($('aiCount').value, 10) || 2;
  state.totalLaps = parseInt($('lapCount').value, 10) || 3;
  state.cars = [];
  state.finished = false;
  state.placeOrder = [];
  state.particles = [];

  const slots = [0, 0.04, 0.08, 0.12];
  state.cars.push(makeCar('you', 'YOU', COLORS[0], true, slots[0]));
  for (let i = 0; i < aiN; i++) {
    state.cars.push(
      makeCar(`ai${i}`, `AI-${i + 1}`, COLORS[(i + 1) % COLORS.length], false, slots[i + 1])
    );
  }

  state.countdown = 3.2;
  state.running = true;
  overlay.hidden = true;
  sfx.play('tap');
  updateHud();
}

function carOrderKey(c) {
  if (c.finished) return 1000 + (10 - c.place);
  return c.lap + c.progress;
}

function updatePlaces() {
  const sorted = [...state.cars].sort((a, b) => carOrderKey(b) - carOrderKey(a));
  sorted.forEach((c, i) => {
    if (!c.finished) c.place = i + 1;
  });
}

function updateCar(c, dt) {
  if (c.finished) return;

  let steer = 0;
  let throttle = 0;
  let brake = 0;

  if (c.isPlayer) {
    if (input.left) steer -= 1;
    if (input.right) steer += 1;
    if (input.gas) throttle = 1;
    if (input.brake) brake = 1;
    // publish input for future MP
    state.net?.send('input', { steer, throttle, brake, t: performance.now() });
  } else {
    // AI: aim toward next centerline point slightly ahead
    const look = 0.04 * c.aiSkill + 0.02;
    const targetT = (c.progress + look) % 1;
    const tgt = trackPoint(targetT);
    const desired = Math.atan2(tgt.y - c.y, tgt.x - c.x);
    let diff = desired - c.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    steer = Math.max(-1, Math.min(1, diff * 2.2));
    throttle = onTrack(c.x, c.y) ? 0.85 + c.aiSkill * 0.15 : 0.35;
    if (!onTrack(c.x, c.y)) brake = 0.2;
    // slight wobble
    steer += Math.sin(performance.now() / 400 + c.aiSkill * 10) * 0.08;
  }

  const maxSpeed = c.isPlayer ? 195 : 175 + c.aiSkill * 30;
  const accel = c.isPlayer ? 220 : 200;
  const turnRate = (2.6 + (1 - c.speed / maxSpeed) * 1.4) * (c.isPlayer ? 1 : 0.95);

  c.angle += steer * turnRate * dt;
  if (brake) c.speed *= Math.pow(0.2, dt);
  else if (throttle) c.speed += accel * throttle * dt;
  else c.speed *= Math.pow(0.55, dt);

  c.speed = Math.max(0, Math.min(maxSpeed, c.speed));

  // off-track friction
  if (!onTrack(c.x, c.y)) {
    c.speed *= Math.pow(0.35, dt);
    c.speed = Math.min(c.speed, 70);
  }

  c.x += Math.cos(c.angle) * c.speed * dt;
  c.y += Math.sin(c.angle) * c.speed * dt;

  // soft walls — push back to ellipse ring
  const d = distToCenterline(c.x, c.y);
  if (d > TRACK.halfW + 8) {
    const t = progressOf(c.x, c.y);
    const p = trackPoint(t);
    c.x += (p.x - c.x) * 0.08;
    c.y += (p.y - c.y) * 0.08;
    c.speed *= 0.9;
  }

  // lap detection via progress wrap
  const prog = progressOf(c.x, c.y);
  // crossed start if progress jumped backward a lot while moving forward in race sense
  if (c.lastProgress > 0.75 && prog < 0.25 && c.speed > 20) {
    c.lap += 1;
    if (c.isPlayer) sfx.play('pickup');
    if (c.lap >= state.totalLaps) {
      c.finished = true;
      c.place = state.placeOrder.length + 1;
      state.placeOrder.push(c.id);
      if (c.isPlayer) {
        sfx.play('win');
        state.finished = true;
        setTimeout(showFinish, 400);
      }
    }
  }
  c.lastProgress = prog;
  c.progress = prog;

  if (c.isPlayer && c.speed > 40 && Math.random() < dt * 8) {
    state.particles.push({
      x: c.x - Math.cos(c.angle) * 8,
      y: c.y - Math.sin(c.angle) * 8,
      life: 0.25,
      color: c.color,
    });
  }
}

function showFinish() {
  const you = state.cars.find((c) => c.isPlayer);
  overlay.hidden = false;
  $('netBlurb').textContent =
    you?.finished
      ? `Finished P${you.place} · ${state.net?.mode || 'offline'}`
      : `Race over · ${state.net?.mode || 'offline'}`;
  state.running = false;
}

function updateHud() {
  const you = state.cars.find((c) => c.isPlayer);
  if (!you) return;
  const lapShow = Math.min(state.totalLaps, you.lap + 1);
  $('hudLap').innerHTML = `LAP <strong>${lapShow}</strong>/${state.totalLaps}`;
  $('hudPos').innerHTML = `P<strong>${you.place || 1}</strong>`;
}

function drawTrack() {
  // asphalt ring
  ctx.save();
  ctx.translate(TRACK.cx, TRACK.cy);
  ctx.scale(1, TRACK.ry / TRACK.rx);

  ctx.beginPath();
  ctx.arc(0, 0, TRACK.rx + TRACK.halfW, 0, Math.PI * 2);
  ctx.arc(0, 0, Math.max(8, TRACK.rx - TRACK.halfW), 0, Math.PI * 2, true);
  ctx.fillStyle = '#12162a';
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(92,225,255,0.35)';
  ctx.beginPath();
  ctx.arc(0, 0, TRACK.rx + TRACK.halfW, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, TRACK.rx - TRACK.halfW, 0, Math.PI * 2);
  ctx.stroke();

  // center dashed
  ctx.setLineDash([8, 10]);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, TRACK.rx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // start/finish line
  const s0 = trackPoint(0);
  const inward = {
    x: (TRACK.cx - s0.x) / TRACK.rx,
    y: (TRACK.cy - s0.y) / TRACK.ry,
  };
  const len = Math.hypot(inward.x, inward.y) || 1;
  const nx = (inward.x / len) * TRACK.halfW;
  const ny = (inward.y / len) * TRACK.halfW;
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(s0.x - nx, s0.y - ny);
  ctx.lineTo(s0.x + nx, s0.y + ny);
  ctx.stroke();
}

function drawCar(c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  // glow
  ctx.fillStyle = c.color + '55';
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // body
  ctx.fillStyle = c.color;
  ctx.fillRect(-10, -5, 18, 10);
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(2, -3, 6, 6);
  if (c.isPlayer) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-10, -5, 18, 10);
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // dark pad
  ctx.fillStyle = 'rgba(5,6,12,0.55)';
  ctx.fillRect(0, 0, W, H);

  drawTrack();

  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 3);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    ctx.globalAlpha = 1;
  }

  // draw AI first, player last
  for (const c of state.cars) {
    if (!c.isPlayer) drawCar(c);
  }
  for (const c of state.cars) {
    if (c.isPlayer) drawCar(c);
  }

  // minimap names
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  let y = 14;
  const sorted = [...state.cars].sort((a, b) => (a.place || 99) - (b.place || 99));
  for (const c of sorted) {
    ctx.fillStyle = c.color;
    ctx.fillText(`${c.place || '-'} ${c.name}${c.finished ? ' ✓' : ''}`, 8, y);
    y += 12;
  }

  if (state.countdown > 0) {
    const n = Math.ceil(state.countdown);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5ce1ff';
    ctx.font = 'bold 64px Montserrat, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(n > 3 ? 'GO' : String(n), W / 2, H / 2);
  }
}

function bindHold(el, key) {
  const down = (e) => {
    e.preventDefault();
    input[key] = true;
    el.classList.add('is-down');
    sfx.unlock();
  };
  const up = (e) => {
    e.preventDefault();
    input[key] = false;
    el.classList.remove('is-down');
  };
  el.addEventListener('touchstart', down, { passive: false });
  el.addEventListener('touchend', up, { passive: false });
  el.addEventListener('touchcancel', up, { passive: false });
  el.addEventListener('mousedown', down);
  el.addEventListener('mouseup', up);
  el.addEventListener('mouseleave', up);
}

bindHold($('btnLeft'), 'left');
bindHold($('btnRight'), 'right');
bindHold($('btnGas'), 'gas');
bindHold($('btnBrake'), 'brake');

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) input.left = true;
  if (['ArrowRight', 'd', 'D'].includes(e.key)) input.right = true;
  if (['ArrowUp', 'w', 'W'].includes(e.key)) input.gas = true;
  if (['ArrowDown', 's', 'S', ' '].includes(e.key)) input.brake = true;
});
window.addEventListener('keyup', (e) => {
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) input.left = false;
  if (['ArrowRight', 'd', 'D'].includes(e.key)) input.right = false;
  if (['ArrowUp', 'w', 'W'].includes(e.key)) input.gas = false;
  if (['ArrowDown', 's', 'S', ' '].includes(e.key)) input.brake = false;
});

$('btnStart').addEventListener('click', () => {
  sfx.unlock();
  startRace();
});

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (state.running) {
    if (state.countdown > 0) {
      const prev = state.countdown;
      state.countdown -= dt;
      if (prev > 1 && state.countdown <= 1) sfx.play('tick');
      if (state.countdown <= 0) sfx.play('tap');
    } else {
      for (const c of state.cars) updateCar(c, dt);
      updatePlaces();
      updateHud();
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
      state.particles[i].life -= dt;
      if (state.particles[i].life <= 0) state.particles.splice(i, 1);
    }
  }

  draw();
  requestAnimationFrame(loop);
}

// boot net
(async () => {
  const net = await OGHNet.connect({ gameId: 'pulse-race' });
  state.net = net;
  const label = net.mode === 'online' ? `ONLINE · ${net.room}` : 'OFFLINE · AI mode';
  $('hudNet').textContent = label;
  $('netBlurb').textContent =
    net.mode === 'online'
      ? 'Host WebSocket found — multiplayer path active (core may still be relay-only).'
      : 'No host /ws yet — racing offline with AI. Same game will use LAN when core runs.';
  net.on('mode', (m) => {
    $('hudNet').textContent = m === 'online' ? 'ONLINE' : 'OFFLINE';
  });
  net.on('state', (snap) => {
    // Future: apply remote car snapshots when host simulates
    if (snap?.cars && state.running) {
      // placeholder for MP interpolation
    }
  });
})();

requestAnimationFrame(loop);
