# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from backend
COPY backend/package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code from backend
COPY backend/tsconfig.json ./
COPY backend/src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy database migrations
COPY backend/database/migrations ./database/migrations

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Run migrations and start the application
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/index.js"]
