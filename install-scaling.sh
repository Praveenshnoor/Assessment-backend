#!/bin/bash

echo "🚀 Installing Scaling Dependencies for 300+ Students..."
echo ""

# Install Node.js dependencies
echo "📦 Installing npm packages..."
npm install redis express-rate-limit

echo ""
echo "✅ Dependencies installed!"
echo ""

# Check if Redis is installed
echo "🔍 Checking Redis installation..."
if command -v redis-cli &> /dev/null
then
    echo "✅ Redis is installed"
    
    # Check if Redis is running
    if redis-cli ping &> /dev/null
    then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is installed but not running"
        echo "   Start Redis with: redis-server"
    fi
else
    echo "❌ Redis is NOT installed"
    echo ""
    echo "Please install Redis:"
    echo "  - Mac: brew install redis && brew services start redis"
    echo "  - Linux: sudo apt-get install redis-server && sudo systemctl start redis"
    echo "  - Windows: Download from https://github.com/microsoftarchive/redis/releases"
fi

echo ""
echo "📝 Next steps:"
echo "1. Update your .env file with new variables (see .env.example)"
echo "2. Run database indexes: node migrations/run-performance-indexes.js"
echo "3. Restart your server: npm start"
echo ""
echo "📖 For detailed instructions, see: ../SCALING_SETUP.md"
echo ""
