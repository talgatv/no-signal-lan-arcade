/**
 * OGHProfile — local-only player profile + per-game progress.
 *
 * Storage: browser localStorage only. Nothing is uploaded to the host/server.
 *
 * Usage in a game:
 *   import { OGHProfile } from '../../_shared/js/ogh-profile.js';
 *   OGHProfile.saveProgress('comet', { level: 3, score: 900 });
 *   const data = OGHProfile.getProgress('comet');
 *
 * Docs: docs/contributing/SAVE_PROGRESS.md
 */

import { getAvatarSrc, OGH_AVATAR_PRESETS } from './ogh-avatars.js';

const STORAGE_KEY = 'ogh_player_v1';
const SCHEMA = 1;

function nowIso() {
  return new Date().toISOString();
}

function defaultState() {
  return {
    schema: SCHEMA,
    profile: {
      nickname: `Player${Math.floor(Math.random() * 90 + 10)}`,
      avatarId: OGH_AVATAR_PRESETS[0].id,
      avatarCustom: null, // data URL when avatarId === 'custom'
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    progress: {
      // [gameId]: { updatedAt, label?, summary?, data }
    },
  };
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const data = safeParse(raw);
    if (!data || typeof data !== 'object') return defaultState();
    const base = defaultState();
    return {
      schema: SCHEMA,
      profile: { ...base.profile, ...(data.profile || {}) },
      progress: data.progress && typeof data.progress === 'object' ? data.progress : {},
    };
  } catch {
    return defaultState();
  }
}

function writeRaw(state) {
  state.profile.updatedAt = nowIso();
  state.schema = SCHEMA;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('[OGHProfile] save failed (quota?)', e);
    return false;
  }
}

function emit(name, detail) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch { /* SSR / old browsers */ }
}

