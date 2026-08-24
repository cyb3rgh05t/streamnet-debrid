FROM node:24-alpine

WORKDIR /app
COPY self-hosted-backend/package.json self-hosted-backend/package-lock.json ./
RUN npm ci --omit=dev
COPY self-hosted-backend/src ./src
COPY self-hosted-backend/scripts ./scripts
COPY self-hosted-backend/migrations ./migrations
COPY self-hosted-backend/public ./public

EXPOSE 3000
CMD ["node", "src/server.js"]