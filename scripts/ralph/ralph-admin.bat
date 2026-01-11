@echo off
REM Ralph Wiggum - Windows batch wrapper with admin privileges
REM Usage: ralph-admin.bat [max_iterations]

echo Checking for administrator privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with administrator privileges
    bash -c "cd /c/Github/multi-user-markdown-editor/scripts/ralph && ./ralph.sh %1"
) else (
    echo This script requires administrator privileges to create symlinks on Windows.
    echo Please run as Administrator or use ralph-v2.sh which doesn't require admin.
    echo.
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)
