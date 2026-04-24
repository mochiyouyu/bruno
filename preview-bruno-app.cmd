@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "DIST_DIR=%ROOT_DIR%packages\bruno-app\dist"
set "PYTHON_CMD="

cd /d "%ROOT_DIR%"

where py >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=py"
) else (
  where python >nul 2>nul
  if not errorlevel 1 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
  echo Python was not found. Install Python or use another static file server.
  pause
  exit /b 1
)

echo Building Bruno app...
call npm.cmd run build --workspace=packages/bruno-app
if errorlevel 1 (
  echo.
  echo Build failed.
  pause
  exit /b 1
)

if not exist "%DIST_DIR%\index.html" (
  echo.
  echo Build output was not found in "%DIST_DIR%".
  pause
  exit /b 1
)

echo.
echo Starting static preview on http://localhost:4175/
echo Press Ctrl+C to stop.
echo.

cd /d "%DIST_DIR%"
call %PYTHON_CMD% -m http.server 4175 --bind 0.0.0.0
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Preview server exited with code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%
