#!/usr/bin/env bash
# Prepare portable-ish Python for Linux x86_64.
# Prefer system python3 if available; otherwise download official source... 
# Full standalone builds from python.org are source-based; easiest portable path:
#   1) use distro python3 (recommended)
#   2) or download official "python-build-standalone" style from astral-sh/indygreg
# We use indygreg/python-build-standalone (widely used, redistributable) for true portable.
set -euo pipefail

PY_VERSION="${PY_VERSION:-3.12.8}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="$ROOT/linux64"
# python-build-standalone release (indygreg) — common portable CPython
# Pin a known release tag pattern; override with PBS_URL if needed.
# Prefer stripped install_only (smaller offline pack ~20MB archive / ~80MB disk)
PBS_TAG="${PBS_TAG:-20250317}"
PY_VERSION="${PY_VERSION:-3.12.9}"
ARCH="x86_64-unknown-linux-gnu"
URL="${PBS_URL:-https://github.com/indygreg/python-build-standalone/releases/download/${PBS_TAG}/cpython-${PY_VERSION}+${PBS_TAG}-${ARCH}-install_only_stripped.tar.gz}"

echo "OGH · Linux portable Python ${PY_VERSION}"
echo "Target: $TARGET"

if [[ -x "$TARGET/bin/python3" ]]; then
  echo "Already present (offline OK): $TARGET/bin/python3"
  "$TARGET/bin/python3" --version
  echo "No download needed."
  exit 0
fi

if [[ ! -e /dev/null ]]; then :; fi
# Offline mode: refuse if no network expected
if [[ "${OGH_OFFLINE:-}" == "1" ]]; then
  echo "OGH_OFFLINE=1 and runtime missing — cannot download."
  exit 1
fi

# If system python is fine, offer symlink-style copy note
if command -v python3 >/dev/null 2>&1; then
  SYSVER="$(python3 -c 'import sys; print("%d.%d"%sys.version_info[:2])')"
  echo "System python3 found ($SYSVER). Portable still useful for USB sticks."
fi

TMP="$(mktemp -d)"
ARCHIVE="$TMP/py.tgz"
echo "Downloading:"
echo "  $URL"
if ! curl -fL --retry 3 -o "$ARCHIVE" "$URL"; then
  echo ""
  echo "Download failed. Options:"
  echo "  1) sudo apt install python3   # Debian/Ubuntu"
  echo "  2) Set PBS_URL to a valid python-build-standalone tarball"
  echo "  3) Use system: cd .. && python3 host.py"
  rm -rf "$TMP"
  exit 1
fi

mkdir -p "$TARGET"
tar -xzf "$ARCHIVE" -C "$TMP"
# tarball usually contains top-level "python/"
if [[ -d "$TMP/python" ]]; then
  # merge into linux64
  rm -rf "$TARGET"
  mv "$TMP/python" "$TARGET"
else
  tar -xzf "$ARCHIVE" -C "$TARGET" --strip-components=1
fi
rm -rf "$TMP"

if [[ ! -x "$TARGET/bin/python3" ]]; then
  # some layouts use bin/python
  if [[ -x "$TARGET/bin/python" ]]; then
    ln -sf python "$TARGET/bin/python3"
  else
    echo "ERROR: python3 binary not found in $TARGET"
    exit 1
  fi
fi

echo "OK: $TARGET/bin/python3"
"$TARGET/bin/python3" --version
echo "Run:  cd .. && ./start.sh"
