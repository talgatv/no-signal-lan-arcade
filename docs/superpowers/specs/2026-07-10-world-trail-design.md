# World Trail — Design Spec

**Date:** 2026-07-10  
**Pack id:** `world-trail`  
**Status:** Approved for implementation planning  
**Integration rules:** `docs/contributing/GAME_INTEGRATION_MANUAL.md`

---

## 1. Summary

`world-trail` is a solo + LAN multiplayer **offline orientation utility** for Offline Games Hub:

- Simplified **whole-world** map (major cities, rivers/lakes, major roads — no street trails).
- **GPS** position (with desktop/simulation fallback).
- **Compass** as a north arrow (map stays north-up; no map rotation in v1).
- User **pins** (named points).
- **Breadcrumb trail** of movement.
- Share position, trail, and pins with others on the **same LAN room** via `OGHNet`.

Hard constraints from the hub:

- Pack size **≤ 10 MB** (`du -sh games/world-trail`).
- No CDN / no required internet after host serves files.
- Static HTML/CSS/JS under `games/world-trail/`.
- Catalog row + `validate_catalog.py` clean.

---

## 2. Goals and non-goals

### Goals (v1)

| Goal | Done when |
|------|-----------|
| World basemap offline | Land, major rivers/lakes, major roads, major cities render from bundled data |
| Browse map | Pan + pinch/wheel zoom on Canvas |
| Self location | GPS marker + accuracy ring when available |
| Compass | HUD north arrow from device orientation |
| Pins | Place / list / remove pins; persist locally |
| Trail | Record thinned path while moving |
| LAN share | Other players in room see positions, trails, pins |
| Offline fallback | Works with `?offline=1` or no WebSocket — local only, no exception spam |
| Size | Entire pack ≤ 10 MB |

### Non-goals (v1)

- Turn-by-turn navigation or routing.
- Street-level roads, hiking trails, or building footprints.
- Full OpenStreetMap planet or satellite imagery.
- Map rotation to heading (north-up only).
- Cloud sync, accounts, or server-side history.
- Perfect indoor GPS / desktop GPS accuracy.
- Host-authoritative anti-cheat simulation.

---

## 3. User experience

### Layout

```
┌─────────────────────────────────────────┐
│ ONLINE · room main     lat, lon   🧭 N  │
│ players: you, Alice, Bob                │
│                                         │
│            Canvas (world map)           │
│   ● self   ○ peers   ◆ pins             │
│   ─ own trail   ─ peer trails           │
│                                         │
│ [Center] [Pin] [Layers] [Clear trail]   │
└─────────────────────────────────────────┘
```

### Controls

| Input | Action |
|-------|--------|
| Drag | Pan |
| Pinch / wheel | Zoom |
| **Center** | Recenter camera on self (or last known / sim) |
| **Pin** | Drop pin at self location (or map center if no fix) |
| Long-press map (optional) | Drop pin at that lat/lon |
| **Layers** | Toggle roads / rivers / cities / trails / peers |
| **Clear trail** | Clear local trail (optionally broadcast clear) |
| Tap pin marker | Show label / delete own pin |

Touch-first; mouse for desktop testing. Large hit targets (≥ 44px).

### Visual style

- Hub-friendly dark neon (`ogh-base` tokens): dark ocean, muted land, cyan roads, blue water, green forest tint if landcover present else land fill only.
- Self marker distinct; peers colored by stable hash of `playerId`.
- Attribution footer: Natural Earth (public domain).

### Compass (v1 decision)

**North arrow only** — map projection stays north-up. Avoids motion sickness and complex bearing math. Heading from device may also rotate the self-marker chevron if available.

---

## 4. Architecture

### Pack layout

```text
games/world-trail/
  manifest.json
  README.md
  client/
    index.html
    style.css
    game.js           # boot, HUD, wiring
    map-render.js     # canvas draw loop, layers, camera
    geo.js            # lat/lon ↔ world/screen (equirectangular)
    sensors.js        # geolocation + orientation + sim mode
    trail.js          # ring buffer + distance thinning
    pins.js           # local pin model + OGHProfile
    net-sync.js       # OGHNet connect + handlers
    data/
      land.json       # simplified polygons (or topojson)
      rivers.json
      roads.json
      cities.json
```

