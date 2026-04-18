#!/bin/sh
set -eu

cd "$(dirname "$0")"

PORT="${NAAVAL_PORT:-8788}"
python3 dev_server.py --port "$PORT" --seed-demo &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM
sleep 1
python3 smoke_test.py --base-url "http://127.0.0.1:$PORT"

