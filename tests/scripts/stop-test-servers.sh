#!/bin/bash

echo "🧹 Stopping test servers..."

# Kill backend
if [ -f /tmp/test-backend.pid ]; then
  BACKEND_PID=$(cat /tmp/test-backend.pid)
  kill $BACKEND_PID 2>/dev/null && echo "✅ Backend stopped (PID: $BACKEND_PID)" || echo "⚠️  Backend already stopped"
  rm /tmp/test-backend.pid
fi

# Kill frontend
if [ -f /tmp/test-frontend.pid ]; then
  FRONTEND_PID=$(cat /tmp/test-frontend.pid)
  kill $FRONTEND_PID 2>/dev/null && echo "✅ Frontend stopped (PID: $FRONTEND_PID)" || echo "⚠️  Frontend already stopped"
  rm /tmp/test-frontend.pid
fi

# Cleanup any remaining test processes
pkill -f "E2E_TEST_MODE=true" 2>/dev/null || true
pkill -f "vite.*5173" 2>/dev/null || true

echo "✅ Cleanup complete"
