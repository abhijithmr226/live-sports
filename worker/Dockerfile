FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY shared/package.json ./shared/
COPY worker/package.json ./worker/

RUN npm install

COPY shared/ ./shared/
COPY worker/ ./worker/

RUN npm run build --workspace=@cloudcast/shared
RUN npm run build --workspace=@cloudcast/worker

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install FFmpeg and FFprobe
RUN apk add --no-cache ffmpeg

COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/worker/package.json ./worker/
COPY --from=builder /app/worker/dist ./worker/dist
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "worker/dist/index.js"]
