@echo off
setlocal
cd /d "%~dp0"

node scripts\setup.mjs
if errorlevel 1 (
  echo.
  echo 安装未完成，请查看上方提示。
  pause
  exit /b 1
)

echo.
echo 安装完成，可以双击 start.bat 打开 Two of Us。
pause
