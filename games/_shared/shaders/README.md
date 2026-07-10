# Shared shaders

Readable fragment/vertex sources for experiments.

The main runtime shader is **inlined** in `../js/ogh-shader-bg.js`  
so games work on a static host without fetching `.glsl` (CORS / path issues).

This folder holds editable copies:

| File | Idea |
|------|------|
| `plasma-field.frag.glsl` | Neon field + stars (as in OGHShaderBg) |
| `grid-warp.frag.glsl` | Cyber grid (placeholder) |

**Size rule:** short shaders (tens of lines), `mediump`, no textures.  
Games draw gameplay on a **2D canvas above** the shader background — simpler and lighter.

## Fonts (sibling under `_shared`)

Fonts do **not** go inside `.glsl` — they live in [`../fonts/`](../fonts/)  
(Roboto, Open Sans, Noto Sans, Montserrat, JetBrains Mono, Press Start 2P).  
CSS: [`../css/ogh-fonts.css`](../css/ogh-fonts.css).
