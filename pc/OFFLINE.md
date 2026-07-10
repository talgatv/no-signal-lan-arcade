# Offline PC pack

This project is meant to work **without internet** once the folder is on disk (USB stick, LAN copy, archive).

## What should sit next to the host

| Path | Contents | ~Size |
|------|----------|--------|
| `runtimes/win64/` | CPython **3.12.8** embeddable (Windows x64) | ~22 MB |
| `runtimes/linux64/` | CPython **3.12.9** portable stripped (Linux x86_64) | ~80 MB |
| `runtimes/VERSIONS.txt` | Provenance stamp | |
| `host.py`, `www/` | Server + lobby | &lt; 1 MB |
| `../games/` | Packs + `_shared` (fonts included) | depends |

**macOS:** portable runtime is not bundled (codesign). Use system `python3` (install once from python.org or Homebrew; then offline).

## Run with no network

### Linux

```bash
cd pc
./start.sh
# uses ./runtimes/linux64/bin/python3 when present
```

### Windows

```bat
cd pc
start.bat
# uses runtimes\win64\python.exe
```

Phones only need **local Wi‑Fi / hotspot**, not the public internet.

## Shipping the whole project offline

Copy the **entire** repository folder, including:

```text
pc/runtimes/win64/
pc/runtimes/linux64/
games/
```

Do **not** delete `runtimes/*64` if recipients lack system Python.

Example archive:

```bash
cd /path/to
tar -czf OGH-offline.tar.gz no-signal-lan-arcade \
  --exclude='.git' \
  --exclude='**/__pycache__' \
  --exclude='**/node_modules'
```

Or attach `offline-runtimes-win-linux.zip` on a **GitHub Release** (recommended for public clones).

## Git

Large `win64/` / `linux64/` trees are **gitignored** by default so the public repo stays lean.  
They may still exist on a developer disk for USB packs.

To track them in a private monorepo, remove those lines from `runtimes/.gitignore`.

## If runtime folders are missing

Internet is needed **once**:

```bash
cd pc/runtimes
./download_linux.sh       # or download_windows.ps1
```

Scripts **skip download** when Python is already present.  
Set `OGH_OFFLINE=1` to refuse network attempts.

## Always offline (no download ever)

- Game static files  
- Lobby HTML  
- LAN WebSocket between phones and PC  
- Fonts under `games/_shared/fonts/`  

## Contributor note

You do **not** need runtimes to write a game pack — only to run the host.  
CI and PR authors can use system Python 3.
