/**
 * app.js — Klondike Solitaire: state, rendering, and input.
 *
 * Rendering architecture: all 52 card DOM elements are built ONCE
 * (initBoard) and kept for the whole session, keyed by a stable card id.
 * render() never creates/destroys elements — it just recomputes, for every
 * card in the current state, which zone it belongs to and repositions it
 * (inline left/top in logical px). Because position changes go through the
 * CSS `transition` on .sol-card (see style.css), every state-driven move —
 * including the very first deal — animates for free.
 *
 * Input: one unified Pointer Events state machine (pointerdown/move/up),
 * not HTML5 drag-and-drop. A press that stays under DRAG_THRESHOLD_PX and
 * releases is a *tap* (drives tap-to-select-then-tap-to-place); a press
 * that moves past the threshold becomes a *drag*. Both paths resolve their
 * target the same way (resolveHit + document.elementFromPoint), so drag
 * and tap share the exact same move-legality code in rules.js.
 */
import { makeDeck, shuffle, buildCardElement } from './cards.js';
import {
  BOARD_W, BOARD_H, STOCK_SLOT, WASTE_SLOT, FOUNDATION_SLOTS,
  FOUNDATION_SUIT_ORDER, tableauSlot, tableauOffsets,
} from './layout.js';
import {
  isWin, canAutoFinish, findAutoFinishMove,
  getMovableCards, validateMove, removeFromSource,
} from './rules.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';

const sfx = createOghSfx();

// ---- DOM refs -------------------------------------------------------------
const board = document.getElementById('board');
const stage = document.querySelector('.sol-stage');
const slotStockEl = document.getElementById('slotStock');
const movesVal = document.getElementById('movesVal');
const timeVal = document.getElementById('timeVal');
const btnUndo = document.getElementById('btnUndo');
const btnNew = document.getElementById('btnNew');
const btnAutoFinish = document.getElementById('btnAutoFinish');
const btnDraw = document.getElementById('btnDraw');
const btnPlayAgain = document.getElementById('btnPlayAgain');
const langSwitchEl = document.getElementById('langSwitch');
const winOverlay = document.getElementById('winOverlay');
const winStatsLine = document.getElementById('winStatsLine');

const DRAG_THRESHOLD_PX = 6;
const MAX_HISTORY = 200;

// ---- persistent per-card DOM elements --------------------------------
const cardEls = new Map();
function initSlots() {
  const place = (el, { x, y }) => {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  };
  place(document.getElementById('slotStock'), STOCK_SLOT);
  place(document.getElementById('slotWaste'), WASTE_SLOT);
  for (const suit of FOUNDATION_SUIT_ORDER) {
    place(document.getElementById(`slotF-${suit}`), FOUNDATION_SLOTS[suit]);
  }
  for (let col = 0; col < 7; col++) {
    place(document.getElementById(`slotT-${col}`), tableauSlot(col));
  }
}

function initBoard() {
  board.style.width = `${BOARD_W}px`;
  board.style.height = `${BOARD_H}px`;
  initSlots();
  for (const card of makeDeck()) {
    const el = buildCardElement(card);
    // Start every card at the stock slot so the very first deal (and any
    // later "New game" redeal) animates via the position transition
    // instead of just popping into place.
    el.style.left = `${STOCK_SLOT.x}px`;
    el.style.top = `${STOCK_SLOT.y}px`;
    el.style.zIndex = '1';
    board.appendChild(el);
    cardEls.set(card.id, el);
  }
}

// ---- scale-to-fit (no scrolling, ever) --------------------------------
let currentScale = 1;
function fitBoard() {
  const availW = stage.clientWidth;
  const availH = stage.clientHeight;
  if (!availW || !availH) return;
  currentScale = Math.min(availW / BOARD_W, availH / BOARD_H, 1.5) * 0.97;
  board.style.transform = `scale(${currentScale})`;
}
if (typeof ResizeObserver === 'function') {
  new ResizeObserver(fitBoard).observe(stage);
}
// Belt-and-suspenders alongside ResizeObserver (which alone covers every
// real case: window resize, orientation change, and on-screen-keyboard
// insets all change the stage's own box and are covered by observing it
// directly) — window-level listeners cost nothing and guard against any
// environment where the stage's box changes without a ResizeObserver
// notification reaching it.
window.addEventListener('resize', fitBoard);
window.addEventListener('orientationchange', fitBoard);

