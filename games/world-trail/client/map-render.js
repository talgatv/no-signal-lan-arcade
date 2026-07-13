/**
 * Canvas renderer: static basemap + dynamic overlays.
 */

import { WORLD_W, WORLD_H, project, unproject, clamp } from './geo.js';

/**
 * @param {HTMLCanvasElement} canvas
 */
export function createMapRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const layers = {
    land: true,
    rivers: true,
    roads: true,
    cities: true,
    trails: true,
    peers: true,
  };

  /** @type {any} */
  let data = { land: null, rivers: null, roads: null, cities: null };

  // camera: center in world px, scale = screen px per world px
  let camX = WORLD_W / 2;
  let camY = WORLD_H / 2;
  let scale = 0.35;

  let dpr = 1;
  let cssW = 0;
  let cssH = 0;

  // optional static layer cache at current scale (rebuild on zoom)
  let cache = null;
  let cacheScale = 0;
  let cacheCamKey = '';

  function resize() {
    const parent = canvas.parentElement || document.body;
    cssW = parent.clientWidth || window.innerWidth;
    cssH = parent.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    invalidateCache();
  }

  function invalidateCache() {
    cache = null;
  }

  function worldToScreen(wx, wy) {
    const sx = (wx - camX) * scale + cssW / 2;
    const sy = (wy - camY) * scale + cssH / 2;
    return { x: sx, y: sy };
  }

  function screenToWorld(sx, sy) {
    const wx = (sx - cssW / 2) / scale + camX;
    const wy = (sy - cssH / 2) / scale + camY;
    return { x: wx, y: wy };
  }

  function latLonToScreen(lat, lon) {
    const p = project(lon, lat);
    return worldToScreen(p.x, p.y);
  }

  function setData(d) {
    data = d;
    invalidateCache();
  }

  function setLayer(name, on) {
    if (name in layers) {
      layers[name] = !!on;
      if (['land', 'rivers', 'roads', 'cities'].includes(name)) invalidateCache();
    }
  }

  function getLayers() {
    return { ...layers };
  }

  function panBy(dx, dy) {
    camX -= dx / scale;
    camY -= dy / scale;
    clampCam();
    invalidateCache();
  }

  function zoomAt(sx, sy, factor) {
    const before = screenToWorld(sx, sy);
    scale = clamp(scale * factor, 0.08, 40);
    const after = screenToWorld(sx, sy);
    camX += before.x - after.x;
    camY += before.y - after.y;
    clampCam();
    invalidateCache();
  }

  function clampCam() {
    camX = clamp(camX, 0, WORLD_W);
    camY = clamp(camY, 0, WORLD_H);
  }

  function centerOn(lat, lon) {
    const p = project(lon, lat);
    camX = p.x;
    camY = p.y;
    clampCam();
    invalidateCache();
  }

  function fitWorld() {
    const s = Math.min(cssW / WORLD_W, cssH / WORLD_H) * 0.95;
    scale = Math.max(0.08, s);
    camX = WORLD_W / 2;
    camY = WORLD_H / 2;
    invalidateCache();
  }

  function drawGeomPath(g) {
    if (!g) return;
    const t = g.type;
    const c = g.coordinates;
    if (t === 'Polygon') drawPolygon(c);
    else if (t === 'MultiPolygon') for (const poly of c) drawPolygon(poly);
    else if (t === 'LineString') drawLine(c);
    else if (t === 'MultiLineString') for (const line of c) drawLine(line);
  }

  function drawLine(coords) {
    if (!coords || coords.length < 2) return;
    ctx.beginPath();
    for (let i = 0; i < coords.length; i++) {
      const [lon, lat] = coords[i];
      const p = project(lon, lat);
      const s = worldToScreen(p.x, p.y);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
  }

  function drawPolygon(rings) {
    if (!rings || !rings.length) return;
    ctx.beginPath();
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const [lon, lat] = ring[i];
        const p = project(lon, lat);
        const s = worldToScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      }
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
  }

  function drawStaticLayers() {
    // ocean
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, cssW, cssH);

    // graticule light
    ctx.strokeStyle = 'rgba(80,120,160,0.12)';
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) {
      const a = latLonToScreen(90, lon);
      const b = latLonToScreen(-90, lon);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const a = latLonToScreen(lat, -180);
      const b = latLonToScreen(lat, 180);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    if (layers.land && data.land) {
      ctx.fillStyle = '#1a3d2e';
      ctx.strokeStyle = 'rgba(60,120,90,0.45)';
      ctx.lineWidth = 0.6;
      for (const f of data.land.features || []) drawGeomPath(f.geometry);
    }

    if (layers.rivers && data.rivers) {
      // Zoom-dependent water detail (Natural Earth scalerank)
      let maxLakeSr = 3;
      let maxRiverSr = 4;
      if (scale >= 0.35) {
        maxLakeSr = 5;
        maxRiverSr = 5;
      }
      if (scale >= 0.7) {
        maxLakeSr = 7;
        maxRiverSr = 7;
      }
      if (scale >= 1.4) {
        maxLakeSr = 9;
        maxRiverSr = 9;
      }
      if (scale >= 2.5) {
        maxLakeSr = 99;
        maxRiverSr = 99;
      }

      // Lakes first (fill under rivers)
      for (const f of data.rivers.features || []) {
        if (f.p?.k !== 'l') continue;
        const sr = f.p?.sr ?? 5;
        if (sr > maxLakeSr) continue;
        ctx.fillStyle =
          sr <= 2
            ? 'rgba(35,95,175,0.72)'
            : sr <= 5
              ? 'rgba(40,100,180,0.55)'
              : 'rgba(45,105,175,0.42)';
        ctx.strokeStyle = 'rgba(100,180,240,0.45)';
        ctx.lineWidth = Math.max(0.4, 0.6 * Math.min(scale, 2));
        drawGeomPath(f.geometry);
      }

      // Rivers / lake centerlines
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const f of data.rivers.features || []) {
        if (f.p?.k === 'l') continue;
        const sr = f.p?.sr ?? 5;
        if (sr > maxRiverSr) continue;
        const major = sr <= 3;
        ctx.strokeStyle = major
          ? 'rgba(90,180,255,0.9)'
          : sr <= 6
            ? 'rgba(70,160,230,0.75)'
            : 'rgba(60,140,210,0.55)';
        ctx.lineWidth = major
          ? Math.max(1.1, 1.8 * Math.min(scale, 4))
          : Math.max(0.55, 1.0 * Math.min(scale, 3));
        drawGeomPath(f.geometry);
      }
    }

    if (layers.roads && data.roads) {
      for (const f of data.roads.features || []) {
        const major = f.p?.t === 1;
        ctx.strokeStyle = major
          ? 'rgba(255,200,80,0.55)'
          : 'rgba(200,180,120,0.35)';
        ctx.lineWidth = major
          ? Math.max(0.7, 1.4 * Math.min(scale, 4))
          : Math.max(0.4, 0.9 * Math.min(scale, 3));
        drawGeomPath(f.geometry);
      }
    }

    if (layers.cities && data.cities) {
      // Keep the world view readable on phones, then reveal detail as users zoom.
      // Features are sorted by population, so the collision pass keeps the most
      // useful city names when several labels compete for the same space.
      let maxSr = 1;
      if (scale >= 0.3) maxSr = 2;
      if (scale >= 0.55) maxSr = 3;
      if (scale >= 0.85) maxSr = 4;
      if (scale >= 1.35) maxSr = 6;
      if (scale >= 2.2) maxSr = 7;
      if (scale >= 3.5) maxSr = 99;
      const labelSr =
        scale >= 4 ? 8 : scale >= 2.2 ? 4 : scale >= 1.35 ? 3 : scale >= 0.85 ? 2 : scale >= 0.3 ? 1 : 0;
      const labelBoxes = [];
      for (const f of data.cities.features || []) {
        const sr = f.p?.sr ?? 9;
        if (sr > maxSr) continue;
        const [lon, lat] = f.geometry.coordinates;
        const s = latLonToScreen(lat, lon);
        if (s.x < -12 || s.y < -12 || s.x > cssW + 12 || s.y > cssH + 12) continue;
        const r = sr <= 1 ? 4 : sr <= 3 ? 3 : sr <= 5 ? 2.2 : 1.4;
        ctx.beginPath();
        ctx.fillStyle =
          sr <= 2 ? '#fff6d0' : sr <= 4 ? '#e8f0ff' : 'rgba(180,200,230,0.85)';
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (sr <= labelSr) {
          ctx.fillStyle =
            sr <= 2 ? 'rgba(255,245,200,0.95)' : 'rgba(220,230,255,0.82)';
          ctx.font = `${Math.max(8, (sr <= 2 ? 11 : 9) * Math.min(dpr, 1.2))}px system-ui,sans-serif`;
          const name = f.p?.n || '';
          const width = ctx.measureText(name).width;
          const box = { x: s.x + 3, y: s.y - 15, w: width + 5, h: 15 };
          const overlaps = labelBoxes.some(
            (other) =>
              box.x < other.x + other.w &&
              box.x + box.w > other.x &&
              box.y < other.y + other.h &&
              box.y + box.h > other.y,
          );
          if (!overlaps) {
            ctx.fillText(name, s.x + 4, s.y - 3);
            labelBoxes.push(box);
          }
        }
      }
    }
  }

  function drawPolyline(pts, color, width) {
    if (!pts || pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let i = 0; i < pts.length; i++) {
      const s = latLonToScreen(pts[i].lat, pts[i].lon);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
  }

  /**
   * @param {{
   *   self: { lat: number, lon: number, acc: number|null, heading: number|null, color?: string },
   *   trail: { lat: number, lon: number }[],
   *   peers: Iterable<{ lat: number, lon: number, color: string, name?: string, trail?: {lat:number,lon:number}[], updated: number }>,
   *   pins: { lat: number, lon: number, label: string, by: string }[],
   * }} scene
   */
  function draw(scene) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStaticLayers();

    if (layers.trails) {
      drawPolyline(scene.trail, 'rgba(0,255,200,0.75)', 2.5);
      if (layers.peers) {
        for (const p of scene.peers) {
          if (!p.hasPos && !(p.trail && p.trail.length)) continue;
          if (Date.now() - p.updated > 90000) continue;
          ctx.globalAlpha = 0.75;
          drawPolyline(p.trail || [], p.color, 2.5);
          ctx.globalAlpha = 1;
        }
      }
    }

    // pins
    for (const pin of scene.pins || []) {
      const s = latLonToScreen(pin.lat, pin.lon);
      if (s.x < -30 || s.y < -30 || s.x > cssW + 30 || s.y > cssH + 30) continue;
      ctx.beginPath();
      ctx.fillStyle = '#ff6b9d';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - 6, s.y - 16);
      ctx.lineTo(s.x + 6, s.y - 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (scale > 0.6) {
        ctx.fillStyle = 'rgba(255,220,230,0.95)';
        ctx.font = '11px system-ui,sans-serif';
        ctx.fillText(pin.label || 'Pin', s.x + 8, s.y - 10);
      }
    }

    // peers (only those with a real position)
    if (layers.peers) {
      const now = Date.now();
      const pulse = 1 + 0.15 * Math.sin(now / 280);
      for (const p of scene.peers) {
        if (!p.hasPos) continue;
        const age = now - p.updated;
        if (age > 90000) continue;
        const s = latLonToScreen(p.lat, p.lon);
        if (s.x < -40 || s.y < -40 || s.x > cssW + 40 || s.y > cssH + 40) continue;
        const stale = age > 25000;
        const dim = stale || p.online === false;
        ctx.globalAlpha = dim ? 0.45 : 1;

        // halo
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = dim ? 0.15 : 0.28;
        ctx.arc(s.x, s.y, 14 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = dim ? 0.45 : 1;

        // body
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // name plate
        const label = p.name || 'peer';
        ctx.font = 'bold 12px system-ui,sans-serif';
        const tw = ctx.measureText(label).width;
        const px = s.x + 11;
        const py = s.y - 6;
        ctx.fillStyle = 'rgba(0,10,24,0.75)';
        ctx.fillRect(px - 3, py - 11, tw + 6, 16);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, px, py + 1);
        ctx.globalAlpha = 1;
      }
    }

    // self
    const me = scene.self;
    if (me) {
      const s = latLonToScreen(me.lat, me.lon);
      if (me.acc && me.acc < 5e5) {
        // accuracy ring: rough meters → world px at equator ~ scale
        const mPerPx = (40075017 / WORLD_W) / scale; // meters per screen px at equator-ish
        const r = me.acc / mPerPx;
        if (r > 2 && r < cssW) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(0,220,255,0.12)';
          ctx.strokeStyle = 'rgba(0,220,255,0.35)';
          ctx.lineWidth = 1;
          ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      // chevron / dot
      ctx.save();
      ctx.translate(s.x, s.y);
      if (me.heading != null && Number.isFinite(me.heading)) {
        ctx.rotate((me.heading * Math.PI) / 180);
      }
      ctx.beginPath();
      ctx.fillStyle = '#00e5ff';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.moveTo(0, -10);
      ctx.lineTo(7, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-7, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function pickPin(sx, sy, pins, maxDist = 22) {
    let best = null;
    let bestD = maxDist;
    for (const pin of pins) {
      const s = latLonToScreen(pin.lat, pin.lon);
      const d = Math.hypot(s.x - sx, s.y - sy);
      if (d < bestD) {
        bestD = d;
        best = pin;
      }
    }
    return best;
  }

  function screenToLatLon(sx, sy) {
    const w = screenToWorld(sx, sy);
    return unproject(w.x, w.y);
  }

  return {
    resize,
    setData,
    setLayer,
    getLayers,
    panBy,
    zoomAt,
    centerOn,
    fitWorld,
    draw,
    pickPin,
    screenToLatLon,
    get scale() {
      return scale;
    },
    get camera() {
      return { x: camX, y: camY, scale };
    },
  };
}
