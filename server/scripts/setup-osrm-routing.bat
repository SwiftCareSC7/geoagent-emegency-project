@echo off
REM Setup script to configure OSRM as the default routing provider (Windows)
REM This script creates a .env file from .env.example with OSRM configuration

setlocal enabledelayedexpansion

cd /d "%~dp0..\"

echo 🚀 Setting up OSRM routing provider...

REM Check if .env already exists
if exist .env (
    echo ⚠️  .env file already exists
    echo 📝 Current ROUTING_PROVIDER setting:
    findstr /B "ROUTING_PROVIDER=" .env 2>nul || echo    (not set)
    echo.
    set /p "CONFIRM=Do you want to update it to use OSRM? (y/N): "
    if /i not "!CONFIRM!"=="y" (
        echo ❌ Aborted. No changes made.
        exit /b 0
    )
    REM Backup existing .env
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
    set "BACKUP=.env.backup.!datetime:~0,8!_!datetime:~8,6!"
    copy .env !BACKUP! >nul
    echo 💾 Backed up existing .env file
)

REM Copy .env.example to .env
copy .env.example .env >nul

REM Verify OSRM is set
findstr /B "ROUTING_PROVIDER=osrm" .env >nul
if %errorlevel% equ 0 (
    echo ✅ ROUTING_PROVIDER set to osrm
) else (
    echo ❌ Failed to set ROUTING_PROVIDER to osrm
    exit /b 1
)

echo.
echo ✨ Setup complete!
echo.
echo 📋 Next steps:
echo    1. Update MONGO_URI in .env with your MongoDB connection string
echo    2. Update JWT_SECRET with a secure random string
echo    3. ^(Optional^) Add GOOGLE_MAPS_API_KEY for traffic-aware routing
echo    4. Start the backend server: npm run dev
echo.
echo 🌍 OSRM will use the public API: https://router.project-osrm.org/route/v1/driving
echo    For production, consider running your own OSRM instance.

endlocal
