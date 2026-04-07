@echo off
cd /d %~dp0\..\..
start cmd /k npm run dev:api
start cmd /k npm run dev:web
start cmd /k npm run dev:desktop
echo API + Web + Desktop started in separate windows.
