@echo off
setlocal
cd /d "%~dp0\..\..\.."

node scripts\start.mjs --experience sealed-rps
if errorlevel 1 (
  echo.
  echo 启动失败，请查看上方提示。
  pause
  exit /b 1
)
