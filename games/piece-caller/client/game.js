/**
 * Piece Caller — asymmetric 2P Tetris-like
 * Builder stacks; Caller picks next piece only inside timing window.
 * Host (first player / offline) runs simulation & broadcasts state.
 */
import { OGHNet } from '../../_shared/js/ogh-net.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';

const GAME_ID = 'piece-caller';
const COLS = 10;
const ROWS = 20;
const CELL = 30;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};
const TYPES = Object.keys(SHAPES);
const COLORS = {
  I: '#5ce1ff',
  O: '#ffd166',
  T: '#c4a0ff',
  S: '#5cffb0',
  Z: '#ff5c7a',
  J: '#6ba3ff',
  L: '#ff9f43',
};

const $ = (id) => document.getElementById(id);
const canvas = $('board');
const ctx = canvas.getContext('2d');
const sfx = createOghSfx();

/** @type {Awaited<ReturnType<typeof OGHNet.connect>> | null} */
let net = null;
let myRole = 'solo'; // builder | caller | solo
let running = false;
let over = false;

const state = {
  board: emptyBoard(),
  piece: null, // { type, m, x, y }
  score: 0,
  lines: 0,
  level: 1,
  dropAcc: 0,
  // call window for NEXT piece
  windowOpen: false,
  windowT: 0,
  windowDur: 1.8,
  pendingType: null, // chosen during window
  lastPick: null,
  lastPickSource: null, // caller | random
  phase: 'idle', // idle | window | falling
};

const input = { left: false, right: false, soft: false, rot: false, hard: false };
let dasAcc = 0;

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function cloneBoard(b) {
  return b.map((row) => row.slice());
}

function rotateMatrix(m) {
  const h = m.length;
  const w = m[0].length;
  const out = Array.from({ length: w }, () => Array(h).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) out[x][h - 1 - y] = m[y][x];
  }
  return out;
}

function collides(board, m, px, py) {
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (!m[y][x]) continue;
      const bx = px + x;
      const by = py + y;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  }
  return false;
}

function mergePiece(board, piece) {
  const b = cloneBoard(board);
  const { m, x, y, type } = piece;
  for (let py = 0; py < m.length; py++) {
    for (let px = 0; px < m[py].length; px++) {
      if (!m[py][px]) continue;
      const by = y + py;
      const bx = x + px;
      if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) b[by][bx] = type;
    }
  }
  return b;
}

function clearLines(board) {
  const next = board.filter((row) => row.some((c) => !c));
  const cleared = ROWS - next.length;
  while (next.length < ROWS) next.unshift(Array(COLS).fill(null));
  return { board: next, cleared };
}

function dropInterval() {
  // ms between gravity steps
  return Math.max(120, 800 - (state.level - 1) * 70);
}

function windowDuration() {
  // caller must answer in this many seconds — shrinks with level
  return Math.max(0.85, 2.1 - (state.level - 1) * 0.12);
}

function isBuilder() {
  return myRole === 'builder' || myRole === 'solo';
}
function isCaller() {
  return myRole === 'caller' || myRole === 'solo';
}

function openWindow() {
  state.windowOpen = true;
  state.windowT = 0;
  state.windowDur = windowDuration();
  state.pendingType = null;
  state.phase = 'window';
  updateCallerUi();
  broadcast();
}

function closeWindowAndSpawn() {
  let type = state.pendingType;
  let src = 'caller';
  if (!type || !TYPES.includes(type)) {
    type = TYPES[(Math.random() * TYPES.length) | 0];
    src = 'random';
  }
  state.windowOpen = false;
  state.lastPick = type;
  state.lastPickSource = src;
  state.pendingType = null;
  spawnPiece(type);
  updateCallerUi();
  if (src === 'random') sfx.play('die');
  else sfx.play('pickup');
  $('lastPick').textContent = `Last: ${type} (${src})`;
  broadcast();
}

function spawnPiece(type) {
  const m = SHAPES[type].map((r) => r.slice());
  const x = ((COLS - m[0].length) / 2) | 0;
  const y = -m.length + 1;
  state.piece = { type, m, x, y };
  state.phase = 'falling';
  state.dropAcc = 0;
  if (collides(state.board, m, x, y + (y < 0 ? 0 : 0))) {
    // check with y adjusted
  }
  // top-out if cannot place at spawn
  let sy = y;
  while (sy < 0 && collides(state.board, m, x, sy)) sy++;
  if (collides(state.board, m, x, Math.max(0, y))) {
    // try y=0
    if (collides(state.board, m, x, 0)) {
      endGame();
      return;
    }
  }
  if (collides(state.board, state.piece.m, state.piece.x, state.piece.y)) {
    // force visible check: if any filled cell overlaps or above
    const testY = 0;
    if (collides(state.board, m, x, testY)) endGame();
  }
}

