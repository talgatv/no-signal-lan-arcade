/**
 * Ring-buffer breadcrumb trail with distance thinning.
 */

import { haversineM } from './geo.js';

const MIN_DIST_M = 30;
const MIN_TIME_MS = 3000;
const MIN_MOVE_FOR_TIME_M = 5;
const MAX_POINTS = 1500;

export function createTrail() {
  /** @type {{ lat: number, lon: number, t: number }[]} */
  let pts = [];
  let lastSent = 0;

  return {
    get points() {
      return pts;
    },

    clear() {
      pts = [];
      lastSent = 0;
    },

    /**
     * @param {number} lat
     * @param {number} lon
     * @param {number} [t]
     * @returns {boolean} true if a point was appended
     */
    push(lat, lon, t = Date.now()) {
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
      if (!pts.length) {
        pts.push({ lat, lon, t });
        return true;
      }
      const last = pts[pts.length - 1];
      const d = haversineM(last.lat, last.lon, lat, lon);
      const dt = t - last.t;
      const okDist = d >= MIN_DIST_M;
      const okTime = dt >= MIN_TIME_MS && d >= MIN_MOVE_FOR_TIME_M;
      if (!okDist && !okTime) return false;
      pts.push({ lat, lon, t });
      if (pts.length > MAX_POINTS) pts = pts.slice(pts.length - MAX_POINTS);
      return true;
    },

    /** Points not yet sent (index >= lastSent) as [[lat,lon],...] */
    drainBatch(max = 40) {
      if (lastSent >= pts.length) return [];
      const batch = pts.slice(lastSent, lastSent + max).map((p) => [p.lat, p.lon]);
      lastSent = Math.min(pts.length, lastSent + batch.length);
      return batch;
    },

    /** Replace from remote absolute list of [lat,lon] */
    setFromRemote(list) {
      pts = (list || [])
        .filter((p) => Array.isArray(p) && p.length >= 2)
        .map(([lat, lon]) => ({ lat: +lat, lon: +lon, t: 0 }))
        .slice(-MAX_POINTS);
      lastSent = pts.length;
    },

    appendRemote(list) {
      for (const p of list || []) {
        if (!Array.isArray(p) || p.length < 2) continue;
        this.push(+p[0], +p[1], Date.now());
      }
      // remote append shouldn't re-broadcast; mark all sent
      lastSent = pts.length;
    },
  };
}
