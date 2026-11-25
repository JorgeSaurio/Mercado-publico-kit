# Imagen única: backend + frontend compilado servido desde el mismo contenedor.
# Base fijada por versión parchada (Node 22.23.5, security release 11-nov-2026) y por digest.
FROM node:26.13.1-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY packages/sdk/package.json packages/sdk/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
# VITE_API_URL vacío = el frontend llama a /api del mismo dominio
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:26.13.1-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5
WORKDIR /app
ENV NODE_ENV=production PORT=3001 WEB_DIST=/app/apps/web/dist
COPY package.json package-lock.json .npmrc ./
COPY packages/sdk/package.json packages/sdk/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Tras instalar, se elimina npm/npx de la imagen final: no se usan en ejecución y reducen superficie de ataque
RUN npm ci --omit=dev --workspace @mp/api --include-workspace-root=false --ignore-scripts --no-audit --no-fund \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn* /root/.npm
COPY --from=build /app/packages/sdk/dist packages/sdk/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/web/dist apps/web/dist
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3001/api/v1/salud || exit 1
CMD ["node", "apps/api/dist/index.js"]
