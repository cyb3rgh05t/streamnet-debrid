FROM node:24-alpine

WORKDIR /app
COPY self-hosted-backend/package.json self-hosted-backend/package-lock.json ./
RUN npm ci --omit=dev
COPY self-hosted-backend/src ./src
COPY self-hosted-backend/scripts ./scripts
COPY self-hosted-backend/migrations ./migrations
COPY netlify-auth-site/index.html ./public/index.html
COPY netlify-auth-site/delete-account.html ./public/delete-account.html
COPY netlify-auth-site/assets/streamnet-logo.svg ./public/assets/streamnet-logo.svg
COPY netlify-auth-site/assets/streamnet-icon.svg ./public/assets/streamnet-icon.svg

EXPOSE 3000
CMD ["node", "src/server.js"]