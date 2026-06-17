@echo off
REM Build Print Agent zip on Windows (requires .NET 8 SDK + PowerShell).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-release.ps1"
if errorlevel 1 exit /b 1
