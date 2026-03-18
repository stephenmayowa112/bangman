# Implementation Plan: FX Trading Backend

## Overview

This implementation plan breaks down the FX Trading Backend into discrete coding tasks. The system is a production-ready NestJS REST API with user authentication, multi-currency wallet management, real-time FX rate integration, and currency trading capabilities. The implementation follows a bottom-up approach: infrastructure setup, database layer, core services, API controllers, security, and testing.

## Tasks

- [x] 1. Project setup and infrastructure configuration
  - Initialize NestJS project with TypeScript
  - Install dependencies: @nestjs/typeorm, @nestjs/jwt, @nestjs/passport, @nestjs/throttler, @nestjs/swagger, typeorm, pg, redis, bcrypt, class-validator, class-transformer, nodemailer, axios, helmet
  - Configure environment variables (.env file with DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FX_API_URL)
  - Set up TypeORM configuration for PostgreSQL with connection pooling
  - Set up Redis client configuration
  - Configure global validation pipe with whitelist and transform options
  - Configure Swagger documentation at /api/docs endpoint
  - Set up helmet middleware for security headers
  - Configure CORS with allowed origins
  - _Requirements: 17.1, 17.2, 17.3, 16.5, 16.6, 13.1_

- [ ] 2. Database entities and migrations
  - [x] 2.1 Create User entity
    - Define User entity with id (UUID), email (unique), passwordHash, isVerified (default false), createdAt, updatedAt
    - Add unique constraint on email field
    - Add relations: OneToOne with Wallet, OneToMany with OTP and Transaction
    - _Requirements: 19.2_

  - [x] 2.2 Create OTP entity
    - Define OTP entity with id (UUID), userId (FK), otpHash, expiresAt, isUsed (default false), createdAt
    - Add ManyToOne relation to User with CASCADE delete
    - _Requirements: 19.6_

  - [x] 2.3 Create Wallet entity
    - Define Wallet entity with id (UUID), userId (FK, unique), createdAt, updatedAt
    - Add OneToOne relation to User with CASCADE delete
    - Add OneToMany relation to WalletBalance
    - _Requirements: 19.3_

  - [x] 2.4 Create WalletBalance entity
    - Define WalletBalance entity with id (UUID), walletId (FK), currency (VARCHAR(3)), balance (DECIMAL(18,6) default 0), createdAt, updatedAt
    - Add CHECK constraint: balance >= 0
    - Add unique index on (walletId, currency)
    - Add ManyToOne relation to Wallet with CASCADE delete
    - _Requirements: 19.4, 19.9_

  - [-] 2.5 Create Transaction entity
    - Define Transaction entity with id (UUID), userId (FK), type (ENUM: FUNDING/CONVERSION/TRADE), sourceCurrency, targetCurrency, sourceAmount, targetAmount, fxRate, status (ENUM: SUCCESS/FAILED, default SUCCESS), idempotencyKey (unique), createdAt
    - Add ManyToOne relation to User with CASCADE delete
    - Add unique constraint on idempotencyKey
    - _Requirements: 19.5_

  - [ ] 2.6 Generate and run database migrations
    - Create migration files for all entities
    - Run migrations to create tables with all constraints and indexes
    - _Requirements: 19.1, 19.7, 19.8_

