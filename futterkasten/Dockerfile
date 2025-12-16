ARG BUILD_FROM=ghcr.io/hassio-addons/base:stable
FROM ${BUILD_FROM}

RUN apk add --no-cache nodejs npm libc6-compat openssl git nginx \
    && mkdir -p /run/nginx

WORKDIR /app

# Cache bust - change this to force fresh clone
ARG CACHEBUST=20251216-fix
# Clone the repository and build
RUN git clone --depth 1 https://github.com/Tiboriuss/Futterkasten.git /tmp/app \
    && cd /tmp/app \
    && npm ci \
    && DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate \
    && NEXT_TELEMETRY_DISABLED=1 npm run build \
    && cp -r /tmp/app/.next/standalone/. /app/ \
    && cp -r /tmp/app/.next/static /app/.next/static \
    && cp -r /tmp/app/public /app/public \
    && cp -r /tmp/app/prisma /app/prisma \
    && cp -r /tmp/app/node_modules/.prisma /app/node_modules/.prisma \
    && cp -r /tmp/app/node_modules/@prisma /app/node_modules/@prisma \
    && rm -rf /tmp/app

# Install prisma CLI
RUN npm install -g prisma@7.1.0

# Copy nginx config and run script
COPY nginx.conf /etc/nginx/nginx.conf
COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD ["/run.sh"]
