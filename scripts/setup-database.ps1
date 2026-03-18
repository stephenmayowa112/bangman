# FX Trading Backend - Database Setup Script (PowerShell)
# This script sets up the PostgreSQL database and runs migrations

$ErrorActionPreference = "Stop"

Write-Host "🚀 FX Trading Backend - Database Setup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
    Write-Host "✓ Loaded environment variables from .env" -ForegroundColor Green
} else {
    Write-Host "❌ Error: .env file not found" -ForegroundColor Red
    exit 1
}

# Extract database details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
$DATABASE_URL = $env:DATABASE_URL
if ($DATABASE_URL -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $DB_USER = $matches[1]
    $DB_PASS = $matches[2]
    $DB_HOST = $matches[3]
    $DB_PORT = $matches[4]
    $DB_NAME = $matches[5]
} else {
    Write-Host "❌ Error: Invalid DATABASE_URL format" -ForegroundColor Red
    exit 1
}

Write-Host "Database Configuration:" -ForegroundColor Yellow
Write-Host "  Host: $DB_HOST"
Write-Host "  Port: $DB_PORT"
Write-Host "  Database: $DB_NAME"
Write-Host "  User: $DB_USER"
Write-Host ""

# Set PostgreSQL password environment variable
$env:PGPASSWORD = $DB_PASS

# Check if PostgreSQL is running
Write-Host "📡 Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    $null = & pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER 2>&1
    Write-Host "✓ PostgreSQL is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Cannot connect to PostgreSQL at ${DB_HOST}:${DB_PORT}" -ForegroundColor Red
    Write-Host "   Please ensure PostgreSQL is running and accessible" -ForegroundColor Red
    exit 1
}

# Check if database exists
Write-Host ""
Write-Host "🔍 Checking if database exists..." -ForegroundColor Yellow
$dbExists = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt 2>&1 | Select-String -Pattern $DB_NAME -Quiet

if ($dbExists) {
    Write-Host "✓ Database '$DB_NAME' already exists" -ForegroundColor Green
} else {
    Write-Host "📦 Creating database '$DB_NAME'..." -ForegroundColor Yellow
    & createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
    Write-Host "✓ Database created successfully" -ForegroundColor Green
}

# Enable UUID extension
Write-Host ""
Write-Host "🔧 Enabling UUID extension..." -ForegroundColor Yellow
$null = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS `"uuid-ossp`";" 2>&1
Write-Host "✓ UUID extension enabled" -ForegroundColor Green

# Run migrations
Write-Host ""
Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
npm run migration:run

Write-Host ""
Write-Host "✅ Database setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start the application: npm run start:dev"
Write-Host "  2. Access API documentation: http://localhost:3000/api/docs"
Write-Host "  3. Check health endpoint: http://localhost:3000/health"