- [ ] 3. Common utilities and infrastructure
  - [ ] 3.1 Create global exception filter
    - Implement GlobalExceptionFilter to catch all exceptions
    - Format error responses with statusCode, message, error, errorCode, requestId, timestamp
    - Log errors with severity, timestamp, stack trace
    - Map HTTP exceptions to appropriate error codes
    - _Requirements: 12.1, 12.2, 12.6_

  - [ ] 3.2 Create request ID middleware
    - Generate unique request ID for each incoming request
    - Attach request ID to request object
    - Include request ID in all error responses
    - _Requirements: 12.6_

  - [ ] 3.3 Create validation DTOs
    - Create RegisterDto with email (IsEmail) and password (MinLength 8) validation
    - Create VerifyEmailDto with userId and otp validation
    - Create LoginDto with email and password validation
    - Create FundWalletDto with amount (Min 0.000001, Max 10000000) and idempotencyKey (Length 16-64) validation
    - Create ConvertCurrencyDto with sourceCurrency, targetCurrency (3 uppercase letters), sourceAmount, idempotencyKey validation
    - Create TransactionFiltersDto with optional type, currency, startDate, endDate
    - Create PaginationDto with page (default 1) and limit (default 20, max 100)
    - _Requirements: 11.1, 11.3, 11.5, 11.6_

  - [ ] 3.4 Create custom decorators
    - Create @CurrentUser() decorator to extract user from request
    - Create @Public() decorator to mark endpoints as public (skip JWT guard)
    - _Requirements: 16.2_

- [ ] 4. Email service implementation
  - [ ] 4.1 Create EmailService with nodemailer
    - Configure SMTP transport with environment variables
    - Implement sendOTP() method with HTML template
    - Add retry logic: 2 attempts with 5-second delay
    - Add 10-second timeout per attempt
    - Log email failures without throwing errors
    - Include application name and sender email in all emails
    - _Requirements: 18.1, 18.2, 18.4, 18.5, 18.6_

  - [ ] 4.2 Write unit tests for EmailService
    - Test successful email sending
    - Test retry logic on failure
    - Test timeout handling
    - Mock nodemailer transport
    - _Requirements: 20.5_

- [ ] 5. Authentication service implementation
  - [ ] 5.1 Create AuthenticationService with user registration
    - Implement register() method: validate email/password, hash password with bcrypt (cost 10), create user, generate 6-digit OTP, hash OTP, set 10-minute expiration, save OTP, send email, create wallet with 1000 NGN
    - Return userId and success message
    - Handle duplicate email with 409 error
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.9, 1.10_

  - [ ] 5.2 Implement email verification
    - Implement verifyEmail() method: validate OTP exists and not expired, compare hashed OTP, mark user as verified, mark OTP as used
    - Return 400 for invalid or expired OTP
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 5.3 Implement user login with JWT
    - Implement login() method: validate credentials with bcrypt, check isVerified flag, generate JWT access token (15-min expiration) and refresh token (7-day expiration) with HS256 algorithm
    - Include userId and email in JWT payload
    - Return 401 for invalid credentials, 403 for unverified users
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 16.1_

  - [ ] 5.4 Implement token refresh
    - Implement refreshToken() method: validate refresh token signature, generate new access token with 15-minute expiration
    - Return 401 for invalid or expired refresh token
    - _Requirements: 3.6, 3.7_

  - [ ] 5.5 Implement OTP resend
    - Implement resendOTP() method: invalidate all previous unused OTPs for user, generate new 6-digit OTP, hash and save with 10-minute expiration, send email
    - _Requirements: 2.7_

  - [ ] 5.6 Write property test for user registration
    - **Property 1: User Registration Creates Complete Account**
    - **Validates: Requirements 1.1, 1.2, 1.4, 4.3**
    - Use fast-check to generate random valid emails and passwords (min 8 chars)
    - Verify user, OTP, wallet, and 1000 NGN balance are created

  - [ ] 5.7 Write property test for password hashing
    - **Property 2: Password Hashing with Bcrypt**
    - **Validates: Requirements 1.5, 16.7**
    - Use fast-check to generate random passwords
    - Verify passwords are hashed with bcrypt cost factor 10
    - Verify original password cannot be retrieved from hash

  - [ ] 5.8 Write property test for OTP expiration
    - **Property 5: OTP Expiration Time**
    - **Validates: Requirements 1.9**
    - Verify OTP expiration is exactly 10 minutes from creation

  - [ ] 5.9 Write property test for OTP single-use enforcement
    - **Property 8: OTP Single-Use Enforcement**
    - **Validates: Requirements 2.4**
    - Verify OTP cannot be reused after successful verification

  - [ ] 5.10 Write property test for JWT token expiration
    - **Property 11: JWT Access Token Expiration**
    - **Property 12: JWT Refresh Token Expiration**
    - **Validates: Requirements 3.1, 3.2**
    - Verify access token expires in exactly 15 minutes
    - Verify refresh token expires in exactly 7 days

  - [ ] 5.11 Write unit tests for AuthenticationService
    - Test valid registration flow
    - Test duplicate email rejection (409)
    - Test invalid email format rejection (400)
    - Test password too short rejection (400)
    - Test OTP verification success and failure cases
    - Test login with valid/invalid credentials
    - Test login with unverified user (403)
    - Test refresh token generation and validation
    - Test OTP resend invalidates old OTPs
    - Mock UserRepository, OTPRepository, WalletService, EmailService
    - _Requirements: 20.1_

