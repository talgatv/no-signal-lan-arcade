#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OGH PC Host — ultra-light LAN game server (Python stdlib only).

  • HTTP: serves ../games/ and ./www/ (lobby)
  • WebSocket /ws: rooms, players, game action relay

No pip. No Node. Run with any Python 3.9+.

  python3 host.py
  python3 host.py --port 8080 --bind 0.0.0.0
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import mimetypes
import os
import re
import socket
import struct
import sys
import threading
import time
import traceback
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import unquote, urlparse

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

PC_DIR = Path(__file__).resolve().parent
REPO_ROOT = PC_DIR.parent
WWW_DIR = PC_DIR / "www"
DOCS_DIR = REPO_ROOT / "docs"

# Mutable config (set in main)
class _Cfg:
    games_dir: Path = REPO_ROOT / "games"
    programs_dir: Path = REPO_ROOT / "programs"


CFG = _Cfg()

WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


# ---------------------------------------------------------------------------
# Room hub
# ---------------------------------------------------------------------------


class Player:
    __slots__ = ("id", "name", "room", "game_id", "ready", "ws", "joined_at")

    def __init__(self, name: str, room: str, game_id: str, ws: "WsConnection") -> None:
        self.id = uuid.uuid4().hex[:8]
        self.name = name[:24] or f"P-{self.id[:4]}"
        self.room = room
        self.game_id = game_id
        self.ready = False
        self.ws = ws
        self.joined_at = time.time()


class Room:
    def __init__(self, room_id: str) -> None:
        self.id = room_id
        self.players: Dict[str, Player] = {}
        self.host_id: Optional[str] = None
        self.lock = threading.Lock()

    def add(self, p: Player) -> None:
        with self.lock:
            if not self.players:
                self.host_id = p.id
            self.players[p.id] = p

    def remove(self, player_id: str) -> None:
        with self.lock:
            self.players.pop(player_id, None)
            if self.host_id == player_id:
                self.host_id = next(iter(self.players), None)

    def snapshot(self) -> List[dict]:
        with self.lock:
            return [
                {
                    "id": p.id,
                    "name": p.name,
                    "ready": p.ready,
                    "gameId": p.game_id,
                    "isHost": p.id == self.host_id,
                }
                for p in self.players.values()
            ]

    def broadcast(self, msg: dict, exclude: Optional[str] = None) -> None:
        data = json.dumps(msg, ensure_ascii=False)
        with self.lock:
            targets = list(self.players.values())
        for p in targets:
            if exclude and p.id == exclude:
                continue
            try:
                p.ws.send_text(data)
            except Exception:
                pass


class Hub:
    def __init__(self) -> None:
        self.rooms: Dict[str, Room] = {}
        self.lock = threading.Lock()

    def room(self, room_id: str) -> Room:
        with self.lock:
            if room_id not in self.rooms:
                self.rooms[room_id] = Room(room_id)
            return self.rooms[room_id]

    def cleanup_empty(self, room_id: str) -> None:
        with self.lock:
            r = self.rooms.get(room_id)
            if r and not r.players:
                self.rooms.pop(room_id, None)


HUB = Hub()


# ---------------------------------------------------------------------------
# WebSocket connection (RFC6455 subset: text frames)
# ---------------------------------------------------------------------------


class WsConnection:
    def __init__(self, sock: socket.socket) -> None:
        self.sock = sock
        self.lock = threading.Lock()
        self.closed = False
        self.player: Optional[Player] = None

    def send_text(self, text: str) -> None:
        payload = text.encode("utf-8")
        header = bytearray()
        header.append(0x81)  # FIN + text
        n = len(payload)
        if n < 126:
            header.append(n)
        elif n < 65536:
            header.append(126)
            header.extend(struct.pack("!H", n))
        else:
            header.append(127)
            header.extend(struct.pack("!Q", n))
        with self.lock:
            if self.closed:
                return
            self.sock.sendall(header + payload)

    def send_json(self, obj: dict) -> None:
        self.send_text(json.dumps(obj, ensure_ascii=False))

    def close(self) -> None:
        self.closed = True
        try:
            self.sock.shutdown(socket.SHUT_RDWR)
        except Exception:
            pass
        try:
            self.sock.close()
        except Exception:
            pass

    def read_frame(self) -> Optional[str]:
        """Read one text frame; returns None on close/error."""
        try:
            hdr = self._recvexact(2)
            if not hdr:
                return None
            b1, b2 = hdr[0], hdr[1]
            opcode = b1 & 0x0F
            masked = (b2 & 0x80) != 0
            length = b2 & 0x7F
            if length == 126:
                length = struct.unpack("!H", self._recvexact(2))[0]
            elif length == 127:
                length = struct.unpack("!Q", self._recvexact(8))[0]
            mask = self._recvexact(4) if masked else b""
            data = self._recvexact(length) if length else b""
            if masked and mask:
                data = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
            if opcode == 0x8:  # close
                return None
            if opcode == 0x9:  # ping -> pong
                self._send_pong(data)
                return self.read_frame()
            if opcode == 0xA:  # pong
                return self.read_frame()
            if opcode == 0x1:  # text
                return data.decode("utf-8", errors="replace")
            # ignore binary/continuation for now
            return self.read_frame()
        except Exception:
            return None

    def _send_pong(self, data: bytes) -> None:
        header = bytearray([0x8A, len(data) & 0x7F])
        with self.lock:
            if not self.closed:
                try:
                    self.sock.sendall(header + data)
                except Exception:
                    pass

    def _recvexact(self, n: int) -> bytes:
        buf = bytearray()
        while len(buf) < n:
            chunk = self.sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError("socket closed")
            buf.extend(chunk)
        return bytes(buf)


