@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo  SPIDEYAGENT -- AUTOMATED VERIFICATION SUITE
echo  Runs all 18 Unit, Pipeline, Privacy, and End-to-End Tests
echo =====================================================================
echo.

cd extension
call npm run test
set TEST_STATUS=%ERRORLEVEL%
cd ..

if %TEST_STATUS% EQU 0 (
    echo.
    echo =====================================================================
    echo  [ALL 18 TESTS PASSED SUCCESSFULLY]
    echo  Perception, Checksums, Vault, System 1, HUD, and MCP are 100%% verified!
    echo =====================================================================
) else (
    echo.
    echo [ERROR] Test suite exited with errors.
)

pause