function lockPiece() {
  if (!state.piece) return;
  state.board = mergePiece(state.board, state.piece);
  const { board, cleared } = clearLines(state.board);
  state.board = board;
  if (cleared) {
    state.lines += cleared;
    const pts = [0, 100, 300, 500, 800][cleared] || 800;
    state.score += pts * state.level;
    state.level = 1 + ((state.lines / 10) | 0);
    sfx.play('win');
    try {
      OGHProfile.saveProgress(
        GAME_ID,
        { score: state.score, lines: state.lines, level: state.level },
        { summary: `Score ${state.score} · Lines ${state.lines}` }
      );
    } catch { /* */ }
  } else {
    sfx.play('place');
  }
  state.piece = null;
  // open window for next — builder waits
  openWindow();
  updateHud();
  broadcast();
}

function tryMove(dx, dy) {
  if (!state.piece || !isBuilder() || over || !running) return false;
  if (state.phase !== 'falling') return false;
  const { m, x, y } = state.piece;
  const nx = x + dx;
  const ny = y + dy;
  if (!collides(state.board, m, nx, ny)) {
    state.piece.x = nx;
    state.piece.y = ny;
    return true;
  }
  return false;
}

function tryRot() {
  if (!state.piece || !isBuilder() || state.phase !== 'falling') return;
  const m = rotateMatrix(state.piece.m);
  const kicks = [0, -1, 1, -2, 2];
  for (const k of kicks) {
    if (!collides(state.board, m, state.piece.x + k, state.piece.y)) {
      state.piece.m = m;
      state.piece.x += k;
      sfx.play('tap');
      broadcast();
      return;
    }
  }
}

function hardDrop() {
  if (!state.piece || !isBuilder() || state.phase !== 'falling') return;
  while (tryMove(0, 1)) state.score += 2;
  lockPiece();
}

function endGame() {
  running = false;
  over = true;
  state.phase = 'idle';
  state.windowOpen = false;
  $('gameOver').hidden = false;
  $('goTitle').textContent = 'Top out!';
  $('goScore').textContent = `Score ${state.score} · Lines ${state.lines}`;
  sfx.play('die');
  broadcast({ over: true });
  updateCallerUi();
}

function resetGame() {
  state.board = emptyBoard();
  state.piece = null;
  state.score = 0;
  state.lines = 0;
  state.level = 1;
  state.dropAcc = 0;
  state.windowOpen = false;
  state.pendingType = null;
  state.lastPick = null;
  over = false;
  running = true;
  $('gameOver').hidden = true;
  $('startOverlay').hidden = true;
  openWindow(); // first piece
  updateHud();
  updateCallerUi();
  broadcast();
}

function updateHud() {
  $('score').textContent = String(state.score);
  $('lines').textContent = String(state.lines);
  $('level').textContent = String(state.level);
}

function updateCallerUi() {
  const open = state.windowOpen && running && !over;
  $('windowLabel').textContent = open ? 'WINDOW OPEN — PICK NOW' : 'WINDOW CLOSED';
  $('windowLabel').classList.toggle('open', open);
  $('callHint').textContent = open
    ? 'Choose the next piece before the bar empties!'
    : isCaller()
      ? 'Wait for the Builder to lock a piece…'
      : 'Caller must wait for the timing window.';
  const fill = $('windowFill');
  if (open) {
    const left = 1 - state.windowT / state.windowDur;
    fill.style.width = `${Math.max(0, left * 100)}%`;
    fill.classList.remove('closed');
  } else {
    fill.style.width = '0%';
    fill.classList.add('closed');
  }
  document.querySelectorAll('.piece-btn').forEach((btn) => {
    btn.classList.toggle('open', open && isCaller());
    btn.classList.toggle('picked', state.pendingType === btn.dataset.type);
  });
  $('builderPad').classList.toggle('disabled', !isBuilder() || !running || over || state.phase !== 'falling');
}

