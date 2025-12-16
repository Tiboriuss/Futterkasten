ARG BUILD_FROM=ghcr.io/hassio-addons/base:stable
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files from parent directory (build context is repo root)
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# Copy all source files
COPY . .

# Generate Prisma Client
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runner stage
FROM ${BUILD_FROM}

RUN apk add --no-cache nodejs npm libc6-compat openssl

WORKDIR /app

# Copy standalone build from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Install prisma CLI for db push
RUN npm install -g prisma@7.1.0

# Copy run script
COPY futterkasten/run.sh /run.sh
RUN chmod a+x /run.sh

CMD ["/run.sh"]
