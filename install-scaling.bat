@echo off
echo.
echo 🚀 Installing Scaling Dependencies for 300+ Students...
echo.

REM Install Node.js dependencies
echo 📦 Installing npm packages...
call npm install redis express-rate-limit

echo.
echo ✅ Dependencies installed!
echo.

REM Check if Redis is installed
echo 🔍 Checking Redis installation...
where redis-cli >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Redis is installed
    
    REM Check if Redis is running
    redis-cli ping >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Redis is running
    ) else (
        echo ⚠️  Redis is installed but not running
        echo    Start Redis with: redis-server
    )
) else (
    echo ❌ Redis is NOT installed
    echo.
    echo Please install Redis:
    echo   - Download from: https://github.com/microsoftarchive/redis/releases
    echo   - Or use WSL2: sudo apt-get install redis-server
)

echo.
echo 📝 Next steps:
echo 1. Update your .env file with new variables (see .env.example)
echo 2. Run database indexes: node migrations\run-performance-indexes.js
echo 3. Restart your server: npm start
echo.
echo 📖 For detailed instructions, see: ..\SCALING_SETUP.md
echo.
pause
