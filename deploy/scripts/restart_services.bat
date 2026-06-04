@echo off
echo Stopping all Node.js processes...
taskkill /F /IM node.exe
timeout /t 3

echo Starting API Server with Logging...
start /B node server/index.js > server_debug.log 2>&1
timeout /t 5

echo Starting Frontend Dev Server...
start /B npm run dev
echo Services restarted with logging enabled.