// ---- game state ---------------------------------------------------------
/** @type {any} */
let state = null;
let history = [];
let selected = null; // {type:'waste'} | {type:'tableau', col, index}
let selectedEls = null;
let isAutoRunning = false;
let timerHandle = null;

function loadDrawPref() {
  try {
    return Number(localStorage.getItem('ogh_solitaire_draw')) === 3 ? 3 : 1;
  } catch {
    return 1;
  }
}
function saveDrawPref(v) {
  try { localStorage.setItem('ogh_solitaire_draw', String(v)); } catch { /* ignore */ }
}

function cloneState(s) {
  if (typeof structuredClone === 'function') return structuredClone(s);
  return JSON.parse(JSON.stringify(s));
}

function newGame() {
  cancelGesture();
  clearSelection();
  isAutoRunning = false;

  const deck = shuffle(makeDeck());
  const tableau = [[], [], [], [], [], [], []];
  let p = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      tableau[col].push({ card: deck[p], faceUp: row === col });
      p++;
    }
  }
  const stock = deck.slice(p);

  history = [];
  state = {
    drawCount: state ? state.drawCount : loadDrawPref(),
    stock,
    waste: [],
    foundations: { S: [], H: [], D: [], C: [] },
    tableau,
    moveCount: 0,
    won: false,
    startedAt: Date.now(),
  };

  hideWinOverlay();
  restartTimer();
  render();
}

// ---- rendering ------------------------------------------------------------
function positionCard(el, x, y, faceUp, z) {
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.zIndex = String(z);
  el.classList.toggle('is-facedown', !faceUp);
}

function render() {
  let z = 10;

  for (const card of state.stock) {
    const el = cardEls.get(card.id);
    positionCard(el, STOCK_SLOT.x, STOCK_SLOT.y, false, z++);
    el.dataset.zone = 'stock';
  }
  slotStockEl.classList.toggle('has-recycle', state.stock.length === 0 && state.waste.length > 0);

  for (const card of state.waste) {
    const el = cardEls.get(card.id);
    positionCard(el, WASTE_SLOT.x, WASTE_SLOT.y, true, z++);
    el.dataset.zone = 'waste';
  }

  for (const suit of FOUNDATION_SUIT_ORDER) {
    const slot = FOUNDATION_SLOTS[suit];
    for (const card of state.foundations[suit]) {
      const el = cardEls.get(card.id);
      positionCard(el, slot.x, slot.y, true, z++);
      el.dataset.zone = 'foundation';
      el.dataset.suit = suit;
    }
  }

  state.tableau.forEach((column, col) => {
    const slot = tableauSlot(col);
    const offsets = tableauOffsets(column);
    column.forEach((entry, i) => {
      const el = cardEls.get(entry.card.id);
      positionCard(el, slot.x, slot.y + offsets[i], entry.faceUp, z++);
      el.dataset.zone = 'tableau';
      el.dataset.col = String(col);
      el.dataset.index = String(i);
      el.dataset.faceup = entry.faceUp ? '1' : '0';
    });
  });

  refreshButtons();
}

function refreshButtons() {
  btnUndo.disabled = state.won || history.length === 0;
  const autoEligible = !state.won && canAutoFinish(state);
  btnAutoFinish.hidden = !autoEligible;
  btnAutoFinish.disabled = isAutoRunning;
  movesVal.textContent = String(state.moveCount);
  updateDrawButton();
}

function updateDrawButton() {
  btnDraw.textContent = `${t(currentLang, 'drawLabel')} ${state.drawCount}`;
}

// ---- hit resolution ---------------------------------------------------
/** Normalize a DOM element (or null) under a pointer into a logical zone
 * hit. Cards win over slots automatically via normal paint-order hit
 * testing (cards always carry z-index >= 10, slots have none), so no
 * pointer-events tricks are needed either way. */
