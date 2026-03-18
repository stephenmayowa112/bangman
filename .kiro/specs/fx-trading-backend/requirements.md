# Requirements Document

## Introduction

This document specifies the requirements for an FX Trading Backend system built with NestJS. The system enables users to register, verify their identity, manage multi-currency wallets, and trade currencies using real-time foreign exchange rates. The backend provides secure authentication, wallet funding, currency conversion, and comprehensive transaction tracking for a production-ready FX trading application.

## Glossary

- **User**: A registered individual who can authenticate and perform trading operations
- **Wallet**: A multi-currency account that holds balances for a User
- **Wallet_Balance**: A specific currency balance within a Wallet
- **Authentication_Service**: The system component responsible for user registration, verification, and JWT token management
- **Wallet_Service**: The system component responsible for managing wallet balances and fund operations
- **FX_Service**: The system component responsible for fetching and caching foreign exchange rates
- **Trading_Service**: The system component responsible for executing currency conversions and trades
- **Transaction_Service**: The system component responsible for recording and retrieving transaction history
- **OTP**: One-Time Password used for email verification
- **JWT**: JSON Web Token used for authentication
- **FX_Rate**: Foreign exchange rate between two currencies
- **Conversion**: An operation that exchanges one currency for another using the current FX rate
- **Trade**: Synonym for Conversion in this system
- **Transaction**: A recorded event of wallet activity (funding, conversion, or trade)
- **Supported_Currency**: One of NGN, USD, EUR, GBP, CAD, AUD, or JPY
- **Base_Currency**: Nigerian Naira (NGN), the default currency for new users
- **Rate_Cache**: Redis-based storage for temporarily holding FX rates
- **Idempotency_Key**: A unique identifier to prevent duplicate transaction processing

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to register with my email and password, so that I can create an account to access the trading platform.

#### Acceptance Criteria

1. WHEN a registration request is received with valid email and password, THE Authentication_Service SHALL create a new User record
2. WHEN a registration request is received, THE Authentication_Service SHALL generate a 6-digit OTP
3. WHEN a User is created, THE Authentication_Service SHALL send the OTP to the User's email address within 5 seconds
4. WHEN a User is created, THE Wallet_Service SHALL create a Wallet with 1000 NGN initial balance
5. THE Authentication_Service SHALL hash passwords using bcrypt with a cost factor of 10 before storage
6. WHEN a registration request contains an email that already exists, THE Authentication_Service SHALL return an error with status code 409
7. THE Authentication_Service SHALL validate that email addresses conform to RFC 5322 format
8. THE Authentication_Service SHALL validate that passwords contain at least 8 characters
9. WHEN an OTP is generated, THE Authentication_Service SHALL set an expiration time of 10 minutes
10. THE Authentication_Service SHALL store OTPs in a secure, hashed format

### Requirement 2: Email Verification

**User Story:** As a registered user, I want to verify my email with an OTP, so that I can prove ownership of my email address and access trading features.

#### Acceptance Criteria

1. WHEN a verification request is received with a valid OTP, THE Authentication_Service SHALL mark the User as verified
2. WHEN a verification request is received with an expired OTP, THE Authentication_Service SHALL return an error with status code 400
3. WHEN a verification request is received with an invalid OTP, THE Authentication_Service SHALL return an error with status code 400
4. WHEN an OTP is successfully used, THE Authentication_Service SHALL invalidate that OTP to prevent reuse
5. WHEN a User is verified, THE Authentication_Service SHALL allow the User to access protected endpoints
6. THE Authentication_Service SHALL limit OTP verification attempts to 5 per User per hour
7. WHEN a User requests OTP resend, THE Authentication_Service SHALL invalidate previous OTPs and generate a new one

### Requirement 3: User Authentication

**User Story:** As a verified user, I want to log in with my credentials, so that I can access my wallet and perform trading operations.

#### Acceptance Criteria

