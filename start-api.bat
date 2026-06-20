@echo off
title QGP - API Backend Launcher
echo ===================================================
echo   Starting QGP API Backend on Port 5000
echo ===================================================
echo.

echo [1/2] Building NestJS API backend...
call npx nx build api
if %errorlevel% neq 0 (
  echo.
  echo ERROR: Build failed. Please check for TypeScript errors above.
  pause
  exit /b 1
)

echo.
echo [2/2] Starting API server...
echo.
echo   API Backend:    http://localhost:5000/api
echo   Swagger Docs:   http://localhost:5000/api/docs
echo.
echo Login credentials:
echo   Teacher:   teacher@questiongenerator.com  /  Teacher@123
echo   HOD:       hod@questiongenerator.com      /  HodHod@123
echo   Principal: principal@questiongenerator.com /  Principal@123
echo.
echo ===================================================
node dist\apps\api\main.js
