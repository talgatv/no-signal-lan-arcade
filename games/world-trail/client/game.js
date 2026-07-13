/**
 * World Trail — offline world map + GPS + LAN share.
 * Spec: docs/superpowers/specs/2026-07-10-world-trail-design.md
 */

import { createMapRenderer } from './map-render.js';
import { createSensors } from './sensors.js';
import { createTrail } from './trail.js';
import { createPins } from './pins.js';
import { connectNet } from './net-sync.js';

const canvas = document.getElementById('map');
const elNet = document.getElementById('netStatus');
const elCoords = document.getElementById('coords');
const elCompass = document.getElementById('compass');
const elCompassNeedle = document.getElementById('compassNeedle');
const elPlayers = document.getElementById('players');
const elMsg = document.getElementById('msg');
const layerPanel = document.getElementById('layerPanel');
const rosterEl = document.getElementById('roster');
const rosterList = document.getElementById('rosterList');
const gpsBanner = document.getElementById('gpsBanner');
const gpsBannerText = document.getElementById('gpsBannerText');
let gpsBannerDismissed = false;

const map = createMapRenderer(canvas);
const sensors = createSensors();
const trail = createTrail();
const pins = createPins('local');
/** @type {Map<string, any>} */
let peers = new Map();
/** @type {Awaited<ReturnType<typeof connectNet>> | null} */
let sync = null;
let running = true;
let longPressTimer = null;
let pointer = { down: false, id: null, x: 0, y: 0, moved: false };
let pinch = null;

function flash(text, ms = 2200) {
  elMsg.textContent = text;
  elMsg.hidden = !text;
  if (text) {
    clearTimeout(flash._t);
    flash._t = setTimeout(() => {
      elMsg.hidden = true;
    }, ms);
  }
}

async function loadData() {
  const base = new URL('./data/', import.meta.url);
  const [land, rivers, roads, cities] = await Promise.all([
    fetch(new URL('land.json', base)).then((r) => r.json()),
    fetch(new URL('rivers.json', base)).then((r) => r.json()),
    fetch(new URL('roads.json', base)).then((r) => r.json()),
    fetch(new URL('cities.json', base)).then((r) => r.json()),
  ]);
  map.setData({ land, rivers, roads, cities });
}

function updateHud() {
  const s = sensors.state;
  let src = s.source === 'gps' ? 'GPS' : 'SIM';
  if (s.acc != null && s.source === 'gps') {
    src += ` ±${Math.round(s.acc)}m`;
  }
  elCoords.textContent = `${s.lat.toFixed(4)}°, ${s.lon.toFixed(4)}° · ${src}`;
  if (s.heading != null && Number.isFinite(s.heading)) {
    elCompassNeedle.style.transform = `rotate(${-s.heading}deg)`;
    elCompass.title = `N ${Math.round(s.heading)}°`;
    elCompass.classList.add('live');
  } else {
    elCompass.classList.remove('live');
  }
  updateGpsBanner(s);
}

function updateGpsBanner(s) {
  if (!gpsBanner || gpsBannerDismissed) {
    if (gpsBanner && s.source === 'gps') gpsBanner.hidden = true;
    return;
  }
  if (s.source === 'gps') {
    gpsBanner.hidden = true;
    return;
  }

  const httpsHint =
    location.protocol === 'https:'
      ? ''
      : `<p><strong>GPS needs HTTPS:</strong> this page is open over <code>http://</code>. ` +
        `Phone browsers block location access on plain LAN HTTP.</p>` +
        `<p>On the host: <code>cd pc && ./start.sh --https</code><br/>` +
        `Then open <code>https://HOST_IP:port/</code> and accept the local certificate once.</p>`;

  let extra = '';
  if (s.status === 'insecure' || !s.secure) {
    extra = httpsHint;
  } else if (s.error) {
    extra = `<p>${escapeHtml(s.error)}</p>${httpsHint}`;
  } else {
    extra =
      `<p>GPS is not active yet. Tap <strong>Enable GPS</strong> and allow location access.</p>` +
      (s.secure ? '' : httpsHint);
  }
  extra +=
    `<p class="wt-gps-sim">No GPS? Tap the map to set a simulated position for LAN play.</p>`;

  gpsBannerText.innerHTML = extra;
  gpsBanner.hidden = false;
}

