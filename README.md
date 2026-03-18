# FX Trading Backend

Multi-currency wallet management and foreign exchange trading API built with NestJS.

## Features

- User registration and email verification with OTP
- JWT-based authentication
- Multi-currency wallet management (NGN, USD, EUR, GBP, CAD, AUD, JPY)
- Real-time FX rate integration
- Currency conversion and trading
- Transaction history with filtering and pagination
- Rate limiting and security headers
- Comprehensive API documentation with Swagger

## Technology Stack

- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL 14+ with TypeORM
- **Cache**: Redis 6+
- **Authentication**: JWT (passport-jwt)
- **Password Hashing**: bcrypt
- **Validation**: class-validator, class-transformer
- **Email**: nodemailer with SMTP
- **API Documentation**: Swagger (NestJS OpenAPI)
- **Rate Limiting**: @nestjs/throttler
- **Security**: helmet, cors

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fx-trading-backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/fx_trading_db

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# External API Configuration
FX_API_URL=https://api.exchangerate-api.com/v4/latest
```

## Database Setup

1. Create the PostgreSQL database:
```bash
createdb fx_trading_db
```

2. Run migrations:
```bash
npm run migration:run
```

## Running the Application

### Development mode:
```bash
npm run start:dev
```

### Production mode:
```bash
npm run build
npm start
```

### Debug mode:
```bash
npm run start:debug
```

## Testing

### Run all tests:
```bash
npm test
```

### Run tests in watch mode:
```bash
npm run test:watch
```

### Generate coverage report:
```bash
npm run test:cov
```

## API Documentation

Once the application is running, access the Swagger documentation at:
```
http://localhost:3000/api/docs
```

## Project Structure

```
src/
├── config/           # Configuration files (TypeORM, Redis)
├── health/           # Health check endpoint
├── main.ts           # Application entry point
└── app.module.ts     # Root module

.env                  # Environment variables (not in git)
.env.example          # Example environment variables
tsconfig.json         # TypeScript configuration
jest.config.js        # Jest testing configuration
```

## Database Migrations

### Generate a new migration:
```bash
npm run migration:generate -- -n MigrationName
```

### Run migrations:
```bash
npm run migration:run
```

### Revert last migration:
```bash
npm run migration:revert
```

## Security Features

- Helmet middleware for security headers
- CORS with configurable allowed origins
- JWT authentication with access and refresh tokens
- Bcrypt password hashing with cost factor 10
- Rate limiting (60 requests/minute globally)
- Input validation with class-validator
- SQL injection prevention via TypeORM parameterized queries

## License

ISC
