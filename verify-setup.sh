#!/bin/bash

# ── Verification Script for Docker Setup ──────────────────────────────────────
# This script verifies that the project is ready for one-command deployment

set -e

echo "🔍 Verifying Docker Setup..."
echo "=============================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi
echo "✅ Docker installed"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi
echo "✅ Docker Compose installed"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running"
    exit 1
fi
echo "✅ Docker daemon running"

# Validate docker-compose.yml
if ! docker-compose config &> /dev/null; then
    echo "❌ docker-compose.yml has errors"
    exit 1
fi
echo "✅ docker-compose.yml valid"

# Check required files
echo ""
echo "📁 Checking required files..."

files=(
    "docker-compose.yml"
    "backend/Dockerfile"
    "backend/.env"
    "backend/main.py"
    "backend/database.py"
    "Frontend/Dockerfile"
    "Frontend/package.json"
    "nginx/nginx.conf"
)

for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing: $file"
        exit 1
    fi
    echo "✅ Found: $file"
done

echo ""
echo "🎉 All checks passed!"
echo ""
echo "Ready to deploy with:"
echo "  docker-compose up -d --build"
echo ""
echo "After deployment, access:"
echo "  Frontend:  http://localhost"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
