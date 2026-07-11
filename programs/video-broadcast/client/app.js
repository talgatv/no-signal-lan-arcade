/**
 * Video Broadcast — full-mesh camera/mic broadcast over WebRTC.
 * Signaling (SDP/ICE) and small media-state messages go through the host
 * WebSocket room relay (OGHNet); video/audio never pass through the host.
 * See README.md and peer-manager.js.
 */
import { OGHNet } from '/games/_shared/js/ogh-net.js';
import { OGHProfile } from '/games/_shared/js/ogh-profile.js';
import { LANGS, LANG_LABELS, STRINGS, t, detectLang, rememberLang, applyStaticStrings } from './i18n.js';
import { createPeerManager } from './peer-manager.js';

const GAME_ID = 'video-broadcast';

const $ = (id) => document.getElementById(id);

const netLine = $('netLine');
const meNameEl = $('meName');
const meAvatarEl = $('meAvatar');
const langSwitchEl = $('langSwitch');
const insecureBanner = $('insecureBanner');
const mediaErrorEl = $('mediaError');
const tileGridEl = $('tileGrid');
const gridEmptyEl = $('gridEmpty');
const rosterEl = $('roster');
const broadcastBtn = $('broadcastBtn');
const muteBtn = $('muteBtn');
const cameraBtn = $('cameraBtn');
const flipBtn = $('flipBtn');

let lang = detectLang();
let net = null;
let peerManager = null;

let localStream = null; // MediaStream while broadcasting, else null
let isBroadcasting = false;
let audioEnabled = true;
let videoEnabled = true;
let facingMode = 'user'; // 'user' | 'environment'
let hasMultiCamera = false;
let lastMediaError = null; // { key: string|null, raw: string } | null

const peerStatus = new Map(); // peerId -> 'connecting'|'connected'|'failed'|'closed'
let rosterById = new Map(); // peerId -> player object
let lastRosterIds = new Set();

const tiles = new Map(); // peerId -> tile record (see ensureTile)

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

// ---------------------------------------------------------------------
// Roster ("in this room") — everyone present, regardless of whether
// they're broadcasting. Broadcast state is shown on the tile grid instead;
// this list's job is just "who's here" + raw connection state.
// ---------------------------------------------------------------------

function otherPlayers() {
  return (net?.players || []).filter((p) => p.id !== net.playerId);
}

function renderRoster() {
  const others = otherPlayers();
  rosterById = new Map((net?.players || []).map((p) => [p.id, p]));

  if (!others.length) {
    rosterEl.innerHTML = `<li class="empty">${escapeHtml(t(lang, 'noPeers'))}</li>`;
    return;
  }

  rosterEl.innerHTML = others
    .map((p) => {
      const state = peerStatus.get(p.id) || 'idle';
      const hostBadge = p.isHost ? `<span class="peer-badge">${escapeHtml(t(lang, 'host'))}</span>` : '';
      return `
        <li class="peer-row" id="peer-${escapeHtml(p.id)}">
          <span class="peer-dot ${state}"></span>
          <span class="peer-name">${escapeHtml(p.name || p.id)}</span>
          ${hostBadge}
          <span class="peer-status">${escapeHtml(t(lang, statusKey(state)))}</span>
        </li>`;
    })
    .join('');
}

function handlePlayers(list) {
  const ids = new Set((list || []).filter((p) => p.id !== net.playerId).map((p) => p.id));

  // Departed peers: clean up their connection + tile.
  for (const id of lastRosterIds) {
    if (!ids.has(id)) {
      peerManager.removePeer(id);
      peerStatus.delete(id);
      removeTile(id);
    }
  }

  // New peers: if we're already broadcasting, proactively connect to them
  // and attach our tracks (this is nuance 2 from peer-manager.js's header —
  // without it a late joiner would never see an already-broadcasting
  // participant). Also re-announce our current media state so the late
  // joiner learns our mute/camera state immediately instead of assuming
  // "unmuted" until our next toggle.
  let sawNewPeer = false;
  for (const id of ids) {
    if (!lastRosterIds.has(id)) {
      sawNewPeer = true;
      if (isBroadcasting) peerManager.getOrCreatePeer(id);
    }
  }
  if (isBroadcasting && sawNewPeer) broadcastMediaState();

  lastRosterIds = ids;
  renderRoster();
}

