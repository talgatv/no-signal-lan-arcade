# Shared shaders

Фрагментные/вершинные исходники для экспериментов.

Сейчас основной runtime-шейдер **инлайнится** в `../js/ogh-shader-bg.js`  
(чтобы игра открывалась одним static-server без fetch CORS к `.glsl`).

Здесь — читаемые копии для правок и будущих вариантов:

| Файл | Идея |
|------|------|
| `plasma-field.frag.glsl` | Неоновое поле + звёзды (как в OGHShaderBg) |
| `grid-warp.frag.glsl` | Сетка «кибер» (заготовка) |

**Правило размера:** шейдеры короткие (десятки строк), `mediump`, без текстур.  
Игры рисуют геймплей на **2D canvas поверх** shader-bg — так проще и легче.

## Шрифты (рядом в `_shared`)

Шрифты **не кладём внутрь `.glsl`** — они в [`../fonts/`](../fonts/)  
(Roboto, Open Sans, Noto Sans, Montserrat, JetBrains Mono, Press Start 2P).  
CSS: [`../css/ogh-fonts.css`](../css/ogh-fonts.css).
