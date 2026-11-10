#!/bin/bash
# 图寻工作台 启动脚本
# 双击后启动本地静态服务，并用默认浏览器打开工作台
# 关闭这个终端窗口即停止服务，数据不会丢失

cd "$(dirname "$0")" || exit 1

PORT=8765
URL="http://127.0.0.1:$PORT/"

PY="/usr/bin/python3"
if ! [ -x "$PY" ]; then
  PY="$(command -v python3)"
fi
if [ -z "$PY" ] || ! [ -x "$PY" ]; then
  echo "没有找到 python3，无法启动本地服务。"
  echo "请安装 Xcode 命令行工具后重试。"
  read -n 1 -s -r -p "按任意键关闭窗口"
  exit 1
fi

if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  if curl -s --max-time 2 "$URL" | grep -q "图寻工作台"; then
    echo "工作台已经在运行，直接打开页面。"
    open "$URL"
    exit 0
  fi
  echo "端口 $PORT 被其他程序占用，无法启动。"
  echo "请先关闭占用该端口的程序，再重新双击本文件。"
  echo "（不自动换端口，是因为换端口等于换数据来源，你的记录会看起来消失。）"
  read -n 1 -s -r -p "按任意键关闭窗口"
  exit 1
fi

echo "工作台地址：$URL"
echo "关闭这个窗口即停止服务。"
( sleep 1; open "$URL" ) &

exec "$PY" -m http.server $PORT --bind 127.0.0.1
