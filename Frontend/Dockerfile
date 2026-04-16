# ═══════════════════════════════════════════════════════════════════════════
# Stage 1: Build React App
# ═══════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Verify build output
RUN ls -la /app/dist && \
    test -f /app/dist/index.html || (echo "ERROR: Build failed" && exit 1)

# ═══════════════════════════════════════════════════════════════════════════
# Stage 2: Serve with Nginx
# ═══════════════════════════════════════════════════════════════════════════
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Verify
RUN test -f /usr/share/nginx/html/index.html || (echo "ERROR: No index.html" && exit 1)

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
