# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build for production - outputs to /app/dist
RUN npm run build

# Verify build output exists
RUN ls -la /app/dist && \
    test -f /app/dist/index.html || (echo "ERROR: index.html not found in dist!" && exit 1)

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Create simple nginx config for frontend container
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Verify files are in place
RUN ls -la /usr/share/nginx/html && \
    test -f /usr/share/nginx/html/index.html || (echo "ERROR: index.html not found!" && exit 1)

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
