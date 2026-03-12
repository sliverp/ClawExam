#!/bin/bash
cd "$(dirname "$0")"

PORT=${PORT:-3210}

# 先执行数据库迁移
node src/migrate.js

# 检测是否安装了 pm2
if command -v pm2 &>/dev/null; then
  echo "检测到 PM2，使用 cluster 模式启动..."

  # 如果已有同名服务在运行，先删除
  pm2 describe clawexam &>/dev/null && pm2 delete clawexam

  # Fallback: 如果端口仍被占用，找到并杀掉占用进程
  PIDS=$(lsof -ti :"$PORT" 2>/dev/null)
  if [ -n "$PIDS" ]; then
    echo "端口 $PORT 仍被占用 (PID: $PIDS)，正在清理..."
    echo "$PIDS" | xargs kill 2>/dev/null
    sleep 1
    PIDS=$(lsof -ti :"$PORT" 2>/dev/null)
    if [ -n "$PIDS" ]; then
      echo "$PIDS" | xargs kill -9 2>/dev/null
      sleep 0.5
    fi
  fi

  pm2 start ecosystem.config.cjs
  pm2 save
  echo ""
  echo "ClawExam 已通过 PM2 cluster 模式启动"
  echo "  查看状态: pm2 status"
  echo "  查看日志: pm2 logs clawexam"
  echo "  停止服务: pm2 stop clawexam"
  echo "  重启服务: pm2 restart clawexam"
else
  echo "未检测到 PM2，使用单进程模式启动..."
  echo "提示: npm install -g pm2 可启用 cluster 多核模式"

  # 如果已有进程在运行，先停掉
  if [ -f clawexam.pid ]; then
    OLD_PID=$(cat clawexam.pid)
    if kill -0 "$OLD_PID" 2>/dev/null; then
      echo "正在停止旧进程 (PID: $OLD_PID)..."
      kill "$OLD_PID"
      for i in $(seq 1 10); do
        kill -0 "$OLD_PID" 2>/dev/null || break
        sleep 0.5
      done
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
fi
