FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Install dependencies
RUN npm install

# Copy source code
COPY shared/ ./shared/
COPY backend/ ./backend/

# Build shared and backend
RUN npm run build --workspace=@cloudcast/shared
RUN npm run build --workspace=@cloudcast/backend

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install FFmpeg and FFprobe in container
RUN apk add --no-cache ffmpeg

# Copy full workspace files so shared library and symlinks resolve
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend ./backend

EXPOSE 4000

CMD ["sh", "-c", "node backend/dist/index.js"]
