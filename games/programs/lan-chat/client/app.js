/**
 * LAN Chat & Radio — text + push-to-talk over OGHNet (host WebSocket)
 */
import { OGHNet } from '../../../_shared/js/ogh-net.js';
import { OGHProfile } from '../../../_shared/js/ogh-profile.js';
import { createOghSfx } from '../../../_shared/js/ogh-sfx.js';

const GAME_ID = 'lan-chat';
const MAX_PTT_MS = 8000;
const MAX_B64 = 900_000; // ~soft cap for LAN frames

const sfx = createOghSfx();
const $ = (id) => document.getElementById(id);

const logEl = $('log');
const rosterEl = $('roster');
const netLine = $('netLine');
const input = $('input');
const form = $('form');
const btnPtt = $('btnPtt');
const radioStatus = $('radioStatus');
const panelText = $('panelText');
const panelRadio = $('panelRadio');

let net = null;
let mode = 'text'; // text | radio
let mediaStream = null;
let recorder = null;
let chunks = [];
let pttTimer = null;
let recording = false;

function meName() {
  return OGHProfile.getNickname();
}

function bootHeader() {
  $('meName').textContent = meName();
  $('meAvatar').src = OGHProfile.getAvatarSrc();
}

function setNetUi(m) {
  const online = m === 'online';
  netLine.textContent = online
    ? `ONLINE · room ${net?.room || '?'} · ${net?.playerId || ''}${net?.isHost ? ' · host' : ''}`
    : 'OFFLINE — start PC host (./start.sh) for chat across devices';
  netLine.classList.toggle('online', online);
  netLine.classList.toggle('offline', !online);
}

