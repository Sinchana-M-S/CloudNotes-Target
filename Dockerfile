# ── Build Stage ──────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --only=production

# ── Production Stage ─────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S cloudnotes && \
    adduser -S cloudnotes -u 1001

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source code
COPY . .

# Set ownership
RUN chown -R cloudnotes:cloudnotes /app

USER cloudnotes

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "server.js"]
