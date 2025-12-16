#!/usr/bin/with-contenv bashio

# Get config values
AZURE_OPENAI_API_KEY=$(bashio::config 'AZURE_OPENAI_API_KEY')
AZURE_OPENAI_ENDPOINT=$(bashio::config 'AZURE_OPENAI_ENDPOINT')
POSTGRES_HOST=$(bashio::config 'POSTGRES_HOST')
POSTGRES_PORT=$(bashio::config 'POSTGRES_PORT')
POSTGRES_USER=$(bashio::config 'POSTGRES_USER')
POSTGRES_PASSWORD=$(bashio::config 'POSTGRES_PASSWORD')
POSTGRES_DB=$(bashio::config 'POSTGRES_DB')

bashio::log.info "Configuring environment..."
bashio::log.info "POSTGRES_HOST: $POSTGRES_HOST"
bashio::log.info "POSTGRES_PORT: $POSTGRES_PORT"
bashio::log.info "POSTGRES_USER: $POSTGRES_USER"
bashio::log.info "POSTGRES_DB: $POSTGRES_DB"

# core-mariadb uses MySQL protocol
export DATABASE_URL="mysql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
export AZURE_OPENAI_API_KEY
export AZURE_OPENAI_ENDPOINT
export NODE_ENV=production
export PORT=3000
export HOSTNAME="127.0.0.1"

cd /app

# Push schema to database
bashio::log.info "Syncing database schema..."
prisma db push --schema=./prisma/schema.prisma --accept-data-loss 2>&1 || bashio::log.warning "Schema push failed, continuing anyway..."

# Start the Next.js server in background
bashio::log.info "Starting Futterkasten..."
DATABASE_URL="$DATABASE_URL" node server.js &

# Wait for Next.js to be ready
bashio::log.info "Waiting for Next.js to start..."
sleep 3

# Start nginx (foreground to keep container running)
bashio::log.info "Starting nginx ingress proxy..."
exec nginx