function resolveHit(el) {
  if (!el || typeof el.closest !== 'function') return { zone: 'none' };
  const cardEl = el.closest('.sol-card');
  if (cardEl && board.contains(cardEl)) {
    const zone = cardEl.dataset.zone;
    if (zone === 'tableau') {
      return {
        zone, el: cardEl,
        col: Number(cardEl.dataset.col),
        index: Number(cardEl.dataset.index),
        faceUp: cardEl.dataset.faceup === '1',
      };
    }
    if (zone === 'foundation') return { zone, el: cardEl, suit: cardEl.dataset.suit };
    if (zone === 'waste' || zone === 'stock') return { zone, el: cardEl };
    return { zone: 'none' };
  }
  const slotEl = el.closest('.sol-slot');
  if (slotEl && board.contains(slotEl)) {
    const zone = slotEl.dataset.zone;
    if (zone === 'tableau') return { zone, el: slotEl, col: Number(slotEl.dataset.col) };
    if (zone === 'foundation') return { zone, el: slotEl, suit: slotEl.dataset.suit };
    if (zone === 'stock') return { zone, el: slotEl };
    return { zone: 'none' }; // empty waste slot: never a valid source or destination
  }
  return { zone: 'none' };
}

function toSourceInfo(hit) {
  if (hit.zone === 'waste') return { type: 'waste' };
  if (hit.zone === 'tableau') return { type: 'tableau', col: hit.col, index: hit.index };
  return null;
}

function toDestSlot(hit) {
  if (hit.zone === 'tableau') return { type: 'tableau', col: hit.col };
  if (hit.zone === 'foundation') return { type: 'foundation', suit: hit.suit };
  return null;
}

function isDraggableSource(hit) {
  if (!state || state.won) return false;
  if (hit.zone === 'waste') return state.waste.length > 0;
  if (hit.zone === 'tableau') return hit.faceUp === true;
  return false;
}

function isSameSource(sel, hit) {
  if (!sel) return false;
  if (sel.type === 'waste') return hit.zone === 'waste';
  if (sel.type === 'tableau') return hit.zone === 'tableau' && hit.col === sel.col && hit.index === sel.index;
  return false;
}

// ---- selection (tap-to-select-then-tap-to-place) -----------------------
function selectSource(sourceInfo) {
  const cards = getMovableCards(state, sourceInfo);
  if (!cards) return;
  const ids = cards.map((c) => c.id);
  selected = sourceInfo;
  selectedEls = ids.map((id) => cardEls.get(id));
  selectedEls.forEach((el) => el.classList.add('is-selected'));
}

function clearSelection() {
  if (selectedEls) selectedEls.forEach((el) => el.classList.remove('is-selected'));
  selected = null;
  selectedEls = null;
}

// ---- drop highlight (live preview while dragging) -----------------------
let highlightEl = null;
function setHighlight(el) {
  if (highlightEl === el) return;
  if (highlightEl) highlightEl.classList.remove('is-drop-ok');
  highlightEl = el || null;
  if (highlightEl) highlightEl.classList.add('is-drop-ok');
}
function clearHighlight() { setHighlight(null); }

// ---- move commit ----------------------------------------------------------
function pushHistory() {
  history.push(cloneState(state));
  if (history.length > MAX_HISTORY) history.shift();
}

function tryMove(source, destSlot) {
  if (!state || state.won) return false;
  const cards = getMovableCards(state, source);
  if (!validateMove(state, source, destSlot, cards)) return false;
  pushHistory();
  removeFromSource(state, source);
  if (destSlot.type === 'foundation') {
    state.foundations[destSlot.suit].push(cards[0]);
  } else {
    const col = state.tableau[destSlot.col];
    for (const card of cards) col.push({ card, faceUp: true });
  }
  afterMove();
  return true;
}

function afterMove() {
  state.moveCount++;
  sfx.play('place');
  render();
  checkWin();
}

function handleStockTap() {
  if (!state || state.won) return;
  if (!state.stock.length && !state.waste.length) return;
  pushHistory();
  if (!state.stock.length) {
    state.stock = state.waste.slice().reverse();
    state.waste = [];
    sfx.play('pickup');
  } else {
    const n = Math.min(state.drawCount, state.stock.length);
    for (let i = 0; i < n; i++) state.waste.push(state.stock.pop());
    sfx.play('tap');
  }
  state.moveCount++;
  render();
}

function undo() {
  if (!history.length || (state && state.won)) return;
  clearSelection();
  state = history.pop();
  render();
}

