@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-detall-ticket.ps1"
if errorlevel 1 pause