function draw() {
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // grid
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = state.board[y][x];
      if (t) drawCell(x, y, COLORS[t] || '#888');
      else {
        ctx.strokeStyle = 'rgba(92,225,255,0.06)';
        ctx.strokeRect(x * CELL + 0.5, y * CELL + 0.5, CELL - 1, CELL - 1);
      }
    }
  }
  if (state.piece && state.phase === 'falling') {
    // ghost
    let gy = state.piece.y;
    while (!collides(state.board, state.piece.m, state.piece.x, gy + 1)) gy++;
    drawMatrix(state.piece.m, state.piece.x, gy, COLORS[state.piece.type], 0.2);
    drawMatrix(state.piece.m, state.piece.x, state.piece.y, COLORS[state.piece.type], 1);
  }
}

function drawMatrix(m, ox, oy, color, alpha) {
  ctx.globalAlpha = alpha;
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (m[y][x] && oy + y >= 0) drawCell(ox + x, oy + y, color);
    }
  }
  ctx.globalAlpha = 1;
}

function drawCell(x, y, color) {
  const pad = 1;
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL + pad, y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x * CELL + pad, y * CELL + pad, CELL - pad * 2, 4);
}

function publicState(extra = {}) {
  return {
    board: state.board,
    piece: state.piece,
    score: state.score,
    lines: state.lines,
    level: state.level,
    windowOpen: state.windowOpen,
    windowT: state.windowT,
    windowDur: state.windowDur,
    pendingType: state.pendingType,
    lastPick: state.lastPick,
    lastPickSource: state.lastPickSource,
    phase: state.phase,
    running,
    over,
    ...extra,
  };
}

function applyRemoteState(s) {
  if (!s || isBuilder()) return; // builder owns sim
  state.board = s.board || state.board;
  state.piece = s.piece;
  state.score = s.score ?? state.score;
  state.lines = s.lines ?? state.lines;
  state.level = s.level ?? state.level;
  state.windowOpen = !!s.windowOpen;
  state.windowT = s.windowT ?? 0;
  state.windowDur = s.windowDur ?? 1.8;
  state.pendingType = s.pendingType;
  state.lastPick = s.lastPick;
  state.lastPickSource = s.lastPickSource;
  state.phase = s.phase || state.phase;
  running = !!s.running;
  over = !!s.over;
  if (s.over) {
    $('gameOver').hidden = false;
    $('goScore').textContent = `Score ${state.score} · Lines ${state.lines}`;
  }
  if (s.running) $('startOverlay').hidden = true;
  updateHud();
  updateCallerUi();
  if (state.lastPick) {
    $('lastPick').textContent = `Last: ${state.lastPick} (${state.lastPickSource || '?'})`;
  }
}

function broadcast(extra = {}) {
  if (!net || !isBuilder()) return;
  if (net.mode === 'online') {
    net.send('state', publicState(extra));
  }
}

function assignRoles() {
  if (!net || net.mode !== 'online') {
    myRole = 'solo';
  } else {
    // host / first = builder
    myRole = net.isHost ? 'builder' : 'caller';
  }
  const labels = { builder: 'Builder', caller: 'Caller', solo: 'Solo (both)' };
  $('rolePill').textContent = labels[myRole] || myRole;
  updateCallerUi();
}

// pieces UI
function buildPieceButtons() {
  const el = $('pieces');
  el.innerHTML = '';
  for (const t of TYPES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'piece-btn';
    b.dataset.type = t;
    b.textContent = t;
    b.style.color = COLORS[t];
    b.addEventListener('click', () => onPick(t));
    el.appendChild(b);
  }
}

function onPick(type) {
  if (!isCaller() || !running || over) return;
  if (!state.windowOpen) {
    sfx.play('die');
    $('callHint').textContent = 'Too early / too late — wait for the green window!';
    return;
  }
  state.pendingType = type;
  sfx.play('tap');
  updateCallerUi();
  if (net?.mode === 'online' && myRole === 'caller') {
    net.send('pick', { type, t: Date.now() });
  }
  // solo: applied immediately as pending until window ends — or instant lock-in?
  // Keep pending until window ends so timing still matters (must click during window)
}

