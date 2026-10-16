#!/usr/bin/env bash
# NASS dev-server watchdog — availability mitigation (defect D-01/D-04).
#
# Root cause evidence: kernel OOM-killer terminates next-server (Turbopack dev
# RSS ~2.4GB) on this 4GB/0-swap sandbox; the public URL then shows the
# "Deploying... (~1 min)" placeholder because nothing listens on port 3000.
#
# This watchdog detects a dead port and relaunches `bun run dev` detached.
# It never spawns a duplicate server (port-probe gate) and logs every action
# to watchdog.log for diagnosability. It does NOT touch app code or data.

PORT=3000
DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$DIR/watchdog.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

port_up() { (exec 3<>/dev/tcp/127.0.0.1/"$PORT") 2>/dev/null; }

log "watchdog started (pid $$, dir $DIR)"
while true; do
  if port_up; then
    exec 3>&- 2>/dev/null
  else
    log "port $PORT not listening — starting dev server"
    cd "$DIR" || { log "FATAL: cannot cd $DIR"; exit 1; }
    setsid nohup bun run dev >> dev.log 2>&1 &
    log "dev server launched (pid $!)"
    sleep 25 # give Turbopack time to boot before probing again
  fi
  sleep 10
done
