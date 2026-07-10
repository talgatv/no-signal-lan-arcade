# Open-source fonts (Google / OFL family)

Локальные файлы — **без CDN**, offline-first.  
Соседняя папка к [`../shaders/`](../shaders/) в `_shared`.

Лицензии в основном **SIL Open Font License 1.1** (OFL).  
JetBrains Mono — OFL. Используй свободно в играх OGH.

## Наборы

| Папка | Семейство | Назначение | Файлы |
|-------|-----------|------------|--------|
| `roboto/` | **Roboto** (Google) | UI, лобби, neon-игры | Regular, Medium, Bold |
| `open-sans/` | **Open Sans** (Google) | Читаемый UI, инструкции | Regular, SemiBold, Bold |
| `noto-sans/` | **Noto Sans** (Google) | Широкий Unicode (лат/кир и др.) | Regular, Bold |
| `montserrat/` | **Montserrat** | Заголовки, акценты | Regular, Bold |
| `jetbrains-mono/` | **JetBrains Mono** | Таймеры, score, код | Regular, Bold |
| `press-start-2p/` | **Press Start 2P** | Пиксельные игры | Regular |

Размер всех вместе ≈ **4–5 МБ**. **Не тащи весь каталог в каждую игру** — подключай 1–2 начертания через CSS.

## Как подключить

```html
<link rel="stylesheet" href="../../_shared/css/ogh-fonts.css" />
```

Классы-хелперы:

- `.ogh-font-ui` → Roboto  
- `.ogh-font-text` → Open Sans  
- `.ogh-font-noto` → Noto Sans  
- `.ogh-font-display` → Montserrat  
- `.ogh-font-mono` → JetBrains Mono  
- `.ogh-font-pixel` → Press Start 2P  

Или CSS:

```css
font-family: "Roboto", system-ui, sans-serif;
font-family: "Press Start 2P", monospace;
```

## Не включено (тяжело)

- **Noto Sans CJK** (китайский полный) — десятки МБ; для zh используй системный UI или отдельный opt-in pack.  
- Variable fonts целиком — пока static TTF для простоты.

## Источники

- https://github.com/google/fonts  
- https://github.com/googlefonts/*  
- https://github.com/JetBrains/JetBrainsMono  
- https://github.com/JulietaUla/Montserrat  
