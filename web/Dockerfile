FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN mkdir -p public
ARG NEXT_PUBLIC_SELF_HOSTED="true"
ARG NEXT_TELEMETRY_DISABLED="1"
ARG STREAMNET_BACKEND_URL="https://auth.mystreamnet.club"
ARG NEXT_PUBLIC_STREAMNET_TV_XTREAM_URL="https://xui.streamnet.live"
ARG NEXT_PUBLIC_STREAMNET_MEDIA_RESOLVER_URL=""
ARG NEXT_PUBLIC_TRAKT_CLIENT_ID=""
ARG NEXT_PUBLIC_BUILD_STAMP=""
ARG NEXT_PUBLIC_APK_VERSION=""
ENV NEXT_PUBLIC_SELF_HOSTED=${NEXT_PUBLIC_SELF_HOSTED}
ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}
ENV STREAMNET_BACKEND_URL=${STREAMNET_BACKEND_URL}
ENV NEXT_PUBLIC_STREAMNET_TV_XTREAM_URL=${NEXT_PUBLIC_STREAMNET_TV_XTREAM_URL}
ENV NEXT_PUBLIC_STREAMNET_MEDIA_RESOLVER_URL=${NEXT_PUBLIC_STREAMNET_MEDIA_RESOLVER_URL}
ENV NEXT_PUBLIC_TRAKT_CLIENT_ID=${NEXT_PUBLIC_TRAKT_CLIENT_ID}
ENV NEXT_PUBLIC_BUILD_STAMP=${NEXT_PUBLIC_BUILD_STAMP}
ENV NEXT_PUBLIC_APK_VERSION=${NEXT_PUBLIC_APK_VERSION}
RUN if [ -n "$NEXT_PUBLIC_BUILD_STAMP" ]; then \
			stamp="$NEXT_PUBLIC_BUILD_STAMP"; \
			case "$stamp" in \
				''|*[!0-9]*) stamp="$(date -d "$stamp" +%s)000" ;; \
			esac; \
			printf '{ "v": "%s" }\n' "$stamp" > public/version.json; \
		fi
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0"]
