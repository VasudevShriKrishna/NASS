#!/usr/bin/env bash
# Single-shot dev-server guard (invoked by the platform scheduler every minute).
# Pairs with dev-watchdog.sh: if port 3000 has no listener, relaunch `bun run dev`.
# Port-probe gate prevents duplicates; all actions logged to watchdog.log.
PORT=3000
DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$DIR/watchdog.log"
if ! (exec 3<>/dev/tcp/127.0.0.1/"$PORT") 2>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [cron-guard] port $PORT not listening — starting dev server" >> "$LOG"
  cd "$DIR" || exit 1
  setsid nohup bun run dev >> dev.log 2>&1 &
  sleep 3
  (exec 3<>/dev/tcp/127.0.0.1/"$PORT") 2>/dev/null \
    && echo "[$(date '+%Y-%m-%d %H:%M:%S')] [cron-guard] dev server relaunched OK" >> "$LOG" \
    || echo "[$(date '+%Y-%m-%d %H:%M:%S')] [cron-guard] relaunch issued (boot in progress)" >> "$LOG"
  # OOM-safe warmup: compile routes SEQUENTIALLY so parallel Turbopack compiles
  # cannot stack RSS past the kernel kill threshold (see scripts/dev-warmup.sh).
  setsid nohup bash "$DIR/scripts/dev-warmup.sh" >> "$LOG" 2>&1 &
else
  exec 3>&- 2>/dev/null
fi
