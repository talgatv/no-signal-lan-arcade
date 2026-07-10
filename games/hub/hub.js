/**
 * Games hub — library + local profile/progress UI
 *
 * Works with:
 *  - OGH PC host:  http://host:8080/games/  or /games/hub/
 *  - Static server from games/:  http://host:8765/hub/
 */
import { OGHProfile, OGH_AVATAR_PRESETS } from '../_shared/js/ogh-profile.js';

const $ = (id) => document.getElementById(id);
const grid = $('grid');
const overlay = $('overlay');
const drawerStatus = $('drawerStatus');

/** @type {any[]} */
let catalog = [];
let selectedAvatarId = OGHProfile.getProfile().avatarId;

/** @type {{ mode: 'ogh'|'games-root', gamePrefix: string, programPrefix: string|null, catalogUrls: string[] }} */
let roots = detectRoots();

/**
 * Detect how the hub is being served so catalog + links resolve correctly.
 */
function detectRoots() {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  // OGH host maps /games → hub
  if (
    path === '/games' ||
    path.endsWith('/games/hub') ||
    path === '/library' ||
    path === '/apps'
  ) {
    return {
      mode: 'ogh',
      gamePrefix: '/games/',
      programPrefix: '/programs/',
      catalogUrls: ['/games/catalog/games.json'],
    };
  }
  // Static http.server from games/ directory → /hub
  if (path.endsWith('/hub') || path === '/hub') {
    return {
      mode: 'games-root',
      gamePrefix: '/',
      programPrefix: null, // programs live outside games/ — need full host
      catalogUrls: [
        '/catalog/games.json',
        '../catalog/games.json',
        'catalog/games.json',
      ],
    };
  }
  // Fallback: try both styles
  return {
    mode: 'ogh',
    gamePrefix: '/games/',
    programPrefix: '/programs/',
    catalogUrls: [
      '/games/catalog/games.json',
      '/catalog/games.json',
      '../catalog/games.json',
    ],
  };
}

function qsPlay() {
  const name = encodeURIComponent(OGHProfile.getNickname());
  const room = encodeURIComponent(localStorage.getItem('ogh_room') || 'main');
  return `name=${name}&room=${room}`;
}

function entryToPath(g) {
  const entry = typeof g === 'string' ? g : g?.entry;
  if (!entry) return '#';
  const kind = (typeof g === 'object' && g?.kind) || 'game';
  let p = String(entry).replace(/index\.html$/i, '');
  if (p.startsWith('/')) return p.endsWith('/') ? p : `${p}/`;

  if (kind === 'program') {
    if (!roots.programPrefix) {
      // Served only under games/ static tree — cannot reach programs/
      return '#program-needs-ogh-host';
    }
    p = roots.programPrefix + p;
  } else {
    p = roots.gamePrefix + p;
  }
  if (!p.endsWith('/')) p += '/';
  return p;
}

function isMp(g) {
  if (g.multiplayer?.status && g.multiplayer.status !== 'none') return true;
  const tags = g.tags || [];
  return tags.includes('multiplayer') || tags.includes('multiplayer-ready') || (g.players?.max || 1) > 1;
}

function refreshHeader() {
  $('hdrName').textContent = OGHProfile.getNickname();
  $('hdrAvatar').src = OGHProfile.getAvatarSrc();
  $('nick').value = OGHProfile.getNickname();
}

function setStatus(msg, err = false) {
  drawerStatus.textContent = msg || '';
  drawerStatus.classList.toggle('err', !!err);
}

function renderAvatars() {
  const gridEl = $('avatarGrid');
  const profile = OGHProfile.getProfile();
  selectedAvatarId = profile.avatarId;
  const items = [...OGH_AVATAR_PRESETS];
  gridEl.innerHTML = items
    .map(
      (a) => `
    <button type="button" class="avatar-pick ${selectedAvatarId === a.id ? 'is-on' : ''}"
      data-id="${a.id}" title="${a.label}">
      <img src="${a.src}" alt="${a.label}" />
    </button>`
    )
    .join('');

  if (profile.avatarId === 'custom' && profile.avatarCustom) {
    gridEl.insertAdjacentHTML(
      'afterbegin',
      `<button type="button" class="avatar-pick is-on" data-id="custom" title="Custom">
        <img src="${profile.avatarCustom}" alt="Custom" />
      </button>`
    );
    selectedAvatarId = 'custom';
  }

  gridEl.querySelectorAll('.avatar-pick').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedAvatarId = btn.getAttribute('data-id');
      gridEl.querySelectorAll('.avatar-pick').forEach((b) => b.classList.remove('is-on'));
      btn.classList.add('is-on');
    });
  });
}

function renderProgress() {
  const list = OGHProfile.listProgress();
  const el = $('progList');
  if (!list.length) {
    el.innerHTML = '<li class="tag">No saved progress yet — play a game that uses OGHProfile.</li>';
    return;
  }
  const nameById = Object.fromEntries(catalog.map((g) => [g.id, g.name]));
  el.innerHTML = list
    .map((e) => {
      const title = nameById[e.gameId] || e.label || e.gameId;
      const summary = e.summary || summarizeData(e.data);
      const when = e.updatedAt ? new Date(e.updatedAt).toLocaleString() : '';
      return `<li>
        <span class="gid">${title}</span>
        <span class="sum">${escapeHtml(summary)}</span>
        <span class="when">${when}</span>
      </li>`;
    })
    .join('');
}