- [ ] 6. Checkpoint - Ensure authentication tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. FX service implementation
  - [ ] 7.1 Create FXService with Redis caching
    - Configure Redis client connection
    - Implement getRate() method: check cache with key format "fx_rate:{from}:{to}", return cached if exists, otherwise fetch from API
    - Implement fetchFromAPI() with exchangerate-api.com integration
    - Add retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
    - Add 5-second timeout per request
    - Cache rates with 5-minute (300 seconds) TTL
    - Validate rates are positive numbers
    - Include timestamp in rate response
    - Return 503 after all retries fail
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8, 6.9_

  - [ ] 7.2 Implement getAllRates() method
    - Fetch rates for all supported currency pairs (NGN, USD, EUR, GBP, CAD, AUD, JPY)
    - Cache all rates with 5-minute TTL
    - _Requirements: 6.7_

  - [ ] 7.3 Write property test for FX rate caching
    - **Property 23: FX Rate Caching with TTL**
    - **Property 24: Cache Hit Returns Cached Rate**
    - **Validates: Requirements 6.2, 6.3**
    - Verify rates are cached with exactly 5-minute TTL
    - Verify cache hits return cached values without API calls

  - [ ] 7.4 Write property test for positive rates
    - **Property 27: FX Rates Are Positive**
    - **Validates: Requirements 6.8**
    - Use fast-check to verify all fetched rates are positive numbers

  - [ ] 7.5 Write unit tests for FXService
    - Test rate fetch from external API
    - Test cache hit returns cached value
    - Test cache miss triggers API call
    - Test retry logic on API failure
    - Test all retries fail returns 503
    - Test all currency pairs available
    - Test negative rate rejection
    - Test rate includes timestamp
    - Mock Redis client and HTTP client (Axios)
    - _Requirements: 20.4_

