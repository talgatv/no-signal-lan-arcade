/**
 * P2P File Share — send files directly browser-to-browser over WebRTC.
 * Signaling only (SDP/ICE) goes through the host WebSocket room relay
 * (OGHNet); file bytes never pass through the host. See README.md.
 */
import { OGHNet } from '../../../_shared/js/ogh-net.js';
import { OGHProfile } from '../../../_shared/js/ogh-profile.js';
import { LANGS, LANG_LABELS, STRINGS, t, detectLang, rememberLang, applyStaticStrings } from './i18n.js';
import { createPeerManager } from './peer-manager.js';

const GAME_ID = 'p2p-share';

const $ = (id) => document.getElementById(id);

const netLine = $('netLine');
const meNameEl = $('meName');
const meAvatarEl = $('meAvatar');
const langSwitchEl = $('langSwitch');
const rosterEl = $('roster');
const sendAllBtn = $('sendAllBtn');
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const browseBtn = $('browseBtn');
const stagedListEl = $('stagedList');
const outgoingListEl = $('outgoingList');
const receivedListEl = $('receivedList');

let lang = detectLang();
let net = null;
let peerManager = null;

const stagedFiles = [];
const peerStatus = new Map(); // peerId -> 'connecting'|'connected'|'failed'|'closed'
let rosterById = new Map(); // peerId -> player object
let lastRosterIds = new Set();

const outgoing = new Map(); // transferId -> { peerId, name, size, sent, status, file }
const incoming = new Map(); // transferId -> { peerId, name, size, mime, received, status, url }

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

function myName() {
  const qsName = new URLSearchParams(location.search).get('name');
  return (qsName && qsName.trim()) || OGHProfile.getNickname();
}

function bootHeader() {
  meNameEl.textContent = net?.name || myName();
  meAvatarEl.src = OGHProfile.getAvatarSrc();
}

function setNetUi(mode) {
  const online = mode === 'online';
  netLine.textContent = online
    ? `${t(lang, 'online')} · ${t(lang, 'room')}: ${net?.room || '?'}`
    : `${t(lang, 'offline')} — ${t(lang, 'offlineHint')}`;
  netLine.classList.toggle('online', online);
  netLine.classList.toggle('offline', !online);
}

function statusKey(state) {
  return (
    {
      idle: 'peerIdle',
      connecting: 'peerConnecting',
      connected: 'peerConnected',
      failed: 'peerFailed',
      closed: 'peerClosed',
    }[state] || 'peerIdle'
  );
}

function transferStatusKey(status) {
  return (
    {
      connecting: 'statusConnecting',
      sending: 'statusSending',
      receiving: 'statusReceiving',
      done: 'statusDone',
      failed: 'statusFailed',
      waiting: 'statusWaiting',
    }[status] || 'statusWaiting'
  );
}

// ---------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------

function otherPlayers() {
  return (net?.players || []).filter((p) => p.id !== net.playerId);
}

function renderRoster() {
  const others = otherPlayers();
  rosterById = new Map((net?.players || []).map((p) => [p.id, p]));

  if (!others.length) {
    rosterEl.innerHTML = `<li class="empty">${escapeHtml(t(lang, 'noPeers'))}</li>`;
    sendAllBtn.disabled = true;
    return;
  }

  sendAllBtn.disabled = stagedFiles.length === 0;
  rosterEl.innerHTML = others
    .map((p) => {
      const state = peerStatus.get(p.id) || 'idle';
      const hostBadge = p.isHost ? `<span class="peer-badge">${escapeHtml(t(lang, 'host'))}</span>` : '';
      const disabled = stagedFiles.length === 0 ? 'disabled' : '';
      return `
        <li class="peer-row" id="peer-${escapeHtml(p.id)}">
          <span class="peer-dot ${state}"></span>
          <span class="peer-name">${escapeHtml(p.name || p.id)}</span>
          ${hostBadge}
          <span class="peer-status">${escapeHtml(t(lang, statusKey(state)))}</span>
          <button type="button" class="ogh-btn peer-send" data-peer="${escapeHtml(p.id)}" ${disabled}>${escapeHtml(t(lang, 'send'))}</button>
        </li>`;
    })
    .join('');
}

rosterEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.peer-send');
  if (!btn) return;
  sendStagedTo(btn.dataset.peer);
});

sendAllBtn.addEventListener('click', () => {
  for (const p of otherPlayers()) sendStagedTo(p.id);
});

function handlePlayers(list) {
  const ids = new Set((list || []).filter((p) => p.id !== net.playerId).map((p) => p.id));
  for (const id of lastRosterIds) {
    if (!ids.has(id)) {
      peerManager.removePeer(id);
      peerStatus.delete(id);
    }
  }
  lastRosterIds = ids;
  renderRoster();
}