1. WHEN a login request is received with valid credentials from a verified User, THE Authentication_Service SHALL generate a JWT access token with 15-minute expiration
2. WHEN a login request is received with valid credentials from a verified User, THE Authentication_Service SHALL generate a JWT refresh token with 7-day expiration
3. WHEN a login request is received from an unverified User, THE Authentication_Service SHALL return an error with status code 403
4. WHEN a login request is received with invalid credentials, THE Authentication_Service SHALL return an error with status code 401
5. THE Authentication_Service SHALL include User ID and email in JWT payload
6. WHEN a refresh token request is received with a valid refresh token, THE Authentication_Service SHALL generate a new access token
7. WHEN a refresh token request is received with an invalid or expired refresh token, THE Authentication_Service SHALL return an error with status code 401
8. THE Authentication_Service SHALL rate limit login attempts to 5 per IP address per minute

### Requirement 4: Multi-Currency Wallet Management

**User Story:** As a verified user, I want to view my wallet balances across multiple currencies, so that I can track my holdings in different currencies.

#### Acceptance Criteria

1. WHEN a wallet balance query is received, THE Wallet_Service SHALL return all Wallet_Balance records for the authenticated User
2. THE Wallet_Service SHALL support balances in NGN, USD, EUR, GBP, CAD, AUD, and JPY
3. WHEN a new User is created, THE Wallet_Service SHALL create a Wallet_Balance record with 1000.000000 NGN
4. THE Wallet_Service SHALL store all monetary amounts as DECIMAL(18,6) to prevent floating-point errors
5. WHEN a Wallet_Balance for a currency does not exist, THE Wallet_Service SHALL treat the balance as 0.000000
6. THE Wallet_Service SHALL return balance amounts with 6 decimal places precision
7. WHEN a wallet query is received from an unauthenticated User, THE Wallet_Service SHALL return an error with status code 401

### Requirement 5: Wallet Funding

**User Story:** As a verified user, I want to fund my wallet with Naira, so that I can increase my NGN balance for trading.

#### Acceptance Criteria

1. WHEN a funding request is received with a valid amount and idempotency key, THE Wallet_Service SHALL increase the User's NGN Wallet_Balance by the specified amount
2. THE Wallet_Service SHALL only accept funding in Base_Currency (NGN)
3. THE Wallet_Service SHALL validate that funding amounts are greater than 0 and less than or equal to 10000000.000000
4. WHEN a funding request is received with a duplicate idempotency key, THE Wallet_Service SHALL return the original transaction result without creating a duplicate
5. THE Wallet_Service SHALL use pessimistic locking when updating Wallet_Balance records to prevent race conditions
6. WHEN a funding operation succeeds, THE Transaction_Service SHALL create a Transaction record with type "FUNDING"
7. THE Wallet_Service SHALL complete funding operations atomically within a database transaction
8. WHEN a funding request is received from an unverified User, THE Wallet_Service SHALL return an error with status code 403

### Requirement 6: FX Rate Integration

**User Story:** As a system administrator, I want the system to fetch real-time FX rates from a third-party API, so that users can trade at current market rates.

#### Acceptance Criteria

1. WHEN the system starts, THE FX_Service SHALL fetch exchange rates from exchangerate-api.com
2. THE FX_Service SHALL cache FX_Rate data in Rate_Cache for 5 minutes
3. WHEN an FX rate is requested and exists in Rate_Cache, THE FX_Service SHALL return the cached rate
4. WHEN an FX rate is requested and does not exist in Rate_Cache, THE FX_Service SHALL fetch fresh rates from the external API
5. WHEN the external API request fails, THE FX_Service SHALL retry up to 3 times with exponential backoff
6. IF all retry attempts fail, THEN THE FX_Service SHALL return an error with status code 503
7. THE FX_Service SHALL store rates for all Supported_Currency pairs
8. THE FX_Service SHALL validate that fetched rates are positive numbers
9. WHEN rates are fetched, THE FX_Service SHALL include a timestamp indicating when the rates were retrieved

### Requirement 7: Currency Conversion

**User Story:** As a verified user, I want to convert one currency to another, so that I can hold balances in different currencies for trading purposes.

#### Acceptance Criteria

