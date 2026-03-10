#!/bin/bash
cd "$(dirname "$0")"

PORT=${PORT:-3210}

# 先执行数据库迁移
node src/migrate.js

# 如果已有进程在运行，先停掉
if [ -f clawexam.pid ]; then
  OLD_PID=$(cat clawexam.pid)
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "正在停止旧进程 (PID: $OLD_PID)..."
    kill "$OLD_PID"
    # 等待进程退出，最多等 5 秒
    for i in $(seq 1 10); do
      kill -0 "$OLD_PID" 2>/dev/null || break
      sleep 0.5
    done
    # 如果还没退出，强制杀
    if kill -0 "$OLD_PID" 2>/dev/null; then
      echo "旧进程未响应，强制终止..."
      kill -9 "$OLD_PID" 2>/dev/null
      sleep 0.5
    fi
  fi
  rm -f clawexam.pid
fi

# Fallback: 如果端口仍被占用，找到并杀掉占用进程
PIDS=$(lsof -ti :"$PORT" 2>/dev/null)
if [ -n "$PIDS" ]; then
  echo "端口 $PORT 仍被占用 (PID: $PIDS)，正在清理..."
  echo "$PIDS" | xargs kill 2>/dev/null
  sleep 1
  # 再检查一次，还在就强杀
  PIDS=$(lsof -ti :"$PORT" 2>/dev/null)
  if [ -n "$PIDS" ]; then
    echo "$PIDS" | xargs kill -9 2>/dev/null
    sleep 0.5
  fi
fi

# nohup 后台启动
nohup node src/server.js >> clawexam.log 2>&1 &
echo $! > clawexam.pid

echo "ClawExam 已启动 (PID: $!)"
echo "日志文件: clawexam.log"
