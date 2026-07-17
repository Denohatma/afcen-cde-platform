#!/bin/bash
cd "$(dirname "$0")"

# Kill existing processes
lsof -ti:8001 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo "Starting AfCEN CDE Platform..."

# Start backend
echo "  Backend → http://localhost:8001"
cd backend/..
python3 run.py &
BACKEND_PID=$!

# Wait for backend
sleep 2

# Start frontend
echo "  Frontend → http://localhost:3001"
cd frontend
unset NODE_OPTIONS
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
