FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN mkdir -p public
ARG NEXT_TELEMETRY_DISABLED="1"
ARG STREAMNET_BACKEND_URL="https://auth.mystreamnet.club"
ARG BUILD_STAMP=""
ARG APK_VERSION=""
ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}
ENV STREAMNET_BACKEND_URL=${STREAMNET_BACKEND_URL}
ENV BUILD_STAMP=${BUILD_STAMP}
ENV APK_VERSION=${APK_VERSION}
RUN if [ -n "$BUILD_STAMP" ]; then \
			stamp="$BUILD_STAMP"; \
			case "$stamp" in \
				''|*[!0-9]*) stamp="$(date -d "$stamp" +%s)000" ;; \
			esac; \
			printf '{ "v": "%s" }\n' "$stamp" > public/version.json; \
		fi
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache ffmpeg
# Image defaults for the browser settings; a value in the server .env overrides them at runtime.
ARG STREAMNET_TV_XTREAM_URL="https://xyzxyz.streamnet.live"
ARG STREAMNET_MEDIA_RESOLVER_URL=""
ARG TRAKT_CLIENT_ID=""
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SELF_HOSTED=true
ENV STREAMNET_TV_XTREAM_URL=${STREAMNET_TV_XTREAM_URL}
ENV STREAMNET_MEDIA_RESOLVER_URL=${STREAMNET_MEDIA_RESOLVER_URL}
ENV TRAKT_CLIENT_ID=${TRAKT_CLIENT_ID}
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0"]
