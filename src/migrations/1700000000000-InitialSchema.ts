import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "is_verified" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    // Create wallets table
    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallets_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wallets_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_wallets_user_id" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create wallet_balances table
    await queryRunner.query(`
      CREATE TABLE "wallet_balances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wallet_id" uuid NOT NULL,
        "currency" character varying(3) NOT NULL,
        "balance" numeric(18,6) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_balances_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wallet_balances_wallet_currency" UNIQUE ("wallet_id", "currency"),
        CONSTRAINT "CHK_wallet_balances_balance" CHECK (balance >= 0),
        CONSTRAINT "FK_wallet_balances_wallet_id" FOREIGN KEY ("wallet_id") 
          REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create index on wallet_balances
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_wallet_balances_wallet_currency" 
      ON "wallet_balances" ("wallet_id", "currency")
    `);

    // Create transactions table
    await queryRunner.query(`
      CREATE TYPE "transactions_type_enum" AS ENUM('FUNDING', 'CONVERSION', 'TRADE')
    `);

    await queryRunner.query(`
      CREATE TYPE "transactions_status_enum" AS ENUM('SUCCESS', 'FAILED')
    `);

    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "transactions_type_enum" NOT NULL,
        "source_currency" character varying(3),
        "target_currency" character varying(3),
        "source_amount" numeric(18,6),
        "target_amount" numeric(18,6),
        "fx_rate" numeric(18,6),
        "status" "transactions_status_enum" NOT NULL DEFAULT 'SUCCESS',
        "idempotency_key" character varying(64),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_transactions_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "FK_transactions_user_id" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create index on transactions for user_id and created_at (for efficient queries)
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_user_id" ON "transactions" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_created_at" ON "transactions" ("created_at" DESC)
    `);

    // Create otps table
    await queryRunner.query(`
      CREATE TABLE "otps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "otp_hash" character varying(255) NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "is_used" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otps_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_otps_user_id" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create index on otps for user_id (for efficient queries)
    await queryRunner.query(`
      CREATE INDEX "IDX_otps_user_id" ON "otps" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP INDEX "IDX_otps_user_id"`);
    await queryRunner.query(`DROP TABLE "otps"`);

    await queryRunner.query(`DROP INDEX "IDX_transactions_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_user_id"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE "transactions_type_enum"`);

    await queryRunner.query(`DROP INDEX "IDX_wallet_balances_wallet_currency"`);
    await queryRunner.query(`DROP TABLE "wallet_balances"`);

    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
