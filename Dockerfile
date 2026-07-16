# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM oven/bun:1 AS builder
WORKDIR /app

# Install deps (cache-friendly)
COPY package.json bun.lock* bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

# Copy source
COPY . .

# Build args exposed to Vite at build time (VITE_* are embedded in client bundle)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY} \
    VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID} \
    BUILD_TARGET=node

RUN bun run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

# Nitro node-server preset emits a self-contained build under dist/
COPY --from=builder /app/dist ./dist

EXPOSE 8080

# OpenShift runs containers with a random non-root UID — make dir group-writable
RUN chgrp -R 0 /app && chmod -R g=u /app
USER 1001

CMD ["node", "dist/server/index.mjs"]
