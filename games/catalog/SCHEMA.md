# Game catalog — data schema

Living registry of games, variants, families, and authors.  
**Now:** JSON (git-friendly, no SQLite required).  
**Later:** same fields → SQLite on Android (`games.db`).

## Files

| File | Role |
|------|------|
| [`games.json`](games.json) | Game rows |
| [`families.json`](families.json) | Mechanic / franchise families |
| [`authors.json`](authors.json) | Normalized authors |
| [`SCHEMA.md`](SCHEMA.md) | This document |

Schema version: **1**. Each root JSON has `schemaVersion`.

---

## Table `games` (array element)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique slug: `comet`, `lan-chat` |
| `kind` | string | no | `game` (default) or `program` (utility app) |
| `name` | string | yes | Display name (default locale) |
| `names` | map locale→string | no | Localized titles |
| `tagline` | string | no | One-line pitch |
| `style` | string | yes | Primary art style (see dictionary) |
| `styles` | string[] | no | Extra style tags |
| `genres` | string[] | yes | Genres |
| `controls` | object | yes | Input model (see below) |
| `parameters` | object | no | Tunables (difficulty, etc.) |
| `tags` | string[] | no | Free tags |
| `instructions` | map locale→string | yes | How to play (short) |
| `instructionsLong` | map locale→string | no | Longer guide |
| `authorId` | string \| null | no | FK → `authors.id` |
| `authorInline` | object \| null | no | Inline author if not in authors.json |
| `dates.added` | ISO date | yes | Added to catalog |
| `dates.updated` | ISO date | no | Last metadata edit |
| `dates.released` | ISO date | no | Pack release |
| `familyId` | string \| null | no | FK → families |
| `variantOf` | string \| null | no | Base game id if this is a variant |
| `relatedIds` | string[] | no | Related games |
| `relationNote` | string | no | e.g. “pixel + grid wells” |
| `players.min` | int | yes | |
| `players.max` | int | yes | |
| `players.solo` | bool | yes | |
| `entry` | string | yes | Path under pack root: `comet/client/index.html` or `lan-chat/client/index.html` |
| `manifest` | string | no | Path under pack root to manifest.json |

**Pack root:** `games/<id>/` when `kind` is `game` (or omitted); `programs/<id>/` when `kind` is `program`.
| `version` | string | no | semver |
| `sizeBudgetKb` | number | no | Budget |
| `sizeMeasuredKb` | number | no | Measured `du` |
| `status` | enum | yes | `idea` \| `wip` \| `experimental` \| `playable` \| `stable` \| `deprecated` |
| `license` | string | no | MIT, CC0, … |
| `familyFriendly` | bool | yes | |
| `localeDefault` | string | no | `en` |
| `multiplayer` | object | no | MP metadata |
| `notes` | string | no | Internal notes |

### `authorInline`

```json
{
  "name": "Ada Lovelace",
  "email": null,
  "site": "https://example.com",
  "links": [{ "label": "GitHub", "url": "https://github.com/ada" }]
}
```

### `controls`

```json
"controls": {
  "primary": "touch",
  "supported": ["touch", "mouse"],
  "keyboard": "none",
  "mouse": "ok",
  "notes": {
    "en": "Tap to play."
  }
}
```

| Field | Values |
|-------|--------|
| `primary` | `touch` \| `mouse` \| `keyboard` \| `hybrid` |
| `supported` | list of device kinds |
| `keyboard` | `none` \| `optional` \| `required` |
| `mouse` | `none` \| `ok` \| `required` |

**Gamepad** is reserved; do not use in rows yet.

Lobby filter ideas:

| Filter | Rule |
|--------|------|
| Phone-friendly | has `touch` and keyboard ≠ `required` |
| Keyboard OK | keyboard is optional/required |
| Hybrid | `primary` = hybrid or both touch + keyboard |

### `parameters`

Free-form descriptors for in-game settings:

```json
"parameters": {
  "difficulty": {
    "type": "enum",
    "default": "normal",
    "options": ["easy", "normal", "hard"],
    "affects": ["wellsPerLevel", "cometSpeedMult"]
  }
}
```

Types: `enum` · `int` · `float` · `bool` · `derived` · `fixed`

### `multiplayer`

```json
"multiplayer": {
  "status": "ready",
  "protocol": "ogh-net-v1",
  "notes": "Action relay; host-player optional authority"
}
```

`status`: `none` \| `planned` \| `ready-offline` \| `ready` \| `stable`

---

## Table `authors`

| Field | Type |
|-------|------|
| `id` | string |
| `name` | string |
| `email` | string \| null |
| `site` | string \| null |
| `links` | {label, url}[] |
| `notes` | string \| null |

---

## Table `families`

One **mechanic / fantasy**, multiple styles or rule variants.

| Field | Type |
|-------|------|
| `id` | string |
| `name` | string |
| `names` | map |
| `description` | map locale→string |
| `gameIds` | string[] |
| `baseGameId` | string \| null |
| `dates.added` | ISO date |

Example: family `comet` → `comet` + `comet-pixel`.

Relations:

1. `familyId` — all variants  
2. `variantOf` — fork tree  
3. `relatedIds` — “see also”

---

## Art `style` dictionary

| id | Meaning |
|----|---------|
| `neon-vector` | Gradients, glow, smooth canvas |
| `pixel` | Low-res, nearest-neighbor, limited palette |
| `pixel-hires` | Pixel art on high-res canvas |
| `flat-ui` | Flat shapes |
| `ascii` | Text / Unicode |
| `minimal-line` | Monoline / sparse UI |
| `hand-drawn` | Sketch look |
| `shader-abstract` | Heavy fullscreen shader |

---

## SQLite migration sketch

```sql
CREATE TABLE authors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  site TEXT,
  links_json TEXT,
  notes TEXT
);

CREATE TABLE families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  names_json TEXT,
  description_json TEXT,
  base_game_id TEXT,
  date_added TEXT NOT NULL
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  names_json TEXT,
  tagline TEXT,
  style TEXT NOT NULL,
  styles_json TEXT,
  genres_json TEXT NOT NULL,
  controls_json TEXT NOT NULL,
  tags_json TEXT,
  instructions_json TEXT NOT NULL,
  instructions_long_json TEXT,
  author_id TEXT REFERENCES authors(id),
  author_inline_json TEXT,
  date_added TEXT NOT NULL,
  date_updated TEXT,
  date_released TEXT,
  family_id TEXT REFERENCES families(id),
  variant_of TEXT REFERENCES games(id),
  related_ids_json TEXT,
  relation_note TEXT,
  players_min INTEGER NOT NULL,
  players_max INTEGER NOT NULL,
  players_solo INTEGER NOT NULL,
  entry TEXT NOT NULL,
  manifest TEXT,
  version TEXT,
  size_budget_kb REAL,
  size_measured_kb REAL,
  status TEXT NOT NULL,
  license TEXT,
  family_friendly INTEGER NOT NULL,
  locale_default TEXT,
  multiplayer_json TEXT,
  notes TEXT
);
```

JSON → SQLite import script: when Android host / CLI needs it.

---

## Maintenance rules

1. New pack → row in `games.json` (+ family/author as needed).  
2. Style/rule variants get a **new `id`**, not an overwrite.  
3. Prefer symmetric `relatedIds`.  
4. Publish author email only with consent.  
5. Update `sizeMeasuredKb` after big asset changes.  
6. Never store binaries inside JSON — paths only.

## Validation

```bash
python3 tools/validate_catalog.py
```
