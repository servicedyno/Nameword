#!/usr/bin/env bash
# Frontend launcher. Touch /app/frontend/.prod to serve a production build
# (5 requests/page, immune to Cloudflare 429 on the preview); remove it for Vite dev + HMR.
cd /app/frontend
if [ -f .prod ]; then
  yarn build && exec npx vite preview --host 0.0.0.0 --port 3000 --strictPort
else
  exec yarn start
fi
