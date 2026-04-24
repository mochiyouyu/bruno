@echo off
setlocal

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

set "HTTP_PROXY=http://127.0.0.1:7890"
set "HTTPS_PROXY=http://127.0.0.1:7890"
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
set "ELECTRON_CACHE=%ROOT_DIR%.electron-cache"

echo Repairing Electron installation...
echo Using ELECTRON_MIRROR=%ELECTRON_MIRROR%
echo.

node "%ROOT_DIR%node_modules\electron\install.js"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Electron repair failed with code %EXIT_CODE%.
  echo If this keeps failing, check your proxy settings or run this script as Administrator.
  pause
)

exit /b %EXIT_CODE%
