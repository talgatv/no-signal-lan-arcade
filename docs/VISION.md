# Vision: Offline Games Hub

**Also known as:** No-Signal LAN Arcade  
**Repo:** https://github.com/talgatv/no-signal-lan-arcade

## Problem

No internet, a power cut, or a room full of people — and you still want to **play together**, not each alone on a phone. Board games are not always at hand. Services like Jackbox need the cloud and often a subscription.

### Origin

The project was sparked when the author experienced a **power outage during the 2025 Los Angeles wildfires**: devices still had charge, the grid and internet did not. A local Wi‑Fi arcade — one host, browser clients, no cloud — is the practical answer for blackouts and similar moments.

## Solution

One device becomes a **local game hub**:

1. Host starts the app/server (PC today, Android later).  
2. Others scan a QR / open an IP in the browser.  
3. Lobby → pick a game from the collection.  
4. Play; state syncs over **LAN WebSocket** (no internet).

## Use cases

### A. Blackout party
- Power bank + 2–6 phones.  
- Host hotspot or a battery-powered router.  
- Party games, trivia, social deduction.

### B. Travel / cabin
- 2–4 people.  
- Duels, classics, co-op.

### C. Family night
- Simple rules, large touch targets, no toxic content.  
- Puzzles, roll-and-move, memory, kids’ quizzes.

### D. Solo while waiting
- Solo packs offline, or host opens the lobby alone.

## Product constraints

| Constraint | Value |
|------------|--------|
| Max size per game pack | ≤ **10 MB** (aim ≪ 2 MB) |
| Network | LAN / hotspot only — **no cloud** |
| Player client | Modern mobile browser |
| Host UI languages (goal) | UN set: en, zh, ru, es, ar, fr |
| Monetization (MVP) | Free / open source |
| Content default | Family-friendly; 18+ only as opt-in packs |

## Out of scope (for now)

- Online matchmaking & accounts  
- Heavy 3D engines (Unity runtime, etc.)  
- Gamepad-only / desktop-only games as the default  
- In-app purchase store in MVP  
- Gameplay video streaming  

## MVP success criteria

1. Host runs on **PC** (and later Android).  
2. ≥ 2 devices join over Wi‑Fi.  
3. ≥ 3 games: solo, 2-player path, party path.  
4. Switch games without restarting the host process.  
5. Same game packs work on any host that speaks the protocol.

## Naming

| Name | Role |
|------|------|
| **Offline Games Hub** | Product / docs name |
| **no-signal-lan-arcade** | GitHub repository |
| `ogh` | Short code prefix |

## Principles

1. Offline is a feature, not a fallback.  
2. Kilobytes are a design material.  
3. Thin hosts; replaceable game packs.  
4. Touch-first.  
5. Open contribution: anyone can add a pack via catalog + PR.
