#!/bin/bash
# Setup script to configure OSRM as the default routing provider
# This script creates a .env file from .env.example with OSRM configuration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$SERVER_DIR"

echo "🚀 Setting up OSRM routing provider..."

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists"
    echo "📝 Current ROUTING_PROVIDER setting:"
    grep "^ROUTING_PROVIDER=" .env || echo "   (not set)"
    echo ""
    read -p "Do you want to update it to use OSRM? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. No changes made."
        exit 0
    fi
    # Backup existing .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "💾 Backed up existing .env file"
fi

# Copy .env.example to .env
cp .env.example .env

# Verify OSRM is set
if grep -q "^ROUTING_PROVIDER=osrm" .env; then
    echo "✅ ROUTING_PROVIDER set to osrm"
else
    echo "❌ Failed to set ROUTING_PROVIDER to osrm"
    exit 1
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Update MONGO_URI in .env with your MongoDB connection string"
echo "   2. Update JWT_SECRET with a secure random string"
echo "   3. (Optional) Add GOOGLE_MAPS_API_KEY for traffic-aware routing"
echo "   4. Start the backend server: npm run dev"
echo ""
echo "🌍 OSRM will use the public API: https://router.project-osrm.org/route/v1/driving"
echo "   For production, consider running your own OSRM instance."
