@echo off
REM ============================================================
REM  Onboarding App — double-click to start.
REM
REM  Starts the server on this PC and opens it in your browser.
REM  The data and the documents come from the shared database, so
REM  everyone sees the same clients, mandates and files.
REM
REM  Close this black window to stop the app.
REM ============================================================
setlocal

cd /d "%~dp0backend"

echo.
echo   Onboarding App
echo   ==============
echo.

REM --- Node installed? -----------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js is not installed on this PC.
  echo.
  echo       Install Node.js 20 from https://nodejs.org
  echo       ^(choose the "LTS" version^), then run this file again.
  echo.
  pause
  exit /b 1
)

REM --- Configured? ---------------------------------------------
if not exist ".env" (
  echo   [X] Missing configuration file: backend\.env
  echo.
  echo       Ask Adam for the .env file and put it in the
  echo       "backend" folder next to this one.
  echo.
  pause
  exit /b 1
)

REM --- Dependencies installed? ---------------------------------
if not exist "node_modules" (
  echo   First run on this PC - installing. This takes a few
  echo   minutes and only happens once.
  echo.
  call npm install --omit=dev
  if errorlevel 1 (
    echo.
    echo   [X] Install failed. Check your internet connection and
    echo       run this file again.
    echo.
    pause
    exit /b 1
  )
  echo.
)

REM --- Latest version? -----------------------------------------
REM Best effort: no network, no git, or local edits should never stop
REM the app starting. Whatever is already on disk still runs.
where git >nul 2>nul
if not errorlevel 1 (
  echo   Checking for updates...
  git -C "%~dp0.." pull --ff-only >nul 2>nul
  if errorlevel 1 (
    echo   ^(could not check - starting the version already on this PC^)
  ) else (
    echo   Up to date.
  )
  echo.
)

echo   Starting... your browser will open in a moment.
echo.
echo   Leave this window open while you work.
echo   Closing it stops the app.
echo.

REM Give the server a moment to bind before the browser asks for the page.
start "" /b cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:5000"

npm start

REM Only reached if the server stops or fails to start.
echo.
echo   The app has stopped.
echo.
pause
endlocal
