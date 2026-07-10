/**
 * Games hub — library + local profile/progress UI
 */
import { OGHProfile, OGH_AVATAR_PRESETS } from '../_shared/js/ogh-profile.js';

const $ = (id) => document.getElementById(id);
const grid = $('grid');
const overlay = $('overlay');
const drawerStatus = $('drawerStatus');

/** @type {any[]} */
let catalog = [];
let selectedAvatarId = OGHProfile.getProfile().avatarId;

function qsPlay() {
  // carry nickname into games for ogh-net display name
  const name = encodeURIComponent(OGHProfile.getNickname());
  const room = encodeURIComponent(localStorage.getItem('ogh_room') || 'main');
  return `name=${name}&room=${room}`;
}

function entryToPath(g) {
  const entry = typeof g === 'string' ? g : g?.entry;
  if (!entry) return '#';
  const kind = (typeof g === 'object' && g?.kind) || 'game';
  const root = kind === 'program' ? '/programs/' : '/games/';
  let p = String(entry).replace(/index\.html$/i, '');
  if (p.startsWith('/')) return p.endsWith('/') ? p : p + '/';
  p = root + p;
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
      return `
      <a class="hub-card ${wip ? 'is-wip' : ''}" href="${wip ? '#' : path + '?' + qsPlay()}" ${wip ? 'aria-disabled="true"' : ''}>
        <h2>
          ${escapeHtml(g.name || g.id)}
          ${isProg ? '<span class="hub-badge">APP</span>' : ''}
          ${mp ? '<span class="hub-badge mp">MP</span>' : ''}
          ${hasProg ? '<span class="hub-badge prog">saved</span>' : ''}
          ${wip ? '<span class="hub-badge">WIP</span>' : ''}
        </h2>
        <p>${escapeHtml(blurb)}</p>
        <div class="hub-meta">
          <span>${escapeHtml(genres || g.style || '')}</span>
          <span>${players}p</span>
        </div>
      </a>`;
    })
    .join('');
}

async function loadCatalog() {
  try {
    const res = await fetch('/games/catalog/games.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    catalog = data.games || [];
  } catch (e) {
    console.warn(e);
    catalog = [];
    grid.innerHTML = '<p class="hub-empty">Could not load catalog. Is the PC host running?</p>';
    return;
  }
  renderGrid();
}

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