// builder keys / pad
function bindBuilder() {
  const acts = {
    left: () => tryMove(-1, 0) && broadcast(),
    right: () => tryMove(1, 0) && broadcast(),
    rot: () => tryRot(),
    soft: () => {
      if (tryMove(0, 1)) {
        state.score += 1;
        updateHud();
        broadcast();
      } else lockPiece();
    },
    hard: () => hardDrop(),
  };
  document.querySelectorAll('#builderPad [data-act]').forEach((btn) => {
    const act = btn.getAttribute('data-act');
    const fire = (e) => {
      e.preventDefault();
      sfx.unlock();
      acts[act]?.();
    };
    btn.addEventListener('click', fire);
  });
  window.addEventListener('keydown', (e) => {
    if (!isBuilder()) return;
    const map = {
      ArrowLeft: 'left',
      a: 'left',
      A: 'left',
      ArrowRight: 'right',
      d: 'right',
      D: 'right',
      ArrowUp: 'rot',
      w: 'rot',
      W: 'rot',
      ArrowDown: 'soft',
      s: 'soft',
      S: 'soft',
      ' ': 'hard',
    };
    const a = map[e.key];
    if (a) {
      e.preventDefault();
      acts[a]();
    }
  });
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (running && !over && isBuilder()) {
    if (state.phase === 'window' && state.windowOpen) {
      state.windowT += dt;
      updateCallerUi();
      // light broadcast of window progress
      if ((state.windowT * 10) | 0 !== ((state.windowT - dt) * 10) | 0) broadcast();
      if (state.windowT >= state.windowDur) {
        closeWindowAndSpawn();
      }
    } else if (state.phase === 'falling' && state.piece) {
      state.dropAcc += dt * 1000;
      const iv = dropInterval();
      while (state.dropAcc >= iv) {
        state.dropAcc -= iv;
        if (!tryMove(0, 1)) {
          lockPiece();
          break;
        } else {
          broadcast();
        }
      }
    }
  } else if (running && !over && !isBuilder() && state.windowOpen) {
    // caller: animate bar from remote windowT if host sends; else local estimate
    updateCallerUi();
  }

  draw();
  requestAnimationFrame(loop);
}

function setNetLine() {
  const el = $('netLine');
  if (!net) return;
  if (net.mode === 'online') {
    el.textContent = `ONLINE · room ${net.room} · ${net.players?.length || 1} player(s)`;
    el.className = 'net on';
  } else {
    el.textContent = 'OFFLINE solo practice (both roles) · start PC host for 2P';
    el.className = 'net off';
  }
}

$('btnStart').addEventListener('click', () => {
  sfx.unlock();
  assignRoles();
  if (net?.mode === 'online' && !net.isHost && myRole === 'caller') {
    // non-host waits for host to start
    net.send('ready-start', { name: OGHProfile.getNickname() });
    $('startNote').textContent = 'Waiting for Builder (host) to start…';
    // if host already running, host will broadcast
  }
  if (isBuilder()) {
    resetGame();
    if (net?.mode === 'online') net.send('start-game', { t: Date.now() });
  } else if (myRole === 'solo') {
    resetGame();
  }
});

$('btnAgain').addEventListener('click', () => {
  if (isBuilder() || myRole === 'solo') resetGame();
  else $('startNote').textContent = 'Wait for Builder to restart';
});

(async () => {
  buildPieceButtons();
  bindBuilder();
  net = await OGHNet.connect({
    gameId: GAME_ID,
    name: OGHProfile.getNickname(),
  });
  assignRoles();
  setNetLine();
  $('startNote').textContent =
    net.mode === 'online'
      ? net.isHost
        ? 'You are Builder. Wait for a friend, then Start.'
        : 'You are Caller. Wait for Builder to Start.'
      : 'Solo: you call and build. Host for real 2P.';

  net.on('mode', () => {
    assignRoles();
    setNetLine();
  });
  net.on('players', () => setNetLine());
  net.on('hello', () => {
    assignRoles();
    setNetLine();
  });

  net.on('action', ({ action, payload, from }) => {
    if (action === 'pick' && isBuilder() && from !== net.playerId) {
      if (state.windowOpen && payload?.type && TYPES.includes(payload.type)) {
        state.pendingType = payload.type;
        updateCallerUi();
        broadcast();
      }
    }
    if (action === 'state' && !isBuilder()) {
      applyRemoteState(payload);
    }
    if (action === 'start-game' && !isBuilder()) {
      // caller: wait for state stream
      $('startOverlay').hidden = true;
      running = true;
      over = false;
    }
    if (action === 'ready-start' && isBuilder() && !running) {
      $('startNote').textContent = `${payload?.name || 'Caller'} is ready — press Start.`;
    }
  });

  // Host also receives own send only offline via local — state goes to others
  // Builder sends state as action 'state' — caller applies

  requestAnimationFrame(loop);
  updateCallerUi();
  updateHud();
  draw();
})();
