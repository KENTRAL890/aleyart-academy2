#!/bin/bash

echo "============================================"
echo "  ALEYART ACADEMY - School Management"
echo "  'Seeking Wisdom'"
echo "============================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "[ERROR] Node.js is not installed!"
  echo "Please download from: https://nodejs.org"
  exit 1
fi

echo "[OK] Node.js: $(node --version)"

# Install dependencies
echo ""
echo "[1/2] Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
  echo "[ERROR] npm install failed!"
  exit 1
fi

echo ""
echo "[2/2] Starting Aleyart Academy Server..."
echo ""
echo "============================================"
echo "  Server running at: http://localhost:4000"
echo "  Open frontend/index.html in your browser"
echo "  Login: admin / admin123"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

node server.js
