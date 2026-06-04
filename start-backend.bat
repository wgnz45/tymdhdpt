@echo off
title Backend API Server
echo Starting Backend API Server...
cd /d "%~dp0"
node server/index.js
pause
