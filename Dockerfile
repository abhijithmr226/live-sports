FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all workspace dependencies
RUN npm install

# Copy source trees
COPY shared/ ./shared/
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Build all packages
RUN npm run build --workspace=@cloudcast/shared
RUN npm run build --workspace=@cloudcast/backend
RUN npm run build --workspace=frontend

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install FFmpeg and FFprobe in container for live relaying
RUN apk add --no-cache ffmpeg

# Copy compiled artifacts and modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend ./frontend
COPY start-render.sh ./

RUN chmod +x ./start-render.sh

EXPOSE 3000 4000 10000

CMD ["./start-render.sh"]