- [ ] 8. Wallet service implementation
  - [ ] 8.1 Create WalletService with wallet creation
    - Implement createWallet() method: create wallet for user, create WalletBalance with 1000.000000 NGN
    - _Requirements: 4.3_

  - [ ] 8.2 Implement balance queries
    - Implement getBalances() method: return all WalletBalance records for user's wallet
    - Implement getBalance() method: return balance for specific currency, return 0.000000 if not exists
    - Return all amounts with 6 decimal places precision
    - _Requirements: 4.1, 4.4, 4.5, 4.6_

  - [ ] 8.3 Implement balance updates with pessimistic locking
    - Implement updateBalance() method: use database transaction with SELECT FOR UPDATE, lock balance row, update balance (ADD or SUBTRACT), validate balance >= 0
    - Throw 400 error if insufficient balance
    - Create balance record if doesn't exist for currency
    - _Requirements: 5.5, 14.4, 14.5_

  - [ ] 8.4 Implement wallet funding
    - Implement fundWallet() method: check idempotency key in cache, validate amount (> 0, <= 10000000), validate currency is NGN, use updateBalance() to add funds, create transaction record with type FUNDING, cache result with 24-hour TTL
    - Return original result for duplicate idempotency key
    - Wrap entire operation in database transaction
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 15.1, 15.2, 15.3_

  - [ ] 8.5 Write property test for funding increases balance
    - **Property 19: Funding Increases NGN Balance**
    - **Validates: Requirements 5.1**
    - Use fast-check to generate random funding amounts
    - Verify NGN balance increases by exactly the funded amount

  - [ ] 8.6 Write property test for idempotency
    - **Property 20: Idempotency for Funding Operations**
    - **Validates: Requirements 5.4, 15.3**
    - Verify duplicate idempotency key returns original result without duplicate transaction

  - [ ] 8.7 Write property test for decimal precision
    - **Property 17: Decimal Precision Maintained**
    - **Validates: Requirements 4.4, 4.6**
    - Use fast-check to generate amounts with various decimal places
    - Verify all stored and returned amounts maintain exactly 6 decimal places

  - [ ] 8.8 Write unit tests for WalletService
    - Test wallet creation with initial 1000 NGN balance
    - Test balance query returns all currencies
    - Test non-existent balance returns zero
    - Test funding increases NGN balance
    - Test funding with duplicate idempotency key
    - Test funding with non-NGN currency rejected
    - Test funding amount validation (min/max)
    - Test unverified user funding rejected (403)
    - Test concurrent funding operations with locking
    - Mock WalletRepository, WalletBalanceRepository, TransactionService
    - _Requirements: 20.2_

- [ ] 9. Transaction service implementation
  - [ ] 9.1 Create TransactionService with transaction recording
    - Implement createTransaction() method: create transaction record with all fields (type, currencies, amounts, fxRate, status, idempotencyKey)
    - _Requirements: 5.6, 7.6, 8.4_

  - [ ] 9.2 Implement idempotency result caching
    - Implement storeIdempotencyResult() method: cache transaction result in Redis with key format "idempotency:{key}", TTL 24 hours (86400 seconds)
    - Implement getIdempotencyResult() method: retrieve cached result from Redis
    - _Requirements: 15.3, 15.4_

  - [ ] 9.3 Implement transaction history queries
    - Implement getTransactionHistory() method: query transactions for user, apply filters (type, currency, date range), order by createdAt DESC, paginate with default 20 per page
    - Return transaction records with all fields (type, amount, currency, fxRate, timestamp, status)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ] 9.4 Implement getTransactionById() method
    - Query transaction by ID and userId
    - Return 404 if not found
    - Return 403 if transaction belongs to different user
    - _Requirements: 16.9_

  - [ ] 9.5 Write property test for transaction ordering
    - **Property 39: Transaction Ordering**
    - **Validates: Requirements 9.4**
    - Create multiple transactions with different timestamps
    - Verify results are ordered by timestamp DESC (newest first)

  - [ ] 9.6 Write property test for date range filtering
    - **Property 41: Date Range Filtering**
    - **Validates: Requirements 9.6**
    - Use fast-check to generate random date ranges
    - Verify all returned transactions fall within the specified range

  - [ ] 9.7 Write unit tests for TransactionService
    - Test transaction creation with all fields
    - Test idempotency result caching and retrieval
    - Test transaction history returns all user transactions
    - Test transaction ordering (newest first)
    - Test pagination with default page size 20
    - Test type filtering (FUNDING, CONVERSION, TRADE)
    - Test date range filtering
    - Test currency filtering
    - Test unauthenticated request rejected (401)
    - Test user cannot access other user's transactions (403)
    - Mock TransactionRepository, Redis client
    - _Requirements: 20.5_

