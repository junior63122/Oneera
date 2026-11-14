#!/usr/bin/env bash
# Démarre une base PostgreSQL + PostGIS locale jetable pour le développement et les tests.
# Usage : scripts/dev-db.sh [port]  →  affiche TEST_DATABASE_URL
set -euo pipefail
PORT="${1:-55432}"
DIR="${PGDEV_DIR:-/tmp/oneera-pg}"
BIN="$(pg_config --bindir 2>/dev/null || echo /usr/lib/postgresql/16/bin)"
RUN_AS=""
if [ "$(id -u)" = "0" ]; then RUN_AS="runuser -u postgres --"; mkdir -p "$DIR"; chown postgres "$DIR"; fi
if [ ! -f "$DIR/PG_VERSION" ]; then
  $RUN_AS "$BIN/initdb" -D "$DIR" -U oneera --auth=trust >/dev/null
fi
if ! $RUN_AS "$BIN/pg_ctl" -D "$DIR" status >/dev/null 2>&1; then
  $RUN_AS "$BIN/pg_ctl" -D "$DIR" -o "-p $PORT -k /tmp" -l "$DIR/log" start >/dev/null
fi
echo "TEST_DATABASE_URL=postgres://oneera@127.0.0.1:$PORT/postgres"
