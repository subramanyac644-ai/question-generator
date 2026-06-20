@echo off
title QGP - Frontend (Port 3000)
echo ===================================================
echo   Starting QGP Frontend on Port 3000
echo ===================================================
echo.
echo   Website:    http://localhost:3000
echo   Login:      http://localhost:3000/login
echo.
echo   All roles (Teacher, HOD, Principal, Student)
echo   are served from this single URL.
echo.
echo   NOTE: Make sure the API backend is ALSO running
echo         in a separate terminal (run start-api.bat)
echo ===================================================
echo.
npx nx serve web-admin