- [ ] 10. Checkpoint - Ensure core services tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Trading service implementation
  - [ ] 11.1 Create TradingService with currency conversion
    - Implement convertCurrency() method: check idempotency key, get FX rate from FXService, calculate targetAmount = sourceAmount × fxRate, start database transaction with SERIALIZABLE isolation
    - Lock source and target wallet balances with SELECT FOR UPDATE
    - Verify sufficient source balance
    - Subtract from source balance, add to target balance
    - Create transaction record with type CONVERSION
    - Commit transaction
    - Cache result with idempotency key for 24 hours
    - Return ConversionResult with all details
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.10, 7.11, 14.1, 14.2_

  - [ ] 11.2 Implement input validation for conversions
    - Validate source and target currencies are supported (NGN, USD, EUR, GBP, CAD, AUD, JPY)
    - Validate source and target currencies are different
    - Validate amount > 0
    - Return 400 for invalid inputs
    - _Requirements: 7.8, 7.9, 11.5_

  - [ ] 11.3 Implement trade() method
    - Implement trade() method as alias for convertCurrency() with identical logic
    - Create transaction record with type TRADE instead of CONVERSION
    - Validate at least one currency is NGN
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_

  - [ ] 11.4 Write property test for conversion calculation
    - **Property 29: Conversion Calculation Accuracy**
    - **Validates: Requirements 7.1, 8.1, 8.2**
    - Use fast-check to generate random amounts and FX rates
    - Verify targetAmount = sourceAmount × fxRate (within floating-point precision)

  - [ ] 11.5 Write property test for atomic balance updates
    - **Property 31: Atomic Balance Updates for Conversions**
    - **Validates: Requirements 7.4, 8.5**
    - Verify source balance decreases and target balance increases atomically
    - Simulate transaction failure and verify rollback

  - [ ] 11.6 Write property test for transaction atomicity
    - **Property 22: Transaction Atomicity and Rollback**
    - **Validates: Requirements 5.7, 14.3**
    - Simulate failures at various points in conversion flow
    - Verify all changes are rolled back on failure

  - [ ] 11.7 Write property test for idempotency in conversions
    - **Property 34: Idempotency for Conversions**
    - **Validates: Requirements 7.11, 15.3**
    - Verify duplicate idempotency key returns original result without re-executing conversion

  - [ ] 11.8 Write unit tests for TradingService
    - Test conversion calculation accuracy
    - Test sufficient balance verification
    - Test insufficient balance rejection (400)
    - Test atomic balance updates (both or neither)
    - Test conversion creates transaction record
    - Test transaction record completeness
    - Test same currency conversion rejected (400)
    - Test unsupported currency rejected (400)
    - Test duplicate idempotency key handling
    - Test trade creates TRADE transaction type
    - Test NGN involvement in trades
    - Test concurrent conversion operations with locking
    - Mock WalletService, FXService, TransactionService
    - _Requirements: 20.3_

- [ ] 12. API controllers implementation
  - [ ] 12.1 Create AuthController with authentication endpoints
    - POST /auth/register: call AuthService.register(), return 201 with userId and message
    - POST /auth/verify-email: call AuthService.verifyEmail(), return 200 with success message
    - POST /auth/login: call AuthService.login(), return 200 with access and refresh tokens
    - POST /auth/refresh: call AuthService.refreshToken(), return 200 with new access token
    - POST /auth/resend-otp: call AuthService.resendOTP(), return 200 with success message
    - Add Swagger decorators with request/response schemas, status codes, descriptions
    - _Requirements: 13.2, 13.3, 13.4_

  - [ ] 12.2 Create WalletController with wallet endpoints
    - GET /wallet/balances: protected endpoint, call WalletService.getBalances(), return 200 with balance array
    - POST /wallet/fund: protected endpoint, call WalletService.fundWallet(), return 201 with transaction
    - Add @UseGuards(JwtAuthGuard, VerifiedUserGuard) to protected endpoints
    - Add Swagger decorators with authentication requirements
    - _Requirements: 13.2, 13.3, 13.4_

  - [ ] 12.3 Create TradingController with trading endpoints
    - POST /trading/convert: protected endpoint, call TradingService.convertCurrency(), return 201 with conversion result
    - POST /trading/trade: protected endpoint, call TradingService.trade(), return 201 with trade result
    - GET /trading/rates: protected endpoint with query params (from, to), call FXService.getRate(), return 200 with rate and timestamp
    - Add @UseGuards(JwtAuthGuard, VerifiedUserGuard) to all endpoints
    - Add Swagger decorators
    - _Requirements: 13.2, 13.3, 13.4_

  - [ ] 12.4 Create TransactionController with transaction endpoints
    - GET /transactions: protected endpoint with query params (page, limit, type, currency, startDate, endDate), call TransactionService.getTransactionHistory(), return 200 with paginated results
    - GET /transactions/:id: protected endpoint, call TransactionService.getTransactionById(), return 200 with transaction or 404
    - Add @UseGuards(JwtAuthGuard, VerifiedUserGuard) to all endpoints
    - Add Swagger decorators
    - _Requirements: 13.2, 13.3, 13.4_

