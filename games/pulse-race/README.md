# Pulse Race

Неоновые **top-down гонки** по замкнутому треку.  
Соло: ты + AI. Когда поднимется host WebSocket — та же игра через `OGHNet`.

## Управление

| Тач | Клавиши |
|-----|---------|
| Педаль газа (удерживать) | W / ↑ |
| ← → поворот | A/D или ← → |
| Тормоз | S / ↓ / Space |

## Мультиплеер

См. [docs/architecture/MULTIPLAYER.md](../../docs/architecture/MULTIPLAYER.md).

- Сейчас: `OGHNet` в режиме **offline** (нет `/ws`).  
- Позже: все открывают URL хоста → одна комната → snapshot машин.

## Запуск

```bash
cd games && python3 -m http.server 8080
# http://127.0.0.1:8080/pulse-race/client/
```
