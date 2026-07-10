/**
 * OGHNet relay for positions, trails, pins.
 */

import { OGHNet } from '../../_shared/js/ogh-net.js';
import { colorFromId } from './geo.js';

const POS_MS = 1500;
const TRAIL_MS = 5000;

/**
 * @param {{
 *   getSelf: () => { lat: number, lon: number, acc: number|null, heading: number|null },
 *   trail: { drainBatch: (n?: number) => number[][], clear: () => void, appendRemote?: Function, setFromRemote?: Function },
 *   pins: { applyRemote: Function, removeRemote: Function, add: Function },
 *   onPeers: (peers: Map<string, any>) => void,
 *   onMode: (mode: string, net: any) => void,
 * }} hooks
 */
export async function connectNet(hooks) {
  const net = await OGHNet.connect({ gameId: 'world-trail' });

  /** @type {Map<string, { id: string, name: string, color: string, lat: number, lon: number, acc: number|null, heading: number|null, trail: {lat:number,lon:number}[], updated: number }>} */
  const peers = new Map();

  let lastPosSend = 0;
  let lastTrailSend = 0;

  function touchPeer(id, name) {
    let p = peers.get(id);
    if (!p) {
      p = {
        id,
        name: name || id,
        color: colorFromId(id),
        lat: 0,
        lon: 0,
        acc: null,
        heading: null,
        trail: [],
        updated: Date.now(),
      };
      peers.set(id, p);
    } else if (name) {
      p.name = name;
    }
    return p;
  }

  function notifyPeers() {
    hooks.onPeers(peers);
  }

  function handleAction({ action, payload, from }) {
    if (!from || from === net.playerId) return;
    const p = touchPeer(from, payload?.name);

    if (action === 'hello') {
      p.name = payload?.name || p.name;
      p.updated = Date.now();
      notifyPeers();
      return;
    }
    if (action === 'pos') {
      p.lat = +payload.lat;
      p.lon = +payload.lon;
      p.acc = payload.acc != null ? +payload.acc : null;
      p.heading = payload.hdg != null ? +payload.hdg : p.heading;
      p.updated = Date.now();
      notifyPeers();
      return;
    }
    if (action === 'trail') {
      const pts = payload?.pts || [];
      for (const row of pts) {
        if (!Array.isArray(row) || row.length < 2) continue;
        p.trail.push({ lat: +row[0], lon: +row[1] });
      }
      if (p.trail.length > 1500) p.trail = p.trail.slice(-1500);
      p.updated = Date.now();
      notifyPeers();
      return;
    }
    if (action === 'trail_clear') {
      p.trail = [];
      notifyPeers();
      return;
    }
    if (action === 'pin') {
      hooks.pins.applyRemote({
        id: payload.id,
        lat: payload.lat,
        lon: payload.lon,
        label: payload.label,
        by: from,
        t: payload.t,
      });
      return;
    }
    if (action === 'unpin') {
      hooks.pins.removeRemote(payload?.id);
      return;
    }
  }

  net.on('action', handleAction);
  net.on('local', ({ action, payload }) => {
    // offline path: already applied locally by caller
  });
  net.on('mode', (mode) => hooks.onMode(mode, net));
  net.on('players', (list) => {
    for (const pl of list || []) {
      if (pl.id && pl.id !== net.playerId) touchPeer(pl.id, pl.name);
    }
    notifyPeers();
  });

  hooks.onMode(net.mode, net);

  net.send('hello', { name: net.name, color: colorFromId(net.playerId) });

  function tickSend() {
    if (net.mode !== 'online') return;
    const now = Date.now();
    const self = hooks.getSelf();
    if (now - lastPosSend >= POS_MS) {
      lastPosSend = now;
      net.send('pos', {
        lat: self.lat,
        lon: self.lon,
        acc: self.acc,
        hdg: self.heading,
        name: net.name,
      });
    }
    if (now - lastTrailSend >= TRAIL_MS) {
      lastTrailSend = now;
      const batch = hooks.trail.drainBatch(30);
      if (batch.length) net.send('trail', { pts: batch });
    }
  }

  const interval = setInterval(tickSend, 500);

  return {
    net,
    peers,
    tickSend,
    dispose() {
      clearInterval(interval);
    },
    sendPin(pin) {
      net.send('pin', {
        id: pin.id,
        lat: pin.lat,
        lon: pin.lon,
        label: pin.label,
        t: pin.t,
      });
    },
    sendUnpin(id) {
      net.send('unpin', { id });
    },
    sendTrailClear() {
      net.send('trail_clear', {});
    },
  };
}
