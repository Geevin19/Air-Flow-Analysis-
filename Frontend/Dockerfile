# Build stage only - nginx will be handled by main nginx container
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

# Final stage - just hold the built files
FROM node:20-alpine

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Verify files are in place
RUN ls -la /app/dist && \
    test -f /app/dist/index.html || (echo "ERROR: index.html not found!" && exit 1)

# Keep container running
CMD ["tail", "-f", "/dev/null"]
