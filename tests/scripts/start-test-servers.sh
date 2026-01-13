#!/bin/bash

# Exit on error
set -e

# Get the absolute path to the repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Starting test servers..."
echo "   Repository root: $REPO_ROOT"

# Kill any existing test servers
pkill -f "E2E_TEST_MODE=true" 2>/dev/null || true
pkill -f "vite.*5173" 2>/dev/null || true
sleep 2

# Start backend with E2E_TEST_MODE
echo "📦 Starting backend (E2E mode)..."
cd "$REPO_ROOT/apps/api"
E2E_TEST_MODE=true \
  REDIS_URL=redis://localhost:6379 \
  PORT=3000 \
  FRONTEND_URL=http://localhost:5173 \
  GITHUB_CLIENT_ID=test-client-id \
  GITHUB_CLIENT_SECRET=test-client-secret \
  GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback \
  SESSION_SECRET=test-session-secret-for-e2e-testing-only \
  TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef \
  nohup npm start > /tmp/test-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/test-backend.pid
echo "✅ Backend started (PID: $BACKEND_PID)"

# Start frontend
echo "🎨 Starting frontend..."
cd "$REPO_ROOT/apps/frontend"
nohup npm run dev > /tmp/test-frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/test-frontend.pid
echo "✅ Frontend started (PID: $FRONTEND_PID)"

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1 && \
     curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ All services ready!"
    exit 0
  fi
  echo "   Attempt $i/30..."
  sleep 2
done

echo "❌ Services failed to start in time"
cat /tmp/test-backend.log
cat /tmp/test-frontend.log
exit 1
