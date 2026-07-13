#!/usr/bin/env python3
"""Validate the public game catalog and every bundled game/program pack."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
GAMES = ROOT / "games"
PROGRAMS = GAMES / "programs"
CAT = GAMES / "catalog"

MAX_PACK_BYTES = 10 * 1024 * 1024
ID_RE = re.compile(r"^[a-z][a-z0-9-]{1,46}[a-z0-9]$")
ALLOWED_KINDS = {"game", "program"}
ALLOWED_STATUSES = {"idea", "wip", "experimental", "playable", "stable", "deprecated"}

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

# External links in prose and credits are fine. These patterns only catch URLs
# that a browser would try to load at runtime, which would break offline play.
REMOTE_ASSET_PATTERNS = [
    re.compile(
        r"<(?:script|img|audio|video|source|iframe)\b[^>]*\bsrc\s*=\s*['\"]\s*(?:https?:)?//",
        re.IGNORECASE,
    ),
    re.compile(
        r"<link\b[^>]*\bhref\s*=\s*['\"]\s*(?:https?:)?//",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:url\(\s*|@import\s+(?:url\(\s*)?)['\"]?(?:https?:)?//",
        re.IGNORECASE,
    ),
    re.compile(r"\b(?:fetch|import)\s*\(\s*['\"]\s*(?:https?:)?//", re.IGNORECASE),
    re.compile(
        r"\b(?:import|export)\s+[^;\n]*\bfrom\s*['\"]\s*(?:https?:)?//",
        re.IGNORECASE,
    ),
]


def load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as error:
        print(f"FAIL {shown(path)}: {error}")
        return None


def pack_root(kind: str) -> Path:
    return PROGRAMS if kind == "program" else GAMES


def shown(path: Path) -> str:
    """Return a stable repository-relative path for validator messages."""
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def safe_catalog_path(value) -> PurePosixPath | None:
    """Accept only a clean repository-relative POSIX path."""
    if not isinstance(value, str) or not value or "\\" in value:
        return None
    if value.startswith("/") or value.endswith("/") or "?" in value or "#" in value:
        return None
    raw_parts = value.split("/")
    if any(part in {"", ".", ".."} for part in raw_parts):
        return None
    return PurePosixPath(*raw_parts)


def pack_size(folder: Path) -> int:
    return sum(path.stat().st_size for path in folder.rglob("*") if path.is_file())


def validate_offline_assets(folder: Path) -> int:
    errors = 0
    for path in folder.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".html", ".css", ".js", ".mjs"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for pattern in REMOTE_ASSET_PATTERNS:
            match = pattern.search(text)
            if match:
                line = text.count("\n", 0, match.start()) + 1
                print(f"FAIL {shown(path)}:{line}: remote runtime asset breaks offline play")
                errors += 1
                break
    return errors


def validate_manifest(gid: str, folder: Path, root: Path, row: dict) -> int:
    manifest_value = row.get("manifest")
    if not manifest_value:
        print(f"FAIL id={gid}: manifest path is required for a bundled pack")
        return 1

    manifest_rel = safe_catalog_path(manifest_value)
    if manifest_rel is None or manifest_rel.parts[0] != gid:
        print(f"FAIL id={gid}: unsafe manifest path: {manifest_value!r}")
        return 1

    manifest_path = root.joinpath(*manifest_rel.parts)
    manifest = load(manifest_path)
    if not isinstance(manifest, dict):
        return 1

    errors = 0
    if manifest.get("id") != gid:
        print(f"FAIL id={gid}: manifest id is {manifest.get('id')!r}")
        errors += 1

    client_entry = (manifest.get("entry") or {}).get("client")
    client_rel = safe_catalog_path(client_entry)
    expected_entry = f"{gid}/{client_entry}" if client_rel is not None else None
    if client_rel is None or row.get("entry") != expected_entry:
        print(
            f"FAIL id={gid}: catalog entry {row.get('entry')!r} does not match "
            f"manifest entry {client_entry!r}"
        )
        errors += 1

    comparisons = (
        ("version", row.get("version"), manifest.get("version")),
        ("players.min", (row.get("players") or {}).get("min"), manifest.get("minPlayers")),
        ("players.max", (row.get("players") or {}).get("max"), manifest.get("maxPlayers")),
        ("familyFriendly", row.get("familyFriendly"), manifest.get("familyFriendly")),
    )
    for label, catalog_value, manifest_value in comparisons:
        if catalog_value is not None and manifest_value is not None and catalog_value != manifest_value:
            print(
                f"FAIL id={gid}: catalog {label}={catalog_value!r} "
                f"but manifest has {manifest_value!r}"
            )
            errors += 1

    if not (folder / "README.md").is_file():
        print(f"FAIL id={gid}: {shown(folder / 'README.md')} missing")
        errors += 1
    return errors


def main() -> int:
    errors = 0
    games_path = CAT / "games.json"
    data = load(games_path)
    if not isinstance(data, dict):
        return 1

    games = data.get("games")
    if not isinstance(games, list):
        print("FAIL: games.json missing games array")
        return 1

    ids: set[str] = set()
    listed_games: set[str] = set()
    listed_programs: set[str] = set()

    for index, game in enumerate(games):
        prefix = f"games[{index}]"
        if not isinstance(game, dict):
            print(f"FAIL {prefix}: not an object")
            errors += 1
            continue

        gid = game.get("id")
        kind = game.get("kind") or "game"
        for field in REQUIRED_GAME_FIELDS:
            if field not in game:
                print(f"FAIL {prefix} id={gid}: missing field '{field}'")
                errors += 1

        if not isinstance(gid, str) or not ID_RE.fullmatch(gid):
            print(f"FAIL {prefix}: invalid id {gid!r}")
            errors += 1
            continue
        if gid in ids:
            print(f"FAIL duplicate id: {gid}")
            errors += 1
        ids.add(gid)

        if kind not in ALLOWED_KINDS:
            print(f"FAIL id={gid}: kind must be game or program, got {kind!r}")
            errors += 1
            kind = "game"
        (listed_programs if kind == "program" else listed_games).add(gid)

        status = game.get("status")
        if status not in ALLOWED_STATUSES:
            print(f"FAIL id={gid}: invalid status {status!r}")
            errors += 1

        entry_rel = safe_catalog_path(game.get("entry"))
        if entry_rel is None or entry_rel.parts[0] != gid:
            print(f"FAIL id={gid}: unsafe entry path: {game.get('entry')!r}")
            errors += 1

        players = game.get("players")
        if not isinstance(players, dict):
            print(f"FAIL id={gid}: players must be an object")
            errors += 1
        else:
            minimum, maximum, solo = players.get("min"), players.get("max"), players.get("solo")
            if not isinstance(minimum, int) or not isinstance(maximum, int) or minimum < 1 or maximum < minimum:
                print(f"FAIL id={gid}: invalid players range {minimum!r}..{maximum!r}")
                errors += 1
            if not isinstance(solo, bool):
                print(f"FAIL id={gid}: players.solo must be boolean")
                errors += 1

        controls = game.get("controls")
        if not isinstance(controls, dict) or not controls.get("primary"):
            print(f"FAIL id={gid}: controls.primary missing")
            errors += 1

        instructions = game.get("instructions")
        if not isinstance(instructions, dict) or not instructions.get("en"):
            print(f"FAIL id={gid}: instructions.en is required")
            errors += 1

        if not isinstance(game.get("familyFriendly"), bool):
            print(f"FAIL id={gid}: familyFriendly must be boolean")
            errors += 1

        root = pack_root(kind)
        folder = root / gid
        if status == "wip" and not folder.is_dir():
            print(f"WARN id={gid}: wip without folder (ok)")
            continue
        if not folder.is_dir():
            print(f"FAIL id={gid}: folder {shown(folder)}/ missing")
            errors += 1
            continue

        if entry_rel is not None:
            entry_path = root.joinpath(*entry_rel.parts)
            if not entry_path.is_file():
                print(f"FAIL id={gid}: entry file missing: {shown(entry_path)}")
                errors += 1

        errors += validate_manifest(gid, folder, root, game)
        errors += validate_offline_assets(folder)

        size = pack_size(folder)
        if size > MAX_PACK_BYTES:
            print(f"FAIL id={gid}: pack is {size / 1024 / 1024:.2f} MB (10 MB maximum)")
            errors += 1

    authors_data = load(CAT / "authors.json")
    families_data = load(CAT / "families.json")
    if authors_data is None or families_data is None:
        errors += 1
    else:
        author_ids = {author.get("id") for author in authors_data.get("authors", [])}
        family_ids = {family.get("id") for family in families_data.get("families", [])}
        for game in games:
            if not isinstance(game, dict):
                continue
            gid = game.get("id")
            author_id = game.get("authorId")
            family_id = game.get("familyId")
            if author_id and author_id not in author_ids:
                print(f"FAIL id={gid}: unknown authorId {author_id!r}")
                errors += 1
            if family_id and family_id not in family_ids:
                print(f"FAIL id={gid}: unknown familyId {family_id!r}")
                errors += 1
            for related in [game.get("variantOf"), *(game.get("relatedIds") or [])]:
                if related and related not in ids:
                    print(f"FAIL id={gid}: unknown related game {related!r}")
                    errors += 1

    reserved = {"_shared", "_templates", "catalog", "hub", "programs"}
    actual_games = {
        path.name for path in GAMES.iterdir() if path.is_dir() and path.name not in reserved
    }
    actual_programs = {path.name for path in PROGRAMS.iterdir() if path.is_dir()}
    for gid in sorted(actual_games - listed_games):
        print(f"FAIL unlisted game folder: games/{gid}/")
        errors += 1
    for gid in sorted(actual_programs - listed_programs):
        print(f"FAIL unlisted program folder: games/programs/{gid}/")
        errors += 1

    print(f"checked {len(games)} catalog entries")
    if errors:
        print(f"FAILED with {errors} error(s)")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
