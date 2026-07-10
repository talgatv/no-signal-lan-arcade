/**
 * Local pin store + OGHProfile persistence.
 */

import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { uid } from './geo.js';

const GAME_ID = 'world-trail';
const MAX_PINS = 100;

/**
 * @typedef {{ id: string, lat: number, lon: number, label: string, by: string, t: number }} Pin
 */

export function createPins(playerId) {
  /** @type {Map<string, Pin>} */
  const map = new Map();
  let ownerId = playerId || 'local';

  function loadLocal() {
    const data = OGHProfile.getProgress(GAME_ID);
    const list = data?.pins;
    if (!Array.isArray(list)) return;
    for (const p of list) {
      if (!p || !p.id) continue;
      map.set(p.id, {
        id: String(p.id),
        lat: +p.lat,
        lon: +p.lon,
        label: String(p.label || 'Pin'),
        by: String(p.by || ownerId),
        t: +p.t || Date.now(),
      });
    }
  }

  function persistLocal() {
    const mine = [...map.values()].filter((p) => p.by === ownerId);
    OGHProfile.saveProgress(
      GAME_ID,
      { pins: mine.slice(-MAX_PINS) },
      {
        label: 'World Trail',
        summary: `${mine.length} pin(s)`,
      }
    );
  }

  loadLocal();

  return {
    get ownerId() {
      return ownerId;
    },

    /** Call when OGHNet assigns a real playerId */
    setOwnerId(id) {
      const next = id || 'local';
      if (next === ownerId) return;
      for (const p of map.values()) {
        if (p.by === ownerId || p.by === 'local' || p.by === 'pending') {
          p.by = next;
        }
      }
      ownerId = next;
      persistLocal();
    },

    /** @returns {Pin[]} */
    all() {
      return [...map.values()];
    },

    get(id) {
      return map.get(id) || null;
    },

    /**
     * @param {{ lat: number, lon: number, label?: string, id?: string, by?: string, t?: number }} opts
     */
    add(opts) {
      const pin = {
        id: opts.id || uid(),
        lat: +opts.lat,
        lon: +opts.lon,
        label: (opts.label || 'Pin').slice(0, 40),
        by: opts.by || ownerId,
        t: opts.t || Date.now(),
      };
      map.set(pin.id, pin);
      if (map.size > MAX_PINS) {
        const sorted = [...map.values()].sort((a, b) => a.t - b.t);
        while (map.size > MAX_PINS) {
          const old = sorted.shift();
          if (old) map.delete(old.id);
        }
      }
      if (pin.by === ownerId) persistLocal();
      return pin;
    },

    remove(id) {
      const p = map.get(id);
      if (!p) return false;
      map.delete(id);
      if (p.by === ownerId) persistLocal();
      return true;
    },

    applyRemote(pin) {
      if (!pin?.id) return;
      map.set(pin.id, {
        id: String(pin.id),
        lat: +pin.lat,
        lon: +pin.lon,
        label: String(pin.label || 'Pin'),
        by: String(pin.by || 'remote'),
        t: +pin.t || Date.now(),
      });
    },

    removeRemote(id) {
      map.delete(id);
    },
  };
}