// ---- win / auto-finish ----------------------------------------------------
function checkWin() {
  if (!state.won && isWin(state.foundations)) {
    state.won = true;
    if (timerHandle) clearInterval(timerHandle);
    sfx.play('win');
    showWinOverlay();
  }
  refreshButtons();
}

function showWinOverlay() {
  const secs = Math.floor((Date.now() - state.startedAt) / 1000);
  winStatsLine.textContent = t(currentLang, 'winStats', { moves: state.moveCount, time: formatTime(secs) });
  winOverlay.hidden = false;
}
function hideWinOverlay() { winOverlay.hidden = true; }

function startAutoFinish() {
  if (!state || isAutoRunning || state.won) return;
  isAutoRunning = true;
  refreshButtons();
  autoFinishStep();
}
function autoFinishStep() {
  if (!isAutoRunning) return; // cancelled (e.g. New game started mid-cascade)
  const move = findAutoFinishMove(state);
  if (!move) {
    isAutoRunning = false;
    refreshButtons();
    return;
  }
  tryMove(move.source, move.destSlot);
  if (!state || state.won) {
    isAutoRunning = false;
    refreshButtons();
    return;
  }
  setTimeout(autoFinishStep, 130);
}

// ---- timer ------------------------------------------------------------
function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}
function updateTimerDisplay() {
  if (!state) return;
  timeVal.textContent = formatTime(Math.floor((Date.now() - state.startedAt) / 1000));
}
function restartTimer() {
  if (timerHandle) clearInterval(timerHandle);
  updateTimerDisplay();
  timerHandle = setInterval(updateTimerDisplay, 1000);
}

// ---- pointer gesture state machine (drag AND tap-to-place share this) ----
let gesture = null;

function cancelGesture() {
  if (gesture && gesture.dragEls) {
    gesture.dragEls.forEach((el) => { el.classList.remove('is-dragging'); el.style.pointerEvents = ''; });
    clearHighlight();
  }
  gesture = null;
}

function onPointerDown(e) {
  if (gesture) return; // ignore a second simultaneous pointer
  if (e.button != null && e.button !== 0) return;
  if (!state || state.won) return;
  gesture = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    moved: false,
    hit: resolveHit(e.target),
    dragEls: null,
    sourceInfo: null,
    baseLefts: null,
    baseTops: null,
  };
}

function onPointerMove(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  const dx = e.clientX - gesture.startX;
  const dy = e.clientY - gesture.startY;

  if (!gesture.moved) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    gesture.moved = true;
    if (isDraggableSource(gesture.hit)) {
      const sourceInfo = toSourceInfo(gesture.hit);
      const cards = getMovableCards(state, sourceInfo);
      if (cards) {
        clearSelection();
        gesture.sourceInfo = sourceInfo;
        gesture.dragEls = cards.map((c) => cardEls.get(c.id));
        gesture.baseLefts = gesture.dragEls.map((el) => parseFloat(el.style.left));
        gesture.baseTops = gesture.dragEls.map((el) => parseFloat(el.style.top));
        gesture.dragEls.forEach((el, i) => {
          el.classList.add('is-dragging');
          el.style.zIndex = String(3000 + i);
          el.style.pointerEvents = 'none';
        });
      }
    }
  }

  if (gesture.dragEls) {
    const ldx = dx / currentScale;
    const ldy = dy / currentScale;
    gesture.dragEls.forEach((el, i) => {
      el.style.left = `${gesture.baseLefts[i] + ldx}px`;
      el.style.top = `${gesture.baseTops[i] + ldy}px`;
    });

    const under = document.elementFromPoint(e.clientX, e.clientY);
    const hit = resolveHit(under);
    const destSlot = toDestSlot(hit);
    const cards = getMovableCards(state, gesture.sourceInfo); // state not yet mutated — safe to re-derive each tick
    const ok = destSlot ? validateMove(state, gesture.sourceInfo, destSlot, cards) : false;
    setHighlight(ok ? hit.el : null);
  }
}

function endDrag(g, e) {
  clearHighlight();
  if (!g.dragEls) return; // moved, but never over a draggable source — nothing to release
  const under = document.elementFromPoint(e.clientX, e.clientY);
  const hit = resolveHit(under);
  g.dragEls.forEach((el) => {
    el.classList.remove('is-dragging');
    el.style.pointerEvents = '';
  });
  const destSlot = toDestSlot(hit);
  const success = destSlot ? tryMove(g.sourceInfo, destSlot) : false;
  if (!success) render(); // re-assert current (unchanged) positions -> smooth snap-back via the CSS transition
}