function renderPlayers() {
  const now = Date.now();
  const names = [];
  const youName = sync?.net?.name || 'you';
  names.push(`you (${youName})`);

  const rows = [
    {
      id: 'self',
      name: youName,
      color: '#00e5ff',
      you: true,
      hasPos: true,
      lat: sensors.state.lat,
      lon: sensors.state.lon,
      stale: false,
      sub: sensors.state.source === 'gps' ? 'GPS' : 'SIM',
    },
  ];

  for (const p of peers.values()) {
    const age = now - p.updated;
    if (age > 120000 && !p.online) continue;
    const stale = age > 25000 || p.online === false;
    if (p.hasPos) names.push(p.name || p.id);
    else names.push(`${p.name || p.id}?`);
    rows.push({
      id: p.id,
      name: p.name || p.id,
      color: p.color,
      you: false,
      hasPos: !!p.hasPos,
      lat: p.lat,
      lon: p.lon,
      stale,
      sub: p.hasPos
        ? `${p.lat.toFixed(2)}°, ${p.lon.toFixed(2)}°`
        : p.online
          ? 'waiting…'
          : 'offline',
    });
  }

  elPlayers.textContent =
    names.length <= 1
      ? `solo · ${youName}`
      : `${names.length} players · ${names.join(' · ')}`;

  rosterList.innerHTML = '';
  for (const r of rows) {
    const li = document.createElement('li');
    if (r.you) li.classList.add('you');
    if (r.stale) li.classList.add('stale');
    li.innerHTML = `
      <span class="wt-roster-dot" style="background:${r.color}"></span>
      <span class="wt-roster-meta">
        <span class="wt-roster-name">${escapeHtml(r.name)}${r.you ? ' (you)' : ''}</span>
        <span class="wt-roster-sub">${escapeHtml(r.sub)}</span>
      </span>`;
    li.addEventListener('click', () => {
      if (!r.hasPos) {
        flash(`${r.name}: no position yet`);
        return;
      }
      map.centerOn(r.lat, r.lon);
      if (map.scale < 1.5) {
        map.zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.5 / map.scale);
      }
      flash(`Centered on ${r.name}`);
    });
    rosterList.appendChild(li);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function frame() {
  if (!running) return;
  const s = sensors.state;
  map.draw({
    self: {
      lat: s.lat,
      lon: s.lon,
      acc: s.acc,
      heading: s.heading ?? s.hdg,
      color: '#00e5ff',
    },
    trail: trail.points,
    peers: peers.values(),
    pins: pins.all(),
  });
  requestAnimationFrame(frame);
}

function onSensor(s) {
  trail.push(s.lat, s.lon);
  updateHud();
  // Keep roster coords fresh for "you"
  if (rosterEl && !rosterEl.hidden) renderPlayers();
  // Nudge network when we first get a GPS fix
  if (s.source === 'gps') sync?.broadcastSelf?.(false);
}

function bindPointer() {
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    if (pointer.down && pointer.id !== e.pointerId) {
      // second finger → pinch
      pinch = {
        x0: pointer.x,
        y0: pointer.y,
        x1: e.clientX,
        y1: e.clientY,
        dist: Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y),
      };
      return;
    }
    pointer = {
      down: true,
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    longPressTimer = setTimeout(() => {
      if (!pointer.down || pointer.moved) return;
      const ll = map.screenToLatLon(sx, sy);
      dropPin(ll.lat, ll.lon);
    }, 550);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (pinch && pointer.down) {
      // update pinch with whichever finger
      const dist = Math.hypot(
        e.clientX - (e.pointerId === pointer.id ? pinch.x1 : pinch.x0),
        e.clientY - (e.pointerId === pointer.id ? pinch.y1 : pinch.y0)
      );
      // simpler: track two last positions in a map
    }
    if (!pointer.down || e.pointerId !== pointer.id) return;
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    if (Math.hypot(dx, dy) > 4) {
      pointer.moved = true;
      clearTimeout(longPressTimer);
    }
    map.panBy(dx, dy);
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  });

  canvas.addEventListener('pointerup', (e) => {
    clearTimeout(longPressTimer);
    if (e.pointerId === pointer.id) {
      if (!pointer.moved) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const hit = map.pickPin(sx, sy, pins.all());
        if (hit) {
          const mine = hit.by === pins.ownerId;
          if (mine && confirm(`Delete pin “${hit.label}”?`)) {
            pins.remove(hit.id);
            sync?.sendUnpin(hit.id);
          } else {
            flash(`${hit.label} (${hit.lat.toFixed(3)}, ${hit.lon.toFixed(3)})`);
          }
        } else if (sensors.state.source === 'sim' || sensors.state.error) {
          // tap to set sim position when no GPS
          const ll = map.screenToLatLon(sx, sy);
          sensors.setSim(ll.lat, ll.lon);
          flash('Sim position set (tap map)');
        }
      }
      pointer.down = false;
      pointer.id = null;
      pinch = null;
    }
  });

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      map.zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
    },
    { passive: false }
  );

  // touch pinch via gesture-like two-pointer distance
  const pts = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (!pinch) pinch = { dist };
      else if (pinch.dist > 0) {
        const rect = canvas.getBoundingClientRect();
        const cx = (a.x + b.x) / 2 - rect.left;
        const cy = (a.y + b.y) / 2 - rect.top;
        map.zoomAt(cx, cy, dist / pinch.dist);
        pinch.dist = dist;
        clearTimeout(longPressTimer);
        pointer.moved = true;
      }
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
  });
  canvas.addEventListener('pointercancel', (e) => {
    pts.delete(e.pointerId);
    pointer.down = false;
  });
}

