@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo  SPIDEYAGENT -- 1-CLICK DEMO LAUNCHER (ISRO SIH26171)
echo  Privacy-Preserving On-Device Autonomous Browser Agent
echo  Team Silence like Lasagna
echo =====================================================================
echo.

:: 1. Check Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH!
    pause
    exit /b 1
)

:: 2. Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    pause
    exit /b 1
)

:: 3. Verify On-Device Neural Models
echo [1/3] Verifying On-Device Neural Vision Models...
node scripts/download_models.mjs
echo.

:: 4. Build Extension
echo [2/3] Building Chrome MV3 Extension (TypeScript + Vite)...
cd extension
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Extension build failed!
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Extension built successfully into extension/dist/

:: 5. Launch Background Services
echo.
echo [3/3] Starting SpideyAgent Central Reasoning Server & Laya (Port 8000)...
start "SpideyAgent Central Brain (Port 8000)" cmd /c "python server/app.py"

:: 6. Launch Instructions
echo.
echo =====================================================================
echo  SPIDEYAGENT READY:
echo   - Central Reasoning Brain: http://localhost:8000
echo   - Chrome Extension Folder: %CD%\extension\dist
echo.
echo  INSTRUCTIONS FOR CHROME:
echo   1. Open Chrome and go to: chrome://extensions
echo   2. Toggle "Developer mode" ON (top-right switch)
echo   3. Click "Load unpacked" and select:
echo      %CD%\extension\dist
echo   4. Visit any live test portal:
echo      - SIH Portal:    https://www.sih.gov.in
echo      - Complex Forms: https://demoqa.com/automation-practice-form
echo      - HTML Tables:   https://www.w3schools.com/html/html_tables.asp
echo   5. Press Alt+S or Ctrl+Shift+K on the page to open SpideyAgent!
echo =====================================================================
echo.

pause
