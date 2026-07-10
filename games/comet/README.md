# Comet

**Solo arcade / physics puzzle.** Guide a comet into the portal by placing temporary **gravity wells**.

## Rules

1. On start / after fail, pick **difficulty** (well budget + comet speed).  
2. The comet coasts with light drag.  
3. **Tap / click** to place a well (1 charge). Place **ahead** of the path, not on the comet.  
4. Wells last a few seconds (longer on Easy).  
5. **Stars** = points + 1 charge.  
6. **Portal** (cyan) = level clear.  
7. Red singularities / walls / leaving the map = fail.

### Difficulty

| | Easy | Normal | Hard |
|--|------|--------|------|
| Charges | base×1.35 **+5** | base×1.15 **+2** | base |
| Comet speed | **×0.72** | ×1.0 | **×1.28** |
| Max speed | 320 | 420 | 520 |
| Well life | ~4.6 s | ~3.6 s | ~2.9 s |
| Pull strength | stronger | normal | slightly weaker |

## Controls

| Input | Action |
|-------|--------|
| Tap / LMB | Place gravity well |
| Overlay buttons | Launch / retry / next level |

## Why this pack exists

- Shared **shader background** + canvas gameplay.  
- Touch-first, one mechanic, high skill ceiling.  
- Tiny size (no bitmaps).  
- Future co-op: two players place wells.

## Run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/comet/client/
```

Variant: [Comet Pixel](../comet-pixel/) (family `comet`).
