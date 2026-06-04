#!/bin/bash
# One-click setup script for Ubuntu 22.04 LTS
# Installs Node.js, Nginx, PM2, and configures Firewall

set -e

echo ">>> Updating System..."
sudo apt-get update

echo ">>> Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

echo ">>> Installing Nginx..."
sudo apt-get install -y nginx

echo ">>> Installing PM2..."
sudo npm install -g pm2

echo ">>> Configuring Firewall (UFW)..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
# Enable without prompt
echo "y" | sudo ufw enable

echo ">>> Creating Project Directory..."
sudo mkdir -p /opt/tymdhdpt
sudo chown -R $USER:$USER /opt/tymdhdpt

echo ">>> Environment Setup Complete! ✅"
echo "Node Version: $(node -v)"
echo "NPM Version: $(npm -v)"
echo "Nginx Version: $(nginx -v)"
