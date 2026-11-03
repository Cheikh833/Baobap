# Image de production BAOBAB (Node 22). Les migrations sont appliquées au démarrage.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev && npm install --no-save prisma@6.19.3

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* && useradd -m baobab
COPY --from=build --chown=baobab /app/node_modules ./node_modules
COPY --from=build --chown=baobab /app/.next ./.next
COPY --from=build --chown=baobab /app/prisma ./prisma
COPY --from=build --chown=baobab /app/package.json /app/next.config.ts ./
USER baobab
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p ${PORT}"]
