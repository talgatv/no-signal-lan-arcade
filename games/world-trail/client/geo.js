/**
 * Equirectangular projection + small geo helpers for World Trail.
 * World space: x in [0, W], y in [0, H], W:H = 2:1.
 */

export const WORLD_W = 3600;
export const WORLD_H = 1800;

/** @param {number} lon @param {number} lat */
export function project(lon, lat) {
  const x = ((lon + 180) / 360) * WORLD_W;
  const y = ((90 - lat) / 180) * WORLD_H;
  return { x, y };
}

/** @param {number} x @param {number} y */
export function unproject(x, y) {
  const lon = (x / WORLD_W) * 360 - 180;
  const lat = 90 - (y / WORLD_H) * 180;
  return {
    lon: clamp(lon, -180, 180),
    lat: clamp(lat, -90, 90),
  };
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/** Haversine distance in meters */
export function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR;
  const dLon = (lon2 - lon1) * toR;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Stable hue from string id → CSS color */
export function colorFromId(id) {
  let h = 0;
  const s = String(id || 'x');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 85% 58%)`;
}

export function uid() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}
