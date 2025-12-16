#!/usr/bin/with-contenv bashio

# Get config values
AZURE_OPENAI_API_KEY=$(bashio::config 'AZURE_OPENAI_API_KEY')
AZURE_OPENAI_ENDPOINT=$(bashio::config 'AZURE_OPENAI_ENDPOINT')

# Get PostgreSQL service info
if bashio::services.available "postgres"; then
    POSTGRES_HOST=$(bashio::services "postgres" "host")
    POSTGRES_PORT=$(bashio::services "postgres" "port")
    POSTGRES_USER=$(bashio::services "postgres" "username")
    POSTGRES_PASS=$(bashio::services "postgres" "password")
    POSTGRES_DB="futterkasten"
    
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASS}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
else
    bashio::log.error "PostgreSQL service not available!"
    exit 1
fi

export AZURE_OPENAI_API_KEY
export AZURE_OPENAI_ENDPOINT
export NODE_ENV=production
export PORT=3000
export HOSTNAME="0.0.0.0"

# Push schema to database
bashio::log.info "Syncing database schema..."
cd /app
npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss 2>/dev/null || true

# Start the server
bashio::log.info "Starting Futterkasten..."
exec node server.js
