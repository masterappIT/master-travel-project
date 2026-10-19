FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /app
COPY deploy/share-renderer/package.json deploy/share-renderer/package-lock.json ./
RUN npm ci --omit=dev
COPY deploy/share-renderer/server.js ./
# The share image cache volume is mounted here; a new volume takes this directory's owner.
RUN install -d -o pwuser -g pwuser /var/cache/share-images
ENV NODE_ENV=production
ENV SHARE_IMAGE_DIR=/var/cache/share-images
USER pwuser
EXPOSE 8080
CMD ["node", "server.js"]
