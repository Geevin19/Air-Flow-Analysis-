# ── Deployment Verification Script (PowerShell) ────────────────────────────

Write-Host "🔍 VERIFYING DEPLOYMENT STACK" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if Docker is running
Write-Host "1️⃣  Checking Docker status..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Check nginx config syntax
Write-Host "2️⃣  Validating nginx configuration..." -ForegroundColor Yellow
$nginxTest = docker run --rm -v "${PWD}/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Nginx configuration is valid" -ForegroundColor Green
} else {
    Write-Host "❌ Nginx configuration has errors" -ForegroundColor Red
    Write-Host $nginxTest
    exit 1
}
Write-Host ""

# 3. Check all containers are running
Write-Host "3️⃣  Checking container status..." -ForegroundColor Yellow
$containers = @("airflow-postgres", "airflow-backend", "airflow-frontend", "airflow-nginx")
$allRunning = $true

foreach ($container in $containers) {
    $exists = docker ps --format '{{.Names}}' | Select-String -Pattern "^${container}$"
    
    if ($exists) {
        $status = docker inspect --format='{{.State.Status}}' $container
        $health = docker inspect --format='{{.State.Health.Status}}' $container 2>$null
        if (-not $health) { $health = "none" }
        
        if ($status -eq "running") {
            if ($health -eq "healthy" -or $health -eq "none") {
                Write-Host "✅ ${container}: running ($health)" -ForegroundColor Green
            } else {
                Write-Host "⚠️  ${container}: running but $health" -ForegroundColor Yellow
                $allRunning = $false
            }
        } else {
            Write-Host "❌ ${container}: $status" -ForegroundColor Red
            $allRunning = $false
        }
    } else {
        Write-Host "❌ ${container}: not found" -ForegroundColor Red
        $allRunning = $false
    }
}
Write-Host ""

if (-not $allRunning) {
    Write-Host "⚠️  Some containers are not healthy. Check logs with:" -ForegroundColor Yellow
    Write-Host "   docker logs airflow-nginx"
    Write-Host "   docker logs airflow-backend"
    Write-Host "   docker logs airflow-frontend"
    Write-Host ""
}

# 4. Test endpoints
Write-Host "4️⃣  Testing endpoints..." -ForegroundColor Yellow

function Test-Endpoint {
    param($url, $name)
    Write-Host "   Testing $name... " -NoNewline
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ 200 OK" -ForegroundColor Green
        } else {
            Write-Host "❌ $($response.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Failed" -ForegroundColor Red
    }
}

Test-Endpoint "http://localhost/health" "/health"
Test-Endpoint "http://localhost/api/health" "/api/health"
Test-Endpoint "http://localhost/api/" "/api/"
Test-Endpoint "http://localhost/api/docs" "/api/docs"
Test-Endpoint "http://localhost/" "/ (frontend)"

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🎉 DEPLOYMENT VERIFICATION COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Access your application:" -ForegroundColor Cyan
Write-Host "   Frontend:  http://airflowanalysis.xyz"
Write-Host "   API Docs:  http://airflowanalysis.xyz/api/docs"
Write-Host "   Health:    http://airflowanalysis.xyz/health"
Write-Host ""
