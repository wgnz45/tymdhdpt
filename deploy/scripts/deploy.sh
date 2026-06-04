#!/bin/bash
# ===== CJDLT 一键部署脚本 =====
# 在腾讯云 Ubuntu 22.04 服务器上运行

set -e

echo "===== 1. 更新系统 ====="
sudo apt update && sudo apt upgrade -y

echo "===== 2. 安装 Node.js 20.x ====="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "Node: $(node -v)"
echo "NPM: $(npm -v)"

echo "===== 3. 安装 PM2 进程管理 ====="
sudo npm install -g pm2

echo "===== 4. 安装编译工具 (better-sqlite3 需要) ====="
sudo apt install -y build-essential python3

echo "===== 5. 创建项目目录 ====="
sudo mkdir -p /opt/cjdlt
sudo chown ubuntu:ubuntu /opt/cjdlt

echo "===== 6. 安装依赖 ====="
cd /opt/cjdlt/server
npm install --production

echo "===== 7. 启动服务 ====="
pm2 stop cjdlt 2>/dev/null || true
pm2 start index.js --name cjdlt --cwd /opt/cjdlt/server
pm2 save
pm2 startup | tail -1 | bash || true

echo "===== 8. 配置防火墙 ====="
sudo ufw allow 3366/tcp 2>/dev/null || true

echo ""
echo "===== 部署完成！====="
echo "访问地址: http://$(curl -s ifconfig.me):3366"
