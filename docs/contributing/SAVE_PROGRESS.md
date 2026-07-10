# Saving game progress (local profile)

Player **nickname**, **avatar**, and **per-game progress** live only in the browser:

```text
localStorage key: ogh_player_v1
```

**Nothing is uploaded** to the PC host, Android host, or any server.  
Players can **download** their profile as a JSON file and **upload** it later (same or another browser/device).

Hub UI: **`/games/`** or **`/games/hub/`** → profile button.

---

## For game authors

### 1. Import

From `games/<your-id>/client/game.js`:

```js
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
```

### 2. Save progress

```js
const GAME_ID = 'my-game'; // must match catalog id / folder name

OGHProfile.saveProgress(
  GAME_ID,
  {
    // any JSON-serializable object
    level: 3,
    score: 1200,
    inventory: ['root', 'crystal'],
  },
  {
    // optional metadata shown in the profile UI
    label: 'My Game',
    summary: 'Level 3 · 1200 pts',
  }
);
```

Call this when something meaningful changes (level clear, checkpoint, settings).  
Avoid writing every animation frame.

### 3. Load progress

```js
const data = OGHProfile.getProgress(GAME_ID);
if (data) {
  // restore level, score, etc.
  applySave(data);
} else {
  startFresh();
}
```

### 4. Optional: show player name in-game

```js
const name = OGHProfile.getNickname();
const avatarUrl = OGHProfile.getAvatarSrc();
```

Lobby / hub also pass `?name=` for multiplayer display via `ogh-net`.

### 5. Clear one game’s save

```js
OGHProfile.clearProgress(GAME_ID);
```

---

## Profile file format (export)

```json
{
  "schema": 1,
  "profile": {
    "nickname": "Ada",
    "avatarId": "cyan-orb",
    "avatarCustom": null,
    "createdAt": "...",
    "updatedAt": "..."
  },
  "progress": {
    "demo-tap": {
      "updatedAt": "...",
      "label": "Demo Tap",
      "summary": "Score 12 · Best 12",
      "data": { "score": 12, "best": 12 }
    }
  }
}
```

- **Download** / **Upload** are available in the hub profile drawer.  
- **Merge** mode keeps the newer `updatedAt` per `gameId`.  
- **Replace** mode overwrites the whole vault.

---

## Privacy promise (product)

| Stored where | What |
|--------------|------|
| Browser `localStorage` | Profile + progress |
| Downloaded JSON file | Same, user-controlled |
| Host server | **Not stored** |
| Cloud | **Not used** |

Clearing site data in the browser wipes progress unless the user exported a file.

---

## Checklist for PR (if your game saves)

- [ ] Uses `OGHProfile.saveProgress` / `getProgress` with correct `gameId`  
- [ ] `summary` string is human-readable in the hub  
- [ ] Data is JSON-serializable (no functions, no DOM nodes)  
- [ ] Documented in game `README.md`  
- [ ] Works after refresh (reload page, progress returns)  
- [ ] Works after export → import (optional but nice)  

---

## Demo

[`games/demo-tap`](../../games/demo-tap/) saves `{ score, best }` on every tap so you can see progress appear in the hub profile.

## API surface

| Method | Purpose |
|--------|---------|
| `OGHProfile.getNickname()` | string |
| `OGHProfile.setNickname(name)` | |
| `OGHProfile.setAvatar(id, customDataUrl?)` | preset id or `'custom'` |
| `OGHProfile.getAvatarSrc()` | image URL/data URL |
| `OGHProfile.saveProgress(gameId, data, meta?)` | |
| `OGHProfile.getProgress(gameId)` | `data` or `null` |
| `OGHProfile.listProgress()` | array for UI |
| `OGHProfile.clearProgress(gameId?)` | one game or all |
| `OGHProfile.downloadFile()` | export JSON |
| `OGHProfile.importFile(file, { mode })` | `replace` \| `merge` |

Events: `ogh-profile-changed`, `ogh-progress-changed` on `window`.

Related: [ENGINE_API.md](./ENGINE_API.md) · [ADD_A_GAME.md](./ADD_A_GAME.md)
