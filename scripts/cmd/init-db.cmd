@echo off
cd /d %~dp0\..\..
echo Initializing Trading Pro Max database...
call npm run db:generate
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run db:push
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run db:seed
if %errorlevel% neq 0 exit /b %errorlevel%
echo Database ready.
