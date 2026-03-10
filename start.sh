#!/bin/bash
cd "$(dirname "$0")"

# 先执行数据库迁移
node src/migrate.js

# 如果已有进程在运行，先停掉
if [ -f clawexam.pid ]; then
  OLD_PID=$(cat clawexam.pid)
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "正在停止旧进程 (PID: $OLD_PID)..."
    kill "$OLD_PID"
    sleep 1
  fi
  rm -f clawexam.pid
fi

# nohup 后台启动
nohup node src/server.js >> clawexam.log 2>&1 &
echo $! > clawexam.pid

echo "ClawExam 已启动 (PID: $!)"
echo "日志文件: clawexam.log"
