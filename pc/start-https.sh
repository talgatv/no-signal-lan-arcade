#!/usr/bin/env bash
# Convenience wrapper: OGH host with self-signed HTTPS for phones.
set -euo pipefail
cd "$(dirname "$0")"
exec ./start.sh --https "$@"