Optional author-only script (not counted in pack runtime if kept outside pack, or tiny):

- `tools/build_world_trail_data.py` — download/simplify Natural Earth → `client/data/*` (run once by maintainers; commit outputs).

### Modules and responsibilities

| Module | Responsibility | Depends on |
|--------|----------------|------------|
| `geo.js` | Project/unproject; zoom scale; clamp | — |
| `map-render.js` | Draw static layers + dynamic overlays | `geo`, data files |
| `sensors.js` | GPS watch, compass events, sim tap mode | — |
| `trail.js` | Append if moved ≥ threshold; cap length | `geo` (distance) |
| `pins.js` | CRUD pins; persist; export list | `OGHProfile` |
| `net-sync.js` | Throttled send; apply remote state | `OGHNet` |
| `game.js` | UI buttons, rAF loop, pause on hidden | all above |

### Projection

**Equirectangular** (plate carrée) for simplicity:

- `x = (lon + 180) / 360 * worldW`
- `y = (90 - lat) / 180 * worldH`

Good enough for a schematic world view at this scale. No dependency on d3-geo.

### Render pipeline

1. Load JSON data once at boot (or progressive: land first, then rest).
2. Static layers drawn into an offscreen cache invalidated on zoom/pan only when needed; or draw each frame with simple culling if data is small enough.
3. Each frame: apply camera transform → draw cached/static → trails → pins → peer markers → self + accuracy ring → HUD is DOM.

Target: 30–60 fps on mid phones; cap `devicePixelRatio` at 2.

---

## 5. Map data

### Source