- [ ] 13. Guards and security implementation
  - [ ] 13.1 Create JwtAuthGuard
    - Extend AuthGuard('jwt') from @nestjs/passport
    - Implement canActivate() to validate JWT token
    - Implement handleRequest() to throw UnauthorizedException for invalid tokens
    - _Requirements: 16.2, 16.3_

  - [ ] 13.2 Create JWT strategy
    - Implement PassportStrategy for JWT validation
    - Extract token from Authorization header (Bearer token)
    - Validate token signature with JWT_SECRET
    - Return user payload (userId, email) on success
    - _Requirements: 16.1, 16.2_

  - [ ] 13.3 Create VerifiedUserGuard
    - Implement CanActivate interface
    - Check user.isVerified flag from request
    - Throw ForbiddenException if not verified
    - _Requirements: 2.5, 5.8_

  - [ ] 13.4 Configure rate limiting with @nestjs/throttler
    - Set global rate limit: 60 requests per minute
    - Override for public endpoints: 10 requests per minute (auth/login, auth/register)
    - Override for trading endpoints: 30 requests per minute
    - Override for FX rate queries: 100 requests per minute
    - Add rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) to all responses
    - Return 429 when rate limit exceeded
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 13.5 Write property test for JWT signature validation
    - **Property 51: JWT Signature Validation**
    - **Validates: Requirements 16.2**
    - Generate tokens with invalid signatures
    - Verify all requests with invalid signatures are rejected with 401

  - [ ] 13.6 Write property test for resource owner authorization
    - **Property 53: Resource Owner Authorization**
    - **Validates: Requirements 16.9**
    - Attempt to access resources belonging to different users
    - Verify all unauthorized access attempts are rejected with 403

- [ ] 14. Checkpoint - Ensure API and security tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Integration tests
  - [ ] 15.1 Write end-to-end registration and verification flow test
    - Test complete flow: register → receive OTP → verify email → login → access protected endpoint
    - Verify wallet created with 1000 NGN
    - _Requirements: 1.1, 1.4, 2.1, 3.1, 4.3_

  - [ ] 15.2 Write end-to-end funding flow test
    - Test complete flow: login → fund wallet → verify balance increased → check transaction history
    - Test idempotency with duplicate request
    - _Requirements: 5.1, 5.4, 9.1_

  - [ ] 15.3 Write end-to-end conversion flow test
    - Test complete flow: login → fund wallet → convert currency → verify both balances updated → check transaction history
    - Test insufficient balance rejection
    - Test idempotency with duplicate request
    - _Requirements: 7.1, 7.2, 7.4, 7.11, 9.1_

  - [ ] 15.4 Write end-to-end trade flow test
    - Test complete flow: login → fund wallet → trade NGN for USD → trade USD back to NGN → verify balances
    - Test transaction history shows TRADE type
    - _Requirements: 8.1, 8.2, 8.4, 9.1_

  - [ ] 15.5 Write concurrent operations test
    - Test multiple concurrent funding operations on same wallet
    - Test multiple concurrent conversions on same wallet
    - Verify pessimistic locking prevents race conditions
    - Verify final balances are correct
    - _Requirements: 14.4, 14.5, 20.7_

  - [ ] 15.6 Write rate limiting integration test
    - Test rate limits for public endpoints (10/min)
    - Test rate limits for authenticated endpoints (60/min)
    - Test rate limits for trading endpoints (30/min)
    - Verify 429 response when limit exceeded
    - Verify rate limit headers present
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6_

  - [ ] 15.7 Write transaction rollback test
    - Simulate database failure during conversion
    - Verify all balance changes are rolled back
    - Verify no transaction record created
    - _Requirements: 14.3, 20.6_

  - [ ] 15.8 Write FX service integration test
    - Test rate fetching from external API (mock API)
    - Test cache hit returns cached value
    - Test cache miss triggers API call
    - Test retry logic on API failure
    - Test 503 response after all retries fail
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 16. Configuration and environment setup
  - [ ] 16.1 Create ConfigModule with validation
    - Define configuration schema with class-validator
    - Validate required environment variables on startup: DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FX_API_URL
    - Provide default values for non-critical parameters (PORT=3000, NODE_ENV=development)
    - Fail startup with descriptive error if required variables missing
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ] 16.2 Create environment-specific configuration files
    - Create .env.example with all required variables
    - Create .env.development with development defaults
    - Create .env.test with test database and Redis URLs
    - Document all environment variables in README
    - _Requirements: 17.6_

  - [ ] 16.3 Configure TypeORM for different environments
    - Development: logging enabled, synchronize false (use migrations)
    - Test: in-memory or separate test database, synchronize true
    - Production: logging errors only, synchronize false, SSL enabled
    - _Requirements: 17.6_