function dropPin(lat, lon, label) {
  const name =
    label ||
    prompt('Pin label', `Pin ${pins.all().length + 1}`) ||
    'Pin';
  const pin = pins.add({ lat, lon, label: name });
  sync?.sendPin(pin);
  flash(`Pin: ${pin.label}`);
}

async function enableGpsFromUser() {
  flash('Requesting GPS…', 4000);
  await sensors.requestCompassPermission();
  const res = await sensors.requestGps();
  updateHud();
  if (res.ok || sensors.state.source === 'gps') {
    gpsBannerDismissed = true;
    gpsBanner.hidden = true;
    map.centerOn(sensors.state.lat, sensors.state.lon);
    flash('GPS on');
  } else if (res.reason === 'insecure') {
    flash('Need HTTPS for GPS — see banner');
  } else {
    flash(sensors.state.error || 'GPS failed', 4000);
  }
}

function bindUi() {
  document.getElementById('btnGps')?.addEventListener('click', () => {
    gpsBannerDismissed = false;
    enableGpsFromUser();
  });
  document.getElementById('btnEnableGps')?.addEventListener('click', () => {
    enableGpsFromUser();
  });
  document.getElementById('btnDismissGps')?.addEventListener('click', () => {
    gpsBannerDismissed = true;
    gpsBanner.hidden = true;
  });

  document.getElementById('btnCenter').addEventListener('click', async () => {
    await sensors.requestCompassPermission();
    // Also re-request GPS on Center (user gesture)
    if (sensors.state.source !== 'gps') {
      await sensors.requestGps();
    }
    const s = sensors.state;
    map.centerOn(s.lat, s.lon);
    if (map.scale < 2) map.zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 2 / map.scale);
    flash(s.source === 'gps' ? 'Centered on GPS' : 'Centered (SIM) — tap GPS button');
  });

  document.getElementById('btnPin').addEventListener('click', () => {
    const s = sensors.state;
    dropPin(s.lat, s.lon);
  });

  document.getElementById('btnLayers').addEventListener('click', () => {
    layerPanel.hidden = !layerPanel.hidden;
    if (!layerPanel.hidden) rosterEl.hidden = true;
  });

  document.getElementById('btnPlayers').addEventListener('click', () => {
    rosterEl.hidden = !rosterEl.hidden;
    if (!rosterEl.hidden) {
      layerPanel.hidden = true;
      renderPlayers();
      sync?.broadcastSelf?.(true);
    }
  });

  document.getElementById('btnClearTrail').addEventListener('click', () => {
    trail.clear();
    sync?.sendTrailClear();
    flash('Trail cleared');
  });

  document.getElementById('btnFit').addEventListener('click', () => {
    map.fitWorld();
  });

  layerPanel.querySelectorAll('input[type=checkbox]').forEach((input) => {
    input.addEventListener('change', () => {
      map.setLayer(input.dataset.layer, input.checked);
    });
  });
}

document.addEventListener('visibilitychange', () => {
  running = !document.hidden;
  if (running) requestAnimationFrame(frame);
});

window.addEventListener('resize', () => map.resize());

(async () => {
  map.resize();
  map.fitWorld();
  flash('Loading map…', 60000);
  try {
    await loadData();
    flash('Map ready · Natural Earth (public domain)');
  } catch (e) {
    console.error(e);
    flash('Failed to load map data');
  }

  sensors.onChange(onSensor);
  sensors.start();
  updateHud();

  map.centerOn(sensors.state.lat, sensors.state.lon);

  sync = await connectNet({
    getSelf: () => {
      const s = sensors.state;
      return {
        lat: s.lat,
        lon: s.lon,
        acc: s.acc,
        heading: s.heading ?? s.hdg,
      };
    },
    trail,
    pins,
    onPeers(p) {
      peers = p;
      renderPlayers();
    },
    onMode(mode, net) {
      elNet.textContent =
        mode === 'online'
          ? `ONLINE · ${net.room} · ${net.playerId}`
          : 'OFFLINE · local only';
      elNet.classList.toggle('online', mode === 'online');
      elNet.classList.toggle('offline', mode !== 'online');
      if (net?.playerId) pins.setOwnerId(net.playerId);
      renderPlayers();
    },
  });

  bindPointer();
  bindUi();
  renderPlayers();
  requestAnimationFrame(frame);
})();