1. WHEN a conversion request is received with valid source currency, target currency, and amount, THE Trading_Service SHALL calculate the target amount using the current FX_Rate
2. WHEN a conversion request is received, THE Trading_Service SHALL verify the User has sufficient balance in the source currency
3. WHEN insufficient balance exists, THE Trading_Service SHALL return an error with status code 400
4. WHEN a conversion is executed, THE Trading_Service SHALL decrease the source Wallet_Balance and increase the target Wallet_Balance atomically
5. THE Trading_Service SHALL use pessimistic locking on both Wallet_Balance records during conversion
6. WHEN a conversion succeeds, THE Transaction_Service SHALL create a Transaction record with type "CONVERSION"
7. THE Transaction_Service SHALL record the FX_Rate used, source currency, target currency, source amount, and target amount
8. THE Trading_Service SHALL validate that both source and target currencies are Supported_Currency values
9. WHEN a conversion request contains source and target currencies that are identical, THE Trading_Service SHALL return an error with status code 400
10. THE Trading_Service SHALL validate that conversion amounts are greater than 0
11. WHEN a conversion request is received with a duplicate idempotency key, THE Trading_Service SHALL return the original transaction result

### Requirement 8: Naira Trading Operations

**User Story:** As a verified user, I want to trade Naira for other currencies and vice versa, so that I can exchange my Base_Currency holdings.

#### Acceptance Criteria

1. WHEN a trade request is received to convert NGN to another Supported_Currency, THE Trading_Service SHALL execute the conversion using the current FX_Rate
2. WHEN a trade request is received to convert another Supported_Currency to NGN, THE Trading_Service SHALL execute the conversion using the current FX_Rate
3. THE Trading_Service SHALL apply the same validation and execution logic as currency conversion
4. WHEN a trade succeeds, THE Transaction_Service SHALL create a Transaction record with type "TRADE"
5. THE Trading_Service SHALL ensure atomic balance updates for trade operations
6. WHEN a trade request involves currencies other than NGN on at least one side, THE Trading_Service SHALL process the trade successfully

### Requirement 9: Transaction History

**User Story:** As a verified user, I want to view my transaction history, so that I can track all my wallet activities and trades.

#### Acceptance Criteria

1. WHEN a transaction history request is received, THE Transaction_Service SHALL return all Transaction records for the authenticated User
2. THE Transaction_Service SHALL include transaction type, amount, currency, FX_Rate (if applicable), timestamp, and status in each record
3. THE Transaction_Service SHALL support pagination with default page size of 20 records
4. THE Transaction_Service SHALL order transactions by timestamp in descending order (newest first)
5. THE Transaction_Service SHALL support filtering by transaction type (FUNDING, CONVERSION, TRADE)
6. THE Transaction_Service SHALL support filtering by date range
7. THE Transaction_Service SHALL support filtering by currency
8. WHEN a transaction history request is received from an unauthenticated User, THE Transaction_Service SHALL return an error with status code 401

### Requirement 10: API Rate Limiting

**User Story:** As a system administrator, I want to rate limit API requests, so that I can prevent abuse and ensure fair resource usage.

#### Acceptance Criteria

1. THE Authentication_Service SHALL limit requests to 10 per minute per IP address for public endpoints
2. THE Wallet_Service SHALL limit requests to 60 per minute per authenticated User for wallet operations
3. THE Trading_Service SHALL limit requests to 30 per minute per authenticated User for conversion and trade operations
4. THE FX_Service SHALL limit requests to 100 per minute per authenticated User for rate queries
5. WHEN rate limits are exceeded, THE system SHALL return an error with status code 429
6. THE system SHALL include rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) in all responses

### Requirement 11: Input Validation

**User Story:** As a system administrator, I want all API inputs to be validated, so that I can prevent invalid data from entering the system.

#### Acceptance Criteria

1. THE system SHALL validate all request bodies using class-validator decorators
2. WHEN validation fails, THE system SHALL return an error with status code 400 and detailed validation messages
3. THE system SHALL validate email format, password strength, currency codes, and numeric ranges
4. THE system SHALL sanitize all string inputs to prevent SQL injection and XSS attacks
5. THE system SHALL validate that currency codes are exactly 3 uppercase letters
6. THE system SHALL validate that monetary amounts do not exceed 18 digits total with 6 decimal places

### Requirement 12: Error Handling

**User Story:** As a developer, I want comprehensive error handling, so that I can debug issues and provide clear feedback to users.

