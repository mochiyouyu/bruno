@echo off
setlocal

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo Starting Bruno web renderer dev server on http://localhost:3003/
echo This is only the renderer shell. To run Bruno properly, start Electron.
echo Press Ctrl+C to stop.
echo.

call npm.cmd run dev --workspace=packages/bruno-app -- --port 3003 --host 0.0.0.0
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Dev server exited with code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%


