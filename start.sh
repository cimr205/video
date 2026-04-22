#!/usr/bin/env bash
set -e

MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"

echo "=== Starting Ollama ==="
ollama serve &
OLLAMA_PID=$!

echo "=== Waiting for Ollama to be ready ==="
MAX_WAIT=60
WAITED=0
until curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 1
  WAITED=$((WAITED + 1))
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "ERROR: Ollama did not start in ${MAX_WAIT}s"
    exit 1
  fi
done
echo "=== Ollama ready after ${WAITED}s ==="

echo "=== Pulling model: $MODEL ==="
ollama pull "$MODEL"
echo "=== Model ready ==="

echo "=== Starting app on port ${PORT:-7860} ==="
exec node /app/backend/dist/index.js
