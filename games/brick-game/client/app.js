/**
 * app.js — the Brick Game shell. Owns the one LCD canvas, the render/update
 * loop, the menu <-> game switching, all shared overlays (start blurb + game
 * over results), the HUD readout, the flash banner, per-sub-game best scores
 * (via OGHProfile — one key per game, so they never overwrite each other) and
 * i18n. The three games and the menu are pluggable "screens" that just expose
 * update/draw/onDir/onAction; this file routes the handheld's D-pad, A button,
 * MENU button, keyboard and canvas drags to whichever is active.
 *
 * RTL note: the document flips for Arabic so the header/hint/menu/overlay/HUD
 * text mirror — but the play field (canvas, forced dir=ltr in lcd.js) and the
 * D-pad control cluster (dir="ltr" in the markup) never do. See i18n.js.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import { Lcd } from './lcd.js';
import { createMenu } from './menu.js';
import { TANKS } from './tanks.js';
import { SNAKE } from './snake.js';
import { ARKANOID } from './arkanoid.js';

const $ = (id) => document.getElementById(id);

const GAMES = [TANKS, SNAKE, ARKANOID];
const DESCS = Object.fromEntries(GAMES.map((g) => [g.id, g]));

const sfx = createOghSfx();
let lang = detectLang();

const lcd = new Lcd($('screen'));

let mode = 'menu'; // menu | start | play | over
let activeDesc = null;
let activeGame = null;
let lastOver = null; // remember the last results for lang re-render

/* ---- best-score persistence (independent key per sub-game) ------------ */
function getBest(id) {
  const p = OGHProfile.getProgress(id);
  const n = Number(p && p.best);
  return Number.isFinite(n) ? n : 0;
}
function saveBest(id, score, label) {
  const best = getBest(id);
  if (score > best) {
    OGHProfile.saveProgress(id, { best: score }, { label, summary: `Best ${score}` });
    return { best: score, isNew: true };
  }
  return { best, isNew: false };
}

/* ---- DOM refs --------------------------------------------------------- */
const screenEl = $('screen');
const menuEl = $('menu');
const hudEl = $('hud');
const bannerEl = $('banner');
const startCard = $('startCard');
const overCard = $('overCard');
const hintEl = $('hint');

/* ---- banner ----------------------------------------------------------- */
function showBanner(text) {
  bannerEl.textContent = text;
  bannerEl.classList.remove('is-show');
  void bannerEl.offsetWidth; // restart the animation on rapid repeat
  bannerEl.classList.add('is-show');
}
bannerEl.addEventListener('animationend', () => bannerEl.classList.remove('is-show'));

/* ---- env handed to each game ----------------------------------------- */
function makeEnv(desc) {
  return {
    sfx,
    t: (key, vars) => t(lang, key, vars),
    getBest: () => getBest(desc.id),
    gameOver: (payload) => handleGameOver(desc, payload),
    banner: (text) => showBanner(text),
  };
}

/* ---- HUD -------------------------------------------------------------- */
let hudValueEls = [];
function buildHud() {
  hudEl.innerHTML = '';
  hudValueEls = [];
  if (!activeGame) { hudEl.hidden = true; return; }
  hudEl.hidden = false;
  for (const item of activeGame.hud()) {
    const pill = document.createElement('span');
    pill.className = 'bg-pill';
    const k = document.createElement('span');
    k.className = 'k';
    k.textContent = item.label;
    const v = document.createElement('span');
    v.className = 'v';
    v.textContent = item.value;
    pill.append(k, v);
    hudEl.appendChild(pill);
    hudValueEls.push(v);
  }
}
function updateHudValues() {
  if (!activeGame || hudEl.hidden) return;
  const items = activeGame.hud();
  for (let i = 0; i < items.length && i < hudValueEls.length; i++) {
    const s = String(items[i].value);
    if (hudValueEls[i].textContent !== s) hudValueEls[i].textContent = s;
  }
}

/* ---- screen switching ------------------------------------------------- */
function showMenu() {
  mode = 'menu';
  activeGame = null;
  activeDesc = null;
  lastOver = null;
  startCard.hidden = true;
  overCard.hidden = true;
  screenEl.hidden = true;
  menuEl.hidden = false;
  hudEl.hidden = true;
  menu.refreshBest();
  requestAnimationFrame(() => menu.renderIcons());
  setHint();
}

