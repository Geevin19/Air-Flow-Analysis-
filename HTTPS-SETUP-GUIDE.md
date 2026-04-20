# 🔒 HTTPS Setup Guide for airflowanalysis.xyz

## Quick Fix - Enable HTTPS in 5 Minutes

### Step 1: SSH into Your VPS
```bash
ssh ubuntu@your-vps-ip
cd ~/airflow
```

### Step 2: Install Certbot
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### Step 3: Stop Nginx Temporarily
```bash
sudo systemctl stop nginx
```

### Step 4: Get SSL Certificate
```bash
sudo certbot certonly --standalone \
  -d airflowanalysis.xyz \
  -d www.airflowanalysis.xyz \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive
```

### Step 5: Update Nginx Configuration

Create/update `/etc/nginx/sites-available/airflow`:

```nginx
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
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # API routes
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### Step 6: Enable Configuration
```bash
sudo ln -sf /etc/nginx/sites-available/airflow /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

### Step 7: Test and Start Nginx
```bash
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 8: Enable Auto-Renewal
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Step 9: Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

## ✅ Verification

1. Visit: https://airflowanalysis.xyz
2. Check for green padlock in browser
3. Test SSL: https://www.ssllabs.com/ssltest/analyze.html?d=airflowanalysis.xyz

## 🔄 Certificate Renewal

Certificates auto-renew every 60 days. Check status:
```bash
sudo certbot certificates
```

Manual renewal:
```bash
sudo certbot renew
sudo systemctl reload nginx
```

## 🚨 Troubleshooting

### Issue: Port 80/443 already in use
```bash
sudo lsof -i :80
sudo lsof -i :443
# Kill the process or stop the service
```

### Issue: DNS not pointing to server
```bash
# Check DNS
dig airflowanalysis.xyz
# Should show your VPS IP
```

### Issue: Firewall blocking ports
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### Issue: Certificate not found
```bash
# List certificates
sudo certbot certificates

# If missing, get new certificate
sudo certbot certonly --standalone -d airflowanalysis.xyz
```

## 📝 Quick Commands Reference

```bash
# Check nginx status
sudo systemctl status nginx

# Check certificate expiry
sudo certbot certificates

# Reload nginx (after config changes)
sudo systemctl reload nginx

# View nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Test SSL configuration
openssl s_client -connect airflowanalysis.xyz:443
```

## 🎯 Expected Result

After setup:
- ✅ http://airflowanalysis.xyz → redirects to https://
- ✅ https://airflowanalysis.xyz → shows green padlock
- ✅ Browser shows "Secure" or padlock icon
- ✅ No security warnings
- ✅ Auto-renewal enabled

## 📞 Need Help?

If you encounter issues:
1. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
2. Verify DNS: `dig airflowanalysis.xyz`
3. Test ports: `sudo netstat -tulpn | grep :443`
4. Check certificate: `sudo certbot certificates`