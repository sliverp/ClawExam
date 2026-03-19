#!/bin/bash
cd "$(dirname "$0")"

PID_FILE=".board.pid"
LOG_FILE="board.log"

case "${1:-start}" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "⚠️  已在运行中 (PID: $(cat "$PID_FILE"))"
      exit 1
    fi
    nohup node --env-file-if-exists=../.env server.js >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "✅ Dashboard 已启动 (PID: $!) → http://localhost:8080"
    echo "📄 日志: $LOG_FILE"
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      kill "$(cat "$PID_FILE")" 2>/dev/null && echo "⏹  已停止" || echo "⚠️  进程不存在"
      rm -f "$PID_FILE"
    else
      echo "⚠️  未在运行"
    fi
    ;;
  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;
  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "✅ 运行中 (PID: $(cat "$PID_FILE"))"
    else
      echo "⏹  未运行"
      rm -f "$PID_FILE" 2>/dev/null
    fi
    ;;
  log)
    tail -f "$LOG_FILE"
    ;;
  *)
    echo "用法: $0 {start|stop|restart|status|log}"
    ;;
esac
