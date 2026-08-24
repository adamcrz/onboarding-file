@echo off
REM ============================================================
REM  Onboarding Tool - INSTALL
REM
REM  Run this once on a new PC. It installs everything the tool
REM  needs, including Node.js and Git if they are missing, then
REM  gets the app ready to use.
REM
REM  Safe to run again at any time: it repairs whatever is
REM  missing and leaves everything else alone.
REM
REM  The app is installed to C:\OnboardingTool, NOT into this
REM  SharePoint folder. That is deliberate: the support files run
REM  to 167 MB across 7,000+ files, and their folder names are
REM  long enough to break the Windows 260-character path limit
REM  from inside OneDrive. Installing locally keeps it fast and
REM  stops all of that syncing to everybody.
REM
REM  Your documents still live in this SharePoint folder, under
REM  "Documents" - that is the part that is shared and backed up.
REM ============================================================
setlocal EnableDelayedExpansion

set "SHAREPOINT=%~dp0"
set "TARGET=C:\OnboardingTool"
set "REPO=https://github.com/adamcrz/onboarding-file.git"
set "APPDIR=%TARGET%\onboarding-app\backend"

echo.
echo   Onboarding Tool - Install
echo   =========================
echo.

REM --- 1. Node.js -----------------------------------------------
call :ensure_node
if errorlevel 1 goto :failed

REM --- 2. Git (optional) ----------------------------------------
call :ensure_git

REM --- 3. The app -----------------------------------------------
call :get_code
if errorlevel 1 goto :failed

REM --- 4. Settings ----------------------------------------------
call :ensure_settings
if errorlevel 1 goto :failed

REM --- 5. Packages ----------------------------------------------
call :ensure_packages
if errorlevel 1 goto :failed

echo.
echo   ============================================
echo     Done. You can close this window.
echo.
echo     From now on, just double-click:
echo     "2 - START Onboarding Tool.bat"
echo   ============================================
echo.
pause
exit /b 0

:failed
echo.
echo   Install did not finish. Nothing was broken - you can run
echo   this file again once the problem above is sorted out.
echo.
pause
exit /b 1


REM ============================================================
REM  Node.js - installed automatically if missing
REM ============================================================
:ensure_node
where node >nul 2>nul
if not errorlevel 1 (
  for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODEVER=%%v"
  echo   [OK] Node.js !NODEVER!
  exit /b 0
)

echo   [..] Node.js is missing - installing it for you...
where winget >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js is not installed, and this PC cannot install it
  echo       automatically.
  echo.
  echo       1. Go to  https://nodejs.org
  echo       2. Download the button that says "LTS"
  echo       3. Install it, accepting all the defaults
  echo       4. Run this file again
  exit /b 1
)

winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
REM winget puts node on the PATH for NEW windows, not this one, so pick up
REM the usual install location by hand rather than making anyone reboot.
set "PATH=%PATH%;%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [!] Node.js was installed, but this window cannot see it yet.
  echo       Close this window and run this file again - that is all
  echo       it needs.
  exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODEVER=%%v"
echo   [OK] Node.js !NODEVER! installed
exit /b 0


REM ============================================================
REM  Git - nice to have. Without it the app is copied from
REM  SharePoint instead, which works but updates more slowly.
REM ============================================================
:ensure_git
where git >nul 2>nul
if not errorlevel 1 (
  echo   [OK] Git
  exit /b 0
)
where winget >nul 2>nul
if errorlevel 1 (
  echo   [--] Git not available - the app will be copied from SharePoint
  exit /b 0
)
echo   [..] Installing Git ^(lets the tool update itself^)...
winget install --id Git.Git --silent --accept-package-agreements --accept-source-agreements >nul 2>nul
set "PATH=%PATH%;%ProgramFiles%\Git\cmd;%LOCALAPPDATA%\Programs\Git\cmd"
where git >nul 2>nul
if errorlevel 1 (
  echo   [--] Git not available yet - copying from SharePoint instead
) else (
  echo   [OK] Git installed
)
exit /b 0


