#!/usr/bin/env bash
# Sequential dev-server warmup — the OOM-safe way to compile all routes.
#
# WHY THIS EXISTS (evidence, 2026-10 session):
#   This sandbox is 4GB RAM / 0 swap. `next dev` (Turbopack) compiles routes
#   on demand. When many routes are requested IN PARALLEL (e.g. a burst of
#   curls or a monitoring sweep right after boot), compile jobs stack and
#   next-server RSS spikes past ~2.2GB -> kernel OOM-kills it (dmesg:
#   "Out of memory: Killed process ... (next-server) anon-rss:2,2xx,xxx kB").
#   Compiling routes ONE AT A TIME keeps peak RSS below the kill threshold.
#
# USAGE:
#   bash scripts/dev-warmup.sh            # warm everything, print per-route codes
#   QUIET=1 bash scripts/dev-warmup.sh    # summary only
#
# Exit codes: 0 = all routes warm, 2 = server unreachable (dead mid-warmup).
set -u
PORT=3000
DIR="$(cd "$(dirname "$0")/.." && pwd)"
BASE="http://127.0.0.1:${PORT}"
QUIET="${QUIET:-0}"
RETRIES="${RETRIES:-2}"
GAP="${GAP:-1.2}"   # seconds between routes; lets Turbopack settle between compiles

cd "$DIR" || exit 1

# Route list (paths relative to /api), discovered from route.ts files.
# [ref] dynamic segments get real probe values below; any HTTP code (incl.
# 404/405) proves the route compiled — that is the only goal here.
ROUTES="/"
ROUTES="$ROUTES $(for f in $(rg --files src/app/api -g 'route.ts' 2>/dev/null | sort); do
  p="${f#src/app/api}"; p="${p%/route.ts}"
  p="$(echo "$p" | sed -E 's/\[\[\.\.\..+\]\]//; s/\[[^]]+\]/PROBE/g')"
  echo "/api${p:-/}"
done)"

probe_for() {
  case "$1" in
    */shipments/PROBE*|*shipments/PROBE)  echo "SHP-8801" ;;
    */exceptions/PROBE)                   echo "EXC-1001" ;;
    */actions/PROBE/decide|*/bols/PROBE/correct|*/exceptions/PROBE/transition)
                                          echo "probe-ref-000" ;;
    *)                                    echo "probe" ;;
  esac
}

warm=0; dead=0; total=0
for r in $ROUTES; do
  total=$((total+1))
  url="${BASE}$(echo "$r" | sed 's/PROBE/PLACEHOLDER/g')"
  case "$r" in
    */shipments/PROBE*)     url="${BASE}/api/shipments/SHP-8801" ;;
    */exceptions/PROBE)     url="${BASE}/api/exceptions/EXC-1001" ;;
    */actions/PROBE/decide) url="${BASE}/api/actions/probe-ref-000/decide" ;;
    */bols/PROBE/correct)   url="${BASE}/api/bols/probe-ref-000/correct" ;;
    */exceptions/PROBE/transition) url="${BASE}/api/exceptions/EXC-1001/transition" ;;
  esac
  code=""
  for attempt in 0 1 2; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 120 "$url")"
    [ "$code" != "000" ] && break
    # 000 = connection refused/reset: server may have died or is mid-boot.
    sleep 4
  done
  if [ "$code" = "000" ]; then
    dead=$((dead+1))
    [ "$QUIET" = "0" ] && echo "DEAD  $r"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [warmup] server unreachable at $r — aborting (exit 2)" >> watchdog.log
    exit 2
  fi
  warm=$((warm+1))
  [ "$QUIET" = "0" ] && echo "$code  $r"
  sleep "$GAP"
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [warmup] $warm/$total routes warm, 0 dead" >> watchdog.log
[ "$QUIET" = "0" ] && echo "warm $warm/$total"
exit 0