function renderRoster(list) {
  if (!list?.length) {
    rosterEl.innerHTML = '<li>Empty</li>';
    return;
  }
  rosterEl.innerHTML = list
    .map((p) => {
      const you = net && p.id === net.playerId ? ' you' : '';
      const host = p.isHost ? ' · host' : '';
      return `<li class="${you.trim()}">${escapeHtml(p.name || p.id)}${you ? ' (you)' : ''}${host}</li>`;
    })
    .join('');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function addSystem(text) {
  const div = document.createElement('div');
  div.className = 'bubble system';
  div.textContent = text;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function addTextMessage({ name, text, mine, t }) {
  const div = document.createElement('div');
  div.className = 'bubble' + (mine ? ' mine' : '');
  div.innerHTML = `
    <div class="who">${escapeHtml(name || '??')}</div>
    <div class="body">${escapeHtml(text)}</div>
    <div class="meta">${t ? new Date(t).toLocaleTimeString() : ''}</div>`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function addRadioMessage({ name, mime, b64, mine, t, durationMs }) {
  const div = document.createElement('div');
  div.className = 'bubble radio' + (mine ? ' mine' : '');
  const who = document.createElement('div');
  who.className = 'who';
  who.textContent = `${name || '??'} · radio`;
  const body = document.createElement('div');
  body.className = 'body';
  const label = document.createElement('span');
  label.textContent = '▸';
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.preload = 'auto';
  try {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blob = new Blob([bin], { type: mime || 'audio/webm' });
    audio.src = URL.createObjectURL(blob);
  } catch {
    label.textContent = '(could not decode audio)';
  }
  body.appendChild(label);
  body.appendChild(audio);
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${t ? new Date(t).toLocaleTimeString() : ''}${durationMs ? ` · ${(durationMs / 1000).toFixed(1)}s` : ''}`;
  div.appendChild(who);
  div.appendChild(body);
  div.appendChild(meta);
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
  if (!mine) {
    // Autoplay may be blocked; user can press play. Try quietly.
    audio.play().catch(() => {});
    sfx.play('tick');
  }
}

function sendChat(text) {
  const clean = text.trim().slice(0, 500);
  if (!clean || !net) return;
  const payload = {
    text: clean,
    name: meName(),
    t: Date.now(),
  };
  addTextMessage({ ...payload, mine: true });
  if (net.mode === 'online') {
    net.send('chat-msg', payload);
  } else {
    addSystem('Offline — message only visible to you. Start the PC host for LAN chat.');
  }
  // light local log in profile (optional history)
  try {
    const prev = OGHProfile.getProgress(GAME_ID) || { messages: 0, ptt: 0 };
    OGHProfile.saveProgress(
      GAME_ID,
      { messages: (prev.messages || 0) + 1, ptt: prev.ptt || 0 },
      { label: 'LAN Chat', summary: `Messages ${ (prev.messages || 0) + 1 } · PTT ${prev.ptt || 0}` }
    );
  } catch { /* */ }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  sfx.unlock();
  sendChat(input.value);
  input.value = '';
  input.focus();
});

// mode tabs
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    mode = tab.dataset.mode;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-on', t === tab));
    panelText.hidden = mode !== 'text';
    panelRadio.hidden = mode !== 'radio';
  });
});

function pickMime() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const t of types) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

async function ensureMic() {
  if (mediaStream) return mediaStream;
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone API not available in this browser');
  }
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
    },
    video: false,
  });
  return mediaStream;
}

async function startPtt(ev) {
  ev.preventDefault();
  if (recording || !net) return;
  sfx.unlock();
  if (net.mode !== 'online') {
    radioStatus.textContent = 'Need ONLINE host for radio';
    radioStatus.classList.add('live');
    return;
  }
  try {
    await ensureMic();
  } catch (e) {
    radioStatus.textContent = String(e.message || e);
    radioStatus.classList.add('live');
    return;
  }

  const mime = pickMime();
  chunks = [];
  try {
    recorder = mime
      ? new MediaRecorder(mediaStream, { mimeType: mime, audioBitsPerSecond: 24000 })
      : new MediaRecorder(mediaStream);
  } catch (e) {
    radioStatus.textContent = 'MediaRecorder failed';
    return;
  }

  recording = true;
  btnPtt.classList.add('is-down');
  radioStatus.textContent = 'TX · transmitting…';
  radioStatus.classList.add('live');
  sfx.play('tap');

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  recorder.start(200);
  pttTimer = setTimeout(() => stopPtt(), MAX_PTT_MS);
}

async function stopPtt(ev) {
  if (ev) ev.preventDefault();
  if (!recording || !recorder) return;
  recording = false;
  btnPtt.classList.remove('is-down');
  clearTimeout(pttTimer);
  pttTimer = null;

  const started = Date.now();
  await new Promise((resolve) => {
    recorder.onstop = resolve;
    try {
      recorder.stop();
    } catch {
      resolve();
    }
  });
  const mime = recorder.mimeType || 'audio/webm';
  recorder = null;

  const blob = new Blob(chunks, { type: mime });
  chunks = [];
  if (blob.size < 200) {
    radioStatus.textContent = 'Clip too short';
    radioStatus.classList.remove('live');
    return;
  }

  const b64 = await blobToBase64(blob);
  if (b64.length > MAX_B64) {
    radioStatus.textContent = 'Clip too large — hold shorter';
    radioStatus.classList.remove('live');
    return;
  }

  const payload = {
    name: meName(),
    mime,
    b64,
    t: Date.now(),
    durationMs: Math.min(MAX_PTT_MS, Date.now() - started + 500),
  };
  addRadioMessage({ ...payload, mine: true });
  net.send('ptt', payload);
  radioStatus.textContent = 'Idle · hold to talk';
  radioStatus.classList.remove('live');
  sfx.play('place');

  try {
    const prev = OGHProfile.getProgress(GAME_ID) || { messages: 0, ptt: 0 };
    OGHProfile.saveProgress(
      GAME_ID,
      { messages: prev.messages || 0, ptt: (prev.ptt || 0) + 1 },
      { label: 'LAN Chat', summary: `Messages ${prev.messages || 0} · PTT ${(prev.ptt || 0) + 1}` }
    );
  } catch { /* */ }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || '');
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// PTT pointer handlers
['pointerdown'].forEach((ev) => btnPtt.addEventListener(ev, startPtt));
['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
  btnPtt.addEventListener(ev, stopPtt)
);
// prevent context menu on long-press
btnPtt.addEventListener('contextmenu', (e) => e.preventDefault());

(async () => {
  bootHeader();
  net = await OGHNet.connect({
    gameId: GAME_ID,
    name: meName(),
  });
  setNetUi(net.mode);
  renderRoster(net.players);
  addSystem(net.mode === 'online' ? 'Connected to LAN room.' : 'Offline mode.');

  net.on('mode', setNetUi);
  net.on('players', renderRoster);
  net.on('hello', () => setNetUi(net.mode));

  net.on('action', ({ action, payload, from }) => {
    if (!payload) return;
    if (action === 'chat-msg' && from !== net.playerId) {
      addTextMessage({
        name: payload.name || from,
        text: payload.text || '',
        mine: false,
        t: payload.t,
      });
      sfx.play('tick');
    }
    if (action === 'ptt' && from !== net.playerId) {
      addRadioMessage({
        name: payload.name || from,
        mime: payload.mime,
        b64: payload.b64,
        mine: false,
        t: payload.t,
        durationMs: payload.durationMs,
      });
    }
  });
})();
