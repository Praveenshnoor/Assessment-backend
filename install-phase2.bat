@echo off
echo ========================================
echo Phase 2 Optimizations Setup
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

echo [2/4] Creating logs directory...
if not exist "logs" mkdir logs
echo ✅ Logs directory created
echo.

echo [3/4] Installing PM2 globally...
call npm install -g pm2
if %errorlevel% neq 0 (
    echo WARNING: Failed to install PM2 globally
    echo You may need to run this as Administrator
    echo Or install manually: npm install -g pm2
)
echo ✅ PM2 installation attempted
echo.

echo [4/4] Verifying setup...
if exist "ecosystem.config.js" (
    echo ✅ PM2 config found
) else (
    echo ❌ PM2 config missing
)

if exist "config\logger.js" (
    echo ✅ Logger config found
) else (
    echo ❌ Logger config missing
)

if exist "routes\health.js" (
    echo ✅ Health routes found
) else (
    echo ❌ Health routes missing
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start with PM2: npm run pm2:start
echo 2. View logs: npm run pm2:logs
echo 3. Monitor: npm run pm2:monit
echo 4. Check health: curl http://localhost:5000/health
echo.
echo For more info, see PHASE2_SETUP.md
echo.
pause
