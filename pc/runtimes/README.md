# Python runtimes (portable) for OGH PC Host

Хост написан на **чистом Python 3** (stdlib only, **без pip-пакетов**).  
Нужен только интерпретатор.

## Зачем эта папка

Чтобы на Windows / Linux можно было:

1. Скачать **официальный** portable/embeddable Python **рядом с проектом**  
2. Запускать `start.bat` / `start.sh` **без** системной установки  

**В этой копии проекта runtime уже скачан** (`win64/`, `linux64/`) — можно копировать весь репо на флешку и работать без интернета.  
См. [`../OFFLINE.md`](../OFFLINE.md).

В **git** крупные папки по умолчанию игнорируются (не раздувать историю). На диске для офлайн-пакета они **должны присутствовать**.

| Папка (после download) | Платформа |
|------------------------|-----------|
| `win64/` | Windows x64 (embeddable package) |
| `linux64/` | Linux x86_64 (official standalone build) |
| `macos64/` | macOS (опционально; пока скрипт-заготовка) |

## Быстрый старт

### Уже есть Python 3.9+ в системе

Ничего качать не нужно:

```bash
cd pc
./start.sh          # Linux/macOS
# или
python3 host.py
```

Windows:

```bat
cd pc
start.bat
```

### Нет Python — скачать portable рядом

**Windows** (PowerShell):

```powershell
cd pc\runtimes
.\download_windows.ps1
cd ..
.\start.bat
```

**Linux**:

```bash
cd pc/runtimes
./download_linux.sh
cd ..
./start.sh
```

**macOS** (если системного python3 нет):

```bash
# Рекомендуется: brew install python3
# или официальный installer с https://www.python.org/downloads/macos/
./download_macos.sh   # пока подсказки + optional brew
```

## Официальные источники

| OS | Откуда |
|----|--------|
| Windows | https://www.python.org/downloads/windows/ — *Windows embeddable package (64-bit)* |
| Linux | https://www.python.org/downloads/source/ или deadsnakes / distro packages; скрипт тянет standalone build |
| macOS | https://www.python.org/downloads/macos/ |

Версия по умолчанию в скриптах: **3.12.x** (можно поменять переменную `PY_VERSION`).

## Размер

| | Ориентир |
|--|----------|
| Embeddable Win | ~10–15 МБ архив, ~30–40 МБ распакованный |
| Linux standalone | зависит от сборки, обычно десятки МБ |
| **Node** для сравнения | часто больше и с npm-деревом |

Мы **специально не** тащим Node.

## Лицензия Python

PSF License — можно распространять embeddable рядом с open-source приложением.  
Соблюдайте LICENSE из дистрибутива Python (копируется при download).

## Структура после download

```
pc/runtimes/
  README.md
  download_windows.ps1
  download_linux.sh
  download_macos.sh
  .gitignore
  win64/          # gitignored
  linux64/        # gitignored
  macos64/        # gitignored
```
