@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo  SPIDEYAGENT -- 1-CLICK DEMO LAUNCHER (ISRO SIH26171)
echo  Privacy-Preserving On-Device Autonomous Browser Agent
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
echo [1/5] Verifying On-Device Neural Vision Models...
node scripts/download_models.mjs
echo.

:: 4. Build Extension
echo [2/5] Building Chrome MV3 Extension (TypeScript + Vite)...
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

:: 4. Run Automated Test Suite
echo.
echo [2/4] Running 18 Automated Security & Pipeline Tests...
cd extension
call npm run test
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Some tests failed. Proceeding with demo launch...
)
cd ..

:: 5. Launch Background Services
echo.
echo [3/4] Starting Local Synthetic ISRO Testbed (Port 3000)...
start "SpideyAgent Testbed (Port 3000)" cmd /c "python -m http.server 3000 --directory testbed"

echo [4/4] Starting SpideyAgent Central Reasoning Server & Laya (Port 8000)...
start "SpideyAgent Central Brain (Port 8000)" cmd /c "python server/app.py"

:: 6. Launch Browser
echo.
echo =====================================================================
echo  ALL SERVICES ONLINE:
echo   - Testbed Environment:     http://localhost:3000
echo   - Central Reasoning Brain: http://localhost:8000
echo   - Chrome Extension Folder: %CD%\extension\dist
echo.
echo  INSTRUCTIONS FOR CHROME:
echo   1. Open Chrome and go to: chrome://extensions
echo   2. Toggle "Developer mode" ON (top right)
echo   3. Click "Load unpacked" and select:
echo      %CD%\extension\dist
echo   4. Visit http://localhost:3000
echo   5. Press Ctrl+Shift+K on the page to open the SpideyAgent Spotlight HUD!
echo =====================================================================
echo.

:: Open default browser to testbed
start http://localhost:3000

pause
