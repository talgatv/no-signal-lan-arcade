#!/usr/bin/env python3
"""Validate games/catalog JSON and that game packs exist on disk."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAMES = ROOT / "games"
CAT = GAMES / "catalog"

REQUIRED_GAME_FIELDS = [
    "id",
    "name",
    "style",
    "genres",
    "controls",
    "instructions",
    "players",
    "entry",
    "status",
    "familyFriendly",
]


def load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"FAIL {path}: {e}")
        return None


def main() -> int:
    errors = 0
    games_path = CAT / "games.json"
    data = load(games_path)
    if not data:
        return 1

    games = data.get("games")
    if not isinstance(games, list):
        print("FAIL: games.json missing games array")
        return 1

    ids = []
    for i, g in enumerate(games):
        prefix = f"games[{i}]"
        if not isinstance(g, dict):
            print(f"FAIL {prefix}: not an object")
            errors += 1
            continue
        gid = g.get("id")
        for field in REQUIRED_GAME_FIELDS:
            if field not in g:
                print(f"FAIL {prefix} id={gid}: missing field '{field}'")
                errors += 1
        if not gid:
            continue
        if gid in ids:
            print(f"FAIL duplicate id: {gid}")
            errors += 1
        ids.append(gid)

        if gid.startswith("_"):
            print(f"FAIL id must not start with underscore: {gid}")
            errors += 1

        folder = GAMES / gid
        if not folder.is_dir():
            print(f"FAIL id={gid}: folder games/{gid}/ missing")
            errors += 1
        else:
            entry = g.get("entry", "")
            entry_path = GAMES / entry
            if not entry_path.is_file():
                print(f"FAIL id={gid}: entry file missing: {entry}")
                errors += 1
            man = g.get("manifest")
            if man:
                mp = GAMES / man
                if not mp.is_file():
                    print(f"FAIL id={gid}: manifest missing: {man}")
                    errors += 1

        players = g.get("players") or {}
        for k in ("min", "max", "solo"):
            if k not in players:
                print(f"FAIL id={gid}: players.{k} missing")
                errors += 1

        controls = g.get("controls") or {}
        if "primary" not in controls:
            print(f"FAIL id={gid}: controls.primary missing")
            errors += 1

        instr = g.get("instructions")
        if not isinstance(instr, dict) or not instr:
            print(f"FAIL id={gid}: instructions must be non-empty object")
            errors += 1

    # authors / families optional soft checks
    for name in ("authors.json", "families.json"):
        p = CAT / name
        if p.exists() and load(p) is None:
            errors += 1

    # warn templates not in catalog (ok)
    print(f"checked {len(games)} catalog games")
    if errors:
        print(f"FAILED with {errors} error(s)")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
