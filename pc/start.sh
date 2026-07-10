#!/usr/bin/env bash
# Start OGH PC Host (Linux / macOS)
set -euo pipefail
cd "$(dirname "$0")"

pick_python() {
  # 1) Portable runtime next to this script
  if [[ -x "./runtimes/linux64/bin/python3" ]]; then
    echo "./runtimes/linux64/bin/python3"
    return
  fi
  if [[ -x "./runtimes/macos64/bin/python3" ]]; then
    echo "./runtimes/macos64/bin/python3"
    return
  fi
  # 2) System
  if command -v python3 >/dev/null 2>&1; then
    command -v python3
    return
  fi
  if command -v python >/dev/null 2>&1; then
    command -v python
    return
  fi
  echo ""
}

PY="$(pick_python)"
if [[ -z "$PY" ]]; then
  echo "Python 3 not found (no runtimes/linux64 and no system python3)."
  echo "Offline pack should include:  pc/runtimes/linux64/"
  echo "If you have internet once:  ./runtimes/download_linux.sh"
  echo "See OFFLINE.md and runtimes/README.md"
  exit 1
fi

echo "Using: $PY  (offline host — no internet required)"
exec "$PY" host.py "$@"
