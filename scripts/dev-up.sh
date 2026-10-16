#!/usr/bin/env bash
# One-command durable recovery: ensure a dev server is up AND fully warm.
#
#   bash scripts/dev-up.sh
#
# Loop (max 6 attempts): if port 3000 is dead, relaunch via dev-guard-once.sh,
# then run the OOM-safe sequential warmup (scripts/dev-warmup.sh). If the server
# dies mid-warmup (sandbox harness reaps processes / OOM), the next attempt
# resumes — already-compiled routes return instantly, so progress accumulates
# across attempts. Exit 0 only when every route answers (any HTTP code).
set -u
DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$DIR/watchdog.log"
cd "$DIR" || exit 1

for attempt in 1 2 3 4 5 6; do
  bash "$DIR/scripts/dev-guard-once.sh"
  sleep 6   # let the listener come up before hammering routes
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [dev-up] attempt $attempt: warming" >> "$LOG"
  if bash "$DIR/scripts/dev-warmup.sh" | tail -n 3; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [dev-up] SUCCESS on attempt $attempt — server up and fully warm" >> "$LOG"
    exit 0
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [dev-up] attempt $attempt failed — server died mid-warmup, retrying" >> "$LOG"
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [dev-up] FAILED after 6 attempts" >> "$LOG"
exit 1
