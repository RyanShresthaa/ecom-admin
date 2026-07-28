# API — production image
# Build: docker build -t app-api ./backend
# Run:   docker run -p 5000:5000 --env-file .env app-api

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app

# pg_dump for optional in-container backups; wget for HEALTHCHECK
RUN apk add --no-cache postgresql-client wget \
  && addgroup -S app && adduser -S app -G app

COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app . .

ENV NODE_ENV=production \
    UV_THREADPOOL_SIZE=8 \
    EMAIL_USE_QUEUE=true \
    PORT=5000

EXPOSE 5000
USER app

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health/live || exit 1

  CMD ["sh", "-c", "node scripts/migrate.mjs && node scripts/reset-admin-password.mjs && node server.js"]
