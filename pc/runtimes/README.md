# Portable Python runtimes for OGH PC Host

The host is pure **Python 3** (stdlib only — **no pip packages**).  
You only need an interpreter.

## Why this folder exists

So Windows / Linux machines can:

1. Keep an **official** portable/embeddable Python **next to the project**  
2. Run `start.bat` / `start.sh` **without** a system install  

**In a full offline disk copy**, runtimes may already be present (`win64/`, `linux64/`).  
See [../OFFLINE.md](../OFFLINE.md).

Large trees are **gitignored** so the public GitHub repo stays small.  
Use download scripts after `git clone`, or attach a Release zip.

| Folder (after download) | Platform |
|-------------------------|----------|
| `win64/` | Windows x64 (embeddable package) |
| `linux64/` | Linux x86_64 (standalone stripped build) |
| `macos64/` | Not bundled; use system Python |

## Quick start

### System Python 3.9+ already installed

```bash
cd pc
./start.sh
# or: python3 host.py
```

### No system Python — download portable

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

**macOS**:

```bash
# brew install python3   OR  python.org installer
./download_macos.sh   # prints guidance
```

## Official sources

| OS | Source |
|----|--------|
| Windows | https://www.python.org/downloads/windows/ — *Windows embeddable package (64-bit)* |
| Linux | python-build-standalone (indygreg) via `download_linux.sh` |
| macOS | https://www.python.org/downloads/macos/ |

Default versions are pinned in the scripts / `VERSIONS.txt`.

## Size (order of magnitude)

| | |
|--|--|
| Windows embeddable | ~10–15 MB zip, ~22 MB unpacked |
| Linux stripped | ~20 MB archive, ~80 MB unpacked |
| Node (comparison) | often larger with dependency trees |

We intentionally avoid Node for the host.

## License

PSF License — redistributable with open-source apps.  
Keep `LICENSE.txt` from each runtime tree when shipping offline zips.

## Layout after download

```text
pc/runtimes/
  README.md
  VERSIONS.txt
  download_windows.ps1
  download_linux.sh
  download_macos.sh
  .gitignore
  win64/          # gitignored
  linux64/        # gitignored
```
