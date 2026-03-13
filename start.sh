#!/bin/bash
cd "$(dirname "$0")"

PORT=${PORT:-3210}

# ==================== 环境依赖检查 ====================
# 证书图片使用 @resvg/resvg-js 渲染 SVG→PNG，需要系统安装中文字体
# 如果缺少字体，证书上的中文会显示为方块 □

install_fonts() {
  echo "正在安装中文字体及图形渲染依赖..."

  if command -v apt-get &>/dev/null; then
    # Debian / Ubuntu
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq 2>/dev/null
    apt-get install -y -qq \
      fonts-noto-cjk \
      fonts-noto-cjk-extra \
      fontconfig \
      libfontconfig1 \
      2>/dev/null
  elif command -v yum &>/dev/null; then
    # CentOS / RHEL / Amazon Linux
    yum install -y -q \
      google-noto-sans-cjk-sc-fonts \
      google-noto-sans-cjk-fonts \
      fontconfig \
      2>/dev/null
  elif command -v dnf &>/dev/null; then
    # Fedora / newer RHEL
    dnf install -y -q \
      google-noto-sans-cjk-sc-fonts \
      google-noto-sans-cjk-fonts \
      fontconfig \
      2>/dev/null
  elif command -v apk &>/dev/null; then
    # Alpine Linux
    apk add --no-cache \
      font-noto-cjk \
      fontconfig \
      2>/dev/null
  elif command -v pacman &>/dev/null; then
    # Arch Linux
    pacman -S --noconfirm --needed \
      noto-fonts-cjk \
      fontconfig \
      2>/dev/null
  else
    echo "⚠ 无法识别包管理器，请手动安装中文字体 (Noto Sans CJK SC)"
    echo "  证书图片中的中文可能显示为方块"
  fi

  # 刷新字体缓存
  if command -v fc-cache &>/dev/null; then
    fc-cache -f 2>/dev/null
    echo "字体缓存已刷新"
  fi
}

check_fonts() {
  # 检查 fc-list 是否可用
  if ! command -v fc-list &>/dev/null; then
    echo "⚠ fontconfig 未安装，正在安装字体依赖..."
    install_fonts
    return
  fi

  # 检查是否已安装 Noto Sans CJK SC 或其他中文字体
  CJK_FONTS=$(fc-list :lang=zh 2>/dev/null | head -1)
  if [ -z "$CJK_FONTS" ]; then
    echo "⚠ 未检测到中文字体，正在安装..."
    install_fonts
    # 验证安装结果
    CJK_FONTS=$(fc-list :lang=zh 2>/dev/null | head -1)
    if [ -z "$CJK_FONTS" ]; then
      echo "⚠ 字体安装可能未成功，证书图片中的中文可能显示为方块"
    else
      echo "✓ 中文字体安装成功: $(fc-list :lang=zh family 2>/dev/null | head -3 | tr '\n' ', ')"
    fi
  else
    echo "✓ 中文字体已就绪: $(fc-list :lang=zh family 2>/dev/null | head -3 | tr '\n' ', ')"
  fi
}

echo "========== 环境检查 =========="
check_fonts

# 检查 Node.js 依赖
if [ ! -d "node_modules" ]; then
  echo "node_modules 不存在，正在安装依赖..."
  npm install --production
fi
echo "=============================="
echo ""

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