#### Acceptance Criteria

1. THE system SHALL return consistent error response format with status code, message, and error code
2. THE system SHALL log all errors with severity level, timestamp, and stack trace
3. WHEN database errors occur, THE system SHALL return an error with status code 500 without exposing internal details
4. WHEN external API errors occur, THE system SHALL return an error with status code 503
5. THE system SHALL use custom exception filters to handle NestJS exceptions
6. THE system SHALL include request ID in all error responses for traceability

### Requirement 13: API Documentation

**User Story:** As a developer, I want comprehensive API documentation, so that I can understand and integrate with the API endpoints.

#### Acceptance Criteria

1. THE system SHALL expose Swagger documentation at /api/docs endpoint
2. THE system SHALL document all endpoints with request/response schemas, status codes, and descriptions
3. THE system SHALL include authentication requirements in Swagger documentation
4. THE system SHALL provide example requests and responses for all endpoints
5. THE system SHALL document all error responses with status codes and error formats

### Requirement 14: Data Consistency and Atomicity

**User Story:** As a system administrator, I want all financial operations to be atomic, so that I can ensure data consistency and prevent partial updates.

#### Acceptance Criteria

1. THE Wallet_Service SHALL wrap all balance updates in database transactions
2. THE Trading_Service SHALL wrap all conversion operations in database transactions
3. WHEN a transaction fails, THE system SHALL rollback all changes within that transaction
4. THE system SHALL use pessimistic locking (SELECT FOR UPDATE) for all wallet balance reads before updates
5. THE system SHALL ensure that concurrent operations on the same Wallet_Balance are serialized
6. THE system SHALL validate balance constraints (non-negative) at the database level using CHECK constraints

### Requirement 15: Idempotency for Financial Transactions

**User Story:** As a verified user, I want duplicate transaction requests to be handled safely, so that I don't accidentally fund my wallet or trade twice.

#### Acceptance Criteria

1. THE Wallet_Service SHALL require an idempotency key for all funding operations
2. THE Trading_Service SHALL require an idempotency key for all conversion and trade operations
3. WHEN a request is received with an idempotency key that was processed within the last 24 hours, THE system SHALL return the original response
4. THE system SHALL store idempotency keys with their associated transaction results for 24 hours
5. THE system SHALL validate that idempotency keys are UUIDs or strings between 16 and 64 characters
6. WHEN an idempotency key is reused with different request parameters, THE system SHALL return an error with status code 422

### Requirement 16: Security and Authentication

**User Story:** As a system administrator, I want secure authentication and authorization, so that I can protect user data and prevent unauthorized access.

#### Acceptance Criteria

1. THE system SHALL use JWT tokens for authentication with HS256 algorithm
2. THE system SHALL validate JWT signatures on all protected endpoints
3. THE system SHALL reject expired JWT tokens with status code 401
4. THE system SHALL use environment variables for JWT secret keys
5. THE system SHALL implement CORS with configurable allowed origins
6. THE system SHALL use helmet middleware for security headers
7. THE system SHALL hash all passwords with bcrypt before storage
8. THE system SHALL never return password hashes in API responses
9. THE system SHALL validate that authenticated User ID matches the resource owner for all user-specific operations

### Requirement 17: Configuration Management

**User Story:** As a system administrator, I want externalized configuration, so that I can deploy the application across different environments without code changes.

#### Acceptance Criteria

1. THE system SHALL load configuration from environment variables
2. THE system SHALL validate required environment variables on startup
3. THE system SHALL support configuration for database connection, Redis connection, JWT secrets, email provider, and external API keys
4. WHEN required environment variables are missing, THE system SHALL fail to start and log descriptive error messages
5. THE system SHALL provide default values for non-critical configuration parameters
6. THE system SHALL support different configuration profiles for development, staging, and production environments

### Requirement 18: Email Notification Service

**User Story:** As a verified user, I want to receive email notifications for important events, so that I can stay informed about my account activity.

#### Acceptance Criteria

1. WHEN a User registers, THE Authentication_Service SHALL send an email containing the OTP
2. THE system SHALL use SMTP protocol for sending emails
3. THE system SHALL support configurable email templates for OTP verification
4. WHEN email sending fails, THE system SHALL log the error but not fail the registration process
5. THE system SHALL retry failed email sends up to 2 times with 5-second delays
6. THE system SHALL include the application name and sender email in all outgoing emails

