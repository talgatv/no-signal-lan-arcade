# World Trail

Offline **whole-world** schematic map for Offline Games Hub: major land, rivers/lakes, highways, and cities. GPS position, compass north arrow, personal pins, movement trail, and LAN sharing of position/trails/pins via `OGHNet`.

## Open

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/world-trail/client/
# or library: http://127.0.0.1:8080/games/
```

## Controls

| Control | Action |
|---------|--------|
| Drag | Pan |
| Pinch / mouse wheel | Zoom |
| **Center** | Recenter on you (requests compass permission on iOS) |
| **Pin** | Drop pin at current position |
| Long-press map | Pin at that location |
| Tap pin | Info / delete own pin |
| Tap map (no GPS) | Set simulated position |
| **Layers** | Toggle land / water / roads / cities / trails / peers |
| **Clear trail** | Wipe local trail (notifies LAN) |
| **World** | Fit full globe |

## Solo / multiplayer

- **Solo:** full map + GPS/sim + pins + trail; progress pins in `OGHProfile`.
- **LAN:** same host room — peers see each other’s markers, trails, and pins.
- Offline fallback: `?offline=1` or no WebSocket → local only.

## Map data

- **Natural Earth** (public domain): land, rivers, lakes, major roads, populated places.
- Simplified for size (no street network, no hiking trails).
- Rebuild: `python3 tools/build_world_trail_data.py` (needs network once).

## Size

Target pack **&lt; 10 MB**. Check:

```bash
du -sh games/world-trail
```

## Privacy

Positions are shared only with browsers in the same LAN room on your OGH host — not to a public cloud.
