/**
 * OGHNet relay for positions, trails, pins + peer presence.
 */

import { OGHNet } from '../../_shared/js/ogh-net.js';
import { colorFromId } from './geo.js';

const POS_MS = 800;
const TRAIL_MS = 4000;
const STALE_MS = 90000;

/**
 * @param {{
 *   getSelf: () => { lat: number, lon: number, acc: number|null, heading: number|null },
 *   trail: { drainBatch: (n?: number) => number[][], clear: () => void, points?: {lat:number,lon:number}[] },
 *   pins: { applyRemote: Function, removeRemote: Function, all?: Function },
 *   onPeers: (peers: Map<string, any>) => void,
 *   onMode: (mode: string, net: any) => void,
 * }} hooks
 */
export async function connectNet(hooks) {
  const net = await OGHNet.connect({ gameId: 'world-trail' });

  /**
   * @type {Map<string, {
   *   id: string, name: string, color: string,
   *   lat: number, lon: number, acc: number|null, heading: number|null,
   *   trail: {lat:number,lon:number}[], updated: number, hasPos: boolean, online: boolean
   * }>}
   */
  const peers = new Map();

  let lastPosSend = 0;
  let lastTrailSend = 0;

  function touchPeer(id, name) {
    let p = peers.get(id);
    if (!p) {
      p = {
        id,
        name: name || id.slice(0, 8),
        color: colorFromId(id),
        lat: 0,
        lon: 0,
        acc: null,
        heading: null,
        trail: [],
        updated: Date.now(),
        hasPos: false,
        online: true,
      };
      peers.set(id, p);
    } else {
      if (name) p.name = name;
      p.online = true;
    }
    return p;
  }

  function notifyPeers() {
    hooks.onPeers(peers);
  }

  function broadcastSelf(force = false) {
    if (net.mode !== 'online') return;
    const now = Date.now();
    if (!force && now - lastPosSend < POS_MS) return;
    lastPosSend = now;
    const self = hooks.getSelf();
    net.send('pos', {
      lat: self.lat,
      lon: self.lon,
      acc: self.acc,
      hdg: self.heading,
      name: net.name,
    });
  }

  function sendHello() {
    net.send('hello', {
      name: net.name,
      color: colorFromId(net.playerId),
    });
    // Ask others to re-announce position
    net.send('who', { name: net.name });
    broadcastSelf(true);
  }

  function handleAction({ action, payload, from }) {
    if (!from || from === net.playerId) return;
    const p = touchPeer(from, payload?.name);

    if (action === 'hello') {
      p.name = payload?.name || p.name;
      if (payload?.color) p.color = payload.color;
      p.updated = Date.now();
      p.online = true;
      notifyPeers();
      // Answer new joiner with our position immediately
      broadcastSelf(true);
      return;
    }
    if (action === 'who') {
      // Someone wants a re-broadcast
      p.name = payload?.name || p.name;
      p.updated = Date.now();
      broadcastSelf(true);
      // Share a short recent trail sample so they see paths
      const pts = (hooks.trail.points || []).slice(-40).map((t) => [t.lat, t.lon]);
      if (pts.length) net.send('trail', { pts });
      return;
    }
    if (action === 'pos') {
      p.lat = +payload.lat;
      p.lon = +payload.lon;
      p.acc = payload.acc != null ? +payload.acc : null;
      p.heading = payload.hdg != null ? +payload.hdg : p.heading;
      p.hasPos = Number.isFinite(p.lat) && Number.isFinite(p.lon);
      p.updated = Date.now();
      p.online = true;
      if (payload?.name) p.name = payload.name;
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
      p.online = true;
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
  net.on('mode', (mode) => {
    hooks.onMode(mode, net);
    if (mode === 'online') {
      // Delay slightly so playerId is assigned from server hello
      setTimeout(sendHello, 50);
      setTimeout(sendHello, 400);
    }
  });
  net.on('players', (list) => {
    const seen = new Set();
    for (const pl of list || []) {
      if (!pl.id || pl.id === net.playerId) continue;
      seen.add(pl.id);
      touchPeer(pl.id, pl.name);
    }
    for (const [id, p] of peers) {
      p.online = seen.has(id);
      if (!p.online && Date.now() - p.updated > STALE_MS) {
        // keep trail briefly but mark offline
      }
    }
    notifyPeers();
    // New roster → re-announce so everyone gets us
    if (net.mode === 'online') broadcastSelf(true);
  });
  net.on('hello', () => {
    if (net.playerId && net.playerId !== 'local') {
      sendHello();
    }
  });

  hooks.onMode(net.mode, net);
  if (net.mode === 'online') sendHello();

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
      const batch = hooks.trail.drainBatch(40);
      if (batch.length) net.send('trail', { pts: batch });
    }
  }

  const interval = setInterval(tickSend, 400);

  return {
    net,
    peers,
    STALE_MS,
    tickSend,
    broadcastSelf,
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
