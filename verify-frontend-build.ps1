# ── Frontend Build Verification Script (PowerShell) ────────────────────────

Write-Host "🔍 VERIFYING FRONTEND BUILD" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if frontend container is running
Write-Host "1️⃣  Checking frontend container..." -ForegroundColor Yellow
$frontendRunning = docker ps --format '{{.Names}}' | Select-String -Pattern "^airflow-frontend$"
if ($frontendRunning) {
    Write-Host "✅ Frontend container is running" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend container is not running" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Check if index.html exists in frontend container
Write-Host "2️⃣  Checking if index.html exists in frontend container..." -ForegroundColor Yellow
$indexExists = docker exec airflow-frontend test -f /usr/share/nginx/html/index.html 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ index.html found in frontend container" -ForegroundColor Green
    docker exec airflow-frontend ls -lh /usr/share/nginx/html/index.html
} else {
    Write-Host "❌ index.html NOT found in frontend container" -ForegroundColor Red
    Write-Host "   Listing /usr/share/nginx/html contents:"
    docker exec airflow-frontend ls -la /usr/share/nginx/html/
    exit 1
}
Write-Host ""

# 3. List all files in frontend container
Write-Host "3️⃣  Frontend container file structure:" -ForegroundColor Yellow
docker exec airflow-frontend ls -la /usr/share/nginx/html/
Write-Host ""

# 4. Check frontend container nginx config
Write-Host "4️⃣  Frontend container nginx config:" -ForegroundColor Yellow
docker exec airflow-frontend cat /etc/nginx/conf.d/default.conf
Write-Host ""

# 5. Test frontend container directly
Write-Host "5️⃣  Testing frontend container directly..." -ForegroundColor Yellow
$frontendIP = docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' airflow-frontend
Write-Host "   Frontend container IP: $frontendIP"

try {
    $response = Invoke-WebRequest -Uri "http://${frontendIP}:80/" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend container responds with 200 OK" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend container not responding correctly" -ForegroundColor Red
}
Write-Host ""

# 6. Test through main nginx
Write-Host "6️⃣  Testing through main nginx proxy..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Main nginx proxy to frontend works" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Main nginx proxy to frontend failed" -ForegroundColor Red
    Write-Host "   Checking nginx logs:"
    docker logs --tail 20 airflow-nginx
}
Write-Host ""

# 7. Test API still works
Write-Host "7️⃣  Testing API endpoints..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ API /api/health works" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ API /api/health failed" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost/api/docs" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ API /api/docs works" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ API /api/docs failed" -ForegroundColor Red
}
Write-Host ""

Write-Host "============================" -ForegroundColor Cyan
Write-Host "🎉 VERIFICATION COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Test URLs:" -ForegroundColor Cyan
Write-Host "   Frontend:  http://airflowanalysis.xyz"
Write-Host "   Register:  http://airflowanalysis.xyz/register"
Write-Host "   Login:     http://airflowanalysis.xyz/login"
Write-Host "   API Docs:  http://airflowanalysis.xyz/api/docs"
Write-Host ""