function summarizeData(data) {
  if (data == null) return '—';
  if (typeof data !== 'object') return String(data);
  const keys = Object.keys(data);
  if (!keys.length) return '(empty save)';
  return keys
    .slice(0, 4)
    .map((k) => `${k}: ${formatVal(data[k])}`)
    .join(' · ');
}

function formatVal(v) {
  if (v == null) return '—';
  if (typeof v === 'object') return '…';
  return String(v).slice(0, 40);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function openDrawer() {
  overlay.hidden = false;
  renderAvatars();
  renderProgress();
  setStatus('');
}

function closeDrawer() {
  overlay.hidden = true;
}

function filteredSorted() {
  const q = ($('search').value || '').trim().toLowerCase();
  const sort = $('sort').value;
  const minP = $('filterPlayers').value;
  const mpOnly = $('filterMp').checked;
  const kindF = $('filterKind')?.value || 'any';
  const progressMap = Object.fromEntries(
    OGHProfile.listProgress().map((e) => [e.gameId, e.updatedAt || ''])
  );

  let list = catalog.filter((g) => g.status !== 'deprecated' && g.status !== 'idea');

  if (kindF === 'game') list = list.filter((g) => (g.kind || 'game') === 'game');
  if (kindF === 'program') list = list.filter((g) => g.kind === 'program');

  if (q) {
    list = list.filter((g) => {
      const blob = [g.name, g.tagline, g.kind, ...(g.genres || []), ...(g.tags || []), g.style]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }

  if (minP !== 'any') {
    const n = parseInt(minP, 10);
    list = list.filter((g) => (g.players?.max || 1) >= n);
  }

  if (mpOnly) list = list.filter(isMp);

  const byName = (a, b) => (a.name || '').localeCompare(b.name || '');
  if (sort === 'name') list.sort(byName);
  else if (sort === 'name-desc') list.sort((a, b) => byName(b, a));
  else if (sort === 'players') list.sort((a, b) => (b.players?.max || 0) - (a.players?.max || 0));
  else if (sort === 'genre') {
    list.sort((a, b) => ((a.genres && a.genres[0]) || '').localeCompare((b.genres && b.genres[0]) || '') || byName(a, b));
  } else if (sort === 'style') {
    list.sort((a, b) => (a.style || '').localeCompare(b.style || '') || byName(a, b));
  } else if (sort === 'recent') {
    list.sort((a, b) => (progressMap[b.id] || '').localeCompare(progressMap[a.id] || '') || byName(a, b));
  }

  return list;
}

function renderGrid() {
  const list = filteredSorted();
  const progressIds = new Set(OGHProfile.listProgress().map((e) => e.gameId));

  if (!list.length) {
    grid.innerHTML = '<p class="hub-empty">No games match your filters.</p>';
    return;
  }

  grid.innerHTML = list
    .map((g) => {
      const path = entryToPath(g);
      const mp = isMp(g);
      const isProg = g.kind === 'program';
      const hasProg = progressIds.has(g.id);
      const genres = (g.genres || []).slice(0, 2).join(', ');
      const players = g.players ? `${g.players.min}–${g.players.max}` : '?';
      const blurb = g.tagline || g.instructions?.en || '';
      const wip = g.status === 'wip';
      const brokenProg = path === '#program-needs-ogh-host';
      const href =
        wip || brokenProg ? '#' : `${path}?${qsPlay()}`;
      const disabled = wip || brokenProg;
      return `
      <a class="hub-card ${disabled ? 'is-wip' : ''}" href="${href}" ${disabled ? 'aria-disabled="true"' : ''}>
        <h2>
          ${escapeHtml(g.name || g.id)}
          ${isProg ? '<span class="hub-badge">APP</span>' : ''}
          ${mp ? '<span class="hub-badge mp">MP</span>' : ''}
          ${hasProg ? '<span class="hub-badge prog">saved</span>' : ''}
          ${wip ? '<span class="hub-badge">WIP</span>' : ''}
          ${brokenProg ? '<span class="hub-badge warn">needs full host</span>' : ''}
        </h2>
        <p>${escapeHtml(
          brokenProg
            ? 'Unavailable here: this page is only the games/ folder. Run: cd pc && ./start.sh → open http://127.0.0.1:8080/games/ then LAN Chat.'
            : blurb
        )}</p>
        <div class="hub-meta">
          <span>${escapeHtml(genres || g.style || '')}</span>
          <span>${players}p</span>
        </div>
      </a>`;
    })
    .join('');
}

async function fetchFirstJson(urls) {
  const errors = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        errors.push(`${url} → HTTP ${res.status}`);
        continue;
      }
      return await res.json();
    } catch (e) {
      errors.push(`${url} → ${e.message || e}`);
    }
  }
  throw new Error(errors.join('; ') || 'no catalog URL worked');
}

