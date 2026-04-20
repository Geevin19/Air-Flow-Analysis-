#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# Automated HTTPS Setup Script for airflowanalysis.xyz
# Run this on your VPS to enable HTTPS in one command
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         HTTPS Setup for airflowanalysis.xyz                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ Do not run as root. Run as regular user with sudo.${NC}"
   exit 1
fi

# Get email for SSL certificate
read -p "Enter your email for SSL certificate: " EMAIL
if [[ -z "$EMAIL" ]]; then
    echo -e "${RED}❌ Email is required${NC}"
    exit 1
fi

# Step 1: Update system
echo -e "${BLUE}📦 Step 1/8: Updating system...${NC}"
sudo apt update -qq

# Step 2: Install Certbot
echo -e "${BLUE}🔧 Step 2/8: Installing Certbot...${NC}"
sudo apt install -y certbot python3-certbot-nginx > /dev/null 2>&1

# Step 3: Stop nginx
echo -e "${YELLOW}⏸️  Step 3/8: Stopping nginx...${NC}"
sudo systemctl stop nginx || true

# Step 4: Get SSL certificate
echo -e "${GREEN}🔐 Step 4/8: Obtaining SSL certificate...${NC}"
sudo certbot certonly --standalone \
    -d airflowanalysis.xyz \
    -d www.airflowanalysis.xyz \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --quiet

# Step 5: Create nginx configuration
echo -e "${BLUE}📝 Step 5/8: Creating nginx configuration...${NC}"
sudo tee /etc/nginx/sites-available/airflow > /dev/null <<'EOF'
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name airflowanalysis.xyz www.airflowanalysis.xyz;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name airflowanalysis.xyz www.airflowanalysis.xyz;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/airflowanalysis.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/airflowanalysis.xyz/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/airflow_access.log;
    error_log /var/log/nginx/airflow_error.log;

    # Client settings
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # API routes
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Connection "";
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /ws/ {
        proxy_pass http://localhost:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Connection "";
    }
}
EOF

# Step 6: Enable site
echo -e "${BLUE}🔗 Step 6/8: Enabling site...${NC}"
sudo ln -sf /etc/nginx/sites-available/airflow /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Step 7: Test and start nginx
echo -e "${BLUE}🧪 Step 7/8: Testing nginx configuration...${NC}"
sudo nginx -t

echo -e "${GREEN}🚀 Step 8/8: Starting nginx...${NC}"
sudo systemctl start nginx
sudo systemctl enable nginx

# Enable auto-renewal
echo -e "${BLUE}🔄 Setting up auto-renewal...${NC}"
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
echo -e "${BLUE}🧪 Testing auto-renewal...${NC}"
sudo certbot renew --dry-run --quiet

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ HTTPS ENABLED!                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🌐 Your site is now secure:${NC}"
echo -e "   https://airflowanalysis.xyz"
echo ""
echo -e "${BLUE}📋 Certificate Information:${NC}"
sudo certbot certificates | grep -A 5 "airflowanalysis.xyz"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "   1. Visit https://airflowanalysis.xyz to verify"
echo "   2. Check SSL rating: https://www.ssllabs.com/ssltest/"
echo "   3. Certificate will auto-renew every 60 days"
echo ""
echo -e "${GREEN}✨ Setup complete!${NC}"