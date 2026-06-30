# syntax=docker/dockerfile:1

# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

RUN mkdir -p public && cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/

COPY . .

# Baked into the JS bundle at build time — set via docker-compose args
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine

RUN npm install -g serve

COPY --from=builder /app/dist /app

EXPOSE 3000

# -s serves index.html for all unmatched paths (SPA routing)
CMD ["serve", "-s", "/app", "-l", "3000"]
