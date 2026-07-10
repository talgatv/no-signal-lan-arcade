# Офлайн-пакет PC Host

Этот проект рассчитан на работу **без интернета** после того, как всё лежит в папке (USB, LAN-копия, архив).

## Уже лежит рядом (скачано)

| Путь | Содержимое | ~размер |
|------|------------|---------|
| `runtimes/win64/` | CPython **3.12.8** embeddable (Windows x64) | ~22 МБ |
| `runtimes/linux64/` | CPython **3.12.9** portable stripped (Linux x86_64) | ~80 МБ |
| `runtimes/VERSIONS.txt` | Что именно скачано и когда | |
| `host.py`, `www/` | Сервер и лобби | &lt; 1 МБ |
| `../games/` | Игры + `_shared` (в т.ч. шрифты) | зависит от каталога |

**macOS:** portable runtime не бандлится (codesign). На Mac нужен системный `python3` (один раз с флешки/python.org, потом offline).

## Как запустить без сети

### Linux

```bash
cd pc
./start.sh
# использует ./runtimes/linux64/bin/python3 — интернет не нужен
```

### Windows

```bat
cd pc
start.bat
# использует runtimes\win64\python.exe
```

Телефоны — только **локальный Wi‑Fi / hotspot**, не интернет.

## Передача «всего проекта» офлайн

Скопируйте **целиком** репозиторий / папку `OFFline_games_app`, включая:

```
pc/runtimes/win64/
pc/runtimes/linux64/
games/
```

Не выкидывайте `runtimes/*64` — без них на «чистой» Windows/Linux без системного Python хост не стартует.

Пример архива:

```bash
# на машине с уже скачанными runtime:
cd /path/to
tar -czf OGH-offline.tar.gz OFFline_games_app \
  --exclude='.git' \
  --exclude='**/__pycache__' \
  --exclude='**/node_modules'
```

## Git

Крупные `win64/` / `linux64/` по умолчанию в **`.gitignore`**, чтобы не раздувать git.  
Для **офлайн-раздачи** файлы всё равно должны быть на диске (они уже скачаны здесь).

Если нужно хранить runtime в git (монорепо на своём сервере) — уберите строки `win64/` `linux64/` из `runtimes/.gitignore`.

## Если папок runtime нет

Только тогда нужен интернет (один раз):

```bash
cd pc/runtimes
./download_linux.sh      # или download_windows.ps1
```

Скрипты **не качают повторно**, если `python` уже на месте.

## Что не требует сети никогда

- Сами игры (статика)
- Лобби
- WebSocket между телефонами и ПК в LAN
- Шрифты в `games/_shared/fonts/`
