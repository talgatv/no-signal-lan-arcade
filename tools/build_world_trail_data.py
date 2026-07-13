#!/usr/bin/env python3
"""Build World Trail's compact offline Natural Earth map layers.

The game ships the generated JSON, so players never need the internet. This
maintainer tool downloads the upstream GeoJSON only when its local cache is
missing and then writes:

    games/world-trail/client/data/{land,rivers,roads,cities}.json

Usage:
    python3 tools/build_world_trail_data.py
    python3 tools/build_world_trail_data.py --cache-dir /path/to/natural-earth
"""

from __future__ import annotations

import argparse
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "games" / "world-trail" / "client" / "data"
DEFAULT_CACHE = Path("/tmp/ogh-natural-earth")

BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"
FILES = {
    # A coarse land outline keeps the world silhouette small; the interactive
    # detail comes from the 10m water, roads, and populated-place layers.
    "land": "ne_110m_land.geojson",
    "rivers": "ne_10m_rivers_lake_centerlines.geojson",
    "lakes": "ne_10m_lakes.geojson",
    "cities": "ne_10m_populated_places.geojson",
    "roads": "ne_10m_roads.geojson",
}


def download(name: str, destination: Path) -> None:
    url = f"{BASE}/{FILES[name]}"
    print(f"fetch {url}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, destination)


def rounded_coords(value, digits: int = 2):
    if isinstance(value, (list, tuple)):
        if value and isinstance(value[0], (int, float)):
            return [round(float(value[0]), digits), round(float(value[1]), digits)]
        return [rounded_coords(item, digits) for item in value]
    return value


def sampled_line(coords, step: int = 1):
    if step <= 1 or len(coords) <= 3:
        return coords
    result = coords[::step]
    if result[-1] != coords[-1]:
        result.append(coords[-1])
    return result


def compact_geometry(geometry, step: int = 1, digits: int = 2):
    kind = geometry["type"]
    coords = geometry["coordinates"]
    if kind == "Point":
        return {"type": kind, "coordinates": rounded_coords(coords, digits)}
    if kind == "LineString":
        return {
            "type": kind,
            "coordinates": rounded_coords(sampled_line(coords, step), digits),
        }
    if kind == "MultiLineString":
        return {
            "type": kind,
            "coordinates": [
                rounded_coords(sampled_line(line, step), digits) for line in coords
            ],
        }
    if kind == "Polygon":
        rings = []
        for ring in coords:
            sampled = sampled_line(ring, step)
            if len(sampled) >= 4:
                rings.append(rounded_coords(sampled, digits))
        return {"type": kind, "coordinates": rings}
    if kind == "MultiPolygon":
        polygons = []
        for polygon in coords:
            rings = []
            for ring in polygon:
                sampled = sampled_line(ring, step)
                if len(sampled) >= 4:
                    rings.append(rounded_coords(sampled, digits))
            if rings:
                polygons.append(rings)
        return {"type": kind, "coordinates": polygons}
    raise ValueError(f"unsupported geometry type: {kind}")


def scalerank(properties: dict, default: int = 9) -> int:
    value = properties.get("scalerank", properties.get("SCALERANK", default))
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def dump_compact(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"  {path.name}: {path.stat().st_size / 1024:.0f} KB")


def feature_collection() -> dict:
    return {"type": "FeatureCollection", "features": []}


def build_land(source: Path) -> dict:
    raw = json.loads(source.read_text(encoding="utf-8"))
    output = feature_collection()
    for feature in raw["features"]:
        output["features"].append(
            {
                "type": "Feature",
                "geometry": compact_geometry(feature["geometry"], step=1, digits=2),
            }
        )
    return output


def build_water(rivers_source: Path, lakes_source: Path) -> dict:
    output = feature_collection()
    for key, source in (("r", rivers_source), ("l", lakes_source)):
        raw = json.loads(source.read_text(encoding="utf-8"))
        for feature in raw["features"]:
            properties = feature.get("properties") or {}
            output["features"].append(
                {
                    "type": "Feature",
                    "geometry": compact_geometry(feature["geometry"], step=1, digits=2),
                    "p": {"k": key, "sr": scalerank(properties)},
                }
            )
    return output


def build_cities(source: Path) -> dict:
    raw = json.loads(source.read_text(encoding="utf-8"))
    cities = []
    for feature in raw["features"]:
        properties = feature.get("properties") or {}
        name = properties.get("NAME") or properties.get("NAMEASCII") or "?"
        try:
            population = int(properties.get("POP_MAX") or 0)
        except (TypeError, ValueError):
            population = 0
        lon, lat = feature["geometry"]["coordinates"][:2]
        cities.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(float(lon), 3), round(float(lat), 3)],
                },
                "p": {
                    "n": name,
                    "pop": population,
                    "sr": scalerank(properties),
                },
            }
        )
    cities.sort(key=lambda item: (-item["p"]["pop"], item["p"]["n"]))
    return {"type": "FeatureCollection", "features": cities}


def build_roads(source: Path) -> dict:
    raw = json.loads(source.read_text(encoding="utf-8"))
    output = feature_collection()
    allowed = {"Major Highway", "Secondary Highway", "Beltway", "Bypass"}
    for feature in raw["features"]:
        properties = feature.get("properties") or {}
        road_type = properties.get("type") or ""
        rank = scalerank(properties, default=99)
        expressway = properties.get("expressway") or 0
        if road_type not in allowed and not expressway:
            continue
        if rank > 4 and not expressway:
            continue
        output["features"].append(
            {
                "type": "Feature",
                "geometry": compact_geometry(feature["geometry"], step=3, digits=2),
                "p": {"t": 1 if (expressway or road_type == "Major Highway") else 2},
            }
        )
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=DEFAULT_CACHE,
        help="Natural Earth GeoJSON cache (default: /tmp/ogh-natural-earth)",
    )
    parser.add_argument(
        "--force-download",
        action="store_true",
        help="replace cached Natural Earth source files",
    )
    args = parser.parse_args()

    args.cache_dir.mkdir(parents=True, exist_ok=True)
    sources: dict[str, Path] = {}
    for name, filename in FILES.items():
        path = args.cache_dir / filename
        if args.force_download or not path.is_file() or path.stat().st_size < 1000:
            download(name, path)
        sources[name] = path

    dump_compact(OUT / "land.json", build_land(sources["land"]))
    dump_compact(
        OUT / "rivers.json",
        build_water(sources["rivers"], sources["lakes"]),
    )
    dump_compact(OUT / "roads.json", build_roads(sources["roads"]))
    dump_compact(OUT / "cities.json", build_cities(sources["cities"]))

    total = sum(path.stat().st_size for path in OUT.glob("*.json"))
    print(f"data total: {total / 1024 / 1024:.2f} MB -> {OUT}")
    if total > 10 * 1024 * 1024:
        print("error: generated World Trail data exceeds the 10 MB pack limit")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
