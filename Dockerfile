# ── Stage 1: build frontend ───────────────────────────────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN npm install --workspaces --include-workspace-root
COPY frontend ./frontend
RUN npm run build -w frontend

# ── Stage 2: build backend ────────────────────────────────────────────────────
FROM node:20-slim AS backend-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm install --workspaces --include-workspace-root
COPY backend ./backend
RUN npm run build -w backend

# ── Stage 3: Pre-bundle Remotion compositions ─────────────────────────────────
FROM node:20-slim AS remotion-bundle-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN npm install --workspaces --include-workspace-root
COPY frontend ./frontend
RUN node -e "\
const {bundle} = require('@remotion/bundler');\
const path = require('path');\
const fs = require('fs');\
bundle({ entryPoint: path.resolve('./frontend/src/remotion/entry.tsx') })\
  .then(dir => {\
    fs.cpSync(dir, './remotion-bundle', {recursive: true});\
    console.log('Remotion bundle done');\
  })\
  .catch(e => { console.error(e); process.exit(1); });\
"

# ── Stage 4: runtime ──────────────────────────────────────────────────────────
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV PORT=7860
ENV OLLAMA_MODEL=qwen2.5:3b
ENV OLLAMA_URL=http://localhost:11434
ENV REMOTION_CHROME_EXECUTABLE=/usr/bin/chromium-browser
ENV REMOTION_BUNDLE_PATH=/app/backend/remotion-bundle/index.html

# System packages: Node 20 + ffmpeg + curl + chromium
RUN apt-get update && apt-get install -y \
    curl ffmpeg ca-certificates \
    chromium-browser \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

WORKDIR /app

# Copy built artifacts
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/package.json ./backend/package.json
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
COPY --from=remotion-bundle-build /app/remotion-bundle ./backend/remotion-bundle

# Runtime dirs
RUN mkdir -p backend/uploads backend/outputs

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 7860

CMD ["/start.sh"]
