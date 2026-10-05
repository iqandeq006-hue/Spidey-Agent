@echo off
setlocal
title SpideyAgent /protect Redactor
color 0A

python "%~dp0scripts\protect.py" %*

echo.
pause
