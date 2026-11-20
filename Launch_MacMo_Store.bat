@echo off
title MacMo Electronics - Storefront & Tech Studio Manager
echo ============================================================
echo   MACMO ELECTRONICS - LUSAKA TECH STORE & STUDIO MANAGER
echo   Shop #1, Silverest Complex (Opposite UNILUS)
echo ============================================================
echo.
echo Starting local web server on port 8089...
echo.

start "" "http://localhost:8089/"
start "" "http://localhost:8089/admin/"

python -m http.server 8089
pause