// ---------------------------------------------------------------------
// Video tiles
// ---------------------------------------------------------------------

function initials(name) {
  const s = String(name || '?').trim();
  return s ? s[0].toUpperCase() : '?';
}

function ensureTile(peerId, { isSelf = false } = {}) {
  let tile = tiles.get(peerId);
  if (tile) return tile;

  const name = isSelf ? myName() : rosterById.get(peerId)?.name || peerId;

  const el = document.createElement('div');
  el.className = 'tile';
  el.id = `tile-${escapeHtml(peerId)}`;
  el.innerHTML = `
    <video ${isSelf ? 'muted' : ''} autoplay playsinline></video>
    <div class="tile-placeholder">
      <div class="tile-avatar">${escapeHtml(initials(name))}</div>
      <div class="tile-placeholder-name">${escapeHtml(name)}</div>
    </div>
    <div class="tile-overlay">
      <span class="tile-name">${escapeHtml(name)}</span>
      <span class="tile-badge you-badge"${isSelf ? '' : ' hidden'}>${escapeHtml(t(lang, 'you'))}</span>
      <span class="tile-icon icon-muted" hidden>${escapeHtml(t(lang, 'mutedBadge'))}</span>
      <span class="tile-icon icon-camoff" hidden>${escapeHtml(t(lang, 'cameraOffBadge'))}</span>
    </div>`;

  tileGridEl.appendChild(el);
  tile = {
    el,
    isSelf,
    videoEl: el.querySelector('video'),
    nameEl: el.querySelector('.tile-name'),
    placeholderNameEl: el.querySelector('.tile-placeholder-name'),
    avatarEl: el.querySelector('.tile-avatar'),
    youBadgeEl: el.querySelector('.you-badge'),
    mutedIcon: el.querySelector('.icon-muted'),
    camIcon: el.querySelector('.icon-camoff'),
    audio: true,
    video: true,
  };
  tiles.set(peerId, tile);
  updateGridEmpty();
  return tile;
}

function removeTile(peerId) {
  const tile = tiles.get(peerId);
  if (!tile) return;
  try {
    tile.videoEl.srcObject = null;
  } catch {
    /* ignore */
  }
  tile.el.remove();
  tiles.delete(peerId);
  updateGridEmpty();
}

function updateGridEmpty() {
  gridEmptyEl.hidden = tiles.size > 0;
}

function setTileStream(peerId, stream) {
  const tile = tiles.get(peerId);
  if (!tile || !stream) return;
  if (tile.videoEl.srcObject !== stream) tile.videoEl.srcObject = stream;
}

function setTileName(peerId, name) {
  const tile = tiles.get(peerId);
  if (!tile || !name) return;
  tile.nameEl.textContent = name;
  tile.placeholderNameEl.textContent = name;
  tile.avatarEl.textContent = initials(name);
}

/**
 * Update a tile's mute/camera-off overlay. This is the single update path
 * for tile state — called both from our own local mute/camera button
 * handlers (net.send() never echoes back to the sender, so this is the
 * *only* way our own tile's icons ever update) and from the media-state
 * receive handler (for everyone else's tile). Don't add a second path.
 */
function setTileState(peerId, { audio, video }) {
  const tile = tiles.get(peerId);
  if (!tile) return;
  tile.audio = audio !== false;
  tile.video = video !== false;
  tile.mutedIcon.hidden = tile.audio;
  tile.camIcon.hidden = tile.video;
  tile.el.classList.toggle('cam-off', !tile.video);
}

function setSelfMirror() {
  const tile = tiles.get(net?.playerId);
  if (!tile) return;
  tile.el.classList.toggle('mirrored', facingMode === 'user');
}

// ---------------------------------------------------------------------
// getUserMedia error classification
// ---------------------------------------------------------------------

function classifyMediaError(err) {
  const name = err && err.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permissionDeniedMsg';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'noDeviceMsg';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'deviceBusyMsg';
  return null; // falls back to a generic {error}-substituted message
}

function renderMediaError() {
  if (!lastMediaError) return;
  const { key, raw } = lastMediaError;
  mediaErrorEl.textContent = key ? t(lang, key) : t(lang, 'genericMediaErrorMsg', { error: raw });
  mediaErrorEl.hidden = false;
}

