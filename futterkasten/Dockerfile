ARG BUILD_FROM=ghcr.io/hassio-addons/base:stable
FROM ${BUILD_FROM}

RUN apk add --no-cache nodejs npm libc6-compat openssl git nginx postgresql-client \
    && mkdir -p /run/nginx

WORKDIR /app

# Cache bust - change this to force fresh clone
ARG CACHEBUST=20251230-autocomplete-enter
# Clone the repository and build
RUN git clone --depth 1 https://github.com/Tiboriuss/Futterkasten.git /tmp/app \
    && cd /tmp/app \
    && rm -f prisma.config.ts \
    && npm install \
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
RUN npm install -g prisma@5.22.0

# Copy nginx config and run script
COPY nginx.conf /etc/nginx/nginx.conf
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# Copy WebSocket proxy to /app and install ws package
COPY ws-proxy.js /app/ws-proxy.js
RUN cd /app && npm install ws

CMD ["/run.sh"]
