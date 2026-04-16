#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# Complete Deployment Script
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo "🚀 Starting deployment..."
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: Stop and clean existing containers
# ═══════════════════════════════════════════════════════════════════════════

echo "🧹 Step 1: Cleaning up existing containers..."
docker-compose down -v 2>/dev/null || true
echo "✅ Cleanup complete"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: Build and start Docker services
# ═══════════════════════════════════════════════════════════════════════════

echo "🐳 Step 2: Building and starting Docker services..."
docker-compose up --build -d

echo "⏳ Waiting for services to start (60 seconds)..."
sleep 60

# Check if containers are running
echo "Checking container status..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: Verify Docker services
# ═══════════════════════════════════════════════════════════════════════════

echo "🧪 Step 3: Verifying Docker services..."

# Check postgres
if docker ps | grep -q "airflow-postgres"; then
    echo "✅ Postgres running"
else
    echo "❌ Postgres not running"
    docker logs airflow-postgres
    exit 1
fi

# Check backend
if docker ps | grep -q "airflow-backend"; then
    echo "✅ Backend running"
    
    # Test backend health
    sleep 5
    if curl -f http://localhost:8000/health 2>/dev/null; then
        echo "✅ Backend health check passed"
    else
        echo "⚠️  Backend health check failed (may need more time)"
    fi
else
    echo "❌ Backend not running"
    docker logs airflow-backend
    exit 1
fi

# Check frontend
if docker ps | grep -q "airflow-frontend"; then
    echo "✅ Frontend running"
    
    # Test frontend
    if curl -I http://localhost:3000 2>/dev/null | grep -q "200"; then
        echo "✅ Frontend accessible"
    else
        echo "⚠️  Frontend not responding yet"
    fi
else
    echo "❌ Frontend not running"
    docker logs airflow-frontend
    exit 1
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: Install and configure Nginx on VM
# ═══════════════════════════════════════════════════════════════════════════

echo "📦 Step 4: Configuring Nginx on VM..."

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    sudo apt update
    sudo apt install -y nginx
    sudo systemctl enable nginx
fi

# Copy nginx config
sudo cp nginx-vm.conf /etc/nginx/sites-available/airflow

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable airflow site
sudo ln -sf /etc/nginx/sites-available/airflow /etc/nginx/sites-enabled/airflow

# Test nginx config
echo "Testing nginx configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Restart nginx
sudo systemctl restart nginx

echo "✅ Nginx configured and restarted"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5: Final verification
# ═══════════════════════════════════════════════════════════════════════════

echo "🧪 Step 5: Final verification..."
echo ""

echo "Test 1: Backend direct access"
curl -s http://localhost:8000/health | head -n 1 || echo "⚠️  Backend not responding"
echo ""

echo "Test 2: Frontend direct access"
curl -I http://localhost:3000 2>/dev/null | head -n 1 || echo "⚠️  Frontend not responding"
echo ""

echo "Test 3: Frontend via nginx"
curl -I http://localhost/ 2>/dev/null | head -n 1 || echo "⚠️  Nginx frontend proxy not working"
echo ""

echo "Test 4: API via nginx"
curl -s http://localhost/api/health | head -n 1 || echo "⚠️  Nginx API proxy not working"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# DEPLOYMENT COMPLETE
# ═══════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════════════"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Service Status:"
echo "   Postgres:  http://localhost:5432"
echo "   Backend:   http://localhost:8000"
echo "   Frontend:  http://localhost:3000"
echo "   Nginx:     http://airflowanalysis.xyz"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend:  http://airflowanalysis.xyz"
echo "   API Docs:  http://airflowanalysis.xyz/api/docs"
echo "   Health:    http://airflowanalysis.xyz/api/health"
echo ""
echo "🔍 Useful Commands:"
echo "   View containers:    docker ps"
echo "   Backend logs:       docker logs -f airflow-backend"
echo "   Frontend logs:      docker logs -f airflow-frontend"
echo "   Postgres logs:      docker logs -f airflow-postgres"
echo "   Nginx logs:         sudo tail -f /var/log/nginx/airflow_error.log"
echo "   Restart nginx:      sudo systemctl restart nginx"
echo "   Restart containers: docker-compose restart"
echo ""
