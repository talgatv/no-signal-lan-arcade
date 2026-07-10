# Open-source fonts (Google / OFL family)

Local files — **no CDN**, offline-first.  
Sibling of [`../shaders/`](../shaders/) under `_shared`.

Most fonts are **SIL Open Font License 1.1** (OFL).  
JetBrains Mono is OFL. Free to use in OGH games.

## Bundles

| Folder | Family | Use | Files |
|--------|--------|-----|--------|
| `roboto/` | **Roboto** | UI, lobby, neon games | Regular, Medium, Bold |
| `open-sans/` | **Open Sans** | Readable UI | Regular, SemiBold, Bold |
| `noto-sans/` | **Noto Sans** | Broader Unicode (Latin/Cyrillic+) | Regular, Bold |
| `montserrat/` | **Montserrat** | Titles | Regular, Bold |
| `jetbrains-mono/` | **JetBrains Mono** | Timers, scores | Regular, Bold |
| `press-start-2p/` | **Press Start 2P** | Pixel games | Regular |

All together ≈ **4–5 MB**. **Do not ship every face in every game** — load 1–2 via CSS.

## How to load

```html
<link rel="stylesheet" href="../../_shared/css/ogh-fonts.css" />
```

Utility classes:

- `.ogh-font-ui` → Roboto  
- `.ogh-font-text` → Open Sans  
- `.ogh-font-noto` → Noto Sans  
- `.ogh-font-display` → Montserrat  
- `.ogh-font-mono` → JetBrains Mono  
- `.ogh-font-pixel` → Press Start 2P  

Or:

```css
font-family: "Roboto", system-ui, sans-serif;
font-family: "Press Start 2P", monospace;
```

## Not included (too heavy)

- **Noto Sans CJK** (full Chinese) — tens of MB; use system UI or an opt-in pack.  
- Full variable-font mega files — static TTF for simplicity.

## Sources

- https://github.com/google/fonts  
- https://github.com/googlefonts/*  
- https://github.com/JetBrains/JetBrainsMono  
- https://github.com/JulietaUla/Montserrat  