REM ============================================================
REM  The application code
REM ============================================================
:get_code
if exist "%TARGET%\.git" (
  echo   [..] Updating the app...
  git -C "%TARGET%" pull --ff-only >nul 2>nul
  if errorlevel 1 (
    echo   [--] Could not update - keeping the version already installed
  ) else (
    echo   [OK] Up to date
  )
  exit /b 0
)

where git >nul 2>nul
if not errorlevel 1 (
  echo   [..] Downloading the app...
  git clone --quiet "%REPO%" "%TARGET%" 2>nul
)

if not exist "%APPDIR%\package.json" (
  echo   [..] Copying the app from SharePoint...
  robocopy "%SHAREPOINT%Repository\onboarding-file" "%TARGET%" /E /NFL /NDL /NJH /NJS /NP >nul
)

if not exist "%APPDIR%\package.json" (
  echo   [X] Could not get the app. Check your internet connection,
  echo       or ask Adam whether the SharePoint folder has synced.
  exit /b 1
)
echo   [OK] App files ready
exit /b 0


REM ============================================================
REM  Settings file
REM ============================================================
:ensure_settings
if exist "%APPDIR%\.env" (
  findstr /c:"=PASTE_HERE" "%APPDIR%\.env" >nul 2>nul
  if not errorlevel 1 (
    echo   [X] The settings on this PC are not filled in.
    echo.
    echo       Ask Adam to complete settings-template.txt in the
    echo       SharePoint folder, then delete this file and run
    echo       this installer again:
    echo       %APPDIR%\.env
    exit /b 1
  )
  echo   [OK] Settings already in place
  exit /b 0
)

if not exist "%SHAREPOINT%settings-template.txt" (
  echo   [X] settings-template.txt is missing from the SharePoint folder.
  echo       Ask Adam to put it back, then run this again.
  exit /b 1
)

findstr /c:"=PASTE_HERE" "%SHAREPOINT%settings-template.txt" >nul 2>nul
if not errorlevel 1 (
  echo   [X] settings-template.txt has not been filled in yet.
  echo.
  echo       Ask Adam to replace the two PASTE_HERE lines in it,
  echo       then run this installer again.
  exit /b 1
)

echo   [..] Setting up your configuration...
copy /y "%SHAREPOINT%settings-template.txt" "%APPDIR%\.env" >nul
REM The archive path contains this user's own Windows name, so it is
REM written per machine rather than shared.
echo.>>"%APPDIR%\.env"
echo ARCHIVE_DIR=%SHAREPOINT%Documents>>"%APPDIR%\.env"
echo   [OK] Configured
exit /b 0


REM ============================================================
REM  Packages - installs whatever is missing, then checks that
REM  every one of them actually loads.
REM ============================================================
:ensure_packages
pushd "%APPDIR%"

call :packages_ok
if not errorlevel 1 (
  echo   [OK] All packages present
  popd
  exit /b 0
)

echo   [..] Installing the packages the tool needs.
echo        First time takes a few minutes.
echo.
call npm install --omit=dev
echo.

call :packages_ok
if not errorlevel 1 (
  echo   [OK] Packages installed
  popd
  exit /b 0
)

REM Still short of something: a half-finished install from an earlier
REM attempt is the usual cause, and it is fixed by starting clean.
echo   [!] Something is still missing - repairing...
echo.
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del /q "package-lock.json"
call npm install --omit=dev
echo.

call :packages_ok
if errorlevel 1 (
  popd
  echo   [X] Packages could not be installed. This is almost always a
  echo       blocked internet connection - a company firewall or proxy
  echo       stopping npmjs.org. Show this window to IT.
  exit /b 1
)
echo   [OK] Packages repaired
popd
exit /b 0


REM Asks Node to resolve every package the app declares. Catches a
REM partly-finished install, which a folder-exists check does not.
:packages_ok
if not exist "node_modules" exit /b 1
node -e "const p=require('./package.json');Object.keys(p.dependencies||{}).forEach(d=>require.resolve(d))" >nul 2>nul
exit /b %errorlevel%
