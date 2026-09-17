FROM node:24-alpine

WORKDIR /app
COPY backend-cloud/package.json backend-cloud/package-lock.json ./
RUN npm ci --omit=dev
COPY backend-cloud/src ./src
COPY backend-cloud/scripts ./scripts
COPY backend-cloud/migrations ./migrations
COPY backend-cloud/public ./public

EXPOSE 3000
CMD ["node", "src/server.js"]