# app API — production image (item 5)
# Build: docker build -t app-api ./backend
# Run:   docker run -p 5000:5000 --env-file .env app-api

FROM node:20-alpine

WORKDIR /app

# pg_dump for optional in-container backups
RUN apk add --no-cache postgresql-client

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1

CMD ["node", "server.js"]
