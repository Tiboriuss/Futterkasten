#!/usr/bin/with-contenv bashio

# Get config values
AZURE_OPENAI_API_KEY=$(bashio::config 'AZURE_OPENAI_API_KEY')
AZURE_OPENAI_ENDPOINT=$(bashio::config 'AZURE_OPENAI_ENDPOINT')
AZURE_RESOURCE_NAME=$(bashio::config 'AZURE_RESOURCE_NAME')
AZURE_OPENAI_DEPLOYMENT=$(bashio::config 'AZURE_OPENAI_DEPLOYMENT')
AZURE_API_VERSION=$(bashio::config 'AZURE_API_VERSION')
POSTGRES_HOST=$(bashio::config 'POSTGRES_HOST')
POSTGRES_PORT=$(bashio::config 'POSTGRES_PORT')
POSTGRES_USER=$(bashio::config 'POSTGRES_USER')
POSTGRES_PASSWORD=$(bashio::config 'POSTGRES_PASSWORD')
POSTGRES_DB=$(bashio::config 'POSTGRES_DB')

bashio::log.info "Starting Futterkasten version 1.0.44..."
bashio::log.info "Configuring environment..."
bashio::log.info "POSTGRES_HOST: $POSTGRES_HOST"
bashio::log.info "POSTGRES_PORT: $POSTGRES_PORT"
bashio::log.info "POSTGRES_USER: $POSTGRES_USER"
bashio::log.info "POSTGRES_DB: $POSTGRES_DB"

export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
export AZURE_OPENAI_API_KEY
export AZURE_API_KEY="$AZURE_OPENAI_API_KEY"
export AZURE_OPENAI_ENDPOINT
export AZURE_RESOURCE_NAME
export AZURE_OPENAI_DEPLOYMENT
export AZURE_API_VERSION
export NODE_ENV=production
export PORT=3000
export HOSTNAME="127.0.0.1"

cd /app

# Debug: Show schema content
bashio::log.info "Checking schema content..."
cat ./prisma/schema.prisma

# Run migrations
bashio::log.info "Running database migrations..."
# Try to run migrations normally (for fresh databases)
if prisma migrate deploy --schema=./prisma/schema.prisma 2>&1; then
  bashio::log.info "Migrations deployed successfully"
else
  bashio::log.warning "Migration deploy failed (likely existing DB with data), applying manually..."
  # For existing databases: apply SQL directly then mark as resolved
  bashio::log.info "Executing migration SQL directly..."
  if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f ./prisma/migrations/20251230121600_flexible_ingredient_units/migration.sql 2>&1; then
    bashio::log.info "Migration SQL executed successfully, marking as applied..."
    prisma migrate resolve --applied 20251230121600_flexible_ingredient_units --schema=./prisma/schema.prisma 2>&1 || true
  else
    bashio::log.error "Manual migration failed! Database may be in inconsistent state."
  fi
fi

# Start the Next.js server in background
bashio::log.info "Starting Futterkasten..."
DATABASE_URL="$DATABASE_URL" node server.js &

# Wait for Next.js to be ready
bashio::log.info "Waiting for Next.js to start..."
sleep 3

# Start WebSocket proxy for AI chat streaming (bypasses HA Core compression)
bashio::log.info "Starting WebSocket proxy for AI chat..."
node /app/ws-proxy.js &

# Start nginx (foreground to keep container running)
bashio::log.info "Starting nginx ingress proxy..."
exec nginx
