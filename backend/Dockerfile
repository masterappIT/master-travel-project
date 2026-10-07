FROM node:20-bookworm-slim AS build

ARG DBIP_RELEASE=2026-10
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
WORKDIR /app
RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates curl gzip openssl \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm --prefix backend ci \
  && ln -s backend/node_modules node_modules

RUN mkdir -p backend/geoip \
  && curl --fail --location --retry 3 "https://download.db-ip.com/free/dbip-city-lite-${DBIP_RELEASE}.mmdb.gz" --output /tmp/dbip-city-lite.mmdb.gz \
  && gzip -t /tmp/dbip-city-lite.mmdb.gz \
  && gunzip -c /tmp/dbip-city-lite.mmdb.gz > backend/geoip/dbip-city-lite.mmdb \
  && node -e 'const m = require("./backend/node_modules/maxmind"); m.open("backend/geoip/dbip-city-lite.mmdb").then(r => { if (r.metadata.databaseType !== "DBIP-City-Lite" || !r.get("8.8.8.8")?.country?.names?.en) process.exit(1) }).catch(e => { console.error(e); process.exit(1) })' \
  && rm /tmp/dbip-city-lite.mmdb.gz

COPY prisma ./prisma
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src
RUN npm --prefix backend run build

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app/backend
RUN apt-get update \
  && apt-get install --yes --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/backend/package.json /app/backend/package-lock.json ./
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/generated ./generated
COPY --from=build /app/prisma /app/prisma
COPY --from=build /app/backend/geoip ./geoip

USER node
EXPOSE 8080
CMD ["node", "dist/main.js"]
