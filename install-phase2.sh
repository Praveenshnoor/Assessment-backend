#!/bin/bash

echo "========================================"
echo "Phase 2 Optimizations Setup"
echo "========================================"
echo ""

echo "[1/4] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

echo "[2/4] Creating logs directory..."
mkdir -p logs
echo "✅ Logs directory created"
echo ""

echo "[3/4] Installing PM2 globally..."
npm install -g pm2
if [ $? -ne 0 ]; then
    echo "⚠️  WARNING: Failed to install PM2 globally"
    echo "You may need to run with sudo: sudo npm install -g pm2"
    echo "Or install manually: npm install -g pm2"
fi
echo "✅ PM2 installation attempted"
echo ""

echo "[4/4] Verifying setup..."
if [ -f "ecosystem.config.js" ]; then
    echo "✅ PM2 config found"
else
    echo "❌ PM2 config missing"
fi

if [ -f "config/logger.js" ]; then
    echo "✅ Logger config found"
else
    echo "❌ Logger config missing"
fi

if [ -f "routes/health.js" ]; then
    echo "✅ Health routes found"
else
    echo "❌ Health routes missing"
fi

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Start with PM2: npm run pm2:start"
echo "2. View logs: npm run pm2:logs"
echo "3. Monitor: npm run pm2:monit"
echo "4. Check health: curl http://localhost:5000/health"
echo ""
echo "For more info, see PHASE2_SETUP.md"
echo ""
