@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "ELECTRON_EXE=%ROOT_DIR%node_modules\electron\dist\electron.exe"
set "BRUNO_DEV_PORT=3020"

cd /d "%ROOT_DIR%"

if not exist "%ELECTRON_EXE%" (
  echo Electron runtime is missing.
  echo Run ".\repair-bruno-electron.cmd" first, then start again.
  echo.
  pause
  exit /b 1
)

echo Building Electron workspace dependencies...
call npm.cmd run sandbox:bundle-libraries --workspace=packages/bruno-js
if errorlevel 1 goto :build_failed

call npm.cmd run build --workspace=packages/bruno-schema-types
if errorlevel 1 goto :build_failed

call npm.cmd run build --workspace=packages/bruno-common
if errorlevel 1 goto :build_failed

call npm.cmd run build --workspace=packages/bruno-query
if errorlevel 1 goto :build_failed

call npm.cmd run build --workspace=packages/bruno-converters
if errorlevel 1 goto :build_failed

call npm.cmd run build --workspace=packages/bruno-filestore
if errorlevel 1 goto :build_failed

call npm.cmd run build --workspace=packages/bruno-requests
if errorlevel 1 goto :build_failed

if not exist "%ROOT_DIR%node_modules\@usebruno\schema-types\dist\index.js" goto :artifact_missing
if not exist "%ROOT_DIR%node_modules\@usebruno\common\dist\cjs\index.js" goto :artifact_missing
if not exist "%ROOT_DIR%node_modules\@usebruno\query\dist\cjs\index.js" goto :artifact_missing
if not exist "%ROOT_DIR%node_modules\@usebruno\converters\dist\cjs\index.js" goto :artifact_missing
if not exist "%ROOT_DIR%node_modules\@usebruno\filestore\dist\cjs\index.js" goto :artifact_missing
if not exist "%ROOT_DIR%node_modules\@usebruno\requests\dist\cjs\index.js" goto :artifact_missing
if not exist "%ROOT_DIR%packages\bruno-js\src\sandbox\bundle-browser-rollup.js" goto :artifact_missing

echo Starting Bruno web renderer on port %BRUNO_DEV_PORT%...
start "Bruno Web" cmd /k "cd /d %ROOT_DIR% && npm.cmd run dev --workspace=packages/bruno-app -- --port %BRUNO_DEV_PORT% --host 127.0.0.1"

echo Waiting for renderer to become ready...
powershell -NoProfile -Command ^
  "$deadline=(Get-Date).AddMinutes(2);" ^
  "do {" ^
  "  try {" ^
  "    $res=Invoke-WebRequest -Uri 'http://127.0.0.1:%BRUNO_DEV_PORT%/' -UseBasicParsing -TimeoutSec 3;" ^
  "    if ($res.StatusCode -eq 200) { exit 0 }" ^
  "  } catch {}" ^
  "  Start-Sleep -Seconds 2;" ^
  "} while ((Get-Date) -lt $deadline);" ^
  "exit 1"

if errorlevel 1 (
  echo.
  echo Renderer did not become ready on http://127.0.0.1:%BRUNO_DEV_PORT%/
  echo Keep the "Bruno Web" window open and check it for errors.
  pause
  exit /b 1
)

echo Renderer is ready. Starting Bruno Electron...
start "Bruno Electron" cmd /k "cd /d %ROOT_DIR% && set BRUNO_DEV_PORT=%BRUNO_DEV_PORT% && npm.cmd run dev --workspace=packages/bruno-electron"

echo.
echo Bruno Electron startup dispatched.
echo If a browser opens, ignore it. The real app is the Electron desktop window.
exit /b 0

:build_failed
echo.
echo Failed to build one or more Electron workspace dependencies.
pause
exit /b 1

:artifact_missing
echo.
echo One or more required Electron dependency artifacts are still missing after build.
echo Check the build output above for the package that failed to emit dist files.
pause
exit /b 1
