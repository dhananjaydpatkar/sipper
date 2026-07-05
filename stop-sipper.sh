#!/bin/bash

echo "🛑 Stopping Sipper Application..."
echo "========================================="

# Change to the directory where the script is located
cd "$(dirname "$0")"

# 1. Stop Frontend (port 5173)
echo "[1/3] Stopping Frontend on port 5173..."
FRONTEND_PID=$(lsof -t -i:5173)
if [ -n "$FRONTEND_PID" ]; then
  kill -9 $FRONTEND_PID
  echo "Frontend stopped."
else
  echo "Frontend is not running."
fi

# 2. Stop Backend (port 3001)
echo "[2/3] Stopping Backend on port 3001..."
BACKEND_PID=$(lsof -t -i:3001)
if [ -n "$BACKEND_PID" ]; then
  kill -9 $BACKEND_PID
  echo "Backend stopped."
else
  echo "Backend is not running."
fi

# 3. Stop PostgreSQL Database via Docker
echo "[3/3] Stopping PostgreSQL Database via Docker..."
cd backend
docker compose down
echo "Database stopped successfully!"

# 4. Clean up Puppeteer / WhatsApp Web lock files
echo "[4/4] Cleaning up WhatsApp Web browser lock files..."
rm -f .wwebjs_auth/session/SingletonLock
pkill -f "Chromium" || true

echo "========================================="
echo "✅ Sipper has been completely stopped."
