@echo off
echo Starting RWA Admin Portal...
cd admin
if %errorlevel% neq 0 (
    echo Error: Could not find 'admin' directory.
    pause
    exit /b
)

echo Installing dependencies (just in case)...
call npm install
if %errorlevel% neq 0 (
    echo Error: npm install failed.
    pause
    exit /b
)

echo Starting Development Server...
call npm run dev
pause
