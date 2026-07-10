# Game idea catalog

Lightweight **browser games** (each ≤ 10 MB) for LAN play.  
Sort order: **genre → mechanics → player count**.

**Player codes**

| Code | Meaning |
|------|---------|
| **S** | Solo (1) |
| **D** | Duel (2) |
| **T** | Trio (3) |
| **P** | Party (4+) |

**Implementation difficulty (planning)**

| | |
|-|-|
| ★ | Trivial (static / simple turns) |
| ★★ | Medium (timers, rooms, sync) |
| ★★★ | Harder (realtime, physics, asymmetric roles) |

**Catalog status:** ideas unless marked shipped. Shortlist MVP games may be marked `🚀`.

Shipped in-repo: **Comet**, **Comet Pixel**, **Rootwork**, **Pulse Race**, **Demo Tap**.  
Add packs via [contributing/ADD_A_GAME.md](../contributing/ADD_A_GAME.md).

---

## 1. Puzzle

| Game | Players | Mechanics | ★ | Notes |
|------|---------|-----------|---|--------|
| **2048** | S | Slide tiles, merge | ★ | Later: duel race |
| **Sudoku** | S | 9×9 digits | ★ | Multiple difficulties |
| **Minesweeper** | S | Open cells | ★ | |
| **Nonogram** | S | Number logic | ★★ | |
| **15-puzzle** | S | Sliding puzzle | ★ | |
| **Memory pairs** | S/D/T/P | Flip cards | ★ | Turn-based multi |
| **Simon / colors** | S/D | Sequence memory | ★ | |
| **Maze of the day** | S/D | Generated maze race | ★★ | |
| **Tangram** | S | Shape assembly | ★★ | Vector = small |

---

## 2. Word

| Game | Players | Mechanics | ★ | Notes |
|------|---------|-----------|---|--------|
| **Wordle-like** | S/D | Guess in 6 tries | ★ | Offline wordpack |
| **Hangman** | S/D/T/P | Letters | ★ | |
| **Anagrams** | S/D | Words from word | ★ | |
| **Alias / Taboo-like** | D/T/P | Explain without roots | ★★ | Teams |
| **Codenames-like** | P (4–8) | Grid associations | ★★ | Party hit |
| **Boggle-like** | D/T/P | Letter grid timer | ★★ | |

---

## 3. Trivia / quiz

| Game | Players | Mechanics | ★ | Notes |
|------|---------|-----------|---|--------|
| **Button quiz** 🚀 | T/P | 4 options → scores | ★★ | JSON question packs |
| **True / false** | D/T/P | Binary | ★ | |
| **Geo quiz** | S/D/P | Flags / capitals | ★ | SVG flags |
| **Speed buzzer** | D/P | Fastest tap | ★★ | Latency-sensitive |

---

## 4. Party / social

| Game | Players | Mechanics | ★ | Notes |
|------|---------|-----------|---|--------|
| **Bingo** | T/P | Host draws numbers | ★ | |
| **Mafia / Werewolf** | P (6–12) | Roles, day/night | ★★★ | |
| **Spyfall-like** | P (4–8) | Location + spy | ★★ | |
| **Draw & guess** | D/T/P | Canvas + chat | ★★★ | |
| **Reaction champ** | T/P | First to tap target | ★★ | |

---

## 5. Board / tabletop

| Game | Players | Mechanics | ★ | Notes |
|------|---------|-----------|---|--------|
| **Tic-tac-toe** 🚀 | D | 3×3 | ★ | MP protocol trainer |
| **Connect Four** | D | Gravity columns | ★ | |
| **Checkers** | D | Jumps | ★★ | |
| **Chess** | D | Full rules | ★★★ | AI optional |
| **Battleship** | D | Hidden grids | ★★ | |
| **Reversi** | D | Flips | ★★ | |
| **Ludo-like** | D/T/P | Dice race | ★★ | |
| **Snakes & ladders** | D/T/P | Luck | ★ | |

---

## 6. Cards

| Game | Players | Mechanics | ★ | Notes |
|------|---------|-----------|---|--------|
| **Klondike solitaire** | S | Classic | ★★ | |
| **Durak-like** | D/T/P | Regional classic | ★★★ | Original naming |
| **War** | D | Rank compare | ★ | |
| **Uno-like** | D/T/P | Colors + specials | ★★ | Original name |

