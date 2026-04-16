#!/bin/bash

# ── Deployment Verification Script ──────────────────────────────────────────

echo "🔍 VERIFYING DEPLOYMENT STACK"
echo "================================"
echo ""

# 1. Check if Docker is running
echo "1️⃣  Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi
echo "✅ Docker is running"
echo ""

# 2. Check nginx config syntax
echo "2️⃣  Validating nginx configuration..."
docker run --rm -v "$(pwd)/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi
echo ""

# 3. Check all containers are running
echo "3️⃣  Checking container status..."
CONTAINERS=("airflow-postgres" "airflow-backend" "airflow-frontend" "airflow-nginx")
ALL_RUNNING=true

for container in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        STATUS=$(docker inspect --format='{{.State.Status}}' "$container")
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
        
        if [ "$STATUS" = "running" ]; then
            if [ "$HEALTH" = "healthy" ] || [ "$HEALTH" = "none" ]; then
                echo "✅ $container: running ($HEALTH)"
            else
                echo "⚠️  $container: running but $HEALTH"
                ALL_RUNNING=false
            fi
        else
            echo "❌ $container: $STATUS"
            ALL_RUNNING=false
        fi
    else
        echo "❌ $container: not found"
        ALL_RUNNING=false
    fi
done
echo ""

if [ "$ALL_RUNNING" = false ]; then
    echo "⚠️  Some containers are not healthy. Check logs with:"
    echo "   docker logs airflow-nginx"
    echo "   docker logs airflow-backend"
    echo "   docker logs airflow-frontend"
    echo ""
fi

# 4. Test endpoints
echo "4️⃣  Testing endpoints..."

# Test nginx health
echo -n "   Testing /health... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost/health | grep -q "200"; then
    echo "✅ 200 OK"
else
    echo "❌ Failed"
fi

# Test backend health
echo -n "   Testing /api/health... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health | grep -q "200"; then
    echo "✅ 200 OK"
else
    echo "❌ Failed"
fi

# Test backend root
echo -n "   Testing /api/... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost/api/ | grep -q "200"; then
    echo "✅ 200 OK"
else
    echo "❌ Failed"
fi

# Test API docs
echo -n "   Testing /api/docs... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost/api/docs | grep -q "200"; then
    echo "✅ 200 OK"
else
    echo "❌ Failed"
fi

# Test frontend
echo -n "   Testing / (frontend)... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200"; then
    echo "✅ 200 OK"
else
    echo "❌ Failed"
fi

echo ""
echo "================================"
echo "🎉 DEPLOYMENT VERIFICATION COMPLETE"
echo ""
echo "📋 Access your application:"
echo "   Frontend:  http://airflowanalysis.xyz"
echo "   API Docs:  http://airflowanalysis.xyz/api/docs"
echo "   Health:    http://airflowanalysis.xyz/health"
echo ""
