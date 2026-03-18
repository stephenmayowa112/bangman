#!/bin/bash

# FX Trading Backend - Database Setup Script
# This script sets up the PostgreSQL database and runs migrations

set -e

echo "🚀 FX Trading Backend - Database Setup"
echo "======================================="

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✓ Loaded environment variables from .env"
else
    echo "❌ Error: .env file not found"
    exit 1
fi

# Extract database details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\(.*\)/\1/p')

echo ""
echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if PostgreSQL is running
echo "📡 Checking PostgreSQL connection..."
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; then
    echo "❌ Error: Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT"
    echo "   Please ensure PostgreSQL is running and accessible"
    exit 1
fi
echo "✓ PostgreSQL is running"

# Check if database exists
echo ""
echo "🔍 Checking if database exists..."
if PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "✓ Database '$DB_NAME' already exists"
else
    echo "📦 Creating database '$DB_NAME'..."
    PGPASSWORD=$DB_PASS createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
    echo "✓ Database created successfully"
fi

# Enable UUID extension
echo ""
echo "🔧 Enabling UUID extension..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" > /dev/null
echo "✓ UUID extension enabled"

# Run migrations
echo ""
echo "🔄 Running database migrations..."
npm run migration:run

echo ""
echo "✅ Database setup completed successfully!"
echo ""
echo "Next steps:"
echo "  1. Start the application: npm run start:dev"
echo "  2. Access API documentation: http://localhost:3000/api/docs"
echo "  3. Check health endpoint: http://localhost:3000/health"
