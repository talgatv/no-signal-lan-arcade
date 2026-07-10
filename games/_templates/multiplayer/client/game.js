/**
 * Multiplayer template — shared counter via OGHNet action relay.
 *
 * Docs:
 *   docs/contributing/ADD_MULTIPLAYER_GAME.md
 *   docs/contributing/ENGINE_API.md
 *
 * Pattern:
 *   - Anyone may send { action: 'bump', payload: { by: 1 } }
 *   - Everyone applies bumps (including offline local path)
 *   - Host is marked for when you later need authority
 */
import { OGHNet } from '../../../_shared/js/ogh-net.js';
import { createOghSfx } from '../../../_shared/js/ogh-sfx.js';

const sfx = createOghSfx();
const scoreEl = document.getElementById('score');
const btn = document.getElementById('btn');
const netStatus = document.getElementById('netStatus');
const playersEl = document.getElementById('players');

let score = 0;
/** @type {Awaited<ReturnType<typeof OGHNet.connect>> | null} */
let net = null;

function setScore(n) {
  score = n;
  scoreEl.textContent = String(score);
}

function applyBump(by, fromId) {
  setScore(score + (by || 1));
  sfx.play('tap');
  if (fromId && net && fromId !== net.playerId) {
    // remote
  }
}

function renderPlayers(list) {
  if (!list || !list.length) {
    playersEl.innerHTML = '<li>No roster yet</li>';
    return;
  }
  playersEl.innerHTML = list
    .map((p) => {
      const you = net && p.id === net.playerId ? ' (you)' : '';
      const host = p.isHost ? ' · host' : '';
      return `<li>${p.name || p.id}${you}${host}</li>`;
    })
    .join('');
}

function setModeUi(mode) {
  netStatus.textContent =
    mode === 'online'
      ? `ONLINE · room ${net?.room || '?'} · id ${net?.playerId || '?'}`
      : 'OFFLINE · local only (start pc/host for multiplayer)';
  netStatus.classList.toggle('online', mode === 'online');
  netStatus.classList.toggle('offline', mode !== 'online');
}

btn.addEventListener('click', () => {
  sfx.unlock();
  if (!net) return;
  // Optimistic local apply for snappy UI
  applyBump(1, net.playerId);
  // Tell others (online). Offline: ogh-net emits 'local'.
  net.send('bump', { by: 1 });
});

(async () => {
  net = await OGHNet.connect({
    gameId: 'TEMPLATE_ID', // new_game.py replaces this
  });

  setModeUi(net.mode);
  renderPlayers(net.players);

  net.on('mode', setModeUi);
  net.on('players', renderPlayers);
  net.on('hello', () => {
    setModeUi(net.mode);
  });

  // Online: host relays game:action to other clients (not the sender).
  net.on('action', ({ action, payload, from }) => {
    if (action === 'bump' && from !== net.playerId) {
      applyBump(payload?.by ?? 1, from);
    }
  });
})();