function showMediaError(err) {
  lastMediaError = { key: classifyMediaError(err), raw: String(err?.message || err) };
  renderMediaError();
}

function clearMediaError() {
  lastMediaError = null;
  mediaErrorEl.hidden = true;
  mediaErrorEl.textContent = '';
}

// ---------------------------------------------------------------------
// Broadcasting controls
// ---------------------------------------------------------------------

function broadcastMediaState() {
  net.send('media-state', { audio: audioEnabled, video: videoEnabled, broadcasting: isBroadcasting });
}

async function checkMultiCamera() {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return false;
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput').length > 1;
  } catch {
    return false;
  }
}

function updateControlsUi() {
  broadcastBtn.textContent = t(lang, isBroadcasting ? 'stopBroadcast' : 'startBroadcast');
  broadcastBtn.classList.toggle('is-active', isBroadcasting);
  muteBtn.hidden = !isBroadcasting;
  cameraBtn.hidden = !isBroadcasting;
  flipBtn.hidden = !isBroadcasting || !hasMultiCamera;
  muteBtn.textContent = t(lang, audioEnabled ? 'mute' : 'unmute');
  muteBtn.classList.toggle('is-active', !audioEnabled);
  cameraBtn.textContent = t(lang, videoEnabled ? 'cameraOff' : 'cameraOn');
  cameraBtn.classList.toggle('is-active', !videoEnabled);
}

async function startBroadcasting() {
  if (!window.isSecureContext || isBroadcasting) return; // banner already shown at boot; belt-and-suspenders
  clearMediaError();
  broadcastBtn.disabled = true;
  broadcastBtn.textContent = t(lang, 'starting');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
  } catch (err) {
    console.warn('[video-broadcast] getUserMedia failed', err);
    showMediaError(err);
    broadcastBtn.disabled = false;
    updateControlsUi();
    return;
  }

  localStream = stream;
  facingMode = 'user';
  audioEnabled = true;
  videoEnabled = true;
  isBroadcasting = true;
  broadcastBtn.disabled = false;

  // Nuance 1 (see peer-manager.js header): connect to everyone already in
  // the room, then attach our tracks to all of them (existing + just
  // created) in one call.
  for (const p of otherPlayers()) peerManager.getOrCreatePeer(p.id);
  peerManager.setLocalStream(localStream);

  const tile = ensureTile(net.playerId, { isSelf: true });
  tile.videoEl.srcObject = localStream;
  setTileState(net.playerId, { audio: true, video: true });
  setSelfMirror();

  // enumerateDevices()'s videoinput count/labels can be unreliable before
  // permission has actually been granted — re-check now that getUserMedia
  // just succeeded, so the flip button's visibility reflects the
  // post-permission truth (not a possibly-wrong pre-permission guess).
  hasMultiCamera = await checkMultiCamera();

  updateControlsUi();
  broadcastMediaState();
}

function stopBroadcasting() {
  if (!isBroadcasting) return;
  peerManager.clearLocalStream(); // removes our tracks; connections stay open (see peer-manager.js)
  for (const track of localStream.getTracks()) track.stop();
  localStream = null;
  isBroadcasting = false;
  audioEnabled = true;
  videoEnabled = true;
  removeTile(net.playerId);
  updateControlsUi();
  broadcastMediaState();
}

function toggleBroadcast() {
  if (isBroadcasting) stopBroadcasting();
  else startBroadcasting();
}

function toggleMute() {
  if (!localStream) return;
  audioEnabled = !audioEnabled;
  for (const track of localStream.getAudioTracks()) track.enabled = audioEnabled;
  setTileState(net.playerId, { audio: audioEnabled, video: videoEnabled });
  updateControlsUi();
  broadcastMediaState();
}

function toggleCamera() {
  if (!localStream) return;
  videoEnabled = !videoEnabled;
  for (const track of localStream.getVideoTracks()) track.enabled = videoEnabled;
  setTileState(net.playerId, { audio: audioEnabled, video: videoEnabled });
  updateControlsUi();
  broadcastMediaState();
}