def ws_accept_key(client_key: str) -> str:
    digest = hashlib.sha1((client_key + WS_MAGIC).encode("utf-8")).digest()
    return base64.b64encode(digest).decode("ascii")


def handle_ws_client(conn: WsConnection) -> None:
    try:
        while not conn.closed:
            raw = conn.read_frame()
            if raw is None:
                break
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                conn.send_json({"v": 1, "type": "error", "message": "invalid json"})
                continue
            _dispatch(conn, msg)
    finally:
        _on_disconnect(conn)
        conn.close()


def _dispatch(conn: WsConnection, msg: dict) -> None:
    mtype = msg.get("type")
    if mtype == "join":
        name = str(msg.get("name") or "Player")
        room_id = str(msg.get("room") or "main")[:32]
        game_id = str(msg.get("gameId") or msg.get("game_id") or "")[:64]
        room = HUB.room(room_id)
        player = Player(name, room_id, game_id, conn)
        conn.player = player
        room.add(player)
        is_host = room.host_id == player.id
        conn.send_json(
            {
                "v": 1,
                "type": "hello",
                "playerId": player.id,
                "isHost": is_host,
                "room": room_id,
            }
        )
        room.broadcast(
            {"v": 1, "type": "lobby", "players": room.snapshot(), "room": room_id}
        )
        print(f"[join] {player.name} ({player.id}) -> room={room_id} game={game_id}")
        return

    player = conn.player
    if not player:
        conn.send_json({"v": 1, "type": "error", "message": "join first"})
        return

    room = HUB.room(player.room)

    if mtype == "ready":
        player.ready = bool(msg.get("value", True))
        room.broadcast(
            {"v": 1, "type": "lobby", "players": room.snapshot(), "room": room.id}
        )
        return

    if mtype == "chat":
        room.broadcast(
            {
                "v": 1,
                "type": "chat",
                "from": player.id,
                "name": player.name,
                "text": str(msg.get("text") or "")[:200],
            }
        )
        return

    if mtype == "game:start":
        if player.id != room.host_id:
            conn.send_json({"v": 1, "type": "error", "message": "only host can start"})
            return
        room.broadcast(
            {
                "v": 1,
                "type": "game:start",
                "gameId": msg.get("gameId") or player.game_id,
                "seed": msg.get("seed") or int(time.time()) % 10_000_000,
                "hostId": room.host_id,
            }
        )
        return

    if mtype in ("game:action", "game:state", "game:event"):
        # Relay to everyone else (and optionally include sender for state)
        out = {
            "v": 1,
            "type": mtype,
            "from": player.id,
            "action": msg.get("action"),
            "payload": msg.get("payload"),
            "tick": msg.get("tick"),
            "t": msg.get("t") or int(time.time() * 1000),
        }
        # host state often needs all clients; actions usually exclude sender
        exclude = player.id if mtype == "game:action" else None
        if mtype == "game:state":
            exclude = None  # host broadcasts full state to all including self ok
            # actually exclude self to save bandwidth — clients already know local
            exclude = player.id
        room.broadcast(out, exclude=exclude)
        return

    if mtype == "ping":
        conn.send_json({"v": 1, "type": "pong", "t": msg.get("t")})
        return

    conn.send_json({"v": 1, "type": "error", "message": f"unknown type: {mtype}"})


def _on_disconnect(conn: WsConnection) -> None:
    p = conn.player
    if not p:
        return
    room = HUB.room(p.room)
    room.remove(p.id)
    print(f"[leave] {p.name} ({p.id}) room={p.room}")
    room.broadcast(
        {"v": 1, "type": "lobby", "players": room.snapshot(), "room": room.id}
    )
    HUB.cleanup_empty(p.room)
    conn.player = None


# ---------------------------------------------------------------------------
# HTTP + upgrade
# ---------------------------------------------------------------------------


def guess_type(path: Path) -> str:
    if path.suffix.lower() in {".md", ".markdown"}:
        return "text/markdown; charset=utf-8"
    if path.suffix.lower() == ".json":
        return "application/json; charset=utf-8"
    mime, _ = mimetypes.guess_type(str(path))
    return mime or "application/octet-stream"


