# Database Migration Guide

This guide explains how to set up and run database migrations for the FX Trading Backend.

## Overview

The application uses TypeORM migrations to manage the database schema. All migration files are located in `src/migrations/` directory.

## Quick Start

### Option 1: Automated Setup (Recommended)

Run the automated setup script that will:
- Check PostgreSQL connection
- Create the database if it doesn't exist
- Enable required extensions
- Run all pending migrations

**On Linux/Mac:**
```bash
npm run db:setup
```

**On Windows (PowerSh