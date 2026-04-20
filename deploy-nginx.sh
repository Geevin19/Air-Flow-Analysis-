#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# Deploy Nginx Configuration Script
# Run this on your VPS after pulling the latest code
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo "🚀 Deploying Nginx Configuration..."

# Step 1: Copy nginx configuration
echo "📝 Step 1/4: Copying nginx configuration..."
sudo cp nginx-vm.conf /etc/nginx/sites-available/airflow

# Step 2: Enable the site
echo "🔗 Step 2/4: Enabling site..."
sudo ln -sf /etc/nginx/sites-available/airflow /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Step 3: Test nginx configuration
echo "🧪 Step 3/4: Testing nginx configuration..."
sudo nginx -t

# Step 4: Reload nginx
echo "🔄 Step 4/4: Reloading nginx..."
sudo systemctl reload nginx

echo "✅ Nginx configuration deployed successfully!"
echo "🌐 Your site should now be accessible at: http://airflowanalysis.xyz"