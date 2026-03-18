# Database Migrations

This directory contains TypeORM migrations for the FX Trading Backend database schema.

## Migration Files

### 1700000000000-InitialSchema.ts

Creates the complete database schema including:

**Tables:**
- `users` - User accounts with email, password hash, and verification status
- `wallets` - User wallets (one per user)
- `wallet_balances` - Multi-currency balances for each wallet
- `transactions` - Transaction history (funding, conversions, trades)
- `otps` - One-time passwords for email verification

**Constraints:**
- Primary keys on all tables (UUID)
- Unique constraints on:
  - `users.email`
  - `wallets.user_id`
  - `wallet_balances(wallet_id, currency)`
  - `transactions.idempotency_key`
- Foreign key constraints with CASCADE delete:
  - `wallets.user_id` → `users.id`
  - `wallet_balances.wallet_id` → `wallets.id`
  - `transactions.user_id` → `users.id`
  - `otps.user_id` → `users.id`
- Check constraint: `wallet_balances.balance >= 0`

**Indexes:**
- Unique index on `wallet_balances(wallet_id, currency)`
- Index on `transactions.user_id` for efficient user queries
- Index on `transactions.created_at DESC` for efficient history queries
- Index on `otps.user_id` for efficient OTP lookups

**Enums:**
- `transactions_type_enum`: FUNDING, CONVERSION, TRADE
- `transactions_status_enum`: SUCCESS, FAILED

## Prerequisites

Before running migrations, ensure:

1. PostgreSQL 14+ is installed and running
2. Database `fx_trading_db` exists (or update DATABASE_URL in .env)
3. Database user has CREATE privileges
4. Environment variables are configured in `.env` file

## Running Migrations

### Run all pending migrations:
```bash
npm run migration:run
```

Or using npx directly:
```bash
npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts
```

### Revert the last migration:
```bash
npm run migration:revert
```

Or using npx directly:
```bash
npx typeorm-ts-node-commonjs migration:revert -d src/config/data-source.ts
```

### Generate a new migration (after entity changes):
```bash
npm run migration:generate -- src/migrations/MigrationName
```

## Verification

After running migrations, verify the schema:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check constraints
SELECT constraint_name, table_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
ORDER BY table_name, constraint_type;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

## Migration Details

### Requirements Validated

This migration satisfies the following requirements from the specification:

- **Requirement 19.1**: PostgreSQL database engine
- **Requirement 19.2**: Users table with all required columns
- **Requirement 19.3**: Wallets table with user relationship
- **Requirement 19.4**: Wallet_balances table with currency and balance columns
- **Requirement 19.5**: Transactions table with all transaction details
- **Requirement 19.6**: OTPs table with hash and expiration
- **Requirement 19.7**: Unique indexes on email, wallet-currency pairs, and idempotency keys
- **Requirement 19.8**: Foreign key constraints with CASCADE delete
- **Requirement 19.9**: CHECK constraint for non-negative balances

### Schema Design Notes

1. **UUID Primary Keys**: All tables use UUID v4 for primary keys via `uuid_generate_v4()`
2. **Decimal Precision**: All monetary amounts use DECIMAL(18,6) to prevent floating-point errors
3. **Timestamps**: All tables have `created_at` and most have `updated_at` columns
4. **Cascade Deletes**: Deleting a user automatically removes all related data
5. **Idempotency**: Unique constraint on `transactions.idempotency_key` prevents duplicate transactions
6. **Performance**: Indexes on frequently queried columns (user_id, created_at)

## Troubleshooting

### Connection Refused Error
If you see `ECONNREFUSED` error:
- Ensure PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env matches your PostgreSQL configuration
- Verify PostgreSQL is listening on the correct port (default: 5432)

### Permission Denied Error
If you see permission errors:
- Ensure database user has CREATE privileges
- Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE fx_trading_db TO your_user;`

### Migration Already Run
If migration was already applied:
- Check migrations table: `SELECT * FROM migrations;`
- To re-run, first revert: `npm run migration:revert`

### UUID Extension Error
If you see "uuid-ossp extension not found":
- Connect to database and run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
- Or ensure your PostgreSQL user has CREATE EXTENSION privileges
