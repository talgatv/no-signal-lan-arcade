/**
 * OGHNet — thin multiplayer facade for browser games.
 * Full design: docs/architecture/MULTIPLAYER.md
 *
 *
 * Modes:
 *  - offline  — no server; game runs solo / local split / AI
 *  - online   — WebSocket to OGH host core (same Wi‑Fi)
 *
 * Games should NOT scan LAN themselves. Discovery = open host URL.
 *
 * Usage:
 *   import { OGHNet } from '../../_shared/js/ogh-net.js';
 *   const net = await OGHNet.connect({ gameId: 'pulse-race' });
 *   net.on('players', (list) => ...);
 *   net.send('input', { steer: 1, throttle: 1 });
 *   // later: net.disconnect();
 */

function qs(name) {
  try {
    return new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}

function defaultWsUrl() {
  // Same host as the page; host core will expose /ws
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const fromQuery = qs('ws');
  if (fromQuery) return fromQuery;
  if (location.protocol === 'file:') return null;
  return `${proto}//${location.host}/ws`;
}

export const OGHNet = {
  /**
   * @param {{ gameId: string, room?: string, name?: string, forceOffline?: boolean }} opts
   */
  async connect(opts = {}) {
    const gameId = opts.gameId || 'unknown';
    const room = opts.room || qs('room') || 'main';
    const name = opts.name || qs('name') || `P${Math.floor(Math.random() * 900 + 100)}`;
    const forceOffline = opts.forceOffline || qs('offline') === '1';

    const handlers = new Map(); // type -> Set<fn>
    const emit = (type, data) => {
      const set = handlers.get(type);
      if (set) for (const fn of set) {
        try { fn(data); } catch (e) { console.warn('[OGHNet]', e); }
      }
      const any = handlers.get('*');
      if (any) for (const fn of any) {
        try { fn(type, data); } catch (e) { console.warn('[OGHNet]', e); }
      }
    };

    const api = {
      gameId,
      room,
      name,
      mode: 'offline',
      playerId: 'local',
      isHost: true,
      players: [{ id: 'local', name, ready: true, you: true }],
      ready: true,
      latency: 0,

      on(type, fn) {
        if (!handlers.has(type)) handlers.set(type, new Set());
        handlers.get(type).add(fn);
        return () => handlers.get(type)?.delete(fn);
      },

      off(type, fn) {
        handlers.get(type)?.delete(fn);
      },

      /** Send game action (no-op online until host exists; offline: local only) */
      send(action, payload = {}) {
        if (api.mode === 'offline') {
          emit('local', { action, payload });
          return;
        }
        if (api._ws && api._ws.readyState === 1) {
          api._ws.send(JSON.stringify({
            v: 1,
            type: 'game:action',
            action,
            payload,
            t: Date.now(),
          }));
        }
      },

      setReady(value) {
        api.ready = !!value;
        if (api.mode === 'online' && api._ws?.readyState === 1) {
          api._ws.send(JSON.stringify({ v: 1, type: 'ready', value: api.ready }));
        }
        emit('ready', api.ready);
      },

      disconnect() {
        try { api._ws?.close(); } catch (_) { /* */ }
        api._ws = null;
        api.mode = 'offline';
        emit('disconnect', {});
      },
    };

    if (forceOffline) {
      queueMicrotask(() => {
        emit('mode', 'offline');
        emit('players', api.players);
        emit('hello', { playerId: api.playerId, isHost: true });
      });
      return api;
    }

    const wsUrl = defaultWsUrl();
    if (!wsUrl) {
      emit('mode', 'offline');
      emit('players', api.players);
      emit('hello', { playerId: api.playerId, isHost: true });
      return api;
    }

    // Try WebSocket; fall back to offline quickly
    try {
      const ws = new WebSocket(wsUrl);
      api._ws = ws;

      const opened = await new Promise((resolve) => {
        const to = setTimeout(() => resolve(false), 600);
        ws.onopen = () => { clearTimeout(to); resolve(true); };
        ws.onerror = () => { clearTimeout(to); resolve(false); };
      });

      if (!opened) {
        try { ws.close(); } catch (_) { /* */ }
        api._ws = null;
        emit('mode', 'offline');
        emit('players', api.players);
        emit('hello', { playerId: api.playerId, isHost: true });
        return api;
      }

      api.mode = 'online';
      ws.send(JSON.stringify({
        v: 1,
        type: 'join',
        room,
        gameId,
        name,
      }));

      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.type === 'hello') {
          api.playerId = msg.playerId || api.playerId;
          api.isHost = !!msg.isHost;
          emit('hello', msg);
        } else if (msg.type === 'lobby' || msg.type === 'players') {
          api.players = msg.players || msg.payload || [];
          emit('players', api.players);
        } else if (msg.type === 'game:state') {
          emit('state', msg.payload ?? msg);
        } else if (msg.type === 'game:event') {
          emit('event', msg.payload ?? msg);
        } else if (msg.type === 'game:start') {
          emit('start', msg);
        } else {
          emit(msg.type, msg);
        }
      };

      ws.onclose = () => {
        if (api.mode === 'online') {
          api.mode = 'offline';
          emit('disconnect', {});
          emit('mode', 'offline');
        }
      };

      emit('mode', 'online');
      emit('hello', { playerId: api.playerId, isHost: api.isHost });
    } catch (_) {
      api.mode = 'offline';
      emit('mode', 'offline');
      emit('players', api.players);
      emit('hello', { playerId: api.playerId, isHost: true });
    }

    return api;
  },
};