---

## 7. Arcade / action

| Game | Players | Mechanics | ★ | Notes |
|------|---------|-----------|---|--------|
| **Snake** | S/D | Grow | ★ | |
| **Tetris-like** | S/D | Falling pieces | ★★ | |
| **Pong** | D | Bounce | ★★ | |
| **Pulse Race** ✅ | S (+AI) / P later | Top-down circuit | ★★ | Shipped |
| **Bomberman-lite** | D/T/P | Bombs | ★★★ | |
| **Flappy-like** | S/D | Tap jump | ★ | |

---

## 8. Sandbox

| Game | Players | Mechanics | ★ | Notes |
|------|---------|-----------|---|--------|
| **Rootwork** ✅ | S | Dig / place 2D | ★★ | Shipped; not Minecraft |
| **Asteroid base** | S/D | Zero-g dig-build | ★★★ | Idea |
| **Island parcel** | S/D/T | Top-down build | ★★ | Idea |

---

## 9. Physics / hybrid

| Game | Players | Mechanics | ★ | Notes |
|------|---------|-----------|---|--------|
| **Comet** ✅ | S | Gravity wells | ★★ | Shipped neon |
| **Comet Pixel** ✅ | S | Grid wells | ★★ | Variant |

---

## By player count (summary)

### Solo
2048, Sudoku, Minesweeper, Wordle-like, Solitaire, Snake, Tetris-like, **Comet**, **Rootwork**, **Demo Tap**, Flappy-like, geo training.

### 2 players
Tic-tac-toe, Connect Four, Checkers, Chess, Battleship, Pong, Wordle duel, Memory duel, Durak-like, Uno-like.

### 3 players
Quiz, Bingo, Memory, Ludo-like, Uno-like, reaction games.

### 4+
Quiz, Codenames-like, Mafia, Spyfall-like, Bingo, Uno-like, Bomberman-lite, Alias-like.

---

## Implementation tiers

### Tier 0 — prove the engine ✅ / next
1. Solo static client ✅  
2. Turn-based MP (tic-tac-toe) — recommended next  
3. Party broadcast (quiz)  

### Tier 1 — invite friends
Connect Four, Memory, Wordle-like, Battleship, Codenames-like, Uno-like, Bingo  

### Tier 2 — depth
Mafia, Durak-like, Checkers, Tetris-like, Pong, draw-guess, Bomberman-lite  

### Tier 3 — wow / heavy logic
Chess+AI, Risk-lite, escape room co-op  

---

## Release criteria for a pack

1. ≤ 10 MB (prefer most &lt; 2 MB).  
2. Playable with a thumb on a phone.  
3. Rules in &lt; 30 seconds (or one-screen tutorial).  
4. Works with typical Wi‑Fi latency for its genre.  
5. No external CDN/font/API at runtime.  
6. Family-friendly by default.  
7. No trademarked titles.

---

## Mechanics taxonomy (lobby filters)

| Mechanic | Examples |
|----------|----------|
| Turn-based | Checkers, Durak-like, Codenames-like |
| Simultaneous | Quiz, Boggle-like |
| Realtime action | Pong, Bomberman-lite, Pulse Race |
| Hidden info | Battleship, Mafia |
| Teams | Codenames-like, Alias-like |
| Co-op | Escape room lite |
| Drawing | Draw & guess |
| Word input | Wordle-like |
| Dice / RNG | Ludo-like |
| Solo puzzle | Sudoku, Comet |
| Sandbox | Rootwork |

---

## Pack bundles (ideas)

| Pack | Rough contents |
|------|----------------|
| Blackout survival | Quiz, Mafia, Codenames-like, Bingo, Memory |
| Duo | Connect Four, Battleship, Pong, Wordle duel |
| Solo | Comet, Sudoku, Solitaire, Snake, Wordle-like |
| Family | Ludo-like, Memory, Bingo, geo quiz |
| Classics (regional) | Durak-like, Hangman, Battleship, Tic-tac-toe |

---

*Living document — update as playtests and size budgets evolve.*
