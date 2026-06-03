@echo off
title Aleyart Academy - School Management System
color 0A

echo ============================================
echo   ALEYART ACADEMY - School Management
echo   "Seeking Wisdom"
echo ============================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed!
  echo Please download from: https://nodejs.org
  pause
  exit /b 1
)

echo [OK] Node.js found: 
node --version

:: Install dependencies
echo.
echo [1/2] Installing backend dependencies...
cd backend
npm install
if %errorlevel% neq 0 (
  echo [ERROR] npm install failed!
  pause
  exit /b 1
)

echo.
echo [2/2] Starting Aleyart Academy Server...
echo.
echo ============================================
echo   Server: http://localhost:4000
echo   Frontend: Open frontend/index.html
echo   Login: admin / admin123
echo ============================================
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js
pause
