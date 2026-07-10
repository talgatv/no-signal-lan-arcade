@echo off
setlocal
cd /d "%~dp0"

set "PY="
if exist "runtimes\win64\python.exe" set "PY=runtimes\win64\python.exe"
if not defined PY if exist "runtimes\win64\python3.exe" set "PY=runtimes\win64\python3.exe"

if not defined PY (
  where python >nul 2>&1 && set "PY=python"
)
if not defined PY (
  where py >nul 2>&1 && set "PY=py -3"
)

if not defined PY (
  echo Python 3 not found.
  echo Offline pack should include:  pc\runtimes\win64\python.exe
  echo If you have internet once:  runtimes\download_windows.ps1
  echo See OFFLINE.md
  pause
  exit /b 1
)

echo Using: %PY%  (offline host)
%PY% host.py %*
if errorlevel 1 pause
