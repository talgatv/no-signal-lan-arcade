# Comet Pixel

Пиксельная вариация [Comet](../comet/).

| | Comet | Comet Pixel |
|--|-------|-------------|
| Стиль | neon-vector + WebGL bg | low-res pixel, 12-color palette |
| Колодцы | free place | **snap to 8px grid** |
| Физика | smooth | чуть «тяжелее», clamp |
| Каталог | `id: comet` | `id: comet-pixel`, `variantOf: comet` |

Семейство: **comet** → [`../catalog/families.json`](../catalog/families.json).

## Запуск

```bash
cd games && python3 -m http.server 8080
# http://127.0.0.1:8080/comet-pixel/client/
```
