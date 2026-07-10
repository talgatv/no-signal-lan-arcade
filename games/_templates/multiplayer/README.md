# TEMPLATE_NAME (multiplayer template)

Shared counter demo using **ogh-net**.

## How multiplayer works

1. Start PC host  
2. Two browsers open this game with the **same room** (lobby sets `?room=`)  
3. Anyone taps — everyone should see the counter update when online  

## Offline

If `/ws` is missing, mode is `offline` and taps only update local score.

## Docs

- `docs/contributing/ADD_MULTIPLAYER_GAME.md`
- `docs/contributing/ENGINE_API.md`
