FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /app
COPY deploy/share-renderer/package.json deploy/share-renderer/package-lock.json ./
RUN npm ci --omit=dev
COPY deploy/share-renderer/server.js ./
ENV NODE_ENV=production
USER pwuser
EXPOSE 8080
CMD ["node", "server.js"]
