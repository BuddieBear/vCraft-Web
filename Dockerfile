FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY prisma ./prisma
RUN npm run db:generate

COPY backend ./backend
COPY frontend ./frontend
COPY database/postgresql ./database/postgresql

RUN mkdir -p /app/storage/uploads && chown -R node:node /app/storage

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5000 \
    UPLOAD_DIR=/app/storage/uploads

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT?.trim() || 5000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "backend/src/server.js"]
