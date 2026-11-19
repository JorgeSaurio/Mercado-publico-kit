# Imagen única: backend + frontend compilado servido desde el mismo contenedor.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/sdk/package.json packages/sdk/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund
COPY . .
# VITE_API_URL vacío = el frontend llama a /api del mismo dominio
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3001 WEB_DIST=/app/apps/web/dist
COPY package.json package-lock.json* ./
COPY packages/sdk/package.json packages/sdk/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace @mp/api --include-workspace-root=false --no-audit --no-fund
COPY --from=build /app/packages/sdk/dist packages/sdk/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/web/dist apps/web/dist
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3001/api/v1/salud || exit 1
CMD ["node", "apps/api/dist/index.js"]
