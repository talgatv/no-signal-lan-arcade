# Rootwork (Корнедел)

**2D песочница** — не Minecraft. Ты роешь норы, кладёшь блоки, находишь кристаллы света.

## Жанр

Sandbox / dig-build · side-view · pixel · solo (LAN-мир — позже)

## Управление

| | |
|--|--|
| **Тач** | Левый стик / стрелки на экране · прыжок · режим Dig/Place · слот инвентаря |
| **Мышь** | Клик по тайлу = dig/place · A/D или стрелки · Space прыжок · 1–7 слот · Tab режим |
| **Клавиатура** | A/D / ←→ · W/Space прыжок · E dig · Q place · R reset world |

## Блоки

| ID | Имя | |
|----|-----|--|
| 0 | Air | пусто |
| 1 | Soil | копается быстро |
| 2 | Clay | чуть крепче |
| 3 | Stone | дольше |
| 4 | Rootwood | строительный |
| 5 | Crystal | светится |
| 6 | Mycel | мягкий, быстро |
| 7 | Bedrock | не ломается |

## Сохранение

Автосейв в `localStorage` (`ogh_rootwork_v1`).

## Запуск

```bash
cd games && python3 -m http.server 8080
# http://127.0.0.1:8080/rootwork/client/
```
