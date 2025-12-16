ARG BUILD_FROM
FROM ${BUILD_FROM}

# Install Node.js
RUN apk add --no-cache nodejs npm libc6-compat openssl

WORKDIR /app

# Copy built application
COPY rootfs /

# Copy application files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Generate Prisma Client
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Copy pre-built Next.js standalone
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

# Run script
COPY homeassistant/run.sh /run.sh
RUN chmod a+x /run.sh

CMD ["/run.sh"]
