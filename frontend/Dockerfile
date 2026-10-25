FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

RUN npm install

COPY shared/ ./shared/
COPY frontend/ ./frontend/

RUN npm run build --workspace=@cloudcast/shared
RUN npm run build --workspace=frontend

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy root workspace structure so shared library and symlinks resolve
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/frontend ./frontend

WORKDIR /app/frontend

EXPOSE 3000

CMD ["sh", "-c", "npx next start -p ${PORT:-3000}"]
