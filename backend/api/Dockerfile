# Build context is the REPO ROOT (the API depends on shared/contracts):
#   docker build -f backend/api/Dockerfile -t signova-api .
FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY shared/contracts/package.json shared/contracts/
COPY backend/api/package.json backend/api/
RUN npm ci --workspaces --include-workspace-root
COPY shared/contracts shared/contracts
COPY backend/api backend/api
RUN npm run build -w @signova/contracts && npm run build -w @signova/api \
 && npm prune --omit=dev --workspaces --include-workspace-root

FROM node:22-slim
ENV NODE_ENV=production PORT=8080
WORKDIR /repo
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/shared/contracts/package.json shared/contracts/
COPY --from=build /repo/shared/contracts/dist shared/contracts/dist
COPY --from=build /repo/backend/api/package.json backend/api/
COPY --from=build /repo/backend/api/dist backend/api/dist
WORKDIR /repo/backend/api
USER node
EXPOSE 8080
CMD ["node", "dist/main.js"]
