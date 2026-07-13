from __future__ import annotations

import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools"
sys.path.insert(0, str(TOOLS))

import new_game  # noqa: E402
import validate_catalog  # noqa: E402
import build_world_trail_data  # noqa: E402


class CatalogValidatorTests(unittest.TestCase):
    def test_accepts_clean_pack_paths(self) -> None:
        path = validate_catalog.safe_catalog_path("hello-dots/client/index.html")
        self.assertIsNotNone(path)

    def test_rejects_paths_outside_a_pack(self) -> None:
        bad_paths = (
            "../secret",
            "/absolute",
            "game/../secret",
            "game\\client\\index.html",
            "game/client/",
        )
        for path in bad_paths:
            with self.subTest(path=path):
                self.assertIsNone(validate_catalog.safe_catalog_path(path))

    def test_detects_remote_runtime_asset(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            client = Path(tmp) / "client"
            client.mkdir()
            (client / "index.html").write_text(
                '<script src="https://cdn.example/game.js"></script>',
                encoding="utf-8",
            )
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(validate_catalog.validate_offline_assets(Path(tmp)), 1)


class NewGameTests(unittest.TestCase):
    def test_scaffold_does_not_claim_core_team_authorship(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            games = Path(tmp) / "games"
            catalog = games / "catalog" / "games.json"
            catalog.parent.mkdir(parents=True)
            catalog.write_text('{"schemaVersion":1,"games":[]}', encoding="utf-8")

            with (
                mock.patch.object(new_game, "GAMES", games),
                mock.patch.object(new_game, "CATALOG", catalog),
                mock.patch.object(new_game, "TPL_SOLO", ROOT / "games/_templates/solo"),
                mock.patch.object(new_game, "TPL_MP", ROOT / "games/_templates/multiplayer"),
                mock.patch.object(
                    sys,
                    "argv",
                    ["new_game.py", "community-game", "--title", "Community Game"],
                ),
                contextlib.redirect_stdout(io.StringIO()),
            ):
                self.assertEqual(new_game.main(), 0)

            row = json.loads(catalog.read_text(encoding="utf-8"))["games"][0]
            manifest = json.loads(
                (games / "community-game/manifest.json").read_text(encoding="utf-8")
            )
            self.assertIsNone(row["authorId"])
            self.assertIsNone(row["authorInline"])
            self.assertEqual(row["license"], "MIT")
            self.assertEqual(manifest["license"], "MIT")


class WorldTrailDataTests(unittest.TestCase):
    def test_builds_ranked_water_and_compact_city_data(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)

            def write(name: str, features: list[dict]) -> Path:
                path = root / name
                path.write_text(
                    json.dumps({"type": "FeatureCollection", "features": features}),
                    encoding="utf-8",
                )
                return path

            line = {
                "type": "Feature",
                "properties": {"scalerank": 2},
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[0, 0], [1.234, 2.345], [3, 4]],
                },
            }
            lake = {
                "type": "Feature",
                "properties": {"scalerank": 3},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]],
                },
            }
            city = {
                "type": "Feature",
                "properties": {"NAME": "Town", "POP_MAX": 123, "SCALERANK": 4},
                "geometry": {"type": "Point", "coordinates": [1.23456, 2.34567]},
            }

            water = build_world_trail_data.build_water(
                write("rivers.json", [line]),
                write("lakes.json", [lake]),
            )
            cities = build_world_trail_data.build_cities(write("cities.json", [city]))

            self.assertEqual(water["features"][0]["p"], {"k": "r", "sr": 2})
            self.assertEqual(water["features"][1]["p"], {"k": "l", "sr": 3})
            self.assertEqual(
                cities["features"][0]["geometry"]["coordinates"],
                [1.235, 2.346],
            )


if __name__ == "__main__":
    unittest.main()