- [ ] 17. Documentation
  - [ ] 17.1 Create comprehensive README.md
    - Project overview and features
    - Technology stack
    - Prerequisites (Node.js, PostgreSQL, Redis)
    - Installation instructions
    - Environment variable configuration
    - Database migration commands
    - Running the application (development, production)
    - Running tests (unit, integration, property-based)
    - API documentation link (/api/docs)
    - Project structure overview
    - _Requirements: 13.1_

  - [ ] 17.2 Enhance Swagger documentation
    - Add API title, description, version
    - Add authentication section with JWT bearer token
    - Add example requests and responses for all endpoints
    - Document all error responses with status codes
    - Add tags to group related endpoints
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ] 17.3 Create API usage examples
    - Document complete user journey: registration → verification → login → funding → conversion → transaction history
    - Provide curl examples for all endpoints
    - Document error handling and common issues
    - _Requirements: 13.4_

- [ ] 18. Final integration and testing
  - [ ] 18.1 Set up test database and Redis for integration tests
    - Configure test database connection
    - Configure test Redis instance
    - Create database setup/teardown scripts for tests
    - _Requirements: 20.5, 20.8_

  - [ ] 18.2 Configure fast-check for property-based tests
    - Install fast-check library
    - Configure test runners (Jest) for property tests
    - Set minimum iterations to 100 for local, 1000 for CI
    - Enable shrinking to find minimal failing cases
    - Log seeds for reproducibility
    - _Requirements: 20.5_

  - [ ] 18.3 Set up test coverage reporting
    - Configure Jest coverage thresholds: 80% for services, 100% for critical financial operations
    - Generate coverage reports in HTML and JSON formats
    - Configure CI to fail if coverage drops below threshold
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [ ] 18.4 Run all tests and verify coverage
    - Run all unit tests
    - Run all property-based tests
    - Run all integration tests
    - Verify minimum 80% code coverage achieved
    - Verify all critical paths have 100% coverage
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 19. Final checkpoint - Production readiness verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all environment variables documented
  - Verify database migrations run successfully
  - Verify Swagger documentation accessible at /api/docs
  - Verify rate limiting configured correctly
  - Verify error handling returns consistent format
  - Verify logging captures all errors with stack traces

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate end-to-end flows and system behavior
- All financial operations use pessimistic locking and database transactions for data consistency
- Idempotency keys prevent duplicate transactions for all financial operations
- The system uses TypeScript with NestJS framework, PostgreSQL database, and Redis cache
