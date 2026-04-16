#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# Complete VM Deployment Script for AirFlow Analysis
# ═══════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

echo "🚀 Starting deployment..."
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: Install Nginx
# ═══════════════════════════════════════════════════════════════════════════

echo "📦 Step 1: Installing Nginx..."
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
echo "✅ Nginx installed"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: Build Frontend
# ═══════════════════════════════════════════════════════════════════════════

echo "🏗️  Step 2: Building Frontend..."
cd Frontend

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Build for production
echo "Building React app..."
npm run build

# Verify build output
if [ ! -f "dist/index.html" ]; then
    echo "❌ ERROR: Build failed - index.html not found in dist/"
    exit 1
fi

echo "✅ Frontend built successfully"
cd ..
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: Deploy Frontend to /var/www/airflow
# ═══════════════════════════════════════════════════════════════════════════

echo "📂 Step 3: Deploying Frontend..."

# Create directory
sudo mkdir -p /var/www/airflow

# Copy build files
sudo rm -rf /var/www/airflow/*
sudo cp -r Frontend/dist/* /var/www/airflow/

# Set permissions
sudo chown -R www-data:www-data /var/www/airflow
sudo chmod -R 755 /var/www/airflow

# Verify deployment
if [ ! -f "/var/www/airflow/index.html" ]; then
    echo "❌ ERROR: Frontend deployment failed"
    exit 1
fi

echo "✅ Frontend deployed to /var/www/airflow"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: Configure Nginx
# ═══════════════════════════════════════════════════════════════════════════

echo "⚙️  Step 4: Configuring Nginx..."

# Copy nginx config
sudo cp nginx-vm.conf /etc/nginx/sites-available/airflow

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable airflow site
sudo ln -sf /etc/nginx/sites-available/airflow /etc/nginx/sites-enabled/airflow

# Test nginx configuration
echo "Testing nginx configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Nginx configuration test failed"
    exit 1
fi

echo "✅ Nginx configured"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5: Start Docker Services (Backend + Database)
# ═══════════════════════════════════════════════════════════════════════════

echo "🐳 Step 5: Starting Docker services..."

# Stop any existing containers
docker-compose down

# Start backend and database
docker-compose up -d --build

echo "Waiting for services to start..."
sleep 30

# Check if containers are running
if ! docker ps | grep -q "airflow-backend"; then
    echo "❌ ERROR: Backend container not running"
    docker-compose logs backend
    exit 1
fi

if ! docker ps | grep -q "airflow-postgres"; then
    echo "❌ ERROR: Database container not running"
    docker-compose logs db
    exit 1
fi

echo "✅ Docker services started"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6: Restart Nginx
# ═══════════════════════════════════════════════════════════════════════════

echo "🔄 Step 6: Restarting Nginx..."
sudo systemctl restart nginx

# Check nginx status
if ! sudo systemctl is-active --quiet nginx; then
    echo "❌ ERROR: Nginx failed to start"
    sudo systemctl status nginx
    exit 1
fi

echo "✅ Nginx restarted"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 7: Verification
# ═══════════════════════════════════════════════════════════════════════════

echo "🧪 Step 7: Running verification tests..."
echo ""

# Test 1: Docker containers
echo "Test 1: Docker containers status"
docker ps --format "table {{.Names}}\t{{.Status}}"
echo ""

# Test 2: Backend health
echo "Test 2: Backend health check"
sleep 5
curl -f http://127.0.0.1:8000/health || echo "⚠️  Backend health check failed"
echo ""

# Test 3: Frontend via nginx
echo "Test 3: Frontend via nginx"
curl -I http://localhost/ | head -n 1
echo ""

# Test 4: API via nginx
echo "Test 4: API proxy via nginx"
curl -f http://localhost/api/health || echo "⚠️  API proxy failed"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# DEPLOYMENT COMPLETE
# ═══════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════════════"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "✅ Backend running on: http://127.0.0.1:8000"
echo "✅ Frontend deployed to: /var/www/airflow"
echo "✅ Nginx serving on: http://airflowanalysis.xyz"
echo ""
echo "📋 Access your application:"
echo "   Frontend:  http://airflowanalysis.xyz"
echo "   API Docs:  http://airflowanalysis.xyz/api/docs"
echo "   Health:    http://airflowanalysis.xyz/api/health"
echo ""
echo "🔍 Useful commands:"
echo "   Check containers:  docker ps"
echo "   Backend logs:      docker logs airflow-backend"
echo "   Database logs:     docker logs airflow-postgres"
echo "   Nginx logs:        sudo tail -f /var/log/nginx/airflow_error.log"
echo "   Restart nginx:     sudo systemctl restart nginx"
echo "   Restart backend:   docker-compose restart backend"
echo ""
