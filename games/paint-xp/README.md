# Paint XP

**Solo creative tool / sandbox.** A small MS-Paint clone styled as classic
**Windows XP "Luna"** chrome — blue-gradient title bar, beveled gray toolbox,
a 28-swatch color palette, and a status bar. This is a deliberate style
exception for the hub: fully skeuomorphic/retro, not the usual neon-vector
look. System fonts only (`Tahoma, "Segoe UI", Verdana, sans-serif`) — no
webfont is bundled or fetched.

## Tools

| Tool | Behavior |
|---|---|
| **Select** | Rectangular marquee. Drag on empty canvas to select; drag again *inside* the selection to cut-and-move it (leaves background color behind). |
| **Eraser** | Paints in the background/secondary color at a fixed, larger size — classic Paint eraser behavior. |
| **Fill** | Flood fill (4-directional, `ImageData`-based) with a small color-match tolerance so anti-aliased edges (e.g. in an opened photo) don't leave an unfilled ring. |
| **Pick Color** (eyedropper) | Click the canvas to set a color from the pixel under the cursor. |
| **Pencil** | 1px freehand, plotted pixel-by-pixel (Bresenham) for a genuinely hard, non-anti-aliased edge — `ctx.stroke()` always anti-aliases vector paths, which classic Paint's pencil never did. |
| **Brush** | Freehand at a selectable size (1/2/4/8px, shown as size dots below the toolbox when Brush is active). |
| **Text** | Click to place a cursor, type, commit with Enter or by clicking away. An absolutely-positioned `<input>` overlays the canvas while typing; `ctx.fillText` bakes it in on commit. |
| **Line / Rectangle / Ellipse** | Click-drag with a live preview, commits on release. Rectangle/Ellipse have a **Filled** toggle in the tool-options panel; when filled, the outline uses one color and the fill uses the other (see below). |

**Undo/Redo:** snapshots the canvas `ImageData` onto a stack before each
committed stroke/shape/fill/transform (capped at 20 entries). `Ctrl+Z` /
`Ctrl+Y`, or Edit → Undo/Redo.

## The left/right (primary/secondary) color convention

This is core to how classic Paint actually works, not just a visual detail:

- **Left click / primary touch** draws with the **foreground** color.
- **Right click** (or **long-press** a palette swatch on touch) sets/uses the
  **background** color.
- The doubled square next to the palette shows both: the front square is the
  foreground color, the offset square behind it is the background color.
- The **Eraser** always paints in the background color, regardless of button.
- With **Filled** shapes, a left-drag outlines in the foreground color and
  fills with the background color; a right-drag swaps the two.

## Menus

- **File** — New, Open (loads a picked image, scaled to fit and centered),
  Save as PNG (`canvas.toDataURL('image/png')` + a triggered download —
  purely local, no server involved), Exit (returns to the hub library — this
  runs in a browser tab, so "Exit" is a close-hint, not a real window close).
- **Edit** — Undo, Redo, Select All, Clear Selection, Clear Image.
- **View** — toggle the Tool Box / Color Box / Status Bar.
- **Image** — Flip Horizontal, Flip Vertical, Rotate 90°, Invert Colors.
- **Colors** — Edit Colors... (opens the browser's native color picker for
  the foreground color; clicking either indicator square does the same).
- **Help** — About Paint XP.

## Controls

| Input | Action |
|---|---|
| Pointer (mouse/touch/pen) drag on canvas | Draw with the active tool |
| Left click / primary touch | Uses the foreground color |
| Right click / long-press | Uses the background color |
| Left/right click a palette swatch | Set foreground / background color |
| Long-press a palette swatch (touch) | Set background color |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Escape` | Close an open menu, or drop the current selection |

Touch is a first-class input here (Pointer Events throughout, not
mouse-only), since this hub's controls are touch-primary. The toolbar icons
themselves stay small (authentic to the era), but each button's actual tap
target is padded past the icon.

## RTL / i18n

`en / ru / zh / es / ar / fr`, detected from `?lang=`, then
`navigator.language`, default `en`. The simulated XP window (title bar, menu
bar, toolbox, palette, canvas, status bar) deliberately stays laid out
left-to-right even under Arabic — mirroring `games/music-synth`'s
`.pk-piano { direction: ltr }` precedent, because tool-grid positions,
palette swatch order, and the canvas itself carry *positional* meaning that
must never mirror, even though every string is fully translated. Free-text
dialog bodies (About, confirmations) do flip to RTL, since prose has no
positional meaning to break.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/paint-xp/client/
```

## Files

```text
client/
├── index.html       ← layout: title bar, menu bar, toolbox, canvas, palette, status bar
├── style.css         ← Windows XP "Luna" chrome (gradients, border-style outset/inset bevels)
├── paint-engine.js   ← canvas engine: undo/redo stack, flood fill, flip/rotate/invert, coord mapping
├── app.js            ← UI: toolbox/palette/menus, pointer-driven drawing per tool, dialogs, i18n wiring
└── i18n.js           ← en/ru/zh/es/ar/fr strings (RTL-aware)
```

MIT licensed, same as the hub.
