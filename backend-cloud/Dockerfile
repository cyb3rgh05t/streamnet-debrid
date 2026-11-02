FROM node:24-alpine

RUN apk add --no-cache tzdata
ENV TZ=Europe/Berlin

WORKDIR /app
COPY backend-cloud/package.json backend-cloud/package-lock.json ./
RUN npm ci --omit=dev \
	&& mkdir -p /app/logs \
	&& chown 1000:1000 /app/logs
COPY backend-cloud/src ./src
COPY backend-cloud/scripts ./scripts
COPY backend-cloud/migrations ./migrations
COPY backend-cloud/public ./public

USER 1000:1000
EXPOSE 3000
CMD ["node", "src/server.js"]