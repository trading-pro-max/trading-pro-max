@echo off
cd /d %~dp0\..\..
echo Installing Trading Pro Max unified bundle...
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%
call scripts\cmd\init-db.cmd
if %errorlevel% neq 0 exit /b %errorlevel%
echo Installation complete.
