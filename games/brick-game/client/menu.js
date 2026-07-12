/**
 * menu.js — the collection hub: the shared "pick a game" screen for the Brick
 * Game handheld. It presents the three sub-games (Tanks, Snake, Breakout) as a
 * selectable list, each row with a chunky dot-art icon rendered through the
 * SAME lcd.js dot renderer the games use — so the menu reads as part of the
 * one LCD, not a separate UI.
 *
 * Text (names / descriptions / best score) is real HTML so it translates and
 * flips to RTL for Arabic like the rest of the chrome. The icons and the
 * ghost-dot panel background are dir-agnostic. Selection is driven by the app
 * (D-pad / keyboard) via move()/activate(), and rows are also directly
 * tappable.
 */
import { renderIcon } from './lcd.js';

export function createMenu(root, games, env) {
  let selected = 0;
  const rows = [];

  root.classList.add('bg-menu');
  root.innerHTML = `
    <div class="bg-menu-head">
      <div class="bg-menu-title" data-i18n="title">Brick Game</div>
      <div class="bg-menu-sub" data-i18n="tagline">3-in-1 handheld classics</div>
    </div>
    <ul class="bg-menu-list" role="listbox" aria-label="Games"></ul>
    <div class="bg-menu-hint" data-i18n="menuHint">D-pad to choose · A to play</div>
  `;
  const list = root.querySelector('.bg-menu-list');

  games.forEach((g, i) => {
    const li = document.createElement('li');
    li.className = 'bg-menu-item';
    li.setAttribute('role', 'option');
    li.dataset.idx = String(i);
    li.innerHTML = `
      <canvas class="bg-menu-icon" width="48" height="48" aria-hidden="true"></canvas>
      <div class="bg-menu-info">
        <div class="bg-menu-name"></div>
        <div class="bg-menu-desc"></div>
      </div>
      <div class="bg-menu-best"></div>
    `;
    list.appendChild(li);
    const icon = li.querySelector('.bg-menu-icon');
    rows.push({ li, icon, name: li.querySelector('.bg-menu-name'), desc: li.querySelector('.bg-menu-desc'), best: li.querySelector('.bg-menu-best'), game: g });

    li.addEventListener('pointerenter', () => setSelected(i));
    li.addEventListener('click', () => {
      setSelected(i);
      env.onLaunch(g.id);
    });
  });

  function setSelected(i) {
    selected = (i + games.length) % games.length;
    rows.forEach((r, idx) => {
      r.li.classList.toggle('is-sel', idx === selected);
      r.li.setAttribute('aria-selected', idx === selected ? 'true' : 'false');
    });
  }

  function move(delta) {
    setSelected(selected + delta);
  }

  function activate() {
    env.onLaunch(games[selected].id);
  }

  function refreshBest() {
    rows.forEach((r) => {
      const best = env.getBest(r.game.id);
      r.best.textContent = best > 0 ? `${env.t('hudBest')} ${best}` : '';
    });
  }

  function setLang() {
    rows.forEach((r) => {
      r.name.textContent = env.t(r.game.nameKey);
      r.desc.textContent = env.t(r.game.descKey);
    });
    refreshBest();
  }

  function renderIcons() {
    rows.forEach((r) => renderIcon(r.icon, r.game.icon));
  }

  setSelected(0);

  return {
    root,
    move,
    activate,
    setLang,
    refreshBest,
    renderIcons,
    get selectedId() { return games[selected].id; },
  };
}
