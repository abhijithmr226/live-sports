FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json ./
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

COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000

CMD ["node", "backend/dist/index.js"]