### Requirement 19: Database Schema Design

**User Story:** As a database administrator, I want a well-designed schema, so that I can ensure data integrity and query performance.

#### Acceptance Criteria

1. THE system SHALL use PostgreSQL as the database engine
2. THE system SHALL define a users table with columns: id (UUID), email (VARCHAR), password_hash (VARCHAR), is_verified (BOOLEAN), created_at (TIMESTAMP), updated_at (TIMESTAMP)
3. THE system SHALL define a wallets table with columns: id (UUID), user_id (UUID FK), created_at (TIMESTAMP), updated_at (TIMESTAMP)
4. THE system SHALL define a wallet_balances table with columns: id (UUID), wallet_id (UUID FK), currency (VARCHAR(3)), balance (DECIMAL(18,6)), created_at (TIMESTAMP), updated_at (TIMESTAMP)
5. THE system SHALL define a transactions table with columns: id (UUID), user_id (UUID FK), type (ENUM), source_currency (VARCHAR(3)), target_currency (VARCHAR(3)), source_amount (DECIMAL(18,6)), target_amount (DECIMAL(18,6)), fx_rate (DECIMAL(18,6)), status (ENUM), idempotency_key (VARCHAR), created_at (TIMESTAMP)
6. THE system SHALL define a otps table with columns: id (UUID), user_id (UUID FK), otp_hash (VARCHAR), expires_at (TIMESTAMP), is_used (BOOLEAN), created_at (TIMESTAMP)
7. THE system SHALL create unique indexes on users.email, wallet_balances(wallet_id, currency), and transactions.idempotency_key
8. THE system SHALL create foreign key constraints with CASCADE delete for wallet relationships
9. THE system SHALL add CHECK constraints to ensure wallet_balances.balance >= 0

### Requirement 20: Testing Requirements

**User Story:** As a developer, I want comprehensive unit tests, so that I can ensure code quality and catch regressions early.

#### Acceptance Criteria

1. THE system SHALL include unit tests for Authentication_Service with minimum 80% code coverage
2. THE system SHALL include unit tests for Wallet_Service with minimum 80% code coverage
3. THE system SHALL include unit tests for Trading_Service with minimum 80% code coverage
4. THE system SHALL include unit tests for FX_Service with minimum 80% code coverage
5. THE system SHALL mock external dependencies (database, Redis, email, external APIs) in unit tests
6. THE system SHALL test error scenarios including insufficient balance, invalid inputs, and external API failures
7. THE system SHALL test concurrent wallet operations to verify locking mechanisms
8. THE system SHALL test idempotency key handling for duplicate requests

## Key Assumptions

1. New users receive exactly 1000.000000 NGN as initial balance upon registration
2. FX rates are cached in Redis for 5 minutes to balance freshness and performance
3. OTP codes expire after 10 minutes and are single-use only
4. Supported currencies are limited to: NGN, USD, EUR, GBP, CAD, AUD, JPY
5. PostgreSQL is chosen over MySQL for better support of DECIMAL precision and advanced features
6. All monetary values are stored as DECIMAL(18,6) to prevent floating-point arithmetic errors
7. A separate wallet_balances table is used to support multi-currency balances efficiently
8. Idempotency keys are stored for 24 hours to handle duplicate requests
9. The system uses exchangerate-api.com as the FX rate provider
10. JWT access tokens expire after 15 minutes, refresh tokens after 7 days
11. Rate limiting is applied per IP for public endpoints and per User for authenticated endpoints
12. All financial operations use pessimistic locking to prevent race conditions
13. The system operates in UTC timezone for all timestamps
14. Email verification is mandatory before accessing trading features
15. Funding operations only accept NGN (Base_Currency)
16. The system supports both "conversion" and "trade" operations with identical logic
17. Transaction history is paginated with a default page size of 20 records
18. Password minimum length is 8 characters with bcrypt cost factor of 10
19. Maximum funding amount per transaction is 10,000,000 NGN
20. The system uses UUID v4 for all primary keys