def safe_join(root: Path, rel: str) -> Optional[Path]:
    rel = unquote(rel).lstrip("/")
    if ".." in rel.split("/"):
        return None
    full = (root / rel).resolve()
    try:
        full.relative_to(root.resolve())
    except ValueError:
        return None
    return full


class OGHHandler(BaseHTTPRequestHandler):
    server_version = "OGH-PC/0.1"

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path or "/"

        if path == "/ws":
            self._upgrade_websocket()
            return

        if path == "/api/health":
            self._json(200, {"ok": True, "rooms": len(HUB.rooms), "v": 1})
            return

        if path == "/api/rooms":
            rooms = {
                rid: len(r.players)
                for rid, r in list(HUB.rooms.items())
            }
            self._json(200, {"rooms": rooms})
            return

        # static
        file_path = self._resolve_static(path)
        if file_path is not None and file_path.is_dir():
            index = file_path / "index.html"
            if index.is_file():
                file_path = index
        if file_path is None or not file_path.is_file():
            self.send_error(404, "Not found")
            return
        try:
            data = file_path.read_bytes()
        except OSError:
            self.send_error(500, "Read error")
            return
        self.send_response(200)
        self.send_header("Content-Type", guess_type(file_path))
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def _json(self, code: int, obj: dict) -> None:
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(raw)

    def _resolve_static(self, path: str) -> Optional[Path]:
        if path in ("/", "/index.html", "/lobby", "/lobby/"):
            return WWW_DIR / "index.html"
        # Games hub (library + profile) — also lists programs from catalog
        if path in (
            "/games",
            "/games/",
            "/games/hub",
            "/games/hub/",
            "/hub",
            "/hub/",
            "/library",
            "/library/",
            "/apps",
            "/apps/",
        ):
            return CFG.games_dir / "hub" / "index.html"
        if path.startswith("/games/"):
            return safe_join(CFG.games_dir, path[len("/games/") :])
        if path.startswith("/programs/"):
            return safe_join(CFG.programs_dir, path[len("/programs/") :])
        if path.startswith("/shared/"):
            # alias games/_shared
            return safe_join(CFG.games_dir / "_shared", path[len("/shared/") :])
        if path.startswith("/docs/"):
            return safe_join(DOCS_DIR, path[len("/docs/") :])
        # www public assets
        if path.startswith("/www/"):
            return safe_join(WWW_DIR, path[len("/www/") :])
        # direct root of www
        return safe_join(WWW_DIR, path.lstrip("/"))

    def _upgrade_websocket(self) -> None:
        key = self.headers.get("Sec-WebSocket-Key")
        if not key:
            self.send_error(400, "Missing Sec-WebSocket-Key")
            return
        accept = ws_accept_key(key.strip())
        self.send_response(101, "Switching Protocols")
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", accept)
        self.end_headers()

        # Detach socket from HTTP handler
        sock = self.connection
        try:
            self.connection = None  # type: ignore
        except Exception:
            pass
        ws = WsConnection(sock)
        # Run on this thread (ThreadingHTTPServer → one thread per request)
        handle_ws_client(ws)


# ---------------------------------------------------------------------------
# Utils
# ---------------------------------------------------------------------------


def local_ips() -> List[str]:
    ips: List[str] = []
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
    except Exception:
        pass
    # default route trick
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip not in ips and not ip.startswith("127."):
            ips.insert(0, ip)
    except Exception:
        pass
    if not ips:
        ips.append("127.0.0.1")
    return ips


def main() -> int:
    parser = argparse.ArgumentParser(description="OGH PC Host — LAN game server")
    parser.add_argument("--host", "--bind", dest="bind", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument(
        "--games",
        type=Path,
        default=CFG.games_dir,
        help="Path to games/ directory",
    )
    args = parser.parse_args()

    CFG.games_dir = args.games.resolve()
    if not CFG.games_dir.is_dir():
        print(f"ERROR: games dir not found: {CFG.games_dir}", file=sys.stderr)
        return 1
    if not WWW_DIR.is_dir():
        print(f"ERROR: www dir missing: {WWW_DIR}", file=sys.stderr)
        return 1

    httpd = ThreadingHTTPServer((args.bind, args.port), OGHHandler)
    # Allow re-bind quickly after restart
    httpd.allow_reuse_address = True

    ips = local_ips()
    print("=" * 56)
    print("  OGH PC Host  ·  Python stdlib  ·  no Node")
    print("=" * 56)
    print(f"  Games : {CFG.games_dir}")
    print(f"  Lobby : http://127.0.0.1:{args.port}/")
    print(f"  WS    : ws://127.0.0.1:{args.port}/ws")
    print()
    print("  Open on phones (same Wi‑Fi):")
    for ip in ips:
        print(f"    http://{ip}:{args.port}/")
    print()
    print("  Ctrl+C to stop")
    print("=" * 56)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping…")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
