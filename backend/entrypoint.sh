#!/usr/bin/bash

DB_HOST=postgres
DB_PORT=5432
DB_USER=$DATABASE_USER

echo "Database Host: $DB_HOST"
echo "Database Port: $DB_PORT"
echo "Database User: $DB_USER"

# Function to check if PostgreSQL is ready
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "Waiting for PostgreSQL to initialize..."
  sleep 1
done

echo "Postgres is ready!"

# deploy migrations to database
echo "Apply Primsa migrations..."
npx prisma migrate deploy

# start api server
echo "Starting API server..."
npm run start