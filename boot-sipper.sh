#!/bin/bash

# Exit on error for initial setup
set -e

echo "☕ Starting Sipper Application..."
echo "========================================="

# Change to the directory where the script is located
cd "$(dirname "$0")"

# 1. Start the Database
echo "[1/3] Starting PostgreSQL Database via Docker..."
cd backend
docker compose up -d
echo "Database started successfully!"

# 2. Start the Backend API in the background
echo "[2/3] Starting Backend API on port 3001..."
npm run dev &
BACKEND_PID=$!

# 3. Start the Frontend Application in the background
echo "[3/3] Starting Frontend on port 5173..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "========================================="
echo "✅ Sipper is running!"
echo "🌐 Frontend URL: http://localhost:5173"
echo "⚙️  Backend URL:  http://localhost:3001"
echo ""
echo "🛑 Press Ctrl+C to stop all services."
echo "========================================="

# Trap Ctrl+C (SIGINT) to kill the background processes gracefully
trap "echo -e '\nStopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" SIGINT SIGTERM

# Wait indefinitely for the background processes
wait $BACKEND_PID $FRONTEND_PID