function launch(id) {
  const desc = DESCS[id];
  if (!desc) return;
  sfx.unlock();
  sfx.play('tap');
  activeDesc = desc;
  activeGame = desc.create(makeEnv(desc));
  menuEl.hidden = true;
  screenEl.hidden = false;
  lcd.setGrid(activeGame.cols, activeGame.rows);
  lcd.resize();
  activeGame.start();
  buildHud();
  showStartCard(desc);
}

function showStartCard(desc) {
  mode = 'start';
  $('startTitle').textContent = t(lang, desc.nameKey);
  $('startBlurb').textContent = t(lang, desc.blurbKey);
  $('startControls').textContent = t(lang, desc.controlsKey);
  $('startBest').textContent = `${t(lang, 'bestShort')}: ${getBest(desc.id)}`;
  $('startBtn').textContent = t(lang, 'startPrompt');
  overCard.hidden = true;
  startCard.hidden = false;
  setHint();
}

function beginPlay() {
  startCard.hidden = true;
  overCard.hidden = true;
  mode = 'play';
  showBanner(t(lang, 'readyBanner'));
  setHint();
}

function handleGameOver(desc, { score, isWin, subKey }) {
  const { best, isNew } = saveBest(desc.id, score, t('en', desc.nameKey));
  lastOver = { desc, score, best, isNew, isWin, subKey };
  mode = 'over';
  renderOverCard();
  setHint();
}

function renderOverCard() {
  if (!lastOver) return;
  const { score, best, isNew, isWin, subKey } = lastOver;
  $('overTitle').textContent = isWin ? t(lang, 'win') : t(lang, 'gameOver');
  $('overSub').textContent = t(lang, subKey);
  $('overScore').textContent = `${t(lang, 'finalScore')}: ${score}`;
  $('overBest').textContent = `${t(lang, 'bestShort')}: ${best}`;
  $('overNew').hidden = !isNew;
  $('overNew').textContent = t(lang, 'newBest');
  $('overAgain').textContent = t(lang, 'playAgain');
  $('overMenu').textContent = t(lang, 'toMenu');
  startCard.hidden = true;
  overCard.hidden = false;
}

function replay() {
  if (!activeGame) return showMenu();
  activeGame.start();
  buildHud();
  beginPlay();
}

/* ---- input routing ---------------------------------------------------- */
function onDir(dir, pressed) {
  if (mode === 'menu') {
    if (pressed && dir === 'up') menu.move(-1);
    else if (pressed && dir === 'down') menu.move(1);
    return;
  }
  if (mode === 'play' && activeGame) activeGame.onDir(dir, pressed);
}

function onPrimary() {
  sfx.unlock();
  if (mode === 'menu') { menu.activate(); return; }
  if (mode === 'start') { beginPlay(); return; }
  if (mode === 'over') { replay(); return; }
  if (mode === 'play' && activeGame) activeGame.onAction(true);
}
function onPrimaryUp() {
  if (mode === 'play' && activeGame) activeGame.onAction(false);
}

function onMenuBtn() {
  sfx.unlock();
  if (mode === 'menu') return;
  sfx.play('tap');
  showMenu();
}

/* ---- pointer on the canvas (Breakout drag) ---------------------------- */
function setupPointer() {
  const forward = (phase) => (e) => {
    if (mode !== 'play' || !activeGame || !activeGame.onPointer) return;
    const p = lcd.clientToDot(e.clientX, e.clientY);
    if (!p && phase === 'down') return;
    e.preventDefault();
    sfx.unlock();
    activeGame.onPointer({ phase, x: p ? p.x : 0, y: p ? p.y : 0 });
  };
  screenEl.addEventListener('pointerdown', forward('down'));
  screenEl.addEventListener('pointermove', (e) => { if (e.buttons) forward('move')(e); });
  screenEl.addEventListener('pointerup', forward('up'));
}

