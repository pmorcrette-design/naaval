#!/bin/sh
set -eu

cd "$(dirname "$0")"
python3 dev_server.py --host 0.0.0.0 --port 8787 --seed-demo
