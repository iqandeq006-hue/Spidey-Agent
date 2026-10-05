@echo off
setlocal
title SpideyAgent -- Live MCP Protocol Demonstration
color 0B

echo =====================================================================
echo  SPIDEYAGENT -- MODEL CONTEXT PROTOCOL (MCP) LIVE DEMONSTRATOR
echo  Simulates Claude Desktop / Cursor connecting to SpideyAgent
echo =====================================================================
echo.

python "%~dp0scripts\demo_mcp.py"

echo.
pause