/* ---- touch buttons ---------------------------------------------------- */
function setupTouch() {
  const bindHold = (el, onDown, onUp) => {
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      sfx.unlock();
      el.classList.add('is-active');
      onDown();
    });
    const end = (e) => {
      e.stopPropagation();
      el.classList.remove('is-active');
      onUp();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);
  };

  bindHold($('btnUp'), () => onDir('up', true), () => onDir('up', false));
  bindHold($('btnDown'), () => onDir('down', true), () => onDir('down', false));
  bindHold($('btnLeft'), () => onDir('left', true), () => onDir('left', false));
  bindHold($('btnRight'), () => onDir('right', true), () => onDir('right', false));
  bindHold($('btnA'), () => onPrimary(), () => onPrimaryUp());
  $('btnMenu').addEventListener('click', onMenuBtn);

  // Overlay primary buttons.
  $('startBtn').addEventListener('click', () => { sfx.unlock(); beginPlay(); });
  $('overAgain').addEventListener('click', () => { sfx.unlock(); replay(); });
  $('overMenu').addEventListener('click', () => { sfx.unlock(); showMenu(); });
}

/* ---- keyboard --------------------------------------------------------- */
const downKeys = new Set();
function setupKeyboard() {
  const dirOf = (k) => {
    if (k === 'ArrowUp' || k === 'w' || k === 'W') return 'up';
    if (k === 'ArrowDown' || k === 's' || k === 'S') return 'down';
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'left';
    if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'right';
    return null;
  };
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
    if (downKeys.has(k)) return; // ignore auto-repeat — we want edges
    downKeys.add(k);
    const dir = dirOf(k);
    if (dir) { onDir(dir, true); return; }
    if (k === ' ' || k === 'Enter' || k === 'z' || k === 'Z') { onPrimary(); return; }
    if (k === 'Escape' || k === 'm' || k === 'M' || k === 'Backspace') { onMenuBtn(); return; }
    if (mode === 'menu' && '123'.includes(k)) launch(GAMES[Number(k) - 1].id);
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key;
    downKeys.delete(k);
    const dir = dirOf(k);
    if (dir) { onDir(dir, false); return; }
    if (k === ' ' || k === 'Enter' || k === 'z' || k === 'Z') onPrimaryUp();
  });
}

/* ---- hint / i18n ------------------------------------------------------ */
function setHint() {
  let key = 'hintMenu';
  if (activeDesc && mode !== 'menu') key = activeDesc.hintKey;
  hintEl.textContent = t(lang, key);
}

function buildLangSwitch() {
  const wrap = $('langSwitch');
  wrap.innerHTML = '';
  LANGS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `lang-btn${l === lang ? ' is-on' : ''}`;
    b.textContent = LANG_LABELS[l];
    b.addEventListener('click', () => applyLang(l));
    wrap.appendChild(b);
  });
}

function applyLang(l) {
  lang = l;
  applyStaticStrings(lang);
  document.title = `${t(lang, 'title')} — OGH`;
  buildLangSwitch();
  menu.setLang();
  setHint();
  if (activeGame) buildHud();
  if (mode === 'over') renderOverCard();
  if (mode === 'start' && activeDesc) showStartCard(activeDesc);
  rememberLang(lang);
  lcd.resize();
}

/* ---- main loop -------------------------------------------------------- */
let lastNow = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;
  if (mode === 'play' && activeGame) activeGame.update(dt);
  if (activeGame && !screenEl.hidden) {
    lcd.clear();
    activeGame.draw(lcd);
    lcd.paint();
  }
  updateHudValues();
  requestAnimationFrame(loop);
}

/* ---- menu instance ---------------------------------------------------- */
const menu = createMenu(menuEl, GAMES, {
  t: (key, vars) => t(lang, key, vars),
  getBest,
  onLaunch: launch,
});

/* ---- boot ------------------------------------------------------------- */
function init() {
  lcd.resize();
  setupTouch();
  setupKeyboard();
  setupPointer();
  applyLang(lang);
  showMenu();

  window.addEventListener('resize', () => {
    lcd.resize();
    if (mode === 'menu') menu.renderIcons();
  });
  window.addEventListener('orientationchange', () => {
    lcd.resize();
    if (mode === 'menu') menu.renderIcons();
  });

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });
  exposeTestHook();
}

/* ---- test / debug hook (same convention as sibling games) ------------- */
function exposeTestHook() {
  window.OGH_BRICK_GAME = {
    get mode() { return mode; },
    get lang() { return lang; },
    get game() { return activeGame; },
    get desc() { return activeDesc; },
    GAMES,
    lcd,
    launch,
    showMenu,
    beginPlay,
    onDir,
    onPrimary,
    onPrimaryUp,
    getBest,
    setLang: applyLang,
    menuActivate: () => menu.activate(),
    menuMove: (d) => menu.move(d),
  };
}

init();
