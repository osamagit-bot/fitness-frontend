@echo off
title Uninstall GymFitness Auto Startup
echo ========================================
echo  🏋️ Uninstalling GymFitness Auto Startup
echo ========================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_NAME=GymFitness Auto Start.lnk"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\%SHORTCUT_NAME%"

echo Removing auto startup shortcut...
echo.

if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%"
    echo ✅ Auto startup removed successfully!
    echo.
    echo GymFitness will no longer start automatically when you turn on your laptop.
) else (
    echo ❌ Auto startup shortcut not found.
    echo It may have been already removed or never installed.
)

echo.
echo Press any key to exit...
pause > nul