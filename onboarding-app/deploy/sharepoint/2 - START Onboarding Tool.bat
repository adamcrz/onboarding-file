@echo off
REM ============================================================
REM  Onboarding Tool - START
REM
REM  Double-click to open the tool. Your browser opens by itself.
REM
REM  Leave the black window open while you work; closing it shuts
REM  the tool down. Everyone runs their own copy, and you all see
REM  the same clients, mandates and documents because they come
REM  from the shared database.
REM
REM  If an update needs new packages, this installs them for you
REM  rather than sending you back to the installer.
REM ============================================================
setlocal EnableDelayedExpansion

set "SHAREPOINT=%~dp0"
set "TARGET=C:\OnboardingTool"
set "APPDIR=%TARGET%\onboarding-app\backend"

echo.
echo   Onboarding Tool
echo   ===============
echo.

REM --- Installed at all? ----------------------------------------
if not exist "%APPDIR%\package.json" (
  echo   [X] The tool is not installed on this PC yet.
  echo.
  echo       Double-click "1 - INSTALL ^(run once^).bat" first.
  echo.
  pause
  exit /b 1
)

REM --- Node still there? ----------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  set "PATH=%PATH%;%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs"
  where node >nul 2>nul
  if errorlevel 1 (
    echo   [X] Node.js is missing.
    echo.
    echo       Run "1 - INSTALL ^(run once^).bat" - it will install it.
    echo.
    pause
    exit /b 1
  )
)

REM --- Settings -------------------------------------------------
if not exist "%APPDIR%\.env" (
  echo   [X] Configuration is missing.
  echo.
  echo       Run "1 - INSTALL ^(run once^).bat".
  echo.
  pause
  exit /b 1
)
findstr /c:"=PASTE_HERE" "%APPDIR%\.env" >nul 2>nul
if not errorlevel 1 (
  echo   [X] The settings on this PC are not filled in.
  echo.
  echo       Ask Adam to complete settings-template.txt in the
  echo       SharePoint folder, then delete this file and run the
  echo       installer again:
  echo       %APPDIR%\.env
  echo.
  pause
  exit /b 1
)

REM --- Already running? -----------------------------------------
REM Two copies cannot share the port; without this the second one
REM dies with an error nobody outside IT can read.
netstat -ano | findstr /r /c:"LISTENING.*:5000 " >nul 2>nul
if not errorlevel 1 (
  echo   The tool is already running on this PC.
  echo   Opening it in your browser...
  start http://localhost:5000
  ping -n 4 127.0.0.1 >nul
  exit /b 0
)

REM --- Latest version -------------------------------------------
where git >nul 2>nul
if not errorlevel 1 (
  if exist "%TARGET%\.git" (
    echo   Checking for updates...
    git -C "%TARGET%" pull --ff-only >nul 2>nul
    if errorlevel 1 (
      echo   ^(no update - starting the version on this PC^)
    ) else (
      echo   Up to date.
    )
  )
)

REM --- Packages -------------------------------------------------
REM An update can add a package this PC does not have yet, so check
REM every one of them resolves and install if not. Cheap, and it
REM turns "it crashed after the update" into a short wait.
pushd "%APPDIR%"
call :packages_ok
if errorlevel 1 (
  echo.
  echo   New packages are needed. Installing - this takes a minute.
  echo.
  call npm install --omit=dev
  echo.
  call :packages_ok
  if errorlevel 1 (
    popd
    echo   [X] Packages could not be installed.
    echo.
    echo       Run "1 - INSTALL ^(run once^).bat" - it can repair this.
    echo       If that fails too, it is usually a company firewall
    echo       blocking npmjs.org.
    echo.
    pause
    exit /b 1
  )
  echo   Packages ready.
)
popd

REM --- Archive reachable? ---------------------------------------
if not exist "%SHAREPOINT%Documents" (
  echo.
  echo   [!] The Documents folder is not available right now.
  echo       The tool still works, but new files will not be
  echo       archived until OneDrive is back.
  echo.
)

echo.
echo   Starting... your browser will open in a moment.
echo.
echo   KEEP THIS WINDOW OPEN while you work.
echo.

start "" /b cmd /c "ping -n 6 127.0.0.1 >nul & start http://localhost:5000"

pushd "%APPDIR%"
call npm start
popd

echo.
echo   The tool has stopped.
echo.
pause
exit /b 0


REM Asks Node to resolve every package the app declares. Catches a
REM partly-finished install, which a folder-exists check does not.
:packages_ok
if not exist "node_modules" exit /b 1
node -e "const p=require('./package.json');Object.keys(p.dependencies||{}).forEach(d=>require.resolve(d))" >nul 2>nul
exit /b %errorlevel%
