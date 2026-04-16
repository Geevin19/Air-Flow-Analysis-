#!/bin/bash

# ── Frontend Build Verification Script ──────────────────────────────────────

echo "🔍 VERIFYING FRONTEND BUILD"
echo "============================"
echo ""

# 1. Check if frontend container is running
echo "1️⃣  Checking frontend container..."
if docker ps --format '{{.Names}}' | grep -q "^airflow-frontend$"; then
    echo "✅ Frontend container is running"
else
    echo "❌ Frontend container is not running"
    exit 1
fi
echo ""

# 2. Check if index.html exists in frontend container
echo "2️⃣  Checking if index.html exists in frontend container..."
if docker exec airflow-frontend test -f /usr/share/nginx/html/index.html; then
    echo "✅ index.html found in frontend container"
    docker exec airflow-frontend ls -lh /usr/share/nginx/html/index.html
else
    echo "❌ index.html NOT found in frontend container"
    echo "   Listing /usr/share/nginx/html contents:"
    docker exec airflow-frontend ls -la /usr/share/nginx/html/
    exit 1
fi
echo ""

# 3. List all files in frontend container
echo "3️⃣  Frontend container file structure:"
docker exec airflow-frontend ls -la /usr/share/nginx/html/
echo ""

# 4. Check frontend container nginx config
echo "4️⃣  Frontend container nginx config:"
docker exec airflow-frontend cat /etc/nginx/conf.d/default.conf
echo ""

# 5. Test frontend container directly
echo "5️⃣  Testing frontend container directly..."
FRONTEND_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' airflow-frontend)
echo "   Frontend container IP: $FRONTEND_IP"

if curl -s -o /dev/null -w "%{http_code}" "http://${FRONTEND_IP}:80/" | grep -q "200"; then
    echo "✅ Frontend container responds with 200 OK"
else
    echo "❌ Frontend container not responding correctly"
fi
echo ""

# 6. Test through main nginx
echo "6️⃣  Testing through main nginx proxy..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost/" | grep -q "200"; then
    echo "✅ Main nginx proxy to frontend works"
else
    echo "❌ Main nginx proxy to frontend failed"
    echo "   Checking nginx logs:"
    docker logs --tail 20 airflow-nginx
fi
echo ""

# 7. Test API still works
echo "7️⃣  Testing API endpoints..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/health" | grep -q "200"; then
    echo "✅ API /api/health works"
else
    echo "❌ API /api/health failed"
fi

if curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/docs" | grep -q "200"; then
    echo "✅ API /api/docs works"
else
    echo "❌ API /api/docs failed"
fi
echo ""

echo "============================"
echo "🎉 VERIFICATION COMPLETE"
echo ""
echo "📋 Test URLs:"
echo "   Frontend:  http://airflowanalysis.xyz"
echo "   Register:  http://airflowanalysis.xyz/register"
echo "   Login:     http://airflowanalysis.xyz/login"
echo "   API Docs:  http://airflowanalysis.xyz/api/docs"
echo ""
