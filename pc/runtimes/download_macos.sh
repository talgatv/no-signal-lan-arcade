#!/usr/bin/env bash
# macOS: full portable CPython is awkward (codesign). Prefer system / official installer.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "OGH · macOS Python"
echo ""
echo "Рекомендуемые варианты (проще portable):"
echo "  1) Official installer: https://www.python.org/downloads/macos/"
echo "  2) Homebrew:  brew install python3"
echo "  3) Xcode CLT may ship /usr/bin/python3 (иногда старый)"
echo ""

if command -v python3 >/dev/null 2>&1; then
  echo "Found: $(command -v python3)"
  python3 --version
  echo ""
  echo "Можно сразу:  cd .. && ./start.sh"
  exit 0
fi

if command -v brew >/dev/null 2>&1; then
  read -r -p "Install python3 via Homebrew now? [y/N] " a
  if [[ "${a:-}" =~ ^[Yy]$ ]]; then
    brew install python3
    echo "OK. Run: cd .. && ./start.sh"
    exit 0
  fi
fi

echo "Install Python from python.org, then: cd .. && ./start.sh"
echo "(Авто-portable для macOS можно добавить позже — codesign/Apple Silicon.)"
exit 1