// ---------------------------------------------------------------------
// File staging (picker + drop zone)
// ---------------------------------------------------------------------

function stageFiles(fileList) {
  for (const f of fileList) stagedFiles.push(f);
  renderStaged();
  renderRoster();
}

function renderStaged() {
  if (!stagedFiles.length) {
    stagedListEl.innerHTML = `<li class="empty">${escapeHtml(t(lang, 'noFileHint'))}</li>`;
    return;
  }
  stagedListEl.innerHTML = stagedFiles
    .map(
      (f, idx) => `
      <li class="staged-item">
        <span class="fname">${escapeHtml(f.name)}</span>
        <span class="fsize">${formatBytes(f.size)}</span>
        <button type="button" class="remove" data-idx="${idx}" aria-label="${escapeHtml(t(lang, 'clearFile'))}">×</button>
      </li>`
    )
    .join('');
}

stagedListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.remove');
  if (!btn) return;
  stagedFiles.splice(Number(btn.dataset.idx), 1);
  renderStaged();
  renderRoster();
});

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});
browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});
fileInput.addEventListener('change', () => {
  if (fileInput.files?.length) stageFiles(fileInput.files);
  fileInput.value = '';
});
['dragover'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.add('drag');
  })
);
['dragleave', 'dragend'].forEach((ev) => dropzone.addEventListener(ev, () => dropzone.classList.remove('drag')));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag');
  if (e.dataTransfer?.files?.length) stageFiles(e.dataTransfer.files);
});

function sendStagedTo(peerId) {
  if (!stagedFiles.length || !peerId) return;
  for (const file of stagedFiles.slice()) {
    peerManager.sendFile(peerId, file);
  }
}

// ---------------------------------------------------------------------
// Outgoing transfer list
// ---------------------------------------------------------------------

function clearEmptyRow(listEl) {
  const empty = listEl.querySelector('.empty');
  if (empty) empty.remove();
}

function upsertOutgoingRow(transferId) {
  const info = outgoing.get(transferId);
  if (!info) return;
  let li = document.getElementById(`out-${transferId}`);
  if (!li) {
    clearEmptyRow(outgoingListEl);
    li = document.createElement('li');
    li.id = `out-${transferId}`;
    li.className = 'transfer-row';
    outgoingListEl.prepend(li);
  }
  const pct = info.size ? Math.min(100, Math.round((info.sent / info.size) * 100)) : 100;
  const peerName = rosterById.get(info.peerId)?.name || info.peerId;
  const retryHtml =
    info.status === 'failed'
      ? `<button type="button" class="ogh-btn retry" data-transfer="${transferId}">${escapeHtml(t(lang, 'retry'))}</button>`
      : '';
  li.innerHTML = `
    <div class="t-head">
      <span class="t-name">${escapeHtml(info.name)}</span>
      <span class="t-peer">${escapeHtml(t(lang, 'to'))} ${escapeHtml(peerName)}</span>
    </div>
    <div class="bar"><div class="fill status-${info.status}" style="width:${pct}%"></div></div>
    <div class="t-meta">
      <span class="t-status status-${info.status}">${escapeHtml(t(lang, transferStatusKey(info.status)))}</span>
      <span class="t-size">${formatBytes(info.sent)} / ${formatBytes(info.size)}</span>
      ${retryHtml}
    </div>`;
}

outgoingListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.retry');
  if (!btn) return;
  const info = outgoing.get(btn.dataset.transfer);
  if (info?.file) peerManager.sendFile(info.peerId, info.file);
});

// ---------------------------------------------------------------------
// Received files list
// ---------------------------------------------------------------------

function upsertIncomingRow(transferId) {
  const info = incoming.get(transferId);
  if (!info) return;
  let li = document.getElementById(`in-${transferId}`);
  if (!li) {
    clearEmptyRow(receivedListEl);
    li = document.createElement('li');
    li.id = `in-${transferId}`;
    li.className = 'transfer-row';
    receivedListEl.prepend(li);
  }
  const pct = info.size ? Math.min(100, Math.round((info.received / info.size) * 100)) : 100;
  const peerName = rosterById.get(info.peerId)?.name || info.peerId;
  const statusKeyName = info.status === 'done' ? 'done' : info.status === 'failed' ? 'failed' : 'receiving';
  const saveHtml =
    info.status === 'done' && info.url
      ? `<a class="ogh-btn save" href="${info.url}" download="${escapeHtml(info.name)}">${escapeHtml(t(lang, 'save'))}</a>`
      : '';
  li.innerHTML = `
    <div class="t-head">
      <span class="t-name">${escapeHtml(info.name)}</span>
      <span class="t-peer">${escapeHtml(t(lang, 'from'))} ${escapeHtml(peerName)}</span>
    </div>
    <div class="bar"><div class="fill status-${statusKeyName}" style="width:${pct}%"></div></div>
    <div class="t-meta">
      <span class="t-status status-${statusKeyName}">${escapeHtml(t(lang, transferStatusKey(statusKeyName)))}</span>
      <span class="t-size">${formatBytes(info.received)} / ${formatBytes(info.size)}</span>
      ${saveHtml}
    </div>`;
}

