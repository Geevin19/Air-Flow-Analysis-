# ── Verification Script for Docker Setup (PowerShell) ────────────────────────
# This script verifies that the project is ready for one-command deployment

Write-Host "🔍 Verifying Docker Setup..." -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
try {
    docker --version | Out-Null
    Write-Host "✅ Docker installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed" -ForegroundColor Red
    exit 1
}

# Check Docker Compose
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not installed" -ForegroundColor Red
    exit 1
}

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker daemon running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker daemon is not running" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop" -ForegroundColor Yellow
    exit 1
}

# Validate docker-compose.yml
try {
    docker-compose config | Out-Null
    Write-Host "✅ docker-compose.yml valid" -ForegroundColor Green
} catch {
    Write-Host "❌ docker-compose.yml has errors" -ForegroundColor Red
    exit 1
}

# Check required files
Write-Host ""
Write-Host "📁 Checking required files..." -ForegroundColor Cyan

$files = @(
    "docker-compose.yml",
    "backend/Dockerfile",
    "backend/.env",
    "backend/main.py",
    "backend/database.py",
    "Frontend/Dockerfile",
    "Frontend/package.json",
    "nginx/nginx.conf"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🎉 All checks passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Ready to deploy with:" -ForegroundColor Cyan
Write-Host "  docker-compose up -d --build" -ForegroundColor Yellow
Write-Host ""
Write-Host "After deployment, access:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://localhost" -ForegroundColor White
Write-Host "  Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor White
