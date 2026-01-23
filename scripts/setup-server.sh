#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting server setup..."

# 1. Update system
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# 3. Create app directory
APP_DIR="/opt/joker-game"
if [ ! -d "$APP_DIR" ]; then
    echo "📂 Creating app directory at $APP_DIR..."
    mkdir -p $APP_DIR
else
    echo "✅ App directory exists"
fi

# 4. Setup .env file placeholder if not exists
if [ ! -f "$APP_DIR/.env" ]; then
    echo "📝 Creating .env placeholder..."
    touch "$APP_DIR/.env"
    echo "POSTGRES_USER=joker" >> "$APP_DIR/.env"
    echo "POSTGRES_PASSWORD=$(openssl rand -hex 12)" >> "$APP_DIR/.env"
    echo "POSTGRES_DB=joker_db" >> "$APP_DIR/.env"
    echo "DOCKER_REGISTRY=ghcr.io" >> "$APP_DIR/.env"
    # Placeholder for image names - will be populated by CI/CD usually, but good to have defaults
    echo "DOCKER_IMAGE_BACKEND=your-username/joker-backend" >> "$APP_DIR/.env"
    echo "DOCKER_IMAGE_FRONTEND=your-username/joker-frontend" >> "$APP_DIR/.env"
    
    echo "⚠️  CREATED DEFAULT .ENV at $APP_DIR/.env - PLEASE UPDATE IT!"
fi

echo "✨ Server setup complete! Ready for deployment."
echo "   App location: $APP_DIR"