[Natural Earth](https://www.naturalearthdata.com/) — **public domain**.

| Layer | NE theme (approx.) | Filter |
|-------|-------------------|--------|
| Land | 110m or 50m land | Simplify aggressively |
| Rivers / lakes | 110m/50m rivers, lakes | Major only |
| Roads | 10m roads | High rank / major highways only; simplify |
| Cities | Populated places | Population or scalerank threshold |

### Packaging rules

- Pre-simplify offline (mapshaper / Python shapely / topojson) before commit.
- Prefer few files, minified JSON, short property names (`n` name, `p` pop).
- Drop unused attributes.
- Target **data + code &lt; 8 MB**, headroom to 10 MB hard max.
- If roads blow the budget: drop lowest rank roads first; keep land + rivers + cities + GPS features.

### Forests

Full global forest vectors do not fit. v1 options (pick one during implementation by size):

1. **Omit forest polygons** — land fill only (simplest, preferred if size tight).
2. Optional very coarse landcover tint if a tiny dataset fits (&lt; ~1 MB).

UI copy should not promise detailed forests if omitted.

---

## 6. Sensors

### GPS

```text
navigator.geolocation.watchPosition(success, error, {
  enableHighAccuracy: true,
  maximumAge: 2000,
  timeout: 15000
})
```

- Update self marker; feed `trail.js`.
- Show accuracy circle when `coords.accuracy` present.
- On denial / unavailable: banner + **sim mode** (tap map or “set position” uses map center / click as fake GPS for LAN demos).

### Compass

- `DeviceOrientationEvent` / `deviceorientationabsolute` when available.
- iOS may require `requestPermission` after user gesture — trigger from first tap on **Center** or any primary button.
- If unavailable: hide or gray out compass; map still works.

### Visibility

Pause heavy work when `document.hidden` (stop rAF or reduce; keep GPS optional or pause watch to save battery — v1: pause rAF, keep last GPS).

---

## 7. Trails

| Parameter | v1 default |
|-----------|------------|
| Min distance between points | ~30 m (haversine) |
| Or max time gap | also record if ≥ 3 s and moved &gt; 5 m |
| Max points per player | 1500 (ring buffer) |
| Style | Polyline; self vs peer color |

Clear trail: local clear; send `trail_clear` so peers drop that player’s line.

---

## 8. Pins

Model:

```json
{
  "id": "uuid-or-rand",
  "lat": 0,
  "lon": 0,
  "label": "Camp",
  "by": "playerId",
  "t": 1710000000000
}
```

- Local pins + remote pins merged in memory; only owner deletes own (or anyone deletes own-only in v1).
- Persist **local user’s pins** via `OGHProfile.saveProgress('world-trail', { pins, ... })`.
- Cap ~100 pins total displayed; drop oldest remote if needed.

---

## 9. Multiplayer (OGHNet)

### Pattern

**Relay free-for-all** (casual): everyone applies events; no host simulation required for correctness of a map utility.

```js
const net = await OGHNet.connect({ gameId: 'world-trail' });
```

### Messages

| Action | Payload | Rate |
|--------|---------|------|
| `hello` | `{ name, color? }` | on join |
| `pos` | `{ lat, lon, acc?, hdg? }` | throttle **1.5 s** |
| `trail` | `{ pts: [[lat,lon], ...] }` append batch | when ≥ 5 new pts or every 5 s |
| `trail_clear` | `{}` | on clear |
| `pin` | `{ id, lat, lon, label, t }` | on place |
| `unpin` | `{ id }` | on delete |

### Presence

- `net.on('players')` → roster in HUD.
- Peer last `pos` older than 60 s → dim marker.
- Leave: marker removable after timeout (no explicit leave message required).

### Offline

- `net.mode === 'offline'`: all features local; sends are no-ops or local-only as per ogh-net template.
- No throw loops if WS down.

### Privacy note (README)

Positions shared only with browsers in the same LAN room on the user’s host — not uploaded to a public cloud by this pack.

---

## 10. Catalog and manifest

### manifest.json (essentials)

- `id`: `world-trail`
- `name`: `World Trail`
- `minPlayers` / `maxPlayers`: 1 / 8
- `supportsSolo`: true
- `genres`: e.g. `["utility", "casual"]`
- `style`: `neon-vector` or `minimal-line`
- `controls`: primary touch; mouse ok; keyboard none/optional
- `entry.client`: `client/index.html`
- `familyFriendly`: true
- `orientation`: `any`

### games.json row

- `players`: `{ "min": 1, "max": 8, "solo": true }`
- `multiplayer`: `{ "status": "ready", "protocol": "ogh-net-v1", "notes": "Relay positions, trails, pins" }`
- `status`: `experimental` then `playable` after smoke tests
- `instructions.en` / `ru` short how-to
- `entry`: `world-trail/client/index.html`
- Attribution in README and on-map footer

---

## 11. Size and offline rules

| Check | Rule |
|-------|------|
| `du -sh games/world-trail` | ≤ 10 MB |
| Scripts | No `https://cdn...` |
| Fonts | `_shared` or system |
| Optional online | None required |

Tips if over budget: simplify roads first, reduce city count, lower coordinate precision (6 decimals → 4–5), TopoJSON arcs.

---

## 12. Testing matrix

| Test | Expected |
|------|----------|
| Host URL `/games/world-trail/client/` | Loads map |
| Library `/games/` | Title visible |
| Touch pan/zoom | Smooth enough on phone |
| GPS outdoor | Self marker moves; trail grows |
| No GPS | Sim mode works |
| Compass | Arrow moves or graceful hide |
| Pin place/delete | Persists after reload (local) |
| Two browsers same room | See peer pos / pin / trail |
| `?offline=1` | Local only, no spam errors |
| `validate_catalog.py` | exit 0 |
| Size | ≤ 10 MB |

---

## 13. Implementation phases

1. Scaffold pack (`new_game.py --multiplayer`) + catalog.
2. Generate/simplify Natural Earth → `client/data/*`.
3. Canvas map + pan/zoom + layers.
4. Sensors (GPS, compass, sim).
5. Trail + pins + OGHProfile.
6. OGHNet sync + HUD roster.
7. Polish, size check, README, validate.

---

## 14. Open decisions resolved

| Topic | Decision |
|-------|----------|
| Coverage | Whole world, simplified |
| SVG vs Canvas | **Canvas 2D** + JSON data |
| Trails/streets | No street trails |
| Compass | **North arrow**, map north-up |
| Multiplayer | Relay free-for-all via OGHNet |
| Forests | Best-effort / omit if size tight |
| Pack id | `world-trail` |

---

## 15. References

- `docs/contributing/GAME_INTEGRATION_MANUAL.md`
- `docs/contributing/ADD_MULTIPLAYER_GAME.md`
- `docs/contributing/ENGINE_API.md`
- Natural Earth: https://www.naturalearthdata.com/
- Template: `games/_templates/multiplayer`
