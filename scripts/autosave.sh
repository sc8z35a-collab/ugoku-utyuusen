#!/usr/bin/env bash
# 作業消失対策: 一定間隔で作業ツリーの変更を自動コミットし、リモートへ push する。
# 使い方: scripts/autosave.sh start | stop | status | once
#   INTERVAL (秒, 既定 180) / BRANCH (既定: 現在のブランチ)
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="$ROOT/.autosave.pid"
LOG="$ROOT/.autosave.log"
INTERVAL="${INTERVAL:-180}"

snapshot() {
  cd "$ROOT" || return 1
  # 他の git 操作（rebase / merge 等）の最中は触らない
  if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || [ -f .git/MERGE_HEAD ] || [ -f .git/index.lock ]; then
    echo "$(date '+%F %T') skip: git operation in progress"; return 0
  fi
  local branch; branch="${BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
  [ "$branch" = "HEAD" ] && { echo "$(date '+%F %T') skip: detached HEAD"; return 0; }
  git add -A >/dev/null 2>&1
  if ! git diff --cached --quiet; then
    local n; n=$(git diff --cached --name-only | wc -l)
    git commit -q -m "chore(autosave): $(date '+%F %T') ${n} file(s)" && echo "$(date '+%F %T') committed ${n} file(s) on ${branch}"
  fi
  # 未 push のコミットがあれば push（失敗しても次回再試行）
  if [ -n "$(git log --oneline "origin/${branch}..${branch}" 2>/dev/null)" ] || ! git rev-parse -q --verify "origin/${branch}" >/dev/null; then
    if timeout 60 git push -q --force-with-lease origin "${branch}" 2>>"$LOG"; then echo "$(date '+%F %T') pushed ${branch}"; else echo "$(date '+%F %T') push failed (will retry)"; fi
  fi
}

loop() { while true; do snapshot; sleep "$INTERVAL"; done; }

case "${1:-status}" in
  start)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then echo "already running (pid $(cat "$PIDFILE"))"; exit 0; fi
    nohup "$0" loop >>"$LOG" 2>&1 &
    echo $! >"$PIDFILE"; echo "autosave started (pid $!, every ${INTERVAL}s, log $LOG)";;
  loop) loop;;
  once) snapshot;;
  stop) [ -f "$PIDFILE" ] && kill "$(cat "$PIDFILE")" 2>/dev/null; rm -f "$PIDFILE"; echo "autosave stopped";;
  status) if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then echo "running (pid $(cat "$PIDFILE"))"; tail -n 5 "$LOG"; else echo "not running"; fi;;
  *) echo "usage: $0 start|stop|status|once"; exit 1;;
esac
