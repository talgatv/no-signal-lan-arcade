#!/usr/bin/env python3
"""
Scaffold a new OGH game pack from templates and register it in the catalog.

Usage:
  python3 tools/new_game.py hello-dots --title "Hello Dots"
  python3 tools/new_game.py click-party --multiplayer --title "Click Party"
  python3 tools/new_game.py my-game --title "My Game" --author "Ada" --no-catalog
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAMES = ROOT / "games"
CATALOG = GAMES / "catalog" / "games.json"
TPL_SOLO = GAMES / "_templates" / "solo"
TPL_MP = GAMES / "_templates" / "multiplayer"

ID_RE = re.compile(r"^[a-z][a-z0-9-]{1,46}[a-z0-9]$")


def die(msg: str, code: int = 1) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(code)


def replace_in_tree(root: Path, mapping: dict[str, str]) -> None:
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".woff", ".woff2", ".ttf"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        orig = text
        for a, b in mapping.items():
            text = text.replace(a, b)
        # templates live one level deeper than real games
        text = text.replace("../../../_shared/", "../../_shared/")
        if text != orig:
            path.write_text(text, encoding="utf-8")


def append_catalog(entry: dict) -> None:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    games = data.setdefault("games", [])
    if any(g.get("id") == entry["id"] for g in games):
        die(f"catalog already has id={entry['id']}")
    games.append(entry)
    data["updated"] = date.today().isoformat()
    CATALOG.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    p = argparse.ArgumentParser(description="Create a new Offline Games Hub pack")
    p.add_argument("id", help="Folder / game id (lowercase-hyphen)")
    p.add_argument("--title", default=None, help="Display name")
    p.add_argument("--multiplayer", action="store_true", help="Use multiplayer template")
    p.add_argument("--author", default=None, help="Author display name (inline)")
    p.add_argument("--no-catalog", action="store_true", help="Do not edit games.json")
    args = p.parse_args()

    gid = args.id.strip().lower()
    if not ID_RE.match(gid):
        die("id must look like 'hello-dots' (lowercase, digits, hyphens, 3–48 chars)")

    title = args.title or gid.replace("-", " ").title()
    dest = GAMES / gid
    if dest.exists():
        die(f"already exists: {dest}")

    src = TPL_MP if args.multiplayer else TPL_SOLO
    if not src.is_dir():
        die(f"template missing: {src}")

    shutil.copytree(src, dest)
    replace_in_tree(
        dest,
        {
            "TEMPLATE_ID": gid,
            "TEMPLATE_NAME": title,
        },
    )

    if not args.no_catalog:
        today = date.today().isoformat()
        entry = {
            "id": gid,
            "name": title,
            "tagline": f"{title} — community game pack.",
            "style": "minimal-line",
            "genres": ["party", "casual"] if args.multiplayer else ["casual", "arcade"],
            "controls": {
                "primary": "touch",
                "supported": ["touch", "mouse"],
                "keyboard": "optional" if args.multiplayer else "none",
                "mouse": "ok",
            },
            "instructions": {
                "en": "Open via PC host lobby. Edit client/game.js to change rules.",
            },
            "authorId": None if args.author else "ogh-team",
            "authorInline": (
                {"name": args.author, "email": None, "site": None, "links": []}
                if args.author
                else None
            ),
            "dates": {"added": today, "updated": today},
            "players": {
                "min": 1,
                "max": 8 if args.multiplayer else 1,
                "solo": True,
            },
            "entry": f"{gid}/client/index.html",
            "manifest": f"{gid}/manifest.json",
            "version": "0.1.0",
            "status": "experimental",
            "familyFriendly": True,
            "tags": ["multiplayer", "template"] if args.multiplayer else ["beginner"],
        }
        if args.multiplayer:
            entry["multiplayer"] = {
                "status": "ready",
                "protocol": "ogh-net-v1",
                "notes": "Scaffolded from multiplayer template",
            }
        append_catalog(entry)

    print(f"Created games/{gid}/")
    print(f"  title: {title}")
    print(f"  mode:  {'multiplayer' if args.multiplayer else 'solo'}")
    if not args.no_catalog:
        print("  catalog: games/catalog/games.json updated")
    print()
    print("Next:")
    print("  cd pc && ./start.sh")
    print(f"  open http://127.0.0.1:8080/games/{gid}/client/")
    print("  python3 tools/validate_catalog.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
