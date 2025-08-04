#!/bin/bash

# Streamlined server restart script
# Handles common issues: TypeScript errors, port conflicts, environment loading

echo "🔄 Restarting Event Distribution Backend Server..."

# Step 1: Kill any existing processes on port 3001
echo "📍 Killing existing processes on port 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "No existing processes found"

# Step 2: Navigate to backend directory
cd "$(dirname "$0")"

# Step 3: Check for TypeScript errors first (faster feedback)
echo "🔍 Checking TypeScript compilation..."
if ! npx tsc --noEmit --skipLibCheck; then
    echo "❌ TypeScript compilation failed. Please fix errors first."
    exit 1
fi

# Step 4: Check environment file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "📝 Please update .env with your credentials"
    else
        echo "❌ No .env.example found"
        exit 1
    fi
fi

# Step 5: Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Step 6: Start server
echo "🚀 Starting development server..."
npm run dev &
SERVER_PID=$!

# Step 7: Wait for server to be ready
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health >/dev/null 2>&1; then
        echo "✅ Server is ready! (PID: $SERVER_PID)"
        echo "🌐 Available at: http://localhost:3001"
        exit 0
    fi
    sleep 1
    echo -n "."
done

echo "❌ Server failed to start within 30 seconds"
kill $SERVER_PID 2>/dev/null
exit 1