// ---------------------------------------------------------------------
// Language switcher
// ---------------------------------------------------------------------

function buildLangSwitch() {
  langSwitchEl.innerHTML = '';
  for (const code of LANGS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-btn' + (code === lang ? ' is-on' : '');
    btn.textContent = LANG_LABELS[code];
    btn.setAttribute('aria-pressed', String(code === lang));
    btn.addEventListener('click', () => setLang(code));
    langSwitchEl.appendChild(btn);
  }
}

function refreshAllTransferRows() {
  if (outgoing.size) for (const id of outgoing.keys()) upsertOutgoingRow(id);
  else outgoingListEl.innerHTML = `<li class="empty">${escapeHtml(t(lang, 'noOutgoing'))}</li>`;
  if (incoming.size) for (const id of incoming.keys()) upsertIncomingRow(id);
  else receivedListEl.innerHTML = `<li class="empty">${escapeHtml(t(lang, 'noReceived'))}</li>`;
}

function setLang(code) {
  if (!STRINGS[code] || code === lang) return;
  lang = code;
  rememberLang(lang);
  applyStaticStrings(lang);
  buildLangSwitch();
  if (net) setNetUi(net.mode);
  renderRoster();
  renderStaged();
  refreshAllTransferRows();
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------

async function boot() {
  console.log('[p2p] boot', Date.now());
  applyStaticStrings(lang);
  buildLangSwitch();

  if (!window.RTCPeerConnection) {
    dropzone.innerHTML = `<p>${escapeHtml(t(lang, 'webrtcUnsupported'))}</p>`;
    dropzone.classList.add('unsupported');
    return;
  }

  net = await OGHNet.connect({ gameId: GAME_ID, name: myName() });
  bootHeader();
  setNetUi(net.mode);

  peerManager = createPeerManager({
    net,
    hooks: {
      onPeerState({ peerId, state }) {
        peerStatus.set(peerId, state);
        renderRoster();
      },
      onOutgoingStart({ transferId, peerId, name, size, file }) {
        outgoing.set(transferId, { peerId, name, size, sent: 0, status: 'connecting', file });
        upsertOutgoingRow(transferId);
      },
      onOutgoingProgress({ transferId, sent }) {
        const info = outgoing.get(transferId);
        if (!info) return;
        info.sent = sent;
        info.status = 'sending';
        upsertOutgoingRow(transferId);
      },
      onOutgoingDone({ transferId }) {
        const info = outgoing.get(transferId);
        if (!info) return;
        info.status = 'done';
        info.sent = info.size;
        upsertOutgoingRow(transferId);
      },
      onOutgoingError({ transferId, peerId, name, error, file }) {
        const info = outgoing.get(transferId) || { peerId, name, size: file?.size || 0, sent: 0, file };
        info.status = 'failed';
        info.error = error;
        outgoing.set(transferId, info);
        upsertOutgoingRow(transferId);
      },
      onIncomingStart({ transferId, peerId, name, size, mime }) {
        incoming.set(transferId, { peerId, name, size, mime, received: 0, status: 'receiving' });
        upsertIncomingRow(transferId);
      },
      onIncomingProgress({ transferId, received }) {
        const info = incoming.get(transferId);
        if (!info) return;
        info.received = received;
        upsertIncomingRow(transferId);
      },
      onIncomingComplete({ transferId, blob, name, size }) {
        const info = incoming.get(transferId);
        if (!info) return;
        info.status = 'done';
        info.received = size;
        info.name = name;
        info.url = URL.createObjectURL(blob);
        upsertIncomingRow(transferId);
      },
      onIncomingError({ transferId, error }) {
        const info = incoming.get(transferId);
        if (!info) return;
        info.status = 'failed';
        info.error = error;
        upsertIncomingRow(transferId);
      },
    },
  });

  net.on('mode', (mode) => {
    setNetUi(mode);
    bootHeader();
  });
  net.on('hello', () => {
    setNetUi(net.mode);
    bootHeader();
  });
  net.on('players', handlePlayers);
  net.on('action', ({ action, payload, from }) => {
    if (action === 'webrtc-offer' || action === 'webrtc-answer' || action === 'webrtc-ice') {
      peerManager.handleSignal({ action, payload, from });
    }
  });

  handlePlayers(net.players);
  renderStaged();
  refreshAllTransferRows();

  window.addEventListener('pagehide', () => peerManager?.destroy());
}

boot();
