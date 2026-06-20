@echo off
title Question Generator Platform Launcher
echo ===================================================
echo   Question Generator Platform - Single Localhost
echo ===================================================
echo.
echo   Website URL:  http://localhost:3000
echo.
echo ===================================================
echo.

echo [1/2] Checking and updating database schema...
call npm run db:generate
call npm run db:migrate

echo.
echo [2/2] Starting application servers...
start "QGP API (Internal - Port 5000)" cmd /k "npx nx serve api"
start "QGP Frontend (Port 3000)" cmd /k "npx nx serve web-admin"

echo.
echo ===================================================
echo   Platform is starting up!
echo.
echo   Open your browser at:   http://localhost:3000
echo.
echo   Login credentials:
echo     Teacher:   teacher@questiongenerator.com  / Teacher@123
echo     HOD:       hod@questiongenerator.com      / HodHod@123
echo     Principal: principal@questiongenerator.com / Principal@123
echo.
echo   All roles (Teacher, HOD, Principal, Student) are
echo   accessible from http://localhost:3000
echo.
echo   NOTE: Wait ~15 seconds for both services to compile and be ready.
echo ===================================================
echo.
pause
