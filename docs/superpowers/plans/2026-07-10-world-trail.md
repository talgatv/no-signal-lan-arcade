# World Trail Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Ship `games/world-trail` — offline whole-world map with GPS, compass arrow, pins, trails, and LAN share via OGHNet, pack ≤ 10 MB.

**Architecture:** Canvas 2D + equirectangular projection; Natural Earth–derived JSON in `client/data/`; modules for geo, render, sensors, trail, pins, net-sync; multiplayer relay free-for-all.

**Tech Stack:** Vanilla JS (ES modules), Canvas 2D, OGHNet, OGHProfile, Python one-shot data builder optional.

**Spec:** `docs/superpowers/specs/2026-07-10-world-trail-design.md`

---

## Files

| Path | Role |
|------|------|
| `games/world-trail/manifest.json` | Pack identity |
| `games/world-trail/README.md` | Controls, attribution, size |
| `games/world-trail/client/index.html` | Shell + HUD |
| `games/world-trail/client/style.css` | Layout |
| `games/world-trail/client/game.js` | Boot, UI, loop |
| `games/world-trail/client/geo.js` | Projection, haversine |
| `games/world-trail/client/map-render.js` | Draw layers + overlays |
| `games/world-trail/client/sensors.js` | GPS, compass, sim |
| `games/world-trail/client/trail.js` | Trail buffer |
| `games/world-trail/client/pins.js` | Pins + OGHProfile |
| `games/world-trail/client/net-sync.js` | OGHNet |
| `games/world-trail/client/data/*.json` | land, rivers, roads, cities |
| `tools/build_world_trail_data.py` | Download/simplify NE → data |
| `games/catalog/games.json` | Catalog row |

---

### Task 1: Scaffold pack + catalog

- [ ] `python3 tools/new_game.py world-trail --multiplayer --title "World Trail"`
- [ ] Update manifest/catalog fields per spec (utility, 1–8 players, multiplayer ready)
- [ ] `python3 tools/validate_catalog.py`

### Task 2: Map data under size budget

- [ ] Run/build simplified Natural Earth (or curated compact GeoJSON) into `client/data/`
- [ ] Verify `du -sh games/world-trail` well under 10 MB

### Task 3: Core modules (geo, render, sensors, trail, pins, net)

- [ ] Implement modules + wire `game.js` / HTML / CSS
- [ ] North-up map, pan/zoom, layers, GPS/sim, compass arrow, pins, trail, OGHNet

### Task 4: README, validate, size, smoke

- [ ] README with controls + attribution
- [ ] validate_catalog + size check
- [ ] Manual smoke via host if possible

---

## Execution note

Inline implementation in one session is preferred for data+UI cohesion.
