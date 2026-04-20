#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# HTTPS Setup Script for airflowanalysis.xyz
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo "🔒 Setting up HTTPS for airflowanalysis.xyz..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   echo "Please run as a regular user with sudo privileges"
   exit 1
fi

# Update system
echo -e "${BLUE}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Certbot
echo -e "${BLUE}🔧 Installing Certbot...${NC}"
sudo apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
echo -e "${YELLOW}⏸️  Stopping nginx temporarily...${NC}"
sudo systemctl stop nginx

# Get SSL certificate
echo -e "${GREEN}🔐 Obtaining SSL certificate...${NC}"
sudo certbot certonly --standalone \
    -d airflowanalysis.xyz \
    -d www.airflowanalysis.xyz \
    --email your-email@example.com \
    --agree-tos \
    --non-interactive

# Copy HTTPS nginx configuration
echo -e "${BLUE}📝 Updating nginx configuration...${NC}"
sudo cp nginx-vm-https.conf /etc/nginx/sites-available/airflow

# Enable the site
sudo ln -sf /etc/nginx/sites-available/airflow /etc/nginx/sites-enabled/

# Remove default nginx site
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo -e "${BLUE}🧪 Testing nginx configuration...${NC}"
sudo nginx -t

# Start nginx
echo -e "${GREEN}🚀 Starting nginx...${NC}"
sudo systemctl start nginx
sudo systemctl enable nginx

# Set up auto-renewal
echo -e "${BLUE}🔄 Setting up SSL certificate auto-renewal...${NC}"
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test auto-renewal
sudo certbot renew --dry-run

echo -e "${GREEN}✅ HTTPS setup complete!${NC}"
echo -e "${GREEN}🌐 Your site is now available at: https://airflowanalysis.xyz${NC}"
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Update your DNS A records to point to this server's IP"
echo "2. Test the site: https://airflowanalysis.xyz"
echo "3. Check SSL rating: https://www.ssllabs.com/ssltest/"

# Show certificate info
echo -e "${BLUE}📜 Certificate information:${NC}"
sudo certbot certificates