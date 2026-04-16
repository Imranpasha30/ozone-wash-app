# ── Build stage ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run web:build

# ── Serve stage ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD serve dist --single --listen 3000
