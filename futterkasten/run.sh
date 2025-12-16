#!/usr/bin/with-contenv bashio

# Get config values
AZURE_OPENAI_API_KEY=$(bashio::config 'AZURE_OPENAI_API_KEY')
AZURE_OPENAI_ENDPOINT=$(bashio::config 'AZURE_OPENAI_ENDPOINT')
POSTGRES_HOST=$(bashio::config 'POSTGRES_HOST')
POSTGRES_PORT=$(bashio::config 'POSTGRES_PORT')
POSTGRES_USER=$(bashio::config 'POSTGRES_USER')
POSTGRES_PASSWORD=$(bashio::config 'POSTGRES_PASSWORD')
POSTGRES_DB=$(bashio::config 'POSTGRES_DB')

export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
export AZURE_OPENAI_API_KEY
export AZURE_OPENAI_ENDPOINT
export NODE_ENV=production
export PORT=3000
export HOSTNAME="127.0.0.1"

cd /app

# Push schema to database
bashio::log.info "Syncing database schema..."
prisma db push --schema=./prisma/schema.prisma --accept-data-loss 2>&1 || bashio::log.warning "Schema push failed, continuing anyway..."

# Start nginx in background
bashio::log.info "Starting nginx reverse proxy..."
nginx

# Start the Next.js server
bashio::log.info "Starting Futterkasten..."
exec node server.js
