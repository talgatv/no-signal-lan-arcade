# World Trail

Offline **whole-world** schematic map for Offline Games Hub: major land, rivers/lakes, highways, and cities. GPS position, compass north arrow, personal pins, movement trail, and LAN sharing of position/trails/pins via `OGHNet`.

## Open

```bash
cd pc && ./start.sh --https
# Phone (same Wi‑Fi): https://<PC_IP>:8080/games/world-trail/client/
# Accept the self-signed cert warning once (Advanced → Proceed).
# Then tap **Enable GPS** / **GPS** and allow location.
```

### Why GPS fails on the phone

Browsers **block Geolocation on plain HTTP** for LAN IPs (`http://192.168…`).
Use **`--https`** on the host. Localhost HTTP is OK only on the PC itself.

Fallback without GPS: **tap the map** to set a SIM position (still works for multiplayer).

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
| **Players** | Roster of LAN participants (tap name → center) |
| **Layers** | Toggle land / water / roads / cities / trails / peers |
| **Clear trail** | Wipe local trail (notifies LAN) |
| **World** | Fit full globe |

## Solo / multiplayer

- **Solo:** full map + GPS/sim + pins + trail; progress pins in `OGHProfile`.
- **LAN:** open the same host + same room; each client broadcasts position ~every 0.8s. You see colored markers, names, trails, and pins. Use **Players** list to jump to someone.
- Without GPS: **tap the map** to set a sim position so others can still see you.
- Offline fallback: `?offline=1` or no WebSocket → local only.

## Cities

~7300 populated places (Natural Earth 10m). Zoom in to reveal more towns and labels.

## Map data

- **Natural Earth** (public domain): land, **10m rivers + lakes**, major roads, ~7k cities.
- Water detail increases when you zoom in (scalerank filter).
- Simplified for size (no street network, no hiking trails).
- Rebuild: `python3 tools/build_world_trail_data.py` (needs network once).

## Size

Target pack **&lt; 10 MB**. Check:

```bash
du -sh games/world-trail
```

## Privacy

Positions are shared only with browsers in the same LAN room on your OGH host — not to a public cloud.