function handleTap(g, e) {
  if (!state || state.won) return;
  const under = document.elementFromPoint(e.clientX, e.clientY) || (g.hit && g.hit.el);
  const hit = resolveHit(under);

  if (hit.zone === 'stock') {
    clearSelection();
    handleStockTap();
    return;
  }

  if (selected) {
    if (isSameSource(selected, hit)) { clearSelection(); return; }
    const destSlot = toDestSlot(hit);
    const success = destSlot ? tryMove(selected, destSlot) : false;
    clearSelection();
    if (!success && isDraggableSource(hit)) selectSource(toSourceInfo(hit));
    return;
  }

  if (isDraggableSource(hit)) selectSource(toSourceInfo(hit));
}

function onPointerUp(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  const g = gesture;
  gesture = null;
  if (g.moved) endDrag(g, e);
  else handleTap(g, e);
}

function onPointerCancelEvt(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  cancelGesture();
  render();
}

board.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerCancelEvt);

// ---- i18n wiring ------------------------------------------------------
let currentLang = detectLang();

function buildLangSwitch() {
  langSwitchEl.innerHTML = '';
  for (const lang of LANGS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `lang-btn${lang === currentLang ? ' is-on' : ''}`;
    btn.textContent = LANG_LABELS[lang];
    btn.setAttribute('aria-pressed', lang === currentLang ? 'true' : 'false');
    btn.addEventListener('click', () => setLang(lang));
    langSwitchEl.appendChild(btn);
  }
}

function setLang(lang) {
  currentLang = lang;
  rememberLang(lang);
  applyStaticStrings(lang);
  buildLangSwitch();
  refreshButtons();
  if (state && state.won) showWinOverlay();
}

// ---- keyboard shortcuts (bonus alongside touch/mouse, not a full input
// path — you can't select/move a card by keyboard alone) -----------------
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); return; }
  if (k === 'u') { undo(); return; }
  if (k === 'n') { newGame(); }
});

// ---- button wiring ------------------------------------------------------
btnUndo.addEventListener('click', undo);
btnNew.addEventListener('click', newGame);
btnPlayAgain.addEventListener('click', newGame);
btnAutoFinish.addEventListener('click', startAutoFinish);
btnDraw.addEventListener('click', () => {
  if (!state) return;
  state.drawCount = state.drawCount === 1 ? 3 : 1;
  saveDrawPref(state.drawCount);
  updateDrawButton();
});

// ---- debug/test hook, same convention as sibling games (e.g.
// games/pop-the-bugs' window.OGH_POP_BUGS) — also what the hub's manual
// test pass uses to reach a near-win state without playing a full game. ---
window.OGH_SOLITAIRE = {
  getState: () => state,
  setState(patch) {
    Object.assign(state, patch);
    render();
    checkWin();
  },
  newGame,
  undo,
  tryMove,
  fitBoard,
  render,
  /** Jump to two cards away from winning: D and C fully on their
   * foundations, S and H missing only the King (still in the tableau,
   * face-up). Lets a manual test trigger the real win path in one or two
   * moves instead of playing an entire game. */
  forceNearWin() {
    const deck = makeDeck();
    const bySuit = { S: [], H: [], D: [], C: [] };
    for (const c of deck) bySuit[c.suit].push(c);
    history = [];
    state = {
      drawCount: state ? state.drawCount : loadDrawPref(),
      stock: [],
      waste: [],
      foundations: {
        S: bySuit.S.slice(0, 12),
        H: bySuit.H.slice(0, 12),
        D: bySuit.D.slice(),
        C: bySuit.C.slice(),
      },
      tableau: [
        [{ card: bySuit.S[12], faceUp: true }],
        [{ card: bySuit.H[12], faceUp: true }],
        [], [], [], [], [],
      ],
      moveCount: state ? state.moveCount : 0,
      won: false,
      startedAt: state ? state.startedAt : Date.now(),
    };
    hideWinOverlay();
    render();
  },
};

// ---- kickoff --------------------------------------------------------------
initBoard();
fitBoard();
applyStaticStrings(currentLang);
buildLangSwitch();
newGame();
