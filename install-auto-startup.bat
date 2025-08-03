@echo off
title Install GymFitness Auto Startup
echo ========================================
echo  🏋️ Installing GymFitness Auto Startup
echo ========================================
echo.

REM Get current directory
set "CURRENT_DIR=%~dp0"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_NAME=GymFitness Auto Start.lnk"

echo 📁 Current directory: %CURRENT_DIR%
echo 📂 Startup folder: %STARTUP_FOLDER%
echo.

REM Create VBS script to create shortcut
echo Creating startup shortcut...
(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = "%STARTUP_FOLDER%\%SHORTCUT_NAME%"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "%CURRENT_DIR%auto-start-gym.bat"
echo oLink.WorkingDirectory = "%CURRENT_DIR%"
echo oLink.Description = "GymFitness Auto Startup"
echo oLink.Save
) > "%TEMP%\create_shortcut.vbs"

REM Execute VBS script
cscript //nologo "%TEMP%\create_shortcut.vbs"

REM Clean up
del "%TEMP%\create_shortcut.vbs"

echo.
echo ✅ Auto startup installed successfully!
echo.
echo 🔄 GymFitness will now start automatically when you turn on your laptop.
echo.
echo To disable auto startup:
echo 1. Press Win+R, type "shell:startup", press Enter
echo 2. Delete "GymFitness Auto Start.lnk"
echo.
echo Press any key to exit...
pause > nul