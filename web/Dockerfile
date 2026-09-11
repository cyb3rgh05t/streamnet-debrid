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
ENV NEXT_PUBLIC_SELF_HOSTED=${NEXT_PUBLIC_SELF_HOSTED}
ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}
ENV STREAMNET_BACKEND_URL=${STREAMNET_BACKEND_URL}
ENV NEXT_PUBLIC_STREAMNET_TV_XTREAM_URL=${NEXT_PUBLIC_STREAMNET_TV_XTREAM_URL}
ENV NEXT_PUBLIC_STREAMNET_MEDIA_RESOLVER_URL=${NEXT_PUBLIC_STREAMNET_MEDIA_RESOLVER_URL}
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