async function flipCamera() {
  if (!localStream || !hasMultiCamera || flipBtn.disabled) return;
  const newFacing = facingMode === 'user' ? 'environment' : 'user';
  flipBtn.disabled = true;
  let newStream;
  try {
    newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacing }, audio: false });
  } catch (err) {
    console.warn('[video-broadcast] flip getUserMedia failed', err);
    showMediaError(err);
    flipBtn.disabled = false;
    return;
  }
  const newTrack = newStream.getVideoTracks()[0];
  newTrack.enabled = videoEnabled; // preserve current camera-off state on the fresh track
  const oldTrack = localStream.getVideoTracks()[0];

  // replaceTrack swaps the outgoing video on every connection with no
  // renegotiation — that's the whole point of using it here.
  peerManager.replaceVideoTrack(newTrack);
  localStream.removeTrack(oldTrack);
  localStream.addTrack(newTrack);
  oldTrack.stop();

  facingMode = newFacing;
  const tile = tiles.get(net.playerId);
  if (tile) tile.videoEl.srcObject = localStream;
  setSelfMirror();
  flipBtn.disabled = false;
}

broadcastBtn.addEventListener('click', toggleBroadcast);
muteBtn.addEventListener('click', toggleMute);
cameraBtn.addEventListener('click', toggleCamera);
flipBtn.addEventListener('click', flipCamera);

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

function refreshTileChrome() {
  for (const tile of tiles.values()) {
    tile.youBadgeEl.textContent = t(lang, 'you');
    tile.mutedIcon.textContent = t(lang, 'mutedBadge');
    tile.camIcon.textContent = t(lang, 'cameraOffBadge');
  }
}

function setLang(code) {
  if (!STRINGS[code] || code === lang) return;
  lang = code;
  rememberLang(lang);
  applyStaticStrings(lang); // re-applies data-i18n text, incl. insecureMsg banner
  buildLangSwitch();
  if (net) setNetUi(net.mode);
  renderRoster();
  updateControlsUi();
  refreshTileChrome();
  renderMediaError(); // re-translate a currently-shown error, if any
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------

function checkSecureContext() {
  if (window.isSecureContext) return true;
  // Receiving/watching other broadcasters doesn't need getUserMedia and
  // still works fine over plain HTTP LAN (same as every other ogh-net
  // program) — only the *local* broadcast toggle is blocked.
  insecureBanner.hidden = false;
  broadcastBtn.disabled = true;
  return false;
}

async function boot() {
  console.log('[video-broadcast] boot', Date.now());
  applyStaticStrings(lang);
  buildLangSwitch();

  if (!window.RTCPeerConnection) {
    mediaErrorEl.textContent = t(lang, 'webrtcUnsupported');
    mediaErrorEl.hidden = false;
    broadcastBtn.disabled = true;
    return;
  }

  checkSecureContext();

  net = await OGHNet.connect({ gameId: GAME_ID, name: myName() });
  bootHeader();
  setNetUi(net.mode);

  peerManager = createPeerManager({
    net,
    hooks: {
      onPeerState({ peerId, state }) {
        peerStatus.set(peerId, state);
        renderRoster();
        if (state === 'failed' || state === 'closed') removeTile(peerId);
      },
      onTrack({ peerId, stream }) {
        ensureTile(peerId, { isSelf: false });
        setTileName(peerId, rosterById.get(peerId)?.name);
        if (stream) setTileStream(peerId, stream);
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
    } else if (action === 'media-state' && from) {
      if (payload?.broadcasting === false) {
        removeTile(from);
        return;
      }
      // Tile is normally created by onTrack (real media arriving); this
      // also creates it so a media-state that arrives first (or a
      // mute/camera toggle with no fresh track event) still has a tile to
      // update rather than being silently dropped.
      ensureTile(from, { isSelf: false });
      setTileName(from, rosterById.get(from)?.name);
      setTileState(from, { audio: payload?.audio, video: payload?.video });
    }
  });

  handlePlayers(net.players);
  updateControlsUi();

  const cleanup = () => {
    if (isBroadcasting && localStream) {
      for (const track of localStream.getTracks()) track.stop();
    }
    peerManager?.destroy();
  };
  window.addEventListener('pagehide', cleanup);
  window.addEventListener('beforeunload', cleanup);
}

boot();
