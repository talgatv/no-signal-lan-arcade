#!/usr/bin/env python3
"""
Download Natural Earth GeoJSON and write compact layers for games/world-trail.

Requires network once. Output: games/world-trail/client/data/{land,rivers,roads,cities}.json

  python3 tools/build_world_trail_data.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "games" / "world-trail" / "client" / "data"
TMP = Path("/tmp/ne_wt")

BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"
FILES = {
    "land": "ne_110m_land.geojson",
    "rivers": "ne_110m_rivers_lake_centerlines.geojson",
    "lakes": "ne_110m_lakes.geojson",
    "cities": "ne_110m_populated_places.geojson",
    "roads": "ne_10m_roads.geojson",
}


def download(name: str, dest: Path) -> None:
    url = f"{BASE}/{FILES[name]}"
    print(f"fetch {url}")
    urllib.request.urlretrieve(url, dest)


def rcoords(obj, nd=2):
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(float(obj[0]), nd), round(float(obj[1]), nd)]
        return [rcoords(x, nd) for x in obj]
    return obj


def simplify_line(coords, step=2):
    if len(coords) <= 3:
        return coords
    out = coords[::step]
    if out[-1] != coords[-1]:
        out.append(coords[-1])
    return out


def simplify_geom(geom, step=2, nd=2):
    t = geom["type"]
    c = geom["coordinates"]
    if t == "Point":
        return {"type": t, "coordinates": rcoords(c, nd)}
    if t == "LineString":
        return {"type": t, "coordinates": rcoords(simplify_line(c, step), nd)}
    if t == "MultiLineString":
        return {
            "type": t,
            "coordinates": [rcoords(simplify_line(line, step), nd) for line in c],
        }
    if t == "Polygon":
        rings = []
        for ring in c:
            s = simplify_line(ring, step)
            if len(s) >= 4:
                rings.append(rcoords(s, nd))
        return {"type": t, "coordinates": rings}
    if t == "MultiPolygon":
        polys = []
        for poly in c:
            rings = []
            for ring in poly:
                s = simplify_line(ring, step)
                if len(s) >= 4:
                    rings.append(rcoords(s, nd))
            if rings:
                polys.append(rings)
        return {"type": t, "coordinates": polys}
    return geom


def dump_compact(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, separators=(",", ":")), encoding="utf-8")
    print(f"  {path.name}: {path.stat().st_size // 1024} KB")


def main() -> int:
    TMP.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    paths = {}
    for key in FILES:
        dest = TMP / FILES[key]
        if not dest.exists() or dest.stat().st_size < 1000:
            download(key, dest)
        paths[key] = dest

    land = json.loads(paths["land"].read_text(encoding="utf-8"))
    land_out = {"type": "FeatureCollection", "features": []}
    for feat in land["features"]:
        land_out["features"].append(
            {"type": "Feature", "geometry": simplify_geom(feat["geometry"], 1, 2)}
        )
    dump_compact(OUT / "land.json", land_out)

    rivers = json.loads(paths["rivers"].read_text(encoding="utf-8"))
    lakes = json.loads(paths["lakes"].read_text(encoding="utf-8"))
    water = {"type": "FeatureCollection", "features": []}
    for feat in rivers["features"]:
        water["features"].append(
            {
                "type": "Feature",
                "geometry": simplify_geom(feat["geometry"], 1, 2),
                "p": {"k": "r"},
            }
        )
    for feat in lakes["features"]:
        water["features"].append(
            {
                "type": "Feature",
                "geometry": simplify_geom(feat["geometry"], 1, 2),
                "p": {"k": "l"},
            }
        )
    dump_compact(OUT / "rivers.json", water)

    cities = json.loads(paths["cities"].read_text(encoding="utf-8"))
    cities_out = {"type": "FeatureCollection", "features": []}
    for feat in cities["features"]:
        p = feat["properties"]
        name = p.get("NAME") or p.get("NAMEASCII") or "?"
        pop = int(p.get("POP_MAX") or 0)
        sr = p.get("SCALERANK", 9)
        lon, lat = feat["geometry"]["coordinates"][:2]
        cities_out["features"].append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(lon, 3), round(lat, 3)],
                },
                "p": {"n": name, "pop": pop, "sr": sr},
            }
        )
    dump_compact(OUT / "cities.json", cities_out)

    roads = json.loads(paths["roads"].read_text(encoding="utf-8"))
    allowed = {"Major Highway", "Secondary Highway", "Beltway", "Bypass"}
    roads_out = {"type": "FeatureCollection", "features": []}
    for feat in roads["features"]:
        p = feat["properties"]
        t = p.get("type") or ""
        try:
            sr = int(p.get("scalerank") if p.get("scalerank") is not None else 99)
        except (TypeError, ValueError):
            sr = 99
        ex = p.get("expressway") or 0
        if t not in allowed and not ex:
            continue
        if sr > 4 and not ex:
            continue
        roads_out["features"].append(
            {
                "type": "Feature",
                "geometry": simplify_geom(feat["geometry"], 3, 2),
                "p": {"t": 1 if (ex or t == "Major Highway") else 2},
            }
        )
    print(f"  roads kept: {len(roads_out['features'])}")
    dump_compact(OUT / "roads.json", roads_out)

    total = sum(f.stat().st_size for f in OUT.glob("*.json"))
    print(f"data total: {total / 1024 / 1024:.2f} MB → {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
