#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
MODE="${1:-start}"
case "$MODE" in
  --help|help)
    echo 'Usage: ./script/build_and_run.sh [start|--ios|--android|--web|--dev-client|--tunnel|--export-web]'
    exit 0
    ;;
  start|run) set -- start ;;
  --export-web|export-web) set -- export --platform web ;;
  --ios|ios|--android|android|--web|web|--dev-client|dev-client|--tunnel|tunnel)
    set -- start "--${MODE#--}"
    ;;
  *) echo "Unknown mode: $MODE" >&2; exit 2 ;;
esac
if command -v pnpm >/dev/null 2>&1 && [[ -f ../pnpm-lock.yaml ]]; then
  exec pnpm exec expo "$@"
elif command -v yarn >/dev/null 2>&1 && [[ -f ../yarn.lock ]]; then
  exec yarn expo "$@"
elif command -v bun >/dev/null 2>&1 && [[ -f ../bun.lock || -f ../bun.lockb ]]; then
  exec bunx expo "$@"
else
  exec npx expo "$@"
fi
