FROM node:20-bookworm-slim AS build

ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
WORKDIR /app
RUN apt-get update \
  && apt-get install --yes --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm --prefix backend ci \
  && ln -s backend/node_modules node_modules

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

USER node
EXPOSE 8080
CMD ["node", "dist/main.js"]