export const OGHProfile = {
  STORAGE_KEY,
  SCHEMA,

  /** Full state snapshot (clone). */
  load() {
    return structuredClone ? structuredClone(readRaw()) : JSON.parse(JSON.stringify(readRaw()));
  },

  getProfile() {
    return this.load().profile;
  },

  getNickname() {
    return this.getProfile().nickname || 'Player';
  },

  /**
   * @param {string} name
   */
  setNickname(name) {
    const s = readRaw();
    const cleaned = String(name || '').trim().slice(0, 24) || s.profile.nickname;
    s.profile.nickname = cleaned;
    writeRaw(s);
    emit('ogh-profile-changed', { profile: s.profile });
    return s.profile;
  },

  /**
   * @param {string} avatarId preset id or 'custom'
   * @param {string|null} customDataUrl required if custom
   */
  setAvatar(avatarId, customDataUrl = null) {
    const s = readRaw();
    if (avatarId === 'custom') {
      if (!customDataUrl || typeof customDataUrl !== 'string') {
        throw new Error('custom avatar requires data URL');
      }
      // soft size guard ~400KB data URL
      if (customDataUrl.length > 400_000) {
        throw new Error('avatar too large (max ~300KB image)');
      }
      s.profile.avatarId = 'custom';
      s.profile.avatarCustom = customDataUrl;
    } else {
      s.profile.avatarId = avatarId || OGH_AVATAR_PRESETS[0].id;
      s.profile.avatarCustom = null;
    }
    writeRaw(s);
    emit('ogh-profile-changed', { profile: s.profile });
    return s.profile;
  },

  /** Resolved image src for UI. */
  getAvatarSrc() {
    const p = this.getProfile();
    return getAvatarSrc(p.avatarId, p.avatarCustom);
  },

  /**
   * Save game progress (local only).
   * @param {string} gameId catalog id
   * @param {object} data serializable object
   * @param {{ summary?: string, label?: string }} [meta]
   */
  saveProgress(gameId, data, meta = {}) {
    if (!gameId) throw new Error('gameId required');
    const s = readRaw();
    let payload;
    try {
      payload = JSON.parse(JSON.stringify(data ?? {}));
    } catch {
      throw new Error('progress data must be JSON-serializable');
    }
    s.progress[gameId] = {
      updatedAt: nowIso(),
      label: meta.label || gameId,
      summary: meta.summary || null,
      data: payload,
    };
    writeRaw(s);
    emit('ogh-progress-changed', { gameId, entry: s.progress[gameId] });
    return s.progress[gameId];
  },

  /**
   * @param {string} gameId
   * @returns {object|null} game-specific data or null
   */
  getProgress(gameId) {
    const entry = readRaw().progress[gameId];
    return entry ? entry.data : null;
  },

  /** Full progress map for profile UI. */
  listProgress() {
    const p = readRaw().progress;
    return Object.keys(p)
      .sort((a, b) => (p[b].updatedAt || '').localeCompare(p[a].updatedAt || ''))
      .map((id) => ({ gameId: id, ...p[id] }));
  },

  clearProgress(gameId) {
    const s = readRaw();
    if (gameId) delete s.progress[gameId];
    else s.progress = {};
    writeRaw(s);
    emit('ogh-progress-changed', { gameId: gameId || '*' });
  },

  /** Reset nickname/avatar but keep progress (or wipe all). */
  resetProfile({ keepProgress = true } = {}) {
    const prev = readRaw();
    const s = defaultState();
    if (keepProgress) s.progress = prev.progress;
    writeRaw(s);
    emit('ogh-profile-changed', { profile: s.profile });
    return s.profile;
  },

  /** Export whole vault as plain object. */
  exportObject() {
    return this.load();
  },

  /**
   * Import vault object (merge or replace).
   * @param {object} obj
   * @param {{ mode?: 'replace'|'merge' }} [opts]
   */
  importObject(obj, opts = {}) {
    const mode = opts.mode || 'replace';
    if (!obj || typeof obj !== 'object') throw new Error('invalid profile file');
    const incomingProfile = obj.profile || {};
    const incomingProgress = obj.progress && typeof obj.progress === 'object' ? obj.progress : {};

    if (mode === 'replace') {
      const s = defaultState();
      s.profile = {
        ...s.profile,
        ...incomingProfile,
        updatedAt: nowIso(),
      };
      s.progress = incomingProgress;
      writeRaw(s);
      emit('ogh-profile-changed', { profile: s.profile });
      emit('ogh-progress-changed', { gameId: '*' });
      return s;
    }

    // merge
    const s = readRaw();
    s.profile = {
      ...s.profile,
      nickname: incomingProfile.nickname || s.profile.nickname,
      avatarId: incomingProfile.avatarId || s.profile.avatarId,
      avatarCustom:
        incomingProfile.avatarId === 'custom'
          ? incomingProfile.avatarCustom || s.profile.avatarCustom
          : s.profile.avatarCustom,
    };
    for (const [gid, entry] of Object.entries(incomingProgress)) {
      const cur = s.progress[gid];
      if (!cur || (entry.updatedAt || '') >= (cur.updatedAt || '')) {
        s.progress[gid] = entry;
      }
    }
    writeRaw(s);
    emit('ogh-profile-changed', { profile: s.profile });
    emit('ogh-progress-changed', { gameId: '*' });
    return s;
  },

  /** Trigger browser download of profile JSON. */
  downloadFile(filename) {
    const blob = new Blob([JSON.stringify(this.exportObject(), null, 2)], {
      type: 'application/json',
    });
    const name =
      filename ||
      `ogh-profile-${this.getNickname().replace(/[^\w.-]+/g, '_')}-${Date.now()}.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },

  /**
   * Read a File / Blob (from <input type=file>).
   * @param {File|Blob} file
   * @param {{ mode?: 'replace'|'merge' }} [opts]
   */
  async importFile(file, opts = {}) {
    const text = await file.text();
    const obj = safeParse(text);
    if (!obj) throw new Error('could not parse JSON');
    return this.importObject(obj, opts);
  },
};

// named re-export for convenience
export { OGH_AVATAR_PRESETS, getAvatarSrc };