async function loadCatalog() {
  roots = detectRoots();
  try {
    const data = await fetchFirstJson(roots.catalogUrls);
    catalog = data.games || [];
    if (!catalog.length) {
      grid.innerHTML =
        '<p class="hub-empty">Catalog loaded but is empty. Add packs to games/catalog/games.json</p>';
      return;
    }
  } catch (e) {
    console.warn('[hub] catalog load failed', e);
    catalog = [];
    grid.innerHTML = `<p class="hub-empty">
      Could not load game catalog.<br/><br/>
      <strong>Recommended:</strong> run the OGH host, not a bare http.server:<br/>
      <code style="color:#5ce1ff">cd pc && ./start.sh</code><br/>
      then open <code style="color:#5ce1ff">http://127.0.0.1:8080/games/</code>
      <br/><br/>
      <span style="font-size:12px;color:#5a6280">${escapeHtml(String(e.message || e))}</span>
    </p>`;
    return;
  }
  // remove old banner if reloading
  document.querySelectorAll('.hub-banner').forEach((n) => n.remove());
  if (roots.mode === 'games-root') {
    const bar = document.createElement('p');
    bar.className = 'hub-banner';
    bar.innerHTML =
      '<strong>Limited mode:</strong> this is a plain folder server under <code>games/</code> ' +
      '(e.g. port 8765). <strong>LAN Chat & programs are disabled</strong> here because they live in <code>programs/</code>.<br/>' +
      'Fix: stop that server, run <code>cd pc && ./start.sh</code>, open ' +
      '<code>http://127.0.0.1:8080/games/</code> — then open <strong>LAN Chat &amp; Radio</strong>.';
    grid.parentElement?.insertBefore(bar, grid);
  }
  renderGrid();
}

// About panel (default open on first visit)
const aboutPanel = $('aboutPanel');
const aboutKey = 'ogh_hub_about_collapsed';
function syncAboutBtn() {
  const collapsed = aboutPanel.hasAttribute('hidden');
  $('btnAbout')?.classList.toggle('is-on', !collapsed);
}
if (localStorage.getItem(aboutKey) === '1') {
  aboutPanel.setAttribute('hidden', '');
}
syncAboutBtn();
$('btnAbout')?.addEventListener('click', () => {
  if (aboutPanel.hasAttribute('hidden')) {
    aboutPanel.removeAttribute('hidden');
    localStorage.removeItem(aboutKey);
  } else {
    aboutPanel.setAttribute('hidden', '');
    localStorage.setItem(aboutKey, '1');
  }
  syncAboutBtn();
});

// events
$('btnProfile').addEventListener('click', openDrawer);
$('btnClose').addEventListener('click', closeDrawer);
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeDrawer();
});

$('btnSaveProfile').addEventListener('click', () => {
  try {
    OGHProfile.setNickname($('nick').value);
    if (selectedAvatarId === 'custom') {
      const p = OGHProfile.getProfile();
      if (!p.avatarCustom) throw new Error('Pick a custom image first');
      OGHProfile.setAvatar('custom', p.avatarCustom);
    } else {
      OGHProfile.setAvatar(selectedAvatarId);
    }
    refreshHeader();
    renderGrid();
    setStatus('Profile saved on this device.');
  } catch (e) {
    setStatus(String(e.message || e), true);
  }
});

$('avatarFile').addEventListener('change', async () => {
  const file = $('avatarFile').files?.[0];
  if (!file) return;
  try {
    const dataUrl = await readImageAsDataUrl(file, 128);
    OGHProfile.setAvatar('custom', dataUrl);
    selectedAvatarId = 'custom';
    renderAvatars();
    refreshHeader();
    setStatus('Custom avatar set. Tap Save profile if you also changed nickname.');
  } catch (e) {
    setStatus(String(e.message || e), true);
  }
});

$('btnExport').addEventListener('click', () => {
  OGHProfile.downloadFile();
  setStatus('Download started — keep the JSON file safe.');
});

$('importFile').addEventListener('change', async () => {
  const file = $('importFile').files?.[0];
  if (!file) return;
  try {
    const mode = $('importMerge').checked ? 'merge' : 'replace';
    await OGHProfile.importFile(file, { mode });
    refreshHeader();
    renderAvatars();
    renderProgress();
    renderGrid();
    setStatus(`Profile imported (${mode}).`);
  } catch (e) {
    setStatus(String(e.message || e), true);
  }
  $('importFile').value = '';
});

['search', 'sort', 'filterPlayers', 'filterMp', 'filterKind'].forEach((id) => {
  const el = $(id);
  if (!el) return;
  el.addEventListener('input', renderGrid);
  el.addEventListener('change', renderGrid);
});

window.addEventListener('ogh-profile-changed', () => {
  refreshHeader();
  renderGrid();
});
window.addEventListener('ogh-progress-changed', () => {
  if (!overlay.hidden) renderProgress();
  renderGrid();
});

function readImageAsDataUrl(file, maxSide = 128) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('could not read image'));
    };
    img.src = url;
  });
}

// boot
refreshHeader();
loadCatalog();
