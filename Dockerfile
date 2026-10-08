FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN npm ci --include=dev --workspace=@nexanft/server --workspace=@nexanft/contracts --include-workspace-root
RUN npm run build -w @nexanft/contracts && npm run build -w @nexanft/server
RUN npm prune --omit=dev --ignore-scripts --workspace=@nexanft/server --workspace=@nexanft/contracts --include-workspace-root && mkdir -p server/node_modules
FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/server/node_modules ./server/node_modules
COPY --from=build --chown=node:node /app/packages/contracts ./packages/contracts
COPY --from=build --chown=node:node /app/server/dist ./server/dist
COPY --from=build --chown=node:node /app/server/package.json ./server/package.json
COPY --from=build --chown=node:node /app/server/prisma ./server/prisma
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
ENV NODE_ENV=production
EXPOSE 4000
WORKDIR /app/server
CMD ["node", "dist/server/src/server.js"]
